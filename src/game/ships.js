// ships.js — playable starfighters. Each ship is a build identity: a starting
// weapon, a set of stat modifiers applied on top of the base loadout, an accent
// colour and an unlock cost in Stardust. Pure data (no DOM), unit-tested.
//
// World.reset picks the ship, swaps in its starting weapon and runs `apply` on a
// fresh stats object (before the meta bonus is layered on). Keeping this pure and
// data-driven means new ships are a single entry here — no engine changes.

import { COLORS } from './config.js';

function S(def) {
  return {
    unlockCost: 0,
    color: COLORS.player,
    apply: () => {},
    ...def,
  };
}

export const SHIPS = [
  S({
    id: 'vanguard', name: 'Vanguard', icon: '🛸',
    tag: 'Balanced · reliable all-rounder',
    desc: 'A dependable starfighter with no weaknesses. Auto-aiming Ion Blaster.',
    weapon: 'ion', color: COLORS.player, unlockCost: 0,
    apply() { /* baseline — no modifiers */ },
  }),
  S({
    id: 'striker', name: 'Striker', icon: '🗡️',
    tag: 'Glass cannon · crit & burst',
    desc: 'Hits like a railgun but folds under fire. Starts with the Scatter Array.',
    weapon: 'spread', color: COLORS.danger, unlockCost: 220,
    apply(s) {
      s.weaponDamageMul *= 1.25;
      s.critChance += 0.1;
      s.critMult += 0.3;
      s.moveSpeed *= 1.05;
      s.maxHp -= 25;
    },
  }),
  S({
    id: 'juggernaut', name: 'Juggernaut', icon: '🛡️',
    tag: 'Fortress · soak & shove',
    desc: 'A heavy bruiser that tanks swarms and knocks them flying. Pulse Nova core.',
    weapon: 'pulse', color: COLORS.gold, unlockCost: 300,
    apply(s) {
      s.maxHp += 70;
      s.armor += 4;
      s.regen += 0.6;
      s.knockback *= 1.4;
      s.moveSpeed *= 0.88;
    },
  }),
  S({
    id: 'tempest', name: 'Tempest', icon: '⚡',
    tag: 'Blitz · haste & mobility',
    desc: 'Lightning-fast hull built for dodging. Chains Arc Coil lightning.',
    weapon: 'arc', color: COLORS.shock, unlockCost: 360,
    apply(s) {
      s.moveSpeed *= 1.2;
      s.cooldownMul *= 0.88;
      s.dashCooldownMul *= 0.8;
      s.maxHp -= 15;
    },
  }),
  S({
    id: 'pyre', name: 'Pyre', icon: '🔥',
    tag: 'Pyromancer · burn & blast',
    desc: 'Ignites everything and detonates on death. Starts with the Missile Pod.',
    weapon: 'missile', color: COLORS.fire, unlockCost: 460,
    apply(s) {
      s.imbue.fire = Math.min(1, s.imbue.fire + 0.6);
      s.elementMul *= 1.3;
      s.explosiveChance = Math.min(0.6, s.explosiveChance + 0.15);
      s.explosiveDamage += 18;
      s.areaMul *= 1.1;
    },
  }),
  S({
    id: 'oracle', name: 'Oracle', icon: '🌀',
    tag: 'Voidcaller · gravity & reactions',
    desc: 'Bends spacetime. Void-imbued shots and a supercharged Singularity. Graviton Mortar.',
    weapon: 'mortar', color: COLORS.void, unlockCost: 560,
    apply(s) {
      s.imbue.void = Math.min(1, s.imbue.void + 0.6);
      s.singularityChargeMul *= 1.4;
      s.singularityRadiusMul *= 1.15;
      s.singularityDamageMul *= 1.2;
      s.areaMul *= 1.15;
      s.maxHp -= 10;
    },
  }),
];

export const SHIP_BY_ID = Object.create(null);
for (const sh of SHIPS) SHIP_BY_ID[sh.id] = sh;

export const DEFAULT_SHIP_ID = 'vanguard';

export function shipById(id) {
  return SHIP_BY_ID[id] || SHIP_BY_ID[DEFAULT_SHIP_ID];
}

// A ship is unlocked if it's free, already owned, or affordable is decided by the
// caller; this just answers "is it owned / free?".
export function isShipUnlocked(ship, unlockedIds = []) {
  return ship.unlockCost === 0 || unlockedIds.includes(ship.id);
}
