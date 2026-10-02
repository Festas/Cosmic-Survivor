// particles.js — pooled particle system with additive glow support.

export class Particles {
  constructor(max = 2000) {
    this.max = max;
    this.pool = [];
    this.active = [];
    for (let i = 0; i < max; i++) {
      this.pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0.9, grav: 0, additive: true, spin: 0, shape: 'dot' });
    }
  }

  spawn(x, y, color, opts = {}) {
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
    for (let i = 0; i < count; i++) this.spawn(x, y, color, opts);
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.active.splice(i, 1);
        this.pool.push(p);
        continue;
      }
      p.vy += p.grav * dt;
      const d = Math.pow(p.drag, dt * 60);
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
      ctx.fillStyle = p.color;
      const s = p.size * (0.3 + t * 0.7);
      if (p.shape === 'spark') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillRect(-s * 2, -s * 0.4, s * 4, s * 0.8);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
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
