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
// Every boss silhouette (the generic star fallback plus the bespoke per-theme
// hulls). Bosses render upright and get the animated energy core on top.
const BOSS_SHAPES = new Set([
  'boss', 'boss_maw', 'boss_crystal', 'boss_hive', 'boss_siege',
  'boss_singularis', 'boss_phantom', 'boss_cryo', 'boss_storm', 'boss_nemesis',
]);
// Half-angle of the Devourer's open maw (shared by the silhouette and its fangs).
const MAW_HALF = 0.46;

// True for shapes that should be drawn upright (pixel art / saucers / bosses look
// wrong tumbling at a random angle). world.drawEnemies uses this to decide spin.
export function isUpright(shape) {
  return BLOCKY.has(shape) || SAUCER.has(shape) || BOSS_SHAPES.has(shape);
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
    // ---- Bespoke boss silhouettes (one per theme, see BOSS_TYPES) -----------
    // The Devourer: a round predatory head with a gaping fanged maw cut out of
    // the front (+x). The wedge opening leaves the centre free so the live plasma
    // core reads as a glowing throat framed by teeth (fangs added in detailing).
    case 'boss_maw': {
      const steps = 30;
      const V = r * 0.12; // throat vertex, just right of centre
      ctx.moveTo(V, 0);
      ctx.lineTo(Math.cos(-MAW_HALF) * r, Math.sin(-MAW_HALF) * r);
      for (let i = 1; i <= steps; i++) {
        const a = -MAW_HALF - (TAU - 2 * MAW_HALF) * (i / steps);
        const rr = r * (0.98 + Math.sin(a * 5) * 0.02);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.lineTo(V, 0);
      ctx.closePath(); break;
    }
    // The Warden: a faceted crystalline shield — an eight-sided cut gem with
    // subtly alternating radii so the facets catch the light.
    case 'boss_crystal': {
      const n = 8;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU - Math.PI / 2; const rr = r * (i % 2 ? 0.9 : 1); const fn = i === 0 ? 'moveTo' : 'lineTo'; ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); break;
    }
    // The Hive Queen: a segmented insectoid abdomen — a teardrop (bulbous at the
    // back -x, tapered toward the front +x) with soft chitin segmentation ripples.
    case 'boss_hive': {
      const steps = 30;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * TAU;
        const taper = 0.84 - 0.16 * Math.cos(a); // 0.68 front (+x), 1.0 back (-x)
        const rr = r * (taper + 0.04 * Math.sin(a * 7));
        const fn = i === 0 ? 'moveTo' : 'lineTo';
        ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); break;
    }
    // The Siege Marshal: an armoured battleship hull — a wide chamfered fortress
    // block with three cannon barrels jutting from the front (+x).
    case 'boss_siege': {
      const hx = r * 0.84, hy = r * 0.6, ch = r * 0.26;
      ctx.moveTo(-hx + ch, -hy);
      ctx.lineTo(hx - ch, -hy);
      ctx.lineTo(hx, -hy + ch);
      ctx.lineTo(hx, hy - ch);
      ctx.lineTo(hx - ch, hy);
      ctx.lineTo(-hx + ch, hy);
      ctx.lineTo(-hx, hy - ch);
      ctx.lineTo(-hx, -hy + ch);
      ctx.closePath();
      for (let k = -1; k <= 1; k++) {
        const by = k * r * 0.34, bh = r * 0.17;
        ctx.rect(hx - r * 0.02, by - bh / 2, r * 0.18, bh);
      }
      break;
    }
    // The Singularis: a radiant gravitational burst — a six-armed star whose deep
    // 0.5r gaps leave the centre open for the void core and its orbital rings.
    case 'boss_singularis': {
      const n = 12;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const rr = r * (i % 2 ? 0.5 : 1); const fn = i === 0 ? 'moveTo' : 'lineTo'; ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); break;
    }
    // The Phantom: a ghostly hooded form — a smooth upper dome dissolving into a
    // row of ragged, asymmetric wisps along the lower edge.
    case 'boss_phantom': {
      const steps = 40;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * TAU;
        let rr;
        if (Math.sin(a) > 0.12) rr = r * (0.52 + 0.42 * Math.abs(Math.sin(a * 4.5))); // tattered hem
        else rr = r * (0.96 + 0.04 * Math.sin(a * 3)); // smooth hood
        const fn = i === 0 ? 'moveTo' : 'lineTo';
        ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); break;
    }
    // The Cryo Leviathan: a jagged iceberg — a cluster of sharp, uneven crystal
    // shards of varying length for a frozen, asymmetric menace.
    case 'boss_cryo': {
      const rads = [1, 0.5, 0.86, 0.46, 1, 0.54, 0.78, 0.5, 0.92, 0.48, 0.72, 0.52];
      const n = rads.length;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU - Math.PI / 2; const rr = r * rads[i]; const fn = i === 0 ? 'moveTo' : 'lineTo'; ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); break;
    }
    // The Storm Herald: a jagged eight-pointed energy star — sharp lightning
    // spikes with a tight 0.4r core gap for the plasma heart.
    case 'boss_storm': {
      const n = 16;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU - Math.PI / 2; const rr = r * (i % 2 ? 0.4 : 1); const fn = i === 0 ? 'moveTo' : 'lineTo'; ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); break;
    }
    // The Nemesis: the ornate finale — a grand ten-pointed spiked star (layered
    // rings added in detailing) for an unmistakable, menacing ultimate form.
    case 'boss_nemesis': {
      const n = 20;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU - Math.PI / 2; const rr = r * (i % 2 ? 0.56 : 1); const fn = i === 0 ? 'moveTo' : 'lineTo'; ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr); }
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
  else if (BOSS_SHAPES.has(shape)) detailBossHull(ctx, shape, r, accent, highlight, eye);
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

  // Panel seams on the inner plate for a more mechanical, plated hull read.
  ctx.save();
  enemyPath(ctx, shape, r);
  ctx.clip();
  ctx.lineWidth = Math.max(0.8, r * 0.035);
  ctx.strokeStyle = withAlpha(shade(accent, -0.35), 0.6);
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.24); ctx.lineTo(r * 0.3, -r * 0.24);
  ctx.moveTo(-r * 0.4, r * 0.24); ctx.lineTo(r * 0.3, r * 0.24);
  ctx.stroke();
  ctx.restore();

  // Rear thruster flare for pointy craft — a hot engine glow at the tail (-x).
  if (FRONT_EYE.has(shape)) {
    lamp(ctx, -r * 0.6, 0, Math.max(1, r * 0.12), eye, highlight);
    ctx.fillStyle = withAlpha(highlight, 0.85);
    ctx.beginPath(); ctx.arc(-r * 0.6, 0, Math.max(0.6, r * 0.055), 0, TAU); ctx.fill();
  }

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

