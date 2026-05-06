export function drawCoopAuras(game, ctx) {
    if (!game.isMultiplayer || !window.rework?.coop || !game.remotePlayers?.size) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    for (const rp of game.remotePlayers.values()) {
        if (!rp || rp.isDowned) continue;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, window.rework.coop.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
}
