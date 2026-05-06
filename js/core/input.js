/**
 * js/core/input.js — Input handler factory (§9 entity peeling, Part 5)
 *
 * Exports: installInputHandlers(canvas, opts) → inputState
 *
 * Returns an inputState object with the same shape main.js currently reads:
 *   inputState.keys — keyboard key state map
 *   inputState.mouse — {x, y, buttons}
 *   inputState.touch — {active, joystick: {x, y, active, startX, startY}}
 *   inputState.gamepad — null (for future use)
 *
 * window.inputState = inputState for backward compat.
 */

export function installInputHandlers(canvas, opts = {}) {
    const inputState = {
        keys: {},
        mouse: { x: 0, y: 0, buttons: 0 },
        touch: { active: false, joystick: { x: 0, y: 0, active: false, startX: 0, startY: 0 } },
        gamepad: null,
    };

    // Keyboard
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('keydown', e => { inputState.keys[e.key] = true; });
        window.addEventListener('keyup', e => { inputState.keys[e.key] = false; });
    }

    // Touch (joystick)
    if (canvas && typeof canvas.addEventListener === 'function') {
        const getPos = (touch) => {
            const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
            const scaleX = canvas.width ? (canvas.width / rect.width) : 1;
            const scaleY = canvas.height ? (canvas.height / rect.height) : 1;
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            };
        };

        let joystickTouchId = null;
        const canvasHeight = opts.canvasHeight ?? (canvas.height ?? 800);

        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                const pos = getPos(touch);
                if (!inputState.touch.joystick.active && pos.y > canvasHeight * 0.3) {
                    joystickTouchId = touch.identifier;
                    inputState.touch.joystick.active = true;
                    inputState.touch.active = true;
                    inputState.touch.joystick.startX = pos.x;
                    inputState.touch.joystick.startY = pos.y;
                }
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                if (touch.identifier !== joystickTouchId) continue;
                if (!inputState.touch.joystick.active) continue;
                const pos = getPos(touch);
                const dx = pos.x - inputState.touch.joystick.startX;
                const dy = pos.y - inputState.touch.joystick.startY;
                const dist = Math.hypot(dx, dy);
                const maxDist = 60;
                const clamp = Math.min(dist, maxDist);
                if (dist > 0) {
                    inputState.touch.joystick.x = (dx / dist) * (clamp / maxDist);
                    inputState.touch.joystick.y = (dy / dist) * (clamp / maxDist);
                }
            }
        }, { passive: false });

        const endTouch = (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === joystickTouchId) {
                    inputState.touch.joystick.active = false;
                    inputState.touch.joystick.x = 0;
                    inputState.touch.joystick.y = 0;
                    joystickTouchId = null;
                }
            }
            if (!inputState.touch.joystick.active) inputState.touch.active = false;
        };

        canvas.addEventListener('touchend', endTouch);
        canvas.addEventListener('touchcancel', () => {
            inputState.touch.joystick.active = false;
            inputState.touch.joystick.x = 0;
            inputState.touch.joystick.y = 0;
            inputState.touch.active = false;
            joystickTouchId = null;
        });
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.inputState = inputState;
    }

    return inputState;
}
