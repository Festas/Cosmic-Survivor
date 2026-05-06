export function drawPickup(pickup, ctx) {
    const CONFIG = window.CONFIG || {};
    const bob = Math.sin(Date.now() / 200 + pickup.bob) * 3;
    ctx.save();
    ctx.fillStyle = '#ffd93d';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffd93d';
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y + bob, pickup.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', pickup.x, pickup.y + bob);
    ctx.restore();
}

export function drawXPOrb(orb, ctx) {
    const bob = Math.sin(Date.now() * 0.004 + orb.bobOffset) * 3;
    const pulse = Math.sin(Date.now() * 0.006 + orb.bobOffset) * 0.3 + 0.7;

    ctx.save();
    if (orb.life < 120) {
        ctx.globalAlpha = orb.life / 120;
    }

    ctx.fillStyle = orb.glowColor;
    ctx.globalAlpha *= 0.3 * pulse;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y + bob, orb.size * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = orb.life < 120 ? orb.life / 120 : 1;
    ctx.fillStyle = orb.color;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y + bob, orb.size * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.globalAlpha *= 0.6;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y + bob, orb.size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}
