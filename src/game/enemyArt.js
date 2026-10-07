// enemyArt.js — detailed, cacheable enemy/boss hull art and animated boss cores.
//
// The swarm is rendered from baked offscreen "glow sprites" (see engine/sprites.js
// and world.drawEnemies): the detailed, *static* hull of every enemy is painted
// once per unique shape/colour/radius and then blitted, so none of the layered
// shading below ever costs a per-frame shadow-blur. The only thing drawn live is
// drawBossCore(), and only for the one or two bosses on screen — cheap, and the
// source of the "epic" animated energy for a boss fight.
//
// Everything here is pure 2D-canvas path work (no DOM lookups), so it runs
// against the real context, the offscreen sprite context, or a mock context in
// tests. Optional gradient calls are feature-guarded so a minimal mock ctx that
// lacks createRadialGradient still works.

import { TAU } from '../engine/utils.js';

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const hex2 = (v) => clamp255(Math.round(v)).toString(16).padStart(2, '0');

// Parse '#rgb' or '#rrggbb' into [r,g,b]; returns null for anything else so the
// colour helpers can gracefully pass non-hex inputs straight through.
function parseHex(hex) {
  if (typeof hex !== 'string' || hex[0] !== '#') return null;
  const h = hex.slice(1);
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (n.length !== 6) return null;
  const v = parseInt(n, 16);
  if (Number.isNaN(v)) return null;
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

// Lighten (amt > 0, toward white) or darken (amt < 0, toward black) a hex colour.
export function shade(hex, amt) {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const t = amt < 0 ? 0 : 255;
  const p = Math.min(1, Math.abs(amt));
  return '#' + rgb.map((c) => hex2(c + (t - c) * p)).join('');
}

// Return an rgba() string for a hex colour at the given alpha (for soft rims and
// glows). Falls back to the input unchanged if it is not a parseable hex colour.
export function withAlpha(hex, a) {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

// Resolve a cohesive sub-palette (plating, rim light, glowing eye) from a single
// base colour. Memoised per colour string — the palette is a pure function of the
// colour, and only a handful of enemy colours ever exist, so this stays tiny.
const _palettes = new Map();
export function paletteFor(color) {
  let p = _palettes.get(color);
  if (!p) {
    p = { accent: shade(color, -0.5), highlight: shade(color, 0.55), eye: '#f2ffff' };
    _palettes.set(color, p);
  }
  return p;
}

// Which shapes are retro pixel invaders vs. wide saucers — these render upright
// (no spin tilt) and get bespoke two-tone + eye detailing.
const BLOCKY = new Set(['crab', 'squid', 'octopus']);
const SAUCER = new Set(['ufo', 'mothership']);
// Pointy craft whose "eye"/cockpit sits toward the front (+x) rather than centre.
const FRONT_EYE = new Set(['tri', 'arrow']);

// True for shapes that should be drawn upright (pixel art / saucers / bosses look
// wrong tumbling at a random angle). world.drawEnemies uses this to decide spin.
export function isUpright(shape) {
  return BLOCKY.has(shape) || SAUCER.has(shape) || shape === 'boss';
}

// Build the bare silhouette path for a shape at radius r (no fill/stroke). Shared
// by the glowing base fill and the dark outline so they always line up exactly.
export function enemyPath(ctx, shape, r) {
  ctx.beginPath();
  switch (shape) {
    case 'tri':
      ctx.moveTo(r, 0); ctx.lineTo(-r * 0.8, -r * 0.8); ctx.lineTo(-r * 0.8, r * 0.8); ctx.closePath(); break;
    case 'diamond':
      ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath(); break;
    case 'arrow':
      ctx.moveTo(r, 0); ctx.lineTo(-r, -r * 0.7); ctx.lineTo(-r * 0.4, 0); ctx.lineTo(-r, r * 0.7); ctx.closePath(); break;
    case 'pentagon':
    case 'hex':
    case 'blob': {
      const n = shape === 'hex' ? 6 : shape === 'pentagon' ? 5 : 8;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const rr = r * (shape === 'blob' ? (0.82 + Math.sin(a * 3) * 0.18) : 1); const fn = i === 0 ? 'moveTo' : 'lineTo'; ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); break;
    }
    case 'boss': {
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; const rr = r * (i % 2 ? 0.7 : 1); const fn = i === 0 ? 'moveTo' : 'lineTo'; ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); break;
    }
    case 'crab': {
      const u = r / 5;
      ctx.rect(-3 * u, -2 * u, 6 * u, 4 * u);
      ctx.rect(-5 * u, -u, 2 * u, u);
      ctx.rect(3 * u, -u, 2 * u, u);
      ctx.rect(-4 * u, -3 * u, u, u);
      ctx.rect(3 * u, -3 * u, u, u);
      ctx.rect(-3 * u, 2 * u, u, 2 * u);
      ctx.rect(2 * u, 2 * u, u, 2 * u);
      ctx.rect(-u, 2 * u, 2 * u, u);
      break;
    }
    case 'squid': {
      const u = r / 5;
      ctx.rect(-2 * u, -3 * u, 4 * u, 3 * u);
      ctx.rect(-3 * u, 0, 6 * u, 2 * u);
      ctx.rect(-3 * u, 2 * u, u, 2 * u);
      ctx.rect(-u, 2 * u, u, 2 * u);
      ctx.rect(0, 2 * u, u, 2 * u);
      ctx.rect(2 * u, 2 * u, u, 2 * u);
      break;
    }
    case 'octopus': {
      const u = r / 5;
      ctx.rect(-2 * u, -4 * u, 4 * u, 2 * u);
      ctx.rect(-4 * u, -2 * u, 8 * u, 3 * u);
      ctx.rect(-4 * u, u, u, 3 * u);
      ctx.rect(-2 * u, u, u, 3 * u);
      ctx.rect(-u, u, u, 3 * u);
      ctx.rect(0, u, u, 3 * u);
      ctx.rect(u, u, u, 3 * u);
      ctx.rect(3 * u, u, u, 3 * u);
      break;
    }
    case 'ufo': {
      ctx.ellipse(0, r * 0.15, r, r * 0.42, 0, 0, TAU);
      ctx.moveTo(r * 0.5, -r * 0.1);
      ctx.ellipse(0, -r * 0.1, r * 0.5, r * 0.45, 0, 0, TAU);
      break;
    }
    case 'mothership': {
      ctx.ellipse(0, r * 0.12, r, r * 0.34, 0, 0, TAU);
      ctx.moveTo(r * 0.52, -r * 0.18);
      ctx.ellipse(0, -r * 0.18, r * 0.52, r * 0.5, 0, 0, TAU);
      ctx.moveTo(-r * 0.48, r * 0.3);
      ctx.ellipse(-r * 0.68, r * 0.3, r * 0.2, r * 0.16, 0, 0, TAU);
      ctx.moveTo(r * 0.88, r * 0.3);
      ctx.ellipse(r * 0.68, r * 0.3, r * 0.2, r * 0.16, 0, 0, TAU);
      break;
    }
    default: ctx.arc(0, 0, r, 0, TAU);
  }
}

