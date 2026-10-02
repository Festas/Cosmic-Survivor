import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp, lerp, smoothstep, sign, approach, dist, angleTo, angleDiff,
  makeRng, randInt, weightedPick, shuffle, formatNumber, formatTime, TAU,
} from '../src/engine/utils.js';

test('clamp bounds values', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(42, 0, 10), 10);
});

test('lerp and smoothstep', () => {
  assert.equal(lerp(0, 10, 0.5), 5);
  assert.equal(lerp(10, 20, 0), 10);
  assert.equal(smoothstep(0), 0);
  assert.equal(smoothstep(1), 1);
  assert.ok(smoothstep(0.5) > 0.49 && smoothstep(0.5) < 0.51);
});

test('sign', () => {
  assert.equal(sign(-9), -1);
  assert.equal(sign(9), 1);
  assert.equal(sign(0), 0);
});

test('approach never overshoots', () => {
  assert.equal(approach(0, 10, 3), 3);
  assert.equal(approach(0, 2, 5), 2);
  assert.equal(approach(10, 0, 3), 7);
});

test('dist and angleTo', () => {
  assert.equal(dist(0, 0, 3, 4), 5);
  assert.ok(Math.abs(angleTo(0, 0, 1, 0)) < 1e-9);
  assert.ok(Math.abs(angleTo(0, 0, 0, 1) - Math.PI / 2) < 1e-9);
});

test('angleDiff wraps into [-PI, PI]', () => {
  assert.ok(Math.abs(angleDiff(0, TAU)) < 1e-9);
  assert.ok(angleDiff(0, Math.PI + 0.1) <= Math.PI);
});

test('makeRng is deterministic for a given seed', () => {
  const a = makeRng(12345);
  const b = makeRng(12345);
  const seqA = [a(), a(), a(), a()];
  const seqB = [b(), b(), b(), b()];
  assert.deepEqual(seqA, seqB);
  for (const v of seqA) assert.ok(v >= 0 && v < 1);
});

test('different seeds diverge', () => {
  const a = makeRng(1);
  const b = makeRng(2);
  assert.notEqual(a(), b());
});

test('randInt stays within inclusive range', () => {
  const r = makeRng(7);
  for (let i = 0; i < 500; i++) {
    const v = randInt(3, 6, r);
    assert.ok(v >= 3 && v <= 6 && Number.isInteger(v));
  }
});

test('weightedPick respects weight=0', () => {
  const r = makeRng(99);
  const items = [{ id: 'a', weight: 0 }, { id: 'b', weight: 1 }];
  for (let i = 0; i < 50; i++) {
    assert.equal(weightedPick(items, 'weight', r).id, 'b');
  }
});

test('shuffle preserves elements (deterministic with seed)', () => {
  const r = makeRng(5);
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input.slice(), r);
  assert.deepEqual([...out].sort((x, y) => x - y), input);
});

test('formatNumber abbreviates large values', () => {
  assert.equal(formatNumber(999), '999');
  assert.equal(formatNumber(1500), '1.5K');
  assert.ok(formatNumber(2_500_000).endsWith('M'));
});

test('formatTime formats mm:ss', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(600), '10:00');
});
