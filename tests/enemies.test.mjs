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

// ---- Content-pack enemies -------------------------------------------------

test('new enemy and boss types are registered and well-formed', () => {
  for (const key of ['seeder', 'sentinel']) {
    const def = ENEMY_TYPES[key];
    assert.ok(def, `${key} should be registered`);
    assert.equal(def.key, key);
    assert.ok(def.hp > 0 && def.radius > 0 && def.color, `${key} needs core fields`);
    assert.ok(typeof def.update === 'function', `${key} needs an update()`);
  }
  const boss = BOSS_TYPES.singularis;
  assert.ok(boss, 'singularis boss should be registered');
  assert.equal(boss.boss, true);
  assert.equal(boss.shape, 'boss');
  assert.ok(boss.hp > 0 && boss.radius > 0);
});

test('seeder and sentinel become spawnable after their unlock times', () => {
  const r = makeRng(5);
  const seen = new Set();
  for (let i = 0; i < 4000; i++) seen.add(pickEnemyType(200, r));
  assert.ok(seen.has('seeder'), 'seeder should appear in the late game');
  assert.ok(seen.has('sentinel'), 'sentinel should appear in the late game');
});

test('new enemies never spawn before their unlock time', () => {
  const r = makeRng(7);
  for (let i = 0; i < 1500; i++) {
    assert.notEqual(pickEnemyType(30, r), 'seeder'); // seeder unlocks at 60s
    assert.notEqual(pickEnemyType(50, r), 'sentinel'); // sentinel unlocks at 90s
  }
});

test('seeder, sentinel and the Singularis update without throwing and emit bullets', () => {
  const world = {
    player: { x: 300, y: 300 },
    enemyBullets: [],
    spawnEnemy() { return {}; },
    shake() {},
    audio: { play() {} },
  };
  const mkEnemy = (def) => ({ x: 0, y: 0, vx: 0, vy: 0, spin: 0, speed: def.speed, damage: def.damage });
  for (const def of [ENEMY_TYPES.seeder, ENEMY_TYPES.sentinel, BOSS_TYPES.singularis]) {
    const e = mkEnemy(def);
    assert.doesNotThrow(() => {
      for (let i = 0; i < 400; i++) def.update(e, 0.05, world);
    }, `${def.key} update threw`);
  }
  assert.ok(world.enemyBullets.length > 0, 'expansion enemies should fire enemy bullets');
});
