function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}

function _drawGrunt(ctx, enemy, cx, cy, s, t, p, angle) {
    const pulse = Math.sin(t * 0.004) * 0.15 + 0.3;
    ctx.fillStyle = `rgba(${hexToRgb(p.glow)}, ${pulse})`;
    ctx.beginPath(); ctx.arc(cx, cy, s * 1.05, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.accent; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
        const tx = cx + (i - 1.5) * s * 0.22;
        const wave = Math.sin(t * 0.006 + i * 1.5) * s * 0.15;
        ctx.beginPath(); ctx.moveTo(tx, cy + s * 0.3);
        ctx.quadraticCurveTo(tx + wave, cy + s * 0.6, tx + wave * 0.5, cy + s * 0.85);
        ctx.stroke();
    }
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(cx, cy, s * 0.1, cx, cy, s * 0.5);
    grad.addColorStop(0, p.core); grad.addColorStop(1, p.body);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.48, 0, Math.PI * 2); ctx.fill();
    const eyeX = cx + Math.cos(angle) * s * 0.1;
    const eyeY = cy + Math.sin(angle) * s * 0.1;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.arc(eyeX, eyeY, s * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.glow;
    ctx.beginPath(); ctx.arc(eyeX + s * 0.03, eyeY - s * 0.03, s * 0.035, 0, Math.PI * 2); ctx.fill();
}

function _drawStalker(ctx, enemy, cx, cy, s, t, p, angle) {
    const moveAngle = Math.atan2((enemy.y - (enemy.prevY ?? enemy.y)), (enemy.x - (enemy.prevX ?? enemy.x)) || 0.01);
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = p.glow;
    for (let i = 1; i <= 3; i++) {
        const trailX = cx - Math.cos(moveAngle) * s * 0.3 * i;
        const trailY = cy - Math.sin(moveAngle) * s * 0.3 * i;
        ctx.beginPath(); ctx.arc(trailX, trailY, s * (0.3 - i * 0.06), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(moveAngle);
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(s * 0.6, 0);
    ctx.lineTo(-s * 0.3, -s * 0.35);
    ctx.lineTo(-s * 0.15, 0);
    ctx.lineTo(-s * 0.3, s * 0.35);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.core;
    ctx.beginPath();
    ctx.moveTo(s * 0.4, 0);
    ctx.lineTo(-s * 0.1, -s * 0.12);
    ctx.lineTo(-s * 0.1, s * 0.12);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.25);
    ctx.lineTo(-s * 0.5, -s * 0.45);
    ctx.lineTo(-s * 0.35, -s * 0.15);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, s * 0.25);
    ctx.lineTo(-s * 0.5, s * 0.45);
    ctx.lineTo(-s * 0.35, s * 0.15);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s * 0.15, 0, s * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.arc(s * 0.18, 0, s * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function _drawGolem(ctx, enemy, cx, cy, s, t, p) {
    const pulse = Math.sin(t * 0.003) * 0.1;
    ctx.fillStyle = p.core;
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + t * 0.002;
        const d = s * (0.75 + pulse);
        const sx = cx + Math.cos(a) * d;
        const sy = cy + Math.sin(a) * d;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(a + t * 0.004);
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.12); ctx.lineTo(s * 0.07, 0);
        ctx.lineTo(0, s * 0.12); ctx.lineTo(-s * 0.07, 0);
        ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = p.body;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const r = s * 0.55;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = p.glow; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.55); ctx.lineTo(cx, cy + s * 0.55);
    ctx.moveTo(cx - s * 0.47, cy - s * 0.27); ctx.lineTo(cx + s * 0.47, cy + s * 0.27);
    ctx.moveTo(cx - s * 0.47, cy + s * 0.27); ctx.lineTo(cx + s * 0.47, cy - s * 0.27);
    ctx.stroke();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.35);
    grad.addColorStop(0, p.core); grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - s * 0.15, cy - s * 0.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.15, cy - s * 0.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.arc(cx - s * 0.15, cy - s * 0.1, s * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.15, cy - s * 0.1, s * 0.04, 0, Math.PI * 2); ctx.fill();
}

function _drawDrone(ctx, enemy, cx, cy, s, t, p) {
    const wingFlutter = Math.sin(t * 0.04) * 0.4;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = p.core;
    ctx.save(); ctx.translate(cx, cy);
    ctx.save(); ctx.rotate(-0.6 + wingFlutter);
    ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.1, s * 0.45, s * 0.15, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.rotate(0.6 - wingFlutter);
    ctx.beginPath(); ctx.ellipse(s * 0.1, -s * 0.1, s * 0.45, s * 0.15, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.35); ctx.lineTo(cx + s * 0.2, cy);
    ctx.lineTo(cx, cy + s * 0.35); ctx.lineTo(cx - s * 0.2, cy);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - s * 0.06, cy - s * 0.08, s * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.06, cy - s * 0.08, s * 0.06, 0, Math.PI * 2); ctx.fill();
}

