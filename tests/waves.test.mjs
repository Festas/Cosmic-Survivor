import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEMES, themeIndexForWave, themeForWave, bossIndexForWave, bossKeyForWave, pickFromRoster,
} from '../src/game/waves.js';
import { ENEMY_TYPES, BOSS_TYPES } from '../src/game/enemies.js';
import { WAVE } from '../src/game/config.js';
import { makeRng } from '../src/engine/utils.js';

test('there are exactly ten themes, one per boss block', () => {
  assert.equal(THEMES.length, WAVE.bossCount);
  for (const t of THEMES) {
    assert.ok(t.id && t.name && t.boss, `${t.id} needs id/name/boss`);
    assert.ok(Array.isArray(t.roster) && t.roster.length, `${t.id} needs a roster`);
    assert.ok(t.bg && t.bg.bg0 && t.bg.bg1 && Array.isArray(t.bg.nebula) && t.bg.accent, `${t.id} needs a bg palette`);
  }
});

test('every roster key resolves to a registered enemy type', () => {
  for (const t of THEMES) {
    for (const [key, weight] of t.roster) {
      assert.ok(ENEMY_TYPES[key], `theme ${t.id} references unknown enemy ${key}`);
      assert.ok(weight > 0, `theme ${t.id} weight for ${key} must be positive`);
    }
  }
});

test('every theme boss resolves to a registered boss, in BOSS_TYPES order', () => {
  for (const t of THEMES) assert.ok(BOSS_TYPES[t.boss], `theme ${t.id} references unknown boss ${t.boss}`);
  // Theme order must match BOSS_TYPES definition order (world.js relies on this).
  assert.deepEqual(THEMES.map((t) => t.boss), Object.keys(BOSS_TYPES));
});

test('themeIndexForWave advances every ten waves and clamps to the last theme', () => {
  assert.equal(themeIndexForWave(1), 0);
  assert.equal(themeIndexForWave(10), 0);
  assert.equal(themeIndexForWave(11), 1);
  assert.equal(themeIndexForWave(20), 1);
  assert.equal(themeIndexForWave(91), 9);
  // Endless tier keeps reusing the final theme rather than running off the end.
  assert.equal(themeIndexForWave(100), 9);
  assert.equal(themeIndexForWave(500), 9);
  // Defensive clamp for non-positive input.
  assert.equal(themeIndexForWave(0), 0);
  assert.equal(themeIndexForWave(-5), 0);
});

test('themeForWave always returns a valid theme object', () => {
  for (const w of [1, 7, 10, 11, 55, 100, 137, 999]) {
    assert.ok(THEMES.includes(themeForWave(w)), `wave ${w} should map to a theme`);
  }
});

test('bossKeyForWave walks the ten bosses in order on the first hundred waves', () => {
  const expected = Object.keys(BOSS_TYPES);
  for (let i = 0; i < WAVE.bossCount; i++) {
    const wave = (i + 1) * WAVE.bossEvery; // 10, 20, …, 100
    assert.equal(bossIndexForWave(wave), i, `boss index at wave ${wave}`);
    assert.equal(bossKeyForWave(wave), expected[i], `boss key at wave ${wave}`);
  }
});

test('boss roster cycles past wave 100 (wave 110 repeats the first boss)', () => {
  assert.equal(bossKeyForWave(110), bossKeyForWave(10));
  assert.equal(bossKeyForWave(200), bossKeyForWave(100));
  assert.equal(bossKeyForWave(210), bossKeyForWave(10));
  // Always a real boss key, however far out we go.
  for (const w of [10, 120, 340, 1000]) assert.ok(BOSS_TYPES[bossKeyForWave(w)], `wave ${w}`);
});

test('pickFromRoster is deterministic for a given sample and always valid', () => {
  const theme = THEMES[1]; // azure: squid/crab/orbiter/spitter
  // A pre-rolled sample at 0 must select the first roster entry deterministically.
  assert.equal(pickFromRoster(theme, 0), theme.roster[0][0]);
  // A sample just under 1 lands on the last entry.
  assert.equal(pickFromRoster(theme, 0.999999), theme.roster[theme.roster.length - 1][0]);
  // With an RNG, every pick is a key that exists in the roster (and in ENEMY_TYPES).
  const rng = makeRng(3);
  const rosterKeys = new Set(theme.roster.map(([k]) => k));
  for (let i = 0; i < 500; i++) {
    const key = pickFromRoster(theme, rng);
    assert.ok(rosterKeys.has(key) && ENEMY_TYPES[key], `pick ${key} must be a roster enemy`);
  }
});

test('pickFromRoster falls back gracefully for an empty/missing roster', () => {
  assert.equal(pickFromRoster(null, 0), 'drone');
  assert.equal(pickFromRoster({ roster: [] }, 0.5), 'drone');
});
