// tests/broadphaseWorker.test.mjs — Unit tests for the broadphase worker's
// pure handleMessage() function.
//
// We never spin an actual Worker here so these tests run cleanly under
// node --test. The SpatialHash and handleMessage modules are imported directly.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { handleMessage } from '../js/core/workers/broadphase.worker.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a fresh, uninitialized handler state. */
function freshState() {
    return { hash: null };
}

/** Initialise the worker state with default test settings. */
function initState(cellSize = 50, worldWidth = 3000, worldHeight = 2000) {
    const state = freshState();
    const reply = handleMessage(state, { type: 'init', cellSize, worldWidth, worldHeight });
    return { state, reply };
}

// ─── init ─────────────────────────────────────────────────────────────────────

test('broadphaseWorker: init returns ready', () => {
    const { reply } = initState();
    assert.equal(reply?.type, 'ready');
});

test('broadphaseWorker: init creates a non-null hash', () => {
    const { state } = initState();
    assert.ok(state.hash !== null, 'state.hash should be set after init');
});

// ─── rebuild ─────────────────────────────────────────────────────────────────

test('broadphaseWorker: rebuild with binary protocol returns rebuilt', () => {
    const { state } = initState();

    // 3 enemies
    const positions = new Float32Array([100, 100, 20, 200, 200, 20, 500, 500, 20]);
    const ids = new Int32Array([0, 1, 2]);

    const reply = handleMessage(state, {
        type: 'rebuild',
        tick: 5,
        count: 3,
        positions,
        ids,
    });

    assert.equal(reply?.type, 'rebuilt');
    assert.equal(reply?.tick, 5);
    assert.equal(typeof reply?.buildMs, 'number');
});

test('broadphaseWorker: rebuild before init returns null', () => {
    const state = freshState();
    const reply = handleMessage(state, {
        type: 'rebuild',
        tick: 0,
        count: 0,
        positions: new Float32Array(0),
        ids: new Int32Array(0),
    });
    assert.equal(reply, null);
});

// ─── batchQuery ───────────────────────────────────────────────────────────────

test('broadphaseWorker: batchQuery returns same candidates as SpatialHash for simple case', async () => {
    const { state } = initState(50);

    // Insert one enemy at (100, 100), radius 25.
    const positions = new Float32Array([100, 100, 25]);
    const ids = new Int32Array([42]);
    handleMessage(state, { type: 'rebuild', tick: 1, count: 1, positions, ids });

    // Query from a bullet at (110, 110), bullet radius 5, maxEnemyRadius 25 → query radius 30.
    const reply = handleMessage(state, {
        type: 'batchQuery',
        tick: 1,
        queries: [{ bulletId: 7, x: 110, y: 110, r: 30 }],
    });

    assert.equal(reply?.type, 'batchResult');
    assert.equal(reply?.tick, 1);
    const candidates = reply?.bulletQueries?.[7];
    assert.ok(candidates instanceof Int32Array, 'candidates should be Int32Array');
    assert.ok(candidates.includes(42), `expected id 42 in candidates, got [${[...candidates]}]`);
});

test('broadphaseWorker: batchQuery returns no candidates when query is far away', () => {
    const { state } = initState(50);

    const positions = new Float32Array([100, 100, 20]);
    const ids = new Int32Array([0]);
    handleMessage(state, { type: 'rebuild', tick: 1, count: 1, positions, ids });

    const reply = handleMessage(state, {
        type: 'batchQuery',
        tick: 1,
        queries: [{ bulletId: 0, x: 900, y: 900, r: 30 }],
    });

    const candidates = reply?.bulletQueries?.[0];
    assert.ok(candidates instanceof Int32Array, 'candidates should be Int32Array');
    assert.equal(candidates.length, 0);
});

test('broadphaseWorker: batchQuery before init returns empty results', () => {
    const state = freshState();
    const reply = handleMessage(state, {
        type: 'batchQuery',
        tick: 0,
        queries: [{ bulletId: 0, x: 100, y: 100, r: 50 }],
    });
    assert.equal(reply?.type, 'batchResult');
    // Should return empty object or object with empty array
    const bq = reply?.bulletQueries ?? {};
    const ids = bq[0];
    assert.ok(!ids || ids.length === 0, 'should return empty candidates when not initialised');
});

