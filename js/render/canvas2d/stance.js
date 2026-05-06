export function drawStanceRing(game, ctx) {
    if (!window.rework || !window.rework.stance || !game.player) return;
    const s = window.rework.stance;
    const cx = game.player.x, cy = game.player.y, r = game.player.size + 10;
    ctx.save();
    if (s.isFocused) {
        const pulse = 0.55 + Math.sin(Date.now() * 0.008) * 0.25;
        ctx.strokeStyle = `rgba(255, 217, 61, ${pulse})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    } else if (s.focusCharge > 0.05) {
        ctx.strokeStyle = 'rgba(255, 217, 61, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.focusCharge);
        ctx.stroke();
    }
    ctx.restore();
}
