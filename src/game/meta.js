// meta.js — "Ascension" meta-progression. Permanent upgrades purchased with
// Stardust between runs, persisted via storage.js and applied to the player's
// starting loadout in World.reset. Pure data + pure helpers (no DOM) so the
// whole economy is deterministic and unit-testable in plain Node.
//
// Design: each upgrade owns a purchased `level` (0..max). computeMetaBonus folds
// every owned level into a single neutral-by-default `bonus` object; World reads
// that object once at run start and layers it on top of the base stats (and on
// top of the chosen ship's identity). Costs scale geometrically per level.

import { clamp } from '../engine/utils.js';

// Neutral bonus: multipliers are 1, additive terms 0. World applies each field
// on top of the base loadout, so an all-zero/one bonus changes nothing.
export function createMetaBonus() {
  return {
    maxHpAdd: 0,
    damageMul: 1,
    moveSpeedMul: 1,
    armorAdd: 0,
    regenAdd: 0,
    luckAdd: 0,
    critAdd: 0,
    hasteMul: 1,
    xpMul: 1,
    pickupMul: 1,
    singChargeMul: 1,
    revives: 0,
    stardustMul: 1,
    // Extra run-stat fields, neutral by default. Currently only the Orbital
    // Station's premium "Core" specials (game/idle.js) feed these, but they live
    // here so World.applyLoadout has a single bonus shape to read.
    critMultAdd: 0,   // + crit damage multiplier
    dodgeAdd: 0,      // + dodge chance (capped in applyLoadout)
    lifestealAdd: 0,  // + lifesteal fraction
    areaMul: 1,       // × AoE / explosion radius
    pierceAdd: 0,     // + projectile pierce count
  };
}

function M(id, name, icon, desc, opts) {
  return {
    id,
    name,
    icon,
    desc,
    max: opts.max,
    baseCost: opts.baseCost,
    costGrowth: opts.costGrowth ?? 1.65,
    apply: opts.apply, // (bonus, level) => void  — level is 1..max
    // Human-readable current effect at a given owned level (for the Hangar UI).
    effect: opts.effect,
  };
}

