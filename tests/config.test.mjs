import test from 'node:test';
import assert from 'node:assert/strict';
import {
  spawnInterval, enemyCap, hpScale, speedScale, xpForLevel, comboMultiplier, eliteChance,
  waveDuration, waveHyperScale, waveSpeedHyper, bossWaveScale, isBossWave, isEliteWave,
  COMBO, ARENA, ELITE, WAVE,
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

test('eliteChance is zero before unlock, then ramps and is clamped', () => {
  // No elites until the unlock gate.
  assert.equal(eliteChance(0), 0);
  assert.equal(eliteChance(ELITE.unlock - 1), 0);
  // Opens at the unlock boundary.
  assert.ok(eliteChance(ELITE.unlock) > 0);
  // Non-decreasing as the run goes on.
  assert.ok(eliteChance(600) >= eliteChance(120));
  // Always a probability, never exceeding the configured cap.
  for (const t of [0, 75, 120, 300, 600, 3600]) {
    const c = eliteChance(t);
    assert.ok(c >= 0 && c <= 1);
    assert.ok(c <= ELITE.chanceMax + 1e-9);
  }
  // Reaches the cap eventually.
  assert.ok(Math.abs(eliteChance(1e6) - ELITE.chanceMax) < 1e-9);
});

// ---- wave scaling ---------------------------------------------------------

test('waveDuration eases from the base down to the floor and never inverts', () => {
  assert.equal(waveDuration(1), WAVE.duration);
  // Monotonically non-increasing across the ramp.
  let prev = Infinity;
  for (let w = 1; w <= WAVE.rampWaves + 20; w++) {
    const d = waveDuration(w);
    assert.ok(d <= prev + 1e-9, `waveDuration should not increase at wave ${w}`);
    assert.ok(d >= WAVE.durationMin - 1e-9, `waveDuration floor breached at wave ${w}`);
    prev = d;
  }
  // Clamped to the floor once the ramp completes.
  assert.ok(Math.abs(waveDuration(WAVE.rampWaves + 1) - WAVE.durationMin) < 1e-9);
});

test('waveHyperScale is exactly 1 through wave 100, then grows exponentially', () => {
  for (const w of [1, 10, 50, 99, WAVE.hyperStart]) {
    assert.equal(waveHyperScale(w), 1, `wave ${w} should be pre-hyper`);
  }
  assert.ok(waveHyperScale(WAVE.hyperStart + 1) > 1);
  // Strictly increasing in the endless tier.
  assert.ok(waveHyperScale(150) > waveHyperScale(120));
  assert.ok(waveHyperScale(200) > waveHyperScale(150));
  // Matches the configured geometric base one wave past the threshold.
  assert.ok(Math.abs(waveHyperScale(WAVE.hyperStart + 1) - WAVE.hyperBase) < 1e-9);
});

test('waveSpeedHyper is 1 pre-hyper and clamped to the configured max', () => {
  assert.equal(waveSpeedHyper(WAVE.hyperStart), 1);
  assert.ok(waveSpeedHyper(WAVE.hyperStart + 10) > 1);
  for (const w of [120, 400, 5000]) {
    assert.ok(waveSpeedHyper(w) <= WAVE.hyperSpeedMax + 1e-9, `speed hyper cap breached at wave ${w}`);
  }
  assert.equal(waveSpeedHyper(100000), WAVE.hyperSpeedMax);
});

test('bossWaveScale tracks the hyper scale (1 pre-100, exponential after)', () => {
  assert.equal(bossWaveScale(100), 1);
  assert.equal(bossWaveScale(200), waveHyperScale(200));
  assert.ok(bossWaveScale(200) > 1);
});

test('boss and elite wave cadence matches 10/20/… and 5/15/25/…', () => {
  const boss = [];
  const elite = [];
  for (let w = 1; w <= 30; w++) {
    if (isBossWave(w)) boss.push(w);
    if (isEliteWave(w)) elite.push(w);
    // A wave is never both a boss and an elite wave.
    assert.ok(!(isBossWave(w) && isEliteWave(w)), `wave ${w} cannot be both`);
  }
  assert.deepEqual(boss, [10, 20, 30]);
  assert.deepEqual(elite, [5, 15, 25]);
  assert.equal(isBossWave(0), false);
  assert.equal(isEliteWave(0), false);
});