function _drawWarper(ctx, enemy, cx, cy, s, t, p) {
    const pulse = Math.sin(t * 0.005) * 0.15 + 0.85;
    const phaseAlpha = enemy.teleportCooldown > 150 ? 0.5 : 1;
    ctx.globalAlpha = phaseAlpha;
    ctx.strokeStyle = p.glow; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
        const tx = cx + (i - 2.5) * s * 0.16;
        const len = s * (0.5 + Math.sin(t * 0.004 + i) * 0.15);
        const wave1 = Math.sin(t * 0.007 + i * 0.8) * s * 0.12;
        const wave2 = Math.sin(t * 0.005 + i * 1.2) * s * 0.08;
        ctx.globalAlpha = phaseAlpha * (0.3 + i * 0.1);
        ctx.beginPath(); ctx.moveTo(tx, cy + s * 0.2);
        ctx.quadraticCurveTo(tx + wave1, cy + s * 0.2 + len * 0.5, tx + wave2, cy + s * 0.2 + len);
        ctx.stroke();
    }
    ctx.globalAlpha = phaseAlpha;
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.1, s * 0.45, Math.PI, 0);
    ctx.quadraticCurveTo(cx + s * 0.45, cy + s * 0.2, cx, cy + s * 0.25);
    ctx.quadraticCurveTo(cx - s * 0.45, cy + s * 0.2, cx - s * 0.45, cy - s * 0.1);
    ctx.fill();
    const grad = ctx.createRadialGradient(cx, cy - s * 0.1, 0, cx, cy - s * 0.1, s * 0.4);
    grad.addColorStop(0, p.core); grad.addColorStop(0.6, p.body); grad.addColorStop(1, p.accent);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.1, s * 0.35 * pulse, Math.PI, 0); ctx.fill();
    ctx.fillStyle = p.core;
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.05, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(${hexToRgb(p.glow)}, ${0.3 * pulse})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, s * (0.6 + i * 0.15) * pulse, s * 0.15, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function _drawMarksman(ctx, enemy, cx, cy, s, t, p, angle) {
    ctx.strokeStyle = `rgba(${hexToRgb(p.glow)}, 0.15)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * s * 4, cy + Math.sin(angle) * s * 4);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = p.accent; ctx.lineWidth = 2;
    const ringAngle = t * 0.003;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ringAngle);
    ctx.beginPath(); ctx.arc(0, 0, s * 0.55, 0, Math.PI * 1.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, s * 0.55, Math.PI * 1.4, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = p.accent;
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + t * 0.002;
        ctx.save(); ctx.translate(cx + Math.cos(a) * s * 0.45, cy + Math.sin(a) * s * 0.45);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillRect(-s * 0.03, -s * 0.12, s * 0.06, s * 0.24);
        ctx.restore();
    }
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2); ctx.fill();
    const eyeX = cx + Math.cos(angle) * s * 0.08;
    const eyeY = cy + Math.sin(angle) * s * 0.08;
    ctx.fillStyle = p.core;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.arc(eyeX, eyeY, s * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff0040';
    ctx.beginPath(); ctx.arc(eyeX + s * 0.02, eyeY, s * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff0040'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(eyeX - s * 0.1, eyeY); ctx.lineTo(eyeX + s * 0.1, eyeY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(eyeX, eyeY - s * 0.1); ctx.lineTo(eyeX, eyeY + s * 0.1); ctx.stroke();
}

function _drawOracle(ctx, enemy, cx, cy, s, t, p) {
    const wingBeat = Math.sin(t * 0.008) * 0.15;
    const healGlow = enemy.healCooldown < 30 ? (30 - enemy.healCooldown) / 30 : 0;
    if (healGlow > 0) {
        ctx.fillStyle = `rgba(0, 255, 136, ${healGlow * 0.2})`;
        ctx.beginPath(); ctx.arc(cx, cy, s * (1.2 + healGlow * 0.8), 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = p.body;
    ctx.globalAlpha = 0.6;
    ctx.save(); ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.1);
    ctx.quadraticCurveTo(-s * 0.7, -s * (0.6 + wingBeat), -s * 0.5, s * 0.1);
    ctx.quadraticCurveTo(-s * 0.3, s * 0.3, -s * 0.1, s * 0.15);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.1, -s * 0.1);
    ctx.quadraticCurveTo(s * 0.7, -s * (0.6 + wingBeat), s * 0.5, s * 0.1);
    ctx.quadraticCurveTo(s * 0.3, s * 0.3, s * 0.1, s * 0.15);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = p.glow; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - s * 0.1, cy); ctx.lineTo(cx - s * 0.5, cy - s * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + s * 0.1, cy); ctx.lineTo(cx + s * 0.5, cy - s * 0.3); ctx.stroke();
    ctx.fillStyle = p.core;
    ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.15, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    const haloPulse = Math.sin(t * 0.006) * 0.2 + 0.8;
    ctx.strokeStyle = `rgba(${hexToRgb(p.glow)}, ${haloPulse * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.35, s * 0.25, s * 0.06, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - s * 0.06, cy - s * 0.08, s * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.06, cy - s * 0.08, s * 0.05, 0, Math.PI * 2); ctx.fill();
}

function _drawMitotic(ctx, enemy, cx, cy, s, t, p) {
    const wobble1 = Math.sin(t * 0.005) * 0.12;
    const wobble2 = Math.sin(t * 0.007 + 1) * 0.1;
    const wobble3 = Math.sin(t * 0.006 + 2) * 0.08;
    ctx.fillStyle = p.body;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx + s * (0.5 + wobble1), cy);
    ctx.quadraticCurveTo(cx + s * (0.45 + wobble2), cy - s * (0.5 + wobble3), cx, cy - s * (0.48 + wobble1));
    ctx.quadraticCurveTo(cx - s * (0.5 + wobble3), cy - s * (0.45 + wobble2), cx - s * (0.5 + wobble2), cy);
    ctx.quadraticCurveTo(cx - s * (0.45 + wobble1), cy + s * (0.5 + wobble2), cx, cy + s * (0.5 + wobble3));
    ctx.quadraticCurveTo(cx + s * (0.5 + wobble3), cy + s * (0.45 + wobble1), cx + s * (0.5 + wobble1), cy);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.core;
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + t * 0.002;
        const d = s * 0.2;
        const nx = cx + Math.cos(a) * d;
        const ny = cy + Math.sin(a) * d;
        ctx.beginPath(); ctx.arc(nx, ny, s * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.accent;
        ctx.beginPath(); ctx.arc(nx, ny, s * 0.04, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.core;
    }
    ctx.strokeStyle = p.glow; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + s * (0.5 + wobble1), cy);
    ctx.quadraticCurveTo(cx + s * (0.45 + wobble2), cy - s * (0.5 + wobble3), cx, cy - s * (0.48 + wobble1));
    ctx.quadraticCurveTo(cx - s * (0.5 + wobble3), cy - s * (0.45 + wobble2), cx - s * (0.5 + wobble2), cy);
    ctx.quadraticCurveTo(cx - s * (0.45 + wobble1), cy + s * (0.5 + wobble2), cx, cy + s * (0.5 + wobble3));
    ctx.quadraticCurveTo(cx + s * (0.5 + wobble3), cy + s * (0.45 + wobble1), cx + s * (0.5 + wobble1), cy);
    ctx.stroke();
}

