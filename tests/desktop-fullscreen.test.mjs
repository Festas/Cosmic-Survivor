// tests/desktop-fullscreen.test.mjs — unit tests for the Tauri F11 fullscreen toggle.
//
// The function must bail out immediately when __TAURI_INTERNALS__ is absent (web/PWA/Node)
// and must register a keydown listener when the property is present (Tauri runtime).

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ─── Minimal window stub ──────────────────────────────────────────────────────

function makeWindowStub({ hasTauriInternals = false } = {}) {
    const listeners = [];
    const stub = {
        addEventListener(type, fn) {
            listeners.push({ type, fn });
        },
        _listeners: listeners,
    };
    if (hasTauriInternals) {
        stub.__TAURI_INTERNALS__ = {};
    }
    return stub;
}

// ─── Import under test ───────────────────────────────────────────────────────

// We need to exercise the function with a controlled `window` object.
// Since fullscreen.ts checks `typeof window` and `'__TAURI_INTERNALS__' in window`,
// we can simply call the raw JS logic by replicating the check inline here,
// or we import and monkey-patch globalThis.window.

async function callWithWindow(stubWindow) {
    // Temporarily replace globalThis.window so the module-level guard fires correctly.
    const original = globalThis.window;
    globalThis.window = stubWindow;
    try {
        // Dynamic import so we always get the real module (cached after first load).
        const { installTauriFullscreenToggle } = await import('../js/desktop/fullscreen.ts');
        installTauriFullscreenToggle();
    } finally {
        globalThis.window = original;
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test('installTauriFullscreenToggle: returns immediately without listeners when __TAURI_INTERNALS__ absent', async () => {
    const win = makeWindowStub({ hasTauriInternals: false });
    await callWithWindow(win);
    assert.strictEqual(win._listeners.length, 0,
        'No keydown listener should be registered outside Tauri');
});

test('installTauriFullscreenToggle: registers a keydown listener when __TAURI_INTERNALS__ is present', async () => {
    const win = makeWindowStub({ hasTauriInternals: true });
    await callWithWindow(win);
    const keydownListeners = win._listeners.filter(l => l.type === 'keydown');
    assert.strictEqual(keydownListeners.length, 1,
        'Exactly one keydown listener should be registered inside Tauri');
});

test('installTauriFullscreenToggle: returns immediately when window is undefined', async () => {
    const original = globalThis.window;
    // Simulate a non-browser environment where window may not exist
    globalThis.window = undefined;
    try {
        const { installTauriFullscreenToggle } = await import('../js/desktop/fullscreen.ts');
        // Should not throw
        installTauriFullscreenToggle();
    } finally {
        globalThis.window = original;
    }
});
