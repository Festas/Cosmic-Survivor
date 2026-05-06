import { drawWeaponVisual } from './weaponVisuals.js';

export function drawPlayer(player, ctx) {
    ctx.save();
    const s = player.size;
    const cx = player.x;
    const cy = player.y;
    const headR = s * 0.3;
    const headY = cy - s * 0.55;
    const torsoW = s * 0.45;
    const torsoH = s * 0.5;
    const torsoTop = cy - s * 0.25;
    const armW = s * 0.1;
    const armLen = s * 0.4;
    const legW = s * 0.1;
    const legLen = s * 0.35;
    const walkSwing = player.walkFrame === 0 ? 0.3 : -0.3;
    const aimAngle = player.aimAngle;

    const CHAR_COLORS = {
        balanced:   { head: '#4ecdc4', body: '#e2e8f0', limb: '#94a3b8', accent: '#00ff88' },
        tank:       { head: '#64748b', body: '#475569', limb: '#64748b', accent: '#94a3b8' },
        speedster:  { head: '#fbbf24', body: '#fef08a', limb: '#fbbf24', accent: '#fef08a' },
        sniper:     { head: '#22c55e', body: '#166534', limb: '#166534', accent: '#86efac' },
        gunslinger: { head: '#f97316', body: '#92400e', limb: '#92400e', accent: '#fdba74' },
        vampire:    { head: '#fecaca', body: '#1c1917', limb: '#450a0a', accent: '#ef4444' },
        berserker:  { head: '#fca5a5', body: '#b91c1c', limb: '#991b1b', accent: '#dc2626' },
        engineer:   { head: '#3b82f6', body: '#1e40af', limb: '#1e40af', accent: '#60a5fa' },
        medic:      { head: '#fff', body: '#fecdd3', limb: '#fecdd3', accent: '#dc2626' },
        assassin:   { head: '#c4b5fd', body: '#1e1b4b', limb: '#1e1b4b', accent: '#7c3aed' },
        summoner:   { head: '#7c3aed', body: '#581c87', limb: '#581c87', accent: '#c084fc' },
        juggernaut: { head: '#d97706', body: '#92400e', limb: '#78350f', accent: '#fbbf24' },
    };
    const cc = CHAR_COLORS[player.characterId] || CHAR_COLORS.balanced;

    const WEAPON_TYPES = window.WEAPON_TYPES || {};

    // Speedster afterimages
    if (player.characterId === 'speedster' && player.afterImages && player.afterImages.length > 0) {
        player.afterImages.forEach(ai => {
            ctx.save(); ctx.globalAlpha = ai.life / 20 * 0.3;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(ai.x, ai.y, s * 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
    }

    if (player.isInvisible) ctx.globalAlpha = 0.3;

    // === LEGS ===
    const legY = cy + s * 0.25;
    ctx.fillStyle = cc.limb;
    ctx.save(); ctx.translate(cx - s * 0.12, legY);
    ctx.rotate(walkSwing); ctx.fillRect(-legW / 2, 0, legW, legLen); ctx.restore();
    ctx.save(); ctx.translate(cx + s * 0.12, legY);
    ctx.rotate(-walkSwing); ctx.fillRect(-legW / 2, 0, legW, legLen); ctx.restore();

    // === TORSO ===
    ctx.fillStyle = cc.body;
    ctx.fillRect(cx - torsoW / 2, torsoTop, torsoW, torsoH);
    if (player.characterId === 'tank') {
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - torsoW / 2 - 4, torsoTop, 4, 10);
        ctx.fillRect(cx + torsoW / 2, torsoTop, 4, 10);
    } else if (player.characterId === 'medic') {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - 3, torsoTop + 3, 6, torsoH - 6);
        ctx.fillRect(cx - torsoW / 4, torsoTop + torsoH / 2 - 2, torsoW / 2, 4);
    } else if (player.characterId === 'berserker') {
        ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - 4 + i * 4, torsoTop + 2); ctx.lineTo(cx - 2 + i * 4, torsoTop + torsoH - 2); ctx.stroke(); }
    } else if (player.characterId === 'engineer') {
        ctx.fillStyle = '#3b82f6'; ctx.fillRect(cx - torsoW / 2 + 2, torsoTop + torsoH / 2, torsoW - 4, torsoH / 2 - 2);
    } else if (player.characterId === 'vampire') {
        ctx.fillStyle = '#450a0a';
        ctx.beginPath(); ctx.moveTo(cx - torsoW / 2 - 6, torsoTop); ctx.lineTo(cx - torsoW / 2, torsoTop + torsoH); ctx.lineTo(cx - torsoW / 2, torsoTop); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + torsoW / 2 + 6, torsoTop); ctx.lineTo(cx + torsoW / 2, torsoTop + torsoH); ctx.lineTo(cx + torsoW / 2, torsoTop); ctx.fill();
    }

    // === ARMS ===
    ctx.fillStyle = cc.limb;
    ctx.save(); ctx.translate(cx - s * 0.25, cy - s * 0.2);
    ctx.rotate(aimAngle * 0.4 - 0.3); ctx.fillRect(-armW / 2, 0, armW, armLen); ctx.restore();
    ctx.save(); ctx.translate(cx + s * 0.25, cy - s * 0.2);
    ctx.rotate(aimAngle * 0.6); ctx.fillRect(-armW / 2, 0, armW, armLen);
    const weaponColor = WEAPON_TYPES[player.weaponSlots[0]?.type || 'basic']?.color || '#00ff88';
    ctx.fillStyle = weaponColor; ctx.fillRect(-2, armLen - 2, 5, 8); ctx.restore();

    // === HEAD ===
    ctx.fillStyle = cc.head;
    ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fill();
    if (player.characterId === 'balanced') {
        ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(cx, headY, headR * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(cx - 2, headY - 2, headR * 0.25, 0, Math.PI * 2); ctx.fill();
    } else if (player.characterId === 'tank') {
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#334155'; ctx.fillRect(cx - headR * 0.6, headY - 1, headR * 1.2, 4);
    } else if (player.characterId === 'speedster') {
        ctx.fillStyle = '#fef08a'; ctx.beginPath();
        ctx.moveTo(cx - headR, headY); ctx.lineTo(cx + headR * 1.2, headY); ctx.lineTo(cx + headR, headY + headR * 0.4);
        ctx.closePath(); ctx.fill();
    } else if (player.characterId === 'sniper') {
        ctx.fillStyle = '#86efac'; ctx.beginPath(); ctx.arc(cx + headR * 0.3, headY, headR * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#86efac'; ctx.lineWidth = 1; ctx.stroke();
    } else if (player.characterId === 'gunslinger') {
        ctx.fillStyle = '#92400e'; ctx.beginPath();
        ctx.ellipse(cx, headY - headR * 0.3, headR * 1.3, headR * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(cx - headR * 0.7, headY - headR * 0.4, headR * 1.4, headR * 0.25);
    } else if (player.characterId === 'vampire') {
        ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(cx - 3, headY - 2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 3, headY - 2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1c1917'; ctx.beginPath();
        ctx.moveTo(cx - headR * 0.4, headY - headR); ctx.lineTo(cx, headY - headR * 0.5); ctx.lineTo(cx + headR * 0.4, headY - headR); ctx.fill();
    } else if (player.characterId === 'berserker') {
        ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - 4, headY - 2); ctx.lineTo(cx - 2, headY + 2); ctx.moveTo(cx + 4, headY - 2); ctx.lineTo(cx + 2, headY + 2); ctx.stroke();
        ctx.fillStyle = '#dc2626';
        for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.4; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * headR, headY + Math.sin(a) * headR); ctx.lineTo(cx + Math.cos(a) * (headR + 5), headY + Math.sin(a) * (headR + 5) - 2); ctx.lineTo(cx + Math.cos(a) * (headR + 1), headY + Math.sin(a) * (headR + 1)); ctx.fill(); }
    } else if (player.characterId === 'engineer') {
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(cx - headR * 0.7, headY - headR * 0.4, headR * 1.4, headR * 0.4);
        ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.arc(cx - 3, headY - 1, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 3, headY - 1, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (player.characterId === 'medic') {
        ctx.fillStyle = '#dc2626'; ctx.fillRect(cx - 2, headY - headR + 1, 4, headR * 0.35);
        ctx.fillRect(cx - headR * 0.25, headY - headR + 4, headR * 0.5, 2.5);
    } else if (player.characterId === 'assassin') {
        ctx.fillStyle = '#1e1b4b'; ctx.beginPath();
        ctx.moveTo(cx - headR * 1.1, headY + headR * 0.4); ctx.lineTo(cx, headY - headR * 1.1); ctx.lineTo(cx + headR * 1.1, headY + headR * 0.4);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c4b5fd'; ctx.beginPath(); ctx.arc(cx - 2, headY, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 2, headY, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (player.characterId === 'summoner') {
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, headY - headR * 0.2, headR * 1.05, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(cx, headY - headR * 1.05, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (player.characterId === 'juggernaut') {
        ctx.fillStyle = '#92400e'; ctx.fillRect(cx - headR * 0.7, headY - 2, headR * 1.4, 6);
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(cx, headY, headR * 0.25, 0, Math.PI * 2); ctx.fill();
    }

    // Equipment overlays
    if (player.armor > 5) {
        ctx.fillStyle = 'rgba(100,116,139,0.5)';
        ctx.fillRect(cx - torsoW / 2 - 3, torsoTop, 3, 8);
        ctx.fillRect(cx + torsoW / 2, torsoTop, 3, 8);
    }
    if (player.lifeSteal > 0.1) {
        ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(cx, cy, s * 1.1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (player.speed > 4 && player.isMoving) {
        ctx.save(); ctx.globalAlpha = 0.2; ctx.strokeStyle = '#4ecdc4'; ctx.lineWidth = 1.5;
        const dir = player.facingRight ? -1 : 1;
        for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(cx + dir * i * 6, cy - 4); ctx.lineTo(cx + dir * i * 6, cy + 4); ctx.stroke(); }
        ctx.restore();
    }

    // Weapon orbs
    if (player.weaponSlots && player.weaponSlots.length > 0) {
        ctx.save();
        const slotCount = player.weaponSlots.length;
        const now = Date.now();
        for (let i = 0; i < slotCount; i++) {
            const slot = player.weaponSlots[i];
            const weapon = WEAPON_TYPES[slot.type];
            if (!weapon) continue;
            const a = player.weaponOrbitAngle + (i / slotCount) * Math.PI * 2;
            const ox = cx + Math.cos(a) * player.weaponOrbitRadius;
            const oy = cy + Math.sin(a) * player.weaponOrbitRadius;
            const orbColor = (slot.evolved && slot.evolvedData) ? slot.evolvedData.color : weapon.color;
            const cdRatio = (slot.maxCooldown && slot.cooldown > 0)
                ? slot.cooldown / slot.maxCooldown : 0;
            const ready = cdRatio <= 0;
            const pulse = ready ? (0.85 + Math.sin(now * 0.012 + i) * 0.15) : 0.55;
            const orbR = 8 + (ready ? 1.5 : 0);
            ctx.globalAlpha = pulse;
            ctx.shadowColor = orbColor;
            ctx.shadowBlur = ready ? 14 : 5;
            drawWeaponVisual(ctx, slot.type, ox, oy, a, orbColor, now);
            if (slot.evolved) {
                ctx.save();
                ctx.strokeStyle = '#ffd700';
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 8;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.8 + Math.sin(now * 0.01 + i) * 0.2;
                ctx.beginPath(); ctx.arc(ox, oy, orbR + 4, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            if (!ready) {
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(ox, oy, orbR + 2, -Math.PI / 2, -Math.PI / 2 + (1 - cdRatio) * Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    // Orbital shield
    if (player.orbitalCount > 0) {
        for (let i = 0; i < player.orbitalCount; i++) {
            const oAngle = player.orbitalAngle + (i / player.orbitalCount) * Math.PI * 2;
            const ox = cx + Math.cos(oAngle) * 50;
            const oy = cy + Math.sin(oAngle) * 50;
            ctx.fillStyle = '#4ecdc4'; ctx.shadowColor = '#4ecdc4'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(ox, oy, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
    }

    if (player.shieldActive && player.characterId === 'tank') {
        ctx.strokeStyle = 'rgba(96,165,250,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, s * 1.3, 0, Math.PI * 2); ctx.stroke();
    }
    if (player.rageActive) {
        const p = Math.sin(Date.now() * 0.015) * 0.3 + 0.7;
        ctx.strokeStyle = `rgba(255,0,0,${p})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, s * 1.4, 0, Math.PI * 2); ctx.stroke();
    }
    if (player.bloodPools && player.bloodPools.length > 0) {
        player.bloodPools.forEach(bp => {
            ctx.save(); ctx.globalAlpha = Math.min(1, bp.life / 100) * 0.5;
            ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(bp.x, bp.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        });
    }
    if (player.turrets && player.turrets.length > 0) {
        player.turrets.forEach(t => {
            ctx.fillStyle = '#3b82f6'; ctx.fillRect(t.x - 7, t.y - 7, 14, 14);
            ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1.5; ctx.strokeRect(t.x - 7, t.y - 7, 14, 14);
        });
    }
    if (player.decoy && player.decoy.health > 0) {
        ctx.save(); ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.15;
        ctx.fillStyle = cc.head; ctx.beginPath(); ctx.arc(player.decoy.x, player.decoy.y, s * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('DECOY', player.decoy.x, player.decoy.y - s * 0.5); ctx.restore();
    }
    if (player.poisonCloudDmg > 0) {
        ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#65a30d';
        ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (player.timeDilation > 0) {
        ctx.save(); ctx.globalAlpha = 0.08; ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, 200, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }

    if (player.drones) {
        player.drones.forEach(drone => {
            const orbitRadius = 60;
            const droneX = cx + Math.cos(drone.angle) * orbitRadius;
            const droneY = cy + Math.sin(drone.angle) * orbitRadius;
            ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(droneX, droneY, 8, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2; ctx.stroke();
            if (drone.health < drone.maxHealth) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(droneX - 8, droneY - 12, 16, 2);
                ctx.fillStyle = '#00ff88'; ctx.fillRect(droneX - 8, droneY - 12, 16 * (drone.health / drone.maxHealth), 2);
            }
        });
    }

    ctx.restore();
}
