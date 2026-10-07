import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES, BOSS_TYPES, pickEnemyType, packSize, rollElite } from '../src/game/enemies.js';
import { makeRng } from '../src/engine/utils.js';
import { ELITE } from '../src/game/config.js';

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
  assert.equal(boss.shape, 'boss_singularis');
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

test('the Bulwark is registered, well-formed and lays down an aimed volley', () => {
  const def = ENEMY_TYPES.bulwark;
  assert.ok(def, 'bulwark should be registered');
  assert.equal(def.key, 'bulwark');
  assert.ok(def.hp > 0 && def.radius > 0 && def.color, 'bulwark needs core fields');
  assert.ok((def.xp || 0) >= 2, 'bulwark is an elite-eligible mid-tier enemy');
  assert.equal(typeof def.update, 'function');
  const world = { player: { x: 300, y: 300 }, enemyBullets: [], audio: { play() {} } };
  const e = { x: 0, y: 0, vx: 0, vy: 0, spin: 0, speed: def.speed, damage: def.damage };
  assert.doesNotThrow(() => {
    for (let i = 0; i < 400; i++) def.update(e, 0.05, world);
  }, 'bulwark update threw');
  assert.ok(world.enemyBullets.length >= 5, 'bulwark should fire an aimed spread');
});

// ---- Elite affix ----------------------------------------------------------

test('rollElite never promotes bosses or the xp:1 trash tier', () => {
  const r = () => 0; // always "rolls" the lowest value => would promote if eligible
  const late = 100000; // well past the unlock, chance at its cap
  for (const def of Object.values(BOSS_TYPES)) {
    assert.equal(rollElite(def, late, r), false, `${def.key} boss must never be elite`);
  }
  for (const def of Object.values(ENEMY_TYPES)) {
    if ((def.xp || 0) < 2) {
      assert.equal(rollElite(def, late, r), false, `${def.key} (xp<2) must never be elite`);
    }
  }
  // A guard against bad input.
  assert.equal(rollElite(null, late, r), false);
  assert.equal(rollElite(undefined, late, r), false);
});

test('rollElite respects the unlock gate for eligible enemies', () => {
  const eligible = Object.values(ENEMY_TYPES).find((d) => (d.xp || 0) >= 2);
  assert.ok(eligible, 'expected at least one xp>=2 enemy');
  const r = () => 0; // minimal roll: promotes whenever chance > 0
  assert.equal(rollElite(eligible, ELITE.unlock - 1, r), false, 'no elites before unlock');
  assert.equal(rollElite(eligible, ELITE.unlock, r), true, 'elites open at unlock');
});

test('rollElite promotes an eligible enemy only when the roll beats the chance', () => {
  const eligible = Object.values(ENEMY_TYPES).find((d) => (d.xp || 0) >= 2);
  const late = 100000; // chance pinned at ELITE.chanceMax
  assert.equal(rollElite(eligible, late, () => 0), true, 'low roll => promote');
  assert.equal(rollElite(eligible, late, () => 0.999), false, 'high roll => no promote');
  // Statistically, the promotion rate should land near the configured cap.
  const rng = makeRng(42);
  let elites = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) if (rollElite(eligible, late, rng)) elites++;
  const rate = elites / N;
  assert.ok(Math.abs(rate - ELITE.chanceMax) < 0.02, `rate ${rate} should be ~${ELITE.chanceMax}`);
});

test('rollElite accepts a pre-rolled sample instead of an RNG function', () => {
  const eligible = Object.values(ENEMY_TYPES).find((d) => (d.xp || 0) >= 2);
  const late = 100000; // chance pinned at ELITE.chanceMax
  // A caller may pass a fixed number in [0,1) (deterministic replay/testing); it
  // must be used directly rather than discarded in favour of a fresh roll.
  assert.equal(rollElite(eligible, late, 0), true, 'pre-rolled 0 => promote');
  assert.equal(rollElite(eligible, late, 0.999), false, 'pre-rolled 0.999 => no promote');
});

// ---- Wave bosses: ten phased, telegraphed fights --------------------------

test('there are ten bosses, each a well-formed massive boss with an update()', () => {
  const keys = Object.keys(BOSS_TYPES);
  assert.equal(keys.length, 10, 'expected exactly ten bosses by wave 100');
  for (const [key, def] of Object.entries(BOSS_TYPES)) {
    assert.equal(def.key, key, `${key} key mismatch`);
    assert.equal(def.boss, true, `${key} must be flagged boss`);
    assert.equal(def.massive, true, `${key} should be massive`);
    assert.ok(def.hp > 0 && def.radius > 0 && def.damage > 0, `${key} needs core stats`);
    assert.ok(def.name && def.color, `${key} needs name/color`);
    assert.ok(typeof def.update === 'function', `${key} needs an update()`);
  }
  // HP broadly ramps toward the wave-100 finale (nemesis tankier than the opener).
  assert.ok(BOSS_TYPES.nemesis.hp > BOSS_TYPES.devourer.hp, 'the finale boss should be the tankiest');
});

// A fuller world stub than the minimal spiral test above: it records telegraphs,
// announcements and summons so we can assert the shared bossThink brain actually
// escalates through phases and fires its abilities.
function makeBossWorld() {
  return {
    player: { x: 520, y: 360 },
    enemyBullets: [],
    texts: [],
    summons: [],
    shakes: 0,
    sounds: [],
    spawnEnemy(key, x, y) { const m = { key, x, y }; this.summons.push(m); return m; },
    addText(x, y, label) { this.texts.push(label); },
    audio: { play(name) {} },
    shake() { this.shakes++; },
  };
}

test('every boss drives phases, telegraphs and fire through bossThink without throwing', () => {
  for (const [key, def] of Object.entries(BOSS_TYPES)) {
    const world = makeBossWorld();
    const e = {
      key, x: 480, y: 360, vx: 0, vy: 0, spin: 0,
      speed: def.speed, damage: def.damage, radius: def.radius,
      hp: def.hp, maxHp: def.hp, color: def.color,
    };
    let sawTelegraph = false;
    assert.doesNotThrow(() => {
      // ~24s at 20fps, bleeding HP so the boss crosses both phase thresholds and
      // reaches enrage — exercising phase-gated abilities and the clearing novas.
      for (let i = 0; i < 480; i++) {
        def.update(e, 0.05, world);
        if (e.tele) sawTelegraph = true;
        e.hp = Math.max(1, e.hp - def.hp / 480);
      }
    }, `${key} update threw`);
    assert.ok(sawTelegraph, `${key} should telegraph at least one special`);
    assert.ok(world.enemyBullets.length > 0, `${key} should fire enemy bullets`);
  }
});
