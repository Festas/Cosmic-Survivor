// tests/debugOverlay.test.mjs — smoke tests for the debug overlay module.
//
// The overlay must:
//   1. Export `installDebugOverlay` as a function.
//   2. Be a complete no-op when `globalThis.location` does not contain
//      `?rework=debug` (i.e. it must not create any DOM elements and must
//      not throw).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { installDebugOverlay } from '../js/core/debugOverlay.js';

test('debugOverlay: exports installDebugOverlay as a function', () => {
    assert.equal(typeof installDebugOverlay, 'function');
});

test('debugOverlay: no-op when location has no rework=debug param', () => {
    // Node has no `location` global — the overlay must handle this gracefully.
    const prevLocation = globalThis.location;
    try {
        // Ensure location is undefined (Node default) or has no rework=debug.
        delete globalThis.location;
        // Must not throw.
        installDebugOverlay();
        assert.ok(true, 'installDebugOverlay must not throw when location is absent');
    } finally {
        if (prevLocation !== undefined) globalThis.location = prevLocation;
    }
});

test('debugOverlay: no-op when rework param is not "debug"', () => {
    const prevLocation = globalThis.location;
    try {
        globalThis.location = { search: '?rework=other' };
        installDebugOverlay();
        assert.ok(true, 'must not throw for unrelated rework param values');
    } finally {
        if (prevLocation !== undefined) {
            globalThis.location = prevLocation;
        } else {
            delete globalThis.location;
        }
    }
});

test('debugOverlay: no-op when rework=debug but document is absent', () => {
    const prevLocation = globalThis.location;
    const prevDocument = globalThis.document;
    try {
        globalThis.location = { search: '?rework=debug' };
        delete globalThis.document;
        // Must return silently without creating DOM elements.
        installDebugOverlay();
        assert.ok(true, 'must not throw when document is absent');
    } finally {
        if (prevLocation !== undefined) {
            globalThis.location = prevLocation;
        } else {
            delete globalThis.location;
        }
        if (prevDocument !== undefined) {
            globalThis.document = prevDocument;
        }
    }
});