function _drawCryo(ctx, enemy, cx, cy, s, t, p) {
    ctx.fillStyle = p.core;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.003;
        const d = s * (0.7 + Math.sin(t * 0.005 + i) * 0.1);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.6); ctx.lineTo(cx + s * 0.25, cy - s * 0.15);
    ctx.lineTo(cx + s * 0.55, cy); ctx.lineTo(cx + s * 0.25, cy + s * 0.15);
    ctx.lineTo(cx, cy + s * 0.6); ctx.lineTo(cx - s * 0.25, cy + s * 0.15);
    ctx.lineTo(cx - s * 0.55, cy); ctx.lineTo(cx - s * 0.25, cy - s * 0.15);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = p.glow; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.6); ctx.lineTo(cx, cy + s * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - s * 0.55, cy); ctx.lineTo(cx + s * 0.55, cy); ctx.stroke();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.3);
    grad.addColorStop(0, '#fff'); grad.addColorStop(1, p.body);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2); ctx.fill();
    const frostPulse = Math.sin(t * 0.006) * 0.2 + 0.6;
    ctx.strokeStyle = `rgba(${hexToRgb(p.glow)}, ${frostPulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.8, 0, Math.PI * 2); ctx.stroke();
}

function _drawRavager(ctx, enemy, cx, cy, s, t, p) {
    const isEnraged = enemy.enraged;
    const ragePulse = isEnraged ? Math.sin(t * 0.015) * 0.3 + 0.7 : 0;
    if (isEnraged) {
        ctx.fillStyle = `rgba(255, 0, 0, ${ragePulse * 0.25})`;
        ctx.beginPath(); ctx.arc(cx, cy, s * 1.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(251, 146, 60, ${ragePulse * 0.5})`;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + t * 0.01;
            const d = s * (1.0 + Math.sin(t * 0.012 + i) * 0.2);
            ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s * 0.08, 0, Math.PI * 2); ctx.fill();
        }
    }
    const walkOff = enemy.walkFrame === 0 ? 0.15 : -0.15;
    ctx.fillStyle = p.accent;
    const legPositions = [[-0.35, 0.15], [0.35, 0.15], [-0.25, 0.25], [0.25, 0.25]];
    legPositions.forEach((pos, i) => {
        const lx = cx + pos[0] * s;
        const ly = cy + pos[1] * s;
        ctx.save(); ctx.translate(lx, ly);
        ctx.rotate((i < 2 ? 1 : -1) * walkOff);
        ctx.fillRect(-s * 0.04, 0, s * 0.08, s * 0.3);
        ctx.restore();
    });
    ctx.fillStyle = isEnraged ? '#ef4444' : p.body;
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.55, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.accent;
    for (let i = 0; i < 5; i++) {
        const sx = cx - s * 0.3 + i * s * 0.15;
        ctx.beginPath();
        ctx.moveTo(sx - s * 0.04, cy - s * 0.25);
        ctx.lineTo(sx, cy - s * (0.4 + Math.sin(t * 0.01 + i) * 0.05));
        ctx.lineTo(sx + s * 0.04, cy - s * 0.25);
        ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = isEnraged ? '#ef4444' : p.body;
    ctx.beginPath(); ctx.arc(cx + s * 0.4, cy - s * 0.05, s * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isEnraged ? '#ff0000' : '#fff';
    ctx.beginPath(); ctx.arc(cx + s * 0.45, cy - s * 0.12, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.5, cy - s * 0.06, s * 0.06, 0, Math.PI * 2); ctx.fill();
    if (!isEnraged) {
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx + s * 0.46, cy - s * 0.12, s * 0.03, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s * 0.51, cy - s * 0.06, s * 0.03, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = p.core;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.55, cy + s * 0.05);
    ctx.lineTo(cx + s * 0.65, cy);
    ctx.lineTo(cx + s * 0.55, cy - s * 0.05);
    ctx.closePath(); ctx.fill();
}

function _drawDetonator(ctx, enemy, cx, cy, s, t, p) {
    const CONFIG = window.CONFIG || {};
    const playerDist = window.game?.player ? Math.hypot(window.game.player.x - cx, window.game.player.y - cy) : (CONFIG.CANVAS_WIDTH || 1200);
    const urgency = Math.max(0.3, 1 - playerDist / 400);
    const pulse = Math.sin(t * (0.008 + urgency * 0.02)) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(${hexToRgb(p.glow)}, ${pulse * 0.3})`;
    ctx.beginPath(); ctx.arc(cx, cy, s * 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.accent;
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const a2 = ((i + 1) / 8) * Math.PI * 2;
        if (i % 2 === 0) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, s * 0.5, a, a2);
            ctx.closePath(); ctx.fill();
        }
    }
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.45, 0, Math.PI * 2); ctx.fill();
    const coreSize = s * (0.2 + pulse * 0.1);
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
    coreGrad.addColorStop(0, '#ffcc00'); coreGrad.addColorStop(0.5, p.glow); coreGrad.addColorStop(1, p.body);
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(cx, cy, coreSize, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.core;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.002;
        ctx.save(); ctx.translate(cx + Math.cos(a) * s * 0.45, cy + Math.sin(a) * s * 0.45);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.04); ctx.lineTo(s * 0.12, 0); ctx.lineTo(0, s * 0.04);
        ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = p.core; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.45);
    ctx.quadraticCurveTo(cx + 3, cy - s * 0.6, cx + 1, cy - s * 0.7);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 200, 0, ${pulse})`;
    ctx.beginPath(); ctx.arc(cx + 1, cy - s * 0.7, 3, 0, Math.PI * 2); ctx.fill();
}

function _drawLeech(ctx, enemy, cx, cy, s, t, p, angle) {
    const moveAngle = Math.atan2((enemy.y - (enemy.prevY ?? enemy.y)), (enemy.x - (enemy.prevX ?? enemy.x)) || 0.01);
    const segCount = 5;
    for (let i = segCount - 1; i >= 0; i--) {
        const segPhase = Math.sin(t * 0.008 + i * 0.8) * s * 0.08;
        const segX = cx - Math.cos(moveAngle) * i * s * 0.18 + Math.sin(t * 0.006 + i) * segPhase;
        const segY = cy - Math.sin(moveAngle) * i * s * 0.18 + Math.cos(t * 0.006 + i) * segPhase;
        const segSize = s * (0.28 - i * 0.03);
        if (i > 2) {
            ctx.fillStyle = `rgba(${hexToRgb(p.glow)}, 0.15)`;
            ctx.beginPath(); ctx.arc(segX, segY, segSize * 1.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = i === 0 ? p.body : p.accent;
        ctx.beginPath(); ctx.arc(segX, segY, segSize, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = p.glow; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(segX, segY, segSize * 0.7, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = p.core;
    const mandAngle1 = angle + Math.sin(t * 0.01) * 0.3 - 0.4;
    const mandAngle2 = angle - Math.sin(t * 0.01) * 0.3 + 0.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(mandAngle1) * s * 0.15, cy + Math.sin(mandAngle1) * s * 0.15);
    ctx.lineTo(cx + Math.cos(angle) * s * 0.45, cy + Math.sin(angle) * s * 0.45);
    ctx.lineTo(cx + Math.cos(mandAngle1 + 0.3) * s * 0.2, cy + Math.sin(mandAngle1 + 0.3) * s * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(mandAngle2) * s * 0.15, cy + Math.sin(mandAngle2) * s * 0.15);
    ctx.lineTo(cx + Math.cos(angle) * s * 0.45, cy + Math.sin(angle) * s * 0.45);
    ctx.lineTo(cx + Math.cos(mandAngle2 - 0.3) * s * 0.2, cy + Math.sin(mandAngle2 - 0.3) * s * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9f99d';
    ctx.beginPath(); ctx.arc(cx + Math.cos(angle - 0.4) * s * 0.15, cy + Math.sin(angle - 0.4) * s * 0.15, s * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + Math.cos(angle + 0.4) * s * 0.15, cy + Math.sin(angle + 0.4) * s * 0.15, s * 0.06, 0, Math.PI * 2); ctx.fill();
}

function _drawSentinel(ctx, enemy, cx, cy, s, t, p) {
    const hover = Math.sin(t * 0.004) * s * 0.05;
    const cy2 = cy + hover;
    if (enemy.shieldActive) {
        const shieldPulse = Math.sin(t * 0.005) * 0.1 + 0.2;
        ctx.strokeStyle = `rgba(${hexToRgb(p.glow)}, ${shieldPulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy2, s * 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = p.glow;
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + t * 0.003;
        const d = s * 0.65;
        const nx = cx + Math.cos(a) * d;
        const ny = cy2 + Math.sin(a) * d;
        ctx.beginPath(); ctx.arc(nx, ny, s * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(${hexToRgb(p.glow)}, 0.4)`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(cx, cy2); ctx.stroke();
    }
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.2, cy2 - s * 0.55);
    ctx.lineTo(cx + s * 0.2, cy2 - s * 0.55);
    ctx.lineTo(cx + s * 0.3, cy2 - s * 0.15);
    ctx.lineTo(cx + s * 0.25, cy2 + s * 0.45);
    ctx.lineTo(cx - s * 0.25, cy2 + s * 0.45);
    ctx.lineTo(cx - s * 0.3, cy2 - s * 0.15);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = p.glow; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy2 - s * 0.55); ctx.lineTo(cx, cy2 + s * 0.45); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - s * 0.28, cy2); ctx.lineTo(cx + s * 0.28, cy2); ctx.stroke();
    ctx.fillStyle = p.core;
    ctx.beginPath(); ctx.arc(cx, cy2 - s * 0.1, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy2 - s * 0.1, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.arc(cx, cy2 - s * 0.1, s * 0.04, 0, Math.PI * 2); ctx.fill();
}

function _drawWraith(ctx, enemy, cx, cy, s, t, p) {
    const soulPulse = Math.sin(t * 0.005) * 0.2 + 0.7;
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + t * 0.003;
        const d = s * (0.8 + Math.sin(t * 0.004 + i) * 0.15);
        const wx = cx + Math.cos(a) * d;
        const wy = cy + Math.sin(a) * d;
        ctx.fillStyle = `rgba(${hexToRgb(p.glow)}, ${soulPulse * 0.4})`;
        ctx.beginPath(); ctx.arc(wx, wy, s * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    const bodyGrad = ctx.createLinearGradient(cx, cy - s * 0.5, cx, cy + s * 0.7);
    bodyGrad.addColorStop(0, p.body); bodyGrad.addColorStop(0.6, p.body);
    bodyGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = bodyGrad;
    const wave1 = Math.sin(t * 0.004) * s * 0.08;
    const wave2 = Math.sin(t * 0.005 + 1) * s * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.55);
    ctx.lineTo(cx + s * 0.3, cy - s * 0.3);
    ctx.lineTo(cx + s * 0.35, cy + s * 0.1);
    ctx.quadraticCurveTo(cx + s * 0.4 + wave1, cy + s * 0.5, cx + s * 0.2 + wave2, cy + s * 0.7);
    ctx.lineTo(cx - s * 0.2 - wave2, cy + s * 0.7);
    ctx.quadraticCurveTo(cx - s * 0.4 - wave1, cy + s * 0.5, cx - s * 0.35, cy + s * 0.1);
    ctx.lineTo(cx - s * 0.3, cy - s * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.6);
    ctx.quadraticCurveTo(cx + s * 0.35, cy - s * 0.45, cx + s * 0.3, cy - s * 0.15);
    ctx.lineTo(cx + s * 0.15, cy - s * 0.1);
    ctx.lineTo(cx - s * 0.15, cy - s * 0.1);
    ctx.lineTo(cx - s * 0.3, cy - s * 0.15);
    ctx.quadraticCurveTo(cx - s * 0.35, cy - s * 0.45, cx, cy - s * 0.6);
    ctx.fill();
    ctx.fillStyle = `rgba(167, 139, 250, ${soulPulse})`;
    ctx.beginPath(); ctx.arc(cx - s * 0.1, cy - s * 0.25, s * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.1, cy - s * 0.25, s * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.core; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy); ctx.lineTo(cx - s * 0.45, cy + s * 0.05); ctx.stroke();
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.45, cy + s * 0.05);
        ctx.lineTo(cx - s * 0.52, cy + s * (0.02 + i * 0.04));
        ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(cx + s * 0.3, cy); ctx.lineTo(cx + s * 0.45, cy + s * 0.05); ctx.stroke();
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.45, cy + s * 0.05);
        ctx.lineTo(cx + s * 0.52, cy + s * (0.02 + i * 0.04));
        ctx.stroke();
    }
}

function _drawBossDestroyer(ctx, enemy, cx, cy, s, t, p) {
    const wingBeat = Math.sin(t * 0.006) * 0.1;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = p.wing;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.15, cy - s * 0.2);
    ctx.quadraticCurveTo(cx - s * 0.8, cy - s * (0.6 + wingBeat), cx - s * 0.6, cy + s * 0.1);
    ctx.lineTo(cx - s * 0.15, cy + s * 0.05);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.15, cy - s * 0.2);
    ctx.quadraticCurveTo(cx + s * 0.8, cy - s * (0.6 + wingBeat), cx + s * 0.6, cy + s * 0.1);
    ctx.lineTo(cx + s * 0.15, cy + s * 0.05);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.35, s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.core; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy - s * 0.1); ctx.lineTo(cx + s * 0.3, cy - s * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - s * 0.25, cy + s * 0.15); ctx.lineTo(cx + s * 0.25, cy + s * 0.15); ctx.stroke();
    ctx.fillStyle = p.core;
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.4, s * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.wing;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.15, cy - s * 0.5); ctx.lineTo(cx - s * 0.1, cy - s * 0.75);
    ctx.lineTo(cx - s * 0.05, cy - s * 0.45); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.15, cy - s * 0.5); ctx.lineTo(cx + s * 0.1, cy - s * 0.75);
    ctx.lineTo(cx + s * 0.05, cy - s * 0.45); ctx.closePath(); ctx.fill();
    const eyeGlow = Math.sin(t * 0.01) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 0, 0, ${eyeGlow})`;
    ctx.beginPath(); ctx.arc(cx - s * 0.08, cy - s * 0.42, s * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.08, cy - s * 0.42, s * 0.05, 0, Math.PI * 2); ctx.fill();
}

function _drawBossBroodmother(ctx, enemy, cx, cy, s, t, p) {
    ctx.strokeStyle = p.accent; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
        const side = i < 4 ? -1 : 1;
        const idx = i % 4;
        const startX = cx + side * s * 0.3;
        const startY = cy - s * 0.1 + idx * s * 0.15;
        const midX = startX + side * s * 0.4;
        const midY = startY - s * 0.2 + Math.sin(t * 0.008 + i) * s * 0.1;
        const endX = midX + side * s * 0.2;
        const endY = startY + s * 0.15;
        ctx.beginPath(); ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(midX, midY, endX, endY); ctx.stroke();
    }
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.15, s * 0.4, s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.core;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * s * 0.2, cy + s * 0.2 + Math.sin(a) * s * 0.2, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.25, s * 0.25, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff0000';
    const eyePositions = [[-0.1,-0.08],[0.1,-0.08],[-0.06,-0.03],[0.06,-0.03],[-0.12,0],[0.12,0],[-0.04,0.04],[0.04,0.04]];
    eyePositions.forEach(pos => {
        ctx.beginPath();
        ctx.arc(cx + pos[0] * s, cy - s * 0.25 + pos[1] * s, s * 0.03, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.strokeStyle = p.core; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - s * 0.08, cy - s * 0.15); ctx.lineTo(cx - s * 0.15, cy - s * 0.08); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + s * 0.08, cy - s * 0.15); ctx.lineTo(cx + s * 0.15, cy - s * 0.08); ctx.stroke();
}

function _drawBossVoidwalker(ctx, enemy, cx, cy, s, t, p) {
    const phase = Math.sin(t * 0.004) * 0.2 + 0.8;
    ctx.strokeStyle = p.glow; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + t * 0.002;
        const d = s * 0.7;
        const px = cx + Math.cos(a) * d;
        const py = cy + Math.sin(a) * d;
        ctx.save(); ctx.translate(px, py); ctx.rotate(a + t * 0.005);
        ctx.beginPath(); ctx.ellipse(0, 0, s * 0.12, s * 0.06, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgba(0, 0, 0, 0.6)`;
        ctx.fill();
        ctx.restore();
    }
    ctx.globalAlpha = phase;
    const bodyGrad = ctx.createLinearGradient(cx, cy - s * 0.5, cx, cy + s * 0.7);
    bodyGrad.addColorStop(0, p.body); bodyGrad.addColorStop(0.7, p.body); bodyGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.55);
    ctx.quadraticCurveTo(cx + s * 0.4, cy - s * 0.3, cx + s * 0.35, cy + s * 0.2);
    ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.6, cx, cy + s * 0.7);
    ctx.quadraticCurveTo(cx - s * 0.3, cy + s * 0.6, cx - s * 0.35, cy + s * 0.2);
    ctx.quadraticCurveTo(cx - s * 0.4, cy - s * 0.3, cx, cy - s * 0.55);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.3, s * 0.18, 0, Math.PI * 2); ctx.fill();
    const voidPulse = Math.sin(t * 0.008) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(167, 139, 250, ${voidPulse})`;
    ctx.beginPath(); ctx.arc(cx - s * 0.07, cy - s * 0.32, s * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.07, cy - s * 0.32, s * 0.05, 0, Math.PI * 2); ctx.fill();
}

function _drawBossNecromancer(ctx, enemy, cx, cy, s, t, p) {
    const soulPulse = Math.sin(t * 0.005) * 0.2 + 0.7;
    ctx.strokeStyle = `rgba(${hexToRgb(p.glow)}, ${soulPulse * 0.4})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + t * 0.002;
        const d = s * (0.6 + Math.sin(t * 0.003 + i) * 0.15);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s * 0.05, 0, Math.PI * 2);
        ctx.stroke();
    }
    const robeGrad = ctx.createLinearGradient(cx, cy - s * 0.4, cx, cy + s * 0.65);
    robeGrad.addColorStop(0, p.body); robeGrad.addColorStop(0.8, p.body); robeGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.2, cy - s * 0.35);
    ctx.lineTo(cx + s * 0.2, cy - s * 0.35);
    ctx.lineTo(cx + s * 0.4, cy + s * 0.5);
    ctx.lineTo(cx - s * 0.4, cy + s * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.core;
    for (let i = 0; i < 5; i++) {
        const a = Math.PI * 1.15 + (i / 4) * Math.PI * 0.7;
        const bx = cx + Math.cos(a) * s * 0.22;
        const by = cy - s * 0.4 + Math.sin(a) * s * 0.22;
        ctx.beginPath();
        ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * s * 0.1, by + Math.sin(a) * s * 0.1 - s * 0.05);
        ctx.lineTo(bx + s * 0.02, by); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = p.core;
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.35, s * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(167, 139, 250, ${soulPulse})`;
    ctx.beginPath(); ctx.arc(cx - s * 0.06, cy - s * 0.37, s * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.06, cy - s * 0.37, s * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.core; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx + s * 0.25, cy - s * 0.2); ctx.lineTo(cx + s * 0.3, cy + s * 0.45); ctx.stroke();
    ctx.fillStyle = p.glow;
    ctx.beginPath(); ctx.arc(cx + s * 0.25, cy - s * 0.2, s * 0.06, 0, Math.PI * 2); ctx.fill();
}

function _drawBossTitan(ctx, enemy, cx, cy, s, t, p) {
    const runePulse = Math.sin(t * 0.006) * 0.4 + 0.6;
    const quakeActive = enemy.earthquakeCooldown < 60;
    if (quakeActive) {
        const quakePulse = (60 - enemy.earthquakeCooldown) / 60;
        ctx.strokeStyle = `rgba(251, 191, 36, ${quakePulse})`;
        ctx.lineWidth = 4;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.arc(cx, cy, s * (1 + i * 0.2 + quakePulse * 0.3), 0, Math.PI * 2); ctx.stroke();
        }
    }
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.35, cy - s * 0.4);
    ctx.lineTo(cx + s * 0.35, cy - s * 0.4);
    ctx.lineTo(cx + s * 0.45, cy + s * 0.05);
    ctx.lineTo(cx + s * 0.35, cy + s * 0.45);
    ctx.lineTo(cx - s * 0.35, cy + s * 0.45);
    ctx.lineTo(cx - s * 0.45, cy + s * 0.05);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(251, 191, 36, ${runePulse})`;
    for (let i = 0; i < 8; i++) {
        const rx = cx - s * 0.25 + (i % 4) * s * 0.17;
        const ry = cy - s * 0.2 + Math.floor(i / 4) * s * 0.3;
        ctx.beginPath(); ctx.arc(rx, ry, s * 0.03, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.ellipse(cx - s * 0.4, cy - s * 0.25, s * 0.15, s * 0.1, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + s * 0.4, cy - s * 0.25, s * 0.15, s * 0.1, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.wing;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.2, cy - s * 0.35);
    ctx.lineTo(cx, cy - s * 0.6);
    ctx.lineTo(cx + s * 0.2, cy - s * 0.35);
    ctx.lineTo(cx + s * 0.15, cy - s * 0.2);
    ctx.lineTo(cx - s * 0.15, cy - s * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(251, 191, 36, ${runePulse})`;
    ctx.fillRect(cx - s * 0.12, cy - s * 0.35, s * 0.24, s * 0.06);
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.arc(cx - s * 0.5, cy + s * 0.2, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.5, cy + s * 0.2, s * 0.1, 0, Math.PI * 2); ctx.fill();
}

function _drawBossHivemind(ctx, enemy, cx, cy, s, t, p) {
    const psiPulse = Math.sin(t * 0.005) * 0.3 + 0.5;
    ctx.strokeStyle = `rgba(${hexToRgb(p.glow)}, ${psiPulse * 0.3})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
        const r = s * (0.8 + i * 0.15 + Math.sin(t * 0.003 + i) * 0.1);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = p.accent; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const wave = Math.sin(t * 0.005 + i) * s * 0.15;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * s * 0.3, cy + Math.sin(a) * s * 0.3);
        ctx.quadraticCurveTo(
            cx + Math.cos(a) * s * 0.5 + wave,
            cy + Math.sin(a) * s * 0.5,
            cx + Math.cos(a) * s * 0.7,
            cy + Math.sin(a) * s * 0.7
        );
        ctx.stroke();
    }
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.core;
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.1, s * 0.35, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = p.accent; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(cx + (i - 1.5) * s * 0.1, cy - s * 0.15, s * 0.1, Math.PI, 0);
        ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.1, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.1, s * 0.06, 0, Math.PI * 2); ctx.fill();
}

