import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, ITEM_BY_ID, RARITY, isItemAvailable, isAvailable, draftUpgrades, luckFactor } from '../src/game/upgrades.js';
import { createWeaponInst, BASE_WEAPONS, MAX_WEAPONS } from '../src/game/weapons.js';
import { makeRng } from '../src/engine/utils.js';

function mockStats(overrides = {}) {
  return {
    luck: 0,
    imbue: { fire: 0, cryo: 0, shock: 0, void: 0 },
    weaponDamageMul: 1, cooldownMul: 1, projectilesBonus: 0, critChance: 0,
    critMult: 2, pierce: 0, projectileSpeedMul: 1, areaMul: 1, range: 400,
    homing: 0, bulletRadius: 6, knockback: 100, singularityChargeMul: 1,
    singularityRadiusMul: 1, singularityDamageMul: 1, elementMul: 1,
    dashCooldownMul: 1, dashDamageMul: 1, dashRadiusMul: 1,
    overdriveRate: 1, overdrivePower: 1, droneCount: 0,
    explosiveChance: 0, explosiveDamage: 0, maxHp: 100, armor: 0, regen: 0,
    lifesteal: 0, dodge: 0, moveSpeed: 200, pickupRadius: 100, xpMul: 1,
    ...overrides,
  };
}

function mockPlayer(overrides = {}) {
  const { weapons, banished, upgradeCounts, ...statOverrides } = overrides;
  return {
    upgradeCounts: upgradeCounts || {},
    banished: banished || Object.create(null),
    weapons: weapons || [createWeaponInst('ion')],
    stats: mockStats(statOverrides),
  };
}

test('every item has required fields and a working apply()', () => {
  for (const it of ITEMS) {
    assert.ok(it.id && it.name && it.desc && it.icon, `bad item ${it.id}`);
    assert.equal(it.kind, 'item');
    assert.ok(RARITY[it.rarity], `unknown rarity ${it.rarity}`);
    assert.ok(typeof it.apply === 'function');
    assert.ok(it.maxStacks >= 1);
  }
});

test('item ids are unique and indexed in ITEM_BY_ID', () => {
  const ids = ITEMS.map((u) => u.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const it of ITEMS) assert.equal(ITEM_BY_ID[it.id], it);
});

test('applying an item mutates stats', () => {
  const dmg = ITEM_BY_ID.damage;
  const stats = mockStats();
  dmg.apply(stats);
  assert.ok(stats.weaponDamageMul > 1);
});

test('isItemAvailable blocks items that hit maxStacks', () => {
  const it = ITEM_BY_ID.haste; // maxStacks 6
  const p = mockPlayer();
  assert.ok(isItemAvailable(it, p));
  p.upgradeCounts[it.id] = it.maxStacks;
  assert.ok(!isItemAvailable(it, p));
  assert.equal(isAvailable, isItemAvailable);
});

test('resonance item is gated behind owning an imbue', () => {
  const reson = ITEM_BY_ID.resonance;
  assert.ok(reson.req, 'resonance should have a requirement');
  assert.ok(!isItemAvailable(reson, mockPlayer()));
  assert.ok(isItemAvailable(reson, mockPlayer({ imbue: { fire: 0.6, cryo: 0, shock: 0, void: 0 } })));
});

test('draftUpgrades returns the requested number of distinct cards with valid kinds', () => {
  const choices = draftUpgrades(mockPlayer(), 3, makeRng(42));
  assert.equal(choices.length, 3);
  const ids = choices.map((c) => c.id);
  assert.equal(new Set(ids).size, 3);
  const kinds = new Set(['weapon-new', 'weapon-up', 'evolve', 'item']);
  for (const c of choices) {
    assert.ok(kinds.has(c.kind), `bad kind ${c.kind}`);
    assert.ok(c.id && c.name && c.icon, `incomplete card ${c.id}`);
  }
});

