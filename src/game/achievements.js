// achievements.js — "Commendations". Permanent milestone awards earned by hitting
// thresholds over a single run or across a whole career. Each commendation pays a
// one-time Stardust bounty the first time it is unlocked, giving long-term goals
// that feed back into the Hangar economy. Pure data + pure helpers (no DOM) so the
// whole catalogue is deterministic and unit-testable in plain Node.
//
// A commendation's check() reads a flat `ctx` object that merges the just-finished
// run summary with the persisted career totals (see main.js buildAchievementCtx).
// Missing fields default to 0 so checks never throw on a partial context.

function A(id, name, icon, desc, reward, check) {
  return { id, name, icon, desc, reward, check };
}

// Small helper so every check tolerates an absent ctx / field.
const n = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

// The commendation catalogue. Ordered roughly first-steps → survival → slaughter →
// bosses → mastery → collection → challenge. Rewards are modest on purpose: they are
// a bonus for reaching a milestone, not the main Stardust faucet.
export const ACHIEVEMENTS = [
  A('first_launch', 'First Launch', '🚀', 'Complete your first run.', 15,
    (c) => n(c.runs) >= 1),
  A('centurion', 'Centurion', '💯', 'Defeat 100 enemies in a single run.', 20,
    (c) => n(c.kills) >= 100),
  A('survive_5', 'Hold the Line', '⏱️', 'Survive for 5 minutes in one run.', 25,
    (c) => n(c.time) >= 300),
  A('survive_10', 'Last Stand', '⏳', 'Survive for 10 minutes in one run.', 60,
    (c) => n(c.time) >= 600),
  A('survive_15', 'Eternal', '♾️', 'Survive for 15 minutes in one run.', 120,
    (c) => n(c.time) >= 900),
  A('slayer_1k', 'Slayer', '⚔️', 'Defeat 1,000 enemies across all runs.', 40,
    (c) => n(c.totalKills) >= 1000),
  A('slayer_10k', 'Exterminator', '☠️', 'Defeat 10,000 enemies across all runs.', 150,
    (c) => n(c.totalKills) >= 10000),
  A('first_boss', 'Giant Slayer', '👾', 'Destroy your first boss.', 30,
    (c) => n(c.bossKillsTotal) >= 1),
  A('boss_hunter', 'Boss Hunter', '🏆', 'Destroy 10 bosses across all runs.', 80,
    (c) => n(c.bossKillsTotal) >= 10),
  A('triple_threat', 'Triple Threat', '💥', 'Destroy 3 bosses in a single run.', 70,
    (c) => n(c.bossKills) >= 3),
  A('alchemist', 'Alchemist', '✴️', 'Trigger 60 elemental reactions in one run.', 35,
    (c) => n(c.reactions) >= 60),
  A('ascendant', 'Ascendant', '🌟', 'Reach character level 20 in a single run.', 45,
    (c) => n(c.level) >= 20),
  A('scorer_50k', 'High Scorer', '📈', 'Score 50,000 points in a single run.', 50,
    (c) => n(c.score) >= 50000),
  A('scorer_100k', 'Legend', '👑', 'Score 100,000 points in a single run.', 120,
    (c) => n(c.score) >= 100000),
  A('fleet_admiral', 'Fleet Admiral', '🛰️', 'Unlock every starfighter.', 80,
    (c) => n(c.shipsTotal) > 0 && n(c.shipsUnlocked) >= n(c.shipsTotal)),
  A('daredevil', 'Daredevil', '🎲', 'Finish a run with 2+ Directives active.', 40,
    (c) => n(c.directives) >= 2),
  A('defiant', 'Defiant', '🔥', 'Finish a run with 4+ Directives active.', 100,
    (c) => n(c.directives) >= 4),
];

export const ACHIEVEMENT_BY_ID = Object.create(null);
for (const a of ACHIEVEMENTS) ACHIEVEMENT_BY_ID[a.id] = a;

// Is a commendation satisfied by the given context? Defensive against bad input.
export function isAchievementEarned(def, ctx = {}) {
  try {
    return !!def.check(ctx || {});
  } catch {
    return false;
  }
}

// Given the already-unlocked ids and a merged context, return the commendations that
// are newly satisfied (and therefore should be unlocked + paid out). Pure: does not
// mutate the input set.
export function evaluateAchievements(unlockedIds = [], ctx = {}) {
  const owned = new Set(unlockedIds);
  const fresh = [];
  for (const def of ACHIEVEMENTS) {
    if (owned.has(def.id)) continue;
    if (isAchievementEarned(def, ctx)) fresh.push(def);
  }
  return fresh;
}

// Total Stardust bounty for a list of commendation defs.
export function totalAchievementReward(defs = []) {
  return defs.reduce((sum, d) => sum + (d.reward || 0), 0);
}
