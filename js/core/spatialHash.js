// spatialHash.js — Phase 1 (Core Architecture & Optimization)
//
// Uniform-grid spatial hash for broadphase collision/proximity queries.
// `main.js` currently does O(N*M) scans (every bullet vs every enemy, every
// orbital orb vs every enemy, every black-hole vs every enemy, …). With wave
// counts of hundreds of enemies plus thousands of bullet particles those
// scans dominate the frame budget.
//
// Usage pattern (per frame):
//   hash.clear();
//   for each enemy: hash.insert(enemy.x, enemy.y, enemy);
//   for each bullet:
//       const candidates = hash.query(bullet.x, bullet.y, bullet.size + maxEnemyRadius);
//       for each candidate: precise circle test
//
// All queries reuse a single results array (no per-call allocation).

const DEFAULT_CELL = 96; // ~3x player size — good for our enemy/bullet sizes.

export class SpatialHash {
    /**
     * @param {{ cellSize?: number, worldWidth?: number, worldHeight?: number }} [opts]
     */
    constructor(opts = {}) {
        this.cellSize = opts.cellSize ?? DEFAULT_CELL;
        this.worldWidth = opts.worldWidth ?? 3000;
        this.worldHeight = opts.worldHeight ?? 2000;
        /** @type {Map<number, any[]>} */
        this._cells = new Map();
        // Reused scratch buffer for query results.
        this._results = [];
        // Cell key dedupe set, reused per query.
        this._seen = new Set();
        // Quick rejection budget — large queries silently cap at this many
        // results to keep pathological cases (full-screen explosion radius)
        // bounded. Tune as needed.
        this.maxResults = 1024;
    }

    /** Drop everything. Cheap; intended to be called every tick. */
    clear() {
        this._cells.clear();
    }

    _key(cx, cy) {
        // Pack signed cell coordinates into a single 32-bit key. The +0x8000
        // bias maps the signed [-32768, 32767] range into the unsigned
        // [0, 65535] range so each axis fits cleanly in 16 bits and the
        // resulting key is non-negative (cheaper Map hashing in V8).
        // World coordinates well outside ±32768 cells (~3 million world
        // units at the default cellSize) would alias — we never approach
        // that in this game, but tighten the bias if you raise WORLD_*.
        return ((cx + 0x8000) << 16) | ((cy + 0x8000) & 0xffff);
    }

    /**
     * Insert an item at world coords (x, y). The item is stored by reference;
     * callers must not mutate item.x/y for the rest of the tick if they want
     * subsequent queries to be correct.
     * @param {number} x
     * @param {number} y
     * @param {any} item
     */
    insert(x, y, item) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        const k = this._key(cx, cy);
        let bucket = this._cells.get(k);
        if (!bucket) {
            bucket = [];
            this._cells.set(k, bucket);
        }
        bucket.push(item);
    }

    /**
     * Return all items whose owning cell intersects the AABB
     * (x-radius, y-radius, x+radius, y+radius). The returned array is shared
     * scratch storage — copy if you need to retain it across frames.
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @returns {any[]}
     */
    query(x, y, radius) {
        const out = this._results;
        out.length = 0;
        this._seen.clear();
        const cs = this.cellSize;
        const minCx = Math.floor((x - radius) / cs);
        const maxCx = Math.floor((x + radius) / cs);
        const minCy = Math.floor((y - radius) / cs);
        const maxCy = Math.floor((y + radius) / cs);
        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const bucket = this._cells.get(this._key(cx, cy));
                if (!bucket) continue;
                for (let i = 0; i < bucket.length; i++) {
                    const item = bucket[i];
                    // Items can land in only one cell so dedup is strictly a
                    // safety net for callers that insert the same instance
                    // multiple times.
                    if (this._seen.has(item)) continue;
                    this._seen.add(item);
                    out.push(item);
                    if (out.length >= this.maxResults) return out;
                }
            }
        }
        return out;
    }

    /**
     * Number of populated cells — useful for diagnostics / heatmap rendering.
     */
    get cellCount() {
        return this._cells.size;
    }
}
