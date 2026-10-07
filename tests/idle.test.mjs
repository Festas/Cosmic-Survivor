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
  PRESTIGE_UPGRADES, PRESTIGE_BY_ID, prestigeUpgradeCost, canBuyPrestige,
  createPerkEffects, computePerks, prestigeCoreGain, collapseSeedNebula,
  offlineCapSeconds,
  SURGE_TYPES, SURGE_BY_ID, pickSurgeType, rollSurge,
  SURGE_MIN_INTERVAL, SURGE_MAX_INTERVAL, SURGE_LIFETIME,
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
  assert.equal(Object.keys(s.prestige).length, 0);
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

// ---- Singularity perk tree (the "sophisticated prestige" layer) -----------

test('prestige upgrades have required fields, a working apply(), and are indexed', () => {
  assert.ok(PRESTIGE_UPGRADES.length >= 4);
  const ids = PRESTIGE_UPGRADES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'perk ids are unique');
  for (const p of PRESTIGE_UPGRADES) {
    assert.ok(p.id && p.name && p.icon && p.desc, `bad perk ${p.id}`);
    assert.ok(p.max >= 1 && p.baseCost > 0 && p.costGrowth > 1, `bad economy ${p.id}`);
    assert.equal(typeof p.apply, 'function');
    assert.equal(PRESTIGE_BY_ID[p.id], p);
    // apply() must leave a real mark on a neutral effects accumulator.
    const fx = createPerkEffects();
    assert.doesNotThrow(() => p.apply(fx, p.max));
    assert.notDeepEqual(fx, createPerkEffects(), `${p.id} changes the effects`);
    if (p.effect) assert.equal(typeof p.effect(1), 'string');
  }
});

test('createPerkEffects is neutral and computePerks is empty-safe', () => {
  const n = createPerkEffects();
  assert.equal(n.prodMul, 1);
  assert.equal(n.clickMul, 1);
  assert.equal(n.costMul, 1);
  assert.equal(n.coreGainMul, 1);
  assert.equal(n.startNebulaFrac, 0);
  assert.equal(n.surgeChanceMul, 1);
  assert.equal(n.surgeRewardMul, 1);
  assert.equal(n.milestoneBonus, MILESTONE_BONUS);
  assert.equal(n.offlineCapSeconds, OFFLINE_CAP_SECONDS);
  assert.deepEqual(computePerks({}), createPerkEffects());
  assert.deepEqual(computePerks({ bogus: 9 }), createPerkEffects(), 'unknown ids ignored');
});

test('computePerks folds owned levels and clamps to each perk max', () => {
  const fx = computePerks({ resonant_core: 3 });
  assert.ok(Math.abs(fx.prodMul - 1.36) < 1e-9, '1 + 0.12*3');
  // Over-max levels clamp to the perk cap (no runaway from a stale save).
  const def = PRESTIGE_BY_ID.resonant_core;
  const capped = computePerks({ resonant_core: 999 });
  const atMax = computePerks({ resonant_core: def.max });
  assert.deepEqual(capped, atMax);
});

test('prestigeUpgradeCost grows geometrically and canBuyPrestige respects cost + cap', () => {
  const def = PRESTIGE_BY_ID.resonant_core;
  assert.equal(prestigeUpgradeCost(def, 0), def.baseCost);
  assert.ok(prestigeUpgradeCost(def, 2) > prestigeUpgradeCost(def, 1));
  assert.ok(!canBuyPrestige(def, {}, 0), 'cannot buy with no cores');
  assert.ok(canBuyPrestige(def, {}, prestigeUpgradeCost(def, 0)), 'can buy when affordable');
  assert.ok(!canBuyPrestige(def, { [def.id]: def.max }, 1e9), 'cannot exceed max level');
});

test('Resonant Core perk multiplies total production', () => {
  const s = createIdleState();
  s.generators[GENERATORS[0].id] = 10;
  const before = totalRate(s, {});
  s.prestige.resonant_core = 5; // ×(1 + 0.12*5) = ×1.6
  const after = totalRate(s, {});
  assert.ok(Math.abs(after - before * 1.6) < 1e-6, 'production scales with the perk');
});

