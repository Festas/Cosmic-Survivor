export function drawBullet(bullet, ctx) {
    ctx.fillStyle = bullet.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

export function drawBullets(bullets, ctx) {
    for (const b of bullets) {
        if (typeof b.draw === 'function') {
            b.draw(ctx);
        } else {
            ctx.save();
            const color = b.color || '#ff6b6b';
            ctx.fillStyle = color;
            ctx.shadowBlur = 12;
            ctx.shadowColor = color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size || 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}
