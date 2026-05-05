// objectPool.js — Phase 1 (Core Architecture & Optimization)
//
// Generic, allocation-free object pool used to recycle short-lived gameplay
// objects (damage texts, particles, transient effect descriptors) so the GC
// does no work in the hot frame loop.
//
// The pool grows on demand up to `maxSize`; once that ceiling is hit `acquire`
// returns `null` and callers MUST gracefully drop the request. The intentional
// failure-to-allocate keeps a runaway spawn from blowing memory.
//
// Conventions:
//   - `factory()`            : constructs a fresh, *zeroed* instance.
//   - `reset(obj, ...args)`  : reinitialises an instance for reuse. Receives
//                              whatever args were passed to `acquire`.
//   - Pooled objects MUST be considered released the moment `release` is
//     called; do NOT keep references after release.

/**
 * @template T
 */
export class ObjectPool {
    /**
     * @param {() => T} factory
     * @param {(obj: T, ...args: any[]) => void} reset
     * @param {{ initialSize?: number, maxSize?: number, name?: string }} [opts]
     */
    constructor(factory, reset, opts = {}) {
        if (typeof factory !== 'function') throw new TypeError('ObjectPool: factory must be a function');
        if (typeof reset !== 'function') throw new TypeError('ObjectPool: reset must be a function');
        this._factory = factory;
        this._reset = reset;
        this._free = [];
        this._maxSize = opts.maxSize ?? 4096;
        this._allocated = 0;
        this._highWater = 0;
        this.name = opts.name || 'ObjectPool';
        this._exhaustEvents = 0;

        const initial = Math.min(opts.initialSize ?? 0, this._maxSize);
        for (let i = 0; i < initial; i++) {
            this._free.push(this._factory());
            this._allocated++;
        }
    }

    /**
     * Borrow an object from the pool. Returns `null` if the pool is exhausted
     * to signal the caller to drop the spawn instead of allocating.
     * @param {...any} resetArgs
     * @returns {T | null}
     */
    acquire(...resetArgs) {
        let obj;
        if (this._free.length > 0) {
            obj = this._free.pop();
        } else if (this._allocated < this._maxSize) {
            obj = this._factory();
            this._allocated++;
            if (this._allocated > this._highWater) this._highWater = this._allocated;
        } else {
            this._exhaustEvents++;
            return null;
        }
        this._reset(obj, ...resetArgs);
        return obj;
    }

    /**
     * Return an object to the pool. Safe to call with `null`/`undefined`.
     * @param {T | null | undefined} obj
     */
    release(obj) {
        if (obj == null) return;
        // Clamp to maxSize so a misbehaving caller can't unbounded-grow
        // the free list (e.g. via duplicate releases).
        if (this._free.length < this._maxSize) {
            this._free.push(obj);
        }
    }

    /** Drain every retained object, allowing the GC to reclaim them. */
    drain() {
        this._free.length = 0;
        this._allocated = 0;
        this._highWater = 0;
    }

    /** Diagnostics: free-list size, total allocated, peak observed. */
    stats() {
        return {
            name: this.name,
            free: this._free.length,
            allocated: this._allocated,
            inUse: this._allocated - this._free.length,
            highWater: this._highWater,
            maxSize: this._maxSize,
            exhaustEvents: this._exhaustEvents,
        };
    }
}

/**
 * Convenience helper that wraps an array as a recyclable ring of N objects.
 * Useful for fixed-size circular buffers (e.g. last-N damage events for the
 * DPS meter) where allocation count is known ahead of time.
 *
 * @template T
 * @param {() => T} factory
 * @param {number} size
 * @returns {T[]}
 */
export function preallocateArray(factory, size) {
    const arr = new Array(size);
    for (let i = 0; i < size; i++) arr[i] = factory();
    return arr;
}
