// eventBus.js — Phase 1 (Core Architecture)
//
// A small zero-dependency typed event bus. The existing code uses ad-hoc
// callbacks (e.g. `multiplayer-client.js` exposes a few `on*` setters). This
// module gives new systems (stance, weather, juice) a single place to publish
// gameplay events without coupling them to each other or to `main.js`.
//
// Listener errors are swallowed and reported to console so a buggy subscriber
// never breaks the publishing system mid-frame.

export class EventBus {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this._listeners = new Map();
    }

    /**
     * Subscribe to a named event. Returns an unsubscribe function so callers
     * never have to keep a reference to the listener.
     * @param {string} event
     * @param {(payload: any) => void} listener
     * @returns {() => void}
     */
    on(event, listener) {
        if (typeof listener !== 'function') throw new TypeError('EventBus.on: listener must be a function');
        let set = this._listeners.get(event);
        if (!set) {
            set = new Set();
            this._listeners.set(event, set);
        }
        set.add(listener);
        return () => set.delete(listener);
    }

    /**
     * Subscribe for one event then auto-unsubscribe.
     * @param {string} event
     * @param {(payload: any) => void} listener
     */
    once(event, listener) {
        const off = this.on(event, (p) => {
            off();
            listener(p);
        });
        return off;
    }

    /**
     * Remove a specific listener. Prefer the unsubscribe function returned by
     * `on`; this exists for symmetry.
     */
    off(event, listener) {
        const set = this._listeners.get(event);
        if (set) set.delete(listener);
    }

    /**
     * Publish an event. Listener exceptions are isolated and logged so one
     * bad subscriber cannot break others.
     * @param {string} event
     * @param {any} [payload]
     */
    emit(event, payload) {
        const set = this._listeners.get(event);
        if (!set || set.size === 0) return;
        // Iterate over a snapshot so listeners may unsubscribe themselves
        // during dispatch without mutating-while-iterating.
        const snapshot = Array.from(set);
        for (let i = 0; i < snapshot.length; i++) {
            try {
                snapshot[i](payload);
            } catch (err) {
                // Surface but never propagate — gameplay must keep ticking.
                // eslint-disable-next-line no-console
                console.error(`[EventBus] listener for "${event}" threw:`, err);
            }
        }
    }

    /** Remove every listener for an event (or all events when omitted). */
    clear(event) {
        if (event === undefined) {
            this._listeners.clear();
        } else {
            this._listeners.delete(event);
        }
    }
}

// Default shared bus for gameplay-wide signals (stance changed, weather
// changed, hit-stop triggered, etc). Modules MAY create their own buses.
export const gameBus = new EventBus();
