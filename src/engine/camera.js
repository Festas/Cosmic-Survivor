// camera.js — smooth follow camera with trauma-based screen shake.
//
// The shake is deliberately subtle: a full-trauma hit nudges the view only a few
// pixels so impacts still register as a faint "kick" without the jarring,
// distracting lurch of a heavy screen shake. Tune SHAKE_AMPLITUDE to taste.

import { clamp, damp } from './utils.js';
import { ARENA } from '../game/config.js';

// Peak shake offset in world px at full trauma. Kept small on purpose so the
// shake reads as a gentle, minimal kick rather than a distracting lurch.
const SHAKE_AMPLITUDE = 7;

export class Camera {
  constructor(viewW, viewH) {
    this.x = ARENA.w / 2;
    this.y = ARENA.h / 2;
    this.w = viewW;
    this.h = viewH;
    this.trauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.zoom = 1;
    this._seed = Math.random() * 1000;
  }

  resize(w, h) { this.w = w; this.h = h; }

  addTrauma(amount) {
    this.trauma = clamp(this.trauma + amount / 20, 0, 1);
  }

  follow(tx, ty, dt) {
    this.x = damp(this.x, tx, 0.0008, dt);
    this.y = damp(this.y, ty, 0.0008, dt);
    // keep camera inside arena where possible
    const halfW = this.w / 2 / this.zoom;
    const halfH = this.h / 2 / this.zoom;
    if (ARENA.w > this.w / this.zoom) this.x = clamp(this.x, halfW, ARENA.w - halfW);
    if (ARENA.h > this.h / this.zoom) this.y = clamp(this.y, halfH, ARENA.h - halfH);

    const shake = this.trauma * this.trauma;
    const t = performance.now() / 1000;
    this.shakeX = (Math.sin(t * 47 + this._seed) + Math.sin(t * 31)) * 0.5 * shake * SHAKE_AMPLITUDE;
    this.shakeY = (Math.cos(t * 41 + this._seed) + Math.sin(t * 29)) * 0.5 * shake * SHAKE_AMPLITUDE;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
  }

  // Apply the camera transform to a canvas context (already DPR-scaled).
  begin(ctx) {
    ctx.save();
    ctx.translate(this.w / 2, this.h / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-(this.x + this.shakeX), -(this.y + this.shakeY));
  }

  end(ctx) { ctx.restore(); }

  worldToScreen(wx, wy) {
    return {
      x: (wx - (this.x + this.shakeX)) * this.zoom + this.w / 2,
      y: (wy - (this.y + this.shakeY)) * this.zoom + this.h / 2,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.w / 2) / this.zoom + this.x + this.shakeX,
      y: (sy - this.h / 2) / this.zoom + this.y + this.shakeY,
    };
  }

  // Visible world rectangle (with margin) for culling / spawn placement.
  viewBounds(margin = 0) {
    const halfW = this.w / 2 / this.zoom + margin;
    const halfH = this.h / 2 / this.zoom + margin;
    return { minX: this.x - halfW, minY: this.y - halfH, maxX: this.x + halfW, maxY: this.y + halfH };
  }
}