// A soft bright dot with a tight glow — the recurring "eye/cockpit/light" motif.
function lamp(ctx, x, y, rad, color, glow = color) {
  ctx.shadowColor = glow; ctx.shadowBlur = rad * 2.2;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
}

// Volumetric form-shading pass shared by every hull. Clips to the silhouette and
// layers three cheap (baked-once) effects for a lit 3D read with a consistent
// key light from the UPPER-LEFT: a directional form-light gradient, a tight
// specular hotspot, and a lower-right core-shadow / ambient-occlusion. Every
// gradient call is feature-guarded, so on a minimal mock ctx that lacks the
// gradient factories this degrades to a graceful no-op (the flat base shows
// through). All shading derives only from `fill`, so the white hit-flash and the
// cryo freeze tint keep working — the volume just lightens/darkens whatever
// `fill` currently is.
function shadeVolume(ctx, shape, r, fill) {
  ctx.save();
  enemyPath(ctx, shape, r);
  ctx.clip();
  const box = r * 1.6, d = box * 2;

  // Directional form light: bright upper-left → transparent through the middle
  // (so the base colour reads) → darkening into the lower-right.
  if (typeof ctx.createLinearGradient === 'function') {
    const lg = ctx.createLinearGradient(-box, -box, box, box);
    lg.addColorStop(0, withAlpha(shade(fill, 0.5), 0.85));
    lg.addColorStop(0.5, withAlpha(shade(fill, 0.5), 0));
    lg.addColorStop(1, withAlpha(shade(fill, -0.5), 0.85));
    ctx.fillStyle = lg;
    ctx.fillRect(-box, -box, d, d);
  }

  // Specular hotspot — a small bright highlight on the lit (upper-left) face.
  if (typeof ctx.createRadialGradient === 'function') {
    const hx = -r * 0.42, hy = -r * 0.42, hr = r * 0.95;
    const sg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
    sg.addColorStop(0, withAlpha('#ffffff', 0.5));
    sg.addColorStop(1, withAlpha('#ffffff', 0));
    ctx.fillStyle = sg;
    ctx.fillRect(-box, -box, d, d);
  }

  // Core shadow / ambient occlusion sinking into the lower-right and the rim.
  if (typeof ctx.createRadialGradient === 'function') {
    const sx = r * 0.5, sy = r * 0.5, sr = r * 1.55;
    const ag = ctx.createRadialGradient(sx, sy, r * 0.15, sx, sy, sr);
    ag.addColorStop(0, withAlpha('#000000', 0.32));
    ag.addColorStop(1, withAlpha('#000000', 0));
    ctx.fillStyle = ag;
    ctx.fillRect(-box, -box, d, d);
  }

  ctx.restore();
}

