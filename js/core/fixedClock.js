// fixedClock.js — Phase 1 (Core Architecture)
//
// Fixed-timestep accumulator. The current `gameLoop` runs simulation +
// rendering at whatever rate `requestAnimationFrame` happens to fire, which
// makes physics, knockback impulses, and (eventually) rollback netcode
// non-deterministic across machines.
//
// This helper wraps the established "fixed update, variable render" pattern
// (Glenn Fiedler, "Fix Your Timestep!"). It is offered as a building block;
// `main.js` adoption is incremental — see REWORK.md.

const DEFAULT_DT = 1 / 60;       // simulation tick (seconds)
const MAX_FRAME_DT = 0.25;       // clamp huge spikes (tab unfreeze, breakpoint)

export class FixedClock {
    /**
     * @param {{ stepSeconds?: number, maxFrameSeconds?: number }} [opts]
     */
    constructor(opts = {}) {
        this.stepSeconds = opts.stepSeconds ?? DEFAULT_DT;
        this.maxFrameSeconds = opts.maxFrameSeconds ?? MAX_FRAME_DT;
        this._accumulator = 0;
        this._lastTimestamp = 0;
        this._tick = 0;
    }

    /**
     * Drive the clock from rAF. Returns:
     *   { steps: integer number of fixed updates to run this frame,
     *     alpha: render interpolation factor in [0, 1) }
     * @param {number} timestampMs
     */
    advance(timestampMs) {
        if (this._lastTimestamp === 0) {
            this._lastTimestamp = timestampMs;
            return { steps: 0, alpha: 0 };
        }
        let dt = (timestampMs - this._lastTimestamp) / 1000;
        this._lastTimestamp = timestampMs;
        if (dt > this.maxFrameSeconds) dt = this.maxFrameSeconds;
        this._accumulator += dt;

        // Cap steps per frame to avoid the spiral of death (sim falling
        // behind real time, accumulating more work than it can ever catch up).
        let steps = 0;
        const maxSteps = 5;
        while (this._accumulator >= this.stepSeconds && steps < maxSteps) {
            this._accumulator -= this.stepSeconds;
            steps++;
            this._tick++;
        }
        if (this._accumulator > this.stepSeconds * maxSteps) {
            // Discard accumulated time we couldn't process; better to skip
            // than to freeze the tab.
            this._accumulator = 0;
        }
        const alpha = this._accumulator / this.stepSeconds;
        return { steps, alpha };
    }

    /** Monotonic simulation tick counter — useful as a deterministic key. */
    get tick() { return this._tick; }

    /** Reset clock state (e.g. on new run). */
    reset() {
        this._accumulator = 0;
        this._lastTimestamp = 0;
        this._tick = 0;
    }
}