function _drawBossLeviathan(ctx, enemy, cx, cy, s, t, p) {
    const chargeGlow = enemy.isCharging ? 0.8 : 0;
    ctx.fillStyle = p.body;
    for (let i = 5; i >= 0; i--) {
        const segAngle = Math.sin(t * 0.004 + i * 0.7) * 0.3;
        const segX = cx - Math.cos(segAngle) * i * s * 0.12;
        const segY = cy + i * s * 0.1 + Math.sin(t * 0.005 + i) * s * 0.05;
        const segSize = s * (0.35 - i * 0.03);
        ctx.beginPath(); ctx.arc(segX, segY, segSize, 0, Math.PI * 2); ctx.fill();
        if (i > 0) {
            ctx.fillStyle = p.core;
            ctx.beginPath(); ctx.arc(segX, segY, segSize * 0.5, 0, Math.PI); ctx.fill();
            ctx.fillStyle = p.body;
        }
    }
    ctx.fillStyle = p.wing;
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.05, s * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.core;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.15, cy - s * 0.25);
    ctx.lineTo(cx, cy - s * 0.5);
    ctx.lineTo(cx + s * 0.15, cy - s * 0.25);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.2, cy - s * 0.15);
    ctx.lineTo(cx - s * 0.35, cy - s * 0.45);
    ctx.lineTo(cx - s * 0.12, cy - s * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.2, cy - s * 0.15);
    ctx.lineTo(cx + s * 0.35, cy - s * 0.45);
    ctx.lineTo(cx + s * 0.12, cy - s * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - s * 0.1, cy - s * 0.1, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.1, cy - s * 0.1, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.arc(cx - s * 0.1, cy - s * 0.1, s * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.1, cy - s * 0.1, s * 0.035, 0, Math.PI * 2); ctx.fill();
    if (chargeGlow > 0) {
        ctx.strokeStyle = `rgba(45, 212, 191, ${chargeGlow})`;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.9, 0, Math.PI * 2); ctx.stroke();
    }
}

