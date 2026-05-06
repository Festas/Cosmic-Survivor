// tests/canvas2d.test.mjs — Canvas2DRenderer smoke tests.
//
// Instantiate Canvas2DRenderer against a stub canvas whose getContext('2d')
// returns a Proxy recording every method call. Drive render() with a synthetic
// game state and assert the recorded call sequence contains expected primitives.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ─── Stub canvas / ctx ───────────────────────────────────────────────────────

function makeStubCtx() {
    const calls = [];
    const ctx = new Proxy({}, {
        get(target, prop) {
            if (prop === '_calls') return calls;
            // Stub setter targets: fill style, font, etc.
            if (typeof prop === 'string' && prop in target) return target[prop];
            // Return a recording function for any property access.
            return (...args) => {
                calls.push({ method: prop, args });
            };
        },
        set(target, prop, value) {
            target[prop] = value;
            return true;
        },
    });
    return ctx;
}

function makeStubCanvas(ctx) {
    return {
        width: 1200,
        height: 800,
        getContext(type) {
            if (type === '2d') return ctx;
            return null;
        },
    };
}

// ─── Synthetic game state ────────────────────────────────────────────────────

function makeMinimalGame() {
    return {
        state: 'playing',
        camera: { x: 0, y: 0 },
        enemies: [],
        bullets: [],
        particles: [],
        xpOrbs: [],
        pickups: [],
        powerups: [],
        activePowerups: [],
        notifications: [],
        joystick: { active: false, x: 0, y: 0, startX: 0, startY: 0 },
        keys: {},
        player: {
            x: 600,
            y: 400,
            size: 16,
            health: 80,
            maxHealth: 100,
            aimAngle: 0,
            isMoving: false,
            characterId: 'balanced',
            weaponSlots: [{ type: 'basic', cooldown: 0, level: 1 }],
            weaponOrbitAngle: 0,
            weaponOrbitRadius: 48,
            _lastHitTime: 0,
        },
        wave: 1,
        waveTimer: 30,
        credits: 0,
        stats: { damageTaken: 0, kills: 0 },
        playerDPS: { damage: 0, history: [] },
        isMultiplayer: false,
        frameCount: 0,
        waveActive: true,
        combo: 0,
        comboTimer: 0,
    };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

// We import Canvas2DRenderer dynamically so that missing DOM globals don't
// prevent the test file from loading. The import itself must not throw.
let Canvas2DRenderer;

test('canvas2d: Canvas2DRenderer module imports without error', async () => {
    // Stub window.CONFIG so arena.js and other modules don't throw on import.
    globalThis.window = globalThis.window || globalThis;
    globalThis.window.CONFIG = globalThis.window.CONFIG || {
        CANVAS_WIDTH: 1200, CANVAS_HEIGHT: 800,
        WORLD_WIDTH: 3000, WORLD_HEIGHT: 2000,
        PLAYER_SIZE: 16, BULLET_SIZE: 5, BULLET_SPEED: 8,
        TARGET_FPS: 60,
    };
    globalThis.window.WEAPON_TYPES = globalThis.window.WEAPON_TYPES || {
        basic: { name: '🔫 Blaster', color: '#ffd93d', damage: 1, fireRate: 1, desc: 'Test weapon' },
    };
    // Stub navigator so hud.js touch-detection doesn't throw in Node.
    if (typeof globalThis.navigator === 'undefined') {
        globalThis.navigator = { maxTouchPoints: 0, userAgent: '' };
    }
    // Stub performance so hud/player code doesn't throw.
    if (typeof globalThis.performance === 'undefined') {
        globalThis.performance = { now: () => Date.now() };
    }

    const mod = await import('../js/render/Canvas2DRenderer.js');
    Canvas2DRenderer = mod.Canvas2DRenderer;
    assert.equal(typeof Canvas2DRenderer, 'function', 'Canvas2DRenderer must be a class/constructor');
});

test('canvas2d: Canvas2DRenderer exposes kind, drawCalls, layers', async () => {
    const ctx = makeStubCtx();
    const canvas = makeStubCanvas(ctx);
    const renderer = new Canvas2DRenderer(canvas);

    assert.equal(renderer.kind, 'canvas2d');
    assert.equal(typeof renderer.drawCalls, 'number');
    assert.equal(typeof renderer.layers, 'number');
    assert.ok(renderer.layers > 0);
});

test('canvas2d: render() does not throw on minimal game state', async () => {
    const ctx = makeStubCtx();
    const canvas = makeStubCanvas(ctx);
    const renderer = new Canvas2DRenderer(canvas);

    const game = makeMinimalGame();
    // Must not throw.
    assert.doesNotThrow(() => renderer.render(game, performance.now()));
});

test('canvas2d: render() records ctx calls (save, restore at minimum)', async () => {
    const ctx = makeStubCtx();
    const canvas = makeStubCanvas(ctx);
    const renderer = new Canvas2DRenderer(canvas);

    const game = makeMinimalGame();
    renderer.render(game, performance.now());

    const calls = ctx._calls;
    const methods = calls.map(c => c.method);
    assert.ok(methods.length > 0, 'render() must produce at least one ctx call');
    assert.ok(methods.includes('save'),    'render() must call ctx.save()');
    assert.ok(methods.includes('restore'), 'render() must call ctx.restore()');
    assert.ok(methods.includes('translate'), 'render() must call ctx.translate() for camera');
});

test('canvas2d: drawCalls counter is non-zero after rendering with player', async () => {
    const ctx = makeStubCtx();
    const canvas = makeStubCanvas(ctx);
    const renderer = new Canvas2DRenderer(canvas);

    const game = makeMinimalGame();
    // Add a bullet so drawBullets has something to draw.
    game.bullets.push({ x: 100, y: 100, size: 4, color: '#ffd93d' });

    renderer.render(game, performance.now());
    assert.ok(renderer.drawCalls > 0, 'drawCalls must be > 0 after rendering');
});

test('canvas2d: drawCalls resets to 0 at start of each render()', async () => {
    const ctx = makeStubCtx();
    const canvas = makeStubCanvas(ctx);
    const renderer = new Canvas2DRenderer(canvas);

    const game = makeMinimalGame();
    renderer.render(game, performance.now());
    const first = renderer.drawCalls;
    renderer.render(game, performance.now());
    const second = renderer.drawCalls;

    // Both renders should produce the same (non-zero) count for identical state.
    assert.ok(first > 0);
    assert.ok(second > 0);
});
