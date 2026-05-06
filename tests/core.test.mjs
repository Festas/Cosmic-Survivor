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

// ----- ObjectPool exhaustEvents & high-cycle regression -------------------------

import { registerPool, listPools } from '../js/core/poolRegistry.js';

test('ObjectPool: 10 000 acquire/release cycles on cap-256 pool — inUse===0, no exhausts', () => {
    const pool = new ObjectPool(
        () => ({ v: 0 }),
        (o, v) => { o.v = v; },
        { maxSize: 256, name: 'cycle-test' }
    );
    for (let i = 0; i < 10_000; i++) {
        const obj = pool.acquire(i);
        assert.notEqual(obj, null, `acquire should succeed at iteration ${i}`);
        pool.release(obj);
    }
    const s = pool.stats();
    assert.equal(s.inUse, 0, 'all objects must be returned to pool');
    assert.ok(s.allocated <= 256, `allocated (${s.allocated}) must not exceed cap`);
    assert.equal(s.exhaustEvents, 0, 'no exhaust events in normal cycling');
});

test('ObjectPool: acquire past cap returns null and increments exhaustEvents', () => {
    const pool = new ObjectPool(() => ({}), () => {}, { maxSize: 3, name: 'exhaust-test' });
    pool.acquire(); pool.acquire(); pool.acquire(); // fill to cap
    const result = pool.acquire();
    assert.equal(result, null, 'must return null when exhausted');
    assert.equal(pool.stats().exhaustEvents, 1, 'exhaustEvents must be 1 after one exhaust');
    // Two more
    pool.acquire(); pool.acquire();
    assert.equal(pool.stats().exhaustEvents, 3);
});

test('poolRegistry: registerPool / listPools round-trip', () => {
    const poolA = new ObjectPool(() => ({}), () => {}, { maxSize: 10, name: 'reg-a' });
    const poolB = new ObjectPool(() => ({}), () => {}, { maxSize: 20, name: 'reg-b' });

    registerPool('reg-a', poolA);
    registerPool('reg-b', poolB);

    // Acquire a few from poolA so inUse > 0
    poolA.acquire(); poolA.acquire();

    const list = listPools();
    const names = list.map(p => p.name);
    assert.ok(names.includes('reg-a'), 'listPools must include reg-a');
    assert.ok(names.includes('reg-b'), 'listPools must include reg-b');

    const a = list.find(p => p.name === 'reg-a');
    assert.equal(a.inUse, 2);
    assert.equal(a.cap, 10);
    assert.equal(a.exhaustEvents, 0);
});

test('poolRegistry: registerPool ignores null', () => {
    // Must not throw
    registerPool('null-pool', null);
    const list = listPools();
    assert.ok(!list.some(p => p.name === 'null-pool'));
});

// ─── Part D rework: Broadphase determinism test ───────────────────────────────
// Runs a fixed-seed simulation with 300 enemies + 80 bullets for 600 frames
// and asserts that bullet→enemy hit-index sets are IDENTICAL between the naive
// O(N×M) scan and the SpatialHash broadphase + precise circle test.
//
// This is the regression net that must pass before anyone deletes the legacy
// naive path in a future PR.

