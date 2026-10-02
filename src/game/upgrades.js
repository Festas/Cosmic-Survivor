// upgrades.js — level-up upgrade pool and draft logic. Pure (no DOM).
// `apply(p)` mutates a player stats object (see player.js `createStats`).

import { weightedPick, shuffle } from '../engine/utils.js';

export const RARITY = {
  common: { label: 'Common', color: '#b9c6ff', weight: 100 },
  rare: { label: 'Rare', color: '#51e9ff', weight: 42 },
  epic: { label: 'Epic', color: '#b06bff', weight: 16 },
  legendary: { label: 'Legendary', color: '#ffd447', weight: 4.5 },
};

// Helper to build an upgrade entry.
function U(id, name, rarity, icon, desc, apply, opts = {}) {
  return {
    id,
    name,
    rarity,
    icon,
    desc,
    apply,
    maxStacks: opts.maxStacks ?? 5,
    tags: opts.tags ?? [],
    req: opts.req ?? null, // function(p) -> bool
  };
}

export const UPGRADES = [
  // ---- Offense ----------------------------------------------------------
  U('damage', 'Overcharged Rounds', 'common', '💥', '+20% bullet damage', (p) => { p.damage *= 1.2; }),
  U('firerate', 'Rapid Coils', 'common', '⚡', '+15% fire rate', (p) => { p.fireInterval *= 0.87; }),
  U('multishot', 'Split Barrel', 'rare', '🔱', '+1 projectile', (p) => { p.projectiles += 1; }, { maxStacks: 6 }),
  U('pierce', 'Railgun Core', 'rare', '➹', '+1 pierce & +12% bullet speed', (p) => { p.pierce += 1; p.bulletSpeed *= 1.12; }, { maxStacks: 4 }),
  U('crit', 'Precision Optics', 'common', '🎯', '+8% crit chance', (p) => { p.critChance += 0.08; }),
  U('critdmg', 'Lethal Intent', 'rare', '🗡️', '+60% crit damage', (p) => { p.critMult += 0.6; }, { maxStacks: 4 }),
  U('range', 'Targeting Array', 'common', '📡', '+22% range & slight homing', (p) => { p.range *= 1.22; p.homing += 1.4; }),
  U('bigbullets', 'Heavy Slugs', 'common', '⬤', '+40% bullet size & +12% knockback', (p) => { p.bulletRadius *= 1.4; p.knockback *= 1.12; }, { maxStacks: 3 }),

  // ---- Elemental imbues (enable the Resonance system) --------------------
  U('imbue_fire', 'Plasma Rounds', 'rare', '🔥', 'Shots Ignite enemies (burn)', (p) => { p.imbue.fire = Math.min(1, p.imbue.fire + 0.6); }, { maxStacks: 2, tags: ['element'] }),
  U('imbue_cryo', 'Cryo Rounds', 'rare', '❄️', 'Shots apply Cryo (slow/freeze)', (p) => { p.imbue.cryo = Math.min(1, p.imbue.cryo + 0.6); }, { maxStacks: 2, tags: ['element'] }),
  U('imbue_shock', 'Tesla Rounds', 'rare', '⚡', 'Shots Shock enemies (chains)', (p) => { p.imbue.shock = Math.min(1, p.imbue.shock + 0.6); }, { maxStacks: 2, tags: ['element'] }),
  U('imbue_void', 'Void Rounds', 'epic', '🟣', 'Shots apply Void (gravity) & boost Singularity', (p) => { p.imbue.void = Math.min(1, p.imbue.void + 0.6); p.singularityChargeMul *= 1.15; }, { maxStacks: 2, tags: ['element'] }),
  U('resonance', 'Resonance Cascade', 'epic', '✴️', '+40% elemental & reaction damage', (p) => { p.elementMul *= 1.4; }, { maxStacks: 3, tags: ['element'], req: (p) => hasAnyImbue(p) }),

  // ---- Signature: Singularity ------------------------------------------
  U('sing_charge', 'Dark Matter Capacitor', 'rare', '🌀', '+30% Singularity charge rate', (p) => { p.singularityChargeMul *= 1.3; }, { maxStacks: 4 }),
  U('sing_power', 'Event Horizon', 'epic', '🕳️', '+35% Singularity size & damage', (p) => { p.singularityRadiusMul *= 1.2; p.singularityDamageMul *= 1.35; }, { maxStacks: 3 }),

  // ---- Signature: Phase Dash -------------------------------------------
  U('dash_cd', 'Phase Coils', 'common', '💨', '-20% Dash cooldown', (p) => { p.dashCooldownMul *= 0.8; }, { maxStacks: 4 }),
  U('dash_blade', 'Rift Blades', 'rare', '🌪️', '+70% Dash trail damage & radius', (p) => { p.dashDamageMul *= 1.7; p.dashRadiusMul *= 1.3; }, { maxStacks: 3 }),

  // ---- Companions & on-hit ---------------------------------------------
  U('drone', 'Orbital Drone', 'epic', '🛰️', 'Gain an orbiting drone that auto-fires', (p) => { p.droneCount += 1; }, { maxStacks: 4 }),
  U('explosive', 'Volatile Payload', 'epic', '🧨', 'Kills have a chance to explode', (p) => { p.explosiveChance = Math.min(0.6, p.explosiveChance + 0.25); p.explosiveDamage += 24; }, { maxStacks: 3 }),

  // ---- Defense & utility ------------------------------------------------
  U('maxhp', 'Reinforced Hull', 'common', '❤️', '+25 max HP (and heal)', (p) => { p.maxHp += 25; p.healOnPick = (p.healOnPick || 0); p.pendingHeal = (p.pendingHeal || 0) + 25; }),
  U('armor', 'Ablative Plating', 'rare', '🛡️', '+3 armor (flat damage reduction)', (p) => { p.armor += 3; }, { maxStacks: 5 }),
  U('regen', 'Nanite Repair', 'common', '➕', '+1.2 HP/sec regeneration', (p) => { p.regen += 1.2; }),
  U('lifesteal', 'Vampiric Circuit', 'epic', '🩸', 'Heal 3% of damage dealt', (p) => { p.lifesteal += 0.03; }, { maxStacks: 3 }),
  U('dodge', 'Phase Shift', 'rare', '👻', '+8% dodge chance', (p) => { p.dodge = Math.min(0.5, p.dodge + 0.08); }, { maxStacks: 4 }),
  U('speed', 'Ion Thrusters', 'common', '🚀', '+12% move speed', (p) => { p.moveSpeed *= 1.12; }, { maxStacks: 4 }),
  U('magnet', 'Graviton Magnet', 'common', '🧲', '+45% pickup radius & +12% XP', (p) => { p.pickupRadius *= 1.45; p.xpMul *= 1.12; }, { maxStacks: 4 }),
];

function hasAnyImbue(p) {
  return p.imbue.fire > 0 || p.imbue.cryo > 0 || p.imbue.shock > 0 || p.imbue.void > 0;
}

export function isAvailable(up, player) {
  const count = player.upgradeCounts[up.id] || 0;
  if (count >= up.maxStacks) return false;
  if (up.req && !up.req(player.stats)) return false;
  return true;
}

// Draft `count` distinct upgrade choices for the level-up screen.
export function draftUpgrades(player, count = 3, r) {
  const pool = UPGRADES.filter((u) => isAvailable(u, player)).map((u) => ({
    ...u,
    weight: RARITY[u.rarity].weight * (1 + (player.stats.luck || 0)),
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
