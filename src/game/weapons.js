// weapons.js — the auto-firing arsenal. Pure data + behaviour (no DOM).
//
// Inspired by Vampire Survivors / Brotato: the player carries a small INVENTORY
// of weapons that each fire on their own cooldown and level up independently.
// A maxed weapon can EVOLVE into a stronger form when the player also owns the
// synergistic passive item (see `evolve` + `req`), which is where build-defining
// "Binding of Isaac" moments come from.
//
// Every weapon reads shared modifiers from the player's `stats` loadout
// (damage, cooldownMul, critChance, areaMul, imbue, …) so passive items buff the
// whole arsenal at once. Firing is expressed purely through World primitives
// (spawnBullet, chainLightning, explodeReaction, damageEnemiesInRadius, …) that
// already exist and are performance-tuned, so weapons add no new hot paths.

import { TAU, chance, angleTo, randRange, rand } from '../engine/utils.js';
import { COLORS } from './config.js';

export const MAX_WEAPONS = 6;

// ---- shared math ----------------------------------------------------------

// Effective per-hit damage: base loadout damage × global weapon mult × the
// weapon's own multiplier × a gentle per-level ramp.
function dmgOf(s, def, inst, extra = 1) {
  return s.damage * s.weaponDamageMul * (s.transientDamageMul || 1) * def.dmgMul *
    (1 + (inst.level - 1) * def.lvlDmg) * extra;
}
// Cooldown shrinks with global haste (cooldownMul), a per-level bonus, and an
// optional transient haste factor (e.g. Overdrive), all clamped to a 0.04s floor.
export function cdOf(s, def, inst, haste = 1) {
  const lvlCut = Math.min(0.55, (inst.level - 1) * (def.lvlCd || 0));
  return Math.max(0.04, def.baseCd * s.cooldownMul * haste * (1 - lvlCut));
}
function rolledCrit(s) { return chance(s.critChance); }
function withCrit(dmg, crit, s) { return crit ? dmg * s.critMult : dmg; }

// Spawn `n` projectiles fanned symmetrically around `angle`.
function fan(world, x, y, angle, n, spread, mk) {
  const start = -(n - 1) / 2;
  for (let i = 0; i < n; i++) world.spawnBullet(x, y, angle + (start + i) * spread, mk(i));
}

// ---- weapon catalogue -----------------------------------------------------
// Each entry: id, name, rarity, icon, desc(short), tags, maxLevel, and a
// fire(world, player, inst) that performs one volley. `evolve`/`req` describe
// the evolved form and the passive it demands.

function W(def) {
  return {
    maxLevel: 8,
    tags: [],
    dmgMul: 1,
    lvlDmg: 0.16, // +16% weapon damage per level by default
    lvlCd: 0.05,  // -5% cooldown per level by default
    evolve: null,
    req: null,
    ...def,
  };
}