// The static part of a boss hull baked into its sprite: a shared armoured
// inner plate + metallic rim, then a bespoke per-boss flourish that gives each
// theme boss a distinct identity. The living, rotating energy lives in
// drawBossCore(), drawn per-frame on top of this.
function detailBossHull(ctx, shape, r, accent, highlight, eye) {
  // Shared base: inner armour plate (scaled silhouette) with a bevel, plus a
  // bright metallic rim along the outline — reused by every boss so they share a
  // cohesive "lit, plated" read regardless of silhouette.
  bossInnerPlate(ctx, shape, r, accent, highlight);
  enemyPath(ctx, shape, r);
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.strokeStyle = withAlpha(highlight, 0.7);
  ctx.stroke();

  // Per-boss flourish.
  switch (shape) {
    case 'boss_maw': flourishMaw(ctx, r, accent, highlight, eye); break;
    case 'boss_crystal': flourishCrystal(ctx, r, highlight); coreSeat(ctx, r, highlight); break;
    case 'boss_hive': flourishHive(ctx, r, accent, highlight, eye); break;
    case 'boss_siege': flourishSiege(ctx, r, accent, highlight, eye); break;
    case 'boss_singularis': flourishSingularis(ctx, r, highlight); break;
    case 'boss_phantom': flourishPhantom(ctx, r, eye); break;
    case 'boss_cryo': flourishCryo(ctx, r, highlight); break;
    case 'boss_storm': flourishStorm(ctx, r, highlight); coreSeat(ctx, r, highlight); break;
    case 'boss_nemesis': flourishNemesis(ctx, r, accent, highlight, eye); break;
    default: coreSeat(ctx, r, highlight); // generic 'boss' fallback
  }
}

// Inner armoured plate (a scaled copy of the silhouette) with a bevel highlight.
function bossInnerPlate(ctx, shape, r, accent, highlight, scale = 0.6) {
  ctx.save(); ctx.scale(scale, scale); enemyPath(ctx, shape, r); ctx.restore();
  ctx.fillStyle = withAlpha(accent, 0.92);
  ctx.fill();
  ctx.save(); ctx.scale(scale, scale); enemyPath(ctx, shape, r); ctx.restore();
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.strokeStyle = withAlpha(highlight, 0.4);
  ctx.stroke();
}

