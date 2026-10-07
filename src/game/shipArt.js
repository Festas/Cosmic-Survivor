// shipArt.js — the player's 3D-shaded starfighter (and its orbiting drones).
//
// Like enemyArt, this is pure 2D-canvas path work with no DOM lookups, so it runs
// against the real context, the offscreen sprite context (world.drawPlayer bakes
// the hull into a cached glow sprite), or a mock context in tests. The hull is
// baked once per ship colour / radius / hit-flash state and blitted every frame,
// so the layered gradients below are free per frame — the same trick the swarm
// uses. Every gradient call is feature-guarded with a flat-fill fallback so a
// minimal mock ctx without gradient factories still renders without throwing.
//
// The ship points toward +x (nose at +x, engines at -x) and is lit by the SAME
// upper-left key light as the mobs, for a unified volumetric look across the game.

import { TAU } from '../engine/utils.js';
import { shade, withAlpha } from './enemyArt.js';

// Swept-wing hull silhouette, as a top-half outline (nose → flat tail, y <= 0)
// in units of the radius r. The bottom half is the mirror, so the craft is always
// symmetric. Shared by the base fill, the clip for volumetric shading, and the
// crisp dark outline so every pass lines up exactly.
const HULL_TOP = [
  [1.5, 0.0],    // nose tip
  [0.45, -0.17], // forward fuselage shoulder
  [0.1, -0.2],   // wing leading-edge root
  [-0.5, -0.98], // wingtip (leading)
  [-0.72, -0.9], // wingtip (trailing)
  [-0.12, -0.3], // wing trailing-edge root
  [-0.9, -0.32], // rear hull shoulder
  [-0.9, 0.0],   // tail centre (flat vertical rear edge)
];

function shipHullPath(ctx, r) {
  const n = HULL_TOP.length;
  ctx.beginPath();
  ctx.moveTo(HULL_TOP[0][0] * r, HULL_TOP[0][1] * r);
  for (let i = 1; i < n; i++) ctx.lineTo(HULL_TOP[i][0] * r, HULL_TOP[i][1] * r);
  // Mirror the interior points back along the bottom (skip the shared nose/tail).
  for (let i = n - 2; i >= 1; i--) ctx.lineTo(HULL_TOP[i][0] * r, -HULL_TOP[i][1] * r);
  ctx.closePath();
}

// A soft bright dot with a tight glow — cockpit lights and engine ports. Mirrors
// enemyArt's `lamp`; the shadowBlur is baked into the sprite so it costs nothing
// per frame.
function lamp(ctx, x, y, rad, color, glow = color) {
  ctx.shadowColor = glow; ctx.shadowBlur = rad * 2.2;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
}

// Volumetric form shading, clipped to the hull: an upper-left directional form
// light, a tight specular hotspot, and a lower-right core-shadow / ambient
// occlusion. Same recipe (and the same upper-left key light) as the enemy hulls.
// All three gradient fills are feature-guarded, degrading to a no-op without them.
function shadeHull(ctx, r, fill) {
  ctx.save();
  shipHullPath(ctx, r);
  ctx.clip();
  const box = r * 1.75, d = box * 2;

  if (typeof ctx.createLinearGradient === 'function') {
    const lg = ctx.createLinearGradient(-box, -box, box, box);
    lg.addColorStop(0, withAlpha(shade(fill, 0.5), 0.8));
    lg.addColorStop(0.5, withAlpha(shade(fill, 0.5), 0));
    lg.addColorStop(1, withAlpha(shade(fill, -0.5), 0.8));
    ctx.fillStyle = lg;
    ctx.fillRect(-box, -box, d, d);
  }

  if (typeof ctx.createRadialGradient === 'function') {
    const hx = -r * 0.3, hy = -r * 0.5, hr = r * 1.15;
    const sg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
    sg.addColorStop(0, withAlpha('#ffffff', 0.5));
    sg.addColorStop(1, withAlpha('#ffffff', 0));
    ctx.fillStyle = sg;
    ctx.fillRect(-box, -box, d, d);
  }

  if (typeof ctx.createRadialGradient === 'function') {
    const sx = r * 0.15, sy = r * 0.55, sr = r * 1.6;
    const ag = ctx.createRadialGradient(sx, sy, r * 0.1, sx, sy, sr);
    ag.addColorStop(0, withAlpha('#000000', 0.3));
    ag.addColorStop(1, withAlpha('#000000', 0));
    ctx.fillStyle = ag;
    ctx.fillRect(-box, -box, d, d);
  }

  ctx.restore();
}

