import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENTS, ACHIEVEMENT_BY_ID, isAchievementEarned,
  evaluateAchievements, totalAchievementReward,
} from '../src/game/achievements.js';

test('every commendation has required fields and a callable check()', () => {
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.id && a.name && a.icon && a.desc, `bad achievement ${a.id}`);
    assert.equal(typeof a.reward, 'number');
    assert.ok(a.reward >= 0, `achievement ${a.id} reward must be >= 0`);
    assert.equal(typeof a.check, 'function');
    // check must tolerate an empty/omitted context without throwing
    assert.doesNotThrow(() => a.check({}));
    assert.equal(typeof isAchievementEarned(a, {}), 'boolean');
  }
});

test('commendation ids are unique and indexed in ACHIEVEMENT_BY_ID', () => {
  const ids = ACHIEVEMENTS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const a of ACHIEVEMENTS) assert.equal(ACHIEVEMENT_BY_ID[a.id], a);
});

test('isAchievementEarned is defensive against throwing checks', () => {
  const bomb = { id: 'x', check: () => { throw new Error('boom'); } };
  assert.equal(isAchievementEarned(bomb, {}), false);
});

test('evaluateAchievements returns only newly-satisfied, not-yet-owned commendations', () => {
  const ctx = { runs: 1, kills: 150, time: 320 };
  const fresh = evaluateAchievements([], ctx).map((d) => d.id);
  assert.ok(fresh.includes('first_launch'));
  assert.ok(fresh.includes('centurion'));
  assert.ok(fresh.includes('survive_5'));
  assert.ok(!fresh.includes('survive_10'), 'should not unlock a 10-min award at 320s');
  // already-owned ids are skipped
  const fresh2 = evaluateAchievements(['first_launch', 'centurion'], ctx).map((d) => d.id);
  assert.ok(!fresh2.includes('first_launch'));
  assert.ok(!fresh2.includes('centurion'));
  assert.ok(fresh2.includes('survive_5'));
});

test('evaluateAchievements does not mutate the owned list', () => {
  const owned = ['first_launch'];
  evaluateAchievements(owned, { runs: 1, kills: 999, time: 9999 });
  assert.deepEqual(owned, ['first_launch']);
});

test('fleet_admiral needs every ship unlocked', () => {
  const def = ACHIEVEMENT_BY_ID.fleet_admiral;
  assert.equal(isAchievementEarned(def, { shipsUnlocked: 3, shipsTotal: 6 }), false);
  assert.equal(isAchievementEarned(def, { shipsUnlocked: 6, shipsTotal: 6 }), true);
  assert.equal(isAchievementEarned(def, {}), false, 'no data => not earned');
});

test('directive-count commendations scale with active directives', () => {
  assert.equal(isAchievementEarned(ACHIEVEMENT_BY_ID.daredevil, { directives: 2 }), true);
  assert.equal(isAchievementEarned(ACHIEVEMENT_BY_ID.daredevil, { directives: 1 }), false);
  assert.equal(isAchievementEarned(ACHIEVEMENT_BY_ID.defiant, { directives: 4 }), true);
  assert.equal(isAchievementEarned(ACHIEVEMENT_BY_ID.defiant, { directives: 3 }), false);
});

test('totalAchievementReward sums rewards', () => {
  assert.equal(totalAchievementReward([]), 0);
  const some = ACHIEVEMENTS.slice(0, 3);
  const expected = some.reduce((s, d) => s + d.reward, 0);
  assert.equal(totalAchievementReward(some), expected);
});

test('content-pack commendations unlock at their milestone thresholds', () => {
  const cases = [
    ['survive_20', { time: 1200 }, { time: 1199 }],
    ['ascendant_30', { level: 30 }, { level: 29 }],
    ['scorer_250k', { score: 250000 }, { score: 249999 }],
    ['chain_reactor', { reactions: 120 }, { reactions: 119 }],
    ['boss_rush', { bossKills: 5 }, { bossKills: 4 }],
    ['slayer_50k', { totalKills: 50000 }, { totalKills: 49999 }],
  ];
  for (const [id, hit, miss] of cases) {
    const def = ACHIEVEMENT_BY_ID[id];
    assert.ok(def, `commendation ${id} should exist`);
    assert.equal(isAchievementEarned(def, hit), true, `${id} should unlock at threshold`);
    assert.equal(isAchievementEarned(def, miss), false, `${id} should stay locked below threshold`);
    assert.equal(isAchievementEarned(def, {}), false, `${id} needs data`);
  }
});