export const WEAPONS = [
  // 1) Starter — reliable auto-aim bolt that widens into a volley. ----------
  W({
    id: 'ion', name: 'Ion Blaster', rarity: 'common', icon: '🔫', starter: true,
    desc: 'Auto-aims a bolt at the nearest invader. Extra barrels at higher levels.',
    baseCd: 0.32, dmgMul: 1,
    evolve: 'photon', req: (s) => s.homing > 0, reqText: 'Targeting Array',
    fire(world, player, inst) {
      const s = player.stats;
      const t = player.acquireTarget(world);
      if (!t) { inst.cd = 0.1; return; }
      const ang = angleTo(player.x, player.y, t.x, t.y);
      const n = 1 + Math.floor((inst.level - 1) / 3) + s.projectilesBonus;
      fan(world, player.x, player.y, ang, n, n > 1 ? s.spread : 0, () => {
        const crit = rolledCrit(s);
        return { damage: withCrit(dmgOf(s, this, inst), crit, s), crit };
      });
      world.muzzle(player.x + Math.cos(ang) * 18, player.y + Math.sin(ang) * 18, ang);
      world.audio?.play('shoot');
    },
  }),
  // ion evolution
  W({
    id: 'photon', name: 'Photon Storm', rarity: 'legendary', icon: '🌠', evolved: true,
    desc: 'A relentless homing spiral of plasma that never stops turning.',
    baseCd: 0.16, dmgMul: 1.1, maxLevel: 8,
    fire(world, player, inst) {
      const s = player.stats;
      inst.phase = (inst.phase || 0) + 0.6;
      const n = 3 + Math.floor(inst.level / 2) + s.projectilesBonus;
      for (let i = 0; i < n; i++) {
        const ang = inst.phase + (i / n) * TAU;
        const crit = rolledCrit(s);
        world.spawnBullet(player.x, player.y, ang, {
          damage: withCrit(dmgOf(s, this, inst), crit, s), crit,
          homing: Math.max(3.4, s.homing), speed: s.bulletSpeed * 0.9,
          tint: COLORS.fire, glow: COLORS.fire,
        });
      }
      world.audio?.play('shoot');
    },
  }),

  // 2) Scatter — close-range shotgun with big knockback. --------------------
  W({
    id: 'spread', name: 'Scatter Array', rarity: 'common', icon: '🌾',
    desc: 'A short-range burst of pellets. Shreds anything that gets close.',
    baseCd: 0.6, dmgMul: 0.62, lvlDmg: 0.18,
    evolve: 'flak', req: (s) => s.critChance >= 0.28, reqText: 'high crit chance',
    fire(world, player, inst) {
      const s = player.stats;
      const t = player.acquireTarget(world);
      const ang = t ? angleTo(player.x, player.y, t.x, t.y) : player.faceAngle;
      const pellets = 4 + inst.level + s.projectilesBonus;
      fan(world, player.x, player.y, ang, pellets, 0.16, () => {
        const crit = rolledCrit(s);
        return {
          damage: withCrit(dmgOf(s, this, inst), crit, s), crit,
          speed: s.bulletSpeed * randRange(0.8, 1.05), life: s.bulletLife * 0.5,
          knockback: s.knockback * 2.2,
        };
      });
      world.muzzle(player.x + Math.cos(ang) * 18, player.y + Math.sin(ang) * 18, ang);
      world.audio?.play('shoot');
    },
  }),
  W({
    id: 'flak', name: 'Flak Cannon', rarity: 'legendary', icon: '💢', evolved: true,
    desc: 'Scatter pellets detonate on impact, carpeting the swarm in blasts.',
    baseCd: 0.56, dmgMul: 0.72, lvlDmg: 0.18,
    fire(world, player, inst) {
      const s = player.stats;
      const t = player.acquireTarget(world);
      const ang = t ? angleTo(player.x, player.y, t.x, t.y) : player.faceAngle;
      const pellets = 6 + inst.level + s.projectilesBonus;
      const base = dmgOf(s, this, inst);
      fan(world, player.x, player.y, ang, pellets, 0.18, () => {
        const crit = rolledCrit(s);
        return {
          damage: withCrit(base, crit, s), crit,
          speed: s.bulletSpeed * randRange(0.8, 1.05), life: s.bulletLife * 0.55,
          knockback: s.knockback * 2,
          explodeR: 70 * s.areaMul, explodeDmg: base * 0.6,
          tint: COLORS.fire, glow: COLORS.fire,
        };
      });
      world.audio?.play('shoot');
    },
  }),

  // 3) Arc Coil — lightning that leaps between invaders. --------------------
  W({
    id: 'arc', name: 'Arc Coil', rarity: 'rare', icon: '🌩️',
    desc: 'Forks a bolt of lightning that chains between nearby enemies.',
    baseCd: 0.74, dmgMul: 1.15, lvlDmg: 0.2,
    evolve: 'tesla', req: (s) => s.imbue.shock > 0, reqText: 'Tesla Rounds',
    fire(world, player, inst) {
      const s = player.stats;
      const t = player.acquireTarget(world);
      if (!t) { inst.cd = 0.12; return; }
      const jumps = 3 + Math.floor(inst.level * 0.8);
      const crit = rolledCrit(s);
      const dmg = withCrit(dmgOf(s, this, inst), crit, s);
      world.drawBolt(player.x, player.y, t.x, t.y, COLORS.shock);
      world.damageEnemy(t, dmg, { crit, source: 'bullet', color: COLORS.shock, lifesteal: true });
      world.chainLightning(t.x, t.y, jumps, dmg * 0.8, 220 * s.areaMul, t);
      world.audio?.play('reaction');
    },
  }),
  W({
    id: 'tesla', name: 'Tesla Web', rarity: 'legendary', icon: '⚡', evolved: true,
    desc: 'A storm of forking lightning that stuns and shocks the whole screen.',
    baseCd: 0.5, dmgMul: 1.25, lvlDmg: 0.2,
    fire(world, player, inst) {
      const s = player.stats;
      const t = player.acquireTarget(world);
      if (!t) { inst.cd = 0.12; return; }
      const jumps = 6 + inst.level;
      const crit = rolledCrit(s);
      const dmg = withCrit(dmgOf(s, this, inst), crit, s);
      world.drawBolt(player.x, player.y, t.x, t.y, COLORS.shock);
      world.damageEnemy(t, dmg, { crit, source: 'bullet', color: COLORS.shock, lifesteal: true });
      if (t.status) t.status.shock = Math.max(t.status.shock || 0, 1.2);
      world.chainLightning(t.x, t.y, jumps, dmg * 0.85, 260 * s.areaMul, t);
      world.audio?.play('reaction');
    },
  }),

  // 4) Missile Pod — slow homing warhead that explodes. ---------------------
  W({
    id: 'missile', name: 'Missile Pod', rarity: 'rare', icon: '🚀',
    desc: 'Launches a homing warhead that detonates in a fiery blast.',
    baseCd: 1.0, dmgMul: 1.4, lvlDmg: 0.22,
    evolve: 'swarm', req: (s) => s.explosiveChance > 0, reqText: 'Volatile Payload',
    fire(world, player, inst) {
      const s = player.stats;
      const t = player.acquireTarget(world);
      const ang = t ? angleTo(player.x, player.y, t.x, t.y) : player.aimAngle;
      const crit = rolledCrit(s);
      const dmg = withCrit(dmgOf(s, this, inst), crit, s);
      world.spawnBullet(player.x, player.y, ang, {
        damage: dmg, crit, pierce: 0, homing: 3.2, speed: s.bulletSpeed * 0.62,
        radius: s.bulletRadius * 1.6, life: 2.2,
        explodeR: (80 + inst.level * 6) * s.areaMul, explodeDmg: dmg * 0.9,
        tint: COLORS.fire, glow: COLORS.fire,
      });
      world.audio?.play('shoot');
    },
  }),
  W({
    id: 'swarm', name: 'Swarm Barrage', rarity: 'legendary', icon: '🎆', evolved: true,
    desc: 'Volleys a salvo of homing warheads that blanket the field in fire.',
    baseCd: 0.9, dmgMul: 1.4, lvlDmg: 0.22,
    fire(world, player, inst) {
      const s = player.stats;
      const t = player.acquireTarget(world);
      const ang = t ? angleTo(player.x, player.y, t.x, t.y) : player.aimAngle;
      const n = 3 + Math.floor(inst.level / 3);
      const crit = rolledCrit(s);
      const dmg = withCrit(dmgOf(s, this, inst), crit, s);
      for (let i = 0; i < n; i++) {
        world.spawnBullet(player.x, player.y, ang + randRange(-0.5, 0.5), {
          damage: dmg, crit, pierce: 0, homing: 3.6, speed: s.bulletSpeed * randRange(0.5, 0.75),
          radius: s.bulletRadius * 1.4, life: 2.4,
          explodeR: 72 * s.areaMul, explodeDmg: dmg * 0.8,
          tint: COLORS.fire, glow: COLORS.fire,
        });
      }
      world.audio?.play('shoot');
    },
  }),

  // 5) Pulse Nova — rhythmic shockwave around the ship (garlic-style). ------
  W({
    id: 'pulse', name: 'Pulse Nova', rarity: 'rare', icon: '💠',
    desc: 'Emits a shockwave around you, damaging and shoving everything near.',
    baseCd: 0.85, dmgMul: 0.9, lvlDmg: 0.2,
    evolve: 'nova', req: (s) => s.areaMul >= 1.3, reqText: 'large blast radius',
    fire(world, player, inst) {
      const s = player.stats;
      const radius = (108 + inst.level * 8) * s.areaMul;
      const dmg = dmgOf(s, this, inst);
      world.damageEnemiesInRadius(player.x, player.y, radius, dmg, {
        source: 'bullet', color: COLORS.cryo, knockback: s.knockback * 1.6, lifesteal: true,
      });
      world.ring(player.x, player.y, radius, COLORS.cryo);
      world.audio?.play('reaction');
    },
  }),
  W({
    id: 'nova', name: 'Nova Collapse', rarity: 'legendary', icon: '🌀', evolved: true,
    desc: 'Drags invaders inward, then erupts in a devastating shockwave.',
    baseCd: 1.0, dmgMul: 1.1, lvlDmg: 0.2,
    fire(world, player, inst) {
      const s = player.stats;
      const radius = (150 + inst.level * 10) * s.areaMul;
      world.miniPull(player.x, player.y, radius * 1.2, 420);
      world.damageEnemiesInRadius(player.x, player.y, radius, dmgOf(s, this, inst), {
        source: 'bullet', color: COLORS.void, knockback: s.knockback * 2.4, lifesteal: true,
      });
      world.ring(player.x, player.y, radius, COLORS.void);
      world.shake(5);
      world.audio?.play('implode');
    },
  }),

  // 6) Rail Lance — piercing hyper-velocity spear. --------------------------
  W({
    id: 'rail', name: 'Rail Lance', rarity: 'epic', icon: '📏',
    desc: 'Fires a piercing hyper-velocity lance straight through a line.',
    baseCd: 1.15, dmgMul: 2.2, lvlDmg: 0.24,
    evolve: 'lance', req: (s) => s.imbue.void > 0 || s.pierce >= 3, reqText: 'Void Rounds or +pierce',
    fire(world, player, inst) {
      const s = player.stats;
      const t = player.acquireTarget(world);
      const ang = t ? angleTo(player.x, player.y, t.x, t.y) : player.aimAngle;
      const crit = rolledCrit(s);
      world.spawnBullet(player.x, player.y, ang, {
        damage: withCrit(dmgOf(s, this, inst), crit, s), crit,
        pierce: 4 + inst.level + s.pierce, speed: s.bulletSpeed * 1.9,
        radius: s.bulletRadius * 1.8, life: s.bulletLife * 1.2, knockback: s.knockback * 1.5,
        tint: COLORS.shock, glow: COLORS.shock,
      });
      world.muzzle(player.x + Math.cos(ang) * 20, player.y + Math.sin(ang) * 20, ang);
      world.audio?.play('crit');
    },
  }),
  W({
    id: 'lance', name: 'Void Lance', rarity: 'legendary', icon: '🗡️', evolved: true,
    desc: 'An unstoppable void spear that pierces everything and warps space.',
    baseCd: 1.0, dmgMul: 2.6, lvlDmg: 0.24,
    fire(world, player, inst) {
      const s = player.stats;
      const t = player.acquireTarget(world);
      const ang = t ? angleTo(player.x, player.y, t.x, t.y) : player.aimAngle;
      const crit = rolledCrit(s);
      world.spawnBullet(player.x, player.y, ang, {
        damage: withCrit(dmgOf(s, this, inst), crit, s), crit,
        pierce: 999, speed: s.bulletSpeed * 2.1,
        radius: s.bulletRadius * 2.2, life: s.bulletLife * 1.4, knockback: s.knockback * 1.8,
        tint: COLORS.void, glow: COLORS.void,
      });
      world.shake(3);
      world.audio?.play('crit');
    },
  }),

  // 7) Graviton Mortar — lobs a singularity bomb at the thickest crowd. -----
  W({
    id: 'mortar', name: 'Graviton Mortar', rarity: 'epic', icon: '🛰️',
    desc: 'Drops a graviton charge on the densest pack: pulls them in, then blasts.',
    baseCd: 1.5, dmgMul: 2.0, lvlDmg: 0.22,
    evolve: 'cluster', req: (s) => s.explosiveChance > 0, reqText: 'Volatile Payload',
    fire(world, player, inst) {
      const s = player.stats;
      const cl = world.densestCluster(player.x, player.y, s.range + 220) ||
        player.acquireTarget(world);
      if (!cl) { inst.cd = 0.15; return; }
      const r = (120 + inst.level * 8) * s.areaMul;
      world.miniPull(cl.x, cl.y, r * 1.3, 360);
      world.explodeReaction(cl.x, cl.y, r, dmgOf(s, this, inst), COLORS.void, s.knockback * 2);
      world.ring(cl.x, cl.y, r, COLORS.void);
      world.audio?.play('explode');
    },
  }),
  W({
    id: 'cluster', name: 'Cluster Swarm', rarity: 'legendary', icon: '☄️', evolved: true,
    desc: 'A graviton bomb that scatters bomblets across the whole formation.',
    baseCd: 1.4, dmgMul: 2.0, lvlDmg: 0.22,
    fire(world, player, inst) {
      const s = player.stats;
      const cl = world.densestCluster(player.x, player.y, s.range + 260) ||
        player.acquireTarget(world);
      if (!cl) { inst.cd = 0.15; return; }
      const r = (120 + inst.level * 8) * s.areaMul;
      const dmg = dmgOf(s, this, inst);
      world.miniPull(cl.x, cl.y, r * 1.4, 420);
      world.explodeReaction(cl.x, cl.y, r, dmg, COLORS.void, s.knockback * 2);
      const bomblets = 3 + Math.floor(inst.level / 2);
      for (let i = 0; i < bomblets; i++) {
        const a = rand() * TAU, d = randRange(60, r);
        world.explodeReaction(cl.x + Math.cos(a) * d, cl.y + Math.sin(a) * d, r * 0.55, dmg * 0.6, COLORS.fire, s.knockback);
      }
      world.shake(5);
      world.audio?.play('explode');
    },
  }),

  // 8) Halo Launcher — a radial curtain of bolts around the ship. -----------
  W({
    id: 'halo', name: 'Halo Launcher', rarity: 'rare', icon: '💫',
    desc: 'Rings the ship with a radial burst of bolts, clearing every angle.',
    baseCd: 0.95, dmgMul: 0.8, lvlDmg: 0.18,
    evolve: 'corona', req: (s) => s.projectilesBonus >= 2, reqText: 'Split Barrel ×2',
    fire(world, player, inst) {
      const s = player.stats;
      // One extra bolt per level, plus the shared projectile bonus, fanned
      // evenly over a full circle. inst.phase spins the pattern each volley.
      const n = 6 + inst.level + s.projectilesBonus;
      inst.phase = (inst.phase || 0) + 0.4;
      for (let i = 0; i < n; i++) {
        const ang = inst.phase + (i / n) * TAU;
        const crit = rolledCrit(s);
        world.spawnBullet(player.x, player.y, ang, {
          damage: withCrit(dmgOf(s, this, inst), crit, s), crit,
          knockback: s.knockback * 1.2, tint: COLORS.cryo, glow: COLORS.cryo,
        });
      }
      world.ring(player.x, player.y, 36, COLORS.cryo);
      world.audio?.play('shoot');
    },
  }),
  W({
    id: 'corona', name: 'Corona Burst', rarity: 'legendary', icon: '🎇', evolved: true,
    desc: 'A searing double corona of piercing plasma erupts in every direction.',
    baseCd: 0.8, dmgMul: 0.95, lvlDmg: 0.18,
    fire(world, player, inst) {
      const s = player.stats;
      const n = 9 + inst.level + s.projectilesBonus;
      inst.phase = (inst.phase || 0) + 0.5;
      for (let ring = 0; ring < 2; ring++) {
        const off = ring * (Math.PI / n); // interleave the second ring
        for (let i = 0; i < n; i++) {
          const ang = inst.phase + off + (i / n) * TAU;
          const crit = rolledCrit(s);
          world.spawnBullet(player.x, player.y, ang, {
            damage: withCrit(dmgOf(s, this, inst), crit, s), crit,
            pierce: 1 + s.pierce, speed: s.bulletSpeed * (ring ? 0.8 : 1.05),
            knockback: s.knockback * 1.3, tint: COLORS.fire, glow: COLORS.fire,
          });
        }
      }
      world.ring(player.x, player.y, 46, COLORS.fire);
      world.audio?.play('shoot');
    },
  }),

  // 9) Arc Whip — a short-range sweeping melee lash in the facing arc. -------
  W({
    id: 'lash', name: 'Arc Whip', rarity: 'epic', icon: '🔗',
    desc: 'Lashes a crackling arc across the front, shredding and flinging foes.',
    baseCd: 0.7, dmgMul: 1.15, lvlDmg: 0.2,
    evolve: 'reaver', req: (s) => s.lifesteal > 0, reqText: 'Vampiric Circuit',
    fire(world, player, inst) {
      const s = player.stats;
      const t = player.acquireTarget(world);
      const ang = t ? angleTo(player.x, player.y, t.x, t.y) : player.faceAngle;
      const reach = 70 + inst.level * 5;
      const r = (40 + inst.level * 2.5) * s.areaMul;
      const base = dmgOf(s, this, inst);
      // Three overlapping strike zones sweeping a short arc in front of the ship.
      for (let k = -1; k <= 1; k++) {
        const a = ang + k * 0.45;
        const hx = player.x + Math.cos(a) * reach;
        const hy = player.y + Math.sin(a) * reach;
        const crit = rolledCrit(s);
        world.damageEnemiesInRadius(hx, hy, r, withCrit(base, crit, s), {
          source: 'bullet', color: COLORS.shock, knockback: s.knockback * 1.8, crit, lifesteal: true,
        });
        world.ring(hx, hy, r, COLORS.shock);
      }
      world.audio?.play('reaction');
    },
  }),
  W({
    id: 'reaver', name: 'Rift Reaver', rarity: 'legendary', icon: '🪓', evolved: true,
    desc: 'A whirling rift scythe that carves all around you and drinks their essence.',
    baseCd: 0.62, dmgMul: 1.35, lvlDmg: 0.2,
    fire(world, player, inst) {
      const s = player.stats;
      const r = (120 + inst.level * 8) * s.areaMul;
      const crit = rolledCrit(s);
      world.damageEnemiesInRadius(player.x, player.y, r, withCrit(dmgOf(s, this, inst), crit, s), {
        source: 'bullet', color: COLORS.void, knockback: s.knockback * 2, crit, lifesteal: true,
      });
      world.ring(player.x, player.y, r, COLORS.void);
      world.shake(3);
      world.audio?.play('reaction');
    },
  }),
];

