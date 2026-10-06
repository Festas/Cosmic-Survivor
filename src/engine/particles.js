// particles.js — pooled particle system with additive glow support.

import { glowSprite } from './sprites.js';

const TAU = Math.PI * 2;
// Radius the reusable dot sprite is baked at. Particles are drawn by blitting a
// scaled copy of this cached disc, so most dots downscale (staying crisp) while
// the occasional large smoke puff upscales a little (acceptable for a glow).
const DOT_R = 12;

export class Particles {
  constructor(max = 2000) {
    this.max = max;
    this.pool = [];
    this.active = [];
    // Per-colour cache of baked disc sprites (value may be null when offscreen
    // canvases are unavailable, e.g. in the Node unit-test environment).
    this._dots = new Map();
    // Per-frame memoisation of the drag falloff, which is identical for every
    // particle sharing a drag coefficient — avoids thousands of Math.pow calls.
    this._dragCache = new Map();
    this._dragK = -1;
    for (let i = 0; i < max; i++) {
      this.pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0.9, grav: 0, additive: true, spin: 0, shape: 'dot' });
    }
  }

  // Fetch (or lazily bake) the disc sprite for a colour. Keyed off the instance
  // Map so the hot render loop never rebuilds the sprite key string per particle.
  _dotFor(color) {
    let spr = this._dots.get(color);
    if (spr === undefined) {
      spr = glowSprite('pdot|' + color, DOT_R, 0, (g) => {
        g.fillStyle = color;
        g.beginPath(); g.arc(0, 0, DOT_R, 0, TAU); g.fill();
      });
      this._dots.set(color, spr);
    }
    return spr;
  }

  spawn(x, y, color, opts = {}) {
    // Backpressure: low-priority cosmetic effects (trails, hit sparks) pass a
    // `budget` and yield when the pool is nearly drained, so important bursts
    // (deaths, implosions, reactions) always have room and the render loop never
    // churns through a fully-saturated pool — the dominant boss-fight cost.
    if (opts.budget !== undefined && this.pool.length <= opts.budget) return null;
    const p = this.pool.pop();
    if (!p) return null;
    const speed = opts.speed ?? 120;
    const ang = opts.angle ?? Math.random() * Math.PI * 2;
    const spd = typeof speed === 'number' ? speed * (0.4 + Math.random() * 0.6) : speed;
    p.x = x; p.y = y;
    p.vx = opts.vx ?? Math.cos(ang) * spd;
    p.vy = opts.vy ?? Math.sin(ang) * spd;
    p.maxLife = p.life = opts.life ?? (0.4 + Math.random() * 0.4);
    p.size = opts.size ?? (1.5 + Math.random() * 2.5);
    p.color = color;
    p.drag = opts.drag ?? 0.86;
    p.grav = opts.grav ?? 0;
    p.additive = opts.additive ?? true;
    p.shape = opts.shape ?? 'dot';
    p.spin = Math.random() * Math.PI;
    this.active.push(p);
    return p;
  }

  burst(x, y, color, count, opts = {}) {
    for (let i = 0; i < count; i++) if (!this.spawn(x, y, color, opts)) break;
  }

  update(dt) {
    // The drag falloff pow(drag, dt*60) depends only on dt and the particle's
    // drag coefficient (a handful of distinct values), so memoise it per frame.
    const k = dt * 60;
    const cache = this._dragCache;
    if (k !== this._dragK) { cache.clear(); this._dragK = k; }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.active.splice(i, 1);
        this.pool.push(p);
        continue;
      }
      p.vy += p.grav * dt;
      let d = cache.get(p.drag);
      if (d === undefined) { d = Math.pow(p.drag, k); cache.set(p.drag, d); }
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  render(ctx, bounds = null) {
    ctx.save();
    let additive = false;
    const minX = bounds ? bounds.minX : 0, maxX = bounds ? bounds.maxX : 0;
    const minY = bounds ? bounds.minY : 0, maxY = bounds ? bounds.maxY : 0;
    for (const p of this.active) {
      if (bounds && (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY)) continue;
      const t = p.life / p.maxLife;
      if (p.additive && !additive) { ctx.globalCompositeOperation = 'lighter'; additive = true; }
      else if (!p.additive && additive) { ctx.globalCompositeOperation = 'source-over'; additive = false; }
      ctx.globalAlpha = Math.min(1, t * 1.4);
      const s = p.size * (0.3 + t * 0.7);
      if (p.shape === 'spark') {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillRect(-s * 2, -s * 0.4, s * 4, s * 0.8);
        ctx.restore();
      } else {
        // Blit a cached disc instead of building an arc path and re-parsing the
        // fill colour every particle — the dominant render cost at high counts.
        const spr = this._dotFor(p.color);
        if (spr) {
          const sc = s / DOT_R;
          const full = spr.canvas.width * sc;
          ctx.drawImage(spr.canvas, p.x - spr.off * sc, p.y - spr.off * sc, full, full);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  clear() {
    while (this.active.length) this.pool.push(this.active.pop());
  }

  get count() { return this.active.length; }
}
