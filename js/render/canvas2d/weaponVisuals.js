/**
 * Draw a weapon-specific icon at (ox, oy) rotated so that the weapon
 * faces "outward" along orbitAngle.  ctx should already have globalAlpha
 * and shadowBlur set by the caller.
 */
export function drawWeaponVisual(ctx, slotType, ox, oy, orbitAngle, color, now) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(orbitAngle);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    switch (slotType) {
        case 'basic': {
            ctx.fillRect(-5, -3, 7, 6);
            ctx.fillRect(2, -1.5, 6, 3);
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fillRect(-4, -2.5, 4, 2);
            break;
        }
        case 'laser': {
            ctx.beginPath();
            ctx.moveTo(9, 0);
            ctx.lineTo(4, -4);
            ctx.lineTo(-6, -3);
            ctx.lineTo(-6, 3);
            ctx.lineTo(4, 4);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.65)';
            ctx.beginPath();
            ctx.moveTo(9, 0); ctx.lineTo(4, -3); ctx.lineTo(2, -1); ctx.lineTo(3, 0); ctx.closePath();
            ctx.fill();
            break;
        }
        case 'rocket': {
            ctx.fillRect(-5, -3, 10, 6);
            ctx.beginPath();
            ctx.moveTo(5, -3); ctx.lineTo(10, 0); ctx.lineTo(5, 3); ctx.closePath();
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-5, -3); ctx.lineTo(-9, -7); ctx.lineTo(-4, -3); ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-5, 3); ctx.lineTo(-9, 7); ctx.lineTo(-4, 3); ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ff9900';
            ctx.beginPath(); ctx.arc(-7, 0, 2.5, 0, Math.PI * 2); ctx.fill();
            break;
        }
        case 'spread': {
            ctx.fillRect(-6, -5.5, 6, 11);
            ctx.fillRect(0, -5, 9, 4);
            ctx.fillRect(0, 1, 9, 4);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(1, -4.5, 7, 1.5);
            ctx.fillRect(1, 1.5, 7, 1.5);
            break;
        }
        case 'flamethrower': {
            ctx.fillRect(-6, -4, 10, 8);
            ctx.fillRect(4, -2, 5, 4);
            const flicker = Math.sin(now * 0.02) * 1.5;
            ctx.fillStyle = '#ffee00';
            ctx.beginPath(); ctx.arc(12 + flicker * 0.5, -1.5, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff6600';
            ctx.beginPath(); ctx.arc(12.5 + flicker, 0.5, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff2200';
            ctx.beginPath(); ctx.arc(13 + flicker * 0.8, -0.5, 1.5, 0, Math.PI * 2); ctx.fill();
            break;
        }
        case 'lightning': {
            ctx.lineJoin = 'miter';
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath();
            ctx.moveTo(-4, -8); ctx.lineTo(3, -1); ctx.lineTo(-2, 2); ctx.lineTo(5, 9);
            ctx.stroke();
            ctx.lineWidth = 2;
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(-4, -8); ctx.lineTo(3, -1); ctx.lineTo(-2, 2); ctx.lineTo(5, 9);
            ctx.stroke();
            break;
        }
        case 'freeze': {
            const spin = now * 0.0008;
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = color;
            for (let arm = 0; arm < 6; arm++) {
                const aa = spin + (arm / 6) * Math.PI * 2;
                const ex = Math.cos(aa) * 9;
                const ey = Math.sin(aa) * 9;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex, ey); ctx.stroke();
                const bx = Math.cos(aa) * 5.5;
                const by = Math.sin(aa) * 5.5;
                const px = Math.sin(aa) * 3;
                const py = -Math.cos(aa) * 3;
                ctx.beginPath();
                ctx.moveTo(bx - px, by - py);
                ctx.lineTo(bx + px, by + py);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
            break;
        }
        case 'plasma': {
            ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
            ctx.save();
            ctx.rotate(now * 0.004);
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(0, 0, 11, 4, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath(); ctx.arc(-2.5, -2.5, 3, 0, Math.PI * 2); ctx.fill();
            break;
        }
        default: {
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath(); ctx.arc(-2.5, -2.5, 3, 0, Math.PI * 2); ctx.fill();
            break;
        }
    }

    ctx.restore();
}
