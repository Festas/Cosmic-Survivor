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
        this.ctx = canvas.getContext('2d');
    }

    render(game, timestamp) {
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
