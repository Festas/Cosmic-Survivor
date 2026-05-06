// tests/renderer.test.mjs — Renderer interface contract tests.
//
// Pure interface contract: construct a fake renderer object with stub methods
// and assert it implements every method listed in Renderer.js JSDoc typedef.
// Nobody can silently drop a method without this test failing.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Hand-maintained list of required methods extracted from js/render/Renderer.js.
// Keep in sync with the @typedef in that file.
const REQUIRED_METHODS = [
    'drawPlayer',
    'drawRemotePlayer',
    'drawEnemy',
    'drawPickup',
    'drawXPOrb',
    'drawPowerup',
    'drawBullets',
    'drawParticles',
    'drawNotifications',
    'drawBackground',
    'drawStarfield',
    'drawArenaObstacles',
    'drawBossIndicators',
    'drawStanceRing',
    'drawCoopAuras',
    'drawFogOfWar',
    'drawLowHPVignette',
    'drawScreenOverlays',
    'drawJoystick',
    'drawActivePowerups',
    'drawComboMeter',
    'drawPauseMenu',
    'drawWeaponIndicator',
    'drawMinimap',
    'drawComboCounter',
    'drawStanceWeatherHUD',
    'drawXPBar',
    'drawWaveModifier',
    'drawCorruptionIndicator',
    'drawDashIndicator',
    'drawDPSMeter',
    'drawBossHealthBar',
    'drawWeaponVisual',
];

/**
 * Build a fake renderer that implements every method in REQUIRED_METHODS
 * as a no-op. This is the "minimal conforming" renderer.
 */
function makeFakeRenderer() {
    const r = {};
    for (const name of REQUIRED_METHODS) {
        r[name] = () => {};
    }
    return r;
}

// ─────────────────────────────────────────────────────────────────────────────

test('Renderer interface: fake renderer satisfies all required methods', () => {
    const r = makeFakeRenderer();
    for (const name of REQUIRED_METHODS) {
        assert.equal(
            typeof r[name], 'function',
            `fake renderer must expose ${name} as a function`,
        );
    }
});

test('Renderer interface: calling every method on fake renderer does not throw', () => {
    const r = makeFakeRenderer();
    for (const name of REQUIRED_METHODS) {
        assert.doesNotThrow(
            () => r[name]({}),
            `${name}({}) must not throw`,
        );
    }
});

test('Renderer interface: REQUIRED_METHODS matches Renderer.js typedef', async () => {
    // Parse the JSDoc in js/render/Renderer.js and extract @property names.
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname  = dirname(__filename);
    const src = readFileSync(join(__dirname, '../js/render/Renderer.js'), 'utf8');

    // Extract every @property line: "@property {…} drawXxx"
    const re = /@property\s+\{[^}]+\}\s+(\w+)/g;
    const names = [];
    let m;
    while ((m = re.exec(src)) !== null) {
        const name = m[1];
        // Skip non-method properties (ctx is a CanvasRenderingContext2D, not a method).
        if (name !== 'ctx') names.push(name);
    }

    assert.ok(names.length > 0, 'Renderer.js must define at least one @property');

    // Every name found in Renderer.js must be in REQUIRED_METHODS.
    for (const name of names) {
        assert.ok(
            REQUIRED_METHODS.includes(name),
            `Renderer.js @property "${name}" is missing from REQUIRED_METHODS in renderer.test.mjs`,
        );
    }

    // Every name in REQUIRED_METHODS must exist in Renderer.js.
    for (const name of REQUIRED_METHODS) {
        assert.ok(
            names.includes(name),
            `REQUIRED_METHODS includes "${name}" but it is not in Renderer.js @typedef`,
        );
    }
});
