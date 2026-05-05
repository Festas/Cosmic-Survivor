// tests/core.test.mjs — node --test smoke tests for new rework modules.
//
// Goal: prove the new core/render/system modules are importable, behave
// deterministically, and don't break under reasonable abuse. These are
// fast unit-style tests; they don't drive the DOM.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ObjectPool, preallocateArray } from '../js/core/objectPool.js';
import { EventBus, gameBus } from '../js/core/eventBus.js';
import { XoshiroRng, rngFromSeed, seedFromString } from '../js/core/rng.js';
import { SpatialHash } from '../js/core/spatialHash.js';
import { FixedClock } from '../js/core/fixedClock.js';
import { TraumaShake, HitStop, HitFlash, juice } from '../js/render/juice.js';
import { StanceSystem, Stance } from '../js/systems/stanceSystem.js';
import { WeatherSystem, WEATHER_PROFILES } from '../js/systems/weatherSystem.js';
import { flank, shieldBuddy, applyShieldBuddyAbsorption, ensureShieldIds } from '../js/systems/enemyBehaviors.js';
import { applyCoopAura, COOP_AURA_RADIUS } from '../js/systems/coopAura.js';

// ----- ObjectPool ----------------------------------------------------------

test('ObjectPool: acquire reuses released objects', () => {
    let created = 0;
    const pool = new ObjectPool(() => ({ created: ++created, x: 0 }), (o, x) => { o.x = x; });
    const a = pool.acquire(1);
    const b = pool.acquire(2);
    assert.equal(created, 2);
    pool.release(a);
    const c = pool.acquire(3);
    assert.equal(created, 2, 'reusing released object should not allocate');
    assert.equal(c, a, 'pool returns the most-recently-released instance');
    assert.equal(c.x, 3, 'reset is invoked with acquire args');
    assert.equal(b.x, 2);
});

test('ObjectPool: returns null when exhausted', () => {
    const pool = new ObjectPool(() => ({}), () => {}, { maxSize: 2 });
    assert.notEqual(pool.acquire(), null);
    assert.notEqual(pool.acquire(), null);
    assert.equal(pool.acquire(), null, 'exhausted pool must return null, not throw');
});

test('ObjectPool: stats and drain behave', () => {
    const pool = new ObjectPool(() => ({}), () => {}, { initialSize: 3, maxSize: 10 });
    const s = pool.stats();
    assert.equal(s.allocated, 3);
    assert.equal(s.free, 3);
    pool.drain();
    assert.equal(pool.stats().allocated, 0);
});

test('preallocateArray: produces N independent objects', () => {
    const arr = preallocateArray(() => ({ n: 0 }), 4);
    arr[0].n = 1;
    assert.equal(arr[1].n, 0);
    assert.equal(arr.length, 4);
});

// ----- EventBus ------------------------------------------------------------

test('EventBus: on/emit/off lifecycle', () => {
    const bus = new EventBus();
    let calls = 0;
    const off = bus.on('hit', () => calls++);
    bus.emit('hit'); bus.emit('hit');
    assert.equal(calls, 2);
    off();
    bus.emit('hit');
    assert.equal(calls, 2, 'unsubscribed listeners must not fire');
});

test('EventBus: listener exception does not break others', () => {
    const bus = new EventBus();
    const errs = [];
    const origErr = console.error;
    console.error = (...args) => { errs.push(args); };
    try {
        bus.on('x', () => { throw new Error('boom'); });
        let ran = false;
        bus.on('x', () => { ran = true; });
        bus.emit('x');
        assert.equal(ran, true, 'second listener must still run after first throws');
        assert.equal(errs.length >= 1, true);
    } finally {
        console.error = origErr;
    }
});

test('EventBus: once auto-unsubscribes', () => {
    const bus = new EventBus();
    let n = 0;
    bus.once('go', () => n++);
    bus.emit('go'); bus.emit('go');
    assert.equal(n, 1);
});

test('gameBus: shared singleton exists', () => {
    assert.ok(gameBus instanceof EventBus);
});

// ----- RNG -----------------------------------------------------------------

test('XoshiroRng: same seed produces same sequence', () => {
    const a = new XoshiroRng(1, 2, 3, 4);
    const b = new XoshiroRng(1, 2, 3, 4);
    for (let i = 0; i < 100; i++) {
        assert.equal(a.next(), b.next());
    }
});

test('XoshiroRng: save/load round-trips', () => {
    const r = new XoshiroRng(7, 8, 9, 10);
    for (let i = 0; i < 50; i++) r.next();
    const snap = r.save();
    const v1 = r.next();
    r.load(snap);
    assert.equal(r.next(), v1, 'restored state must reproduce next value');
});

test('rngFromSeed: stable across calls', () => {
    const r1 = rngFromSeed('cosmic');
    const r2 = rngFromSeed('cosmic');
    assert.equal(r1.next(), r2.next());
    assert.notEqual(rngFromSeed('cosmic').next(), rngFromSeed('survivor').next());
});

