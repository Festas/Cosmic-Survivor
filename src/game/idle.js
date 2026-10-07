// idle.js — "Orbital Station": an idle/AFK layer that runs ALONGSIDE the main
// roguelite. A small Cookie-Clicker-style economy that ticks in real time (even
// while the tab is closed, catching up on load), can be Prestiged for a permanent
// multiplier, and mints a premium currency used to buy special main-game buffs.
//
// Two new currencies, deliberately distinct from run Stardust:
//   • Nebula (⬡)            — produced over time by generators; spent on more
//                             generators. The idle "cookies".
//   • Singularity Cores (🌀) — the Prestige currency. Earned by collapsing the
//                             station (resetting generators + Nebula). The lifetime
//                             total grants a permanent production multiplier, and
//                             the spendable balance buys premium run upgrades.
//
// The two modes are intentionally interlocked so BOTH matter:
//   main → idle : your run profile (lifetime Stardust, best wave, boss kills)
//                 multiplies idle production (mainBoostMultiplier), and each run
//                 grants a Nebula burst (nebulaForRun).
//   idle → main : Cores buy SPECIAL_UPGRADES that fold into the run loadout bonus
//                 (applyIdleBonus), making the station empower every run.
//
// Everything here is pure data + pure helpers (no DOM, no storage, no randomness)
// so the whole economy is deterministic and unit-testable in plain Node.

import { clamp } from '../engine/utils.js';

// A pristine idle save. `lastTick` is an epoch-ms timestamp used to compute
// offline/elapsed production; 0 means "never ticked" (seeded on first load).
export function createIdleState() {
  return {
    nebula: 0,          // spendable Nebula balance
    lifetimeNebula: 0,  // Nebula earned since the last Prestige (drives Prestige gain)
    cores: 0,           // spendable Singularity Cores (premium currency)
    lifetimeCores: 0,   // total Cores ever earned (drives the permanent multiplier)
    generators: Object.create(null), // { [generatorId]: ownedCount }
    special: Object.create(null),    // { [specialId]: level }
    lastTick: 0,        // epoch ms of the last production tick (for offline catch-up)
  };
}

// --------------------------------------------------------------- generators

// Generator factory. `rate` is Nebula/second per owned unit; costs grow
// geometrically per owned unit (classic idle curve).
function G(id, name, icon, desc, opts) {
  return {
    id, name, icon, desc,
    baseCost: opts.baseCost,
    costGrowth: opts.costGrowth ?? 1.15,
    rate: opts.rate,
  };
}

// Eight ascending generators. Early ones are cheap trickle; later ones are the
// long-haul engine that makes Prestige worthwhile and give post-Collapse runs
// something to keep chasing.
export const GENERATORS = [
  G('probe', 'Survey Probe', '🛰️', 'A lonely drone sipping stray particles.', { baseCost: 15, rate: 0.1 }),
  G('collector', 'Dust Collector', '📡', 'Sweeps the debris field for Nebula.', { baseCost: 120, rate: 0.8 }),
  G('refinery', 'Ion Refinery', '🏭', 'Refines raw dust into dense Nebula.', { baseCost: 1300, rate: 5 }),
  G('harvester', 'Graviton Harvester', '⚛️', 'Bends gravity to funnel Nebula inward.', { baseCost: 14000, rate: 30 }),
  G('dyson', 'Dyson Node', '🛸', 'Taps a dying star for raw output.', { baseCost: 160000, rate: 180 }),
  G('singtap', 'Singularity Tap', '🕳️', 'Siphons a micro black hole. Obscene yield.', { baseCost: 2000000, rate: 1000 }),
  G('warpforge', 'Warp Forge', '🌌', 'Folds spacetime to mint Nebula wholesale.', { baseCost: 24000000, rate: 5500 }),
  G('quasar', 'Quasar Engine', '💫', 'Harnesses a galactic core. Reality strains.', { baseCost: 300000000, rate: 32000 }),
];

export const GENERATOR_BY_ID = Object.create(null);
for (const g of GENERATORS) GENERATOR_BY_ID[g.id] = g;

// Cost of the NEXT single unit of `def`, given how many are already owned.
export function generatorCost(def, owned = 0) {
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, Math.max(0, Math.floor(owned))));
}

// Cost of buying `qty` units in one go (geometric series), for a "buy xN" UI.
export function generatorBulkCost(def, owned = 0, qty = 1) {
  const n = Math.max(0, Math.floor(qty));
  if (n === 0) return 0;
  const o = Math.max(0, Math.floor(owned));
  const g = def.costGrowth;
  // Σ baseCost·g^(o+i) for i in [0,n) = baseCost·g^o·(g^n − 1)/(g − 1).
  const first = def.baseCost * Math.pow(g, o);
  return Math.ceil(first * (Math.pow(g, n) - 1) / (g - 1));
}