function _drawBoss(ctx, enemy) {
    const BOSS_TYPES = window.BOSS_TYPES || {};
    const s = enemy.size;
    const cx = enemy.x;
    const cy = enemy.y;
    const t = Date.now();
    const bossType = BOSS_TYPES[enemy.type] || BOSS_TYPES.destroyer || {};
    const p = bossType.palette || { body: enemy.color, core: '#fff', glow: enemy.color, accent: enemy.color, wing: enemy.color };

    const glowPulse = Math.sin(t * 0.004) * 0.15 + 0.35;
    ctx.fillStyle = `rgba(${hexToRgb(p.glow)}, ${glowPulse})`;
    ctx.beginPath(); ctx.arc(cx, cy, s * 1.15, 0, Math.PI * 2); ctx.fill();

    switch (enemy.type) {
        case 'destroyer': _drawBossDestroyer(ctx, enemy, cx, cy, s, t, p); break;
        case 'broodmother': _drawBossBroodmother(ctx, enemy, cx, cy, s, t, p); break;
        case 'voidwalker': _drawBossVoidwalker(ctx, enemy, cx, cy, s, t, p); break;
        case 'necromancer': _drawBossNecromancer(ctx, enemy, cx, cy, s, t, p); break;
        case 'titan': _drawBossTitan(ctx, enemy, cx, cy, s, t, p); break;
        case 'hivemind': _drawBossHivemind(ctx, enemy, cx, cy, s, t, p); break;
        case 'leviathan': _drawBossLeviathan(ctx, enemy, cx, cy, s, t, p); break;
        default: _drawBossDestroyer(ctx, enemy, cx, cy, s, t, p); break;
    }

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(t * 0.003) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.9, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    if (enemy.phase >= 2) {
        ctx.save();
        const glowP = Math.sin(Date.now() * 0.008) * 0.3 + 0.5;
        ctx.globalAlpha = glowP * (enemy.phase >= 3 ? 0.4 : 0.2);
        ctx.fillStyle = enemy.phase >= 3 ? '#ff0000' : '#ff6b00';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    if (enemy.health < enemy.maxHealth) {
        const barWidth = s * 2;
        const barHeight = 6;
        const barY = cy - s - 12;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(cx - barWidth / 2, barY, barWidth, barHeight);
        const healthPercent = enemy.health / enemy.maxHealth;
        const healthColor = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffd93d' : '#ff6b6b';
        ctx.fillStyle = healthColor;
        ctx.fillRect(cx - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(enemy.name, cx, barY - 4);
    }
}

export function drawEnemy(enemy, ctx) {
    const ENEMY_TYPES = window.ENEMY_TYPES || {};
    ctx.save();
    const s = enemy.size;
    const cx = enemy.x;
    const cy = enemy.y;
    const t = Date.now();

    if (enemy.isBoss) {
        _drawBoss(ctx, enemy);
    } else {
        const typeData = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.normal || {};
        const p = typeData.palette || { body: enemy.color, core: '#fff', glow: enemy.color, accent: enemy.color };
        const pa = window.game?.player ? Math.atan2(window.game.player.y - cy, window.game.player.x - cx) : 0;

        switch (enemy.type) {
            case 'normal': _drawGrunt(ctx, enemy, cx, cy, s, t, p, pa); break;
            case 'fast': _drawStalker(ctx, enemy, cx, cy, s, t, p, pa); break;
            case 'tank': _drawGolem(ctx, enemy, cx, cy, s, t, p); break;
            case 'swarm': _drawDrone(ctx, enemy, cx, cy, s, t, p); break;
            case 'teleporter': _drawWarper(ctx, enemy, cx, cy, s, t, p); break;
            case 'shooter': _drawMarksman(ctx, enemy, cx, cy, s, t, p, pa); break;
            case 'healer': _drawOracle(ctx, enemy, cx, cy, s, t, p); break;
            case 'splitter': _drawMitotic(ctx, enemy, cx, cy, s, t, p); break;
            case 'freezer': _drawCryo(ctx, enemy, cx, cy, s, t, p); break;
            case 'berserker': _drawRavager(ctx, enemy, cx, cy, s, t, p); break;
            case 'bomber': _drawDetonator(ctx, enemy, cx, cy, s, t, p); break;
            case 'parasite': _drawLeech(ctx, enemy, cx, cy, s, t, p, pa); break;
            case 'shielder': _drawSentinel(ctx, enemy, cx, cy, s, t, p); break;
            case 'necro': _drawWraith(ctx, enemy, cx, cy, s, t, p); break;
            default: _drawGrunt(ctx, enemy, cx, cy, s, t, p, pa); break;
        }
    }

    // Elite indicator
    if (enemy.isElite && !enemy.isBoss) {
        const eColor = enemy.eliteModifier.color;
        const ePulse = Math.sin(t * 0.008) * 0.3 + 0.7;
        ctx.strokeStyle = eColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, s + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = eColor;
        ctx.globalAlpha = ePulse;
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + t * 0.003;
            const rx = cx + Math.cos(a) * (s + 8);
            const ry = cy + Math.sin(a) * (s + 8);
            ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(enemy.eliteModifier.name, cx, cy - s - 15);
    }

    // Sentinel shield visual
    if (enemy.canShield && enemy.shieldActive && enemy.shieldHealth > 0) {
        const shieldAlpha = 0.3 + Math.sin(t * 0.005) * 0.1;
        ctx.strokeStyle = `rgba(99, 102, 241, ${shieldAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 1.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(99, 102, 241, ${shieldAlpha * 0.3})`;
        ctx.fill();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + t * 0.001;
            ctx.fillStyle = `rgba(129, 140, 248, ${shieldAlpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * s * 1.1, cy + Math.sin(a) * s * 1.1, s * 0.08, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Health bar
    if (enemy.health < enemy.maxHealth) {
        const barWidth = s * 2;
        const barHeight = 4;
        const barY = cy - s - 8;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(cx - barWidth / 2, barY, barWidth, barHeight);
        const healthPercent = enemy.health / enemy.maxHealth;
        const healthColor = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffd93d' : '#ff6b6b';
        ctx.fillStyle = healthColor;
        ctx.fillRect(cx - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        if (enemy.canShield && enemy.shieldHealth > 0) {
            ctx.fillStyle = '#818cf8';
            ctx.fillRect(cx - barWidth / 2, barY - 3, barWidth * (enemy.shieldHealth / enemy.shieldMaxHealth), 2);
        }
        if (enemy.isElite && enemy.eliteShield > 0 && enemy.eliteModifier?.hasShield) {
            const shieldMax = enemy.maxHealth * 0.3;
            ctx.fillStyle = '#60a5fa';
            ctx.fillRect(cx - barWidth / 2, barY - 3, barWidth * (enemy.eliteShield / shieldMax), 2);
        }
    }

    ctx.restore();
}
