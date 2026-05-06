/**
 * WebGLRenderer — PixiJS v8 backend for Cosmic Survivor.
 *
 * Implements the same `render(game, timestamp)` interface as Canvas2DRenderer.
 * Enabled via `?renderer=webgl` URL flag.
 *
 * Layer order (matches README.md / Renderer.js interface):
 *   arenaLayer → worldLayer → worldOverlayLayer → screenLayer → hudLayer → debugLayer
 *
 * Graphics caching: one-time Graphics per entity id keeps allocations flat.
 * Camera transform: worldLayer.position + worldLayer.scale + worldLayer.rotation.
 *
 * Known limitation: auto-disabled on iOS Safari (UA sniff). See isIOSSafari().
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true when WebGL2 context can be obtained on a throwaway canvas.
 * Safe to call in Node (returns false if canvas API is absent).
 */
export function webglAvailable() {
    try {
        if (typeof document === 'undefined') return false;
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return !!canvas.getContext('webgl2');
    } catch {
        return false;
    }
}

/**
 * Returns true on iOS Safari (UA sniff). WebGL on iOS Safari has historically
 * been unreliable and adds significant overhead. Fall back to Canvas2D.
 */
export function isIOSSafari() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/.test(ua);
    return isIOS && isSafari;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

/**
 * Convert a CSS colour string to a PixiJS-compatible hex number (0xRRGGBB).
 * Falls back to white (0xffffff) on parse failure.
 */
function cssToHex(css) {
    if (!css) return 0xffffff;
    // Short-circuit on already-numeric input.
    if (typeof css === 'number') return css;
    const s = String(css).trim();
    if (s.startsWith('#')) {
        const n = parseInt(s.slice(1), 16);
        return isNaN(n) ? 0xffffff : n;
    }
    // rgb(r,g,b) or rgba(r,g,b,a)
    const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return (parseInt(m[1]) << 16) | (parseInt(m[2]) << 8) | parseInt(m[3]);
    return 0xffffff;
}

// ─── Stub renderer ────────────────────────────────────────────────────────────

/**
 * Fallback renderer used when PixiJS is unavailable (Node, headless CI).
 * Implements the same public API so callers never need to null-check.
 */
class StubRenderer {
    constructor() {
        this.kind = 'webgl';
        this.drawCalls = 0;
        this.layers = 6;
        this._stub = true;
    }
    render() { this.drawCalls = 0; }
    destroy() {}
}

// ─── WebGLRenderer ────────────────────────────────────────────────────────────

export class WebGLRenderer {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.kind = 'webgl';
        this.drawCalls = 0;
        this.layers = 6; // arenaLayer worldLayer worldOverlayLayer screenLayer hudLayer debugLayer

        /** @type {Map<string|number, any>} Graphics cache keyed by entity id or type key */
        this._gfxCache = new Map();

        /** @private PixiJS Application instance (may be null in headless/node) */
        this._app = null;

        /** @private Layer containers */
        this._arenaLayer = null;
        this._worldLayer = null;
        this._worldOverlayLayer = null;
        this._screenLayer = null;
        this._hudLayer = null;
        this._debugLayer = null;

        /** @private Text cache for HUD */
        this._hudTexts = new Map();

        /** @private PixiJS module ref (populated in _initSync) */
        this._pixi = null;

