// player.js — the player ship: movement, auto-aim firing, dash, singularity,
// drones, health. `stats` is the mutable loadout that upgrades modify.

import { PLAYER, WEAPON, DASH, SINGULARITY, ARENA, COLORS } from './config.js';
import { TAU, clamp, dist, dist2, angleTo, lerpAngle, rand, chance } from '../engine/utils.js';
import { createWeaponInst, weaponDef, cdOf } from './weapons.js';

export function createStats() {
  return {
    maxHp: PLAYER.maxHp,
    regen: PLAYER.regen,
    armor: 0,
    dodge: 0,
    lifesteal: 0,
    moveSpeed: PLAYER.speed,

    damage: WEAPON.damage,
    fireInterval: WEAPON.fireInterval,
    bulletSpeed: WEAPON.bulletSpeed,
    bulletRadius: WEAPON.bulletRadius,
    bulletLife: WEAPON.bulletLife,
    projectiles: WEAPON.projectiles,
    spread: WEAPON.spread,
    pierce: WEAPON.pierce,
    knockback: WEAPON.knockback,
    critChance: WEAPON.critChance,
    critMult: WEAPON.critMult,
    range: WEAPON.range,
    homing: WEAPON.homing,

    // ---- Roguelite loadout knobs (read by weapons.js) -------------------
    // Global multipliers that every equipped weapon benefits from, so passive
    // items create build-defining synergies across the whole arsenal.
    weaponDamageMul: 1, // % damage applied on top of `damage`
    cooldownMul: 1,     // attack-speed: lower fires faster
    projectilesBonus: 0, // flat extra pellets for projectile weapons
    areaMul: 1,         // scales every AoE/explosion radius
    durationMul: 1,     // scales timed effects (beams, fields)
    projectileSpeedMul: 1,

    pickupRadius: PLAYER.pickupRadius,
    magnetSpeed: PLAYER.magnetSpeed,
    xpMul: 1,
    luck: 0,

    dashCooldownMul: 1,
    dashDamageMul: 1,
    dashRadiusMul: 1,

    overdriveRate: 1,
    overdrivePower: 1,
    // Transient per-frame multipliers (managed by Player.update for Overdrive).
    // Weapons read these so the rampage buff never corrupts the base loadout.
    transientDamageMul: 1,
    transientHaste: 1,

    rerolls: 0,
    banishes: 0,

    droneCount: 0,
    droneDamageMul: 1,

    singularityChargeMul: 1,
    singularityRadiusMul: 1,
    singularityDamageMul: 1,

    elementMul: 1,
    imbue: { fire: 0, cryo: 0, shock: 0, void: 0 },

    explosiveChance: 0,
    explosiveDamage: 0,

    pendingHeal: 0,
  };
}

export class Player {
  constructor() {
    this.x = ARENA.w / 2;
    this.y = ARENA.h / 2;
    this.radius = PLAYER.radius;
    this.vx = 0;
    this.vy = 0;
    this.stats = createStats();
    this.hp = this.stats.maxHp;
    this.aimAngle = 0;
    this.faceAngle = 0;
    this.fireCd = 0;
    this.weapons = [createWeaponInst('ion')];
    this.dashCd = 0;
    this.dashTime = 0;
    this.dashDirX = 1;
    this.dashDirY = 0;
    this.invuln = 0;
    this.hitFlash = 0;
    this.singCharge = 0;
    this.overdrive = 0;       // 0..100 meter, builds from kills/combo
    this.overdriveTime = 0;   // seconds of active Overdrive remaining
    this.drones = [];
    this.upgradeCounts = {};
    this.banished = Object.create(null);
    this.thrust = 0;
    this.alive = true;
  }

  get dashing() { return this.dashTime > 0; }
  get singReady() { return this.singCharge >= SINGULARITY.chargeMax; }

  syncDrones() {
    const want = this.stats.droneCount;
    while (this.drones.length < want) this.drones.push({ angle: (this.drones.length / Math.max(1, want)) * TAU, fireCd: rand() * 0.5 });
    while (this.drones.length > want) this.drones.pop();
  }

  addCharge(amount) {
    this.singCharge = Math.min(SINGULARITY.chargeMax, this.singCharge + amount * this.stats.singularityChargeMul);
  }

  heal(amount) {
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
  }

  // Returns the actual damage taken (after armor/dodge), or 0 if avoided.
  takeDamage(amount, world) {
    if (this.invuln > 0 || this.dashing) return 0;
    if (chance(this.stats.dodge)) {
      world.addText(this.x, this.y - 24, 'DODGE', COLORS.cryo, 14);
      return 0;
    }
    const dmg = Math.max(1, amount - this.stats.armor);
    this.hp -= dmg;
    this.invuln = PLAYER.invulnOnHit;
    this.hitFlash = 1;
    world.shake(Math.min(18, 5 + dmg * 0.4));
    world.hitStopFor(0.06);
    world.audio?.play('hurt');
    if (this.hp <= 0) { this.hp = 0; this.alive = false; }
    return dmg;
  }

