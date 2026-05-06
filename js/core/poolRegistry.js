// poolRegistry.js — Phase 1 (Core Architecture & Optimization)
//
// Lightweight registry so any module (e.g. the debug overlay) can enumerate
// every ObjectPool created at boot without needing direct references.
// Pools are registered by name; `listPools()` returns a snapshot of their
// current stats for display / monitoring.

/** @type {Map<string, import('./objectPool.js').ObjectPool<any>>} */
const _pools = new Map();

/**
 * Register an ObjectPool under a display name.
 * Safe to call with `null` (no-op).
 * @param {string} name
 * @param {import('./objectPool.js').ObjectPool<any> | null} pool
 */
export function registerPool(name, pool) {
    if (pool == null) return;
    _pools.set(name, pool);
}

/**
 * Return a snapshot array of `{ name, inUse, cap, exhaustEvents }` for every
 * registered pool.
 * @returns {{ name: string, inUse: number, cap: number, exhaustEvents: number }[]}
 */
export function listPools() {
    const result = [];
    for (const [name, pool] of _pools) {
        try {
            const s = pool.stats();
            result.push({
                name,
                inUse: s.inUse,
                cap: s.maxSize,
                exhaustEvents: s.exhaustEvents,
            });
        } catch {
            // pool was drained / removed — skip
        }
    }
    return result;
}
