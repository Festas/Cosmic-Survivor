// world.js — the game simulation: entities, collisions, director, singularity,
// reactions, leveling, scoring and rendering. Coordinates the whole run.

import {
  ARENA, COLORS, PLAYER, SINGULARITY, DASH, COMBO, ELITE, WAVE,
  spawnInterval, enemyCap, hpScale, speedScale, dmgScale, xpForLevel, comboMultiplier,
  waveDuration, waveHyperScale, waveSpeedHyper, bossWaveScale, isBossWave, isEliteWave,
} from './config.js';
import {
  TAU, clamp, lerp, dist, dist2, angleTo, rand, randRange, randOnCircle, chance, pick,
} from '../engine/utils.js';
import { Camera } from '../engine/camera.js';
import { Particles } from '../engine/particles.js';
import { glowSprite } from '../engine/sprites.js';
import { paletteFor, drawEnemyBody, drawBossCore, isUpright, enemyPath, withAlpha } from './enemyArt.js';
import { drawShipBody, drawDroneBody } from './shipArt.js';
import { Player } from './player.js';
import { ENEMY_TYPES, BOSS_TYPES, pickEnemyType, packSize, rollElite } from './enemies.js';
import { THEMES, themeIndexForWave, bossKeyForWave, pickFromRoster } from './waves.js';
import { createStatus, applyElement, tickStatus, dominantElement, ELEMENTS } from './elements.js';
import { draftUpgrades } from './upgrades.js';
import { weaponDef, addOrLevelWeapon, evolveWeapon, createWeaponInst } from './weapons.js';
import { Background } from './background.js';
import { shipById, DEFAULT_SHIP_ID } from './ships.js';
import { computeMetaBonus, createMetaBonus, stardustForRun } from './meta.js';
import { computeDirectiveEffect, createDirectiveEffect } from './modifiers.js';

// Lightweight uniform spatial grid for enemy broad-phase queries.
// Cells are addressed with packed integer keys (instead of string keys) to cut
// allocation/GC and speed up Map lookups on the hot query path.
class Grid {
  constructor(cell) { this.cell = cell; this.inv = 1 / cell; this.map = new Map(); this._pool = []; }
  // Salvage the per-cell arrays into a freelist instead of dropping them, so the
  // every-step rebuild stops minting garbage arrays (a measurable GC cost when
  // 150+ enemies are on screen during boss waves).
  clear() {
    for (const a of this.map.values()) { a.length = 0; this._pool.push(a); }
    this.map.clear();
  }
  insert(e) {
    const cx = Math.floor(e.x * this.inv), cy = Math.floor(e.y * this.inv);
    const k = (cx + 0x8000) * 0x10000 + (cy + 0x8000);
    let a = this.map.get(k);
    if (!a) { a = this._pool.pop() || []; this.map.set(k, a); }
    a.push(e);
  }
  query(x, y, r, out) {
    out.length = 0;
    const inv = this.inv;
    const minX = Math.floor((x - r) * inv), maxX = Math.floor((x + r) * inv);
    const minY = Math.floor((y - r) * inv), maxY = Math.floor((y + r) * inv);
    for (let cx = minX; cx <= maxX; cx++) {
      const base = (cx + 0x8000) * 0x10000 + 0x8000;
      for (let cy = minY; cy <= maxY; cy++) {
        const a = this.map.get(base + cy);
        if (a) for (let i = 0; i < a.length; i++) out.push(a[i]);
      }
    }
    return out;
  }
}

export class World {
  constructor({ viewW, viewH, audio, store, rng }) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.audio = audio;
    this.store = store;
    this.rng = rng || Math.random;

    this.camera = new Camera(viewW, viewH);
    this.particles = new Particles(2200);
    this.background = new Background();
    this.grid = new Grid(80);
    this._q = [];
    // Reused per-frame buffer of on-screen elites, so their marker rings can be
    // drawn in a dedicated pass *above* the enemy-bullet layer (readability)
    // without a second cull/scan or per-frame allocation.
    this._eliteFrame = [];
    // Floating damage numbers are pooled and merged (see addDamageText): during a
    // boss fight the player can land hundreds of hits/second, and spawning a fresh
    // rising number per hit was a major render + GC cost.
    this._textPool = [];
    this.maxTexts = 160;