test('draftUpgrades is deterministic for a given seed', () => {
  const a = draftUpgrades(mockPlayer(), 3, makeRng(777)).map((c) => c.id);
  const b = draftUpgrades(mockPlayer(), 3, makeRng(777)).map((c) => c.id);
  assert.deepEqual(a, b);
});

test('a starter-only player can be offered new weapons and an upgrade to the starter', () => {
  const choices = draftUpgrades(mockPlayer(), 40, makeRng(5));
  assert.ok(choices.some((c) => c.kind === 'weapon-new'), 'should offer new weapons');
  assert.ok(choices.some((c) => c.kind === 'weapon-up' && c.weaponId === 'ion'), 'should offer leveling the starter');
});

test('banished cards never appear in the draft', () => {
  const banished = Object.create(null);
  banished.damage = true;
  banished.wnew_spread = true;
  const choices = draftUpgrades(mockPlayer({ banished }), 60, makeRng(9));
  assert.ok(!choices.some((c) => c.id === 'damage'));
  assert.ok(!choices.some((c) => c.id === 'wnew_spread'));
});

test('banishing a weapon-up card removes it from later drafts', () => {
  const banished = Object.create(null);
  banished.wup_ion = true;
  const choices = draftUpgrades(mockPlayer({ banished }), 60, makeRng(9));
  assert.ok(!choices.some((c) => c.id === 'wup_ion'), 'banished weapon-up must not reappear');
});

test('banishing an evolve card removes it from later drafts', () => {
  const ion = createWeaponInst('ion');
  ion.level = 8;
  const banished = Object.create(null);
  banished.evolve_ion = true;
  const choices = draftUpgrades(mockPlayer({ weapons: [ion], homing: 2, banished }), 60, makeRng(11));
  assert.ok(!choices.some((c) => c.id === 'evolve_ion'), 'banished evolve must not reappear');
});

test('an evolve card appears when a weapon is maxed and its synergy is owned', () => {
  const ion = createWeaponInst('ion');
  ion.level = 8;
  const choices = draftUpgrades(mockPlayer({ weapons: [ion], homing: 2 }), 60, makeRng(11));
  const evo = choices.find((c) => c.kind === 'evolve' && c.weaponId === 'ion');
  assert.ok(evo, 'evolve card should be offered');
  assert.equal(evo.rarity, 'legendary');
});

test('full inventory stops offering brand-new weapons', () => {
  const weapons = BASE_WEAPONS.slice(0, MAX_WEAPONS).map((w) => createWeaponInst(w.id));
  const choices = draftUpgrades(mockPlayer({ weapons }), 80, makeRng(3));
  assert.ok(!choices.some((c) => c.kind === 'weapon-new'));
});

test('luckFactor leaves odds untouched at luck 0 and boosts rarer tiers with luck', () => {
  // No luck: every tier unchanged, so the weighted draw is unaffected.
  for (const name of Object.keys(RARITY)) assert.equal(luckFactor(name, 0), 1);
  // With luck, commons are unchanged but rarer tiers scale up by rank.
  assert.equal(luckFactor('common', 0.6), 1);
  assert.ok(luckFactor('rare', 0.6) > 1);
  assert.ok(luckFactor('legendary', 0.6) > luckFactor('epic', 0.6));
  assert.ok(luckFactor('epic', 0.6) > luckFactor('rare', 0.6));
});

test('luck tilts the draft toward rarer cards in aggregate', () => {
  // Sum rarity ranks of drafted cards across many deterministic seeds; a lucky
  // player should pull a higher total rank than an unlucky one.
  const rankSum = (luck) => {
    let sum = 0;
    for (let seed = 0; seed < 200; seed++) {
      const choices = draftUpgrades(mockPlayer({ luck }), 3, makeRng(seed));
      for (const c of choices) sum += RARITY[c.rarity].rank;
    }
    return sum;
  };
  assert.ok(rankSum(0.6) > rankSum(0), 'lucky drafts should skew rarer');
});
