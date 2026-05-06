/**
 * js/systems/waveSystem.js — Wave spawn logic (§9 §3 of REWORK.md)
 *
 * Exports: spawnWave (named export + window.waveSystem.spawnWave + window.spawnWave)
 *
 * IMPORTANT: The server-authoritative wave timer code (listening for
 * wave:start / wave:end events from the multiplayer server) stays in main.js.
 * Only the local spawn logic lives here. Do not merge them.
 *
 * Globals read: game, CONFIG, BOSS_TYPES, ENEMY_TYPES, WAVE_MODIFIERS,
 * generateArenaObstacles, getRandomAlivePlayer, showWaveAnnouncement,
 * showNotification, Sound, Enemy — all exposed on window by main.js
 * and enhanced-init.js at load time.
 */

export function spawnWave() {
    generateArenaObstacles();
    
    // ===== Story Mode: override wave behavior =====
    const storyChapter = game.gameMode === 'story' ? game.activeStoryChapter : null;
    const isStoryFinalWave = !!(storyChapter && game.wave >= storyChapter.waves);
    
    // Variable wave duration
    let waveDuration;
    if (game.wave <= 3) waveDuration = 35;
    else if (game.wave <= 8) waveDuration = 45;
    else if (game.wave <= 15) waveDuration = 55;
    else if (game.wave <= 20) waveDuration = 70;
    else waveDuration = 80;
    
    // Boss waves are always 90 seconds
    let isBoss = game.wave % CONFIG.BOSS_WAVE_INTERVAL === 0;
    // In story mode, the chapter's last wave is always a boss wave with the chapter's final boss
    if (isStoryFinalWave) {
        isBoss = true;
    }
    if (isBoss) waveDuration = 90;
    
    game.timeLeft = waveDuration;
    
    // Reset wave-specific state
    game.fogOfWar = false;
    game.creditMultiplier = 1;
    game.waveModifier = null;
    
    // Apply wave modifier (starting wave 3, not on boss waves, not in story mode)
    if (game.wave >= 3 && !isBoss && !storyChapter) {
        const modKeys = Object.keys(WAVE_MODIFIERS);
        const modKey = modKeys[Math.floor(Math.random() * modKeys.length)];
        game.waveModifier = { key: modKey, ...WAVE_MODIFIERS[modKey] };
        showNotification(`${game.waveModifier.name}: ${game.waveModifier.desc}`, game.waveModifier.color, 3000);
    }
    
    showWaveAnnouncement();
    
    if (isBoss) {
        Sound.play('boss');
        let bossType;
        if (isStoryFinalWave && storyChapter.finalBoss && BOSS_TYPES[storyChapter.finalBoss]) {
            bossType = storyChapter.finalBoss;
            game.storyChapterFinalBossSpawned = true;
        } else {
            const bossTypes = Object.keys(BOSS_TYPES);
            bossType = bossTypes[Math.floor(game.wave / CONFIG.BOSS_WAVE_INTERVAL) % bossTypes.length];
        }
        const spawnTarget = getRandomAlivePlayer();
        const boss = new Enemy(spawnTarget.x + 300, spawnTarget.y - 300, game.wave, bossType, true);
        game.enemies.push(boss);
        showNotification(`BOSS WAVE: ${boss.name}`);
    } else {
        // Enemy count: was wave^1.2 which made wave 50+ unrenderable (220+
        // enemies). Trimmed to wave^1.1 so wave 50 ≈ 180 enemies, wave 30 ≈
        // 110 — still feels swarm-y, no longer a slideshow.
        let enemyCount = Math.floor(8 + game.wave * 2 + Math.pow(game.wave, 1.1));
        
        // Scale enemy count for multiplayer
        if (game.isMultiplayer) {
            const playerCount = 1 + game.remotePlayers.size;
            enemyCount = Math.floor(enemyCount * (1 + (playerCount - 1) * game.coopSettings.enemyScalePerPlayer));
        }
        
        // Apply wave modifier to enemy count
        if (game.waveModifier && game.waveModifier.enemyCountMult) {
            enemyCount = Math.floor(enemyCount * game.waveModifier.enemyCountMult);
        }
        
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => {
                // Spawn around a random alive player
                const spawnTarget = getRandomAlivePlayer();
                const px = spawnTarget ? spawnTarget.x : CONFIG.WORLD_WIDTH / 2;
                const py = spawnTarget ? spawnTarget.y : CONFIG.WORLD_HEIGHT / 2;
                const spawnDist = 500 + Math.random() * 200;
                const spawnAngle = Math.random() * Math.PI * 2;
                let x = px + Math.cos(spawnAngle) * spawnDist;
                let y = py + Math.sin(spawnAngle) * spawnDist;
                x = Math.max(50, Math.min(CONFIG.WORLD_WIDTH - 50, x));
                y = Math.max(50, Math.min(CONFIG.WORLD_HEIGHT - 50, y));
                
                let typeKeys = Object.keys(ENEMY_TYPES).filter(t => {
                    if (t === 'tank') return game.wave >= 3;
                    if (t === 'swarm') return game.wave >= 5;
                    if (t === 'teleporter') return game.wave >= 7;
                    if (t === 'shooter') return game.wave >= 10;
                    if (t === 'healer') return game.wave >= 12;
                    if (t === 'splitter') return game.wave >= 15;
                    if (t === 'freezer') return game.wave >= 18;
                    if (t === 'berserker') return game.wave >= 20;
                    if (t === 'bomber') return game.wave >= 8;
                    if (t === 'parasite') return game.wave >= 14;
                    if (t === 'shielder') return game.wave >= 16;
                    if (t === 'necro') return game.wave >= 22;
                    return true;
                });
                
                // Story mode: restrict to chapter's enemy pool (intersected with currently-unlocked types)
                if (storyChapter && Array.isArray(storyChapter.enemyPool) && storyChapter.enemyPool.length > 0) {
                    const allowed = typeKeys.filter(t => storyChapter.enemyPool.includes(t));
                    if (allowed.length > 0) typeKeys = allowed;
                    else typeKeys = storyChapter.enemyPool.filter(t => ENEMY_TYPES[t]);
                }
                
                // Wave modifier spawn bias
                if (game.waveModifier && game.waveModifier.spawnBias && typeKeys.includes(game.waveModifier.spawnBias)) {
                    if (Math.random() < 0.4) {
                        typeKeys = [game.waveModifier.spawnBias];
                    }
                }
                
                const type = typeKeys[Math.floor(Math.random() * typeKeys.length)];
                const enemy = new Enemy(x, y, game.wave, type, false);
                
                // Apply wave modifier to spawned enemy
                if (game.waveModifier && game.waveModifier.onSpawn) {
                    game.waveModifier.onSpawn(enemy);
                }
                
                game.enemies.push(enemy);
            }, i * 150); // Slightly faster spawn interval
        }
    }
    
    // Apply wave modifier to existing enemies
    if (game.waveModifier && game.waveModifier.apply) {
        setTimeout(() => game.waveModifier.apply(), 500);
    }
    
    game.stats.waveStartDamage = game.stats.damageTaken;
}

// window aliases for backward compat with main.js callsite
globalThis.waveSystem = { spawnWave };
globalThis.spawnWave = spawnWave;
