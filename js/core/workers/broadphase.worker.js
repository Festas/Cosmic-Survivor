// broadphase.worker.js — Phase 1 (Multithreading)
//
// Web Worker that owns a SpatialHash and answers proximity queries off the
// main thread. The protocol is intentionally tiny so it can be replaced by a
// SharedArrayBuffer-based system later without changing callers.
//
// Message protocol (main -> worker):
//   { type: 'init',    cellSize, worldWidth, worldHeight }
//   { type: 'rebuild', items: Float32Array | { id, x, y }[] }
//   { type: 'query',   id, x, y, radius }     // returns matched ids
//
// Worker -> main:
//   { type: 'ready' }
//   { type: 'queryResult', id, ids: number[] }
//
// The worker is *advisory*: callers should still do precise circle tests on
// the returned candidates on the main thread. This keeps the hot list
// transferable as plain numeric ids — no serialisation of game objects.

import { SpatialHash } from '../spatialHash.js';

let hash = null;

self.onmessage = (ev) => {
    const msg = ev.data;
    if (!msg || typeof msg !== 'object') return;
    switch (msg.type) {
        case 'init':
            hash = new SpatialHash({
                cellSize: msg.cellSize,
                worldWidth: msg.worldWidth,
                worldHeight: msg.worldHeight,
            });
            self.postMessage({ type: 'ready' });
            break;
        case 'rebuild': {
            if (!hash) return;
            hash.clear();
            const items = msg.items;
            if (items instanceof Float32Array) {
                // Packed format: [id, x, y, id, x, y, …] — fastest path.
                for (let i = 0; i + 2 < items.length; i += 3) {
                    hash.insert(items[i + 1], items[i + 2], items[i] | 0);
                }
            } else if (Array.isArray(items)) {
                for (let i = 0; i < items.length; i++) {
                    const it = items[i];
                    hash.insert(it.x, it.y, it.id | 0);
                }
            }
            break;
        }
        case 'query': {
            if (!hash) {
                self.postMessage({ type: 'queryResult', id: msg.id, ids: [] });
                return;
            }
            const candidates = hash.query(msg.x, msg.y, msg.radius);
            // SpatialHash.query reuses scratch storage — copy.
            const ids = candidates.slice();
            self.postMessage({ type: 'queryResult', id: msg.id, ids });
            break;
        }
    }
};