    this.reset();
  }

  reset(config = {}) {
    this.player = new Player();
    // Apply the chosen ship identity and persistent meta bonuses to the fresh
    // loadout before anything reads it. Ship first (swaps starter weapon + gives
    // its stat identity), then meta on top, then derive hp from the final maxHp.
    this.shipId = config.shipId || DEFAULT_SHIP_ID;
    this.metaBonus = config.metaLevels ? computeMetaBonus(config.metaLevels)
      : (config.metaBonus || createMetaBonus());
    // Active challenge directives fold into one difficulty/economy effect object
    // that spawn, damage, XP and reward code read. Neutral (all 1s) when none set.
    this.directives = Array.isArray(config.directives) ? config.directives.slice() : [];
    this.diff = this.directives.length ? computeDirectiveEffect(this.directives)
      : createDirectiveEffect();
    this.applyLoadout(this.player, this.shipId, this.metaBonus);
    // Directive XP modifier layers on top of the loadout's xpMul.
    this.player.stats.xpMul *= this.diff.xpMul;

    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.orbs = [];
    this.pickups = [];
    this.texts = [];
    this.singularities = [];
    this.particles.clear();

    this.elapsed = 0;
    this.spawnTimer = 0.6;
    this.formationTimer = 22;
    // Wave director state. The run is paced in discrete waves (see updateDirector):
    // wave 1 upward, a wave clock that pauses while a boss is alive, and the
    // current enemy theme (every 10 waves). Boss cadence is derived from the wave
    // number, so bosses can never stack up the way the old time-threshold did.
    this.wave = 1;
    this.waveTime = 0;
    this.themeIndex = -1;
    this.theme = null;
    this.pendingBossKey = null;
    this.bossActive = null;
    this.bossWarn = 0;
    this.applyTheme(0); // seed the wave-1 theme + background palette

    this.score = 0;
    this.kills = 0;
    this.bossKills = 0;
    this.reactions = 0;
    this.revives = this.metaBonus.revives || 0;
    this.streak = 0;
    this.comboTimer = 0;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = xpForLevel(1);

    this.timeScale = 1;
    this.bulletTime = 0;
    this.bulletTimeScale = 1;
    this.hitStop = 0;

    this.state = 'playing'; // playing | levelup | gameover
    this.pendingChoices = null;
    this.onLevelUp = null;
    this.onGameOver = null;
    this.flash = 0;
  }

  // Configure a fresh player with a ship identity + persistent meta bonus.
  applyLoadout(player, shipId, bonus) {
    const ship = shipById(shipId);
    const s = player.stats;
    // Ship starter weapon (replaces the default Ion Blaster when different).
    if (ship.weapon && ship.weapon !== 'ion') {
      player.weapons = [createWeaponInst(ship.weapon)];
    }
    // Ship identity modifiers, then permanent meta bonuses layered on top.
    ship.apply(s);
    s.maxHp += bonus.maxHpAdd;
    s.weaponDamageMul *= bonus.damageMul;
    s.moveSpeed *= bonus.moveSpeedMul;
    s.armor += bonus.armorAdd;
    s.regen += bonus.regenAdd;
    s.luck = (s.luck || 0) + bonus.luckAdd;
    s.critChance += bonus.critAdd;
    s.cooldownMul *= bonus.hasteMul;
    s.xpMul *= bonus.xpMul;
    s.pickupRadius *= bonus.pickupMul;
    s.singularityChargeMul *= bonus.singChargeMul;
    // Clamp and derive starting HP from the final maxHp.
    s.maxHp = Math.max(1, Math.round(s.maxHp));
    player.hp = s.maxHp;
    player.shipColor = ship.color;
    player.syncDrones();
  }

  get multiplier() { return comboMultiplier(this.streak); }
  get threat() { return Math.floor(this.elapsed / 30) + 1; }

  // -------------------------------------------------------- time control
  shake(a) { if (this.store?.getSettings().shake !== false) this.camera.addTrauma(a); }
  hitStopFor(t) { this.hitStop = Math.max(this.hitStop, t); }
  requestBulletTime(scale, dur) { this.bulletTimeScale = scale; this.bulletTime = Math.max(this.bulletTime, dur); }

  // -------------------------------------------------------- spawning
  // Directive-adjusted concurrent-enemy cap (capMul widens/narrows the budget).
  capNow() { return Math.floor(enemyCap(this.elapsed) * (this.diff?.capMul || 1)); }

  spawnEnemy(typeKey, x, y) {
    const isBoss = !!BOSS_TYPES[typeKey];
    const def = isBoss ? BOSS_TYPES[typeKey] : ENEMY_TYPES[typeKey];
    if (!def) return null;
    const d = this.diff || createDirectiveEffect();
    // Wave-based exponential tier (1 until wave 100, then geometric) layers on top
    // of the existing time-based director curves.
    const hv = waveHyperScale(this.wave);
    // Bosses: per-slot hand-tuned hp × directive × the boss wave scale (which adds
    // the post-100 exponential for cycled repeats). Rank-and-file: the time-based
    // hp curve × directive × the hyper tier.
    const hp = isBoss
      ? def.hp * d.bossHpMul * bossWaveScale(this.wave)
      : def.hp * hpScale(this.elapsed) * d.hpMul * hv;
    const speed = isBoss
      ? def.speed * d.speedMul
      : def.speed * speedScale(this.elapsed) * d.speedMul * waveSpeedHyper(this.wave);
    // Rank-and-file damage ramps with time (+ a softened hyper tier); bosses keep
    // their tuned per-pattern damage, nudged by the square-root of the boss scale.
    const damage = isBoss
      ? def.damage * Math.sqrt(bossWaveScale(this.wave))
      : def.damage * dmgScale(this.elapsed) * (hv > 1 ? Math.sqrt(hv) : 1);
    const e = {
      type: def, key: typeKey, boss: !!def.boss,
      x, y, vx: 0, vy: 0, kx: 0, ky: 0,
      hp,
      maxHp: hp,
      radius: def.radius,
      speed,
      damage,
      xp: def.xp,
      color: def.color,
      status: createStatus(),
      hitFlash: 0, spin: rand() * TAU, alive: true, contactT: 0,
      massive: !!def.massive,
    };
    // Elite promotion: a time-gated chance to turn a mid-tier+ spawn into a
    // heavier, XP-rich variant (gold ring drawn in renderEnemies). Scaling is
    // applied on top of the director curves so elites stay relative to the wave.
    if (!isBoss && rollElite(def, this.elapsed, this.rng)) this.makeElite(e);
    this.enemies.push(e);
    if (e.boss) { this.bossActive = e; }
    return e;
  }

  // Promote an enemy to an Elite (heavier, faster, XP-rich). Extracted so both the
  // random director promotion and guaranteed Elite waves share one definition.
  makeElite(e) {
    if (e.elite) return;
    e.elite = true;
    e.hp *= ELITE.hpMul;
    e.maxHp *= ELITE.hpMul;
    e.damage *= ELITE.damageMul;
    e.radius *= ELITE.radiusMul;
    e.speed *= ELITE.speedMul;
    e.xp = Math.max(1, Math.round(e.xp * ELITE.xpMul));
  }

  spawnRing(typeKey) {
    const b = this.camera.viewBounds(140);
    // place just outside the visible viewport, clamped to arena
    const a = rand() * TAU;
    const rx = (this.viewW / 2) + 160;
    const ry = (this.viewH / 2) + 160;
    let x = this.player.x + Math.cos(a) * rx;
    let y = this.player.y + Math.sin(a) * ry;
    x = clamp(x, 40, ARENA.w - 40);
    y = clamp(y, 40, ARENA.h - 40);
    return this.spawnEnemy(typeKey, x, y);
  }

  // "Fleet" wave: evenly-spaced rows of invaders that materialise just outside the
  // viewport. Early waves are a single row; as the run escalates they become 2-3
  // simultaneous arms (a pincer) that converge from different sides, so a camping
  // player is surrounded and must move, while a kiting player can punch through a
  // single arm. Strictly bounded by enemyCap so a wave can never blow the budget.
  spawnFormation() {
    const room = this.capNow() - this.enemies.length;
    if (room < 4) return; // not enough headroom for a meaningful row
    // Wave size and arm count both grow with the run.
    const arms = this.wave >= 40 ? 3 : this.wave >= 12 ? 2 : 1;
    const perArm = 5 + Math.floor(this.elapsed / 24); // grows over the run
    let budget = Math.min(room, arms * perArm, 30); // hard cap protects frame budget
    const baseDir = this.rng() * TAU;
    const gap = 58;
    for (let arm = 0; arm < arms && budget > 0; arm++) {
      const key = this.pickThemeEnemy(); // themed fleet, so formations match the theme
      const count = Math.min(budget, perArm);
      budget -= count;
      // Spread arms around the player (pincer); jitter so it is not perfectly even.
      const dir = baseDir + (arm / arms) * TAU + (this.rng() - 0.5) * 0.4;
      const cx = this.player.x + Math.cos(dir) * ((this.viewW / 2) + 200);
      const cy = this.player.y + Math.sin(dir) * ((this.viewH / 2) + 200);
      const perp = dir + Math.PI / 2;
      for (let i = 0; i < count; i++) {
        const off = (i - (count - 1) / 2) * gap;
        const x = clamp(cx + Math.cos(perp) * off, 40, ARENA.w - 40);
        const y = clamp(cy + Math.sin(perp) * off, 40, ARENA.h - 40);
        this.spawnEnemy(key, x, y);
      }
    }
    const label = arms >= 2 ? 'PINCER INCOMING' : 'INVADERS INCOMING';
    this.addText(this.player.x, this.player.y - 110, label, (this.theme && this.theme.bg.accent) || COLORS.invGreen, 20);
  }

  updateDirector(dt) {
    // Boss telegraph -> spawn exactly one boss for this boss-wave, then hold.
    if (this.bossWarn > 0) {
      this.bossWarn -= dt;
      if (this.bossWarn <= 0) {
        const key = this.pendingBossKey || bossKeyForWave(this.wave);
        this.pendingBossKey = null;
        const boss = this.spawnRing(key);
        if (boss) {
          this.addText(this.player.x, this.player.y - 120,
            boss.type.name.toUpperCase() + ' — WAVE ' + this.wave, COLORS.danger, 26);
        }
      }
      return; // pause spawns during the warning
    }

    // A live boss gates progression: no trickle/formation spawns, and the wave
    // clock is frozen. The player must clear the boss to advance — which makes it
    // structurally impossible for multiple bosses to stack up.
    if (this.bossActive) return;

    // Advance the wave clock; roll to the next wave when it elapses.
    this.waveTime += dt;
    if (this.waveTime >= waveDuration(this.wave)) {
      this.waveTime = 0;
      this.startWave(this.wave + 1);
      // If that rolled into a boss wave, a warning just began — hold all spawns
      // this tick too (startWave set bossWarn), so nothing trickles out under the
      // incoming-boss telegraph.
      if (this.bossWarn > 0) return;
    }

    // Trickle spawns, drawn from the current theme's roster.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer += spawnInterval(this.elapsed) * (this.diff?.spawnMul || 1);
      if (this.enemies.length < this.capNow()) {
        const key = this.pickThemeEnemy();
        const n = packSize(key);
        for (let i = 0; i < n; i++) this.spawnRing(key);
      }
    }

    // Themed invader-formation waves, layered on top of the trickle (never
    // replacing it). The main anti-camp pressure: as the run goes on they arrive
    // more often and as multi-sided pincers. Telegraphed via spawnFormation.
    this.formationTimer -= dt;
    if (this.formationTimer <= 0) {
      // Cadence tightens over the run: ~16-22s early, down to ~6-10s late game.
      const base = Math.max(6, 16 - this.elapsed / 22);
      this.formationTimer = base + this.rng() * 5;
      if (this.wave >= 2) this.spawnFormation();
    }
  }

  // Begin a new wave: advance the counter, apply the theme for this wave, and —
  // on the cadence waves — queue a boss (every 10th) or guarantee an Elite (every
  // 5th). Normal waves just announce, with a theme banner at each 10-wave block.
  startWave(w) {
    this.wave = w;
    this.applyTheme(themeIndexForWave(w));
    if (isBossWave(w)) {
      this.pendingBossKey = bossKeyForWave(w);
      this.bossWarn = 2.4;
      this.audio?.play('bosswarn');
      this.shake(12);
      this.addText(this.player.x, this.player.y - 150, 'WARNING — WAVE ' + w, COLORS.danger, 28);
      return;
    }
    const themeStart = (w - 1) % WAVE.themeSize === 0; // first wave of a theme block
    const name = this.theme ? this.theme.name : '';
    const label = 'WAVE ' + w + (themeStart && name ? ' · ' + name.toUpperCase() : '');
    const color = themeStart && this.theme ? (this.theme.bg.accent || COLORS.gold) : COLORS.gold;
    this.addText(this.player.x, this.player.y - 120, label, color, themeStart ? 24 : 20);
    this.audio?.play('levelup');
    if (isEliteWave(w)) this.spawnThemeElite();
  }

  // Apply a theme by index (idempotent): swap the active roster and shift the
  // background palette so the arena visibly changes every 10 waves.
  applyTheme(idx) {
    const clamped = Math.min(THEMES.length - 1, Math.max(0, idx));
    if (clamped === this.themeIndex) return;
    this.themeIndex = clamped;
    this.theme = THEMES[clamped];
    this.background.setTheme(this.theme.bg);
  }

  // Pick a trickle/formation enemy from the current theme (falls back to the
  // time-gated table if no theme is active, which never happens in a real run).
  pickThemeEnemy() {
    return this.theme ? pickFromRoster(this.theme, this.rng) : pickEnemyType(this.elapsed, this.rng);
  }

  // Guarantee an Elite on Elite waves: pick an elite-eligible type from the theme
  // (xp>=2) and force-promote it, so 5/15/25/… always deliver a heavier threat.
  spawnThemeElite() {
    let key = this.pickThemeEnemy();
    for (let i = 0; i < 8; i++) {
      const k = this.pickThemeEnemy();
      const def = ENEMY_TYPES[k];
      if (def && (def.xp || 0) >= 2 && !def.boss) { key = k; break; }
    }
    const e = this.spawnRing(key);
    if (e) {
      this.makeElite(e);
      this.addText(this.player.x, this.player.y - 110, 'ELITE INBOUND', ELITE.ring, 22);
      this.audio?.play('bosswarn');
    }
  }

  // -------------------------------------------------------- bullets
  spawnBullet(x, y, angle, opts = {}) {
    const s = this.player.stats;
    const speed = (opts.speed ?? s.bulletSpeed) * (s.projectileSpeedMul || 1);
    this.bullets.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: opts.radius ?? (opts.drone ? s.bulletRadius * 0.8 : s.bulletRadius),
      dmg: opts.damage ?? s.damage,
      crit: !!opts.crit,
      pierce: opts.pierce ?? s.pierce,
      life: opts.life ?? s.bulletLife,
      homing: opts.homing ?? s.homing,
      knockback: opts.knockback ?? s.knockback,
      hits: null,
      angle,
      drone: !!opts.drone,
      tint: opts.tint || null,
      glow: opts.glow || null,
      explodeR: opts.explodeR || 0,
      explodeDmg: opts.explodeDmg || 0,
    });
  }

  // A quick expanding shockwave ring (pure cosmetic) used by AoE weapons. Drawn
  // with cheap pooled particles so it respects the particle budget during swarms.
  ring(x, y, radius, color) {
    const n = Math.min(26, Math.max(10, Math.round(radius / 10)));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      this.particles.spawn(x + Math.cos(a) * radius * 0.35, y + Math.sin(a) * radius * 0.35, color, {
        angle: a, speed: radius * 2.4, life: 0.26, size: 2.5, budget: 420,
      });
    }
  }

  muzzle(x, y, angle) {
    for (let i = 0; i < 3; i++) {
      this.particles.spawn(x, y, COLORS.player, { angle: angle + randRange(-0.3, 0.3), speed: 260, life: 0.18, size: 2, budget: 320 });
    }
  }

  spawnDashTrail(x, y) {
    this.particles.spawn(x, y, COLORS.playerGlow, { speed: 20, life: 0.35, size: 7, drag: 0.8 });
  }

  // -------------------------------------------------------- damage helpers
  damageEnemy(e, dmg, opts = {}) {
    if (!e.alive) return;
    const rounded = Math.max(1, Math.round(dmg));
    e.hp -= rounded;
    e.hitFlash = 1;
    if (opts.knockback && !e.massive) {
      const a = opts.angle ?? angleTo(opts.fromX ?? e.x, opts.fromY ?? e.y, e.x, e.y);
      e.kx += Math.cos(a) * opts.knockback;
      e.ky += Math.sin(a) * opts.knockback;
    }
    if (opts.text !== false) {
      this.addDamageText(e, rounded, opts.crit ? COLORS.gold : (opts.color || COLORS.white), opts.crit ? 20 : 14);
    }
    if (opts.crit) this.audio?.play('crit'); else if (opts.source === 'bullet') this.audio?.play('hit');
    // lifesteal (budgeted so leeching from a dense swarm can't fully out-heal it)
    if (opts.lifesteal && this.player.stats.lifesteal > 0) {
      this.player.lifestealHeal(rounded * this.player.stats.lifesteal);
    }
    if (e.hp <= 0) this.killEnemy(e, opts);
  }

  damageEnemiesInRadius(x, y, r, dmg, opts = {}) {
    const r2 = r * r;
    this.grid.query(x, y, r + 30, this._q);
    for (const e of this._q) {
      if (!e.alive) continue;
      if (dist2(x, y, e.x, e.y) <= r2 + e.radius * e.radius) {
        this.damageEnemy(e, dmg, { ...opts, fromX: x, fromY: y, text: opts.text });
      }
    }
  }

  killEnemy(e, opts = {}) {
    if (!e.alive) return;
    e.alive = false;
    this.kills++;
    this.streak += COMBO.perKill;
    this.comboTimer = COMBO.decay;
    const points = Math.round((e.boss ? 500 : 10 + e.maxHp * 0.3) * this.multiplier);
    this.score += points;
    this.player.addCharge(e.boss ? 40 : SINGULARITY.chargePerKill);

    // Overdrive meter: kills stoke the rampage gauge. Combo streak adds a little
    // extra so chaining kills fills it faster (Brotato/Isaac-style payoff).
    const odGain = (e.boss ? 34 : (e.massive ? 7 : 2.4)) * (this.player.stats.overdriveRate || 1)
      * (1 + Math.min(1.2, this.streak * 0.012));
    this.player.overdrive = Math.min(100, this.player.overdrive + odGain);

    // death FX
    const col = e.color;
    this.particles.burst(e.x, e.y, col, e.boss ? 80 : (e.massive ? 26 : 12), { speed: e.boss ? 420 : 220, life: 0.6, size: e.boss ? 4 : 3 });
    this.particles.burst(e.x, e.y, COLORS.white, e.boss ? 20 : 4, { speed: 160, life: 0.3, size: 2 });
    this.shake(e.boss ? 24 : (e.massive ? 6 : 2));
    this.audio?.play(e.boss ? 'implode' : 'explode');
    if (e.massive || e.boss) this.hitStopFor(e.boss ? 0.14 : 0.05);

    // XP orbs
    const orbCount = e.boss ? 40 : (e.massive ? 6 : (e.xp > 1 ? e.xp : 1));
    for (let i = 0; i < orbCount; i++) {
      const a = rand() * TAU; const sp = randRange(30, e.boss ? 260 : 150);
      this.orbs.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, value: 1, r: 4, t: 0 });
    }
    // occasional pickups
    if (!e.boss && chance(e.massive ? 0.4 : 0.04, this.rng)) this.dropPickup(e.x, e.y);
    if (e.boss) { this.dropPickup(e.x, e.y, 'nuke'); this.dropPickup(e.x + 30, e.y, 'heal'); }

    // type-specific on-death (e.g. splitter)
    if (e.type.onDeath) e.type.onDeath(e, this);

    // explosive upgrade
    if (opts.source !== 'explosion' && this.player.stats.explosiveChance > 0 && chance(this.player.stats.explosiveChance, this.rng)) {
      const edmg = (this.player.stats.explosiveDamage + e.maxHp * 0.25);
      this.explode(e.x, e.y, 110, edmg, COLORS.fire);
    }

    if (e.boss) { this.bossActive = null; this.bossKills++; this.flash = 0.6; this.addText(e.x, e.y - 80, 'BOSS DOWN!', COLORS.gold, 30); }
  }

  explode(x, y, r, dmg, color) {
    this.particles.burst(x, y, color, 30, { speed: 420, life: 0.5, size: 4 });
    this.particles.burst(x, y, COLORS.white, 8, { speed: 220, life: 0.3 });
    this.shake(8);
    this.audio?.play('explode');
    this.damageEnemiesInRadius(x, y, r, dmg, { source: 'explosion', color, knockback: 200 });
  }

  dropPickup(x, y, forced = null) {
    const type = forced || pick(['heal', 'magnet', 'nuke'], this.rng);
    this.pickups.push({ x, y, type, r: 11, t: 0, bob: rand() * TAU });
  }

  // reaction descriptor from elements.js resolved spatially here
  applyReaction(r, x, y, source) {
    const mult = this.player.stats.elementMul;
    this.reactions = (this.reactions || 0) + 1;
    this.addText(x, y - 30, r.name.toUpperCase(), r.color, 18);
    this.audio?.play('reaction');
    this.particles.burst(x, y, r.color, 12, { speed: 300, life: 0.5, size: 3, budget: 360 });
    this.flash = Math.max(this.flash, 0.18);
    if (r.type === 'burst' || r.type === 'field') {
      this.explodeReaction(x, y, (r.radius || 100), (r.damage || 30) * mult, r.color, r.knockback || 120);
    }
    if (r.type === 'chain' || r.chain) {
      this.chainLightning(x, y, r.chain || 4, (r.damage || 30) * mult, r.radius || 180, source);
    }
    if (r.freeze) {
      this.grid.query(x, y, r.radius || 120, this._q);
      for (const e of this._q) if (e.alive && dist(x, y, e.x, e.y) < (r.radius || 120)) e.status.freeze = Math.max(e.status.freeze, r.freeze);
    }
    if (r.slow) {
      this.grid.query(x, y, r.radius || 150, this._q);
      for (const e of this._q) if (e.alive && dist(x, y, e.x, e.y) < (r.radius || 150)) { e.status.slowField = Math.max(e.status.slowField, r.slowDur || 2); e.status.slowFieldAmt = r.slow; }
    }
    if (r.pull) this.miniPull(x, y, r.radius || 160, 260);
  }

  explodeReaction(x, y, r, dmg, color, knock) {
    this.damageEnemiesInRadius(x, y, r, dmg, { source: 'reaction', color, knockback: knock });
    for (let i = 0; i < 2; i++) this.particles.spawn(x, y, color, { speed: 60, life: 0.4, size: r * 0.12, budget: 300 });
  }

  chainLightning(x, y, jumps, dmg, radius, origin) {
    let cx = x, cy = y;
    const hit = new Set(origin ? [origin] : []);
    for (let j = 0; j < jumps; j++) {
      let best = null, bestD = radius * radius;
      this.grid.query(cx, cy, radius, this._q);
      for (const e of this._q) {
        if (!e.alive || hit.has(e)) continue;
        const d = dist2(cx, cy, e.x, e.y);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) break;
      hit.add(best);
      this.drawBolt(cx, cy, best.x, best.y, COLORS.shock);
      this.damageEnemy(best, dmg, { source: 'reaction', color: COLORS.shock, knockback: 40 });
      cx = best.x; cy = best.y;
    }
  }

  drawBolt(x1, y1, x2, y2, color) {
    const seg = 5;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const px = lerp(x1, x2, t) + randRange(-8, 8);
      const py = lerp(y1, y2, t) + randRange(-8, 8);
      this.particles.spawn(px, py, color, { speed: 20, life: 0.22, size: 2.5, budget: 300 });
    }
  }

  miniPull(x, y, radius, force) {
    this.grid.query(x, y, radius, this._q);
    for (const e of this._q) {
      if (!e.alive || e.massive) continue;
      const a = angleTo(e.x, e.y, x, y);
      e.kx += Math.cos(a) * force;
      e.ky += Math.sin(a) * force;
    }
  }

  // -------------------------------------------------------- singularity
  deploySingularity(x, y) {
    const s = this.player.stats;
    this.singularities.push({
      x, y, t: 0, duration: SINGULARITY.duration,
      r: 6, maxR: SINGULARITY.coreRadius * s.singularityRadiusMul,
      pullRadius: SINGULARITY.pullRadius * s.singularityRadiusMul,
      implosionRadius: SINGULARITY.implosionRadius * s.singularityRadiusMul,
      implosionDamage: SINGULARITY.implosionDamage * s.singularityDamageMul,
      dot: SINGULARITY.dotPerSecond * s.singularityDamageMul,
      spin: 0, imploded: false,
    });
    this.audio?.play('singularity');
    this.shake(8);
    this.flash = Math.max(this.flash, 0.2);
    this.addText(x, y - 40, 'SINGULARITY', COLORS.void, 20);
  }

  updateSingularities(dt) {
    for (let i = this.singularities.length - 1; i >= 0; i--) {
      const sg = this.singularities[i];
      sg.t += dt;
      sg.spin += dt * 6;
      sg.r = lerp(6, sg.maxR, Math.min(1, sg.t / 0.4));
      // pull + damage enemies
      this.grid.query(sg.x, sg.y, sg.pullRadius, this._q);
      for (const e of this._q) {
        if (!e.alive) continue;
        const d = dist(sg.x, sg.y, e.x, e.y) || 1;
        if (d < sg.pullRadius) {
          const pull = SINGULARITY.pullForce * (1 - d / sg.pullRadius) * (e.massive ? 0.25 : 1);
          const a = angleTo(e.x, e.y, sg.x, sg.y);
          e.kx += Math.cos(a) * pull * dt * 8;
          e.ky += Math.sin(a) * pull * dt * 8;
          this.damageEnemy(e, sg.dot * dt, { text: false, source: 'void' });
          applyElement(e.status, 'void', 1);
        }
      }
      // pull enemy bullets in and destroy
      for (let b = this.enemyBullets.length - 1; b >= 0; b--) {
        const eb = this.enemyBullets[b];
        const d = dist(sg.x, sg.y, eb.x, eb.y);
        if (d < sg.pullRadius) {
          const a = angleTo(eb.x, eb.y, sg.x, sg.y);
          eb.vx += Math.cos(a) * 900 * dt;
          eb.vy += Math.sin(a) * 900 * dt;
          if (d < sg.r + 14) { this.enemyBullets.splice(b, 1); this.particles.spawn(eb.x, eb.y, COLORS.void, { speed: 40, life: 0.3 }); }
        }
      }
      // accretion particles
      if (chance(0.5)) {
        const p = randOnCircle(sg.x, sg.y, sg.pullRadius * randRange(0.5, 1));
        this.particles.spawn(p.x, p.y, pick([COLORS.void, COLORS.shock, COLORS.white]), { vx: (sg.x - p.x) * 2, vy: (sg.y - p.y) * 2, life: 0.5, size: 2, budget: 500 });
      }
      if (sg.t >= sg.duration && !sg.imploded) {
        sg.imploded = true;
        this.implode(sg);
        this.singularities.splice(i, 1);
      }
    }
  }

  implode(sg) {
    this.audio?.play('implode');
    this.shake(22);
    this.hitStopFor(0.08);
    this.flash = Math.max(this.flash, 0.4);
    this.particles.burst(sg.x, sg.y, COLORS.void, 60, { speed: 520, life: 0.7, size: 4 });
    this.particles.burst(sg.x, sg.y, COLORS.white, 20, { speed: 320, life: 0.4 });
    this.damageEnemiesInRadius(sg.x, sg.y, sg.implosionRadius, sg.implosionDamage, { source: 'explosion', color: COLORS.void, knockback: 360 });
  }

  densestCluster(x, y, radius) {
    let sx = 0, sy = 0, n = 0;
    this.grid.query(x, y, radius, this._q);
    for (const e of this._q) {
      if (!e.alive) continue;
      if (dist2(x, y, e.x, e.y) < radius * radius) { sx += e.x; sy += e.y; n++; }
    }
    if (n === 0) return null;
    return { x: sx / n, y: sy / n, n };
  }

  // -------------------------------------------------------- text popups
  addText(x, y, text, color, size = 14) {
    const t = this._textPool.pop() || {};
    t.x = x + randRange(-6, 6); t.y = y; t.vy = -42;
    t.life = 0.9; t.maxLife = 0.9; t.text = text; t.color = color; t.size = size;
    t.num = 0; t.owner = null;
    this._pushText(t);
    return t;
  }

  _pushText(t) {
    const texts = this.texts;
    if (texts.length >= this.maxTexts) {
      // Recycle the oldest text (texts are pushed in age order) to bound work.
      const old = texts.shift();
      if (old.owner && old.owner._dmgText === old) old.owner._dmgText = null;
      this._textPool.push(old);
    }
    texts.push(t);
  }

  // Merge repeated damage on the same enemy into a single rising number so that a
  // storm of hits produces one growing total instead of hundreds of overlapping
  // fillText draws. Falls back to a fresh text when none is active on the enemy.
  addDamageText(e, amount, color, size) {
    const cur = e._dmgText;
    if (cur && cur.owner === e && cur.life > cur.maxLife * 0.45) {
      cur.num += amount;
      cur.text = String(cur.num);
      cur.life = cur.maxLife;
      cur.x = e.x + randRange(-4, 4);
      cur.y = e.y - e.radius - 6;
      if (size > cur.size) cur.size = size;
      if (color === COLORS.gold) cur.color = color;
      return cur;
    }
    const t = this.addText(e.x, e.y - e.radius - 6, String(amount), color, size);
    t.num = amount; t.owner = e; e._dmgText = t;
    return t;
  }

  // -------------------------------------------------------- pickups & xp
  gainXp(n) {
    this.xp += n * this.player.stats.xpMul;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = xpForLevel(this.level);
      this.triggerLevelUp();
    }
  }

  triggerLevelUp() {
    this.audio?.play('levelup');
    this.flash = Math.max(this.flash, 0.3);
    this.particles.burst(this.player.x, this.player.y, COLORS.xp, 30, { speed: 260, life: 0.6 });
    this.rerollsLeft = (this.player.stats.rerolls || 0) + 1;
    this.banishLeft = (this.player.stats.banishes || 0) + 1;
    const choices = draftUpgrades(this.player, 3, this.rng);
    this.pendingChoices = choices;
    this.state = 'levelup';
    if (this.onLevelUp) this.onLevelUp(choices);
  }

  // Re-roll the current level-up offer (limited uses per level).
  rerollChoices() {
    if (this.state !== 'levelup' || this.rerollsLeft <= 0) return false;
    this.rerollsLeft--;
    this.pendingChoices = draftUpgrades(this.player, 3, this.rng);
    this.audio?.play('ui');
    if (this.onLevelUp) this.onLevelUp(this.pendingChoices);
    return true;
  }

  // Banish one offered card (remove it from this run) and redraw a fresh set.
  banishChoice(card) {
    if (this.state !== 'levelup' || this.banishLeft <= 0 || !card) return false;
    this.banishLeft--;
    this.player.banished[card.id] = true;
    this.pendingChoices = draftUpgrades(this.player, 3, this.rng);
    this.audio?.play('ui');
    if (this.onLevelUp) this.onLevelUp(this.pendingChoices);
    return true;
  }

  applyUpgrade(up) {
    const p = this.player;
    if (up.kind === 'item') {
      up.apply(p.stats);
      p.upgradeCounts[up.id] = (p.upgradeCounts[up.id] || 0) + 1;
    } else if (up.kind === 'weapon-new' || up.kind === 'weapon-up') {
      addOrLevelWeapon(p, up.weaponId);
    } else if (up.kind === 'evolve') {
      const inst = p.weapons.find((w) => w.id === up.weaponId);
      if (inst) { evolveWeapon(p, inst); this.flash = Math.max(this.flash, 0.4); this.audio?.play('implode'); }
    } else if (typeof up.apply === 'function') {
      // Legacy stat-only upgrade.
      up.apply(p.stats);
      if (up.id) p.upgradeCounts[up.id] = (p.upgradeCounts[up.id] || 0) + 1;
    }
    p.syncDrones();
    p.hp = Math.min(p.stats.maxHp, p.hp);
    this.pendingChoices = null;
    this.state = 'playing';
    this.audio?.play('ui');
  }

  applyPickup(p) {
    if (p.type === 'heal') { this.player.heal(30); this.addText(this.player.x, this.player.y - 30, '+30', COLORS.heal, 18); }
    else if (p.type === 'magnet') {
      for (const o of this.orbs) o.magnet = true;
      this.addText(this.player.x, this.player.y - 30, 'MAGNET', COLORS.gold, 18);
    } else if (p.type === 'nuke') {
      this.addText(this.player.x, this.player.y - 30, 'NOVA', COLORS.danger, 22);
      this.flash = 0.6; this.shake(20); this.audio?.play('implode');
      for (const e of this.enemies.slice()) if (e.alive && !e.boss) this.damageEnemy(e, 200, { source: 'explosion', knockback: 300 });
      for (const e of this.enemies) if (e.boss) this.damageEnemy(e, 400, { source: 'explosion' });
    }
    this.audio?.play('pickup');
  }

  // ========================================================= UPDATE
  update(dt, cmd) {
    if (this.state !== 'playing') return;
    // time scaling: hit-stop then bullet-time
    let ts = 1;
    if (this.hitStop > 0) { this.hitStop -= dt; ts = 0.0; }
    else if (this.bulletTime > 0) { this.bulletTime -= dt; ts = this.bulletTimeScale; }
    this.timeScale = ts;
    const sdt = dt * ts;

    this.flash = Math.max(0, this.flash - dt * 2);

    // real-time-ish updates (camera/particles use real dt for responsiveness)
    if (sdt > 0) this.step(sdt, cmd);
    else {
      // during hitstop still let the player aim command be captured next frame
    }

    // combo decay uses real dt so streak drops even in slow-mo pauses
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.streak = 0; }

    this.particles.update(dt);
    this.background.update(dt, this.player.vx, this.player.vy);
    this.camera.follow(this.player.x, this.player.y, dt);

    if (!this.player.alive && this.state === 'playing') {
      if (this.revives > 0) this.revivePlayer();
      else this.endRun();
    }
  }

  // Phoenix Protocol: spend a stored revive to bring the player back mid-run with
  // half HP, brief invulnerability and a clearing nova so you aren't instantly
  // re-killed. Driven by the meta bonus (this.revives) set at run start.
  revivePlayer() {
    this.revives--;
    const p = this.player;
    p.alive = true;
    p.hp = Math.max(1, Math.round(p.stats.maxHp * 0.5));
    p.invuln = Math.max(p.invuln, 2.2);
    p.overdriveTime = Math.max(p.overdriveTime, 3);
    this.flash = 0.8;
    this.shake(24);
    this.hitStopFor(0.1);
    this.audio?.play('levelup');
    this.addText(p.x, p.y - 50, 'PHOENIX REVIVE', COLORS.fire, 30);
    this.particles.burst(p.x, p.y, COLORS.fire, 60, { speed: 360, life: 0.8 });
    // clear nearby threats so the revive actually lands
    for (const e of this.enemies.slice()) {
      if (e.alive && !e.boss && dist2(p.x, p.y, e.x, e.y) < 360 * 360) {
        this.damageEnemy(e, 400, { source: 'explosion', knockback: 420 });
      }
    }
    for (const b of this.enemyBullets) b.life = 0;
  }

  step(dt, cmd) {
    this.elapsed += dt;

    // rebuild grid
    this.grid.clear();
    for (const e of this.enemies) if (e.alive) this.grid.insert(e);

    this.updateDirector(dt);
    this.player.update(dt, this, cmd);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateEnemyBullets(dt);
    this.updateSingularities(dt);
    this.updateOrbs(dt);
    this.updatePickups(dt);
    this.updateTexts(dt);
  }

  updateEnemies(dt) {
    const p = this.player;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) { this.enemies.splice(i, 1); continue; }
      e.hitFlash = Math.max(0, e.hitFlash - dt * 4);
      e.spin += dt;

      const eff = tickStatus(e.status, dt);
      if (eff.dot > 0) this.damageEnemy(e, eff.dot, { text: false, source: 'dot', color: COLORS.fire });
      if (!e.alive) { this.enemies.splice(i, 1); continue; }

      e.type.update(e, dt, this);

      const slow = eff.frozen ? 0 : eff.slow;
      e.x += e.vx * slow * dt + e.kx * dt;
      e.y += e.vy * slow * dt + e.ky * dt;
      e.kx *= Math.pow(0.02, dt);
      e.ky *= Math.pow(0.02, dt);

      // separation from very close enemies (cheap, keeps them from stacking)
      // handled lightly to avoid O(n^2): skip for perf at high counts

      e.x = clamp(e.x, 16, ARENA.w - 16);
      e.y = clamp(e.y, 16, ARENA.h - 16);

      // contact damage
      e.contactT = Math.max(0, e.contactT - dt);
      const rr = e.radius + p.radius;
      if (e.contactT <= 0 && dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        // Short contact i-frames (not the full projectile window) so that being
        // surrounded keeps dealing damage — you must keep moving, not turtle.
        const dealt = p.takeDamage(e.damage, this, PLAYER.contactInvuln);
        if (dealt > 0) {
          e.contactT = PLAYER.contactCooldown;
          const a = angleTo(p.x, p.y, e.x, e.y);
          p.x -= Math.cos(a) * 6; p.y -= Math.sin(a) * 6;
        }
      }
    }
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      if (b.life <= 0) { this.bullets.splice(i, 1); continue; }
      // homing — reacquiring a target is a grid query, so only re-scan a few
      // times per second (or when the current target dies) and steer toward the
      // cached target every frame. Steering feel is unchanged; query count drops ~6x.
      if (b.homing > 0) {
        b._htime = (b._htime || 0) - dt;
        if (!b._target || !b._target.alive || b._htime <= 0) {
          b._htime = 0.1;
          let best = null, bestD = 300 * 300;
          this.grid.query(b.x, b.y, 300, this._q);
          for (const e of this._q) { if (!e.alive) continue; const d = dist2(b.x, b.y, e.x, e.y); if (d < bestD) { bestD = d; best = e; } }
          b._target = best;
        }
        const best = b._target;
        if (best && best.alive) {
          const desired = angleTo(b.x, b.y, best.x, best.y);
          b.angle = b.angle ?? Math.atan2(b.vy, b.vx);
          let diff = ((desired - b.angle + Math.PI) % TAU) - Math.PI;
          b.angle += clamp(diff, -b.homing * dt, b.homing * dt);
          const sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(b.angle) * sp; b.vy = Math.sin(b.angle) * sp;
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (chance(0.25)) this.particles.spawn(b.x, b.y, b.tint || (b.crit ? COLORS.gold : COLORS.player), { speed: 10, life: 0.18, size: b.r * 0.7, budget: 700 });

      // collide with enemies
      this.grid.query(b.x, b.y, b.r + 30, this._q);
      let consumed = false;
      for (const e of this._q) {
        if (!e.alive) continue;
        if (b.hits && b.hits.has(e)) continue;
        const rr = e.radius + b.r;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          this.hitEnemyWithBullet(b, e);
          if (b.pierce > 0) {
            b.pierce--;
            if (!b.hits) b.hits = new Set();
            b.hits.add(e);
          } else { consumed = true; break; }
        }
      }
      if (consumed && b.explodeR > 0) this.explode(b.x, b.y, b.explodeR, b.explodeDmg, b.tint || COLORS.fire);
      if (consumed || b.x < 0 || b.y < 0 || b.x > ARENA.w || b.y > ARENA.h) this.bullets.splice(i, 1);
    }
  }

  hitEnemyWithBullet(b, e) {
    const s = this.player.stats;
    this.damageEnemy(e, b.dmg, { crit: b.crit, source: 'bullet', knockback: b.knockback, angle: Math.atan2(b.vy, b.vx), lifesteal: true });
    this.particles.burst(b.x, b.y, COLORS.white, 2, { speed: 140, life: 0.2, size: 2, budget: 500 });
    if (!e.alive) return;
    // elemental imbues -> possible reactions
    for (const key of ['fire', 'cryo', 'shock', 'void']) {
      const c = s.imbue[key];
      if (c > 0 && chance(c, this.rng)) {
        const reaction = applyElement(e.status, key, s.elementMul);
        if (reaction) this.applyReaction(reaction, e.x, e.y, e);
      }
    }
  }

  updateEnemyBullets(dt) {
    const p = this.player;
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (chance(0.15)) this.particles.spawn(b.x, b.y, b.color, { speed: 8, life: 0.2, size: b.r * 0.6, budget: 700 });
      const rr = p.radius + b.r;
      if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
        p.takeDamage(b.dmg, this);
        this.enemyBullets.splice(i, 1);
        continue;
      }
      if (b.life <= 0 || b.x < -40 || b.y < -40 || b.x > ARENA.w + 40 || b.y > ARENA.h + 40) this.enemyBullets.splice(i, 1);
    }
  }

  updateOrbs(dt) {
    const p = this.player;
    const pr = p.stats.pickupRadius;
    const attract = pr * 2.6; // soft long-range vacuum so sweeping gathers XP
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.t += dt;
      o.vx *= Math.pow(0.1, dt); o.vy *= Math.pow(0.1, dt);
      const d = dist(o.x, o.y, p.x, p.y);
      if (o.magnet || d < pr) {
        const a = angleTo(o.x, o.y, p.x, p.y);
        const sp = p.stats.magnetSpeed * (o.magnet ? 1.4 : clamp(1 - d / pr, 0.15, 1) + 0.2);
        o.x += Math.cos(a) * sp * dt; o.y += Math.sin(a) * sp * dt;
      } else if (d < attract) {
        // gentle pull once the orb has settled; grows as it nears the magnet ring
        const a = angleTo(o.x, o.y, p.x, p.y);
        const pull = p.stats.magnetSpeed * 0.45 * clamp(1 - (d - pr) / (attract - pr), 0.12, 1);
        o.x += Math.cos(a) * pull * dt; o.y += Math.sin(a) * pull * dt;
        o.x += o.vx * dt; o.y += o.vy * dt;
      } else {
        o.x += o.vx * dt; o.y += o.vy * dt;
      }
      if (d < p.radius + 8) {
        this.gainXp(o.value);
        this.orbs.splice(i, 1);
        this.particles.spawn(p.x, p.y, COLORS.xp, { speed: 60, life: 0.3, size: 2 });
        this.audio?.play('pickup', { pitch: Math.min(12, this.streak) });
      }
    }
  }

  updatePickups(dt) {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const it = this.pickups[i];
      it.t += dt; it.bob += dt * 3;
      const d = dist(it.x, it.y, p.x, p.y);
      if (d < p.stats.pickupRadius * 1.1) {
        const a = angleTo(it.x, it.y, p.x, p.y);
        it.x += Math.cos(a) * 260 * dt; it.y += Math.sin(a) * 260 * dt;
      }
      if (d < p.radius + 12) { this.applyPickup(it); this.pickups.splice(i, 1); }
    }
  }

  updateTexts(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt; t.y += t.vy * dt; t.vy *= Math.pow(0.1, dt);
      if (t.life <= 0) {
        if (t.owner && t.owner._dmgText === t) t.owner._dmgText = null;
        this.texts.splice(i, 1);
        this._textPool.push(t);
      }
    }
  }

  endRun() {
    this.state = 'gameover';
    this.audio?.play('gameover');
    this.flash = 0.5;
    const summary = {
      score: this.score, time: this.elapsed, level: this.level, kills: this.kills,
      bossKills: this.bossKills || 0,
      reactions: this.reactions || 0,
      shipId: this.shipId,
      directives: this.directives ? this.directives.length : 0,
    };
    const { newBest } = this.store ? this.store.recordRun(summary) : { newBest: false };
    summary.newBest = newBest;
    summary.highScore = this.store ? this.store.get().highScore : this.score;

    // Award Stardust (meta currency) for this run, scaled by the salvage meta and
    // by the combined Stardust bonus of any active challenge directives.
    const base = stardustForRun(summary);
    const earned = Math.floor(base * (this.metaBonus?.stardustMul || 1) * (this.diff?.stardustMul || 1));
    summary.stardust = earned;
    if (this.store?.addStardust) {
      this.store.addStardust(earned);
      summary.stardustTotal = this.store.get().stardust;
    }

    if (this.onGameOver) this.onGameOver(summary);
  }

  // ========================================================= RENDER
  render(ctx) {
    const cam = this.camera;
    this.background.render(ctx, cam, this.viewW, this.viewH);

    cam.begin(ctx);
    this.drawArena(ctx);
    this.drawSingularities(ctx, 'under');
    this.drawOrbs(ctx);
    this.drawPickups(ctx);
    this.drawEnemies(ctx);
    this.drawEnemyBullets(ctx);
    this.drawEliteRings(ctx);
    this.drawPlayer(ctx);
    this.drawBullets(ctx);
    this.particles.render(ctx, this.camera.viewBounds(40));
    this.drawSingularities(ctx, 'over');
    this.drawTexts(ctx);
    cam.end(ctx);

    this.drawVignette(ctx);
  }

  drawArena(ctx) {
    const b = this.camera.viewBounds(40);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    const step = 80;
    ctx.beginPath();
    for (let x = Math.floor(b.minX / step) * step; x < b.maxX; x += step) {
      if (x < 0 || x > ARENA.w) continue;
      ctx.moveTo(x, Math.max(0, b.minY)); ctx.lineTo(x, Math.min(ARENA.h, b.maxY));
    }
    for (let y = Math.floor(b.minY / step) * step; y < b.maxY; y += step) {
      if (y < 0 || y > ARENA.h) continue;
      ctx.moveTo(Math.max(0, b.minX), y); ctx.lineTo(Math.min(ARENA.w, b.maxX), y);
    }
    ctx.stroke();
    // arena border glow
    ctx.strokeStyle = 'rgba(80,233,255,0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, ARENA.w, ARENA.h);
  }

  drawPlayer(ctx) {
    const p = this.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    // thrust flame (live, additive) — reads p.thrust / p.faceAngle, same feel.
    if (p.thrust > 0.1 && !p.dashing) {
      ctx.save();
      ctx.rotate(p.faceAngle);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = COLORS.thrust;
      ctx.globalAlpha = p.thrust;
      ctx.beginPath();
      ctx.moveTo(-p.radius, -5); ctx.lineTo(-p.radius - 14 - Math.random() * 8, 0); ctx.lineTo(-p.radius, 5);
      ctx.fill();
      ctx.restore();
    }
    // invuln blink (skipped while dashing, which has its own look).
    ctx.globalAlpha = p.invuln > 0 && !p.dashing ? (Math.sin(performance.now() / 40) * 0.3 + 0.6) : 1;

    // Cached 3D hull sprite: the detailed, lit starfighter is baked once per ship
    // colour / radius / hit-flash state (its glow + volumetric shading cost nothing
    // per frame) and blitted rotated to the aim angle.
    const hull = p.shipColor || COLORS.player;
    const flash = p.hitFlash > 0;
    const r = p.radius;
    const pal = paletteFor(hull);
    const spr = glowSprite(
      'ship|' + hull + '|' + (flash ? 1 : 0) + '|' + r,
      r * 1.75, Math.ceil(r * 0.9),
      (g) => drawShipBody(g, r, { hull, accent: pal.accent, highlight: pal.highlight, flash }),
    );

    ctx.rotate(p.aimAngle);
    // Dash: an extra additive bloom for the "bigger glow" dash feel (live).
    if (p.dashing) {
      const glow = p.shipColor || COLORS.playerGlow;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (typeof ctx.createRadialGradient === 'function') {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
        g.addColorStop(0, withAlpha(glow, 0.5));
        g.addColorStop(1, withAlpha(glow, 0));
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = withAlpha(glow, 0.25);
      }
      ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (spr) ctx.drawImage(spr.canvas, -spr.off, -spr.off);
    else drawShipBody(ctx, r, { hull, accent: pal.accent, highlight: pal.highlight, flash });

    // Crisp live cockpit glow over the baked canopy for extra sparkle.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = '#eafcff'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#eafcff';
    ctx.beginPath(); ctx.arc(r * 0.42, 0, Math.max(2, r * 0.18), 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();

    // drones — small cached 3D orb sprites (domed, lit from the upper-left).
    for (const d of p.drones) {
      if (d.x === undefined) continue;
      const dr = 5;
      const dspr = glowSprite(
        'drone|' + COLORS.cryo + '|' + dr,
        dr * 1.6, Math.ceil(dr * 0.9),
        (g) => drawDroneBody(g, dr, { hull: COLORS.cryo }),
      );
      ctx.save();
      ctx.translate(d.x, d.y);
      if (dspr) ctx.drawImage(dspr.canvas, -dspr.off, -dspr.off);
      else drawDroneBody(ctx, dr, { hull: COLORS.cryo });
      ctx.restore();
    }
  }

  drawEnemies(ctx) {
    // Cull to the visible viewport (plus a margin for the largest boss + glow)
    // so off-screen enemies cost nothing, and blit cached glow sprites instead
    // of paying ctx.shadowBlur per enemy every frame. The detailed, static hull
    // is baked once per shape/colour/radius (drawEnemyBody); only the boss energy
    // core is animated live below.
    const b = this.camera.viewBounds(160);
    const elites = this._eliteFrame;
    elites.length = 0;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.x < b.minX || e.x > b.maxX || e.y < b.minY || e.y > b.maxY) continue;
      const dom = dominantElement(e.status);
      let fill = e.hitFlash > 0 ? '#ffffff' : e.color;
      if (e.status.freeze > 0) fill = COLORS.cryo;
      const glowColor = dom ? dom.color : e.color;
      const blur = dom ? 14 : (e.boss ? 24 : 6);
      const shape = e.type.shape;
      const r = e.radius;
      // Plating/rim/eye palette derives from the enemy's own base colour (not the
      // possibly white/cryo `fill`), so it stays stable through hit-flash/freeze.
      const pal = paletteFor(e.color);
      const spr = glowSprite(
        'e|' + shape + '|' + r + '|' + fill + '|' + glowColor + '|' + blur + '|' + e.color,
        r, blur,
        (g) => drawEnemyBody(g, shape, r, { fill, glow: glowColor, blur, accent: pal.accent, highlight: pal.highlight, eye: pal.eye }),
      );
      ctx.save();
      ctx.translate(e.x, e.y);
      // Pixel invaders, saucers and bosses read as upright craft; faceted shapes
      // keep their per-spawn tilt (and bosses' slow spin) for variety.
      if (!isUpright(shape)) ctx.rotate(e.spin * (e.massive ? 0.3 : 1));
      if (spr) {
        ctx.drawImage(spr.canvas, -spr.off, -spr.off);
      } else {
        drawEnemyBody(ctx, shape, r, { fill, glow: glowColor, blur, accent: pal.accent, highlight: pal.highlight, eye: pal.eye });
      }
      // Live animated energy core makes the boss fight feel epic. Only a couple of
      // bosses are ever on screen, so this per-frame glow is negligible.
      if (e.boss) {
        // Random per-boss phase so multiple bosses don't pulse in lockstep.
        if (e._coreT === undefined) e._coreT = rand() * 6;
        drawBossCore(ctx, r, { time: now + e._coreT, color: e.color, ring: pal.highlight });
      }
      ctx.restore();

      // Defer the elite marker ring to drawEliteRings() so it lands on top of the
      // enemy-bullet layer and always reads as an at-a-glance threat cue.
      if (e.elite) elites.push(e);

      if (e.boss) this.drawBossBar(ctx, e);
      else if (e.maxHp > 60 && e.hp < e.maxHp) this.drawHpBar(ctx, e);
      // Telegraph cue for a charging boss special, drawn over the body so the
      // player can read the incoming attack and pre-position a dodge.
      if (e.tele && e.tele.t > 0) this.drawTelegraph(ctx, e);
    }
  }

  // Draw the warning for a boss's charging special: a pulsing ring that tightens
  // onto the boss as the attack charges, a radial "charge meter" arc, and — for
  // aimed specials — a lance pointing at the player so the threat direction is
  // unmistakable. Purely cosmetic; the fire itself happens in enemies.bossThink.
  drawTelegraph(ctx, e) {
    const tl = e.tele;
    const k = clamp(1 - Math.max(0, tl.t) / (tl.dur || 1), 0, 1); // 0 -> 1 as it charges
    const col = tl.color || COLORS.danger;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Pulsing warning ring that closes in on the boss.
    const rr = e.radius * (1.15 + (1 - k) * 1.7);
    ctx.strokeStyle = withAlpha(col, 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(now / 60)));
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(e.x, e.y, rr, 0, TAU); ctx.stroke();
    // Charge meter: an arc that fills clockwise as the windup completes.
    ctx.strokeStyle = withAlpha(col, 0.95);
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 10, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.stroke();
    // Directional lance toward the player for aimed specials.
    if (tl.aim) {
      const a = angleTo(e.x, e.y, this.player.x, this.player.y);
      const len = 170 + k * 170;
      ctx.strokeStyle = withAlpha(col, 0.3 + 0.45 * k);
      ctx.lineWidth = 3 + k * 4;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(a) * len, e.y + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Elite markers: a crisp, non-rotating gold glow ring just outside each elite's
  // body. Drawn after the enemy bullets (so the cue is never buried under fire)
  // from a cached glow sprite (keyed by integer radius) — a single blit each,
  // never a per-frame shadowBlur. Fed by the reused this._eliteFrame buffer.
  drawEliteRings(ctx) {
    for (const e of this._eliteFrame) {
      // Defensive only: the buffer holds elites that were alive during the cull
      // and rendering never kills anything, so this never fires today — but it
      // keeps a ring from ever floating over a corpse if the draw order changes.
      if (!e.alive) continue;
      const rr = e.radius + 5;
      const ring = glowSprite('elite|' + Math.round(rr), rr, 10, (g) => {
        g.shadowColor = ELITE.ring; g.shadowBlur = 10;
        g.strokeStyle = ELITE.ring; g.lineWidth = 2.5;
        g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke();
      });
      if (ring) {
        ctx.drawImage(ring.canvas, e.x - ring.off, e.y - ring.off);
      } else {
        ctx.save();
        ctx.shadowColor = ELITE.ring; ctx.shadowBlur = 10;
        ctx.strokeStyle = ELITE.ring; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, rr, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Thin wrapper kept for compatibility: the authoritative silhouette geometry
  // now lives in enemyArt.enemyPath (shared by the fill and the dark outline).
  drawShape(ctx, shape, r) {
    enemyPath(ctx, shape, r);
    ctx.fill();
  }

  drawHpBar(ctx, e) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 9, w, 4);
    ctx.fillStyle = COLORS.danger;
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 9, w * clamp(e.hp / e.maxHp, 0, 1), 4);
  }

  drawBossBar(ctx, e) {
    const frac = clamp(e.hp / e.maxHp, 0, 1);
    const w = e.radius * 2.6;
    const h = 7;
    const x = e.x - w / 2;
    const y = e.y - e.radius - 20;
    // Housing with a danger-tinted border so the boss bar reads as a heavy,
    // segmented health gauge rather than a thin enemy strip.
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    // Glowing fill.
    ctx.save();
    ctx.shadowColor = COLORS.danger; ctx.shadowBlur = 10;
    ctx.fillStyle = COLORS.danger;
    ctx.fillRect(x, y, w * frac, h);
    ctx.restore();
    // Hot leading edge.
    ctx.fillStyle = '#ffd0dc';
    ctx.fillRect(x + Math.max(0, w * frac - 2), y, 2, h);
    // Segment ticks (quarters) for an at-a-glance "phase" read.
    ctx.fillStyle = 'rgba(6,10,22,0.85)';
    for (let i = 1; i < 4; i++) ctx.fillRect(x + (w * i) / 4 - 1, y, 1.5, h);
    // Bright border.
    ctx.strokeStyle = withAlpha(COLORS.danger, 0.9);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  }

  drawBullets(ctx) {
    const bnd = this.camera.viewBounds(60);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.bullets) {
      if (b.x < bnd.minX || b.x > bnd.maxX || b.y < bnd.minY || b.y > bnd.maxY) continue;
      const color = b.tint || (b.crit ? COLORS.gold : COLORS.player);
      const glow = b.glow || (b.crit ? COLORS.gold : COLORS.playerGlow);
      // A bullet's radius/crit/tint never change, so resolve its glow sprite once
      // and cache it on the bullet — avoids rebuilding the key string every frame.
      let spr = b._spr;
      if (spr === undefined) {
        spr = glowSprite('b|' + b.r + '|' + (b.crit ? 1 : 0) + '|' + color, b.r * 2.2, 12, (g) => {
          g.fillStyle = color; g.shadowColor = glow; g.shadowBlur = 12;
          g.beginPath(); g.ellipse(0, 0, b.r * 2.2, b.r, 0, 0, TAU); g.fill();
        });
        b._spr = spr;
      }
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      if (spr) {
        ctx.drawImage(spr.canvas, -spr.off, -spr.off);
      } else {
        ctx.fillStyle = color; ctx.shadowColor = glow; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.ellipse(0, 0, b.r * 2.2, b.r, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
  }

  drawEnemyBullets(ctx) {
    const bnd = this.camera.viewBounds(50);
    // Enemy fire reads as a solid, high-contrast *danger pellet*: a dark rim, a
    // saturated body in the firer's colour, and a white-hot core, with only a
    // tight glow. Drawn source-over (not additive) and on top of the enemies, so
    // incoming shots never blend into the enemy bloom the way the old additive
    // same-colour dots did — the core/rim make them unmistakably projectiles.
    for (const b of this.enemyBullets) {
      if (b.x < bnd.minX || b.x > bnd.maxX || b.y < bnd.minY || b.y > bnd.maxY) continue;
      let spr = b._spr;
      if (spr === undefined) {
        const r = b.r;
        const blur = Math.max(5, r * 0.7);
        spr = glowSprite('eb2|' + r + '|' + b.color, r + 2.5, blur, (g) => {
          g.shadowColor = b.color; g.shadowBlur = blur;
          g.fillStyle = 'rgba(8,2,12,0.92)';
          g.beginPath(); g.arc(0, 0, r + 1.5, 0, TAU); g.fill();
          g.shadowBlur = 0;
          g.fillStyle = b.color;
          g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
          g.fillStyle = '#ffffff';
          g.beginPath(); g.arc(0, 0, Math.max(1.6, r * 0.42), 0, TAU); g.fill();
        });
        b._spr = spr;
      }
      if (spr) {
        ctx.drawImage(spr.canvas, b.x - spr.off, b.y - spr.off);
      } else {
        ctx.fillStyle = 'rgba(8,2,12,0.92)';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 1.5, 0, TAU); ctx.fill();
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(1.6, b.r * 0.42), 0, TAU); ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }

  drawOrbs(ctx) {
    const bnd = this.camera.viewBounds(40);
    const spr = glowSprite('orb', 4, 8, (g) => {
      g.fillStyle = COLORS.xp; g.shadowColor = COLORS.xp; g.shadowBlur = 8;
      g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill();
    });
    ctx.globalCompositeOperation = 'lighter';
    if (spr) {
      const full = spr.canvas.width;
      for (const o of this.orbs) {
        if (o.x < bnd.minX || o.x > bnd.maxX || o.y < bnd.minY || o.y > bnd.maxY) continue;
        const sc = (3 + Math.sin(o.t * 8) * 0.6) / 4; // pulse, relative to the 4px baked core
        const d = full * sc;
        ctx.drawImage(spr.canvas, o.x - spr.off * sc, o.y - spr.off * sc, d, d);
      }
    } else {
      ctx.fillStyle = COLORS.xp; ctx.shadowColor = COLORS.xp; ctx.shadowBlur = 8;
      for (const o of this.orbs) {
        if (o.x < bnd.minX || o.x > bnd.maxX || o.y < bnd.minY || o.y > bnd.maxY) continue;
        const s = 3 + Math.sin(o.t * 8) * 0.6;
        ctx.beginPath(); ctx.arc(o.x, o.y, s, 0, TAU); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
  }

  drawPickups(ctx) {
    const bnd = this.camera.viewBounds(40);
    for (const it of this.pickups) {
      if (it.x < bnd.minX || it.x > bnd.maxX || it.y < bnd.minY || it.y > bnd.maxY) continue;
      const y = it.y + Math.sin(it.bob) * 3;
      const color = it.type === 'heal' ? COLORS.heal : it.type === 'magnet' ? COLORS.gold : COLORS.danger;
      ctx.save();
      ctx.translate(it.x, y);
      ctx.shadowColor = color; ctx.shadowBlur = 14;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, it.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#05060f';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(it.type === 'heal' ? '+' : it.type === 'magnet' ? 'M' : '☢', 0, 1);
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  drawSingularities(ctx, layer) {
    for (const sg of this.singularities) {
      if (layer === 'under') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grd = ctx.createRadialGradient(sg.x, sg.y, sg.r, sg.x, sg.y, sg.pullRadius);
        grd.addColorStop(0, 'rgba(176,107,255,0.35)');
        grd.addColorStop(1, 'rgba(176,107,255,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(sg.x, sg.y, sg.pullRadius, 0, TAU); ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(sg.x, sg.y);
        // accretion ring
        ctx.rotate(sg.spin);
        ctx.strokeStyle = 'rgba(176,107,255,0.9)';
        ctx.lineWidth = 3;
        ctx.shadowColor = COLORS.void; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.ellipse(0, 0, sg.r * 2.4, sg.r * 1.1, 0, 0, TAU); ctx.stroke();
        // core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#05010f';
        ctx.beginPath(); ctx.arc(0, 0, sg.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#d9b3ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, sg.r, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawTexts(ctx) {
    const bnd = this.camera.viewBounds(60);
    // Collect visible popups into a reused scratch buffer and sort by size so
    // the expensive `ctx.font` (re)parse happens once per distinct size instead
    // of once per popup — a big win when a boss fight stacks hundreds of numbers.
    const vis = this._textScratch || (this._textScratch = []);
    vis.length = 0;
    for (const t of this.texts) {
      if (t.x < bnd.minX || t.x > bnd.maxX || t.y < bnd.minY || t.y > bnd.maxY) continue;
      vis.push(t);
    }
    if (vis.length === 0) return;
    vis.sort((a, b) => a.size - b.size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fonts = this._fontCache || (this._fontCache = new Map());
    let curSize = -1;
    for (const t of vis) {
      if (t.size !== curSize) {
        curSize = t.size;
        let f = fonts.get(curSize);
        if (f === undefined) { f = `bold ${curSize}px system-ui, sans-serif`; fonts.set(curSize, f); }
        ctx.font = f;
      }
      const a = clamp(t.life / t.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  drawVignette(ctx) {
    const w = this.viewW, h = this.viewH;
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.5})`;
      ctx.fillRect(0, 0, w, h);
    }
    // low-health red pulse
    const hpFrac = this.player.hp / this.player.stats.maxHp;
    if (hpFrac < 0.35) {
      const pulse = (Math.sin(performance.now() / 180) * 0.5 + 0.5) * (0.35 - hpFrac) * 2;
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(255,0,60,0)');
      g.addColorStop(1, `rgba(255,0,60,${0.45 * pulse})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    // bullet-time tint
    if (this.bulletTime > 0 && this.state === 'playing') {
      ctx.fillStyle = 'rgba(80,120,255,0.06)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  getHud() {
    return {
      hp: Math.ceil(this.player.hp),
      maxHp: Math.round(this.player.stats.maxHp),
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      score: this.score,
      streak: this.streak,
      multiplier: this.multiplier,
      time: this.elapsed,
      threat: this.threat,
      wave: this.wave,
      bossActive: !!this.bossActive,
      kills: this.kills,
      singCharge: this.player.singCharge,
      singMax: SINGULARITY.chargeMax,
      singReady: this.player.singReady,
      dashCd: this.player.dashCd,
      dashMax: DASH.cooldown * this.player.stats.dashCooldownMul,
      enemies: this.enemies.length,
      boss: this.bossActive,
      revives: this.revives || 0,
      directives: this.directives ? this.directives.length : 0,
    };
  }
}