// Soft bright rim on the lit (upper-left) edge. The wide stroke is clipped to the
// silhouette so only its inner half shows (an inner rim), and faded across the
// body with a gradient so the dark lower-right side keeps its crisp shadow. Flat
// stroke fallback when gradients are unavailable. Derives from `fill`, so it
// tracks the hit-flash / freeze tints like the rest of the volume.
function rimLight(ctx, shape, r, fill) {
  const rim = shade(fill, 0.6);
  ctx.save();
  enemyPath(ctx, shape, r);
  ctx.clip();
  enemyPath(ctx, shape, r);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, r * 0.4);
  if (typeof ctx.createLinearGradient === 'function') {
    const lg = ctx.createLinearGradient(-r * 0.7, -r * 0.7, r * 0.7, r * 0.7);
    lg.addColorStop(0, withAlpha(rim, 0.55));
    lg.addColorStop(0.5, withAlpha(rim, 0));
    lg.addColorStop(1, withAlpha(rim, 0));
    ctx.strokeStyle = lg;
  } else {
    ctx.strokeStyle = withAlpha(rim, 0.4);
  }
  ctx.stroke();
  ctx.restore();
}

// Paint a detailed, glowing enemy body at the origin. Draws (in order): a glowing
// base silhouette, a volumetric form-shading pass (upper-left key light),
// shape-specific plating/eyes, a lit rim, and a crisp dark outline so the body
// always reads against bloom and the enemy fire on top of it.
//   opts = { fill, glow, blur, accent, highlight, eye }
export function drawEnemyBody(ctx, shape, r, opts) {
  const { fill, glow, blur = 0, accent, highlight, eye } = opts;

  // 1) Glowing base silhouette (bakes the outer bloom via shadowBlur).
  enemyPath(ctx, shape, r);
  ctx.shadowColor = glow || fill; ctx.shadowBlur = blur;
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 2) Volumetric form shading — baked once per sprite, so free per frame.
  shadeVolume(ctx, shape, r, fill);

  // 3) Shape-specific detailing.
  if (BLOCKY.has(shape)) detailBlocky(ctx, shape, r, accent, eye);
  else if (SAUCER.has(shape)) detailSaucer(ctx, shape, r, accent, highlight, eye);
  else if (shape === 'boss') detailBossHull(ctx, r, accent, highlight);
  else detailGeo(ctx, shape, r, accent, highlight, eye);

  // 4) Rim light along the lit edge (sits just inside the dark outline).
  rimLight(ctx, shape, r, fill);

  // 5) Crisp dark outline over the whole silhouette.
  enemyPath(ctx, shape, r);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.6, r * 0.14);
  ctx.strokeStyle = 'rgba(4,7,18,0.9)';
  ctx.stroke();
}

