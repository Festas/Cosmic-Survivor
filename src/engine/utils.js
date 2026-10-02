// utils.js — pure math, RNG and helper functions (no DOM access).
// Kept dependency-free and side-effect-free so it can be unit-tested in Node.

export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);

// Frame-rate independent exponential approach toward a target.
export const damp = (current, target, smoothing, dt) =>
  lerp(current, target, 1 - Math.pow(smoothing, dt));

// Move `current` toward `target` by at most `maxDelta`.
export function approach(current, target, maxDelta) {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}

export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

// Shortest signed difference between two angles, in (-PI, PI].
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d < -Math.PI) d += TAU;
  if (d > Math.PI) d -= TAU;
  return d;
}

export function lerpAngle(a, b, t) {
  return a + angleDiff(a, b) * t;
}

// ---- Seedable RNG (mulberry32) -------------------------------------------
export function makeRng(seed = (Math.random() * 2 ** 32) >>> 0) {
  let s = seed >>> 0;
  const fn = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  fn.reseed = (n) => {
    s = n >>> 0;
  };
  return fn;
}

// Shared global RNG for gameplay. Reseed at the start of a run for determinism.
export const rng = makeRng();

export const rand = (r = rng) => r();
export const randRange = (lo, hi, r = rng) => lo + r() * (hi - lo);
export const randInt = (lo, hi, r = rng) => Math.floor(lo + r() * (hi - lo + 1));
export const chance = (p, r = rng) => r() < p;
export const pick = (arr, r = rng) => arr[Math.floor(r() * arr.length)];

// Random point on a circle of the given radius around (cx, cy).
export function randOnCircle(cx, cy, radius, r = rng) {
  const a = r() * TAU;
  return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, a };
}

// Fisher–Yates shuffle (returns a new array).
export function shuffle(arr, r = rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Weighted pick. `items` is an array of objects each exposing a numeric weight
// via `weightKey` (default "weight"). Returns the chosen item.
export function weightedPick(items, weightKey = 'weight', r = rng) {
  let total = 0;
  for (const it of items) total += it[weightKey] || 0;
  if (total <= 0) return items[0];
  let roll = r() * total;
  for (const it of items) {
    roll -= it[weightKey] || 0;
    if (roll <= 0) return it;
  }
  return items[items.length - 1];
}

// Format large numbers compactly (12345 -> "12.3K").
export function formatNumber(n) {
  if (n < 1000) return String(Math.floor(n));
  if (n < 1e6) return (n / 1e3).toFixed(n < 1e4 ? 1 : 0) + 'K';
  return (n / 1e6).toFixed(n < 1e7 ? 1 : 0) + 'M';
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
