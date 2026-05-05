// juice.js — Phase 2 (Visual Overhaul & "Juice")
//
// Three small, focused systems that together add the "feel" upgrades the
// rework brief asks for:
//
//   1. TraumaShake  — Squirrel Eiserloh's trauma model. Trauma is squared
//                      before being applied to amplitude, which produces the
//                      satisfying "small hits feel small, big hits feel big"
//                      curve that simple linear shake systems lack.
//   2. HitStop      — Pauses gameplay sim for N ms on crits / boss kills /
//                      player deaths to let the impact register visually.
//   3. HitFlash     — Full-screen colour pulse on player damage and
//                      level-ups. Renders directly to a 2D context.
//
// All three are intentionally framework-agnostic so they can be ported as-is
// to the future PixiJS pipeline (Phase 2 of the migration roadmap).

import { gameBus } from '../core/eventBus.js';

// ===== TraumaShake ===========================================================

const MAX_TRAUMA = 1.0;
const TRAUMA_DECAY_PER_SECOND = 1.4;     // higher = shorter shakes
const MAX_OFFSET_PIXELS = 18;            // hard cap on shake amplitude
const MAX_ROTATION_RADIANS = 0.05;

export class TraumaShake {
    constructor() {
        this._trauma = 0;
        this._t = 0; // animated noise time
        this.offsetX = 0;
        this.offsetY = 0;
        this.rotation = 0;
        // Scale applied to all amplitudes — driven by the user-facing
        // "screen shake intensity" setting (0 = off, 1 = default).
        this.intensity = 1.0;
    }

    /**
     * Add trauma. `amount` is normalised so callers don't need to know about
     * the internal squared curve — a value of 1 ≈ "felt this loud and clear",
     * 0.3 ≈ "soft tap". Repeated calls clamp at MAX_TRAUMA.
     * @param {number} amount
     */
    add(amount) {
        if (amount <= 0) return;
        this._trauma = Math.min(MAX_TRAUMA, this._trauma + amount);
    }

    /**
     * Advance the shake by `dt` seconds. Updates `offsetX/Y/rotation` in
     * place; callers translate/rotate their canvas with these values.
     */
    update(dt) {
        if (this._trauma <= 0) {
            this.offsetX = this.offsetY = this.rotation = 0;
            return;
        }
        this._t += dt;
        const shake = this._trauma * this._trauma * this.intensity;
        // Cheap pseudo-noise — independent X / Y / rotation channels.
        // Triple-frequency sin chain is good enough and avoids the cost of
        // a real Perlin/Simplex sampler in the hot loop.
        this.offsetX = MAX_OFFSET_PIXELS * shake * pseudoNoise(this._t * 31, 1);
        this.offsetY = MAX_OFFSET_PIXELS * shake * pseudoNoise(this._t * 31, 2);
        this.rotation = MAX_ROTATION_RADIANS * shake * pseudoNoise(this._t * 31, 3);
        this._trauma -= TRAUMA_DECAY_PER_SECOND * dt;
        if (this._trauma < 0) this._trauma = 0;
    }

    /** Read-only view of current trauma — exposed for HUD diagnostics. */
    get trauma() { return this._trauma; }
}

function pseudoNoise(t, seed) {
    // Sum of three incommensurate sines mapped to [-1, 1].
    return (
        Math.sin(t + seed * 1.3) * 0.5 +
        Math.sin(t * 2.13 + seed * 7.7) * 0.3 +
        Math.sin(t * 4.07 + seed * 19.1) * 0.2
    );
}

// ===== HitStop ===============================================================
//
// HitStop pauses *simulation* for a short window without freezing rendering.
// `consume(dt)` returns the time delta that the simulation should actually
// advance — zero while we're inside a hit-stop window. The render layer keeps
// using its real dt so animations (shake, flash, particles) stay smooth.

export class HitStop {
    constructor() {
        this._remainingMs = 0;
    }

    /** Schedule a hit-stop. New requests *extend* but never *shorten*. */
    trigger(durationMs) {
        if (durationMs > this._remainingMs) this._remainingMs = durationMs;
        gameBus.emit('hitstop:trigger', { durationMs });
    }

    /**
     * Returns the *adjusted* simulation dt for this frame and decrements the
     * remaining budget. Always non-negative.
     */
    consume(dtMs) {
        if (this._remainingMs <= 0) return dtMs;
        const skipped = Math.min(dtMs, this._remainingMs);
        this._remainingMs -= skipped;
        return dtMs - skipped;
    }

    /** True when sim should be halted this frame. */
    get isActive() { return this._remainingMs > 0; }
}

// ===== HitFlash ==============================================================
//
// Screen-space colour overlay. Used for player-damage red pulses and
// level-up white pulses. Renders the cheapest possible quad onto the supplied
// context after the world is drawn.

export class HitFlash {
    constructor() {
        /** @type {{ color: string, intensity: number, decayPerSec: number }[]} */
        this._flashes = [];
    }

    /**
     * Add a flash. `peakAlpha` in [0, 1]; `durationMs` is the fade-out time.
     */
    pulse(color, peakAlpha = 0.4, durationMs = 250) {
        if (peakAlpha <= 0 || durationMs <= 0) return;
        this._flashes.push({
            color,
            intensity: Math.min(1, peakAlpha),
            decayPerSec: peakAlpha / (durationMs / 1000),
        });
    }

    /** Decay all active flashes. */
    update(dtSeconds) {
        for (let i = this._flashes.length - 1; i >= 0; i--) {
            const f = this._flashes[i];
            f.intensity -= f.decayPerSec * dtSeconds;
            if (f.intensity <= 0) this._flashes.splice(i, 1);
        }
    }

    /**
     * Draw all active flashes. Caller is responsible for setting up the
     * untransformed (screen-space) canvas state before invoking.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} width
     * @param {number} height
     */
    draw(ctx, width, height) {
        if (this._flashes.length === 0) return;
        ctx.save();
        for (let i = 0; i < this._flashes.length; i++) {
            const f = this._flashes[i];
            ctx.globalAlpha = f.intensity;
            ctx.fillStyle = f.color;
            ctx.fillRect(0, 0, width, height);
        }
        ctx.restore();
    }

    clear() { this._flashes.length = 0; }
}

// ===== Default singletons ===================================================
//
// Most callers want one shared instance per system; keep them here so
// `main.js` can `import { juice }` and not juggle wiring.

export const juice = {
    shake: new TraumaShake(),
    hitStop: new HitStop(),
    flash: new HitFlash(),

    /** Convenience: wire up to a fixed-rate update. */
    update(dtSeconds) {
        this.shake.update(dtSeconds);
        this.flash.update(dtSeconds);
    },
};
