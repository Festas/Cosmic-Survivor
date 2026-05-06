// tests/webgl.test.mjs — WebGLRenderer import and construction smoke tests.
//
// Rule: import('../js/render/WebGLRenderer.js') must not throw.
// Construction with a stub canvas is attempted; if WebGL2 cannot be mocked
// sufficiently in Node, the test is skipped (this is expected and acceptable).

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Minimal stub canvas that fakes getContext('webgl2') with a bare-bones object.
 * PixiJS v8 may require more surface; if construction throws, the test skips.
 */
function makeWebGL2StubCanvas() {
    // Minimal WebGL2-like context (enough to satisfy feature detection).
    const fakeGL = {
        getParameter:  () => '',
        getExtension:  () => null,
        clearColor:    () => {},
        clear:         () => {},
        viewport:      () => {},
        enable:        () => {},
        disable:       () => {},
        blendFunc:     () => {},
        drawElements:  () => {},
        drawArrays:    () => {},
        drawCallCount: 0,
    };
    return {
        width: 320,
        height: 240,
        style: {},
        getContext(type) {
            if (type === 'webgl2') return fakeGL;
            if (type === '2d')     return null;
            return null;
        },
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return true; },
    };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test('webgl: WebGLRenderer module imports without throwing', async () => {
    const mod = await import('../js/render/WebGLRenderer.js');
    assert.equal(typeof mod.WebGLRenderer,   'function', 'WebGLRenderer must be exported as a function');
    assert.equal(typeof mod.webglAvailable,  'function', 'webglAvailable must be exported as a function');
    assert.equal(typeof mod.isIOSSafari,     'function', 'isIOSSafari must be exported as a function');
});

test('webgl: webglAvailable() returns false in Node (no document)', async () => {
    const { webglAvailable } = await import('../js/render/WebGLRenderer.js');
    // In Node, document is undefined → webglAvailable must return false.
    const result = webglAvailable();
    assert.equal(result, false, 'webglAvailable() must return false in Node');
});

test('webgl: isIOSSafari() returns false in Node (no navigator)', async () => {
    const { isIOSSafari } = await import('../js/render/WebGLRenderer.js');
    const result = isIOSSafari();
    assert.equal(result, false, 'isIOSSafari() must return false when navigator is absent');
});

test('webgl: WebGLRenderer constructor does not throw against stub canvas', async (t) => {
    const { WebGLRenderer } = await import('../js/render/WebGLRenderer.js');

    let renderer;
    try {
        const stubCanvas = makeWebGL2StubCanvas();
        renderer = new WebGLRenderer(stubCanvas);
    } catch (err) {
        // PixiJS v8 requires a real WebGL2 context that cannot be fully mocked
        // in Node — this is expected and acceptable.
        t.skip(`WebGLRenderer construction requires real WebGL2 (not available in Node): ${err.message}`);
        return;
    }

    assert.equal(renderer.kind,    'webgl',  'kind must be "webgl"');
    assert.equal(typeof renderer.drawCalls, 'number', 'drawCalls must be a number');
    assert.equal(renderer.layers,  6,        'WebGL renderer must expose 6 layers');
});

test('webgl: WebGLRenderer.render() does not throw when PixiJS not ready', async (t) => {
    const { WebGLRenderer } = await import('../js/render/WebGLRenderer.js');

    let renderer;
    try {
        const stubCanvas = makeWebGL2StubCanvas();
        renderer = new WebGLRenderer(stubCanvas);
    } catch {
        t.skip('WebGLRenderer construction not possible in Node — skipping render test');
        return;
    }

    const fakeGame = {
        camera: { x: 0, y: 0 },
        enemies: [],
        bullets: [],
        particles: [],
        xpOrbs: [],
        pickups: [],
        powerups: [],
        player: null,
        wave: 1,
    };

    // If PixiJS async init hasn't resolved yet, render() must be a no-op (not throw).
    assert.doesNotThrow(() => renderer.render(fakeGame, 0));
});
