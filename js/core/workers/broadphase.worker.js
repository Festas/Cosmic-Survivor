// broadphase.worker.js — Phase 7 (Multithreading, Parts D/F)
//
// Refactored to export a pure `handleMessage(state, msg)` function so
// node --test can import it without spinning a real Worker.
//
// Updated message protocol (main -> worker):
//   { type: 'init',        cellSize, worldWidth, worldHeight }
//   { type: 'rebuild',     tick, count, positions: Float32Array(count*3) [x,y,r,…],
//                          ids: Int32Array(count) }            — transfer both buffers
//   { type: 'batchQuery',  tick, queries: [{bulletId, x, y, r}, …] }
//
// Worker -> main:
//   { type: 'ready' }
//   { type: 'rebuilt',     tick, buildMs }
//   { type: 'batchResult', tick, bulletQueries: { [bulletId]: Int32Array } }
//
// Legacy single-query protocol retained for backward compat:
//   { type: 'query',       id, x, y, radius }
//   { type: 'queryResult', id, ids: number[] }
//
// The worker is *advisory*: callers still do precise circle tests on the main
// thread. Only numeric ids are transferred — no game-object serialisation.

import { SpatialHash } from '../spatialHash.js';

/**
 * Pure message-handler — operates on a mutable state object.
 * Extracted so node --test can import it without a Worker context.
 *
 * @param {{ hash: SpatialHash|null }} state
 * @param {object} msg
 * @returns {object|null} reply message, or null if no reply needed
 */
export function handleMessage(state, msg) {
    if (!msg || typeof msg !== 'object') return null;

    const now = (typeof performance !== 'undefined') ? () => performance.now() : () => Date.now();

    switch (msg.type) {
        case 'init': {
            state.hash = new SpatialHash({
                cellSize: msg.cellSize,
                worldWidth: msg.worldWidth,
                worldHeight: msg.worldHeight,
            });
            return { type: 'ready' };
        }

        case 'rebuild': {
            if (!state.hash) return null;
            const t0 = now();
            state.hash.clear();

            if (msg.positions instanceof Float32Array && msg.ids instanceof Int32Array) {
                // New binary protocol: positions[i*3]=x, [i*3+1]=y, [i*3+2]=radius; ids[i]=id
                const count = msg.ids.length;
                for (let i = 0; i < count; i++) {
                    state.hash.insert(msg.positions[i * 3], msg.positions[i * 3 + 1], msg.ids[i]);
                }
            } else if (msg.items instanceof Float32Array) {
                // Legacy packed format: [id, x, y, id, x, y, …]
                const items = msg.items;
                for (let i = 0; i + 2 < items.length; i += 3) {
                    state.hash.insert(items[i + 1], items[i + 2], items[i] | 0);
                }
            } else if (Array.isArray(msg.items)) {
                for (const it of msg.items) {
                    state.hash.insert(it.x, it.y, it.id | 0);
                }
            }

            const buildMs = now() - t0;
            return { type: 'rebuilt', tick: msg.tick ?? 0, buildMs };
        }

        case 'batchQuery': {
            // Batch all bullet queries for a sim tick into one round-trip.
            // Returns: { tick, bulletQueries: { [bulletId]: Int32Array } }
            if (!state.hash) return { type: 'batchResult', tick: msg.tick ?? 0, bulletQueries: {} };

            const { tick = 0, queries = [] } = msg;
            const bulletQueries = {};
            for (const q of queries) {
                const raw = state.hash.query(q.x, q.y, q.r);
                // SpatialHash._results is shared scratch — must copy.
                bulletQueries[q.bulletId] = new Int32Array(raw);
            }
            return { type: 'batchResult', tick, bulletQueries };
        }

        case 'query': {
            // Legacy single-query protocol retained for backward compat.
            if (!state.hash) return { type: 'queryResult', id: msg.id, ids: [] };
            const candidates = state.hash.query(msg.x, msg.y, msg.radius);
            const ids = candidates.slice();
            return { type: 'queryResult', id: msg.id, ids };
        }

        default:
            return null;
    }
}

// Self-registration only runs inside a Worker context, not in Node.js.
// Guard with WorkerGlobalScope so node --test can import this file without
// registering a global message handler (which would throw in Node).
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    const _state = { hash: null };
    self.onmessage = (ev) => {
        const reply = handleMessage(_state, ev.data);
        if (reply !== null) {
            self.postMessage(reply);
        }
    };
}
