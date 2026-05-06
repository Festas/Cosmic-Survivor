function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

export function drawNotifications(game, ctx) {
    const CONFIG = window.CONFIG || {};
    game.notifications.forEach((n, i) => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, n.life / 30);
        ctx.fillStyle = n.color;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 10;
        ctx.fillText(n.text, CONFIG.CANVAS_WIDTH / 2, n.y + i * 40);
        ctx.restore();
    });
}

export function drawJoystick(game, ctx) {
    const CONFIG = window.CONFIG || {};
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isMobile && !game.joystick.active && game.state === 'playing') {
        ctx.save();
        const hintX = 100;
        const hintY = CONFIG.CANVAS_HEIGHT - 120;
        const pulse = Math.sin(Date.now() * 0.003) * 0.08 + 0.15;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(hintX, hintY, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TOUCH TO MOVE', hintX, hintY + 70);
        ctx.restore();
        return;
    }

    if (!game.joystick.active) return;

    const startX = game.joystick.startX;
    const startY = game.joystick.startY;
    const currentX = startX + game.joystick.x * 60;
    const currentY = startY + game.joystick.y * 60;

    ctx.save();
    const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 0.35;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#4ecdc4';
    ctx.beginPath(); ctx.arc(startX, startY, 60, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(startX, startY, 60, 0, Math.PI * 2); ctx.stroke();

    const gradient = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 35);
    gradient.addColorStop(0, '#00ff88');
    gradient.addColorStop(0.7, '#00ff88');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(currentX, currentY, 35, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath(); ctx.arc(currentX, currentY, 28, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

export function drawComboMeter(game, ctx) {
    const CONFIG = window.CONFIG || {};
    if (game.stats.comboKills <= 1) return;

    ctx.save();
    const x = CONFIG.CANVAS_WIDTH / 2;
    const y = 50;
    const msToFrames = (ms) => Math.round(ms * CONFIG.TARGET_FPS / 1000);
    const progress = game.stats.comboTimer / msToFrames(CONFIG.COMBO_TIMEOUT || 3000);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 75, y, 150, 30);
    ctx.fillStyle = progress > 0.5 ? '#ffd93d' : '#ff6b6b';
    ctx.fillRect(x - 75, y, 150 * progress, 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
    ctx.fillText(`${game.stats.comboKills}x COMBO`, x, y + 20);
    ctx.restore();
}

export function drawPauseMenu(game, ctx) {
    const CONFIG = window.CONFIG || {};
    const WEAPON_TYPES = window.WEAPON_TYPES || {};
    ctx.save();
    ctx.translate(game.camera.x, game.camera.y);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 3;
    const menuW = Math.min(500, CONFIG.CANVAS_WIDTH - 40);
    const menuH = Math.min(400, CONFIG.CANVAS_HEIGHT - 80);
    const menuX = CONFIG.CANVAS_WIDTH / 2 - menuW / 2;
    const menuY = CONFIG.CANVAS_HEIGHT / 2 - menuH / 2;
    ctx.fillRect(menuX, menuY, menuW, menuH);
    ctx.strokeRect(menuX, menuY, menuW, menuH);

    ctx.fillStyle = '#ffd93d'; ctx.font = 'bold 36px monospace'; ctx.textAlign = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
    ctx.fillText('PAUSED', CONFIG.CANVAS_WIDTH / 2, menuY + 60);

    ctx.fillStyle = '#00ff88'; ctx.font = '18px monospace';
    ctx.fillText(`Wave: ${game.wave}`, CONFIG.CANVAS_WIDTH / 2, menuY + 120);
    ctx.fillText(`Kills: ${game.stats.enemiesKilled}`, CONFIG.CANVAS_WIDTH / 2, menuY + 150);
    ctx.fillText(`Credits: ${game.credits}`, CONFIG.CANVAS_WIDTH / 2, menuY + 180);
    ctx.fillText(`Combo: ${game.stats.comboKills}x`, CONFIG.CANVAS_WIDTH / 2, menuY + 210);

    ctx.fillStyle = '#4ecdc4'; ctx.font = '20px monospace';
    let activeWeaponNames = '🔫 Blaster';
    if (game.player && Array.isArray(game.player.weaponSlots) && game.player.weaponSlots.length > 0) {
        activeWeaponNames = game.player.weaponSlots
            .map(s => {
                const w = WEAPON_TYPES[s.type];
                if (s.evolved && s.evolvedData) return s.evolvedData.name;
                return w ? w.name : s.type;
            }).join(', ');
    }
    ctx.fillText(`Active Weapons: ${activeWeaponNames}`, CONFIG.CANVAS_WIDTH / 2, menuY + 250);

    const dps = window.getAverageDPS?.() || 0;
    ctx.fillStyle = '#888'; ctx.font = '14px monospace';
    ctx.fillText(`Level: ${game.stats.level} | DPS: ${dps} | Difficulty: ${game.difficulty}`, CONFIG.CANVAS_WIDTH / 2, menuY + 270);

    if (game.activePowerups.length > 0) {
        ctx.fillStyle = '#ffd93d'; ctx.font = '16px monospace';
        ctx.fillText('Active Powerups:', CONFIG.CANVAS_WIDTH / 2, menuY + 290);
        game.activePowerups.forEach((p, i) => {
            ctx.fillStyle = p.data.color;
            const timeLeft = Math.ceil(p.timeLeft / (CONFIG.TARGET_FPS || 60));
            ctx.fillText(`${p.data.name} (${timeLeft}s)`, CONFIG.CANVAS_WIDTH / 2, menuY + 315 + i * 25);
        });
    }

    ctx.fillStyle = '#888'; ctx.font = '16px monospace'; ctx.textAlign = 'center';
    ctx.fillText('Press ESC to Resume', CONFIG.CANVAS_WIDTH / 2, menuY + 370);
    ctx.restore();
}

export function drawWeaponIndicator(game, ctx) {
    const CONFIG = window.CONFIG || {};
    const WEAPON_TYPES = window.WEAPON_TYPES || {};
    if (!game.player) return;
    const slots = game.player.weaponSlots;
    const isMobile = CONFIG.CANVAS_WIDTH < 800;
    const slotWidth = isMobile ? 60 : 80;
    const totalWidth = slots.length * slotWidth + (slots.length - 1) * 5;
    const x = CONFIG.CANVAS_WIDTH - totalWidth - 10;
    const y = CONFIG.CANVAS_HEIGHT - 50;
    ctx.save();
    slots.forEach((slot, i) => {
        const sx = x + i * (slotWidth + 5);
        const weapon = WEAPON_TYPES[slot.type];
        ctx.fillStyle = 'rgba(0,255,136,0.10)';
        ctx.fillRect(sx, y, slotWidth, 38);
        if (slot.cooldown > 0 && slot.maxCooldown > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(sx, y, slotWidth * (slot.cooldown / slot.maxCooldown), 38);
        }
        ctx.strokeStyle = weapon ? weapon.color : '#475569'; ctx.lineWidth = 2;
        ctx.strokeRect(sx, y, slotWidth, 38);
        ctx.fillStyle = '#888'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
        ctx.fillText(`#${i + 1}`, sx + 3, y + 12);
        const displayName = slot.evolved && slot.evolvedData ? slot.evolvedData.name.split(' ').pop() : (weapon ? weapon.name.split(' ').pop() : '???');
        const displayColor = slot.evolved && slot.evolvedData ? slot.evolvedData.color : (weapon ? weapon.color : '#fff');
        ctx.fillStyle = displayColor; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        ctx.fillText(displayName, sx + slotWidth / 2, y + 28);
        if (slot.level > 1 || slot.evolved) {
            ctx.fillStyle = slot.evolved ? '#ffd700' : '#fff';
            ctx.font = '9px monospace'; ctx.textAlign = 'right';
            ctx.fillText(slot.evolved ? '★EVO' : `Lv${slot.level}`, sx + slotWidth - 3, y + 12);
        }
    });
    ctx.restore();
}

export function drawComboCounter(game, ctx) {
    const CONFIG = window.CONFIG || {};
    if (game.state !== 'playing' || game.stats.comboKills < 3) return;

    const combo = game.stats.comboKills;
    const msToFrames = (ms) => Math.round(ms * (CONFIG.TARGET_FPS || 60) / 1000);
    const timerPercent = game.stats.comboTimer / msToFrames(CONFIG.COMBO_TIMEOUT || 3000);

    ctx.save();
    const x = CONFIG.CANVAS_WIDTH - 100;
    const y = 100;
    const fontSize = Math.min(48, 24 + combo * 0.5);
    const pulse = Math.sin(Date.now() * 0.01) * 2;

    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = combo >= 20 ? '#ff0000' : combo >= 10 ? '#ffd93d' : '#fff';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
    ctx.fillText(`${combo}x`, x, y + pulse);

    ctx.font = '12px monospace'; ctx.fillStyle = '#94a3b8'; ctx.shadowBlur = 0;
    ctx.fillText('COMBO', x, y + 18);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 30, y + 22, 60, 4);
    ctx.fillStyle = timerPercent > 0.5 ? '#00ff88' : timerPercent > 0.25 ? '#ffd93d' : '#ff6b6b';
    ctx.fillRect(x - 30, y + 22, 60 * timerPercent, 4);
    ctx.restore();
}

export function drawStanceWeatherHUD(game, ctx) {
    const CONFIG = window.CONFIG || {};
    if (game.state !== 'playing') return;
    if (!window.rework) return;
    const items = [];
    const stance = window.rework.stance;
    if (stance) {
        items.push({
            label: stance.isFocused ? '🎯 FOCUS' : '🏃 MOVING',
            color: stance.isFocused ? '#ffd93d' : '#94a3b8',
            charge: stance.isFocused ? 1 : stance.focusCharge,
            chargeColor: '#ffd93d',
        });
    }
    const weather = window.rework.weather;
    if (weather && weather.current && weather.current.id !== 'clear') {
        items.push({ label: weather.current.label, color: '#a5b4fc', charge: 0 });
    }
    if (items.length === 0) return;

    ctx.save();
    ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const padX = 10, h = 22, gap = 8;
    const widths = items.map(it => ctx.measureText(it.label).width + padX * 2);
    const total = widths.reduce((s, w) => s + w, 0) + gap * (items.length - 1);
    let x = (CONFIG.CANVAS_WIDTH - total) / 2;
    const y = 56;
    for (let i = 0; i < items.length; i++) {
        const it = items[i]; const w = widths[i];
        ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
        roundRect(ctx, x, y, w, h, 11); ctx.fill();
        if (it.charge > 0) {
            ctx.fillStyle = it.chargeColor || it.color; ctx.globalAlpha = 0.18;
            roundRect(ctx, x, y, w * it.charge, h, 11); ctx.fill(); ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = it.color; ctx.lineWidth = 1.5;
        roundRect(ctx, x, y, w, h, 11); ctx.stroke();
        ctx.fillStyle = it.color;
        ctx.fillText(it.label, x + w / 2, y + h / 2 + 1);
        x += w + gap;
    }
    ctx.restore();
}

export function drawXPBar(game, ctx) {
    const CONFIG = window.CONFIG || {};
    const barWidth = Math.min(300, CONFIG.CANVAS_WIDTH - 100);
    const barHeight = 8;
    const x = CONFIG.CANVAS_WIDTH / 2 - barWidth / 2;
    const y = CONFIG.CANVAS_HEIGHT - 25;

    ctx.save(); ctx.globalAlpha = 0.7;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, barWidth, barHeight);
    const xpPercent = game.stats.xp / game.stats.xpToNext;
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(x, y, barWidth * xpPercent, barHeight);
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center'; ctx.globalAlpha = 1;
    ctx.fillText(`Lv.${game.stats.level}`, x + barWidth / 2, y - 5);
    if (xpPercent > 0.8) {
        const glowPulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.5;
        ctx.save(); ctx.globalAlpha = glowPulse * 0.4; ctx.fillStyle = '#ffd93d';
        ctx.fillRect(x, y, barWidth * xpPercent, barHeight); ctx.restore();
    }
    ctx.restore();
}

export function drawWaveModifier(game, ctx) {
    if (!game.waveModifier || game.state !== 'playing') return;
    ctx.save(); ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.fillRect(10, 80, 200, 28);
    ctx.fillStyle = game.waveModifier.color; ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left'; ctx.fillText(game.waveModifier.name, 15, 99);
    ctx.restore();
}

export function drawCorruptionIndicator(game, ctx) {
    if (game.corruption <= 0) return;
    ctx.save();
    const x = 10; const y = 115;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.fillRect(x, y, 130, 22);
    const fillPercent = Math.min(game.corruption / 10, 1);
    const barColor = game.corruption >= 10 ? '#dc2626' : game.corruption >= 5 ? '#f59e0b' : '#7c3aed';
    ctx.fillStyle = barColor; ctx.fillRect(x, y, 130 * fillPercent, 22);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`☠️ Corruption: ${game.corruption}`, x + 5, y + 15);
    ctx.restore();
}

export function drawDashIndicator(game, ctx) {
    const CONFIG = window.CONFIG || {};
    if (!game.player) return;
    const x = 20; const y = CONFIG.CANVAS_HEIGHT - 50;
    ctx.save(); ctx.globalAlpha = 0.8;
    const ready = game.player.dashCooldown <= 0;
    const progress = ready ? 1 : 1 - (game.player.dashCooldown / (CONFIG.DASH_COOLDOWN || 60));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.fillRect(x, y, 100, 30);
    ctx.fillStyle = ready ? '#4ecdc4' : '#334155'; ctx.fillRect(x, y, 100 * progress, 30);
    ctx.strokeStyle = ready ? '#4ecdc4' : '#475569'; ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 100, 30);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    ctx.fillText(ready ? '⚡ DASH' : `⚡ ${(game.player.dashCooldown / (CONFIG.TARGET_FPS || 60)).toFixed(1)}s`, x + 50, y + 20);
    ctx.restore();
}