test('broadphaseWorker: batchQuery result is an independent copy (not shared scratch)', () => {
    const { state } = initState(50);

    const positions = new Float32Array([100, 100, 20]);
    const ids = new Int32Array([99]);
    handleMessage(state, { type: 'rebuild', tick: 1, count: 1, positions, ids });

    // Two queries; each should get an independent Int32Array.
    const reply = handleMessage(state, {
        type: 'batchQuery',
        tick: 1,
        queries: [
            { bulletId: 0, x: 100, y: 100, r: 30 },
            { bulletId: 1, x: 100, y: 100, r: 30 },
        ],
    });

    const a = reply?.bulletQueries?.[0];
    const b = reply?.bulletQueries?.[1];
    assert.ok(a instanceof Int32Array && b instanceof Int32Array);
    assert.notEqual(a.buffer, b.buffer, 'each result must have its own buffer');
});

// ─── legacy single-query ──────────────────────────────────────────────────────

test('broadphaseWorker: legacy query protocol returns queryResult', () => {
    const { state } = initState(50);

    const positions = new Float32Array([200, 200, 25]);
    const ids = new Int32Array([5]);
    handleMessage(state, { type: 'rebuild', tick: 1, count: 1, positions, ids });

    const reply = handleMessage(state, { type: 'query', id: 99, x: 200, y: 200, radius: 30 });

    assert.equal(reply?.type, 'queryResult');
    assert.equal(reply?.id, 99);
    assert.ok(Array.isArray(reply?.ids), 'ids should be an array');
    assert.ok(reply.ids.includes(5), `expected 5 in [${reply.ids}]`);
});

// ─── rebuild correctness matches plain SpatialHash ───────────────────────────

test('broadphaseWorker: rebuild + batchQuery matches plain SpatialHash queries', async () => {
    // Import SpatialHash to run a reference query.
    const { SpatialHash } = await import('../js/core/spatialHash.js');

    const { state } = initState(50);

    // 10 enemies at random-ish positions.
    const count = 10;
    const positions = new Float32Array(count * 3);
    const ids = new Int32Array(count);
    const refHash = new SpatialHash({ cellSize: 50, worldWidth: 3000, worldHeight: 2000 });

    for (let i = 0; i < count; i++) {
        const x = 100 + i * 80;
        const y = 100 + (i % 3) * 100;
        const r = 20 + (i % 5) * 5;
        positions[i * 3]     = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = r;
        ids[i] = i;
        refHash.insert(x, y, i);
    }

    handleMessage(state, { type: 'rebuild', tick: 1, count, positions, ids });

    // Query from several bullet positions and compare.
    const bulletPositions = [
        { x: 100, y: 100, r: 60 },
        { x: 500, y: 100, r: 40 },
        { x: 900, y: 300, r: 80 },
    ];

    const batchReply = handleMessage(state, {
        type: 'batchQuery',
        tick: 1,
        queries: bulletPositions.map((bp, idx) => ({ bulletId: idx, x: bp.x, y: bp.y, r: bp.r })),
    });

    for (let i = 0; i < bulletPositions.length; i++) {
        const bp = bulletPositions[i];
        const workerCandidates = [...(batchReply?.bulletQueries?.[i] ?? [])].sort((a, b) => a - b);
        const refCandidates = [...refHash.query(bp.x, bp.y, bp.r)].sort((a, b) => a - b);
        assert.deepEqual(
            workerCandidates,
            refCandidates,
            `query ${i}: worker returned [${workerCandidates}] but ref returned [${refCandidates}]`
        );
    }
});

// ─── unknown message type ─────────────────────────────────────────────────────

test('broadphaseWorker: unknown message type returns null', () => {
    const { state } = initState();
    const reply = handleMessage(state, { type: 'unknown_op' });
    assert.equal(reply, null);
});

test('broadphaseWorker: null/undefined message returns null', () => {
    const { state } = initState();
    assert.equal(handleMessage(state, null), null);
    assert.equal(handleMessage(state, undefined), null);
    assert.equal(handleMessage(state, 'string'), null);
});