// A thin ring that seats the plasma core so it looks intentional, not pasted on.
function coreSeat(ctx, r, highlight) {
  ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, TAU);
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.strokeStyle = withAlpha(highlight, 0.5);
  ctx.stroke();
}

// Devourer: rows of bright fangs lining the open maw so the plasma-throat core
// looks swallowed by teeth. Fangs point inward toward the mouth centreline.
function flourishMaw(ctx, r, accent, highlight, eye) {
  const rimT = { x: Math.cos(-MAW_HALF) * r, y: Math.sin(-MAW_HALF) * r };
  const rimB = { x: Math.cos(MAW_HALF) * r, y: Math.sin(MAW_HALF) * r };
  const V = { x: r * 0.12, y: 0 };
  const tooth = (A, B, dir) => {
    for (let k = 0; k < 4; k++) {
      const t0 = 0.12 + k * 0.22, t1 = t0 + 0.14;
      const x0 = A.x + (B.x - A.x) * t0, y0 = A.y + (B.y - A.y) * t0;
      const x1 = A.x + (B.x - A.x) * t1, y1 = A.y + (B.y - A.y) * t1;
      const tipX = (x0 + x1) / 2 + r * 0.02;
      const tipY = (y0 + y1) / 2 + dir * r * 0.16;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(tipX, tipY); ctx.closePath();
      ctx.fillStyle = withAlpha(highlight, 0.95); ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.02); ctx.strokeStyle = withAlpha(accent, 0.6); ctx.stroke();
    }
  };
  tooth(rimT, V, 1);   // upper lip, fangs point down
  tooth(rimB, V, -1);  // lower lip, fangs point up
  // A deep glowing gullet behind the throat so the maw reads even at rest.
  lamp(ctx, V.x - r * 0.04, 0, Math.max(1.5, r * 0.12), eye, '#ff2a4a');
}

// Warden: faceted gem — facet seams from centre to each vertex and a crisp
// highlighted upper-left facet, selling the cut-crystal shield.
function flourishCrystal(ctx, r, highlight) {
  const n = 8;
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.strokeStyle = withAlpha(highlight, 0.5);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI / 2;
    const rr = r * (i % 2 ? 0.9 : 1);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * rr * 0.6, Math.sin(a) * rr * 0.6); ctx.stroke();
  }
  // Bright specular facet on the lit (upper-left) face.
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.2); ctx.lineTo(-r * 0.3, -r * 0.28); ctx.lineTo(-r * 0.12, r * 0.04); ctx.closePath();
  ctx.fillStyle = withAlpha('#ffffff', 0.35); ctx.fill();
}

// Hive Queen: two front mandibles, chitin segment seams across the abdomen, and
// a small cluster of brood eyes near the head.
function flourishHive(ctx, r, accent, highlight, eye) {
  // Mandibles — angular prongs reaching forward (+x).
  ctx.lineWidth = Math.max(2, r * 0.06); ctx.lineCap = 'round';
  ctx.strokeStyle = withAlpha(accent, 0.95);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.5, s * r * 0.26);
    ctx.lineTo(r * 0.78, s * r * 0.3);
    ctx.lineTo(r * 0.9, s * r * 0.08);
    ctx.stroke();
  }
  // Chitin segmentation seams across the abdomen.
  ctx.lineWidth = Math.max(1, r * 0.03); ctx.strokeStyle = withAlpha(highlight, 0.45);
  for (let k = -1; k <= 1; k++) {
    const cx = -r * 0.1 + k * r * 0.26;
    ctx.beginPath(); ctx.ellipse(cx, 0, r * 0.08, r * 0.52, 0, -1, 1); ctx.stroke();
  }
  // Brood eyes near the head.
  lamp(ctx, r * 0.36, -r * 0.12, Math.max(1.2, r * 0.07), eye, accent);
  lamp(ctx, r * 0.36, r * 0.12, Math.max(1.2, r * 0.07), eye, accent);
}

