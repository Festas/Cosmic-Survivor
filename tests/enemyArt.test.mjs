import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shade, withAlpha, paletteFor, isUpright, enemyPath, drawEnemyBody, drawBossCore,
} from '../src/game/enemyArt.js';

// Minimal 2D-context mock: records method calls and swallows property writes so
// the pure path/art routines can be exercised without a DOM/canvas.
function mockCtx({ gradients = true } = {}) {
  const calls = {};
  const rec = (name) => (...args) => { calls[name] = (calls[name] || 0) + 1; return args; };
  const ctx = {
    calls,
    beginPath: rec('beginPath'), closePath: rec('closePath'),
    moveTo: rec('moveTo'), lineTo: rec('lineTo'), rect: rec('rect'),
    arc: rec('arc'), ellipse: rec('ellipse'),
    fill: rec('fill'), stroke: rec('stroke'),
    fillRect: rec('fillRect'), strokeRect: rec('strokeRect'),
    save: rec('save'), restore: rec('restore'),
    translate: rec('translate'), scale: rec('scale'), rotate: rec('rotate'), clip: rec('clip'),
  };
  if (gradients) {
    ctx.createRadialGradient = (...a) => { rec('createRadialGradient')(...a); return { addColorStop() {} }; };
    ctx.createLinearGradient = (...a) => { rec('createLinearGradient')(...a); return { addColorStop() {} }; };
  }
  return ctx;
}

const ALL_SHAPES = ['tri', 'diamond', 'arrow', 'pentagon', 'hex', 'blob', 'boss', 'crab', 'squid', 'octopus', 'ufo', 'mothership', 'mystery',
  'boss_maw', 'boss_crystal', 'boss_hive', 'boss_siege', 'boss_singularis', 'boss_phantom', 'boss_cryo', 'boss_storm', 'boss_nemesis'];

// Every boss silhouette — the only shapes that get the post-wave-100 Ascension
// overlay (drawEnemyBody) and the animated energy core (drawBossCore).
const BOSS_SHAPES = ['boss', 'boss_maw', 'boss_crystal', 'boss_hive', 'boss_siege',
  'boss_singularis', 'boss_phantom', 'boss_cryo', 'boss_storm', 'boss_nemesis'];

test('shade lightens and darkens hex colours and passes through non-hex', () => {
  assert.equal(shade('#000000', 1), '#ffffff');
  assert.equal(shade('#ffffff', -1), '#000000');
  assert.equal(shade('#808080', 0), '#808080');
  // 3-digit hex is expanded; darkening moves toward black.
  assert.equal(shade('#fff', -0.5), '#808080');
  // Non-hex inputs are returned unchanged (graceful fallback).
  assert.equal(shade('rgba(1,2,3,0.5)', -0.5), 'rgba(1,2,3,0.5)');
});

test('withAlpha builds rgba() from hex and passes through non-hex', () => {
  assert.equal(withAlpha('#ff0080', 0.5), 'rgba(255,0,128,0.5)');
  assert.equal(withAlpha('not-a-hex', 0.5), 'not-a-hex');
});

test('paletteFor is deterministic, cached and well-formed', () => {
  const a = paletteFor('#51e9ff');
  const b = paletteFor('#51e9ff');
  assert.equal(a, b, 'same colour returns the memoised palette');
  for (const k of ['accent', 'highlight', 'eye']) {
    assert.ok(typeof a[k] === 'string' && a[k].length > 0, `palette.${k} should be a colour string`);
  }
});

test('isUpright flags pixel invaders, saucers and bosses only', () => {
  for (const s of ['crab', 'squid', 'octopus', 'ufo', 'mothership', 'boss']) assert.equal(isUpright(s), true, s);
  for (const s of ['tri', 'diamond', 'arrow', 'pentagon', 'hex', 'blob']) assert.equal(isUpright(s), false, s);
});

test('enemyPath begins a path for every shape without throwing', () => {
  for (const shape of ALL_SHAPES) {
    const ctx = mockCtx();
    assert.doesNotThrow(() => enemyPath(ctx, shape, 20), `enemyPath(${shape})`);
    assert.ok(ctx.calls.beginPath >= 1, `enemyPath(${shape}) should beginPath`);
  }
});

test('drawEnemyBody renders every shape without throwing (gradient + no-gradient ctx)', () => {
  const pal = paletteFor('#ff5d7a');
  for (const gradients of [true, false]) {
    for (const shape of ALL_SHAPES) {
      const ctx = mockCtx({ gradients });
      const opts = { fill: '#ff5d7a', glow: '#ff5d7a', blur: 6, accent: pal.accent, highlight: pal.highlight, eye: pal.eye };
      assert.doesNotThrow(() => drawEnemyBody(ctx, shape, 18, opts), `drawEnemyBody(${shape}, gradients=${gradients})`);
      assert.ok(ctx.calls.fill >= 1, `drawEnemyBody(${shape}) should fill the body`);
      assert.ok(ctx.calls.stroke >= 1, `drawEnemyBody(${shape}) should stroke the outline`);
    }
  }
});

