// elements.js — Elemental status effects and the Resonance combo system.
// Pure logic (no DOM). `status` objects live on enemies; world.js applies the
// spatial side-effects (AoE, chains, particles) described by reaction objects.

import { COLORS } from './config.js';

export const ELEMENTS = {
  fire: { key: 'fire', name: 'Ignite', color: COLORS.fire, duration: 2.6, dps: 10 },
  cryo: { key: 'cryo', name: 'Cryo', color: COLORS.cryo, duration: 3.0, slow: 0.5 },
  shock: { key: 'shock', name: 'Shock', color: COLORS.shock, duration: 1.4, dps: 4 },
  void: { key: 'void', name: 'Void', color: COLORS.void, duration: 2.4, dps: 6, pull: 1 },
  toxin: { key: 'toxin', name: 'Corrode', color: COLORS.toxin, duration: 3.4, dps: 13 },
};

export const ELEMENT_KEYS = ['fire', 'cryo', 'shock', 'void', 'toxin'];

// Resonance reactions, keyed by the two elements sorted alphabetically.
// `type` tells world.js how to resolve the spatial effect.
export const REACTIONS = {
  'cryo|fire': { name: 'Shatter', type: 'burst', color: COLORS.cryo, damage: 46, radius: 130, knockback: 240 },
  'fire|shock': { name: 'Overload', type: 'burst', color: COLORS.fire, damage: 74, radius: 80, knockback: 120 },
  'cryo|shock': { name: 'Superconduct', type: 'field', color: COLORS.shock, damage: 26, radius: 160, chain: 4, slow: 0.55, slowDur: 2.4 },
  'fire|void': { name: 'Collapse', type: 'burst', color: COLORS.void, damage: 60, radius: 150, pull: 1, knockback: 60 },
  'cryo|void': { name: 'Black Ice', type: 'field', color: COLORS.cryo, damage: 24, radius: 140, freeze: 1.5, pull: 1 },
  'shock|void': { name: 'Ion Storm', type: 'chain', color: COLORS.void, damage: 34, radius: 200, chain: 6, pull: 1 },
  // ---- Toxin resonances (acid corrosion meeting every other element) --------
  'fire|toxin': { name: 'Combust', type: 'burst', color: COLORS.toxin, damage: 92, radius: 120, knockback: 180 },
  'cryo|toxin': { name: 'Frostbite', type: 'field', color: COLORS.toxin, damage: 30, radius: 150, freeze: 1.1, slow: 0.5, slowDur: 2.6 },
  'shock|toxin': { name: 'Electrolysis', type: 'chain', color: COLORS.toxin, damage: 40, radius: 190, chain: 5 },
  'toxin|void': { name: 'Dissolve', type: 'field', color: COLORS.toxin, damage: 36, radius: 170, slow: 0.5, slowDur: 2.8, pull: 1 },
};

export function reactionKey(a, b) {
  return [a, b].sort().join('|');
}

export function getReaction(a, b) {
  return REACTIONS[reactionKey(a, b)] || null;
}

export function createStatus() {
  return { fire: 0, cryo: 0, shock: 0, void: 0, toxin: 0, freeze: 0, slowField: 0, slowFieldAmt: 0 };
}

// Returns the first active element on `status` other than `except`, by priority.
function activeOther(status, except) {
  for (const k of ELEMENT_KEYS) {
    if (k !== except && status[k] > 0) return k;
  }
  return null;
}

// Apply an element to a status object.
// Returns a reaction descriptor (cloned, with x/y to be filled by caller) when a
// combo triggers, otherwise null. On a reaction both source elements are consumed.
export function applyElement(status, key, power = 1) {
  if (!ELEMENTS[key]) return null;
  const other = activeOther(status, key);
  if (other) {
    const base = getReaction(key, other);
    status[key] = 0;
    status[other] = 0;
    if (base) {
      const r = { ...base };
      r.damage *= power;
      if (r.freeze) status.freeze = Math.max(status.freeze, 0); // applied spatially
      return r;
    }
    return null;
  }
  status[key] = Math.max(status[key], ELEMENTS[key].duration * power);
  return null;
}

// Advance all timers by dt. Returns aggregate effect for this frame:
//  { dot, slow (0..1 multiplier), frozen, pull (bool) }
export function tickStatus(status, dt) {
  let dot = 0;
  let slow = 1;
  let frozen = false;
  let pull = false;
  for (const key of ELEMENT_KEYS) {
    if (status[key] > 0) {
      status[key] = Math.max(0, status[key] - dt);
      const e = ELEMENTS[key];
      if (e.dps) dot += e.dps * dt;
      if (e.slow) slow = Math.min(slow, 1 - e.slow);
      if (e.pull) pull = true;
    }
  }
  if (status.freeze > 0) {
    status.freeze = Math.max(0, status.freeze - dt);
    frozen = true;
    slow = 0;
  }
  if (status.slowField > 0) {
    status.slowField = Math.max(0, status.slowField - dt);
    slow = Math.min(slow, 1 - status.slowFieldAmt);
  }
  return { dot, slow, frozen, pull };
}

// Strongest active element (for tint rendering). Returns an ELEMENTS entry or null.
export function dominantElement(status) {
  let best = null;
  let bestT = 0;
  for (const key of ELEMENT_KEYS) {
    if (status[key] > bestT) {
      bestT = status[key];
      best = ELEMENTS[key];
    }
  }
  if (status.freeze > 0 && status.freeze > bestT) return ELEMENTS.cryo;
  return best;
}

export function hasAnyStatus(status) {
  return (
    status.fire > 0 ||
    status.cryo > 0 ||
    status.shock > 0 ||
    status.void > 0 ||
    status.toxin > 0 ||
    status.freeze > 0 ||
    status.slowField > 0
  );
}
