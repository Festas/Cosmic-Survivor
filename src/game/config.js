// config.js — central tuning constants and palette. Pure data + pure helpers.

export const COLORS = {
  bg0: '#05060f',
  bg1: '#0a0e24',
  grid: 'rgba(80,120,255,0.06)',
  player: '#51e9ff',
  playerGlow: '#1bd7ff',
  thrust: '#ff8a3d',
  xp: '#7CFFB2',
  heal: '#ff5c8a',
  gold: '#ffd447',
  void: '#b06bff',
  fire: '#ff6a3d',
  cryo: '#7fdbff',
  shock: '#ffe24d',
  toxin: '#8aff00',
  danger: '#ff3b6b',
  white: '#ffffff',
  shield: '#64f0ff',
  // Retro "OG alien invaders" accent palette (additive — safe to reference from
  // enemy defs and bullet colours; does not alter any existing key).
  invGreen: '#5dff7a',
  invCyan: '#5de0ff',
  invMagenta: '#ff5df0',
  invRed: '#ff4d6a',
  invAmber: '#ffd23d',
  saucer: '#9dff4d',
};

export const ARENA = {
  w: 2800,
  h: 1900,
  pad: 60, // soft wall padding
};

export const PLAYER = {
  radius: 15,
  speed: 320,
  maxHp: 100,
  regen: 0.6, // hp per second (base; upgrades add)
  pickupRadius: 140,
  magnetSpeed: 620,
  // i-frames after taking a hit. Projectiles/AoE grant a normal window; *contact*
  // grants only a short one so standing inside a swarm keeps chipping you (the
  // old 0.9s global window let a tanky build sit on one spot forever — see
  // contactInvuln + World.updateEnemies).
  invulnOnHit: 0.5, // seconds of i-frames after a projectile/AoE hit
  contactInvuln: 0.18, // shorter i-frames after a body-contact hit (anti-turtle)
  contactCooldown: 0.5, // per-enemy contact damage cadence
  // Armor is a flat reduction but can never negate more than this fraction of a
  // hit, so stacking armor softens damage instead of trivialising it. Keeps late
  // game threatening even for defensive builds.
  minDamageFraction: 0.34,
  // Lifesteal is budgeted (see Player.lifestealHeal): it can return at most
  // lifestealCapRate * maxHp per second, with a small burst reserve of
  // lifestealCapBurst * maxHp. Prevents the "leech a huge swarm = unkillable"
  // inversion while leaving single-target leech builds feeling strong.
  lifestealCapRate: 0.14, // max HP/s returned by lifesteal (fraction of maxHp)
  lifestealCapBurst: 0.3, // stored burst reserve (fraction of maxHp)
};

export const WEAPON = {
  damage: 11,
  fireInterval: 0.34, // seconds between shots
  bulletSpeed: 660,
  bulletRadius: 5,
  bulletLife: 1.05, // seconds
  projectiles: 1,
  spread: 0.06, // radians between multishot pellets
  pierce: 0,
  knockback: 90,
  critChance: 0.05,
  critMult: 2.0,
  range: 560, // auto-aim acquisition range
  homing: 0, // turn rate (rad/s), 0 = none
};

export const DASH = {
  distance: 190,
  duration: 0.15,
  cooldown: 1.5,
  bulletTime: 0.32, // timescale during the dash window
  bulletTimeDuration: 0.5,
  trailDamage: 18,
  trailRadius: 26,
};

export const SINGULARITY = {
  chargeMax: 100,
  chargePerKill: 7,
  chargePerHit: 0.4,
  pullRadius: 340,
  pullForce: 540,
  duration: 2.2,
  dotPerSecond: 26,
  implosionDamage: 160,
  implosionRadius: 300,
  coreRadius: 16,
};

export const XP = {
  base: 5,
  growth: 1.32, // multiplicative per level
  linear: 3,
  orbValue: 1,
};

export const COMBO = {
  decay: 2.6, // seconds before the kill streak starts to drop
  perKill: 1,
  // multiplier = 1 + floor(streak / step) * amount, capped
  step: 5,
  amount: 0.25,
  max: 6,
};

// Difficulty director scaling. Pure functions of elapsed seconds.
// Tuned for a markedly steeper curve — the swarm gets denser, faster, tankier
// and harder-hitting sooner, so runs stop feeling like a cakewalk past the
// opening minute while the first ~30s stay gentle enough to onboard.
export const DIRECTOR = {
  // enemies alive cap grows over time
  baseCap: 30,
  capPerMin: 33,
  capMax: 300,
  // spawn interval shrinks over time
  spawnStart: 0.9,
  spawnMin: 0.1,
  spawnHalfLife: 60, // seconds for interval to approach min
  // global enemy stat scaling
  hpStart: 1,
  hpPerMin: 0.95,
  speedPerMin: 0.1,
  speedMax: 2.2,
  // enemy damage scaling over time — rank-and-file hits get harder so late-game
  // crowds stay threatening (bosses keep their hand-tuned per-pattern damage).
  dmgStart: 1,
  dmgPerMin: 0.38,
  dmgMax: 3.4,
  // boss cadence (legacy; the wave director — see WAVE — now gates bosses).
  bossEvery: 54, // seconds
};

