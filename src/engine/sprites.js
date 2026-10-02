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
