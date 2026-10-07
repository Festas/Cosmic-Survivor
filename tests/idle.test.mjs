import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GENERATORS, GENERATOR_BY_ID, SPECIAL_UPGRADES, SPECIAL_BY_ID,
  createIdleState, generatorCost, generatorBulkCost, maxAffordable, baseRate,
  prestigeGain, prestigeMultiplier, mainBoostMultiplier, totalRate, offlineGain,
  OFFLINE_CAP_SECONDS, PRESTIGE_BASE, nebulaForRun, specialCost, canBuySpecial,
  applyIdleBonus, MILESTONE_STEP, MILESTONE_BONUS, milestonesReached,
  generatorMilestoneMultiplier, generatorMilestoneProgress,
  BASE_CLICK, CLICK_RATE_FRACTION, CLICK_UPGRADE, CLICK_POWER_STEP,
  clickPower, clickUpgradeCost, clickYield,
} from '../src/game/idle.js';
import { createMetaBonus } from '../src/game/meta.js';

test('createIdleState is a neutral, empty save', () => {
  const s = createIdleState();
  assert.equal(s.nebula, 0);
  assert.equal(s.lifetimeNebula, 0);
  assert.equal(s.cores, 0);
  assert.equal(s.lifetimeCores, 0);
  assert.equal(s.clickLevel, 0);
  assert.equal(baseRate(s.generators), 0);
  assert.equal(Object.keys(s.generators).length, 0);
  assert.equal(Object.keys(s.special).length, 0);
});

test('generators have required fields and are indexed', () => {
  assert.ok(GENERATORS.length >= 3);
  const ids = GENERATORS.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length, 'generator ids are unique');
  for (const g of GENERATORS) {
    assert.ok(g.id && g.name && g.icon && g.desc, `bad generator ${g.id}`);
    assert.ok(g.baseCost > 0 && g.rate > 0 && g.costGrowth > 1, `bad economy ${g.id}`);
    assert.equal(GENERATOR_BY_ID[g.id], g);
  }
});

test('generators ascend in both cost and rate', () => {
  for (let i = 1; i < GENERATORS.length; i++) {
    assert.ok(GENERATORS[i].baseCost > GENERATORS[i - 1].baseCost, 'cost ascends');
    assert.ok(GENERATORS[i].rate > GENERATORS[i - 1].rate, 'rate ascends');
  }
});

test('generatorCost grows geometrically with ownership', () => {
  const def = GENERATORS[0];
  assert.equal(generatorCost(def, 0), def.baseCost);
  assert.ok(generatorCost(def, 2) > generatorCost(def, 1));
  assert.ok(generatorCost(def, 1) > generatorCost(def, 0));
});

test('generatorBulkCost equals the sum of successive single costs', () => {
  const def = GENERATORS[1];
  const owned = 3;
  let sum = 0;
  for (let i = 0; i < 5; i++) sum += generatorCost(def, owned + i);
  // Allow 1 unit of rounding slack (bulk ceils once, singles ceil each).
  assert.ok(Math.abs(generatorBulkCost(def, owned, 5) - sum) <= 5);
  assert.equal(generatorBulkCost(def, owned, 0), 0);
});

test('maxAffordable buys as many as the budget allows and no more', () => {
  const def = GENERATORS[0];
  assert.equal(maxAffordable(def, 0, 0), 0);
  const n = maxAffordable(def, 0, 1000);
  assert.ok(n >= 1);
  assert.ok(generatorBulkCost(def, 0, n) <= 1000, 'affordable count fits the budget');
  assert.ok(generatorBulkCost(def, 0, n + 1) > 1000, 'one more would exceed it');
});

test('baseRate sums rate × owned across generators', () => {
  const gens = { [GENERATORS[0].id]: 3, [GENERATORS[1].id]: 2 };
  const expected = GENERATORS[0].rate * 3 + GENERATORS[1].rate * 2;
  assert.ok(Math.abs(baseRate(gens) - expected) < 1e-9);
  assert.equal(baseRate({ bogus: 5 }), 0, 'unknown ids are ignored');
  assert.equal(baseRate({ [GENERATORS[0].id]: -3 }), 0, 'negative ownership is ignored');
});