test('Hardened Beam perk multiplies manual-tap yield', () => {
  const s = createIdleState();
  s.clickLevel = 4;
  const before = clickYield(s, {});
  s.prestige.hardened_beam = 2; // ×(1 + 0.35*2) = ×1.7
  const after = clickYield(s, {});
  assert.ok(Math.abs(after - before * 1.7) < 1e-6);
});

test('Mass Production perk discounts generator costs via costMul', () => {
  const def = GENERATORS[1];
  const fx = computePerks({ mass_production: 5 });
  assert.ok(fx.costMul < 1 && fx.costMul > 0);
  assert.ok(generatorCost(def, 10, fx.costMul) < generatorCost(def, 10));
  // Bulk cost and maxAffordable honour the same discount.
  assert.ok(generatorBulkCost(def, 0, 8, fx.costMul) < generatorBulkCost(def, 0, 8));
  assert.ok(maxAffordable(def, 0, 10000, fx.costMul) >= maxAffordable(def, 0, 10000));
  // A neutral (default) costMul leaves the classic numbers untouched.
  assert.equal(generatorCost(def, 0), def.baseCost);
  assert.equal(generatorCost(def, 0, 1), def.baseCost);
});

test('Milestone Mastery perk raises the per-milestone bonus in baseRate', () => {
  const def = GENERATORS[0];
  const gens = { [def.id]: MILESTONE_STEP }; // exactly one milestone
  const fx = computePerks({ milestone_mastery: 4 });
  assert.ok(fx.milestoneBonus > MILESTONE_BONUS);
  const expected = def.rate * MILESTONE_STEP * (1 + fx.milestoneBonus);
  assert.ok(Math.abs(baseRate(gens, fx.milestoneBonus) - expected) < 1e-9);
  assert.ok(baseRate(gens, fx.milestoneBonus) > baseRate(gens));
  // The progress helper reports the boosted next multiplier too.
  const p = generatorMilestoneProgress(MILESTONE_STEP, fx.milestoneBonus);
  assert.ok(Math.abs(p.multiplier - (1 + fx.milestoneBonus)) < 1e-9);
});

test('Temporal Buffer perk widens the offline cap', () => {
  assert.equal(offlineCapSeconds({}), OFFLINE_CAP_SECONDS);
  const longer = offlineCapSeconds({ temporal_buffer: 3 }); // +6h
  assert.equal(longer, OFFLINE_CAP_SECONDS + 3 * 2 * 3600);
  assert.ok(longer > OFFLINE_CAP_SECONDS);
});

test('Dense Singularity perk lifts Core gain without changing the base curve', () => {
  // Neutral: prestigeCoreGain matches prestigeGain exactly.
  for (const n of [0, PRESTIGE_BASE - 1, PRESTIGE_BASE, PRESTIGE_BASE * 27]) {
    assert.equal(prestigeCoreGain(n, {}), prestigeGain(n));
  }
  // Perked: strictly >= base, and never mints from a sub-threshold balance.
  assert.equal(prestigeCoreGain(PRESTIGE_BASE - 1, { dense_singularity: 6 }), 0);
  assert.ok(prestigeCoreGain(PRESTIGE_BASE * 27, { dense_singularity: 6 }) > prestigeGain(PRESTIGE_BASE * 27));
});

test('Collapse Memory perk seeds a capped fraction of lifetime Nebula', () => {
  assert.equal(collapseSeedNebula(1e8, {}), 0, 'no perk → cold restart');
  assert.equal(collapseSeedNebula(1e8, { collapse_memory: 5 }), Math.floor(1e8 * 0.30));
  // Levels clamp to the perk max (8 → 48%); the internal 0.8 guard just keeps a
  // stale save from ever exceeding a sane ceiling.
  const def = PRESTIGE_BY_ID.collapse_memory;
  const maxFrac = Math.min(0.8, 0.06 * def.max);
  assert.equal(collapseSeedNebula(1e8, { collapse_memory: 999 }), Math.floor(1e8 * maxFrac));
  assert.equal(collapseSeedNebula(1e8, { collapse_memory: def.max }), Math.floor(1e8 * maxFrac));
  assert.equal(collapseSeedNebula(0, { collapse_memory: 5 }), 0);
});

