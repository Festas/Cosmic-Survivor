import test from 'node:test';
import assert from 'node:assert/strict';
import {
  META_UPGRADES, META_BY_ID, createMetaBonus, computeMetaBonus,
  metaCost, canBuyMeta, stardustForRun,
} from '../src/game/meta.js';

test('every meta upgrade has required fields and a working apply()', () => {
  for (const m of META_UPGRADES) {
    assert.ok(m.id && m.name && m.icon && m.desc, `bad meta ${m.id}`);
    assert.ok(m.max >= 1, `meta ${m.id} needs a positive max`);
    assert.ok(m.baseCost > 0, `meta ${m.id} needs a positive baseCost`);
    assert.equal(typeof m.apply, 'function');
    const bonus = createMetaBonus();
    assert.doesNotThrow(() => m.apply(bonus, m.max));
    if (m.effect) assert.equal(typeof m.effect(1), 'string');
  }
});

test('meta ids are unique and indexed in META_BY_ID', () => {
  const ids = META_UPGRADES.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const m of META_UPGRADES) assert.equal(META_BY_ID[m.id], m);
});

test('createMetaBonus is neutral (multipliers 1, additive 0)', () => {
  const b = createMetaBonus();
  assert.equal(b.maxHpAdd, 0);
  assert.equal(b.damageMul, 1);
  assert.equal(b.moveSpeedMul, 1);
  assert.equal(b.hasteMul, 1);
  assert.equal(b.revives, 0);
  assert.equal(b.stardustMul, 1);
});

test('computeMetaBonus folds owned levels into the bonus', () => {
  const b = computeMetaBonus({ vitality: 3, power: 2 });
  assert.equal(b.maxHpAdd, 60); // 20 * 3
  assert.ok(Math.abs(b.damageMul - 1.12) < 1e-9); // 1 + 0.06*2
});

test('computeMetaBonus clamps levels to [0, max] and ignores unknowns', () => {
  const vit = META_BY_ID.vitality;
  const over = computeMetaBonus({ vitality: vit.max + 50, bogus: 9 });
  assert.equal(over.maxHpAdd, 20 * vit.max);
  const neg = computeMetaBonus({ vitality: -5 });
  assert.equal(neg.maxHpAdd, 0);
});

test('empty levels produce a neutral bonus', () => {
  assert.deepEqual(computeMetaBonus({}), createMetaBonus());
  assert.deepEqual(computeMetaBonus(), createMetaBonus());
});

test('metaCost grows geometrically with owned level', () => {
  const def = META_BY_ID.vitality;
  assert.equal(metaCost(def, 0), def.baseCost);
  assert.ok(metaCost(def, 2) > metaCost(def, 1));
  assert.ok(metaCost(def, 1) > metaCost(def, 0));
});

test('canBuyMeta respects affordability and the level cap', () => {
  const def = META_BY_ID.vitality;
  assert.ok(!canBuyMeta(def, {}, 0), 'cannot buy with no stardust');
  assert.ok(canBuyMeta(def, {}, metaCost(def, 0)), 'can buy when affordable');
  assert.ok(!canBuyMeta(def, { [def.id]: def.max }, 1e9), 'cannot exceed max level');
});

test('stardustForRun is non-negative, deterministic and rewards bigger runs', () => {
  const small = stardustForRun({ score: 1000, time: 60, kills: 50, level: 5 });
  const big = stardustForRun({ score: 50000, time: 600, kills: 800, level: 30, bossKills: 6 });
  assert.ok(small >= 0 && Number.isInteger(small));
  assert.ok(big > small);
  assert.equal(stardustForRun({ score: 1000, time: 60, kills: 50, level: 5 }), small);
  assert.equal(stardustForRun(), 0);
});

test('phoenix meta grants revives', () => {
  const b = computeMetaBonus({ phoenix: 1 });
  assert.equal(b.revives, 1);
});