// How many units of `def` you can afford with `nebula`, given current ownership.
export function maxAffordable(def, owned = 0, nebula = 0) {
  let n = 0;
  let budget = nebula;
  let cost = generatorCost(def, owned);
  // Bounded loop: idle balances are finite and costs grow ~15%/step.
  while (budget >= cost && n < 100000) {
    budget -= cost;
    n += 1;
    cost = generatorCost(def, owned + n);
  }
  return n;
}

// --------------------------------------------------------------- milestones

// Owning many of one generator pays off beyond the next tier: every
// MILESTONE_STEP units crossed grants that generator a permanent production
// multiplier (classic idle "milestone" bonus). This deepens the AFK loop — the
// longer the Station runs, the more each generator over-produces — and rewards
// going wide on a single generator, not just tall across all of them.
export const MILESTONE_STEP = 25;        // units of one generator per milestone
export const MILESTONE_BONUS = 0.5;      // +50% of base output per milestone

// How many milestones a given owned count has crossed.
export function milestonesReached(owned = 0) {
  return Math.floor(Math.max(0, Math.floor(owned)) / MILESTONE_STEP);
}

// Per-generator production multiplier from owning `owned` units. Starts at ×1
// and climbs +MILESTONE_BONUS per milestone. The curve is unbounded, mirroring
// the geometric cost curve, so there is always a next goal to chase.
export function generatorMilestoneMultiplier(owned = 0) {
  return 1 + MILESTONE_BONUS * milestonesReached(owned);
}

// Progress toward the next milestone for a generator, for the Station UI.
// `remaining` is always 1..MILESTONE_STEP (there is always a next milestone).
export function generatorMilestoneProgress(owned = 0) {
  const n = Math.max(0, Math.floor(owned));
  const reached = milestonesReached(n);
  const next = (reached + 1) * MILESTONE_STEP;
  return {
    reached,
    multiplier: generatorMilestoneMultiplier(n),
    nextAt: next,
    nextMultiplier: 1 + MILESTONE_BONUS * (reached + 1),
    remaining: next - n,
  };
}

// --------------------------------------------------------------- production

// Raw Nebula/second from owned generators (including per-generator milestone
// multipliers), before the global Prestige/run-profile multipliers.
export function baseRate(generators = {}) {
  let r = 0;
  for (const def of GENERATORS) {
    const owned = Math.max(0, Math.floor(generators[def.id] || 0));
    if (owned > 0) r += def.rate * owned * generatorMilestoneMultiplier(owned);
  }
  return r;
}

// --------------------------------------------------------------- prestige

// Nebula that must accumulate (since the last Prestige) to mint the first Core.
export const PRESTIGE_BASE = 1_000_000;

// Cores you would mint by Prestiging right now, from this epoch's lifetime Nebula.
// Cube-root curve: 1e6 → 1 Core, 8e6 → 2, 2.7e7 → 3 … so Cores stay precious.
export function prestigeGain(lifetimeNebula = 0, base = PRESTIGE_BASE) {
  if (lifetimeNebula < base) return 0;
  return Math.floor(Math.cbrt(lifetimeNebula / base));
}

// Permanent production multiplier from the LIFETIME Core total (never reduced by
// spending Cores on upgrades). +3% Nebula production per Core ever earned.
export function prestigeMultiplier(lifetimeCores = 0) {
  return 1 + Math.max(0, lifetimeCores) * 0.03;
}

// --------------------------------------------------------- main ↔ idle link

// main → idle: a production multiplier (≥ 1) derived from the player's run
// profile, so progress in the main game visibly accelerates the station.
// Diminishing on lifetime Stardust (log), gentle-linear on best wave & bosses.
export function mainBoostMultiplier({ lifetimeStardust = 0, bestLevel = 0, bossKillsTotal = 0 } = {}) {
  const fromStardust = Math.log10(1 + Math.max(0, lifetimeStardust)) * 0.12;
  const fromWave = Math.max(0, bestLevel) * 0.008;
  const fromBoss = Math.max(0, bossKillsTotal) * 0.015;
  return 1 + fromStardust + fromWave + fromBoss;
}

// Total effective Nebula/second: generators × Prestige multiplier × run-profile
// multiplier. `profile` is the main→idle link (see mainBoostMultiplier).
export function totalRate(state = createIdleState(), profile = {}) {
  return baseRate(state.generators) * prestigeMultiplier(state.lifetimeCores) * mainBoostMultiplier(profile);
}

// Offline/elapsed catch-up window. AFK is rewarding but bounded so leaving the
// tab for a month doesn't trivialise the economy.
export const OFFLINE_CAP_SECONDS = 8 * 3600; // 8 hours

// Nebula produced over `seconds` at `rate`/sec, clamped to the offline cap.
export function offlineGain(rate = 0, seconds = 0, cap = OFFLINE_CAP_SECONDS) {
  const s = clamp(seconds, 0, cap);
  return Math.max(0, rate) * s;
}

