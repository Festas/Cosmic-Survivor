import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ELEMENTS, ELEMENT_KEYS, REACTIONS, reactionKey, getReaction,
  createStatus, applyElement, tickStatus, dominantElement, hasAnyStatus,
} from '../src/game/elements.js';

test('reactionKey is order-independent', () => {
  assert.equal(reactionKey('fire', 'cryo'), reactionKey('cryo', 'fire'));
});

test('every element pair has a defined reaction', () => {
  for (let i = 0; i < ELEMENT_KEYS.length; i++) {
    for (let j = i + 1; j < ELEMENT_KEYS.length; j++) {
      const r = getReaction(ELEMENT_KEYS[i], ELEMENT_KEYS[j]);
      assert.ok(r, `missing reaction for ${ELEMENT_KEYS[i]}|${ELEMENT_KEYS[j]}`);
      assert.ok(r.name && r.type && r.damage > 0);
    }
  }
});

test('REACTIONS table has 6 combos (4 elements choose 2)', () => {
  assert.equal(Object.keys(REACTIONS).length, 6);
});

test('applying one element sets a duration, no reaction', () => {
  const s = createStatus();
  const r = applyElement(s, 'fire');
  assert.equal(r, null);
  assert.ok(s.fire > 0);
  assert.ok(hasAnyStatus(s));
});

test('applying a second different element triggers a reaction and consumes both', () => {
  const s = createStatus();
  applyElement(s, 'fire');
  const r = applyElement(s, 'cryo');
  assert.ok(r, 'expected a reaction descriptor');
  assert.equal(r.name, 'Shatter');
  assert.equal(s.fire, 0);
  assert.equal(s.cryo, 0);
});

test('reaction damage scales with power', () => {
  const s1 = createStatus(); applyElement(s1, 'fire');
  const base = applyElement(s1, 'shock');
  const s2 = createStatus(); applyElement(s2, 'fire');
  const boosted = applyElement(s2, 'shock', 2);
  assert.ok(boosted.damage > base.damage);
});

test('unknown element key is ignored', () => {
  const s = createStatus();
  assert.equal(applyElement(s, 'banana'), null);
  assert.ok(!hasAnyStatus(s));
});

test('tickStatus decays timers and reports effects', () => {
  const s = createStatus();
  applyElement(s, 'fire');
  const before = s.fire;
  const eff = tickStatus(s, 0.1);
  assert.ok(s.fire < before, 'fire should decay');
  assert.ok(eff.dot >= 0);
  assert.ok(typeof eff.slow === 'number');
});

test('cryo contributes a slow multiplier between 0 and 1', () => {
  const s = createStatus();
  applyElement(s, 'cryo');
  const eff = tickStatus(s, 0.016);
  assert.ok(eff.slow > 0 && eff.slow <= 1);
});

test('dominantElement returns the strongest active element', () => {
  const s = createStatus();
  s.fire = 1.0; s.shock = 2.0;
  assert.equal(dominantElement(s).key, 'shock');
  assert.equal(dominantElement(createStatus()), null);
});

test('ELEMENTS metadata is well-formed', () => {
  for (const k of ELEMENT_KEYS) {
    assert.ok(ELEMENTS[k], `missing element ${k}`);
    assert.ok(ELEMENTS[k].duration > 0);
    assert.ok(ELEMENTS[k].color);
  }
});
