export function _lightenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
    const b = Math.min(255, (num & 0x0000FF) + amount);
    return `rgb(${r},${g},${b})`;
}

export function _darkenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
    const b = Math.max(0, (num & 0x0000FF) - amount);
    return `rgb(${r},${g},${b})`;
}

export function drawRemotePlayer(rp, ctx) {
    if (!rp.isAlive) return;

    ctx.save();
    ctx.translate(rp.x, rp.y);

    const scale = rp.facingRight ? 1 : -1;
    ctx.scale(scale, 1);

    const s = rp.size;

    ctx.fillStyle = rp.color;
    ctx.beginPath();
    ctx.ellipse(0, 2, s * 0.35, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = _lightenColor(rp.color, 30);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(0, -s * 0.25, s * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rp.color;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(s * 0.05, -s * 0.25, s * 0.2, -0.3, 1.2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(-s * 0.05, -s * 0.32, s * 0.06, 0, Math.PI * 2);
    ctx.fill();

    const legOffset = rp.walkFrame === 1 ? 3 : -3;
    ctx.fillStyle = _darkenColor(rp.color, 30);
    ctx.fillRect(-s * 0.2, s * 0.3, s * 0.15, s * 0.2 + legOffset);
    ctx.fillRect(s * 0.05, s * 0.3, s * 0.15, s * 0.2 - legOffset);

    ctx.fillRect(-s * 0.4, -s * 0.05, s * 0.15, s * 0.25);
    ctx.fillRect(s * 0.25, -s * 0.05, s * 0.15, s * 0.25);

    ctx.restore();

    ctx.save();
    ctx.fillStyle = rp.color;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(rp.displayName, rp.x, rp.y - s - 8);

    ctx.fillStyle = '#ffd93d';
    ctx.font = '9px monospace';
    ctx.fillText(`Lv.${rp.level}`, rp.x, rp.y - s + 2);

    if (rp.health < rp.maxHealth) {
        const barWidth = 40;
        const barHeight = 4;
        const barX = rp.x - barWidth / 2;
        const barY = rp.y - s - 18;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const healthPercent = Math.max(0, rp.health / rp.maxHealth);
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffd93d' : '#ff6b6b';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }

    if (rp.isDashing) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = rp.color;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, s * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}