// Faceted craft (drone/swarm/spitter/dasher/splitter/brute/seeder/sentinel):
// inner darker plate for depth, a lit leading edge, and a glowing eye/cockpit.
function detailGeo(ctx, shape, r, accent, highlight, eye) {
  // Inner plate (scaled silhouette) gives a two-tone, panelled read.
  ctx.save();
  ctx.scale(0.58, 0.58);
  enemyPath(ctx, shape, r);
  ctx.restore();
  ctx.fillStyle = withAlpha(accent, 0.85);
  ctx.fill();

  // Bevel highlight around the inner plate adds a touch of panel depth.
  ctx.save();
  ctx.scale(0.58, 0.58);
  enemyPath(ctx, shape, r);
  ctx.restore();
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.strokeStyle = withAlpha(highlight, 0.4);
  ctx.stroke();

  // Lit rim along the silhouette.
  enemyPath(ctx, shape, r);
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.strokeStyle = withAlpha(highlight, 0.6);
  ctx.stroke();

  // Glowing eye/cockpit — toward the nose for pointy craft, centred otherwise.
  const ex = FRONT_EYE.has(shape) ? r * 0.32 : 0;
  lamp(ctx, ex, 0, Math.max(1.6, r * 0.2), eye);
  ctx.fillStyle = withAlpha(highlight, 0.9);
  ctx.beginPath(); ctx.arc(ex, 0, Math.max(0.8, r * 0.09), 0, TAU); ctx.fill();
  // Tiny glassy specular (upper-left) so the cockpit reads as a lit lens.
  ctx.fillStyle = withAlpha('#ffffff', 0.9);
  ctx.beginPath(); ctx.arc(ex - r * 0.07, -r * 0.07, Math.max(0.6, r * 0.05), 0, TAU); ctx.fill();
}

// Draw a pair of bright eyes with dark pupils at the given half-grid positions.
function eyes(ctx, u, positions, eye) {
  for (const [ex, ey] of positions) {
    ctx.shadowColor = eye; ctx.shadowBlur = u * 1.8;
    ctx.fillStyle = eye;
    ctx.fillRect(ex, ey, u, u);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(6,10,22,0.92)';
    ctx.fillRect(ex + u * 0.3, ey + u * 0.3, u * 0.5, u * 0.5);
    // Tiny upper-left specular corner — a lit, glassy eye instead of a flat pixel.
    ctx.fillStyle = withAlpha('#ffffff', 0.85);
    ctx.fillRect(ex + u * 0.12, ey + u * 0.12, u * 0.24, u * 0.24);
  }
}

// Retro invaders: shade the "limbs" with the accent tone and add glowing eyes so
// each critter reads as a creature instead of a flat blob of pixels.
function detailBlocky(ctx, shape, r, accent, eye) {
  const u = r / 5;
  ctx.fillStyle = withAlpha(accent, 0.9);
  if (shape === 'crab') {
    ctx.fillRect(-3 * u, 2 * u, u, 2 * u);
    ctx.fillRect(2 * u, 2 * u, u, 2 * u);
    ctx.fillRect(-u, 2 * u, 2 * u, u);
    ctx.fillRect(-5 * u, -u, 2 * u, u);
    ctx.fillRect(3 * u, -u, 2 * u, u);
    eyes(ctx, u, [[-2 * u, -1.5 * u], [u, -1.5 * u]], eye);
  } else if (shape === 'squid') {
    ctx.fillRect(-3 * u, 2 * u, u, 2 * u);
    ctx.fillRect(-u, 2 * u, u, 2 * u);
    ctx.fillRect(0, 2 * u, u, 2 * u);
    ctx.fillRect(2 * u, 2 * u, u, 2 * u);
    eyes(ctx, u, [[-1.5 * u, -2 * u], [0.5 * u, -2 * u]], eye);
  } else { // octopus
    ctx.fillRect(-4 * u, u, u, 3 * u);
    ctx.fillRect(-2 * u, u, u, 3 * u);
    ctx.fillRect(-u, u, u, 3 * u);
    ctx.fillRect(0, u, u, 3 * u);
    ctx.fillRect(u, u, u, 3 * u);
    ctx.fillRect(3 * u, u, u, 3 * u);
    eyes(ctx, u, [[-2 * u, -u], [u, -u]], eye);
  }
}

