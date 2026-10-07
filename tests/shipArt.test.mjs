import test from 'node:test';
import assert from 'node:assert/strict';
import { drawShipBody, drawDroneBody } from '../src/game/shipArt.js';

// Minimal 2D-context mock mirroring tests/enemyArt.test.mjs: records method calls
// and swallows property writes so the pure art routines can run without a canvas.
// Gradient factories are only present when `gradients` is true, which exercises
// both the gradient-rich path and the flat-fill fallback.
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

const RADII = [6, 15, 24, 48];

test('drawShipBody renders at a range of radii and both flash states (gradient + no-gradient ctx)', () => {
  for (const gradients of [true, false]) {
    for (const r of RADII) {
      for (const flash of [false, true]) {
        const ctx = mockCtx({ gradients });
        const opts = { hull: '#51e9ff', accent: '#1d6f8f', highlight: '#a8f6ff', flash };
        assert.doesNotThrow(() => drawShipBody(ctx, r, opts), `drawShipBody(r=${r}, flash=${flash}, gradients=${gradients})`);
        assert.ok(ctx.calls.fill >= 1, `drawShipBody should fill the hull (r=${r}, gradients=${gradients})`);
        assert.ok(ctx.calls.stroke >= 1, `drawShipBody should stroke the outline (r=${r}, gradients=${gradients})`);
      }
    }
  }
});

test('drawShipBody tolerates missing/empty opts by applying defaults', () => {
  for (const gradients of [true, false]) {
    const ctx = mockCtx({ gradients });
    assert.doesNotThrow(() => drawShipBody(ctx, 15, {}), `empty opts (gradients=${gradients})`);
    assert.doesNotThrow(() => drawShipBody(ctx, 15), `undefined opts (gradients=${gradients})`);
    assert.ok(ctx.calls.fill >= 1, 'should still fill with defaults');
    assert.ok(ctx.calls.stroke >= 1, 'should still stroke with defaults');
  }
});

test('drawDroneBody renders a lit 3D orb without throwing (gradient + no-gradient ctx)', () => {
  for (const gradients of [true, false]) {
    for (const r of [3, 5, 12]) {
      for (const flash of [false, true]) {
        const ctx = mockCtx({ gradients });
        assert.doesNotThrow(() => drawDroneBody(ctx, r, { hull: '#7fdbff', flash }), `drawDroneBody(r=${r}, flash=${flash}, gradients=${gradients})`);
        assert.ok(ctx.calls.fill >= 1, 'drone should fill the orb');
        assert.ok(ctx.calls.stroke >= 1, 'drone should stroke the outline');
      }
    }
  }
  // Also tolerate missing opts (defaults).
  const ctx = mockCtx();
  assert.doesNotThrow(() => drawDroneBody(ctx, 5), 'drawDroneBody with no opts');
});

test('drawShipBody uses linear + radial gradients and clips its shading when available', () => {
  const ctx = mockCtx({ gradients: true });
  drawShipBody(ctx, 20, { hull: '#51e9ff', flash: false });
  assert.ok(ctx.calls.createLinearGradient >= 1, 'should build a linear form-light gradient');
  assert.ok(ctx.calls.createRadialGradient >= 1, 'should build radial specular/AO gradients');
  assert.ok(ctx.calls.clip >= 1, 'should clip the volumetric shading to the hull');
});
