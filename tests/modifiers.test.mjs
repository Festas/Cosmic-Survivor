import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECTIVES, DIRECTIVE_BY_ID, createDirectiveEffect,
  computeDirectiveEffect, directiveStardustMultiplier,
} from '../src/game/modifiers.js';

test('every directive has required fields and a working apply()', () => {
  for (const d of DIRECTIVES) {
    assert.ok(d.id && d.name && d.icon && d.desc && d.risk, `bad directive ${d.id}`);
    assert.equal(typeof d.apply, 'function');
    assert.ok(d.stardustMul > 1, `directive ${d.id} must reward more than baseline`);
    const eff = createDirectiveEffect();
    assert.doesNotThrow(() => d.apply(eff));
  }
});

test('directive ids are unique and indexed in DIRECTIVE_BY_ID', () => {
  const ids = DIRECTIVES.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const d of DIRECTIVES) assert.equal(DIRECTIVE_BY_ID[d.id], d);
});

test('createDirectiveEffect is neutral (all multipliers 1)', () => {
  const e = createDirectiveEffect();
  for (const k of Object.keys(e)) assert.equal(e[k], 1, `${k} should start at 1`);
});

test('empty / unknown ids produce a neutral effect', () => {
  assert.deepEqual(computeDirectiveEffect([]), createDirectiveEffect());
  assert.deepEqual(computeDirectiveEffect(), createDirectiveEffect());
  assert.deepEqual(computeDirectiveEffect(['nope', 'bogus']), createDirectiveEffect());
});

test('a single directive applies its effect and reward multiplier', () => {
  const e = computeDirectiveEffect(['elite']);
  assert.ok(Math.abs(e.hpMul - 1.5) < 1e-9);
  assert.ok(Math.abs(e.stardustMul - 1.25) < 1e-9);
});

test('directives stack: stardust multipliers multiply together', () => {
  const e = computeDirectiveEffect(['elite', 'glass']);
  assert.ok(Math.abs(e.stardustMul - 1.25 * 1.3) < 1e-9);
  assert.ok(Math.abs(e.hpMul - 1.5) < 1e-9);
  assert.ok(Math.abs(e.dmgTakenMul - 1.5) < 1e-9);
});

test('duplicate ids are only applied once', () => {
  const once = computeDirectiveEffect(['elite']);
  const twice = computeDirectiveEffect(['elite', 'elite']);
  assert.deepEqual(twice, once);
});

test('frenzy shortens the spawn interval (spawnMul < 1) and widens the cap', () => {
  const e = computeDirectiveEffect(['frenzy']);
  assert.ok(e.spawnMul < 1);
  assert.ok(e.capMul > 1);
});

test('directiveStardustMultiplier matches the folded effect', () => {
  const ids = ['elite', 'frenzy', 'nightmare'];
  assert.equal(directiveStardustMultiplier(ids), computeDirectiveEffect(ids).stardustMul);
  assert.ok(directiveStardustMultiplier(ids) > 1);
});

test('effect fields are clamped to sane ranges', () => {
  const all = computeDirectiveEffect(DIRECTIVES.map((d) => d.id));
  assert.ok(all.hpMul <= 10 && all.hpMul >= 0.1);
  assert.ok(all.dmgTakenMul <= 6);
  assert.ok(all.xpMul >= 0.25);
  assert.ok(all.stardustMul >= 1 && all.stardustMul <= 20);
});

test('overwhelm floods the arena (more cap, faster spawns)', () => {
  const e = computeDirectiveEffect(['overwhelm']);
  assert.ok(e.capMul > 1, 'more concurrent enemies');
  assert.ok(e.spawnMul < 1, 'shorter spawn interval');
  assert.ok(e.stardustMul > 1);
});

test('juggernauts trade enemy speed for bulk', () => {
  const e = computeDirectiveEffect(['juggernauts']);
  assert.ok(e.hpMul > 1, 'tankier enemies');
  assert.ok(e.speedMul < 1, 'slower enemies');
  assert.ok(e.stardustMul > 1);
});
