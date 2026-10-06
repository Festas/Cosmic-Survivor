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
  invulnOnHit: 0.9, // seconds of i-frames after taking damage
  contactCooldown: 0.45, // per-enemy contact damage cadence
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
export const DIRECTOR = {
  // enemies alive cap grows over time
  baseCap: 26,
  capPerMin: 20,
  capMax: 180,
  // spawn interval shrinks over time
  spawnStart: 1.1,
  spawnMin: 0.16,
  spawnHalfLife: 95, // seconds for interval to approach min
  // global enemy stat scaling
  hpStart: 1,
  hpPerMin: 0.55,
  speedPerMin: 0.05,
  speedMax: 1.7,
  // boss cadence
  bossEvery: 60, // seconds
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

// XP required to go from `level` to `level+1`.
export function xpForLevel(level) {
  return Math.floor(XP.base * Math.pow(XP.growth, level - 1) + XP.linear * (level - 1));
}

// Kill-streak -> score/damage multiplier.
export function comboMultiplier(streak) {
  const steps = Math.floor(streak / COMBO.step);
  return Math.min(COMBO.max, 1 + steps * COMBO.amount);
}