// Wave director. The run is paced in discrete waves instead of a raw timer: a
// Wave Counter drives the roster "themes" (every 10 waves), guaranteed Elite
// waves (every 5th) and Boss waves (every 10th). Bosses gate progression — the
// wave clock pauses while a boss is alive — so bosses can never stack up.
export const WAVE = {
  duration: 20,    // base seconds a normal wave lasts
  durationMin: 12, // waves tighten to this as the run escalates
  rampWaves: 60,   // waves over which duration eases from duration -> durationMin
  eliteEvery: 5,   // an Elite is guaranteed on waves 5, 15, 25, …
  bossEvery: 10,   // a Boss arrives on waves 10, 20, 30, …
  bossCount: 10,   // distinct bosses before the roster cycles (one per 10 waves)
  themeSize: 10,   // waves per enemy theme (matches bossEvery: one boss per theme)
  // Past this wave the difficulty grows exponentially (the "endless" tier).
  hyperStart: 100,
  hyperBase: 1.055,     // per-wave hp/reward multiplier beyond hyperStart
  hyperSpeedBase: 1.01, // gentler per-wave speed multiplier beyond hyperStart
  hyperSpeedMax: 2.4,
};

// Elite affix. A growing fraction of mid-tier+ spawns are promoted to tougher,
// XP-rich "elite" variants (marked with a gold ring in world.js). Elites keep
// the late game threatening without adding new archetypes — they are just beefed
// up versions of the existing roster, so they never hurt readability.
export const ELITE = {
  unlock: 55, // seconds before any elite can appear
  chanceStart: 0.045,
  chancePerMin: 0.075,
  chanceMax: 0.32,
  hpMul: 2.85, // elites are spongy — a real speed bump, not a one-shot
  damageMul: 1.5,
  radiusMul: 1.25, // visibly larger so the threat reads at a glance
  speedMul: 0.92, // slightly heavier/slower than their base archetype
  xpMul: 3, // worth chasing: they drop a richer burst of XP orbs
  ring: COLORS.gold, // elite marker ring colour
};

export function spawnInterval(t) {
  const { spawnStart, spawnMin, spawnHalfLife } = DIRECTOR;
  return spawnMin + (spawnStart - spawnMin) * Math.pow(0.5, t / spawnHalfLife);
}

export function enemyCap(t) {
  const { baseCap, capPerMin, capMax } = DIRECTOR;
  return Math.min(capMax, Math.floor(baseCap + (capPerMin * t) / 60));
}

export function hpScale(t) {
  return DIRECTOR.hpStart + (DIRECTOR.hpPerMin * t) / 60;
}

export function speedScale(t) {
  return Math.min(DIRECTOR.speedMax, 1 + (DIRECTOR.speedPerMin * t) / 60);
}

// Rank-and-file contact/bullet damage multiplier. Grows with elapsed time and is
// clamped, so the early game stays gentle while late waves punish standing still.
export function dmgScale(t) {
  return Math.min(DIRECTOR.dmgMax, DIRECTOR.dmgStart + (DIRECTOR.dmgPerMin * t) / 60);
}

// Probability [0,1] that an eligible spawn is promoted to an elite. Zero until
// ELITE.unlock, then ramps with elapsed minutes and is clamped at chanceMax so
// elites stay a spice, never the majority.
export function eliteChance(t) {
  if (t < ELITE.unlock) return 0;
  const m = (t - ELITE.unlock) / 60;
  return Math.min(ELITE.chanceMax, ELITE.chanceStart + ELITE.chancePerMin * m);
}

// XP required to go from `level` to `level+1`.
export function xpForLevel(level) {
  return Math.floor(XP.base * Math.pow(XP.growth, level - 1) + XP.linear * (level - 1));
}

// Kill-streak -> score/damage multiplier.
export function comboMultiplier(streak) {
  const steps = Math.floor(streak / COMBO.step);
  return Math.min(COMBO.max, 1 + steps * COMBO.amount);
}

// -------------------------------------------------------------- wave scaling

// Seconds a given wave lasts. Eases from WAVE.duration down to WAVE.durationMin
// across the first WAVE.rampWaves waves so the mid game tightens the cadence.
export function waveDuration(wave) {
  const { duration, durationMin, rampWaves } = WAVE;
  const k = Math.min(1, Math.max(0, (wave - 1) / rampWaves));
  return duration + (durationMin - duration) * k;
}

// Exponential difficulty multiplier for the endless tier. Exactly 1 up to and
// including WAVE.hyperStart (so waves 1–100 keep their hand-tuned curve), then
// grows geometrically — this is what makes "past wave 100" ramp hard.
export function waveHyperScale(wave) {
  if (wave <= WAVE.hyperStart) return 1;
  return Math.pow(WAVE.hyperBase, wave - WAVE.hyperStart);
}

// Gentler exponential applied to enemy speed past the hyper threshold, clamped so
// late-game enemies get faster without becoming literally undodgeable.
export function waveSpeedHyper(wave) {
  if (wave <= WAVE.hyperStart) return 1;
  return Math.min(WAVE.hyperSpeedMax, Math.pow(WAVE.hyperSpeedBase, wave - WAVE.hyperStart));
}

// Boss HP/threat multiplier for the wave it appears on. Pre-100 this is 1 (each
// boss carries its own hand-tuned per-slot HP); past 100 the roster cycles and
// the exponential tier makes repeat bosses dramatically tankier.
export function bossWaveScale(wave) {
  return waveHyperScale(wave);
}

// True for boss waves (every WAVE.bossEvery) and elite waves (every WAVE.eliteEvery
// that is not also a boss wave — i.e. 5, 15, 25, …).
export function isBossWave(wave) {
  return wave > 0 && wave % WAVE.bossEvery === 0;
}
export function isEliteWave(wave) {
  return wave > 0 && wave % WAVE.eliteEvery === 0 && wave % WAVE.bossEvery !== 0;
}