  update(dt, world, cmd) {
    const s = this.stats;

    if (s.pendingHeal) { this.heal(s.pendingHeal); s.pendingHeal = 0; }
    this.syncDrones();

    this.invuln = Math.max(0, this.invuln - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.fireCd = Math.max(0, this.fireCd - dt);
    if (this.hp < s.maxHp) this.hp = Math.min(s.maxHp, this.hp + s.regen * dt);

    // ---- Overdrive meter ----------------------------------------------
    // Kills charge the meter (see World.killEnemy). When it tops out the ship
    // enters a short rampage: faster cooldowns and bonus damage via transient
    // multipliers that weapons read, so the base loadout is never mutated.
    this.overdriveTime = Math.max(0, this.overdriveTime - dt);
    const odActive = this.overdriveTime > 0;
    s.transientDamageMul = odActive ? 1.6 * s.overdrivePower : 1;
    s.transientHaste = odActive ? 0.5 : 1;
    if (this.overdrive >= 100 && !odActive) {
      this.overdrive = 0;
      this.overdriveTime = 5 * s.overdrivePower;
      this.invuln = Math.max(this.invuln, 0.4);
      world.flash = Math.max(world.flash, 0.5);
      world.shake?.(6);
      world.audio?.play('levelup');
      world.addText?.(this.x, this.y - 44, 'OVERDRIVE!', COLORS.gold || '#ffd54a', 26);
      world.particles.burst(this.x, this.y, COLORS.gold || '#ffd54a', 36, { speed: 300, life: 0.7 });
    }

    // ---- Movement ------------------------------------------------------
    let mx = cmd.moveX, my = cmd.moveY;
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    this.thrust = ml > 0.1 ? Math.min(1, this.thrust + dt * 5) : Math.max(0, this.thrust - dt * 5);

    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.x += this.dashDirX * (DASH.distance / DASH.duration) * dt;
      this.y += this.dashDirY * (DASH.distance / DASH.duration) * dt;
      world.spawnDashTrail(this.x, this.y);
      // trail damage to enemies passed through
      const tr = DASH.trailRadius * s.dashRadiusMul;
      world.damageEnemiesInRadius(this.x, this.y, tr, DASH.trailDamage * s.dashDamageMul, { source: 'dash', knockback: 160 });
    } else {
      this.x += mx * s.moveSpeed * dt;
      this.y += my * s.moveSpeed * dt;
      if (ml > 0.1) this.faceAngle = lerpAngle(this.faceAngle, Math.atan2(my, mx), 0.3);
    }

    // Dash trigger
    if (cmd.dash && this.dashCd <= 0 && (ml > 0.1 || true)) {
      let dx = mx, dy = my;
      if (Math.hypot(dx, dy) < 0.1) { dx = Math.cos(this.faceAngle); dy = Math.sin(this.faceAngle); }
      const l = Math.hypot(dx, dy) || 1;
      this.dashDirX = dx / l; this.dashDirY = dy / l;
      this.dashTime = DASH.duration;
      this.dashCd = DASH.cooldown * s.dashCooldownMul;
      this.invuln = Math.max(this.invuln, DASH.duration + 0.05);
      world.requestBulletTime(DASH.bulletTime, DASH.bulletTimeDuration);
      world.audio?.play('dash');
      world.shake(4);
      for (let i = 0; i < 10; i++) world.particles.spawn(this.x, this.y, COLORS.playerGlow, { speed: 180, life: 0.4 });
    }

    // Clamp to arena
    this.x = clamp(this.x, ARENA.pad, ARENA.w - ARENA.pad);
    this.y = clamp(this.y, ARENA.pad, ARENA.h - ARENA.pad);

    // ---- Aiming & firing ----------------------------------------------
    // Keep the ship pointed at the nearest threat for visual feedback, then let
    // every equipped weapon fire on its own independent cooldown.
    const target = this.acquireTarget(world);
    if (target) this.aimAngle = lerpAngle(this.aimAngle, angleTo(this.x, this.y, target.x, target.y), 0.4);
    this.fireWeapons(dt, world);

    // ---- Singularity trigger ------------------------------------------
    if (cmd.singularity && this.singReady) {
      let tx = this.x + Math.cos(this.aimAngle) * 240;
      let ty = this.y + Math.sin(this.aimAngle) * 240;
      if (target) {
        const cl = world.densestCluster(this.x, this.y, s.range + 160);
        if (cl) { tx = cl.x; ty = cl.y; }
      }
      world.deploySingularity(tx, ty);
      this.singCharge = 0;
    }

    // ---- Drones --------------------------------------------------------
    for (const d of this.drones) {
      d.angle += dt * 1.8;
      d.fireCd -= dt;
      const dxp = this.x + Math.cos(d.angle) * 56;
      const dyp = this.y + Math.sin(d.angle) * 56;
      d.x = dxp; d.y = dyp;
      if (d.fireCd <= 0) {
        const t2 = this.acquireTarget(world, dxp, dyp);
        if (t2) {
          d.fireCd = s.fireInterval * 1.4;
          world.spawnBullet(dxp, dyp, angleTo(dxp, dyp, t2.x, t2.y), {
            damage: s.damage * 0.6 * s.droneDamageMul, crit: false, drone: true,
          });
        }
      }
    }
  }

  acquireTarget(world, fromX = this.x, fromY = this.y) {
    const range = this.stats.range;
    const r2 = range * range;
    let best = null; let bestD = r2;
    // Broad-phase via the world grid so we only test enemies within weapon range
    // instead of scanning every enemy (which is O(n) per shooter, per frame).
    const list = world.grid.query(fromX, fromY, range, this._targetQ || (this._targetQ = []));
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.alive) continue;
      const d = dist2(fromX, fromY, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  fireWeapons(dt, world) {
    const s = this.stats;
    for (const inst of this.weapons) {
      inst.cd -= dt;
      if (inst.cd > 0) continue;
      const def = weaponDef(inst);
      if (!def) { inst.cd = 0.5; continue; }
      // The weapon sets its own cd when it can't act (e.g. no target); otherwise
      // apply the standard per-weapon cadence after a successful volley.
      inst.cd = 0;
      def.fire(world, this, inst);
      if (inst.cd <= 0) {
        inst.cd = cdOf(s, def, inst, s.transientHaste);
      }
    }
  }
}
