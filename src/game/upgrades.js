// upgrades.js — the level-up draft: weapons, evolutions and passive items.
// Pure (no DOM). Cards are applied via world.applyUpgrade (see world.js).
//
// There are four card kinds, mirroring Vampire Survivors / Brotato:
//   • 'weapon-new'  — gain a new auto-firing weapon (fills a loadout slot)
//   • 'weapon-up'   — level an owned weapon (more damage / faster fire)
//   • 'evolve'      — upgrade a maxed weapon into its evolved form
//   • 'item'        — a passive that mutates the shared stats loadout, buffing
//                     every weapon and ability at once (build synergies)

import { weightedPick, shuffle } from '../engine/utils.js';
import {
  BASE_WEAPONS, weaponDef, hasWeapon, canTakeWeapon, evolutionReady,
} from './weapons.js';

export const RARITY = {
  common: { label: 'Common', color: '#b9c6ff', weight: 100, rank: 0 },
  rare: { label: 'Rare', color: '#51e9ff', weight: 40, rank: 1 },
  epic: { label: 'Epic', color: '#b06bff', weight: 15, rank: 2 },
  legendary: { label: 'Legendary', color: '#ffd447', weight: 4, rank: 3 },
};

// Passive item builder. `apply(stats)` mutates a player stats object.
function I(id, name, rarity, icon, desc, apply, opts = {}) {
  return {
    kind: 'item', id, name, rarity, icon, desc, apply,
    maxStacks: opts.maxStacks ?? 5,
    tags: opts.tags ?? [],
    req: opts.req ?? null, // function(stats) -> bool
  };
}

function hasAnyImbue(s) {
  return s.imbue.fire > 0 || s.imbue.cryo > 0 || s.imbue.shock > 0 || s.imbue.void > 0;
}