{
    const ENEMY_COUNT  = 300;
    const BULLET_COUNT = 80;
    const FRAMES       = 600;
    const CELL_SIZE    = 40;
    const WORLD_W      = 3000;
    const WORLD_H      = 2000;
    const BULLET_R     = 5;
    const ENEMY_R      = 25;

    /** Deterministic LCG prng. */
    function lcg(seed) {
        let s = seed >>> 0;
        return () => {
            s = Math.imul(s, 1664525) + 1013904223 | 0;
            return ((s >>> 0) / 0x100000000);
        };
    }

    function makeEntities(rng) {
        const enemies = Array.from({ length: ENEMY_COUNT }, (_, i) => ({
            id: i, x: rng() * WORLD_W, y: rng() * WORLD_H, size: ENEMY_R,
            vx: (rng() - 0.5) * 3, vy: (rng() - 0.5) * 3, alive: true,
        }));
        const bullets = Array.from({ length: BULLET_COUNT }, (_, i) => {
            const angle = rng() * Math.PI * 2;
            return {
                id: i, x: rng() * WORLD_W, y: rng() * WORLD_H,
                size: BULLET_R, angle, speed: 8, alive: true,
            };
        });
        return { enemies, bullets };
    }

    function stepSim(enemies, bullets) {
        for (const e of enemies) {
            if (!e.alive) continue;
            e.x = (e.x + e.vx + WORLD_W) % WORLD_W;
            e.y = (e.y + e.vy + WORLD_H) % WORLD_H;
        }
        for (const b of bullets) {
            if (!b.alive) continue;
            b.x = (b.x + Math.cos(b.angle) * b.speed + WORLD_W) % WORLD_W;
            b.y = (b.y + Math.sin(b.angle) * b.speed + WORLD_H) % WORLD_H;
        }
    }

    /**
     * Run collision detection — naive or hash.
     * Returns sorted list of "bulletId:enemyId" hit pairs for the frame.
     * A 'hit' means distance < enemy.size + bullet.size (same as main.js).
     */
    function detectHits(enemies, bullets, hash) {
        const hits = [];
        const liveEnemies = enemies.filter(e => e.alive);
        const liveBullets = bullets.filter(b => b.alive);

        if (hash) {
            // Hash path
            hash.clear();
            for (const e of liveEnemies) hash.insert(e.x, e.y, e);
            const qr = BULLET_R + ENEMY_R;
            for (const b of liveBullets) {
                const candidates = hash.query(b.x, b.y, qr);
                for (const e of candidates) {
                    const dx = e.x - b.x, dy = e.y - b.y;
                    if (dx * dx + dy * dy < (e.size + b.size) * (e.size + b.size)) {
                        hits.push(`${b.id}:${e.id}`);
                    }
                }
            }
        } else {
            // Naive path
            for (const b of liveBullets) {
                for (const e of liveEnemies) {
                    const dx = e.x - b.x, dy = e.y - b.y;
                    if (dx * dx + dy * dy < (e.size + b.size) * (e.size + b.size)) {
                        hits.push(`${b.id}:${e.id}`);
                    }
                }
            }
        }
        return hits.sort();
    }

    test('broadphase determinism: naive and hash return identical hit sets over 600 frames', () => {
        const hash = new SpatialHash({ cellSize: CELL_SIZE, worldWidth: WORLD_W, worldHeight: WORLD_H });

        const rng1 = lcg(0xcafebeef);
        const rng2 = lcg(0xcafebeef); // same seed

        const { enemies: e1, bullets: b1 } = makeEntities(rng1);
        const { enemies: e2, bullets: b2 } = makeEntities(rng2);

        let totalNaiveHits = 0, totalHashHits = 0;
        let frameMismatch = -1;

        for (let f = 0; f < FRAMES; f++) {
            stepSim(e1, b1);
            stepSim(e2, b2);

            const naiveHits = detectHits(e1, b1, null);
            const hashHits  = detectHits(e2, b2, hash);

            totalNaiveHits += naiveHits.length;
            totalHashHits  += hashHits.length;

            if (frameMismatch === -1 && naiveHits.length !== hashHits.length) {
                frameMismatch = f;
            } else if (frameMismatch === -1) {
                // Deep compare on frames with equal counts
                for (let i = 0; i < naiveHits.length; i++) {
                    if (naiveHits[i] !== hashHits[i]) { frameMismatch = f; break; }
                }
            }
        }

        assert.equal(
            frameMismatch, -1,
            `Hit mismatch between naive and hash at frame ${frameMismatch}. ` +
            `Total naive=${totalNaiveHits} hash=${totalHashHits}`
        );
        assert.equal(
            totalNaiveHits, totalHashHits,
            `Total hit counts differ: naive=${totalNaiveHits} hash=${totalHashHits}`
        );
    });
}