test('milestone multiplier steps up by MILESTONE_BONUS every MILESTONE_STEP units', () => {
  assert.ok(MILESTONE_STEP >= 1 && MILESTONE_BONUS > 0);
  assert.equal(milestonesReached(0), 0);
  assert.equal(milestonesReached(MILESTONE_STEP - 1), 0);
  assert.equal(milestonesReached(MILESTONE_STEP), 1);
  assert.equal(milestonesReached(MILESTONE_STEP * 3), 3);
  assert.equal(generatorMilestoneMultiplier(0), 1);
  assert.equal(generatorMilestoneMultiplier(MILESTONE_STEP - 1), 1, 'no bonus below the first milestone');
  assert.ok(Math.abs(generatorMilestoneMultiplier(MILESTONE_STEP) - (1 + MILESTONE_BONUS)) < 1e-9);
  assert.ok(Math.abs(generatorMilestoneMultiplier(MILESTONE_STEP * 4) - (1 + 4 * MILESTONE_BONUS)) < 1e-9);
  // Monotonic non-decreasing in ownership.
  let prev = 0;
  for (let owned = 0; owned <= MILESTONE_STEP * 5; owned += 7) {
    const m = generatorMilestoneMultiplier(owned);
    assert.ok(m >= prev, `multiplier monotonic at ${owned}`);
    prev = m;
  }
});

test('generatorMilestoneProgress reports a reachable next milestone', () => {
  const p0 = generatorMilestoneProgress(0);
  assert.equal(p0.reached, 0);
  assert.equal(p0.nextAt, MILESTONE_STEP);
  assert.equal(p0.remaining, MILESTONE_STEP);
  assert.ok(p0.nextMultiplier > p0.multiplier);
  // remaining is always within 1..MILESTONE_STEP, and nextAt is strictly ahead.
  for (let owned = 0; owned <= MILESTONE_STEP * 3 + 4; owned++) {
    const p = generatorMilestoneProgress(owned);
    assert.ok(p.remaining >= 1 && p.remaining <= MILESTONE_STEP, `remaining in range at ${owned}`);
    assert.ok(p.nextAt > owned, `nextAt ahead at ${owned}`);
  }
});

test('baseRate folds in the per-generator milestone multiplier', () => {
  const def = GENERATORS[0];
  // At exactly one milestone, output is rate × owned × (1 + MILESTONE_BONUS).
  const owned = MILESTONE_STEP;
  const expected = def.rate * owned * (1 + MILESTONE_BONUS);
  assert.ok(Math.abs(baseRate({ [def.id]: owned }) - expected) < 1e-9);
  // More of the same generator earns strictly more than a milestone-free sum.
  assert.ok(baseRate({ [def.id]: owned }) > def.rate * owned);
});

test('prestigeGain follows a cube-root curve and is zero below threshold', () => {
  assert.equal(prestigeGain(0), 0);
  assert.equal(prestigeGain(PRESTIGE_BASE - 1), 0);
  assert.equal(prestigeGain(PRESTIGE_BASE), 1);
  assert.equal(prestigeGain(PRESTIGE_BASE * 8), 2);
  assert.equal(prestigeGain(PRESTIGE_BASE * 27), 3);
  // Monotonic non-decreasing in lifetime Nebula.
  let prev = 0;
  for (const n of [0, 1e5, 1e6, 1e7, 1e8, 1e9]) {
    const g = prestigeGain(n);
    assert.ok(g >= prev, `prestigeGain monotonic at ${n}`);
    prev = g;
  }
});

test('prestigeMultiplier rewards lifetime cores and is neutral at zero', () => {
  assert.equal(prestigeMultiplier(0), 1);
  assert.ok(prestigeMultiplier(10) > prestigeMultiplier(0));
  assert.ok(Math.abs(prestigeMultiplier(10) - 1.3) < 1e-9); // 1 + 10*0.03
});

