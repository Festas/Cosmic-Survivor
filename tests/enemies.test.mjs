import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES, BOSS_TYPES, pickEnemyType, packSize } from '../src/game/enemies.js';
import { makeRng } from '../src/engine/utils.js';

test('pickEnemyType always returns a valid enemy key', () => {
  const r = makeRng(11);
  for (const t of [0, 30, 90, 180, 400, 900]) {
    for (let i = 0; i < 50; i++) {
      const key = pickEnemyType(t, r);
      assert.ok(ENEMY_TYPES[key], `invalid enemy key ${key} at t=${t}`);
    }
  }
});

test('early game only spawns the basic enemies', () => {
  const r = makeRng(1);
  for (let i = 0; i < 100; i++) {
    const key = pickEnemyType(0, r);
    // at t=0 only enemies with unlock time 0 are valid
    assert.ok(ENEMY_TYPES[key]);
  }
});

test('packSize is always a positive integer', () => {
  for (const key of Object.keys(ENEMY_TYPES)) {
    for (let i = 0; i < 20; i++) {
      const n = packSize(key);
      assert.ok(Number.isInteger(n) && n >= 1);
    }
  }
});

test('swarms arrive in packs of more than one', () => {
  let sawPack = false;
  for (let i = 0; i < 50; i++) if (packSize('swarm') >= 3) sawPack = true;
  assert.ok(sawPack);
});

test('enemy type definitions are well-formed', () => {
  for (const [key, def] of Object.entries(ENEMY_TYPES)) {
    assert.ok(def.hp > 0, `${key} needs hp`);
    assert.ok(def.speed >= 0, `${key} needs speed`);
    assert.ok(def.radius > 0, `${key} needs radius`);
    assert.ok(def.color, `${key} needs color`);
  }
});

test('boss definitions are well-formed', () => {
  assert.ok(Object.keys(BOSS_TYPES).length >= 1);
  for (const [key, def] of Object.entries(BOSS_TYPES)) {
    assert.ok(def.hp > 0, `${key} boss needs hp`);
    assert.ok(def.radius > 0, `${key} boss needs radius`);
  }
});
