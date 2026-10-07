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