test('seedFromString: never returns all-zero seed', () => {
    const seeds = ['', 'a', '0', 'cosmic'];
    for (const s of seeds) {
        const [a, b, c, d] = seedFromString(s);
        const rng = new XoshiroRng(a, b, c, d);
        const v = rng.next();
        assert.ok(v >= 0 && v < 1, `seed for "${s}" must yield valid floats, got ${v}`);
    }
});

test('XoshiroRng: range/int/chance produce expected bounds', () => {
    const r = new XoshiroRng(5, 6, 7, 8);
    for (let i = 0; i < 100; i++) {
        const f = r.range(10, 20);
        assert.ok(f >= 10 && f < 20);
        const n = r.int(0, 5);
        assert.ok(n >= 0 && n <= 5);
        const b = r.chance(0.5);
        assert.equal(typeof b, 'boolean');
    }
});

// ----- SpatialHash ---------------------------------------------------------

test('SpatialHash: query returns inserted items within radius', () => {
    const h = new SpatialHash({ cellSize: 50 });
    const items = [];
    for (let i = 0; i < 20; i++) {
        const it = { id: i, x: i * 10, y: 0 };
        items.push(it);
        h.insert(it.x, it.y, it);
    }
    // SpatialHash is a *broadphase*: it returns every item in any cell the
    // query AABB overlaps. The caller is responsible for exact circle tests.
    // We check that close items are returned and far items are not.
    const found = h.query(50, 0, 25);
    const ids = new Set(found.map(o => o.id));
    assert.ok(ids.has(5));
    assert.ok(ids.has(7));
    assert.ok(!ids.has(19), 'far item must not be in the candidate set');
});

test('SpatialHash: clear empties cells', () => {
    const h = new SpatialHash();
    h.insert(0, 0, 1);
    assert.ok(h.cellCount > 0);
    h.clear();
    assert.equal(h.cellCount, 0);
});

// ----- FixedClock ----------------------------------------------------------

test('FixedClock: produces 60 steps per simulated second', () => {
    const c = new FixedClock();
    c.advance(0); // prime
    let total = 0;
    let t = 0;
    for (let i = 0; i < 60; i++) {
        t += 16.6667;
        const { steps } = c.advance(t);
        total += steps;
    }
    assert.ok(total >= 58 && total <= 62, `expected ~60 steps, got ${total}`);
});

test('FixedClock: clamps huge dt to avoid spiral of death', () => {
    const c = new FixedClock();
    c.advance(0);
    const { steps } = c.advance(1_000_000); // simulate massive freeze
    assert.ok(steps <= 5);
});

// ----- Juice ---------------------------------------------------------------

test('TraumaShake: amplitude grows then decays to zero', () => {
    const s = new TraumaShake();
    s.add(1);
    s.update(0.016);
    const ax = Math.abs(s.offsetX);
    assert.ok(ax > 0);
    for (let i = 0; i < 200; i++) s.update(0.016);
    assert.ok(s.trauma === 0);
    assert.equal(s.offsetX, 0);
    assert.equal(s.offsetY, 0);
});

test('HitStop: consume reduces sim dt then resumes', () => {
    const hs = new HitStop();
    hs.trigger(50);
    assert.equal(hs.consume(20), 0, 'sim halted');
    assert.equal(hs.consume(40), 10, '50ms total then 10ms passes through');
    assert.equal(hs.consume(16), 16, 'after window dt is unaffected');
});

test('HitFlash: pulse decays to zero', () => {
    const f = new HitFlash();
    f.pulse('#f00', 0.5, 100);
    f.update(0.05);
    f.update(0.05);
    f.update(0.05);
    // After 150ms (>100ms) every flash should be gone.
    let drawn = 0;
    const fakeCtx = { save() {}, restore() {}, fillRect() { drawn++; }, set globalAlpha(_) {}, set fillStyle(_) {} };
    f.draw(fakeCtx, 100, 100);
    assert.equal(drawn, 0);
});

test('juice singleton: update progresses all sub-systems', () => {
    juice.shake.add(0.5);
    juice.flash.pulse('#fff', 0.5, 100);
    juice.update(0.016);
    // No assertion beyond "doesn't throw" — singleton just needs to be wired.
    assert.ok(true);
});

// ----- StanceSystem --------------------------------------------------------

test('StanceSystem: enters Focus after sustained stillness', () => {
    const s = new StanceSystem();
    assert.equal(s.stance, Stance.MOVING);
    for (let i = 0; i < 60; i++) s.update(false);
    assert.equal(s.stance, Stance.FOCUS);
    assert.ok(s.modifiers.damageMultiplier > 1);
});

test('StanceSystem: small movement does not immediately break Focus', () => {
    const s = new StanceSystem();
    for (let i = 0; i < 60; i++) s.update(false);
    assert.equal(s.stance, Stance.FOCUS);
    s.update(true); // single nudge
    assert.equal(s.stance, Stance.FOCUS, 'one frame of movement must be within grace window');
    for (let i = 0; i < 30; i++) s.update(true);
    assert.equal(s.stance, Stance.MOVING);
});

