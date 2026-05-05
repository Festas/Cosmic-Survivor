// rng.js — Phase 1 (Core Architecture)
//
// Deterministic pseudo-random number generator. The current game uses
// `Math.random()` everywhere, which prevents:
//   - reproducible runs (daily challenges, replays, bug reports)
//   - rollback-style multiplayer (Phase 6) where every client must arrive at
//     the same simulation result for the same input frame
//
// `xoshiro128**` is a fast, well-distributed, non-cryptographic PRNG with a
// 2^128 - 1 period. It's roughly the modern default for game determinism.

/**
 * @param {number} a 32-bit seed component (use a fixed quartet of integers
 *   derived from a string seed for reproducibility).
 * @param {number} b
 * @param {number} c
 * @param {number} d
 */
export class XoshiroRng {
    constructor(a, b, c, d) {
        // Avoid the all-zero initial state; xoshiro requires non-zero seeds.
        if ((a | b | c | d) === 0) a = 0x9e3779b9;
        this._a = a >>> 0;
        this._b = b >>> 0;
        this._c = c >>> 0;
        this._d = d >>> 0;
    }

    /** Raw 32-bit unsigned integer in [0, 2^32). */
    nextUint32() {
        const t = (this._b << 9) >>> 0;
        let r = Math.imul(this._a, 5);
        r = (((r << 7) | (r >>> 25)) >>> 0);
        r = Math.imul(r, 9) >>> 0;
        this._c ^= this._a;
        this._d ^= this._b;
        this._b ^= this._c;
        this._a ^= this._d;
        this._c ^= t;
        this._d = ((this._d << 11) | (this._d >>> 21)) >>> 0;
        return r;
    }

    /** Float in [0, 1) — drop-in for Math.random(). */
    next() {
        return this.nextUint32() / 0x100000000;
    }

    /** Float in [min, max). */
    range(min, max) {
        return min + this.next() * (max - min);
    }

    /** Integer in [min, max] inclusive. */
    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }

    /** Boolean true with probability `p`. */
    chance(p) {
        return this.next() < p;
    }

    /** Pick a uniformly random element of an array. Returns undefined if empty. */
    pick(arr) {
        if (!arr || arr.length === 0) return undefined;
        return arr[Math.floor(this.next() * arr.length)];
    }

    /** Snapshot of current state — needed by rollback netcode. */
    save() {
        return [this._a, this._b, this._c, this._d];
    }

    /** Restore state captured by `save()`. */
    load(state) {
        this._a = state[0] >>> 0;
        this._b = state[1] >>> 0;
        this._c = state[2] >>> 0;
        this._d = state[3] >>> 0;
    }
}

/**
 * Derive four 32-bit seed components from a string. Uses a tiny FNV-1a so the
 * mapping is stable across browsers/Node.
 * @param {string} str
 */
export function seedFromString(str) {
    let h = 0x811c9dc5 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    // Splatter into four words via xorshift.
    const a = h;
    let x = h || 1;
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    const b = x;
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    const c = x;
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    const d = x;
    return [a, b, c, d];
}

/** Convenience: build a seeded RNG directly from a string seed. */
export function rngFromSeed(seed) {
    const [a, b, c, d] = seedFromString(String(seed));
    return new XoshiroRng(a, b, c, d);
}
