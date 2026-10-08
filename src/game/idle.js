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
    prestige: Object.create(null),   // { [perkId]: level } — permanent Singularity perks (survive Collapse)
    clickLevel: 0,      // Mining Laser level: boosts the manual-tap yield (see clickYield)
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

// Ascending generators. Early ones are cheap trickle; later ones are the
// long-haul engine that makes Prestige worthwhile and give post-Collapse runs
// something to keep chasing. baseCost and rate climb strictly monotonically so
// there is always a meaningful next tier to unlock.
export const GENERATORS = [
  G('probe', 'Survey Probe', '🛰️', 'A lonely drone sipping stray particles.', { baseCost: 15, rate: 0.1 }),
  G('collector', 'Dust Collector', '📡', 'Sweeps the debris field for Nebula.', { baseCost: 120, rate: 0.8 }),
  G('refinery', 'Ion Refinery', '🏭', 'Refines raw dust into dense Nebula.', { baseCost: 1300, rate: 5 }),
  G('harvester', 'Graviton Harvester', '⚛️', 'Bends gravity to funnel Nebula inward.', { baseCost: 14000, rate: 30 }),
  G('dyson', 'Dyson Node', '🛸', 'Taps a dying star for raw output.', { baseCost: 160000, rate: 180 }),
  G('singtap', 'Singularity Tap', '🕳️', 'Siphons a micro black hole. Obscene yield.', { baseCost: 2000000, rate: 1000 }),
  G('warpforge', 'Warp Forge', '🌌', 'Folds spacetime to mint Nebula wholesale.', { baseCost: 24000000, rate: 5500 }),
  G('quasar', 'Quasar Engine', '💫', 'Harnesses a galactic core. Reality strains.', { baseCost: 300000000, rate: 32000 }),
  G('pulsar', 'Pulsar Array', '📍', 'A lighthouse of neutron pulses pumps Nebula.', { baseCost: 3600000000, rate: 180000 }),
  G('antimatter', 'Antimatter Silo', '🔆', 'Annihilates stored antimatter for staggering yield.', { baseCost: 44000000000, rate: 1000000 }),
  G('wormhole', 'Wormhole Nexus', '🌀', 'Imports raw Nebula from a parallel sky.', { baseCost: 540000000000, rate: 5600000 }),
  G('galaxyforge', 'Galaxy Forge', '🌠', 'Spins up young galaxies as a refinery line.', { baseCost: 6800000000000, rate: 32000000 }),
  G('darkstar', 'Dark Star Engine', '⭐', 'Burns a shrouded star no telescope can see.', { baseCost: 85000000000000, rate: 180000000 }),
  G('cosmicloom', 'Cosmic Loom', '🧵', 'Weaves the cosmic web itself into dense Nebula.', { baseCost: 1100000000000000, rate: 1000000000 }),
  G('realityengine', 'Reality Engine', '💠', 'Edits physical constants to overproduce.', { baseCost: 14000000000000000, rate: 6000000000 }),
  G('infinityspire', 'Infinity Spire', '🗼', 'A spire piercing the edge of everything. Endless output.', { baseCost: 180000000000000000, rate: 36000000000 }),
  G('omnimatrix', 'Omni Matrix', '🔱', 'A lattice that computes Nebula into being from first principles.', { baseCost: 2200000000000000000, rate: 210000000000 }),
  G('celestialfoundry', 'Celestial Foundry', '🏛️', 'Pours molten starstuff into Nebula ingots by the fleet-load.', { baseCost: 27000000000000000000, rate: 1200000000000 }),
  G('eternityengine', 'Eternity Engine', '♾️', 'Runs outside of time, so its output has already happened.', { baseCost: 330000000000000000000, rate: 7000000000000 }),
];

export const GENERATOR_BY_ID = Object.create(null);
for (const g of GENERATORS) GENERATOR_BY_ID[g.id] = g;

// Cost of the NEXT single unit of `def`, given how many are already owned.
// `costMul` (≤ 1 from the Mass Production prestige perk) discounts the price.
export function generatorCost(def, owned = 0, costMul = 1) {
  const raw = def.baseCost * Math.pow(def.costGrowth, Math.max(0, Math.floor(owned)));
  return Math.max(1, Math.ceil(raw * Math.max(0, costMul)));
}

