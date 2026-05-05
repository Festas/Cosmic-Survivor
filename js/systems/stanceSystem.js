// stanceSystem.js — Phase 4 (Active/Passive Stance Switching)
//
// Gives players a *mechanical* reason to stop moving. The rework brief asks
// for "increased damage/defense when standing still vs. resource gathering
// when moving" — implemented here as two stances:
//
//   MOVING : pickup magnetism range x2, +5% movement speed, normal damage.
//   FOCUS  : engaged after `FOCUS_CHARGE_FRAMES` of standing still. Grants
//            +20% damage, +15% damage reduction, +50% crit chance bonus,
//            but disables the magnetism boost and adds a small fire-rate
//            penalty (-10%) so it isn't a pure DPS upgrade — it's a stance
//            choice.
//
// The system is a pure modifier provider: it inspects player.isMoving each
// frame and exposes multipliers that other systems may apply. It does NOT
// reach into the Player class internals.

import { gameBus } from '../core/eventBus.js';

const FOCUS_CHARGE_FRAMES = 30;       // ~0.5s at 60fps
const FOCUS_DECAY_FRAMES  = 12;       // grace before stance breaks

export const Stance = Object.freeze({
    MOVING: 'moving',
    FOCUS:  'focus',
});

const FOCUS_MODS = Object.freeze({
    damageMultiplier:    1.20,
    defenseMultiplier:   0.85, // taken-damage multiplier (lower = better)
    fireRateMultiplier:  1.10, // higher fireRate = slower attacks (it's a cooldown)
    critChanceBonus:     0.05,
    pickupRangeBonus:    1.0,  // unchanged
    moveSpeedMultiplier: 1.0,
});

const MOVING_MODS = Object.freeze({
    damageMultiplier:    1.0,
    defenseMultiplier:   1.0,
    fireRateMultiplier:  1.0,
    critChanceBonus:     0,
    pickupRangeBonus:    2.0,  // doubled magnetism while moving
    moveSpeedMultiplier: 1.05,
});

export class StanceSystem {
    constructor() {
        this._currentStance = Stance.MOVING;
        this._stillFrames = 0;
        this._movingGrace = 0;
        // 0..1 progress toward Focus while charging up.
        this.focusCharge = 0;
    }

    /**
     * Update stance based on whether the local player moved this frame.
     * Call from the player update path.
     * @param {boolean} isMoving
     */
    update(isMoving) {
        if (isMoving) {
            this._stillFrames = 0;
            // Allow a brief grace window before kicking out of FOCUS so a
            // single nudge from knockback / accidental tap doesn't break
            // the stance and frustrate the player.
            if (this._currentStance === Stance.FOCUS) {
                this._movingGrace++;
                if (this._movingGrace >= FOCUS_DECAY_FRAMES) {
                    this._setStance(Stance.MOVING);
                    this._movingGrace = 0;
                }
            } else {
                this.focusCharge = 0;
            }
        } else {
            this._movingGrace = 0;
            this._stillFrames++;
            this.focusCharge = Math.min(1, this._stillFrames / FOCUS_CHARGE_FRAMES);
            if (this._stillFrames >= FOCUS_CHARGE_FRAMES &&
                this._currentStance !== Stance.FOCUS) {
                this._setStance(Stance.FOCUS);
            }
        }
    }

    _setStance(next) {
        if (this._currentStance === next) return;
        const prev = this._currentStance;
        this._currentStance = next;
        gameBus.emit('stance:changed', { prev, next });
    }

    /** Read-only stance. */
    get stance() { return this._currentStance; }
    get isFocused() { return this._currentStance === Stance.FOCUS; }

    /** Frozen modifier object for the *current* stance. */
    get modifiers() {
        return this._currentStance === Stance.FOCUS ? FOCUS_MODS : MOVING_MODS;
    }

    /** Hard reset (e.g. on new run). */
    reset() {
        this._currentStance = Stance.MOVING;
        this._stillFrames = 0;
        this._movingGrace = 0;
        this.focusCharge = 0;
    }
}

// Default singleton — most callers want one shared instance.
export const stanceSystem = new StanceSystem();