export function drawDPSMeter(game, ctx) {
    const CONFIG = window.CONFIG || {};
    const dps = window.getAverageDPS?.() || 0;
    if (dps === 0) return;
    ctx.save(); ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`DPS: ${dps}`, CONFIG.CANVAS_WIDTH - 20, 40);
    ctx.restore();
}

export function drawScreenOverlays(game, ctx) {
    const CONFIG = window.CONFIG || {};
    const W = CONFIG.CANVAS_WIDTH; const H = CONFIG.CANVAS_HEIGHT;
    const bossPresent = game.enemies && game.enemies.some(e => e && e.isBoss);
    if (bossPresent) {
        ctx.save();
        const cx = W / 2; const cy = H / 2;
        const inner = Math.max(W, H) * 0.32; const outer = Math.max(W, H) * 0.78;
        const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
        grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.45)');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    if (game.player && game.player._lastHitTime) {
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const elapsed = now - game.player._lastHitTime;
        const DURATION = 220;
        if (elapsed >= 0 && elapsed < DURATION) {
            const t = 1 - elapsed / DURATION;
            const sev = Math.min(1, (game.player._lastHitDamage || 1) / Math.max(1, game.player.maxHealth * 0.25));
            const alpha = (0.10 + 0.30 * sev) * t;
            ctx.save(); ctx.fillStyle = `rgba(255, 40, 40, ${alpha.toFixed(3)})`;
            ctx.fillRect(0, 0, W, H); ctx.restore();
        }
    }
}