// main → idle: a one-off Nebula burst granted when a run ends, so actively
// playing directly fuels the station (separate from, and on top of, Stardust).
export function nebulaForRun({ score = 0, time = 0, kills = 0, level = 1, bossKills = 0 } = {}) {
  const fromScore = score / 40;
  const fromTime = time * 0.8;
  const fromKills = kills * 0.6;
  const fromLevel = Math.max(0, level - 1) * 4;
  const fromBoss = bossKills * 40;
  return Math.max(0, Math.floor(fromScore + fromTime + fromKills + fromLevel + fromBoss));
}

// --------------------------------------------------- special (run) upgrades

// Premium upgrade factory. Bought with Cores; `apply(bonus, level)` mutates a
// meta-style run bonus object (same shape as meta.createMetaBonus) so World picks
// it up through applyLoadout with no special-casing. `level` is the owned level.
function X(id, name, icon, desc, opts) {
  return {
    id, name, icon, desc,
    max: opts.max,
    baseCost: opts.baseCost,       // in Cores
    costGrowth: opts.costGrowth ?? 1.7,
    apply: opts.apply,
    effect: opts.effect,
  };
}

// The premium tree — stronger, Core-gated counterparts to Ascension. These are
// the payoff for idling/prestiging and are what make the station matter to runs.
export const SPECIAL_UPGRADES = [
  X('siege_overdrive', 'Siege Overdrive', '💥', '+8% weapon damage per level', {
    max: 10, baseCost: 1, costGrowth: 1.6,
    apply: (b, l) => { b.damageMul *= 1 + 0.08 * l; },
    effect: (l) => `+${Math.round(0.08 * l * 100)}% damage`,
  }),
  X('aegis_core', 'Aegis Core', '🛡️', '+30 max HP per level', {
    max: 10, baseCost: 1, costGrowth: 1.55,
    apply: (b, l) => { b.maxHpAdd += 30 * l; },
    effect: (l) => `+${30 * l} max HP`,
  }),
  X('void_prospector', 'Void Prospector', '💠', '+10% Stardust earned per level', {
    max: 8, baseCost: 2, costGrowth: 1.7,
    apply: (b, l) => { b.stardustMul *= 1 + 0.1 * l; },
    effect: (l) => `+${Math.round(0.1 * l * 100)}% Stardust`,
  }),
  X('warp_drive', 'Warp Drive', '🚀', '+4% move speed per level', {
    max: 6, baseCost: 2, costGrowth: 1.7,
    apply: (b, l) => { b.moveSpeedMul *= 1 + 0.04 * l; },
    effect: (l) => `+${Math.round(0.04 * l * 100)}% move speed`,
  }),
  X('flux_lens', 'Flux Lens', '🔬', '+8% XP gain per level', {
    max: 8, baseCost: 2, costGrowth: 1.65,
    apply: (b, l) => { b.xpMul *= 1 + 0.08 * l; },
    effect: (l) => `+${Math.round(0.08 * l * 100)}% XP`,
  }),
  X('targeting_uplink', 'Targeting Uplink', '🎯', '+4% crit chance per level', {
    max: 6, baseCost: 3, costGrowth: 1.75,
    apply: (b, l) => { b.critAdd += 0.04 * l; },
    effect: (l) => `+${Math.round(0.04 * l * 100)}% crit`,
  }),
  X('chrono_capacitor', 'Chrono Capacitor', '⏱️', '+4% attack speed per level', {
    max: 6, baseCost: 2, costGrowth: 1.7,
    apply: (b, l) => { b.hasteMul *= 1 - 0.04 * l; },
    effect: (l) => `+${Math.round(0.04 * l * 100)}% attack speed`,
  }),
  X('magnetic_lattice', 'Magnetic Lattice', '🧲', '+14% pickup range per level', {
    max: 6, baseCost: 2, costGrowth: 1.6,
    apply: (b, l) => { b.pickupMul *= 1 + 0.14 * l; },
    effect: (l) => `+${Math.round(0.14 * l * 100)}% pickup range`,
  }),
];

export const SPECIAL_BY_ID = Object.create(null);
for (const x of SPECIAL_UPGRADES) SPECIAL_BY_ID[x.id] = x;

// Cost in Cores to buy the NEXT level of `def`, given the currently owned level.
export function specialCost(def, currentLevel = 0) {
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, Math.max(0, Math.floor(currentLevel))));
}

// Can the player afford and has room to buy one more level of `def`?
export function canBuySpecial(def, levels = {}, cores = 0) {
  const cur = clamp(Math.floor(levels[def.id] || 0), 0, def.max);
  if (cur >= def.max) return false;
  return cores >= specialCost(def, cur);
}

// Fold owned special-upgrade levels into an existing meta-style `bonus` object
// (mutates in place). Called by World.reset after computeMetaBonus so premium
// buffs layer on top of Ascension. Unknown ids and out-of-range levels are safe.
export function applyIdleBonus(bonus, levels = {}) {
  for (const def of SPECIAL_UPGRADES) {
    const lvl = clamp(Math.floor(levels[def.id] || 0), 0, def.max);
    if (lvl > 0) def.apply(bonus, lvl);
  }
  return bonus;
}
