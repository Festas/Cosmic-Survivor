import test from 'node:test';
import assert from 'node:assert/strict';
import {
  spawnInterval, enemyCap, hpScale, speedScale, xpForLevel, comboMultiplier,
  COMBO, ARENA,
} from '../src/game/config.js';

test('spawnInterval decreases over time (ramps difficulty)', () => {
  assert.ok(spawnInterval(120) < spawnInterval(0));
});

test('spawnInterval stays positive', () => {
  for (const t of [0, 30, 60, 120, 300, 600]) {
    assert.ok(spawnInterval(t) > 0);
  }
});

test('enemyCap grows with time and is an integer', () => {
  assert.ok(enemyCap(300) > enemyCap(0));
  for (const t of [0, 60, 180, 600]) {
    assert.ok(Number.isInteger(enemyCap(t)));
  }
});

test('hpScale and speedScale are >= 1 and non-decreasing', () => {
  assert.ok(hpScale(0) >= 1);
  assert.ok(speedScale(0) >= 1);
  assert.ok(hpScale(300) >= hpScale(0));
  assert.ok(speedScale(300) >= speedScale(0));
});

test('xpForLevel increases every level', () => {
  let prev = 0;
  for (let lvl = 1; lvl <= 20; lvl++) {
    const need = xpForLevel(lvl);
    assert.ok(need > 0);
    assert.ok(need >= prev);
    prev = need;
  }
});

test('comboMultiplier starts at 1 and steps up', () => {
  assert.equal(comboMultiplier(0), 1);
  assert.ok(comboMultiplier(COMBO.step) > 1);
  assert.ok(comboMultiplier(10_000) <= COMBO.max);
});

test('arena has sane dimensions', () => {
  assert.ok(ARENA.w > 0 && ARENA.h > 0);
});
