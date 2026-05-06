/**
 * js/core/camera.js — Camera class (§9 entity peeling, Part 5)
 * 
 * Wraps game camera state and update logic currently in game.camera / updateCamera().
 * The renderer's beginFrame(camera) already accepts {x, y, rotation, zoom}.
 * Camera.getTransform() returns exactly that shape.
 */

export class Camera {
    constructor(worldWidth, worldHeight, canvasWidth, canvasHeight) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.shake = 0;
        this.rotation = 0;
        this.zoom = 1;
    }

    applyTrauma(amount) {
        // Trauma-model shake: amount is 0..1
        this.shake = Math.min(1, this.shake + amount * 25); // normalize to legacy shake scale
    }

    update(dt, target) {
        if (target) {
            this.targetX = target.x - this.canvasWidth / 2;
            this.targetY = target.y - this.canvasHeight / 2;
            this.targetX = Math.max(0, Math.min(this.worldWidth - this.canvasWidth, this.targetX));
            this.targetY = Math.max(0, Math.min(this.worldHeight - this.canvasHeight, this.targetY));
            this.x += (this.targetX - this.x) * 0.08;
            this.y += (this.targetY - this.y) * 0.08;
        }
        if (this.shake > 0) {
            this.offsetX = (Math.random() - 0.5) * this.shake;
            this.offsetY = (Math.random() - 0.5) * this.shake;
            this.shake *= 0.9;
            if (this.shake < 0.1) {
                this.shake = 0;
                this.offsetX = 0;
                this.offsetY = 0;
            }
        }
    }

    getTransform() {
        return { x: this.x, y: this.y, rotation: this.rotation, zoom: this.zoom };
    }

    reset() {
        this.x = 0; this.y = 0; this.targetX = 0; this.targetY = 0;
        this.offsetX = 0; this.offsetY = 0; this.shake = 0;
        this.rotation = 0; this.zoom = 1;
    }
}

if (typeof window !== 'undefined') {
    window.Camera = Camera;
}