// ---- Nebula Surges (the RNG / golden-cookie layer) ------------------------

test('surge types are well-formed, indexed and have positive weights', () => {
  assert.ok(SURGE_TYPES.length >= 3);
  const ids = SURGE_TYPES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of SURGE_TYPES) {
    assert.ok(s.id && s.name && s.icon && s.kind, `bad surge ${s.id}`);
    assert.ok(s.weight > 0, `positive weight ${s.id}`);
    assert.equal(SURGE_BY_ID[s.id], s);
    if (s.kind === 'prod' || s.kind === 'click') {
      assert.ok(s.mult > 1 && s.duration > 0, `timed buff fields ${s.id}`);
    }
  }
  assert.ok(SURGE_MIN_INTERVAL > 0 && SURGE_MAX_INTERVAL > SURGE_MIN_INTERVAL);
  assert.ok(SURGE_LIFETIME > 0);
});

test('pickSurgeType covers the whole table and clamps out-of-range rolls', () => {
  // Every type is reachable by some roll in [0,1).
  const seen = new Set();
  for (let r = 0; r < 1; r += 0.001) seen.add(pickSurgeType(r).id);
  for (const s of SURGE_TYPES) assert.ok(seen.has(s.id), `${s.id} reachable`);
  // Clamping: negative → first bucket, ≥1 → last bucket.
  assert.equal(pickSurgeType(-5).id, SURGE_TYPES[0].id);
  assert.equal(pickSurgeType(1).id, SURGE_TYPES[SURGE_TYPES.length - 1].id);
  assert.equal(pickSurgeType(2).id, SURGE_TYPES[SURGE_TYPES.length - 1].id);
});

test('rollSurge returns a concrete, applicable reward for every kind', () => {
  const ctx = { rate: 100, nebula: 1e6, perks: createPerkEffects() };
  // Walk a spread of rolls; collect one reward per kind.
  const byKind = {};
  for (let r = 0; r < 1; r += 0.005) {
    const reward = rollSurge(r, ctx);
    byKind[reward.kind] = reward;
    assert.ok(reward.id && reward.name && reward.icon, 'reward carries display fields');
  }
  // Instant Nebula windfall is a positive integer.
  assert.ok(byKind.nebula && Number.isInteger(byKind.nebula.nebula) && byKind.nebula.nebula > 0);
  // Timed buffs carry a mult (>1) and a duration (>0).
  for (const k of ['prod', 'click']) {
    if (byKind[k]) { assert.ok(byKind[k].mult > 1); assert.ok(byKind[k].duration > 0); }
  }
  // Core jackpot grants at least one whole Core.
  if (byKind.core) assert.ok(byKind.core.cores >= 1 && Number.isInteger(byKind.core.cores));
});

test('rollSurge is deterministic and the reward perk scales instant payouts', () => {
  const base = { rate: 50, nebula: 2e5, perks: createPerkEffects() };
  const lucky = rollSurge(0, base); // roll 0 → first (highest-weight) bucket = lucky
  assert.equal(lucky.kind, 'nebula');
  assert.equal(rollSurge(0, base).nebula, lucky.nebula, 'deterministic for a fixed roll');
  const boosted = rollSurge(0, { ...base, perks: computePerks({ lucky_resonance: 6 }) });
  assert.ok(boosted.nebula > lucky.nebula, 'Lucky Resonance grows the windfall');
});

test('a Lucky windfall floors to a worthwhile pop even on a pristine Station', () => {
  const reward = rollSurge(0, { rate: 0, nebula: 0, perks: createPerkEffects() });
  assert.equal(reward.kind, 'nebula');
  assert.ok(reward.nebula >= 25, 'empty Station still gets a floor windfall');
});

