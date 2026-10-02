// sprites.js — offscreen "glow sprite" cache.
//
// Rendering a blurred glow every frame via `ctx.shadowBlur` is one of the most
// expensive 2D-canvas operations: the browser re-rasterises and Gaussian-blurs
// every filled shape. At high entity counts this dominates the frame budget and
// causes the lag spikes seen on later waves. Baking each glowing shape into a
// small offscreen canvas once and blitting it with `drawImage` is dramatically
// cheaper, since the blur is paid a single time per unique sprite.

const cache = new Map();
const supported = typeof document !== 'undefined' && typeof document.createElement === 'function';

// Safety cap. Every cache key is built from finite enumerations — enemy
// shape/radius/colour, the three fill states (base, white hit-flash, cryo
// freeze), the per-element glow colours, and a handful of blur/bullet-size
// values — so in practice only a few hundred distinct sprites are ever created.
// The cap is a guard against a future change accidentally introducing a
// continuous key: if it is ever exceeded the cache is dropped and rebuilt
// lazily, which bounds memory at the cost of a one-off rebuild.
const MAX_SPRITES = 1024;

// Fetch (or lazily build) a glow sprite.
//   key    — unique cache key for this shape/colour/glow combination
//   radius — half-extent of the artwork (before the glow padding)
//   blur   — glow spread (maps to shadowBlur when baking)
//   paint  — draws the shape centred on the origin of the passed context; it is
//            responsible for setting fillStyle/shadowColor/shadowBlur.
// Returns { canvas, off } where `off` is the blit offset (half the canvas size),
// or null when offscreen canvases are unavailable (e.g. a non-DOM environment),
// in which case callers should fall back to a direct draw.
export function glowSprite(key, radius, blur, paint) {
  if (!supported) return null;
  const existing = cache.get(key);
  if (existing !== undefined) return existing;
  if (cache.size >= MAX_SPRITES) cache.clear();
  const half = Math.max(1, Math.ceil(radius + blur + 3));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = half * 2;
  const g = canvas.getContext('2d');
  g.translate(half, half);
  paint(g);
  const spr = { canvas, off: half };
  cache.set(key, spr);
  return spr;
}

// Drop every cached sprite (used by tests; harmless at runtime).
export function clearSpriteCache() { cache.clear(); }