test('mainBoostMultiplier is >= 1 and increases with run progress', () => {
  assert.equal(mainBoostMultiplier(), 1);
  assert.equal(mainBoostMultiplier({}), 1);
  const base = mainBoostMultiplier({ lifetimeStardust: 0, bestLevel: 0, bossKillsTotal: 0 });
  assert.equal(base, 1);
  const more = mainBoostMultiplier({ lifetimeStardust: 10000, bestLevel: 50, bossKillsTotal: 20 });
  assert.ok(more > 1.3, `expected a meaningful boost, got ${more}`);
  // Each dimension only ever helps (never drops below 1).
  assert.ok(mainBoostMultiplier({ lifetimeStardust: 1 }) >= 1);
  assert.ok(mainBoostMultiplier({ bestLevel: 1 }) >= 1);
  assert.ok(mainBoostMultiplier({ bossKillsTotal: 1 }) >= 1);
});

test('totalRate multiplies generators, prestige and main-boost together', () => {
  const s = createIdleState();
  s.generators[GENERATORS[0].id] = 10; // 10 × 0.1 = 1 Nebula/s base
  s.lifetimeCores = 10;                // ×1.3
  const profile = { lifetimeStardust: 0, bestLevel: 0, bossKillsTotal: 0 }; // ×1
  const expected = baseRate(s.generators) * prestigeMultiplier(10) * 1;
  assert.ok(Math.abs(totalRate(s, profile) - expected) < 1e-9);
  // No generators ⇒ no production regardless of multipliers.
  assert.equal(totalRate(createIdleState(), { lifetimeStardust: 1e9 }), 0);
});

test('offlineGain scales with time and is clamped to the cap', () => {
  assert.equal(offlineGain(2, 100), 200);
  assert.equal(offlineGain(0, 100), 0);
  assert.equal(offlineGain(5, -10), 0, 'negative elapsed yields nothing');
  assert.equal(offlineGain(1, OFFLINE_CAP_SECONDS * 10), OFFLINE_CAP_SECONDS, 'clamped to the cap');
});

test('nebulaForRun is non-negative, integer, deterministic and rewards bigger runs', () => {
  const small = nebulaForRun({ score: 1000, time: 60, kills: 50, level: 5 });
  const big = nebulaForRun({ score: 50000, time: 600, kills: 800, level: 30, bossKills: 6 });
  assert.ok(small >= 0 && Number.isInteger(small));
  assert.ok(big > small);
  assert.equal(nebulaForRun({ score: 1000, time: 60, kills: 50, level: 5 }), small);
  assert.equal(nebulaForRun(), 0);
});

test('catalog includes the new high-tier generators and Core upgrades', () => {
  for (const id of ['warpforge', 'quasar']) {
    assert.ok(GENERATOR_BY_ID[id], `generator ${id} is registered`);
  }
  for (const id of ['chrono_capacitor', 'magnetic_lattice']) {
    const def = SPECIAL_BY_ID[id];
    assert.ok(def, `core upgrade ${id} is registered`);
    // apply() must touch a real meta-bonus field (leave the object changed).
    const bonus = applyIdleBonus(createMetaBonus(), { [id]: def.max });
    assert.notDeepEqual(bonus, createMetaBonus(), `${id} applies a bonus`);
  }
});

test('special upgrades have required fields, a working apply(), and are indexed', () => {
  assert.ok(SPECIAL_UPGRADES.length >= 3);
  const ids = SPECIAL_UPGRADES.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const x of SPECIAL_UPGRADES) {
    assert.ok(x.id && x.name && x.icon && x.desc, `bad special ${x.id}`);
    assert.ok(x.max >= 1 && x.baseCost > 0 && x.costGrowth > 1, `bad economy ${x.id}`);
    assert.equal(typeof x.apply, 'function');
    assert.equal(SPECIAL_BY_ID[x.id], x);
    const bonus = createMetaBonus();
    assert.doesNotThrow(() => x.apply(bonus, x.max));
    if (x.effect) assert.equal(typeof x.effect(1), 'string');
  }
});

test('specialCost grows geometrically and canBuySpecial respects cost + cap', () => {
  const def = SPECIAL_BY_ID.siege_overdrive;
  assert.equal(specialCost(def, 0), def.baseCost);
  assert.ok(specialCost(def, 2) > specialCost(def, 1));
  assert.ok(!canBuySpecial(def, {}, 0), 'cannot buy with no cores');
  assert.ok(canBuySpecial(def, {}, specialCost(def, 0)), 'can buy when affordable');
  assert.ok(!canBuySpecial(def, { [def.id]: def.max }, 1e9), 'cannot exceed max level');
});

