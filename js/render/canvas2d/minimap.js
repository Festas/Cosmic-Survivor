export function drawMinimap(game, ctx) {
    const CONFIG = window.CONFIG || {};
    if (game.state !== 'playing') return;

    const isMobile = CONFIG.CANVAS_WIDTH < 800;
    const mapW = isMobile ? 100 : 150;
    const mapH = isMobile ? 67 : 100;
    const mapX = CONFIG.CANVAS_WIDTH - mapW - 10;
    const mapY = CONFIG.CANVAS_HEIGHT - mapH - 10;
    const scaleX = mapW / (CONFIG.WORLD_WIDTH || 3200);
    const scaleY = mapH / (CONFIG.WORLD_HEIGHT || 2400);

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.strokeRect(mapX, mapY, mapW, mapH);

    ctx.strokeStyle = '#4ecdc4'; ctx.lineWidth = 1;
    ctx.strokeRect(
        mapX + game.camera.x * scaleX,
        mapY + game.camera.y * scaleY,
        CONFIG.CANVAS_WIDTH * scaleX,
        CONFIG.CANVAS_HEIGHT * scaleY
    );

    if (game.player) {
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(mapX + game.player.x * scaleX, mapY + game.player.y * scaleY, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    if (game.isMultiplayer) {
        for (const rp of game.remotePlayers.values()) {
            if (rp.isAlive) {
                ctx.fillStyle = rp.color;
                ctx.beginPath();
                ctx.arc(mapX + rp.x * scaleX, mapY + rp.y * scaleY, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    ctx.fillStyle = '#ff6b6b';
    game.enemies.forEach(e => {
        const dotSize = e.isBoss ? 3 : 1;
        ctx.beginPath();
        ctx.arc(mapX + e.x * scaleX, mapY + e.y * scaleY, dotSize, 0, Math.PI * 2);
        ctx.fill();
    });

    if (game.xpOrbs) {
        ctx.fillStyle = '#a855f7';
        game.xpOrbs.forEach((orb, i) => {
            if (i % 5 === 0) {
                ctx.fillRect(mapX + orb.x * scaleX - 0.5, mapY + orb.y * scaleY - 0.5, 1, 1);
            }
        });
    }

    ctx.restore();
}