// The permanent upgrade tree. Ordered roughly offence → defence → economy.
export const META_UPGRADES = [
  M('vitality', 'Reinforced Chassis', '❤️', '+20 max HP per level', {
    max: 8, baseCost: 40, costGrowth: 1.5,
    apply: (b, l) => { b.maxHpAdd += 20 * l; },
    effect: (l) => `+${20 * l} max HP`,
  }),
  M('power', 'Weapon Calibration', '💥', '+6% weapon damage per level', {
    max: 8, baseCost: 55, costGrowth: 1.6,
    apply: (b, l) => { b.damageMul *= 1 + 0.06 * l; },
    effect: (l) => `+${Math.round(0.06 * l * 100)}% damage`,
  }),
  M('thrusters', 'Ion Thrusters', '🚀', '+5% move speed per level', {
    max: 6, baseCost: 45, costGrowth: 1.55,
    apply: (b, l) => { b.moveSpeedMul *= 1 + 0.05 * l; },
    effect: (l) => `+${Math.round(0.05 * l * 100)}% move speed`,
  }),
  M('plating', 'Ablative Plating', '🛡️', '+1 armor per level', {
    max: 6, baseCost: 60, costGrowth: 1.6,
    apply: (b, l) => { b.armorAdd += l; },
    effect: (l) => `+${l} armor`,
  }),
  M('nanites', 'Nanite Weave', '➕', '+0.5 HP/sec regen per level', {
    max: 6, baseCost: 50, costGrowth: 1.55,
    apply: (b, l) => { b.regenAdd += 0.5 * l; },
    effect: (l) => `+${(0.5 * l).toFixed(1)} HP/sec`,
  }),
  M('targeting', 'Targeting Matrix', '🎯', '+3% crit chance per level', {
    max: 6, baseCost: 55, costGrowth: 1.6,
    apply: (b, l) => { b.critAdd += 0.03 * l; },
    effect: (l) => `+${Math.round(0.03 * l * 100)}% crit`,
  }),
  M('overclock', 'Overclocked Coils', '⚡', '+3% attack speed per level', {
    max: 6, baseCost: 65, costGrowth: 1.7,
    apply: (b, l) => { b.hasteMul *= 1 - 0.03 * l; },
    effect: (l) => `+${Math.round(0.03 * l * 100)}% attack speed`,
  }),
  M('harvester', 'Graviton Harvester', '🧲', '+8% XP & +12% pickup range per level', {
    max: 5, baseCost: 50, costGrowth: 1.6,
    apply: (b, l) => { b.xpMul *= 1 + 0.08 * l; b.pickupMul *= 1 + 0.12 * l; },
    effect: (l) => `+${Math.round(0.08 * l * 100)}% XP`,
  }),
  M('fortune', 'Lucky Star', '🍀', '+0.08 luck (rarer drafts) per level', {
    max: 5, baseCost: 70, costGrowth: 1.7,
    apply: (b, l) => { b.luckAdd += 0.08 * l; },
    effect: (l) => `+${(0.08 * l).toFixed(2)} luck`,
  }),
  M('singularity_core', 'Singularity Core', '🌀', '+10% Singularity charge rate per level', {
    max: 5, baseCost: 60, costGrowth: 1.6,
    apply: (b, l) => { b.singChargeMul *= 1 + 0.1 * l; },
    effect: (l) => `+${Math.round(0.1 * l * 100)}% charge rate`,
  }),
  M('salvage', 'Salvage Rig', '💠', '+12% Stardust earned per level', {
    max: 5, baseCost: 80, costGrowth: 1.8,
    apply: (b, l) => { b.stardustMul *= 1 + 0.12 * l; },
    effect: (l) => `+${Math.round(0.12 * l * 100)}% Stardust`,
  }),
  M('evasion', 'Evasive Servos', '👻', '+3% dodge chance per level', {
    max: 6, baseCost: 60, costGrowth: 1.6,
    apply: (b, l) => { b.dodgeAdd += 0.03 * l; },
    effect: (l) => `+${Math.round(0.03 * l * 100)}% dodge`,
  }),
  M('siphon', 'Siphon Reactor', '🩸', '+1% lifesteal per level', {
    max: 5, baseCost: 70, costGrowth: 1.7,
    apply: (b, l) => { b.lifestealAdd += 0.01 * l; },
    effect: (l) => `+${(0.01 * l * 100).toFixed(0)}% lifesteal`,
  }),
  M('phoenix', 'Phoenix Protocol', '🔥', 'Revive once per run, restoring half HP', {
    max: 1, baseCost: 500, costGrowth: 2,
    apply: (b, l) => { b.revives += l; },
    effect: (l) => (l > 0 ? '1 revive per run' : ''),
  }),
  M('executioner', 'Executioner Protocol', '⚔️', '+12% crit damage per level', {
    max: 6, baseCost: 75, costGrowth: 1.7,
    apply: (b, l) => { b.critMultAdd += 0.12 * l; },
    effect: (l) => `+${Math.round(0.12 * l * 100)}% crit damage`,
  }),
  M('ordnance', 'Ordnance Bay', '🧨', '+6% blast & field radius per level', {
    max: 5, baseCost: 70, costGrowth: 1.65,
    apply: (b, l) => { b.areaMul *= 1 + 0.06 * l; },
    effect: (l) => `+${Math.round(0.06 * l * 100)}% area`,
  }),
  M('penetrator', 'Penetrator Rounds', '➹', '+1 pierce per level', {
    max: 3, baseCost: 120, costGrowth: 2,
    apply: (b, l) => { b.pierceAdd += l; },
    effect: (l) => `+${l} pierce`,
  }),
];

export const META_BY_ID = Object.create(null);
for (const m of META_UPGRADES) META_BY_ID[m.id] = m;

// Cost in Stardust to buy the NEXT level, given the currently owned level.
export function metaCost(def, currentLevel) {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}

// Fold a map of { id: level } into a single bonus object.
export function computeMetaBonus(levels = {}) {
  const bonus = createMetaBonus();
  for (const def of META_UPGRADES) {
    const lvl = clamp(Math.floor(levels[def.id] || 0), 0, def.max);
    if (lvl > 0) def.apply(bonus, lvl);
  }
  return bonus;
}

// Can the player afford and has room to buy one more level of `def`?
export function canBuyMeta(def, levels, stardust) {
  const cur = clamp(Math.floor(levels[def.id] || 0), 0, def.max);
  if (cur >= def.max) return false;
  return stardust >= metaCost(def, cur);
}

// Stardust awarded for a finished run. Deterministic function of the summary so
// the reward is predictable and testable. The `salvage` meta multiplier is
// applied by the caller (World) via bonus.stardustMul.
//
// Tuned deliberately lean: a run should pay out only a trickle toward the
// Hangar, never bankroll it — Ascension is a long-haul grind. Stardust is now
// just one of three economies (see idle.js: Nebula + Singularity Cores), so this
// per-run payout is kept especially stingy; the idle Station and its premium
// Cores are meant to carry the heavier late-game progression.
export function stardustForRun({ score = 0, time = 0, kills = 0, level = 1, bossKills = 0 } = {}) {
  const fromScore = score / 680;
  const fromTime = time / 54;
  const fromKills = kills / 46;
  const fromLevel = Math.max(0, level - 1) * 0.3;
  const fromBoss = bossKills * 6;
  return Math.max(0, Math.floor(fromScore + fromTime + fromKills + fromLevel + fromBoss));
}
