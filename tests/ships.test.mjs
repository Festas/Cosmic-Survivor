import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHIPS, SHIP_BY_ID, DEFAULT_SHIP_ID, shipById, isShipUnlocked,
} from '../src/game/ships.js';
import { WEAPON_BY_ID } from '../src/game/weapons.js';
import { createStats } from '../src/game/player.js';

test('every ship has the required fields and a callable apply()', () => {
  for (const sh of SHIPS) {
    assert.ok(sh.id && sh.name && sh.icon && sh.tag && sh.desc, `bad ship ${sh.id}`);
    assert.equal(typeof sh.apply, 'function');
    assert.ok(typeof sh.unlockCost === 'number' && sh.unlockCost >= 0);
    assert.ok(sh.color, `ship ${sh.id} needs a color`);
  }
});

test('ship starting weapons reference real, non-evolved weapons', () => {
  for (const sh of SHIPS) {
    const def = WEAPON_BY_ID[sh.weapon];
    assert.ok(def, `ship ${sh.id} references unknown weapon ${sh.weapon}`);
    assert.ok(!def.evolved, `ship ${sh.id} cannot start with evolved weapon ${sh.weapon}`);
  }
});

test('ship ids are unique and indexed in SHIP_BY_ID', () => {
  const ids = SHIPS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const sh of SHIPS) assert.equal(SHIP_BY_ID[sh.id], sh);
});

test('the default ship exists and is free', () => {
  const def = SHIP_BY_ID[DEFAULT_SHIP_ID];
  assert.ok(def, 'default ship must exist');
  assert.equal(def.unlockCost, 0, 'default ship must be free');
});

test('shipById falls back to the default for unknown ids', () => {
  assert.equal(shipById('does-not-exist'), SHIP_BY_ID[DEFAULT_SHIP_ID]);
  assert.equal(shipById('striker').id, 'striker');
});

test('apply() only mutates finite numeric stats (no NaN/undefined fields)', () => {
  for (const sh of SHIPS) {
    const s = createStats();
    sh.apply(s);
    for (const [k, v] of Object.entries(s)) {
      if (typeof v === 'number') assert.ok(Number.isFinite(v), `ship ${sh.id} made ${k} non-finite`);
    }
    assert.ok(s.maxHp >= 1 || sh.id === DEFAULT_SHIP_ID, `ship ${sh.id} maxHp too low: ${s.maxHp}`);
    // imbue sub-values stay within [0,1]
    for (const [k, v] of Object.entries(s.imbue)) {
      assert.ok(v >= 0 && v <= 1, `ship ${sh.id} imbue.${k} out of range: ${v}`);
    }
  }
});

test('ship identities differ from the baseline where intended', () => {
  const base = createStats();
  const striker = createStats(); SHIP_BY_ID.striker.apply(striker);
  assert.ok(striker.weaponDamageMul > base.weaponDamageMul);
  assert.ok(striker.maxHp < base.maxHp, 'striker trades HP for power');

  const jug = createStats(); SHIP_BY_ID.juggernaut.apply(jug);
  assert.ok(jug.maxHp > base.maxHp && jug.moveSpeed < base.moveSpeed);
});

test('isShipUnlocked treats free ships and owned ids as unlocked', () => {
  assert.ok(isShipUnlocked(SHIP_BY_ID.vanguard, []), 'free ship always unlocked');
  assert.ok(!isShipUnlocked(SHIP_BY_ID.striker, []), 'paid ship locked by default');
  assert.ok(isShipUnlocked(SHIP_BY_ID.striker, ['striker']), 'owned ship unlocked');
});

test('Frostbite is a cryo bruiser that opens with the Hailstorm', () => {
  const frost = SHIP_BY_ID.frostbite;
  assert.ok(frost, 'frostbite ship should exist');
  assert.equal(frost.weapon, 'hail');
  assert.ok(WEAPON_BY_ID.hail && !WEAPON_BY_ID.hail.evolved, 'hail must be a real base weapon');
  const base = createStats();
  const s = createStats(); frost.apply(s);
  assert.ok(s.imbue.cryo > base.imbue.cryo, 'frostbite imbues Cryo');
  assert.ok(s.maxHp > base.maxHp, 'frostbite is tankier');
  assert.ok(s.moveSpeed < base.moveSpeed, 'frostbite trades speed for bulk');
  assert.ok(s.elementMul > base.elementMul, 'frostbite boosts elemental power');
});