// Bright rim light on the lit (upper-left) edge. The wide stroke is clipped to the
// hull so only its inner half shows, and faded across the body so the shadowed
// lower-right keeps its crisp edge. Flat-stroke fallback without gradients.
function rimHull(ctx, r, fill) {
  const rim = shade(fill, 0.6);
  ctx.save();
  shipHullPath(ctx, r);
  ctx.clip();
  shipHullPath(ctx, r);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, r * 0.3);
  if (typeof ctx.createLinearGradient === 'function') {
    const lg = ctx.createLinearGradient(-r, -r, r, r);
    lg.addColorStop(0, withAlpha(rim, 0.6));
    lg.addColorStop(0.5, withAlpha(rim, 0));
    lg.addColorStop(1, withAlpha(rim, 0));
    ctx.strokeStyle = lg;
  } else {
    ctx.strokeStyle = withAlpha(rim, 0.4);
  }
  ctx.stroke();
  ctx.restore();
}

// Trapezoidal engine nacelle (flares wider toward the rear) as a filled path.
function podPath(ctx, xBack, xFront, y, hBack, hFront) {
  ctx.beginPath();
  ctx.moveTo(xFront, y - hFront * 0.5);
  ctx.lineTo(xBack, y - hBack * 0.5);
  ctx.lineTo(xBack, y + hBack * 0.5);
  ctx.lineTo(xFront, y + hFront * 0.5);
  ctx.closePath();
}

// Twin engine nacelles flanking the tail. Drawn behind the hull (their front ends
// tuck under it) so the rear pods read as separate 3D engine housings. The glowing
// exhaust ports are drawn separately, last, so they stay crisp on top.
function drawNacelles(ctx, r, accent, highlight, flash) {
  const pod = flash ? '#ffffff' : accent;
  for (const s of [-1, 1]) {
    const y = s * r * 0.26;
    const xBack = -1.25 * r, xFront = -0.6 * r, hBack = r * 0.34, hFront = r * 0.22;
    podPath(ctx, xBack, xFront, y, hBack, hFront);
    ctx.fillStyle = pod;
    ctx.fill();
    // Lit upper bevel then the crisp dark outline for depth + readability.
    podPath(ctx, xBack, xFront, y, hBack, hFront);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.strokeStyle = withAlpha(highlight, 0.45);
    ctx.stroke();
    podPath(ctx, xBack, xFront, y, hBack, hFront);
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.strokeStyle = 'rgba(4,7,18,0.85)';
    ctx.stroke();
  }
}

// Glowing exhaust ports at the back of each nacelle — drawn last so the bloom is
// crisp over the hull.
function drawEnginePorts(ctx, r) {
  for (const s of [-1, 1]) {
    const y = s * r * 0.26;
    lamp(ctx, -1.18 * r, y, Math.max(1, r * 0.11), '#9af0ff', '#38b7ff');
  }
}

// Glowing cockpit canopy toward the nose, lit from the upper-left.
function drawCanopy(ctx, r) {
  const cx = 0.42 * r, cy = 0, rx = 0.4 * r, ry = 0.17 * r;
  ctx.save();
  ctx.shadowColor = '#bdfcff'; ctx.shadowBlur = r * 0.5;
  if (typeof ctx.createRadialGradient === 'function') {
    const g = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, 0, cx, cy, rx);
    g.addColorStop(0, '#f2ffff');
    g.addColorStop(0.5, withAlpha('#7fe9ff', 0.95));
    g.addColorStop(1, withAlpha('#2aa7d8', 0.9));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = '#bdfcff';
  }
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  // Crisp dark rim around the glass for readability against the bloom.
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.strokeStyle = 'rgba(4,7,18,0.8)';
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke();
  // Tiny bright specular on the upper-left of the glass.
  ctx.fillStyle = withAlpha('#ffffff', 0.95);
  ctx.beginPath(); ctx.arc(cx - rx * 0.35, cy - ry * 0.4, Math.max(0.8, r * 0.06), 0, TAU); ctx.fill();
  ctx.restore();
}