test('applyIdleBonus folds owned special levels into a meta-style bonus', () => {
  const b = applyIdleBonus(createMetaBonus(), { siege_overdrive: 5, aegis_core: 2 });
  assert.ok(Math.abs(b.damageMul - 1.4) < 1e-9); // 1 + 0.08*5
  assert.equal(b.maxHpAdd, 60); // 30 * 2
  // Neutral when empty; clamps unknown/overflow levels like computeMetaBonus.
  assert.deepEqual(applyIdleBonus(createMetaBonus(), {}), createMetaBonus());
  const clamped = applyIdleBonus(createMetaBonus(), { aegis_core: 999, bogus: 3 });
  assert.equal(clamped.maxHpAdd, 30 * SPECIAL_BY_ID.aegis_core.max);
});

// ---- Manual mining (the Cookie-Clicker "big cookie") ----------------------

test('manual-mining constants are sane', () => {
  assert.ok(BASE_CLICK >= 1, 'a bare tap always mints at least 1');
  assert.ok(CLICK_RATE_FRACTION > 0 && CLICK_RATE_FRACTION < 1);
  assert.equal(CLICK_POWER_STEP, CLICK_UPGRADE.power);
  assert.ok(CLICK_UPGRADE.id && CLICK_UPGRADE.name && CLICK_UPGRADE.icon && CLICK_UPGRADE.desc);
  assert.ok(CLICK_UPGRADE.baseCost > 0 && CLICK_UPGRADE.costGrowth > 1 && CLICK_UPGRADE.power > 0);
});

test('clickPower is BASE_CLICK plus a flat step per level', () => {
  assert.equal(clickPower(0), BASE_CLICK);
  assert.equal(clickPower(1), BASE_CLICK + CLICK_POWER_STEP);
  assert.equal(clickPower(5), BASE_CLICK + CLICK_POWER_STEP * 5);
  assert.equal(clickPower(-3), BASE_CLICK, 'negative levels clamp to zero');
  assert.equal(clickPower(2.9), BASE_CLICK + CLICK_POWER_STEP * 2, 'fractional levels floor');
});

test('clickUpgradeCost grows geometrically from the base cost', () => {
  assert.equal(clickUpgradeCost(0), CLICK_UPGRADE.baseCost);
  assert.ok(clickUpgradeCost(1) > clickUpgradeCost(0));
  assert.ok(clickUpgradeCost(3) > clickUpgradeCost(2));
  assert.equal(
    clickUpgradeCost(2),
    Math.ceil(CLICK_UPGRADE.baseCost * Math.pow(CLICK_UPGRADE.costGrowth, 2)),
  );
});

test('clickYield never drops below BASE_CLICK, even on a pristine Station', () => {
  const s = createIdleState();
  assert.ok(clickYield(s, {}) >= BASE_CLICK);
  // With no generators and no upgrades the yield is exactly the floor.
  assert.equal(clickYield(s, {}), BASE_CLICK);
});

test('clickYield scales with the Mining Laser level', () => {
  const s = createIdleState();
  s.clickLevel = 4;
  // No production yet, so the whole yield comes from click power.
  assert.equal(clickYield(s, {}), clickPower(4));
  assert.ok(clickYield(s, {}) > BASE_CLICK);
});

test('clickYield folds in a slice of live production', () => {
  const s = createIdleState();
  const g0 = GENERATORS[0];
  s.generators[g0.id] = 50; // meaningful passive rate
  const rate = totalRate(s, {});
  assert.ok(rate > 0);
  const expected = clickPower(0) + rate * CLICK_RATE_FRACTION;
  assert.ok(Math.abs(clickYield(s, {}) - expected) < 1e-9);
  assert.ok(clickYield(s, {}) > BASE_CLICK, 'a producing Station out-taps the floor');
});

test('clickYield rides the same Prestige multiplier as production', () => {
  const base = createIdleState();
  base.clickLevel = 3;
  const prestiged = createIdleState();
  prestiged.clickLevel = 3;
  prestiged.lifetimeCores = 25; // boosts prestigeMultiplier above 1
  assert.ok(prestigeMultiplier(prestiged.lifetimeCores) > 1);
  assert.ok(clickYield(prestiged, {}) > clickYield(base, {}));
});
