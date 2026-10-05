import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPONS, WEAPON_BY_ID, BASE_WEAPONS, MAX_WEAPONS,
  createWeaponInst, weaponDef, hasWeapon, canTakeWeapon,
  addOrLevelWeapon, evolutionReady, evolveWeapon, cdOf,
} from '../src/game/weapons.js';

function mockStats(overrides = {}) {
  return {
    damage: 10, weaponDamageMul: 1, transientDamageMul: 1, cooldownMul: 1,
    critChance: 0, critMult: 2, projectilesBonus: 0, pierce: 0, areaMul: 1,
    homing: 0, explosiveChance: 0, imbue: { fire: 0, cryo: 0, shock: 0, void: 0 },
    ...overrides,
  };
}

function mockPlayer(ids = ['ion'], statOverrides = {}) {
  return { weapons: ids.map(createWeaponInst), stats: mockStats(statOverrides) };
}

test('every weapon def has the required fields and a fire()', () => {
  for (const w of WEAPONS) {
    assert.ok(w.id && w.name && w.icon && w.desc, `incomplete weapon ${w.id}`);
    assert.ok(typeof w.fire === 'function', `weapon ${w.id} needs fire()`);
    assert.ok(w.baseCd > 0, `weapon ${w.id} needs a positive baseCd`);
    assert.ok(w.maxLevel >= 1);
  }
});

test('weapon ids are unique and indexed', () => {
  const ids = WEAPONS.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const w of WEAPONS) assert.equal(WEAPON_BY_ID[w.id], w);
});

test('BASE_WEAPONS excludes evolved forms; evolutions reference valid base targets', () => {
  for (const w of BASE_WEAPONS) assert.ok(!w.evolved, `${w.id} should not be evolved`);
  for (const w of WEAPONS) {
    if (w.evolve) {
      const evo = WEAPON_BY_ID[w.evolve];
      assert.ok(evo, `${w.id} evolves into unknown ${w.evolve}`);
      assert.ok(evo.evolved, `${w.evolve} should be flagged evolved`);
    }
  }
});

test('createWeaponInst produces a fresh level-1 instance', () => {
  const inst = createWeaponInst('ion');
  assert.deepEqual(inst, { id: 'ion', level: 1, cd: 0, phase: 0 });
  assert.equal(weaponDef(inst), WEAPON_BY_ID.ion);
  assert.equal(weaponDef('ion'), WEAPON_BY_ID.ion);
});

test('addOrLevelWeapon adds new weapons then levels them, capping at maxLevel', () => {
  const p = mockPlayer(['ion']);
  assert.ok(hasWeapon(p, 'ion'));
  assert.ok(!hasWeapon(p, 'spread'));
  addOrLevelWeapon(p, 'spread');
  assert.ok(hasWeapon(p, 'spread'));
  assert.equal(p.weapons.length, 2);

  const ion = p.weapons.find((w) => w.id === 'ion');
  const def = weaponDef(ion);
  for (let i = 0; i < 20; i++) addOrLevelWeapon(p, 'ion');
  assert.equal(ion.level, def.maxLevel);
});

test('canTakeWeapon and addOrLevelWeapon respect MAX_WEAPONS', () => {
  const ids = BASE_WEAPONS.slice(0, MAX_WEAPONS).map((w) => w.id);
  const p = mockPlayer(ids);
  assert.ok(!canTakeWeapon(p));
  const spare = BASE_WEAPONS.find((w) => !ids.includes(w.id));
  const result = addOrLevelWeapon(p, spare.id);
  assert.equal(result, null);
  assert.equal(p.weapons.length, MAX_WEAPONS);
});

test('evolutionReady needs max level AND the required synergy stat', () => {
  const p = mockPlayer(['ion'], { homing: 0 });
  const ion = p.weapons[0];
  assert.ok(!evolutionReady(p, ion), 'not ready at level 1');
  ion.level = weaponDef(ion).maxLevel;
  assert.ok(!evolutionReady(p, ion), 'still not ready without homing');
  p.stats.homing = 2;
  assert.ok(evolutionReady(p, ion), 'ready once homing is owned');
});

test('evolveWeapon swaps the instance id to its evolved form and resets level', () => {
  const p = mockPlayer(['ion'], { homing: 2 });
  const ion = p.weapons[0];
  ion.level = weaponDef(ion).maxLevel;
  evolveWeapon(p, ion);
  assert.equal(ion.id, 'photon');
  assert.equal(ion.level, 1);
  assert.ok(weaponDef(ion).evolved);
});

test('each weapon fires without throwing against a stub world', () => {
  const calls = [];
  const rec = (name) => (...a) => { calls.push([name, ...a]); };
  const world = {
    spawnBullet: rec('spawnBullet'), muzzle: rec('muzzle'), ring: rec('ring'),
    drawBolt: rec('drawBolt'), chainLightning: rec('chainLightning'),
    explodeReaction: rec('explodeReaction'), damageEnemy: rec('damageEnemy'),
    shake: rec('shake'),
    damageEnemiesInRadius: rec('damageEnemiesInRadius'), miniPull: rec('miniPull'),
    densestCluster: () => ({ x: 120, y: 120 }),
    audio: { play() {} },
  };
  const player = {
    x: 100, y: 100, stats: mockStats({ homing: 1, explosiveChance: 0.3, areaMul: 1.3, imbue: { fire: 0, cryo: 0, shock: 1, void: 1 }, critChance: 0.3, pierce: 3, bulletSpeed: 600, spread: 0.12, knockback: 100 }),
    acquireTarget: () => ({ x: 160, y: 100, alive: true }),
  };
  for (const w of WEAPONS) {
    const inst = createWeaponInst(w.id);
    assert.doesNotThrow(() => w.fire(world, player, inst), `weapon ${w.id} threw`);
  }
});

test('cdOf shrinks with haste and respects the 0.04s floor after haste is applied', () => {
  const def = { baseCd: 1, lvlCd: 0.1 };
  const inst = { level: 1 };
  const s = { cooldownMul: 1 };
  // Level 1, no haste: just baseCd * cooldownMul.
  assert.equal(cdOf(s, def, inst), 1);
  // Transient haste halves cadence.
  assert.equal(cdOf(s, def, inst, 0.5), 0.5);
  // Per-level bonus reduces cadence (level 3 -> 20% cut).
  assert.ok(Math.abs(cdOf(s, def, { level: 3 }) - 0.8) < 1e-9);
  // Floor: even extreme haste never dips below 0.04 (clamp applied after haste).
  assert.equal(cdOf(s, def, inst, 0.001), 0.04);
});