// --------------------------------------------------- expanded Station content
// The Station catalogue was expanded to at least double its original size. These
// guard the lower bounds and the new effect fields they introduced.

test('Station catalogue is at least doubled in every line', () => {
  assert.ok(GENERATORS.length >= 16, `generators ${GENERATORS.length} >= 16`);
  assert.ok(PRESTIGE_UPGRADES.length >= 16, `perks ${PRESTIGE_UPGRADES.length} >= 16`);
  assert.ok(SPECIAL_UPGRADES.length >= 16, `specials ${SPECIAL_UPGRADES.length} >= 16`);
  assert.ok(SURGE_TYPES.length >= 10, `surges ${SURGE_TYPES.length} >= 10`);
});

test('new high-tier generators stay strictly ascending and formattable', () => {
  for (const id of ['pulsar', 'antimatter', 'wormhole', 'infinityspire']) {
    assert.ok(GENERATOR_BY_ID[id], `generator ${id} is registered`);
  }
  // The whole ladder must still ascend in both cost and rate (re-checked here so
  // the new tail can never silently break monotonicity).
  for (let i = 1; i < GENERATORS.length; i++) {
    assert.ok(GENERATORS[i].baseCost > GENERATORS[i - 1].baseCost, 'cost ascends');
    assert.ok(GENERATORS[i].rate > GENERATORS[i - 1].rate, 'rate ascends');
    assert.ok(Number.isFinite(GENERATORS[i].baseCost) && Number.isFinite(GENERATORS[i].rate));
  }
});

test('createPerkEffects exposes the new neutral perk fields', () => {
  const n = createPerkEffects();
  assert.equal(n.surgeDurationMul, 1);
  assert.equal(n.offlineRateMul, 1);
  assert.equal(n.nebulaRunMul, 1);
});

test('Temporal Lens perk widens Surge frenzy duration', () => {
  const base = { rate: 50, nebula: 1e4, perks: createPerkEffects() };
  const plain = rollSurge(0.3, base); // a prod/click frenzy bucket
  const boosted = rollSurge(0.3, { ...base, perks: computePerks({ temporal_lens: 6 }) });
  if (plain.duration) assert.ok(boosted.duration > plain.duration, 'frenzy lasts longer');
});

test('Dormant Reactor and Flux Siphon perks fold their multipliers', () => {
  const reactor = computePerks({ dormant_reactor: 6 });
  assert.ok(reactor.offlineRateMul > 1, 'offline rate scales up');
  const siphon = computePerks({ flux_siphon: 8 });
  assert.ok(siphon.nebulaRunMul > 1, 'run Nebula burst scales up');
});

test('new Core specials fold their extra run-stat fields into the bonus', () => {
  const b = applyIdleBonus(createMetaBonus(), {
    kinetic_amplifier: 8, phase_shift: 8, vampiric_core: 6,
    blast_capacitor: 6, piercing_rounds: 4,
  });
  assert.ok(b.critMultAdd > 0, 'crit damage added');
  assert.ok(b.dodgeAdd > 0, 'dodge added');
  assert.ok(b.lifestealAdd > 0, 'lifesteal added');
  assert.ok(b.areaMul > 1, 'area scaled');
  assert.ok(b.pierceAdd >= 1, 'pierce added');
});

test('richer Nebula surges pay out more and Core Vault banks several Cores', () => {
  const ctx = { rate: 100, nebula: 1e6, perks: createPerkEffects() };
  const lucky = rollSurge(0, ctx).nebula;
  // Walk the table to find the payoutMul'd nebula surges and the big Core jackpot.
  let richest = lucky; let maxCores = 1;
  for (let r = 0; r < 1; r += 0.001) {
    const reward = rollSurge(r, ctx);
    if (reward.kind === 'nebula') richest = Math.max(richest, reward.nebula);
    if (reward.kind === 'core') maxCores = Math.max(maxCores, reward.cores);
  }
  assert.ok(richest > lucky, 'a richer surge beats the baseline Lucky Nebula');
  assert.ok(maxCores >= 3, 'Core Vault grants several Cores');
});