// Flying saucers: a lit canopy/command dome and a row of running lights along the
// hull rim — the classic "glowing UFO" read.
function detailSaucer(ctx, shape, r, accent, highlight, eye) {
  // Canopy glow — matches the dome ellipse proportions from enemyPath so the
  // highlight fills the actual canopy rather than a mismatched circle.
  const domeY = shape === 'mothership' ? -r * 0.18 : -r * 0.1;
  const domeRX = shape === 'mothership' ? r * 0.52 : r * 0.5;
  const domeRY = shape === 'mothership' ? r * 0.5 : r * 0.45;
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, domeY, domeRX * 0.9, domeRY * 0.9, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = withAlpha(highlight, 0.9);
  ctx.beginPath(); ctx.ellipse(0, domeY, domeRX, domeRY, 0, 0, TAU); ctx.fill();
  ctx.restore();
  lamp(ctx, 0, domeY, Math.max(1.6, r * 0.16), eye);
  // Bright specular on the upper-left of the dome — a glossy, lit canopy.
  ctx.fillStyle = withAlpha('#ffffff', 0.85);
  ctx.beginPath(); ctx.arc(-domeRX * 0.22, domeY - domeRY * 0.3, Math.max(0.8, r * 0.07), 0, TAU); ctx.fill();

  // Running lights along the saucer rim.
  const lights = shape === 'mothership' ? 7 : 5;
  const ry = shape === 'mothership' ? r * 0.12 : r * 0.15;
  const rx = shape === 'mothership' ? r * 0.9 : r * 0.8;
  for (let i = 0; i < lights; i++) {
    const t = (i + 0.5) / lights;
    const x = -rx + t * rx * 2;
    lamp(ctx, x, ry, Math.max(1, r * 0.07), eye, accent);
  }
}

// The static part of a boss hull baked into its sprite: an inner armoured star
// plate and a bright metallic rim. The living, rotating energy lives in
// drawBossCore(), drawn per-frame on top of this.
function detailBossHull(ctx, r, accent, highlight) {
  ctx.save();
  ctx.scale(0.62, 0.62);
  enemyPath(ctx, 'boss', r);
  ctx.restore();
  ctx.fillStyle = withAlpha(accent, 0.92);
  ctx.fill();

  // Bevel highlight on the inner star plate for a lit, armoured read.
  ctx.save();
  ctx.scale(0.62, 0.62);
  enemyPath(ctx, 'boss', r);
  ctx.restore();
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.strokeStyle = withAlpha(highlight, 0.4);
  ctx.stroke();

  enemyPath(ctx, 'boss', r);
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.strokeStyle = withAlpha(highlight, 0.7);
  ctx.stroke();

  // Inner ring seat for the energy core.
  ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, TAU);
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.strokeStyle = withAlpha(highlight, 0.5);
  ctx.stroke();
}

// Animated boss energy core — drawn LIVE each frame at the boss centre (origin).
// Two counter-rotating energy arcs orbit a pulsing plasma core, giving the boss
// an unmistakable, menacing presence without touching the cached swarm path.
//   opts = { time, color, ring }
export function drawBossCore(ctx, r, opts) {
  const { time = 0, color, ring } = opts;
  const rg = ring || color;
  const pulse = 0.82 + Math.sin(time * 3.2) * 0.18;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Pulsing plasma core (radial gradient where supported, flat disc otherwise).
  const coreR = r * 0.5 * pulse;
  if (typeof ctx.createRadialGradient === 'function') {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    grad.addColorStop(0, withAlpha('#ffffff', 0.95));
    grad.addColorStop(0.45, withAlpha(color, 0.8));
    grad.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = withAlpha(color, 0.6);
  }
  ctx.beginPath(); ctx.arc(0, 0, coreR, 0, TAU); ctx.fill();

  // Spherical specular highlight (upper-left) so the plasma reads as a lit orb
  // with volume rather than a flat disc. Additive ('lighter'), feature-guarded.
  if (typeof ctx.createRadialGradient === 'function') {
    const hx = -coreR * 0.35, hy = -coreR * 0.35, hr = coreR * 0.7;
    const sg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
    sg.addColorStop(0, withAlpha('#ffffff', 0.9));
    sg.addColorStop(1, withAlpha('#ffffff', 0));
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
  }

  // Outer rotating energy arcs.
  ctx.shadowColor = rg; ctx.shadowBlur = r * 0.3;
  ctx.strokeStyle = withAlpha(rg, 0.9);
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    const a = time * 1.6 + k * Math.PI;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.02, a, a + Math.PI * 0.72); ctx.stroke();
  }
  // Inner counter-rotating arcs.
  ctx.strokeStyle = withAlpha('#ffffff', 0.7);
  ctx.lineWidth = Math.max(1.5, r * 0.04);
  for (let k = 0; k < 2; k++) {
    const a = -time * 2.3 + k * Math.PI;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.74, a, a + Math.PI * 0.5); ctx.stroke();
  }

  ctx.restore();
}
