import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADES, RARITY, isAvailable, draftUpgrades } from '../src/game/upgrades.js';
import { makeRng } from '../src/engine/utils.js';

function mockPlayer(overrides = {}) {
  return {
    upgradeCounts: {},
    stats: {
      luck: 0,
      imbue: { fire: 0, cryo: 0, shock: 0, void: 0 },
      ...overrides,
    },
  };
}

test('every upgrade has required fields and a working apply()', () => {
  for (const u of UPGRADES) {
    assert.ok(u.id && u.name && u.desc && u.icon, `bad upgrade ${u.id}`);
    assert.ok(RARITY[u.rarity], `unknown rarity ${u.rarity}`);
    assert.ok(typeof u.apply === 'function');
    assert.ok(u.maxStacks >= 1);
  }
});

test('upgrade ids are unique', () => {
  const ids = UPGRADES.map((u) => u.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('draftUpgrades returns the requested number of distinct choices', () => {
  const r = makeRng(42);
  const choices = draftUpgrades(mockPlayer(), 3, r);
  assert.equal(choices.length, 3);
  const ids = choices.map((c) => c.id);
  assert.equal(new Set(ids).size, 3);
});

test('draftUpgrades is deterministic for a given seed', () => {
  const a = draftUpgrades(mockPlayer(), 3, makeRng(777)).map((c) => c.id);
  const b = draftUpgrades(mockPlayer(), 3, makeRng(777)).map((c) => c.id);
  assert.deepEqual(a, b);
});

test('isAvailable blocks upgrades that hit maxStacks', () => {
  const up = UPGRADES.find((u) => u.id === 'multishot'); // maxStacks: 6
  const p = mockPlayer();
  assert.ok(isAvailable(up, p));
  p.upgradeCounts[up.id] = up.maxStacks;
  assert.ok(!isAvailable(up, p));
});

test('resonance upgrade is gated behind owning an imbue', () => {
  const reson = UPGRADES.find((u) => u.id === 'resonance');
  assert.ok(reson.req, 'resonance should have a requirement');
  assert.ok(!isAvailable(reson, mockPlayer()));
  assert.ok(isAvailable(reson, mockPlayer({ imbue: { fire: 0.6, cryo: 0, shock: 0, void: 0 } })));
});

test('applying an upgrade mutates stats', () => {
  const dmg = UPGRADES.find((u) => u.id === 'damage');
  const stats = { damage: 10 };
  dmg.apply(stats);
  assert.ok(stats.damage > 10);
});

test('draft never exceeds the available pool', () => {
  const r = makeRng(3);
  const choices = draftUpgrades(mockPlayer(), 999, r);
  assert.ok(choices.length <= UPGRADES.length);
});
