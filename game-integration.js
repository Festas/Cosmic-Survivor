// Game Integration Script - Integrates enhanced systems with main game
// This script should be loaded after main.js to hook into the game object

(function() {
    'use strict';
    
    // Wait for game object to be available
    function waitForGame(callback) {
        if (window.game && window.enhancedSystems) {
            callback();
        } else {
            setTimeout(() => waitForGame(callback), 100);
        }
    }
    
    waitForGame(() => {
        console.log('Integrating enhanced systems with game...');
        
        const game = window.game;
        const systems = window.enhancedSystems;
        
        // Store original functions
        const originalInit = game.init;
        const originalUpdate = game.update;
        const originalRender = game.render;
        const originalStartWave = game.startWave;
        const originalEndWave = game.endWave;
        const originalGameOver = game.gameOver;
        const originalSpawnEnemy = game.spawnEnemy;
        const originalCreatePlayer = game.createPlayer;
        
        // Track frame count for events
        game.frameCount = 0;
        game.eventModifiers = {
            damageMultiplier: 1,
            fireRateMultiplier: 1,
            creditMultiplier: 1,
            invertedControls: false,
            invulnerable: false,
            cannotAttack: false,
            enemySpeedMultiplier: 1,
            bulletSpeedMultiplier: 1,
        };
        
        // Enhanced init
        game.init = function() {
            if (originalInit) {
                originalInit.call(this);
            }
            
            // Initialize music
            if (systems.music) {
                systems.music.startMusic('normal');
            }
            
            // Update crystal displays
            updateCrystalDisplays();
            
            console.log('Enhanced game initialized');
        };
        
        // Enhanced update
        const originalGameUpdate = game.update;
        game.update = function() {
            if (originalGameUpdate) {
                originalGameUpdate.call(this);
            }
            
            if (this.state === 'playing' && !this.paused) {
                this.frameCount++;
                
                // Update visual effects
                if (systems.visualEffects) {
                    systems.visualEffects.update(1);
                    
                    // Update vignette based on player health
                    if (this.player) {
                        const healthPercent = this.player.health / this.player.maxHealth;
                        systems.visualEffects.updateVignette(healthPercent);
                        systems.visualEffects.updateChromaticAberration(healthPercent);
                    }
                }
                
                // Update cosmic events
                if (systems.cosmicEvents) {
                    systems.cosmicEvents.update(this, 1);
                }
                
                // Update powerups
                if (systems.powerup) {
                    systems.powerup.update(this, 1);
                }
                
                // Update music intensity
                if (systems.music && this.enemies) {
                    systems.music.updateIntensity(this.enemies.length, 50);
                }
                
                // Update synergies (check once per second)
                if (this.frameCount % 60 === 0 && systems.synergy && this.player) {
                    const newSynergies = systems.synergy.checkSynergies(this.player);
                    
                    // Show notifications for new synergies
                    if (newSynergies.length > 0 && systems.visualEffects) {
                        newSynergies.forEach(synergy => {
                            systems.visualEffects.showNotification(
                                `${synergy.icon} ${synergy.name} Activated!`,
                                '#00ff88',
                                180
                            );
                        });
                    }
                    
                    // Apply synergies to player
                    if (this.player) {
                        const modifiedStats = systems.synergy.applySynergies(this.player);
                        Object.assign(this.player, modifiedStats);
                    }
                }
            }
            
            // Update UI
            updateEnhancedUI();
        };
        
        // Enhanced render
        const originalGameRender = game.render;
        game.render = function() {
            if (originalGameRender) {
                originalGameRender.call(this);
            }
            
            // Apply screen shake
            if (systems.visualEffects && this.ctx) {
                const shake = systems.visualEffects.getScreenShake();
                this.ctx.save();
                this.ctx.translate(shake.x, shake.y);
            }
            
            // Render visual effects
            if (systems.visualEffects && this.ctx) {
                systems.visualEffects.render(this.ctx);
            }
            
            // Render FPS if enabled
            if (systems.settings && systems.settings.shouldShowFPS() && this.ctx) {
                renderFPS(this.ctx);
            }
            
            if (systems.visualEffects && this.ctx) {
                this.ctx.restore();
            }
        };
        
        // FPS tracking
        let lastFrameTime = Date.now();
        let fps = 60;
        
        function renderFPS(ctx) {
            const now = Date.now();
            const delta = now - lastFrameTime;
            lastFrameTime = now;
            
            if (delta > 0) {
                fps = Math.round(1000 / delta);
            }
            
            ctx.save();
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`FPS: ${fps}`, game.canvas.width - 10, 20);
            ctx.restore();
        }
        
        // Enhanced character creation
        if (originalCreatePlayer) {
            game.createPlayer = function(characterId) {
                const player = originalCreatePlayer.call(this, characterId);
                
                // Apply starship upgrades
                if (systems.metaProgression && player) {
                    systems.metaProgression.applyStarshipUpgrades(player);
                }
                
                return player;
            };
        }
        
        // Enhanced wave start
        if (originalStartWave) {
            game.startWave = function() {
                originalStartWave.call(this);
                
                // Reset cosmic events for new wave
                if (systems.cosmicEvents) {
                    systems.cosmicEvents.resetForWave();
                }
                
                // Play music
                if (systems.music) {
                    const isBoss = this.wave % 5 === 0;
                    systems.music.startMusic(isBoss ? 'boss' : 'normal');
                }
            };
        }
        
        // Enhanced wave end
        if (originalEndWave) {
            game.endWave = function() {
                originalEndWave.call(this);
                
                // Stop music
                if (systems.music) {
                    systems.music.stopMusic();
                }
                
                // Wave clear celebration
                if (systems.visualEffects && this.canvas) {
                    systems.visualEffects.addWaveClearCelebration(this.canvas.width, this.canvas.height);
                }
            };
        }
        
        // Enhanced game over
        if (originalGameOver) {
            game.gameOver = function() {
                // Calculate and award crystals
                if (systems.metaProgression) {
                    const crystalsEarned = systems.metaProgression.calculateCrystalsEarned(
                        this.wave,
                        this.persistentStats.totalKills || 0,
                        this.persistentStats.bossesKilled || 0
                    );
                    
                    systems.metaProgression.awardCrystals(crystalsEarned);
                    
                    // Update lifetime stats
                    systems.metaProgression.updateLifetimeStats({
                        enemiesKilled: this.persistentStats.totalKills || 0,
                        bossesDefeated: this.persistentStats.bossesKilled || 0,
                        wavesSurvived: this.wave,
                        creditsEarned: this.credits || 0,
                        upgradesPurchased: this.persistentStats.upgradesPurchased || 0,
                        criticalHits: this.persistentStats.criticalHits || 0,
                        damageTaken: this.persistentStats.damageTaken || 0,
                        healingDone: this.persistentStats.healingDone || 0,
                    });
                    
                    // Check character unlocks
                    const unlockedChars = systems.metaProgression.checkCharacterUnlocks({
                        bossesDefeated: this.persistentStats.bossesKilled || 0,
                        criticalHits: this.persistentStats.criticalHits || 0,
                    });
                    
                    // Show unlock notifications
                    if (unlockedChars.length > 0) {
                        unlockedChars.forEach(charId => {
                            console.log(`Character unlocked: ${charId}`);
                        });
                    }
                    
                    // Update crystal displays
                    updateCrystalDisplays();
                    
                    // Show crystals earned in game over modal
                    const gameOverModal = document.getElementById('game-over-modal');
                    if (gameOverModal) {
                        const finalStats = gameOverModal.querySelector('#final-stats');
                        if (finalStats && !finalStats.querySelector('.crystals-earned')) {
                            const crystalDiv = document.createElement('div');
                            crystalDiv.className = 'crystals-earned';
                            crystalDiv.innerHTML = `<p>💎 Crystals Earned: ${crystalsEarned}</p>`;
                            finalStats.appendChild(crystalDiv);
                        }
                    }
                }
                
                // Stop music
                if (systems.music) {
                    systems.music.stopMusic();
                }
                
                // Clear powerups
                if (systems.powerup) {
                    systems.powerup.clearAll(this);
                }
                
                // Call original game over
                if (originalGameOver) {
                    originalGameOver.call(this);
                }
            };
        }
        
        // Track kills for visual effects
        const originalEnemyDeath = game.handleEnemyDeath || function() {};
        game.handleEnemyDeath = function(enemy) {
            if (systems.visualEffects) {
                // Add kill to streak
                const announcement = systems.visualEffects.addKill();
                if (announcement) {
                    systems.visualEffects.showNotification(announcement, '#ff0000', 120);
                }
                
                // Add to combo
                const bonusCredits = systems.visualEffects.addComboKill();
                if (bonusCredits > 0 && this.player) {
                    this.credits += bonusCredits;
                }
                
                // Screen shake on kill
                const settings = systems.settings;
                if (!settings || settings.isScreenShakeEnabled()) {
                    systems.visualEffects.addScreenShake(2, 5);
                }
            }
            
            originalEnemyDeath.call(this, enemy);
        };
        
        // Override enemy damage to apply event modifiers
        const originalApplyDamage = game.applyDamageToPlayer || function() {};
        game.applyDamageToPlayer = function(damage) {
            if (this.eventModifiers && this.eventModifiers.invulnerable) {
                return; // No damage when invulnerable
            }
            
            originalApplyDamage.call(this, damage);
        };
        
        // Update UI helper
        function updateEnhancedUI() {
            // Update synergy list
            updateSynergyUI();
            
            // Update event banner
            updateEventUI();
            
            // Update powerup display
            updatePowerupUI();
            
            // Update combo display
            updateComboUI();
        }
        
        function updateSynergyUI() {
            if (!systems.synergy) return;
            
            const synergyList = document.getElementById('synergy-list');
            if (!synergyList) return;
            
            const activeSynergies = systems.synergy.getActiveSynergies();
            
            synergyList.innerHTML = activeSynergies.map(synergy => `
                <div class="synergy-item">
                    <div class="synergy-item-header">
                        <span>${synergy.icon}</span>
                        <span>${synergy.name}</span>
                    </div>
                    <div class="synergy-item-desc">${synergy.description}</div>
                </div>
            `).join('');
        }
        
        function updateEventUI() {
            if (!systems.cosmicEvents) return;
            
            const banner = document.getElementById('event-banner');
            if (!banner) return;
            
            const currentEvent = systems.cosmicEvents.getCurrentEvent();
            
            if (currentEvent) {
                banner.classList.remove('hidden');
                banner.style.borderColor = currentEvent.color;
                
                const icon = banner.querySelector('.event-icon');
                const name = banner.querySelector('.event-name');
                const fill = banner.querySelector('.event-timer-fill');
                
                if (icon) icon.textContent = currentEvent.icon;
                if (name) name.textContent = currentEvent.name;
                if (fill) fill.style.width = ((1 - currentEvent.progress) * 100) + '%';
            } else {
                banner.classList.add('hidden');
            }
        }
        
        function updatePowerupUI() {
            if (!systems.powerup) return;
            
            const display = document.getElementById('powerup-display');
            if (!display) return;
            
            const activePowerups = systems.powerup.getActivePowerups();
            
            display.innerHTML = activePowerups.map(powerup => `
                <div class="powerup-item" style="border-color: ${powerup.color}">
                    <div class="powerup-item-header">
                        <span>${powerup.icon}</span>
                        <span>${powerup.name}</span>
                    </div>
                    <div class="powerup-timer-bar">
                        <div class="powerup-timer-fill" style="width: ${(1 - powerup.progress) * 100}%"></div>
                    </div>
                </div>
            `).join('');
        }
        
        function updateComboUI() {
            if (!systems.visualEffects) return;
            
            const combo = systems.visualEffects.getComboCount();
            
            let comboDisplay = document.querySelector('.combo-display');
            
            if (combo >= 2) {
                if (!comboDisplay) {
                    comboDisplay = document.createElement('div');
                    comboDisplay.className = 'combo-display';
                    document.getElementById('game-container')?.appendChild(comboDisplay);
                }
                comboDisplay.textContent = `${combo}x COMBO!`;
            } else if (comboDisplay) {
                comboDisplay.remove();
            }
        }
        
        function updateCrystalDisplays() {
            if (!systems.metaProgression) return;
            
            const crystals = systems.metaProgression.crystals;
            
            document.querySelectorAll('#crystal-count, #main-crystal-count').forEach(el => {
                if (el) el.textContent = crystals;
            });
        }
        
        console.log('Enhanced systems integration complete!');
        
        // Filter character selection by unlocked characters
        // Delay to ensure main.js has finished adding characters
        setTimeout(filterCharacterSelection, 500);
    });
    
    function filterCharacterSelection() {
        const charContainer = document.getElementById('character-list');
        if (!charContainer || !window.enhancedSystems.metaProgression) return;
        
        const metaProg = window.enhancedSystems.metaProgression;
        
        // Bail out BEFORE clearing if we can't actually rebuild the list.
        // Otherwise we'd wipe the cards already populated by main.js's init()
        // and leave an empty character-select modal. (Bug: "I can't choose
        // a character anymore.")
        if (!window.CHARACTERS || !window.Player) return;
        
        // Clear existing characters (including those added by main.js)
        charContainer.innerHTML = '';
        
        window.CHARACTERS.forEach(char => {
            const isUnlocked = metaProg.isCharacterUnlocked(char.id);
            
            const div = document.createElement('div');
            div.className = `character-card ${!isUnlocked ? 'locked-character' : ''}`;
            
            if (isUnlocked) {
                div.innerHTML = `
                    <h3>${char.name}</h3>
                    <p>${char.description}</p>
                    <div class="char-stats">
                        <span>❤️ ${char.maxHealth}</span>
                        <span>⚡ ${char.speed}</span>
                        <span>💪 ${char.damage}</span>
                    </div>
                `;
                div.addEventListener('click', () => {
                    if (window.game) {
                        window.game.selectedCharacter = char;
                        if (window.Player) {
                            window.game.player = new window.Player(char);
                        }
                        document.getElementById('character-select-modal').classList.add('hidden');
                        window.game.state = 'playing';
                        if (window.spawnWave) window.spawnWave();
                        if (window.gameLoop) requestAnimationFrame(window.gameLoop);
                    }
                });
            } else {
                // Show locked character with unlock requirement
                const unlockCost = getCharacterUnlockCost(char.id);
                div.innerHTML = `
                    <h3>🔒 ${char.name}</h3>
                    <p>LOCKED</p>
                    <div class="unlock-requirement">
                        <small>Complete unlock requirements or purchase for ${unlockCost} 💎</small>
                    </div>
                    <button class="unlock-btn" data-char="${char.id}">Unlock (${unlockCost} 💎)</button>
                `;
                
                const unlockBtn = div.querySelector('.unlock-btn');
                if (unlockBtn) {
                    unlockBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (metaProg.purchaseCharacterUnlock(char.id)) {
                            filterCharacterSelection(); // Refresh
                            updateCrystalDisplays();
                        } else {
                            alert('Not enough crystals!');
                        }
                    });
                }
            }
            
            charContainer.appendChild(div);
        });
    }
    
    function getCharacterUnlockCost(characterId) {
        const costs = {
            gunslinger: 500,
            vampire: 750,
            berserker: 1000,
            engineer: 750,
            medic: 500,
            assassin: 1000,
            summoner: 1500,
            juggernaut: 1500,
        };
        return costs[characterId] || 0;
    }
    
    function updateCrystalDisplays() {
        if (!window.enhancedSystems.metaProgression) return;
        
        const crystals = window.enhancedSystems.metaProgression.crystals;
        
        document.querySelectorAll('#crystal-count, #main-crystal-count').forEach(el => {
            if (el) el.textContent = crystals;
        });
    }
})();