export const ITEMS = [
  // ---- Offense ---------------------------------------------------------
  I('damage', 'Overcharged Rounds', 'common', '💥', '+20% weapon damage', (s) => { s.weaponDamageMul *= 1.2; }),
  I('haste', 'Rapid Coils', 'common', '⚡', '+13% attack speed', (s) => { s.cooldownMul *= 0.87; }, { maxStacks: 6 }),
  I('projectiles', 'Split Barrel', 'rare', '🔱', '+1 projectile for burst weapons', (s) => { s.projectilesBonus += 1; }, { maxStacks: 4 }),
  I('crit', 'Precision Optics', 'common', '🎯', '+8% crit chance', (s) => { s.critChance += 0.08; }, { tags: ['crit'] }),
  I('critdmg', 'Lethal Intent', 'rare', '🗡️', '+60% crit damage', (s) => { s.critMult += 0.6; }, { maxStacks: 4, tags: ['crit'] }),
  I('pierce', 'Railgun Core', 'rare', '➹', '+1 pierce & +12% projectile speed', (s) => { s.pierce += 1; s.projectileSpeedMul *= 1.12; }, { maxStacks: 4 }),
  I('area', 'Resonance Lens', 'rare', '🔷', '+18% blast & field radius', (s) => { s.areaMul *= 1.18; }, { maxStacks: 4, tags: ['area'] }),
  I('homing', 'Targeting Array', 'rare', '📡', '+22% range & guided shots', (s) => { s.range *= 1.22; s.homing += 1.6; }, { maxStacks: 3 }),
  I('bigbullets', 'Heavy Slugs', 'common', '⬤', '+35% bullet size & +12% knockback', (s) => { s.bulletRadius *= 1.35; s.knockback *= 1.12; }, { maxStacks: 3 }),
  I('velocity', 'Overclocked Capacitor', 'rare', '⏩', '+16% projectile speed & +16% range', (s) => { s.projectileSpeedMul *= 1.16; s.range *= 1.16; }, { maxStacks: 4 }),

  // ---- Elemental imbues (enable reactions + weapon evolutions) ----------
  I('imbue_fire', 'Plasma Rounds', 'rare', '🔥', 'Shots Ignite enemies (burn)', (s) => { s.imbue.fire = Math.min(1, s.imbue.fire + 0.6); }, { maxStacks: 2, tags: ['element'] }),
  I('imbue_cryo', 'Cryo Rounds', 'rare', '❄️', 'Shots apply Cryo (slow/freeze)', (s) => { s.imbue.cryo = Math.min(1, s.imbue.cryo + 0.6); }, { maxStacks: 2, tags: ['element'] }),
  I('imbue_shock', 'Tesla Rounds', 'rare', '⚡', 'Shots Shock enemies (chains)', (s) => { s.imbue.shock = Math.min(1, s.imbue.shock + 0.6); }, { maxStacks: 2, tags: ['element'] }),
  I('imbue_void', 'Void Rounds', 'epic', '🟣', 'Shots apply Void (gravity) & boost Singularity', (s) => { s.imbue.void = Math.min(1, s.imbue.void + 0.6); s.singularityChargeMul *= 1.15; }, { maxStacks: 2, tags: ['element'] }),
  I('resonance', 'Resonance Cascade', 'epic', '✴️', '+40% elemental & reaction damage', (s) => { s.elementMul *= 1.4; }, { maxStacks: 3, tags: ['element'], req: (s) => hasAnyImbue(s) }),

  // ---- Signature: Singularity ------------------------------------------
  I('sing_charge', 'Dark Matter Capacitor', 'rare', '🌀', '+30% Singularity charge rate', (s) => { s.singularityChargeMul *= 1.3; }, { maxStacks: 4 }),
  I('sing_power', 'Event Horizon', 'epic', '🕳️', '+35% Singularity size & damage', (s) => { s.singularityRadiusMul *= 1.2; s.singularityDamageMul *= 1.35; }, { maxStacks: 3 }),

  // ---- Signature: Phase Dash + Overdrive -------------------------------
  I('dash_cd', 'Phase Coils', 'common', '💨', '-20% Dash cooldown', (s) => { s.dashCooldownMul *= 0.8; }, { maxStacks: 4 }),
  I('dash_blade', 'Rift Blades', 'rare', '🌪️', '+70% Dash trail damage & radius', (s) => { s.dashDamageMul *= 1.7; s.dashRadiusMul *= 1.3; }, { maxStacks: 3 }),
  I('overdrive', 'Overdrive Reactor', 'epic', '🔆', '+35% Overdrive build-up & power', (s) => { s.overdriveRate *= 1.35; s.overdrivePower *= 1.2; }, { maxStacks: 3 }),

  // ---- Companions & on-hit ---------------------------------------------
  I('drone', 'Orbital Drone', 'epic', '🛰️', 'Gain an orbiting drone that auto-fires', (s) => { s.droneCount += 1; }, { maxStacks: 4 }),
  I('drone_power', 'Drone Uplink', 'epic', '🤖', '+45% drone damage', (s) => { s.droneDamageMul *= 1.45; }, { maxStacks: 4, tags: ['drone'], req: (s) => s.droneCount > 0 }),
  I('explosive', 'Volatile Payload', 'epic', '🧨', 'Kills have a chance to explode', (s) => { s.explosiveChance = Math.min(0.6, s.explosiveChance + 0.25); s.explosiveDamage += 24; }, { maxStacks: 3 }),

  // ---- Build capstones --------------------------------------------------
  I('crit_capstone', "Executioner's Edge", 'epic', '⚔️', '+10% crit chance & +75% crit damage', (s) => { s.critChance += 0.1; s.critMult += 0.75; }, { maxStacks: 3, tags: ['crit'] }),
  I('overdrive_rush', 'Kinetic Reactor', 'rare', '🔋', '+28% Overdrive build-up & +6% move speed', (s) => { s.overdriveRate *= 1.28; s.moveSpeed *= 1.06; }, { maxStacks: 3, tags: ['overdrive'] }),

  // ---- Defense & utility ------------------------------------------------
  I('maxhp', 'Reinforced Hull', 'common', '❤️', '+25 max HP (and heal)', (s) => { s.maxHp += 25; s.pendingHeal = (s.pendingHeal || 0) + 25; }),
  I('armor', 'Ablative Plating', 'rare', '🛡️', '+3 armor (flat damage reduction)', (s) => { s.armor += 3; }, { maxStacks: 5 }),
  I('regen', 'Nanite Repair', 'common', '➕', '+1.2 HP/sec regeneration', (s) => { s.regen += 1.2; }),
  I('lifesteal', 'Vampiric Circuit', 'epic', '🩸', 'Heal 3% of damage dealt', (s) => { s.lifesteal += 0.03; }, { maxStacks: 3 }),
  I('dodge', 'Phase Shift', 'rare', '👻', '+8% dodge chance', (s) => { s.dodge = Math.min(0.5, s.dodge + 0.08); }, { maxStacks: 4 }),
  I('speed', 'Ion Thrusters', 'common', '🚀', '+12% move speed', (s) => { s.moveSpeed *= 1.12; }, { maxStacks: 4 }),
  I('magnet', 'Graviton Magnet', 'common', '🧲', '+45% pickup radius & +12% XP', (s) => { s.pickupRadius *= 1.45; s.xpMul *= 1.12; }, { maxStacks: 4 }),
  I('luck', 'Lucky Core', 'rare', '🍀', '+20% rarer card odds', (s) => { s.luck = (s.luck || 0) + 0.2; }, { maxStacks: 3 }),
];