export const WEAPON_BY_ID = Object.create(null);
for (const w of WEAPONS) WEAPON_BY_ID[w.id] = w;

// Base (non-evolved) weapons that can appear as fresh drops / draft picks.
export const BASE_WEAPONS = WEAPONS.filter((w) => !w.evolved);

export function createWeaponInst(id) {
  return { id, level: 1, cd: 0, phase: 0 };
}

export function weaponDef(idOrInst) {
  return WEAPON_BY_ID[typeof idOrInst === 'string' ? idOrInst : idOrInst.id];
}

export function hasWeapon(player, id) {
  return player.weapons.some((w) => w.id === id);
}

export function canTakeWeapon(player) {
  return player.weapons.length < MAX_WEAPONS;
}

// Add a brand-new weapon, or level an owned one. Returns the instance (or null
// if the inventory is full and the weapon isn't owned yet).
export function addOrLevelWeapon(player, id) {
  const existing = player.weapons.find((w) => w.id === id);
  if (existing) {
    const def = weaponDef(id);
    existing.level = Math.min(def.maxLevel, existing.level + 1);
    return existing;
  }
  if (!canTakeWeapon(player)) return null;
  const inst = createWeaponInst(id);
  player.weapons.push(inst);
  return inst;
}

// Is `inst` maxed and does the player own the synergy its evolution demands?
export function evolutionReady(player, inst) {
  const def = weaponDef(inst);
  if (!def || !def.evolve) return false;
  if (inst.level < def.maxLevel) return false;
  if (hasWeapon(player, def.evolve)) return false;
  return !def.req || def.req(player.stats);
}

// Replace a maxed weapon instance in-place with its evolved form.
export function evolveWeapon(player, inst) {
  const def = weaponDef(inst);
  if (!def || !def.evolve) return inst;
  inst.id = def.evolve;
  inst.level = 1;
  inst.phase = 0;
  return inst;
}
