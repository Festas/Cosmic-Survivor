export function drawPowerup(powerup, ctx) {
    const bob = Math.sin(Date.now() * 0.005 + powerup.bobOffset) * 5;

    ctx.save();
    ctx.globalAlpha = powerup.life < 120 ? 0.5 + Math.sin(Date.now() * 0.02) * 0.5 : 1;

    ctx.shadowColor = powerup.data.color;
    ctx.shadowBlur = 15;

    ctx.fillStyle = powerup.data.color;
    ctx.beginPath();
    ctx.arc(powerup.x, powerup.y + bob, powerup.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(powerup.x, powerup.y + bob, powerup.size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

export function drawActivePowerups(game, ctx) {
    ctx.save();
    let offsetY = 150;
    game.activePowerups.forEach((p, i) => {
        const x = 20;
        const y = offsetY + i * 45;
        const progress = p.timeLeft / p.maxTime;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, 150, 35);

        ctx.fillStyle = p.data.color;
        ctx.fillRect(x, y, 150 * progress, 35);

        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 5;
        ctx.fillText(p.data.name, x + 5, y + 22);

        const CONFIG = window.CONFIG || { TARGET_FPS: 60 };
        const timeLeft = Math.ceil(p.timeLeft / CONFIG.TARGET_FPS);
        ctx.textAlign = 'right';
        ctx.fillText(`${timeLeft}s`, x + 145, y + 22);
    });
    ctx.restore();
}
