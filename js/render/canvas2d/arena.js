const HAZARD_ICONS = { ice_patch: '❄️', lava_pool: '🔥', void_zone: '🌀' };

function updateStarfield(game) {
    if (!game.stars) return;
    for (const star of game.stars) {
        star.twinkle += star.twinkleSpeed;
    }
}

export function drawBackground(game, ctx) {
    const CONFIG = window.CONFIG || {};
    const theme = game.arenaTheme || { bgColor: '#0a0a1a' };
    ctx.fillStyle = theme.bgColor;
    ctx.fillRect(0, 0, CONFIG.WORLD_WIDTH || 3200, CONFIG.WORLD_HEIGHT || 2400);
}

export function drawStarfield(game, ctx) {
    const CONFIG = window.CONFIG || {};
    updateStarfield(game);
    if (!game.stars) return;
    const W = CONFIG.CANVAS_WIDTH || 1200;
    const H = CONFIG.CANVAS_HEIGHT || 800;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (game.nebulae) {
        for (const n of game.nebulae) {
            const sx = (((n.x - game.camera.x * n.parallax) % W) + W) % W;
            const sy = (((n.y - game.camera.y * n.parallax) % H) + H) % H;
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, n.radius);
            grad.addColorStop(0, n.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(sx - n.radius, sy - n.radius, n.radius * 2, n.radius * 2);
        }
    }

    for (const star of game.stars) {
        const sx = (((star.x - game.camera.x * star.parallax) % W) + W) % W;
        const sy = (((star.y - game.camera.y * star.parallax) % H) + H) % H;
        const twinkle = 0.55 + Math.sin(star.twinkle) * 0.45;
        ctx.globalAlpha = Math.max(0.05, twinkle * star.brightness);
        ctx.fillStyle = star.color;
        ctx.shadowColor = star.color;
        ctx.shadowBlur = star.size * 2.5;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

export function drawGrid(game, ctx, timestamp) {
    const CONFIG = window.CONFIG || {};
    const theme = game.arenaTheme || {};
    const gridPulse = Math.sin((timestamp || 0) * 0.0005) * 0.02 + 0.05;
    ctx.strokeStyle = theme.gridColor || `rgba(78, 205, 196, ${gridPulse})`;
    ctx.lineWidth = 1;
    const camX = Math.floor(game.camera.x);
    const camY = Math.floor(game.camera.y);
    const gridStartX = Math.floor(camX / 50) * 50;
    const gridStartY = Math.floor(camY / 50) * 50;
    for (let x = gridStartX; x < camX + (CONFIG.CANVAS_WIDTH || 1200) + 50; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, camY);
        ctx.lineTo(x, camY + (CONFIG.CANVAS_HEIGHT || 800));
        ctx.stroke();
    }
    for (let y = gridStartY; y < camY + (CONFIG.CANVAS_HEIGHT || 800) + 50; y += 50) {
        ctx.beginPath();
        ctx.moveTo(camX, y);
        ctx.lineTo(camX + (CONFIG.CANVAS_WIDTH || 1200), y);
        ctx.stroke();
    }
}

export function drawArenaObstacles(game, ctx) {
    if (game.hazards) {
        game.hazards.forEach(hz => {
            ctx.save();
            const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.4;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = hz.color;
            ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#fff'; ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(HAZARD_ICONS[hz.type] || '⚠️', hz.x, hz.y);
            ctx.restore();
        });
    }
    if (game.obstacles) {
        game.obstacles.forEach(obs => {
            if (obs.health <= 0) return;
            ctx.save();
            if (obs.type === 'rock') {
                ctx.fillStyle = obs.color; ctx.beginPath();
                for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const r = obs.radius * (0.7 + Math.sin(i * 2.3) * 0.3); const ox = obs.x + Math.cos(a) * r; const oy = obs.y + Math.sin(a) * r; i === 0 ? ctx.moveTo(ox, oy) : ctx.lineTo(ox, oy); }
                ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();
            } else if (obs.type === 'crater') {
                ctx.strokeStyle = obs.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
            } else if (obs.type === 'pillar') {
                ctx.fillStyle = obs.color; ctx.fillRect(obs.x - obs.radius * 0.5, obs.y - obs.radius, obs.radius, obs.radius * 2);
                ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(obs.x - obs.radius * 0.5, obs.y - obs.radius, obs.radius, obs.radius * 2);
                if (obs.health < obs.maxHealth && obs.maxHealth !== Infinity) {
                    const bw = obs.radius;
                    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(obs.x - bw / 2, obs.y - obs.radius - 8, bw, 4);
                    ctx.fillStyle = '#00ff88'; ctx.fillRect(obs.x - bw / 2, obs.y - obs.radius - 8, bw * (obs.health / obs.maxHealth), 4);
                }
            }
            ctx.restore();
        });
    }
}

export function drawBossIndicators(game, ctx) {
    // No dedicated function in original; stub for interface completeness.
    console.warn('drawBossIndicators: no-op stub');
}

export function drawFogOfWar(game, ctx) {
    if (!game.fogOfWar || !game.player) return;
    ctx.save();
    const fogGradient = ctx.createRadialGradient(
        game.player.x, game.player.y, 100,
        game.player.x, game.player.y, 350
    );
    fogGradient.addColorStop(0, 'rgba(0,0,0,0)');
    fogGradient.addColorStop(0.7, 'rgba(0,0,0,0.6)');
    fogGradient.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = fogGradient;
    const CONFIG = window.CONFIG || {};
    ctx.fillRect(game.camera.x, game.camera.y, CONFIG.CANVAS_WIDTH || 1200, CONFIG.CANVAS_HEIGHT || 800);
    ctx.restore();
}

export function drawLowHPVignette(game, ctx) {
    if (!game.player) return;
    if (game.player.health > game.player.maxHealth * 0.3 || game.player.health <= 0) return;
    ctx.save();
    const CONFIG = window.CONFIG || {};
    const pulse = Math.sin(Date.now() * 0.004) * 0.15 + 0.25;
    const vignette = ctx.createRadialGradient(
        game.player.x, game.player.y, (CONFIG.CANVAS_WIDTH || 1200) * 0.3,
        game.player.x, game.player.y, (CONFIG.CANVAS_WIDTH || 1200) * 0.7
    );
    vignette.addColorStop(0, 'rgba(200, 0, 0, 0)');
    vignette.addColorStop(1, `rgba(200, 0, 0, ${pulse})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(game.camera.x, game.camera.y, CONFIG.CANVAS_WIDTH || 1200, CONFIG.CANVAS_HEIGHT || 800);
    ctx.restore();
}
