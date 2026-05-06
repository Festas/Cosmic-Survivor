export function drawParticles(game, ctx) {
    game.particles.forEach(p => {
        if (p.type === 'text') {
            ctx.save();
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.font = `bold ${p.fontSize * p.scale}px monospace`;
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.strokeText(p.text, p.x, p.y);
            ctx.fillText(p.text, p.x, p.y);
            if (p.text.includes('!') || p.fontSize > 16) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10 * (p.life / p.maxLife);
                ctx.fillText(p.text, p.x, p.y);
            }
            ctx.restore();
        } else if (p.type === 'explosion') {
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (p.type === 'fire_trail') {
            ctx.save();
            ctx.globalAlpha = p.life / p.maxLife * 0.7;
            ctx.fillStyle = p.color;
            ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (p.type === 'lightning_arc') {
            ctx.save();
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            const midX = (p.x + p.x2) / 2 + (Math.random() - 0.5) * 30;
            const midY = (p.y + p.y2) / 2 + (Math.random() - 0.5) * 30;
            ctx.quadraticCurveTo(midX, midY, p.x2, p.y2);
            ctx.stroke();
            ctx.restore();
        } else {
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 3;
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
            ctx.restore();
        }
    });
}