// Siege Marshal: dark cannon bores at the barrel tips, hull panel seams, and a
// lit command-bridge window.
function flourishSiege(ctx, r, accent, highlight, eye) {
  const hx = r * 0.84;
  // Cannon bores (dark muzzle shading on each barrel).
  ctx.fillStyle = 'rgba(6,10,22,0.85)';
  for (let k = -1; k <= 1; k++) {
    const by = k * r * 0.34;
    ctx.fillRect(hx + r * 0.1, by - r * 0.045, r * 0.07, r * 0.09);
  }
  // Hull panel seams.
  ctx.lineWidth = Math.max(1, r * 0.03); ctx.strokeStyle = withAlpha(highlight, 0.4);
  for (let k = -1; k <= 1; k++) {
    const px = -r * 0.5 + k * r * 0.34;
    ctx.beginPath(); ctx.moveTo(px, -r * 0.5); ctx.lineTo(px, r * 0.5); ctx.stroke();
  }
  // Armour accent band + command bridge light.
  ctx.lineWidth = Math.max(1.5, r * 0.04); ctx.strokeStyle = withAlpha(accent, 0.7);
  ctx.strokeRect(-r * 0.66, -r * 0.14, r * 0.5, r * 0.28);
  lamp(ctx, -r * 0.4, 0, Math.max(1.4, r * 0.1), eye, accent);
}

// Singularis: static orbital rings complementing the live core, plus a dark
// void centre so the plasma eye reads as a gravitational singularity.
function flourishSingularis(ctx, r, highlight) {
  ctx.lineWidth = Math.max(1.5, r * 0.035);
  for (let k = 0; k < 2; k++) {
    const rr = r * (0.56 + k * 0.16);
    ctx.strokeStyle = withAlpha(highlight, 0.5 - k * 0.15);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * 0.4, k ? 0.8 : -0.6, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  // Dark void well at the centre.
  ctx.beginPath(); ctx.arc(0, 0, r * 0.26, 0, TAU);
  ctx.fillStyle = 'rgba(6,4,16,0.7)'; ctx.fill();
  coreSeat(ctx, r, highlight);
}

// Phantom: two hollow, hauntingly glowing eye voids in the hood.
function flourishPhantom(ctx, r, eye) {
  for (const s of [-1, 1]) {
    const ex = s * r * 0.26, ey = -r * 0.28;
    ctx.shadowColor = eye; ctx.shadowBlur = r * 0.2;
    ctx.fillStyle = withAlpha(eye, 0.9);
    ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.12, r * 0.17, 0, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(8,6,16,0.92)';
    ctx.beginPath(); ctx.ellipse(ex, ey + r * 0.02, r * 0.06, r * 0.1, 0, 0, TAU); ctx.fill();
  }
}

// Cryo Leviathan: facet seams splitting the shards and bright ice highlights on
// the lit edges for a cold, faceted glass read.
function flourishCryo(ctx, r, highlight) {
  const rads = [1, 0.5, 0.86, 0.46, 1, 0.54, 0.78, 0.5, 0.92, 0.48, 0.72, 0.52];
  const n = rads.length;
  ctx.lineWidth = Math.max(1, r * 0.03); ctx.strokeStyle = withAlpha('#ffffff', 0.4);
  for (let i = 0; i < n; i += 2) {
    const a = (i / n) * TAU - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * rads[i] * r * 0.9, Math.sin(a) * rads[i] * r * 0.9); ctx.stroke();
  }
  ctx.lineWidth = Math.max(1, r * 0.04); ctx.strokeStyle = withAlpha(highlight, 0.6);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, TAU); ctx.stroke();
}

// Storm Herald: jagged lightning seams arcing across the body.
function flourishStorm(ctx, r, highlight) {
  ctx.lineWidth = Math.max(1.5, r * 0.035); ctx.lineJoin = 'round';
  ctx.strokeStyle = withAlpha('#ffffff', 0.7);
  const bolt = (sx, sy, dir) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + dir * r * 0.18, sy + r * 0.08);
    ctx.lineTo(sx + dir * r * 0.08, sy + r * 0.22);
    ctx.lineTo(sx + dir * r * 0.26, sy + r * 0.34);
    ctx.stroke();
  };
  bolt(-r * 0.3, -r * 0.34, 1);
  bolt(r * 0.34, -r * 0.3, -1);
}

// Nemesis: a layered concentric spiked ring and a single baleful central eye —
// the ornate, menacing ultimate form.
function flourishNemesis(ctx, r, accent, highlight, eye) {
  // Secondary inner spiked ring (rotated half a spike) for ornate layering.
  const n = 20;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI / 2 + Math.PI / n;
    const rr = r * (i % 2 ? 0.34 : 0.62);
    const fn = i === 0 ? 'moveTo' : 'lineTo';
    ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = withAlpha(accent, 0.6); ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.04); ctx.strokeStyle = withAlpha(highlight, 0.6); ctx.stroke();
  coreSeat(ctx, r, highlight);
  // Baleful central eye glint.
  lamp(ctx, 0, 0, Math.max(1.5, r * 0.1), eye, accent);
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