export function drawBossHealthBar(game, ctx) {
    const CONFIG = window.CONFIG || {};
    const boss = game.enemies.find(e => e.isBoss);
    if (!boss || game.state !== 'playing') return;

    const barWidth = Math.min(500, CONFIG.CANVAS_WIDTH - 60);
    const barHeight = 20;
    const x = CONFIG.CANVAS_WIDTH / 2 - barWidth / 2;
    const y = 15;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 5, y - 5, barWidth + 10, barHeight + 30);
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2;
    ctx.strokeRect(x - 5, y - 5, barWidth + 10, barHeight + 30);

    ctx.fillStyle = '#fca5a5'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`${boss.name}`, CONFIG.CANVAS_WIDTH / 2, y + 8);

    ctx.fillStyle = 'rgba(50, 0, 0, 0.8)'; ctx.fillRect(x, y + 12, barWidth, barHeight);

    const healthPercent = boss.health / boss.maxHealth;
    const healthColor = boss.phase >= 3 ? '#dc2626' : boss.phase >= 2 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = healthColor; ctx.fillRect(x, y + 12, barWidth * healthPercent, barHeight);

    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + barWidth * 0.6, y + 12); ctx.lineTo(x + barWidth * 0.6, y + 12 + barHeight); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + barWidth * 0.3, y + 12); ctx.lineTo(x + barWidth * 0.3, y + 12 + barHeight); ctx.stroke();

    ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`Phase ${boss.phase}/3`, x + barWidth, y + 8);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(boss.health)} / ${Math.ceil(boss.maxHealth)}`, CONFIG.CANVAS_WIDTH / 2, y + 27);

    if (boss.isChargingShockwave) {
        ctx.fillStyle = '#ff0000'; ctx.font = 'bold 14px monospace';
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.5;
        ctx.fillText('⚠️ INCOMING ATTACK ⚠️', CONFIG.CANVAS_WIDTH / 2, y + barHeight + 35);
        ctx.globalAlpha = 1;
    }
    ctx.restore();
}