export const ITEM_BY_ID = Object.create(null);
for (const it of ITEMS) ITEM_BY_ID[it.id] = it;

export function isItemAvailable(it, player) {
  const count = player.upgradeCounts[it.id] || 0;
  if (count >= it.maxStacks) return false;
  if (it.req && !it.req(player.stats)) return false;
  return true;
}

// Backwards-compatible alias.
export const isAvailable = isItemAvailable;

// ---- Draft ---------------------------------------------------------------

function weaponUpDesc(def, level) {
  return `Lv ${level} → ${level + 1}: +${Math.round(def.lvlDmg * 100)}% damage, faster fire`;
}

// Build the full candidate pool for the current player, honouring owned
// weapons, free loadout slots, evolutions, banished cards and item stacks.
function buildPool(player) {
  const pool = [];
  const banished = player.banished || {};
  const weapons = player.weapons || [];

  for (const inst of weapons) {
    const def = weaponDef(inst);
    if (!def) continue;
    if (evolutionReady(player, inst)) {
      if (banished['evolve_' + inst.id]) continue;
      const evo = weaponDef(def.evolve);
      pool.push({
        kind: 'evolve', id: 'evolve_' + inst.id, weaponId: inst.id,
        name: 'EVOLVE · ' + evo.name, rarity: 'legendary', icon: evo.icon,
        desc: evo.desc, tag: 'Evolution',
      });
    } else if (inst.level < def.maxLevel) {
      if (banished['wup_' + inst.id]) continue;
      pool.push({
        kind: 'weapon-up', id: 'wup_' + inst.id, weaponId: inst.id,
        name: def.name, rarity: def.rarity, icon: def.icon,
        desc: weaponUpDesc(def, inst.level), tag: `Weapon · Lv ${inst.level + 1}`,
      });
    }
  }

  if (canTakeWeapon(player)) {
    for (const def of BASE_WEAPONS) {
      if (hasWeapon(player, def.id)) continue;
      const id = 'wnew_' + def.id;
      if (banished[id]) continue;
      pool.push({
        kind: 'weapon-new', id, weaponId: def.id,
        name: def.name, rarity: def.rarity, icon: def.icon,
        desc: def.desc, tag: 'New Weapon',
      });
    }
  }

  for (const it of ITEMS) {
    if (banished[it.id]) continue;
    if (!isItemAvailable(it, player)) continue;
    pool.push({ ...it, tag: 'Item' });
  }
  return pool;
}

// Luck tilts the draft toward rarer cards. A uniform multiplier would cancel
// out in a weighted pick, so luck is applied as a per-rarity-rank exponent:
// common (rank 0) is unchanged while rarer tiers are boosted progressively.
// luck === 0 returns 1 for every card, leaving the base distribution intact.
export function luckFactor(rarity, luck) {
  if (!luck) return 1;
  const rank = (RARITY[rarity] || RARITY.common).rank || 0;
  return Math.pow(1 + luck, rank);
}

// Draft `count` distinct cards for the level-up screen.
// EVOLVE_WEIGHT_BOOST offsets an evolve card's low legendary base weight (4) so
// that, when a weapon is actually eligible to evolve, the card appears reliably.
const EVOLVE_WEIGHT_BOOST = 3;
export function draftUpgrades(player, count = 3, r) {
  const luck = player.stats.luck || 0;
  const pool = buildPool(player).map((c) => ({
    ...c,
    weight: RARITY[c.rarity].weight * (c.kind === 'evolve' ? EVOLVE_WEIGHT_BOOST : 1) * luckFactor(c.rarity, luck),
  }));
  const chosen = [];
  const bag = shuffle(pool, r);
  while (chosen.length < count && bag.length > 0) {
    const pickItem = weightedPick(bag, 'weight', r);
    chosen.push(pickItem);
    const idx = bag.indexOf(pickItem);
    bag.splice(idx, 1);
  }
  return chosen;
}
