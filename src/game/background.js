// background.js — parallax starfield and drifting nebula, rendered in screen space.

import { rand, randRange, TAU } from '../engine/utils.js';
import { glowSprite } from '../engine/sprites.js';
import { COLORS } from './config.js';

export class Background {
  constructor() {
    this.layers = [];
    const counts = [90, 60, 36];
    const depths = [0.15, 0.35, 0.6];
    const sizes = [0.7, 1.2, 1.9];
    for (let l = 0; l < counts.length; l++) {
      const stars = [];
      for (let i = 0; i < counts[l]; i++) {
        stars.push({ x: rand() * 2000, y: rand() * 2000, s: sizes[l] * (0.6 + rand()), tw: rand() * TAU });
      }
      this.layers.push({ stars, depth: depths[l] });
    }
    this.nebulae = [];
    const cols = ['rgba(80,60,180,0.20)', 'rgba(180,60,140,0.16)', 'rgba(40,120,180,0.16)'];
    for (let i = 0; i < 3; i++) {
      this.nebulae.push({ x: rand() * 1600, y: rand() * 1200, r: randRange(320, 560), color: cols[i], depth: 0.08 + i * 0.03 });
    }
    this.t = 0;
  }

  update(dt) { this.t += dt; }

  render(ctx, cam, w, h) {
    // base vertical gradient
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, COLORS.bg1);
    g.addColorStop(1, COLORS.bg0);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // nebula blobs (pre-baked to sprites so we avoid rebuilding radial
    // gradients — 9 tiles x 3 nebulae — on every single frame)
    ctx.globalCompositeOperation = 'lighter';
    for (const n of this.nebulae) {
      const spr = glowSprite('neb|' + n.r.toFixed(0) + '|' + n.color, n.r, 0, (g) => {
        const grd = g.createRadialGradient(0, 0, 0, 0, 0, n.r);
        grd.addColorStop(0, n.color);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.beginPath(); g.arc(0, 0, n.r, 0, TAU); g.fill();
      });
      const ox = -(cam.x * n.depth) % (w + n.r * 2);
      const oy = -(cam.y * n.depth) % (h + n.r * 2);
      for (let gx = -1; gx <= 1; gx++) {
        for (let gy = -1; gy <= 1; gy++) {
          const cx = ((n.x + ox) % (w + n.r * 2)) + gx * (w + n.r * 2);
          const cy = ((n.y + oy) % (h + n.r * 2)) + gy * (h + n.r * 2);
          if (spr) {
            ctx.drawImage(spr.canvas, cx - spr.off, cy - spr.off);
          } else {
            const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, n.r);
            grd.addColorStop(0, n.color);
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grd;
            ctx.fillRect(cx - n.r, cy - n.r, n.r * 2, n.r * 2);
          }
        }
      }
    }

    // parallax stars (wrapped across the viewport)
    for (const layer of this.layers) {
      const ox = -(cam.x * layer.depth);
      const oy = -(cam.y * layer.depth);
      for (const st of layer.stars) {
        let sx = (st.x + ox) % w; if (sx < 0) sx += w;
        let sy = (st.y + oy) % h; if (sy < 0) sy += h;
        const tw = 0.5 + Math.sin(this.t * 2 + st.tw) * 0.5;
        ctx.globalAlpha = 0.35 + tw * 0.5;
        ctx.fillStyle = '#cfe4ff';
        ctx.fillRect(sx, sy, st.s, st.s);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