test('StanceSystem: emits stance:changed via gameBus', () => {
    const s = new StanceSystem();
    let fired = 0;
    const off = gameBus.on('stance:changed', () => fired++);
    for (let i = 0; i < 60; i++) s.update(false);
    off();
    assert.ok(fired >= 1);
});

// ----- WeatherSystem -------------------------------------------------------

test('WeatherSystem: rolls deterministically from seed', () => {
    const w1 = new WeatherSystem();
    const w2 = new WeatherSystem();
    for (let wave = 3; wave < 20; wave++) {
        const a = w1.rollForWave(wave, false);
        const b = w2.rollForWave(wave, false);
        assert.equal(a.id, b.id, `wave ${wave} must pick the same weather across instances`);
    }
});

test('WeatherSystem: first two waves are always clear', () => {
    const w = new WeatherSystem();
    assert.equal(w.rollForWave(1, false).id, 'clear');
    assert.equal(w.rollForWave(2, false).id, 'clear');
});

test('WeatherSystem: storm randomly strikes lightning at enemies', () => {
    const w = new WeatherSystem();
    w.current = WEATHER_PROFILES.storm;
    const enemies = [];
    let hit = 0;
    for (let i = 0; i < 5; i++) enemies.push({ x: i * 50, y: 0, takeDamage: () => { hit++; } });
    const player = { damage: 10 };
    // Force-advance many frames so the lightning interval triggers.
    for (let f = 0; f < 600; f++) w.update(enemies, player);
    assert.ok(hit >= 1, 'storm should produce at least one lightning hit in 10 seconds');
});

// ----- Enemy behaviors -----------------------------------------------------

test('flank behavior: enemy sidesteps when close to player', () => {
    const enemy = { x: 100, y: 100, size: 10 };
    const player = { x: 0, y: 100, facingRight: true };
    const v = flank(enemy, { player, baseSpeed: 1 });
    // Pure chase from x=100 to x=0 would yield dx ~= -1, dy ~= 0.
    // Flank must produce a substantial perpendicular component.
    assert.ok(Math.abs(v.dy) > 0.3, 'flank must add a perpendicular y component');
});

test('shieldBuddy + absorption: protects nearest ally', () => {
    const ally = { x: 0, y: 0, size: 10, takeDamage: () => true };
    const shielder = {
        x: 5, y: 0, size: 10, behavior: 'shieldBuddy',
        alive: true,
        takeDamage(amt) { this.absorbed = (this.absorbed || 0) + amt; return false; },
    };
    const enemies = [ally, shielder];
    ensureShieldIds(enemies);
    // Stamp the protected ally id on the shielder via its movement update.
    shieldBuddy(shielder, { allies: enemies, baseSpeed: 1, frame: 0 });
    const dealt = applyShieldBuddyAbsorption(ally, 100, { enemies, absorbFraction: 0.5 });
    assert.equal(dealt, 50, 'half damage should pass through to the ally');
    assert.equal(shielder.absorbed, 50, 'shielder eats the other half');
});

test('shieldBuddy: no absorption when shielder is too far', () => {
    const ally = { x: 0, y: 0, size: 10 };
    const shielder = {
        x: 1000, y: 0, size: 10, behavior: 'shieldBuddy',
        alive: true,
        takeDamage() {},
    };
    const enemies = [ally, shielder];
    ensureShieldIds(enemies);
    shieldBuddy(shielder, { allies: enemies, baseSpeed: 1, frame: 0 });
    const dealt = applyShieldBuddyAbsorption(ally, 100, { enemies });
    assert.equal(dealt, 100);
});

// ----- Coop aura -----------------------------------------------------------

test('applyCoopAura: no-op in solo', () => {
    const bullet = { x: 0, y: 0, damage: 10, pierce: 1 };
    const out = applyCoopAura(bullet, { isMultiplayer: false, remotePlayers: new Map(), localPlayerId: 'me', player: { x: 0, y: 0 } });
    assert.equal(out, false);
    assert.equal(bullet.damage, 10);
});

test('applyCoopAura: buffs once per ally then idempotent', () => {
    const ally = { x: 0, y: 0 };
    const remote = new Map([['ally1', ally]]);
    const game = { isMultiplayer: true, remotePlayers: remote, localPlayerId: 'me', player: { x: 100, y: 100 } };
    const bullet = { x: 0, y: 0, damage: 10, pierce: 1 };
    assert.equal(applyCoopAura(bullet, game), true);
    assert.equal(bullet.damage, 12, '+20% damage');
    assert.equal(bullet.pierce, 2, '+1 pierce');
    // Second call with same ally should be a no-op.
    assert.equal(applyCoopAura(bullet, game), false);
    assert.equal(bullet.damage, 12);
});

test('COOP_AURA_RADIUS is exposed', () => {
    assert.equal(typeof COOP_AURA_RADIUS, 'number');
    assert.ok(COOP_AURA_RADIUS > 0);
});