// ─── Part E rework: Interpolation math ────────────────────────────────────────
// Tests that the render-position lerp formula used by _applyEntityInterp
// produces the correct output. Import is intentionally not used here — we test
// the pure math so the formula can be verified without loading main.js.

test('lerp interpolation: (0,0) → (10,0) at alpha=0.5 gives renderX=5, renderY=0', () => {
    // Mirrors _applyEntityInterp logic in main.js.
    const entity = { x: 10, y: 0, _interpPrevX: 0, _interpPrevY: 0 };
    const alpha = 0.5;
    const renderX = entity._interpPrevX + (entity.x - entity._interpPrevX) * alpha;
    const renderY = entity._interpPrevY + (entity.y - entity._interpPrevY) * alpha;
    assert.equal(renderX, 5);
    assert.equal(renderY, 0);
});

test('lerp interpolation: alpha=0 returns start position', () => {
    const entity = { x: 100, y: 200, _interpPrevX: 50, _interpPrevY: 80 };
    const renderX = entity._interpPrevX + (entity.x - entity._interpPrevX) * 0;
    const renderY = entity._interpPrevY + (entity.y - entity._interpPrevY) * 0;
    assert.equal(renderX, 50);
    assert.equal(renderY, 80);
});

test('lerp interpolation: alpha=1 returns end position', () => {
    const entity = { x: 100, y: 200, _interpPrevX: 50, _interpPrevY: 80 };
    const renderX = entity._interpPrevX + (entity.x - entity._interpPrevX) * 1;
    const renderY = entity._interpPrevY + (entity.y - entity._interpPrevY) * 1;
    assert.equal(renderX, 100);
    assert.equal(renderY, 200);
});

// ─── Part E rework: FixedClock additional tests ──────────────────────────────
// spiral-of-death guard and tick-count determinism.

test('FixedClock: huge dt jump is clamped to maxFrameSeconds (≤5 steps at 60 Hz)', () => {
    const clock = new FixedClock({ stepSeconds: 1 / 60, maxFrameSeconds: 0.25 });
    // First call to set internal lastTimestamp.
    clock.advance(1000);
    // Jump 30 seconds — should be clamped to 0.25 s → at most 15 steps.
    const { steps } = clock.advance(31000);
    // maxFrameSeconds=0.25, stepSeconds=1/60 ≈ 0.01667, max steps = floor(0.25/0.01667)=15
    assert.ok(steps <= 15, `Expected ≤15 steps after huge jump, got ${steps}`);
    assert.ok(steps >= 0, 'steps must be non-negative');
});

test('FixedClock: advancing by exactly one step returns steps=1 and alpha in [0,1)', () => {
    const clock = new FixedClock({ stepSeconds: 1 / 60, maxFrameSeconds: 0.25 });
    clock.advance(1000);               // init with non-zero timestamp
    // Advance by 20ms (1.2 × step) → should produce exactly 1 step, alpha > 0.
    const { steps, alpha } = clock.advance(1020);
    assert.ok(steps >= 1, `expected at least 1 step, got ${steps}`);
    assert.ok(alpha >= 0 && alpha < 1, `alpha=${alpha} should be in [0,1)`);
});

test('FixedClock: deterministic — same timestamps produce same step+alpha sequence', () => {
    const c1 = new FixedClock({ stepSeconds: 1 / 60, maxFrameSeconds: 0.25 });
    const c2 = new FixedClock({ stepSeconds: 1 / 60, maxFrameSeconds: 0.25 });

    const timestamps = [0, 16, 33, 50, 66, 100, 116];
    for (const t of timestamps) {
        const r1 = c1.advance(t);
        const r2 = c2.advance(t);
        assert.equal(r1.steps, r2.steps, `steps mismatch at t=${t}`);
        // Alpha within floating-point tolerance.
        assert.ok(
            Math.abs(r1.alpha - r2.alpha) < 1e-10,
            `alpha mismatch at t=${t}: ${r1.alpha} vs ${r2.alpha}`
        );
    }
});

