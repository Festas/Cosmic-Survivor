import { drawBackground, drawStarfield, drawGrid, drawArenaObstacles, drawBossIndicators, drawFogOfWar, drawLowHPVignette } from './canvas2d/arena.js';
import { drawPlayer } from './canvas2d/player.js';
import { drawRemotePlayer } from './canvas2d/remotePlayer.js';
import { drawEnemy } from './canvas2d/enemy.js';
import { drawBullets } from './canvas2d/bullet.js';
import { drawParticles } from './canvas2d/particles.js';
import { drawPickup, drawXPOrb } from './canvas2d/pickups.js';
import { drawPowerup, drawActivePowerups } from './canvas2d/powerups.js';
import { drawMinimap } from './canvas2d/minimap.js';
import { drawStanceRing } from './canvas2d/stance.js';
import { drawCoopAuras } from './canvas2d/coopAura.js';
import {
    drawNotifications, drawJoystick, drawComboMeter, drawPauseMenu,
    drawWeaponIndicator, drawComboCounter, drawStanceWeatherHUD, drawXPBar,
    drawWaveModifier, drawCorruptionIndicator, drawDashIndicator,
    drawDPSMeter, drawScreenOverlays, drawBossHealthBar,
} from './canvas2d/hud.js';

export class Canvas2DRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.kind = 'canvas2d';
        this.drawCalls = 0;
        this.layers = 2; // world + HUD (two ctx.save/restore blocks per frame)

        const raw = canvas.getContext('2d');

        // Wrap the raw ctx so every beginPath / fillRect / drawImage / fillText
        // increments drawCalls. We wrap once here so leaf modules stay clean.
        // The wrapped functions are cached (not re-created per-get) to avoid
        // hot-path overhead.
        const self = this;
        const _beginPath = raw.beginPath ? raw.beginPath.bind(raw) : () => {};
        const _fillRect  = raw.fillRect  ? raw.fillRect.bind(raw)  : () => {};
        const _drawImage = raw.drawImage ? raw.drawImage.bind(raw) : () => {};
        const _fillText  = raw.fillText  ? raw.fillText.bind(raw)  : () => {};
        const _wrapped = {
            beginPath(...args) { self.drawCalls++; return _beginPath(...args); },
            fillRect(...args)  { self.drawCalls++; return _fillRect(...args);  },
            drawImage(...args) { self.drawCalls++; return _drawImage(...args); },
            fillText(...args)  { self.drawCalls++; return _fillText(...args);  },
        };
        this.ctx = new Proxy(raw, {
            get(target, prop) {
                if (prop in _wrapped) return _wrapped[prop];
                const v = target[prop];
                if (typeof v === 'function') return v.bind(target);
                return v;
            },
            set(target, prop, value) {
                target[prop] = value;
                return true;
            },
        });
    }

    render(game, timestamp) {
        this.drawCalls = 0;
        const ctx = this.ctx;
        const CONFIG = window.CONFIG || {};
        ctx.save();
        ctx.translate(-game.camera.x, -game.camera.y);

        drawBackground(game, ctx);
        drawStarfield(game, ctx);
        drawGrid(game, ctx, timestamp);
        drawArenaObstacles(game, ctx);
        drawBossIndicators(game, ctx);

        if (game.xpOrbs) game.xpOrbs.forEach(o => drawXPOrb(o, ctx));
        if (game.pickups) game.pickups.forEach(p => drawPickup(p, ctx));
        if (game.powerups) game.powerups.forEach(p => drawPowerup(p, ctx));

        game.enemies.forEach(e => drawEnemy(e, ctx));
        drawBullets(game.bullets || [], ctx);

        if (game.player) {
            drawPlayer(game.player, ctx);
            drawStanceRing(game, ctx);
        }

        if (game.isMultiplayer && game.remotePlayers) {
            for (const rp of game.remotePlayers.values()) drawRemotePlayer(rp, ctx);
            drawCoopAuras(game, ctx);
        }

        drawParticles(game, ctx);
        drawFogOfWar(game, ctx);
        drawLowHPVignette(game, ctx);

        ctx.restore();

        // HUD (screen-space)
        ctx.save();
        ctx.translate(game.camera.x, game.camera.y);
        drawScreenOverlays(game, ctx);
        drawBossHealthBar(game, ctx);
        drawNotifications(game, ctx);
        drawJoystick(game, ctx);
        drawActivePowerups(game, ctx);
        drawComboMeter(game, ctx);
        drawComboCounter(game, ctx);
        drawWeaponIndicator(game, ctx);
        drawMinimap(game, ctx);
        drawStanceWeatherHUD(game, ctx);
        drawXPBar(game, ctx);
        drawWaveModifier(game, ctx);
        drawCorruptionIndicator(game, ctx);
        drawDashIndicator(game, ctx);
        drawDPSMeter(game, ctx);
        if (game.state === 'paused') drawPauseMenu(game, ctx);
        ctx.restore();
    }
}