test('drawBossCore animates without throwing, with and without radial gradients', () => {
  for (const gradients of [true, false]) {
    for (const time of [0, 1.3, 42]) {
      const ctx = mockCtx({ gradients });
      assert.doesNotThrow(
        () => drawBossCore(ctx, 50, { time, color: '#ff3b6b', ring: '#ffd0dc' }),
        `drawBossCore(time=${time}, gradients=${gradients})`,
      );
      assert.ok(ctx.calls.arc >= 1, 'boss core should draw arcs');
      assert.ok(ctx.calls.stroke >= 1, 'boss core should stroke energy rings');
    }
  }
});

// --- Ascension tiers (post-wave-100 boss repeats) ---------------------------
// Cycled bosses are passed an integer `tier` (1 = waves 10–100, 2 = 110–200, …).
// The baked hull overlay and the live core must escalate without ever throwing,
// including under the minimal gradient-OFF mock ctx, and keep the fill/stroke
// invariants. tier defaults to 1 and is ignored for non-boss shapes.

test('drawEnemyBody renders every boss Ascension tier (gradient + no-gradient ctx)', () => {
  const pal = paletteFor('#ff5d7a');
  for (const gradients of [true, false]) {
    for (const shape of BOSS_SHAPES) {
      for (const tier of [1, 2, 3, 4]) {
        const ctx = mockCtx({ gradients });
        // blur 24 mirrors the real boss sprite budget the overlay is tuned for.
        const opts = { fill: '#ff5d7a', glow: '#ff5d7a', blur: 24, accent: pal.accent, highlight: pal.highlight, eye: pal.eye, tier };
        assert.doesNotThrow(() => drawEnemyBody(ctx, shape, 50, opts), `drawEnemyBody(${shape}, tier=${tier}, gradients=${gradients})`);
        assert.ok(ctx.calls.fill >= 1, `drawEnemyBody(${shape}, tier=${tier}) should fill the body`);
        assert.ok(ctx.calls.stroke >= 1, `drawEnemyBody(${shape}, tier=${tier}) should stroke the outline`);
      }
    }
  }
});

test('drawBossCore escalates across tiers without throwing (gradient + no-gradient ctx)', () => {
  for (const gradients of [true, false]) {
    for (const shape of BOSS_SHAPES) {
      for (const tier of [1, 2, 3, 4]) {
        const ctx = mockCtx({ gradients });
        assert.doesNotThrow(
          () => drawBossCore(ctx, 50, { time: 0, color: '#fff', ring: '#fff', tier }),
          `drawBossCore(${shape}, tier=${tier}, gradients=${gradients})`,
        );
        assert.ok(ctx.calls.fill >= 1, `drawBossCore(${shape}, tier=${tier}) should fill the plasma core`);
        assert.ok(ctx.calls.stroke >= 1, `drawBossCore(${shape}, tier=${tier}) should stroke energy rings`);
      }
    }
  }
});

test('drawEnemyBody tier 1 is identical to omitting tier (no change for normal play)', () => {
  const pal = paletteFor('#ff5d7a');
  const draw = (opts) => { const ctx = mockCtx({ gradients: true }); drawEnemyBody(ctx, 'boss_nemesis', 50, opts); return ctx.calls; };
  const base = { fill: '#ff5d7a', glow: '#ff5d7a', blur: 24, accent: pal.accent, highlight: pal.highlight, eye: pal.eye };
  assert.deepEqual(draw({ ...base }), draw({ ...base, tier: 1 }), 'tier 1 takes the same path as no tier');
});

test('drawEnemyBody ignores tier for non-boss shapes', () => {
  const pal = paletteFor('#8df');
  const draw = (opts) => { const ctx = mockCtx({ gradients: true }); drawEnemyBody(ctx, 'hex', 20, opts); return ctx.calls; };
  const base = { fill: '#8df', glow: '#8df', blur: 6, accent: pal.accent, highlight: pal.highlight, eye: pal.eye };
  assert.deepEqual(draw({ ...base }), draw({ ...base, tier: 5 }), 'a high tier must not alter a non-boss shape');
});

test('drawEnemyBody handles clamped / very high boss tiers without throwing', () => {
  const pal = paletteFor('#ff5d7a');
  for (const gradients of [true, false]) {
    for (const tier of [5, 6, 12, 99]) {
      const ctx = mockCtx({ gradients });
      const opts = { fill: '#ff5d7a', glow: '#ff5d7a', blur: 24, accent: pal.accent, highlight: pal.highlight, eye: pal.eye, tier };
      assert.doesNotThrow(() => drawEnemyBody(ctx, 'boss_storm', 50, opts), `drawEnemyBody(boss_storm, tier=${tier})`);
      assert.doesNotThrow(() => drawBossCore(ctx, 50, { time: 0, color: '#fff', ring: '#fff', tier }), `drawBossCore(tier=${tier})`);
      assert.ok(ctx.calls.fill >= 1 && ctx.calls.stroke >= 1, `tier ${tier} still fills and strokes`);
    }
  }
});