// Paint the detailed 3D starfighter at the origin, pointing +x, sized to radius r.
// Layering mirrors the enemy hulls: engine pods → glowing base fill → volumetric
// shading → panel lines → cockpit canopy → rim light → crisp dark outline →
// glowing exhaust ports (the brightest lights, on top).
//   opts = { hull, accent, highlight, flash }
export function drawShipBody(ctx, r, opts) {
  const o = opts || {};
  const hull = o.hull || '#51e9ff';
  const accent = o.accent || shade(hull, -0.45);
  const highlight = o.highlight || shade(hull, 0.5);
  const flash = !!o.flash;
  const body = flash ? '#ffffff' : hull;

  // Engine nacelles sit behind the hull.
  drawNacelles(ctx, r, accent, highlight, flash);

  // 1) Glowing base hull (bakes the outer bloom via shadowBlur).
  shipHullPath(ctx, r);
  ctx.shadowColor = flash ? '#ffffff' : hull; ctx.shadowBlur = r * 0.8;
  ctx.fillStyle = body;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 2) Volumetric form shading (upper-left key light).
  shadeHull(ctx, r, body);

  // 3) Panel detailing: dark panel grooves + a bright central spine.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = withAlpha('#04070f', 0.5);
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(r * 0.25, -r * 0.13); ctx.lineTo(-r * 0.55, -r * 0.13);
  ctx.moveTo(r * 0.25, r * 0.13); ctx.lineTo(-r * 0.55, r * 0.13);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(highlight, 0.5);
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath(); ctx.moveTo(r * 1.15, 0); ctx.lineTo(-r * 0.6, 0); ctx.stroke();

  // 4) Glowing cockpit canopy.
  drawCanopy(ctx, r);

  // 5) Rim light along the lit edge.
  rimHull(ctx, r, body);

  // 6) Crisp dark outline over the whole silhouette.
  shipHullPath(ctx, r);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.4, r * 0.1);
  ctx.strokeStyle = 'rgba(4,7,18,0.92)';
  ctx.stroke();

  // 7) Glowing exhaust ports — the brightest accents, on top.
  drawEnginePorts(ctx, r);
}

// A small 3D-shaded orb for the orbiting drones: a domed body lit from the
// upper-left with a core-shadow, a glowing base and a crisp dark outline. Pure
// and testable like the ship hull; all gradients feature-guarded.
//   opts = { hull, flash }
export function drawDroneBody(ctx, r, opts) {
  const o = opts || {};
  const hull = o.hull || '#7fdbff';
  const flash = !!o.flash;
  const body = flash ? '#ffffff' : hull;

  // Glowing base orb.
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
  ctx.shadowColor = flash ? '#ffffff' : hull; ctx.shadowBlur = r * 0.8;
  ctx.fillStyle = body;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Domed shading: upper-left highlight + lower-right core shadow, clipped to orb.
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  if (typeof ctx.createRadialGradient === 'function') {
    const hx = -r * 0.35, hy = -r * 0.35;
    const sg = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 1.15);
    sg.addColorStop(0, withAlpha('#ffffff', 0.7));
    sg.addColorStop(0.5, withAlpha(shade(hull, 0.35), 0.2));
    sg.addColorStop(1, withAlpha(shade(hull, 0.35), 0));
    ctx.fillStyle = sg;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    const ag = ctx.createRadialGradient(r * 0.3, r * 0.35, 0, r * 0.3, r * 0.35, r * 1.15);
    ag.addColorStop(0, withAlpha('#000000', 0.32));
    ag.addColorStop(1, withAlpha('#000000', 0));
    ctx.fillStyle = ag;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
  }
  ctx.restore();

  // Crisp dark outline.
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.strokeStyle = 'rgba(4,7,18,0.85)';
  ctx.stroke();
}