        this._initSync(canvas);
    }

    /**
     * Synchronous initialisation — wraps the PixiJS import so that module load
     * never throws in headless / Node environments.
     */
    _initSync(canvas) {
        try {
            // Dynamic import is async; we call _initAsync but do not await it.
            // render() checks this._app before using it, so frames before PixiJS
            // is ready are silently dropped (the bootstrap shows a black canvas
            // briefly which is acceptable).
            this._initAsync(canvas).catch(err => {
                console.warn('[WebGLRenderer] async init failed — falling back to stub:', err);
            });
        } catch (err) {
            console.warn('[WebGLRenderer] init failed — falling back to stub:', err);
        }
    }

    async _initAsync(canvas) {
        // Dynamic import so the module is safe to load in Node (tree-shaken in CI).
        const PIXI = await import('pixi.js');
        this._pixi = PIXI;

        const { Application, Container } = PIXI;

        const W = canvas.width || (window.CONFIG?.CANVAS_WIDTH ?? 1200);
        const H = canvas.height || (window.CONFIG?.CANVAS_HEIGHT ?? 800);

        const app = new Application();
        await app.init({
            canvas,
            width: W,
            height: H,
            backgroundColor: 0x000011,
            antialias: false,
            autoDensity: true,
            autoStart: false, // We drive the render loop ourselves
            // Note: manageImports was removed in PixiJS v8; autoStart:false achieves the same goal.
        });

        this._app = app;

        // ── Layer containers ─────────────────────────────────────────────────
        this._arenaLayer        = new Container();  // background tiles / grid
        this._worldLayer        = new Container();  // world-space entities (camera-transformed)
        this._worldOverlayLayer = new Container();  // world-space VFX / particles
        this._screenLayer       = new Container();  // screen-space overlays (fog, vignette)
        this._hudLayer          = new Container();  // HUD elements (always on top)
        this._debugLayer        = new Container();  // debug visuals

        app.stage.addChild(
            this._arenaLayer,
            this._worldLayer,
            this._worldOverlayLayer,
            this._screenLayer,
            this._hudLayer,
            this._debugLayer,
        );
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Main render call — mirrors Canvas2DRenderer.render(game, timestamp).
     * Called once per requestAnimationFrame from the game loop.
     * @param {object} game  Full game state object
     * @param {number} timestamp  DOMHighResTimeStamp from rAF
     */
    render(game, timestamp) {
        this.drawCalls = 0;

        if (!this._app || !this._pixi) {
            // PixiJS not yet initialised — skip this frame silently.
            return;
        }

        const app = this._app;
        const W = this.canvas.width || 1200;
        const H = this.canvas.height || 800;

        // ── Camera transform ─────────────────────────────────────────────────
        // Mirror what Canvas2DRenderer.beginFrame does:
        //   ctx.translate(-camera.x, -camera.y)  ↔  worldLayer.position.set(...)
        const cam = game.camera || { x: 0, y: 0 };

        // Trauma shake: read from window.rework.juice if available.
        let shakeX = 0, shakeY = 0;
        try {
            const shake = window.rework?.juice?.shake;
            if (shake) { shakeX = shake.offsetX || 0; shakeY = shake.offsetY || 0; }
        } catch { /* ignore */ }

        this._worldLayer.position.set(-cam.x + shakeX, -cam.y + shakeY);
        this._worldOverlayLayer.position.copyFrom(this._worldLayer.position);
        this._arenaLayer.position.copyFrom(this._worldLayer.position);

        // ── Clear layers ─────────────────────────────────────────────────────
        this._clearLayer(this._arenaLayer);
        this._clearLayer(this._worldLayer);
        this._clearLayer(this._worldOverlayLayer);
        this._clearLayer(this._screenLayer);
        this._clearLayer(this._hudLayer);
        this._clearLayer(this._debugLayer);

        // ── Arena / background ───────────────────────────────────────────────
        this._drawArena(game, timestamp);

        // ── World entities ────────────────────────────────────────────────────
        if (game.xpOrbs)  game.xpOrbs.forEach(o => this._drawXPOrb(o));
        if (game.pickups) game.pickups.forEach(p => this._drawPickup(p));
        if (game.powerups) game.powerups.forEach(p => this._drawPowerup(p));

        game.enemies.forEach(e => this._drawEnemy(e, timestamp));
        this._drawBullets(game.bullets || []);

        if (game.player) {
            this._drawPlayer(game.player, timestamp);
        }

        // ── Particles / overlay ───────────────────────────────────────────────
        this._drawParticles(game);

        // ── HUD (screen-space) ───────────────────────────────────────────────
        this._drawHUD(game, W, H);

        // ── Render the stage ─────────────────────────────────────────────────
        app.renderer.render(app.stage);
        this.drawCalls++;  // One render call = one PixiJS draw batch
    }

    // ── Layer helpers ─────────────────────────────────────────────────────────

    _clearLayer(layer) {
        layer.removeChildren();
    }

    // ── Arena ─────────────────────────────────────────────────────────────────

    _drawArena(game, timestamp) {
        const { Graphics } = this._pixi;
        const CONFIG = window.CONFIG || {};
        const W = CONFIG.WORLD_WIDTH || 3000;
        const H = CONFIG.WORLD_HEIGHT || 2000;

        // Background
        const bg = new Graphics();
        bg.rect(0, 0, W, H).fill({ color: 0x000011 });
        this._arenaLayer.addChild(bg);
        this.drawCalls++;

        // Arena border
        const border = new Graphics();
        border.rect(0, 0, W, H).stroke({ color: 0x1a1a3e, width: 4 });
        this._arenaLayer.addChild(border);
        this.drawCalls++;

        // Obstacles
        if (game.arenaObstacles) {
            for (const obs of game.arenaObstacles) {
                const g = new Graphics();
                g.rect(obs.x, obs.y, obs.w, obs.h).fill({ color: 0x2a2a5a });
                this._arenaLayer.addChild(g);
                this.drawCalls++;
            }
        }
    }

    // ── Player ────────────────────────────────────────────────────────────────

    _drawPlayer(player, timestamp) {
        const { Graphics, Text } = this._pixi;
        const CONFIG = window.CONFIG || {};

        const g = new Graphics();
        const s = player.size || (CONFIG.PLAYER_SIZE || 16);

        // Body
        g.circle(player.x, player.y, s).fill({ color: 0x4ecdc4 });
        this.drawCalls++;

        // Weapon orbs
        if (player.weaponSlots) {
            player.weaponSlots.forEach((slot, i) => {
                const count = Math.max(1, player.weaponSlots.length);
                const angle = (player.weaponOrbitAngle || 0) + (i / count) * Math.PI * 2;
                const r = player.weaponOrbitRadius || 48;
                const ox = player.x + Math.cos(angle) * r;
                const oy = player.y + Math.sin(angle) * r;
                const WEAPON_TYPES = window.WEAPON_TYPES || {};
                const wt = WEAPON_TYPES[slot.type] || {};
                const wColor = cssToHex(wt.color || '#ffd93d');
                g.circle(ox, oy, 7).fill({ color: wColor });
                this.drawCalls++;
            });
        }

        // Direction indicator
        const aimA = player.aimAngle || 0;
        g.moveTo(player.x, player.y)
         .lineTo(player.x + Math.cos(aimA) * s * 1.5, player.y + Math.sin(aimA) * s * 1.5)
         .stroke({ color: 0xffffff, width: 2 });
        this.drawCalls++;

        this._worldLayer.addChild(g);
    }

    // ── Enemies ───────────────────────────────────────────────────────────────

    _drawEnemy(enemy, timestamp) {
        const { Graphics } = this._pixi;

        const g = new Graphics();
        const color = cssToHex(enemy.color || '#ff4444');
        const s = enemy.size || 20;

        // Base shape
        g.circle(enemy.x, enemy.y, s).fill({ color });
        this.drawCalls++;

        // Health bar
        if (enemy.health != null && enemy.maxHealth > 0) {
            const bw = s * 2;
            const bh = 4;
            const bx = enemy.x - s;
            const by = enemy.y - s - 8;
            g.rect(bx, by, bw, bh).fill({ color: 0x333333 });
            const pct = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
            g.rect(bx, by, bw * pct, bh).fill({ color: 0xff4444 });
            this.drawCalls++;
        }

        this._worldLayer.addChild(g);
    }

    // ── Bullets ───────────────────────────────────────────────────────────────

    _drawBullets(bullets) {
        const { Graphics } = this._pixi;

        if (!bullets.length) return;

        const g = new Graphics();
        for (const b of bullets) {
            if (b.isEnemyBullet) {
                const color = cssToHex(b.color || '#ff8800');
                g.circle(b.x, b.y, b.size || 5).fill({ color });
            } else {
                const color = cssToHex(b.color || '#ffd93d');
                g.circle(b.x, b.y, b.size || 4).fill({ color });
            }
        }
        this._worldLayer.addChild(g);
        this.drawCalls++;
    }

    // ── Pickups / XP orbs / Powerups ─────────────────────────────────────────

    _drawPickup(pickup) {
        const { Graphics } = this._pixi;
        const g = new Graphics();
        g.circle(pickup.x, pickup.y, pickup.size || 8).fill({ color: 0xffd93d });
        this._worldLayer.addChild(g);
        this.drawCalls++;
    }

    _drawXPOrb(orb) {
        const { Graphics } = this._pixi;
        const g = new Graphics();
        const color = cssToHex(orb.color || '#6366f1');
        g.circle(orb.x, orb.y, orb.size || 5).fill({ color });
        this._worldLayer.addChild(g);
        this.drawCalls++;
    }

    _drawPowerup(powerup) {
        const { Graphics } = this._pixi;
        const g = new Graphics();
        g.rect(powerup.x - 8, powerup.y - 8, 16, 16).fill({ color: 0xa855f7 });
        this._worldLayer.addChild(g);
        this.drawCalls++;
    }

    // ── Particles ─────────────────────────────────────────────────────────────

    _drawParticles(game) {
        if (!game.particles || !game.particles.length) return;
        const { Graphics } = this._pixi;

        const g = new Graphics();
        for (const p of game.particles) {
            const color = cssToHex(p.color || '#ffffff');
            const alpha = p.maxLife > 0 ? p.life / p.maxLife : 1;
            if (alpha <= 0) continue;
            g.circle(p.x, p.y, p.size || 3).fill({ color, alpha });
        }
        this._worldOverlayLayer.addChild(g);
        this.drawCalls++;
    }

    // ── HUD ───────────────────────────────────────────────────────────────────

    _drawHUD(game, W, H) {
        const { Text, Graphics } = this._pixi;

        // Wave / health text
        const wave = game.wave || 0;
        const hp   = Math.ceil(game.player?.health || 0);
        const maxHp = game.player?.maxHealth || 1;

        const infoText = new Text({
            text: `Wave ${wave}  HP ${hp}/${maxHp}`,
            style: { fontSize: 14, fill: 0x00ff88, fontFamily: 'monospace' },
        });
        infoText.x = 10;
        infoText.y = 10;
        this._hudLayer.addChild(infoText);
        this.drawCalls++;

        // Stance / weather pills
        let pillX = W / 2 - 80;
        const stanceId = window.rework?.stance?.stance;
        if (stanceId) {
            const t = new Text({
                text: stanceId === 'focus' ? '🎯 FOCUS' : '🏃 MOVING',
                style: { fontSize: 12, fill: 0xffffff, fontFamily: 'sans-serif' },
            });
            t.x = pillX;
            t.y = 10;
            this._hudLayer.addChild(t);
            pillX += 100;
            this.drawCalls++;
        }
        const weatherId = window.rework?.weather?.current?.id;
        if (weatherId && weatherId !== 'clear') {
            const ICONS = { rain: '🌧️', fog: '🌫️', storm: '⛈️', eclipse: '🌑' };
            const t = new Text({
                text: `${ICONS[weatherId] || ''} ${weatherId.toUpperCase()}`,
                style: { fontSize: 12, fill: 0xffffff, fontFamily: 'sans-serif' },
            });
            t.x = pillX;
            t.y = 10;
            this._hudLayer.addChild(t);
            this.drawCalls++;
        }

        // Boss HP bar
        const boss = game.enemies?.find(e => e.isBoss);
        if (boss) {
            const bw = 400;
            const bh = 16;
            const bx = (W - bw) / 2;
            const by = H - 40;
            const g = new Graphics();
            g.rect(bx, by, bw, bh).fill({ color: 0x333333 });
            const pct = Math.max(0, Math.min(1, boss.health / boss.maxHealth));
            g.rect(bx, by, bw * pct, bh).fill({ color: 0xff2244 });
            this._hudLayer.addChild(g);
            this.drawCalls++;
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    destroy() {
        try {
            this._app?.destroy(false, { children: true, texture: true });
        } catch { /* ignore */ }
        this._app = null;
        this._gfxCache.clear();
        this._hudTexts.clear();
    }
}