// Cost of buying `qty` units in one go (geometric series), for a "buy xN" UI.
export function generatorBulkCost(def, owned = 0, qty = 1, costMul = 1) {
  const n = Math.max(0, Math.floor(qty));
  if (n === 0) return 0;
  const o = Math.max(0, Math.floor(owned));
  const g = def.costGrowth;
  // Σ baseCost·g^(o+i) for i in [0,n) = baseCost·g^o·(g^n − 1)/(g − 1).
  const first = def.baseCost * Math.pow(g, o);
  return Math.max(1, Math.ceil(first * (Math.pow(g, n) - 1) / (g - 1) * Math.max(0, costMul)));
}

// How many units of `def` you can afford with `nebula`, given current ownership.
export function maxAffordable(def, owned = 0, nebula = 0, costMul = 1) {
  let n = 0;
  let budget = nebula;
  let cost = generatorCost(def, owned, costMul);
  // Bounded loop: idle balances are finite and costs grow ~15%/step.
  while (budget >= cost && n < 100000) {
    budget -= cost;
    n += 1;
    cost = generatorCost(def, owned + n, costMul);
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
// and climbs +`bonus` per milestone (default MILESTONE_BONUS; the Milestone
// Mastery prestige perk raises it). The curve is unbounded, mirroring the
// geometric cost curve, so there is always a next goal to chase.
export function generatorMilestoneMultiplier(owned = 0, bonus = MILESTONE_BONUS) {
  return 1 + Math.max(0, bonus) * milestonesReached(owned);
}

// Progress toward the next milestone for a generator, for the Station UI.
// `remaining` is always 1..MILESTONE_STEP (there is always a next milestone).
export function generatorMilestoneProgress(owned = 0, bonus = MILESTONE_BONUS) {
  const n = Math.max(0, Math.floor(owned));
  const reached = milestonesReached(n);
  const next = (reached + 1) * MILESTONE_STEP;
  return {
    reached,
    multiplier: generatorMilestoneMultiplier(n, bonus),
    nextAt: next,
    nextMultiplier: 1 + Math.max(0, bonus) * (reached + 1),
    remaining: next - n,
  };
}

// --------------------------------------------------------------- production

// Raw Nebula/second from owned generators (including per-generator milestone
// multipliers), before the global Prestige/run-profile multipliers. `milestoneBonus`
// defaults to MILESTONE_BONUS (raised by the Milestone Mastery prestige perk).
export function baseRate(generators = {}, milestoneBonus = MILESTONE_BONUS) {
  let r = 0;
  for (const def of GENERATORS) {
    const owned = Math.max(0, Math.floor(generators[def.id] || 0));
    if (owned > 0) r += def.rate * owned * generatorMilestoneMultiplier(owned, milestoneBonus);
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

// ---------------------------------------------------- Singularity perk tree
//
// The "sophisticated prestige" layer. Unlike SPECIAL_UPGRADES (which buff the
// main-game run), Singularity perks permanently upgrade the STATION ECONOMY
// itself — production, taps, costs, milestones, offline reach, Core yield and
// the odds/size of random Surges. They are bought with Singularity Cores and —
// crucially — SURVIVE a Collapse (they are the thing a Collapse builds toward),
// so prestiging compounds instead of merely resetting.
//
// Each perk folds its owned level into a neutral "effects" accumulator via
// apply(fx, level); computePerks() reduces a level map into a single effects
// object the pure economy reads. Keeping it data-driven means adding a perk is
// one array entry, and the whole layer stays deterministic + unit-testable.

// Neutral perk effects: multipliers are 1, additive terms 0, costMul 1 (no
// discount). The economy multiplies/adds these on top of everything else.
export function createPerkEffects() {
  return {
    prodMul: 1,            // × global Nebula production (Resonant Core)
    clickMul: 1,           // × manual-tap yield (Hardened Beam)
    costMul: 1,            // × generator price, ≤ 1 is a discount (Mass Production)
    milestoneBonus: MILESTONE_BONUS, // per-milestone generator bonus (Milestone Mastery)
    offlineCapSeconds: OFFLINE_CAP_SECONDS, // offline catch-up window (Temporal Buffer)
    coreGainMul: 1,        // × Cores minted per Collapse (Dense Singularity)
    startNebulaFrac: 0,    // fraction of pre-Collapse lifetime Nebula seeded back (Collapse Memory)
    surgeChanceMul: 1,     // × Surge spawn frequency (Lucky Resonance)
    surgeRewardMul: 1,     // × Surge payout (Lucky Resonance)
    surgeDurationMul: 1,   // × Surge frenzy duration (Temporal Lens)
    offlineRateMul: 1,     // × offline/AFK production rate (Dormant Reactor)
    nebulaRunMul: 1,       // × the Nebula burst granted at the end of a run (Flux Siphon)
  };
}

// Perk factory. `apply(fx, level)` mutates a createPerkEffects() accumulator;
// `effect(level)` is a human-readable summary for the Station UI. Costs are in
// Cores and grow geometrically per owned level, like every other upgrade line.
function P(id, name, icon, desc, opts) {
  return {
    id, name, icon, desc,
    max: opts.max,
    baseCost: opts.baseCost,       // in Cores
    costGrowth: opts.costGrowth ?? 1.9,
    apply: opts.apply,
    effect: opts.effect,
  };
}

export const PRESTIGE_UPGRADES = [
  P('resonant_core', 'Resonant Core', '🌀', '+12% Nebula production per level', {
    max: 12, baseCost: 1, costGrowth: 1.8,
    apply: (fx, l) => { fx.prodMul *= 1 + 0.12 * l; },
    effect: (l) => `+${Math.round(0.12 * l * 100)}% production`,
  }),
  P('hardened_beam', 'Hardened Beam', '🔆', '+35% manual-tap yield per level', {
    max: 10, baseCost: 1, costGrowth: 1.7,
    apply: (fx, l) => { fx.clickMul *= 1 + 0.35 * l; },
    effect: (l) => `+${Math.round(0.35 * l * 100)}% tap yield`,
  }),
  P('mass_production', 'Mass Production', '🏗️', '−4% generator cost per level', {
    max: 8, baseCost: 2, costGrowth: 1.95,
    // Compounding discount, floored so costs never collapse to nothing.
    apply: (fx, l) => { fx.costMul *= Math.pow(0.96, l); },
    effect: (l) => `−${Math.round((1 - Math.pow(0.96, l)) * 100)}% generator cost`,
  }),
  P('milestone_mastery', 'Milestone Mastery', '📈', '+15% to each generator milestone per level', {
    max: 8, baseCost: 2, costGrowth: 1.9,
    apply: (fx, l) => { fx.milestoneBonus += 0.15 * l * MILESTONE_BONUS; },
    effect: (l) => `+${Math.round(0.15 * l * 100)}% milestone power`,
  }),
  P('temporal_buffer', 'Temporal Buffer', '⏳', '+2h offline catch-up per level', {
    max: 8, baseCost: 2, costGrowth: 1.8,
    apply: (fx, l) => { fx.offlineCapSeconds += 2 * 3600 * l; },
    effect: (l) => `+${2 * l}h offline (${Math.round((OFFLINE_CAP_SECONDS + 2 * 3600 * l) / 3600)}h total)`,
  }),
  P('dense_singularity', 'Dense Singularity', '💠', '+20% Cores per Collapse per level', {
    max: 6, baseCost: 3, costGrowth: 2.1,
    apply: (fx, l) => { fx.coreGainMul *= 1 + 0.2 * l; },
    effect: (l) => `+${Math.round(0.2 * l * 100)}% Cores on Collapse`,
  }),
  P('collapse_memory', 'Collapse Memory', '🧠', 'Keep +6% of lifetime Nebula through Collapse per level', {
    max: 8, baseCost: 3, costGrowth: 2.0,
    // Additive fraction, capped at 80% so a Collapse always costs something.
    apply: (fx, l) => { fx.startNebulaFrac = Math.min(0.8, fx.startNebulaFrac + 0.06 * l); },
    effect: (l) => `keep ${Math.round(Math.min(0.8, 0.06 * l) * 100)}% of Nebula`,
  }),
  P('lucky_resonance', 'Lucky Resonance', '🍀', '+25% Surge frequency & +20% payout per level', {
    max: 6, baseCost: 2, costGrowth: 1.85,
    apply: (fx, l) => { fx.surgeChanceMul *= 1 + 0.25 * l; fx.surgeRewardMul *= 1 + 0.2 * l; },
    effect: (l) => `+${Math.round(0.25 * l * 100)}% Surges · +${Math.round(0.2 * l * 100)}% payout`,
  }),
  P('quantum_resonance', 'Quantum Resonance', '🧬', '+18% Nebula production per level', {
    max: 10, baseCost: 4, costGrowth: 1.95,
    apply: (fx, l) => { fx.prodMul *= 1 + 0.18 * l; },
    effect: (l) => `+${Math.round(0.18 * l * 100)}% production`,
  }),
  P('overcharged_beam', 'Overcharged Beam', '⚡', '+40% manual-tap yield per level', {
    max: 8, baseCost: 3, costGrowth: 1.8,
    apply: (fx, l) => { fx.clickMul *= 1 + 0.4 * l; },
    effect: (l) => `+${Math.round(0.4 * l * 100)}% tap yield`,
  }),
  P('bulk_fabricator', 'Bulk Fabricator', '🏭', '−5% generator cost per level', {
    max: 8, baseCost: 4, costGrowth: 2.0,
    apply: (fx, l) => { fx.costMul *= Math.pow(0.95, l); },
    effect: (l) => `−${Math.round((1 - Math.pow(0.95, l)) * 100)}% generator cost`,
  }),
  P('milestone_overdrive', 'Milestone Overdrive', '📊', '+20% to each generator milestone per level', {
    max: 6, baseCost: 5, costGrowth: 2.0,
    apply: (fx, l) => { fx.milestoneBonus += 0.2 * l * MILESTONE_BONUS; },
    effect: (l) => `+${Math.round(0.2 * l * 100)}% milestone power`,
  }),
  P('chronal_reservoir', 'Chronal Reservoir', '🕰️', '+3h offline catch-up per level', {
    max: 8, baseCost: 4, costGrowth: 1.85,
    apply: (fx, l) => { fx.offlineCapSeconds += 3 * 3600 * l; },
    effect: (l) => `+${3 * l}h offline`,
  }),
  P('temporal_lens', 'Temporal Lens', '🔭', '+25% Surge frenzy duration per level', {
    max: 6, baseCost: 3, costGrowth: 1.9,
    apply: (fx, l) => { fx.surgeDurationMul *= 1 + 0.25 * l; },
    effect: (l) => `+${Math.round(0.25 * l * 100)}% frenzy duration`,
  }),
  P('dormant_reactor', 'Dormant Reactor', '🌙', '+15% offline production per level', {
    max: 6, baseCost: 4, costGrowth: 1.95,
    apply: (fx, l) => { fx.offlineRateMul *= 1 + 0.15 * l; },
    effect: (l) => `+${Math.round(0.15 * l * 100)}% offline output`,
  }),
  P('flux_siphon', 'Flux Siphon', '🧪', '+20% end-of-run Nebula burst per level', {
    max: 8, baseCost: 3, costGrowth: 1.85,
    apply: (fx, l) => { fx.nebulaRunMul *= 1 + 0.2 * l; },
    effect: (l) => `+${Math.round(0.2 * l * 100)}% run Nebula`,
  }),
];

export const PRESTIGE_BY_ID = Object.create(null);
for (const p of PRESTIGE_UPGRADES) PRESTIGE_BY_ID[p.id] = p;

// Cost in Cores to buy the NEXT level of `def`, given the currently owned level.
export function prestigeUpgradeCost(def, currentLevel = 0) {
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, Math.max(0, Math.floor(currentLevel))));
}

// Can the player afford and has room to buy one more level of `def`?
export function canBuyPrestige(def, levels = {}, cores = 0) {
  const cur = clamp(Math.floor(levels[def.id] || 0), 0, def.max);
  if (cur >= def.max) return false;
  return cores >= prestigeUpgradeCost(def, cur);
}

// Reduce an owned-perk-level map into a single effects object the economy reads.
// Unknown ids and out-of-range levels are clamped/ignored, so a stale save is safe.
export function computePerks(levels = {}) {
  const fx = createPerkEffects();
  for (const def of PRESTIGE_UPGRADES) {
    const lvl = clamp(Math.floor(levels[def.id] || 0), 0, def.max);
    if (lvl > 0) def.apply(fx, lvl);
  }
  return fx;
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
// multiplier × Singularity perks. `profile` is the main→idle link (mainBoostMultiplier).
export function totalRate(state = createIdleState(), profile = {}) {
  const fx = computePerks(state.prestige);
  return baseRate(state.generators, fx.milestoneBonus)
    * prestigeMultiplier(state.lifetimeCores)
    * mainBoostMultiplier(profile)
    * fx.prodMul;
}

// Cores minted by Collapsing right now, after the Dense Singularity perk. Floors
// after the multiplier so the perk only ever rounds Core gain up or leaves it.
export function prestigeCoreGain(lifetimeNebula = 0, levels = {}) {
  const base = prestigeGain(lifetimeNebula);
  if (base <= 0) return 0;
  return Math.floor(base * computePerks(levels).coreGainMul);
}

// Nebula seeded back right after a Collapse, from the Collapse Memory perk: a
// fraction of the lifetime Nebula you are about to reset, so prestiging is a
// head start instead of a cold restart.
export function collapseSeedNebula(lifetimeNebula = 0, levels = {}) {
  return Math.floor(Math.max(0, lifetimeNebula) * computePerks(levels).startNebulaFrac);
}

// ------------------------------------------------------- manual mining (tap)

// The Cookie-Clicker "big cookie": a manual tap that mines Nebula by hand. This
// is the bootstrap that lets a brand-new Station (0 Nebula, 0 generators) earn
// its very first Nebula and afford its first generator — you can always tap your
// way out of an empty economy. Two ingredients keep taps relevant forever:
//   • a flat per-tap power raised by the Nebula-bought Mining Laser upgrade, and
//   • a slice of your live production, so a humming Station rewards taps too.
export const BASE_CLICK = 1;              // Nebula minted by one tap at zero upgrades
export const CLICK_RATE_FRACTION = 0.10;  // + this fraction of Nebula/sec per tap

// The Mining Laser: a single click-power upgrade line (distinct from the auto
// GENERATORS) bought with Nebula. Each level adds `power` to the flat per-tap
// yield. Reset by Collapse along with generators (it is a Nebula-era investment).
export const CLICK_UPGRADE = {
  id: 'mininglaser', name: 'Mining Laser', icon: '🔆',
  desc: 'Overcharge the mining beam — more Nebula from every manual tap.',
  baseCost: 50, costGrowth: 1.35, power: 1,
};
export const CLICK_POWER_STEP = CLICK_UPGRADE.power;

// Flat per-tap power (before global multipliers) from the Mining Laser level.
export function clickPower(level = 0) {
  return BASE_CLICK + CLICK_POWER_STEP * Math.max(0, Math.floor(level));
}

// Cost in Nebula of the NEXT Mining Laser level (geometric, like generators).
export function clickUpgradeCost(level = 0) {
  return Math.ceil(CLICK_UPGRADE.baseCost * Math.pow(CLICK_UPGRADE.costGrowth, Math.max(0, Math.floor(level))));
}

// Nebula minted by a single manual tap: click power (scaled by the same Prestige
// × run-profile multipliers as production) plus a slice of live output, all lifted
// by the Hardened Beam Singularity perk (clickMul). Floored at BASE_CLICK so the
// first tap on a pristine Station always yields something.
export function clickYield(state = createIdleState(), profile = {}) {
  const globalMult = prestigeMultiplier(state.lifetimeCores) * mainBoostMultiplier(profile);
  const fromPower = clickPower(state.clickLevel || 0) * globalMult;
  const fromRate = totalRate(state, profile) * CLICK_RATE_FRACTION;
  const clickMul = computePerks(state.prestige).clickMul;
  return Math.max(BASE_CLICK, (fromPower + fromRate) * clickMul);
}

// Offline/elapsed catch-up window. AFK is rewarding but bounded so leaving the
// tab for a month doesn't trivialise the economy. The Temporal Buffer perk widens it.
export const OFFLINE_CAP_SECONDS = 8 * 3600; // 8 hours

// The effective offline cap (seconds) after the Temporal Buffer perk.
export function offlineCapSeconds(levels = {}) {
  return computePerks(levels).offlineCapSeconds;
}

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
  X('kinetic_amplifier', 'Kinetic Amplifier', '🎇', '+15% crit damage per level', {
    max: 8, baseCost: 3, costGrowth: 1.7,
    apply: (b, l) => { b.critMultAdd += 0.15 * l; },
    effect: (l) => `+${Math.round(0.15 * l * 100)}% crit damage`,
  }),
  X('phase_shift', 'Phase Shift', '🌫️', '+3% dodge chance per level', {
    max: 8, baseCost: 3, costGrowth: 1.75,
    apply: (b, l) => { b.dodgeAdd += 0.03 * l; },
    effect: (l) => `+${Math.round(0.03 * l * 100)}% dodge`,
  }),
  X('vampiric_core', 'Vampiric Core', '🩸', '+2% lifesteal per level', {
    max: 6, baseCost: 4, costGrowth: 1.8,
    apply: (b, l) => { b.lifestealAdd += 0.02 * l; },
    effect: (l) => `+${Math.round(0.02 * l * 100)}% lifesteal`,
  }),
  X('blast_capacitor', 'Blast Capacitor', '💣', '+8% area of effect per level', {
    max: 6, baseCost: 3, costGrowth: 1.7,
    apply: (b, l) => { b.areaMul *= 1 + 0.08 * l; },
    effect: (l) => `+${Math.round(0.08 * l * 100)}% area`,
  }),
  X('piercing_rounds', 'Piercing Rounds', '🏹', '+1 projectile pierce per level', {
    max: 4, baseCost: 4, costGrowth: 2.0,
    apply: (b, l) => { b.pierceAdd += l; },
    effect: (l) => `+${l} pierce`,
  }),
  X('guardian_protocol', 'Guardian Protocol', '🛡️', '+3 armor per level', {
    max: 8, baseCost: 2, costGrowth: 1.65,
    apply: (b, l) => { b.armorAdd += 3 * l; },
    effect: (l) => `+${3 * l} armor`,
  }),
  X('nanite_regeneration', 'Nanite Regeneration', '💉', '+1 HP/s regen per level', {
    max: 8, baseCost: 2, costGrowth: 1.65,
    apply: (b, l) => { b.regenAdd += 1 * l; },
    effect: (l) => `+${1 * l} HP/s regen`,
  }),
  X('fortune_matrix', 'Fortune Matrix', '🎰', '+6% luck per level', {
    max: 6, baseCost: 3, costGrowth: 1.7,
    apply: (b, l) => { b.luckAdd += 0.06 * l; },
    effect: (l) => `+${Math.round(0.06 * l * 100)}% luck`,
  }),
  X('event_horizon', 'Event Horizon', '🕳️', '+12% Singularity charge rate per level', {
    max: 6, baseCost: 3, costGrowth: 1.75,
    apply: (b, l) => { b.singChargeMul *= 1 + 0.12 * l; },
    effect: (l) => `+${Math.round(0.12 * l * 100)}% Singularity charge`,
  }),
  X('phoenix_core', 'Phoenix Core', '🔥', '+1 revive per level', {
    max: 3, baseCost: 12, costGrowth: 2.4,
    apply: (b, l) => { b.revives += l; },
    effect: (l) => `+${l} revive${l === 1 ? '' : 's'}`,
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

// ----------------------------------------------------- Nebula Surges (RNG)
//
// The Cookie-Clicker "golden cookie": a bit of luck layered over the steady
// economy. While the Station is open, a glowing Surge occasionally drifts across
// the mine — tap it before it fades for a random reward. Rewards are deliberately
// swingy (an instant windfall, a timed production Frenzy, a short Click Frenzy, or
// a rare Core jackpot) so the Station always has a reason to watch.
//
// Everything here is pure and deterministic: the controller supplies the random
// rolls (so timing/DOM stay in main.js), and this module just maps a roll + the
// live economy snapshot into a concrete reward. That keeps the whole RNG layer
// unit-testable and keeps idle.js free of side effects.

// Surge spawn cadence, in seconds, before the Lucky Resonance perk. The controller
// picks a uniform interval in [min,max]; the perk's surgeChanceMul shortens it.
export const SURGE_MIN_INTERVAL = 42;
export const SURGE_MAX_INTERVAL = 96;
// How long a spawned Surge stays tappable before it fades away (seconds).
export const SURGE_LIFETIME = 13;

// The reward table. `weight` drives the weighted pick; `kind` tells the controller
// how to apply it. Timed buffs carry a `mult` and `duration` (seconds); instant
// rewards are computed from the live snapshot in rollSurge().
export const SURGE_TYPES = [
  { id: 'lucky',        name: 'Lucky Nebula',  icon: '🍀', kind: 'nebula', weight: 40, payoutMul: 1 },
  { id: 'frenzy',       name: 'Production Frenzy', icon: '⚡', kind: 'prod', weight: 24, mult: 7, duration: 45 },
  { id: 'click_frenzy', name: 'Click Frenzy',  icon: '👆', kind: 'click', weight: 16, mult: 11, duration: 15 },
  { id: 'bloom',        name: 'Resonance Bloom', icon: '🌸', kind: 'prod', weight: 8, mult: 3, duration: 20 },
  { id: 'windfall',     name: 'Stellar Windfall', icon: '🌟', kind: 'nebula', weight: 10, payoutMul: 2.4 },
  { id: 'overflow',     name: 'Nebula Overflow', icon: '🌊', kind: 'nebula', weight: 6, payoutMul: 4.5 },
  { id: 'supernova',    name: 'Supernova Frenzy', icon: '💥', kind: 'prod', weight: 5, mult: 15, duration: 30 },
  { id: 'overclock',    name: 'Overclock Burst', icon: '🔥', kind: 'click', weight: 5, mult: 20, duration: 12 },
  { id: 'core_cache',   name: 'Core Cache',    icon: '💠', kind: 'core', weight: 2, cores: 1 },
  { id: 'core_vault',   name: 'Core Vault',    icon: '🏦', kind: 'core', weight: 1, cores: 3 },
];

export const SURGE_BY_ID = Object.create(null);
for (const s of SURGE_TYPES) SURGE_BY_ID[s.id] = s;

// Pick a Surge type from a [0,1) roll via the weight table. Pure and total: any
// in-range roll returns a type, and out-of-range rolls clamp to the ends.
export function pickSurgeType(roll = 0) {
  let total = 0;
  for (const s of SURGE_TYPES) total += s.weight;
  let r = clamp(roll, 0, 0.999999) * total;
  for (const s of SURGE_TYPES) {
    r -= s.weight;
    if (r < 0) return s;
  }
  return SURGE_TYPES[SURGE_TYPES.length - 1];
}

// Turn a chosen Surge type + a live economy snapshot into a concrete reward the
// controller can apply. `ctx` carries { rate, nebula, perks } where perks is a
// computePerks() result (surgeRewardMul scales instant payouts). Timed buffs come
// back with { kind:'prod'|'click', mult, duration }; instant ones with a `nebula`
// or `cores` amount. Kept pure so the RNG economy is deterministic + testable.
export function rollSurge(roll = 0, ctx = {}) {
  const { rate = 0, nebula = 0, perks = createPerkEffects() } = ctx;
  const rewardMul = Math.max(1, perks.surgeRewardMul || 1);
  const durationMul = Math.max(1, perks.surgeDurationMul || 1);
  const type = pickSurgeType(roll);
  const base = { id: type.id, name: type.name, icon: type.icon, kind: type.kind };
  if (type.kind === 'prod' || type.kind === 'click') {
    // A timed frenzy: multiply production (or taps) for a fixed window, widened
    // by the Temporal Lens perk (durationMul).
    return { ...base, mult: type.mult, duration: Math.round(type.duration * durationMul) };
  }
  if (type.kind === 'core') {
    // Rare jackpot: Cores straight into the bank (type.cores scales the payout).
    return { ...base, cores: Math.max(1, Math.round((type.cores || 1) * rewardMul)) };
  }
  // Lucky Nebula: the larger of "a chunk of the bank" and "a burst of production",
  // with a sane floor so an empty/idle Station still gets a worthwhile pop. A
  // per-type payoutMul lets richer Nebula surges hit harder.
  const payoutMul = type.payoutMul || 1;
  const fromBank = nebula * 0.15 * payoutMul;
  const fromRate = rate * 900 * payoutMul; // ~15 minutes of production
  const windfall = Math.max(fromBank, fromRate, 25 * payoutMul) * rewardMul;
  return { ...base, nebula: Math.max(1, Math.floor(windfall)) };
}
