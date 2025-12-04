// Powerup System - Temporary powerup effects
export class PowerupSystem {
    constructor() {
        this.activePowerups = [];
        this.powerupDefinitions = this.definePowerups();
    }

    definePowerups() {
        return {
            magnet: {
                name: 'Magnet',
                icon: '🧲',
                color: '#00ffff',
                duration: 600, // 10 seconds
                description: 'All pickups fly to you!',
                onStart: (game) => {
                    game.magnetActive = true;
                },
                onUpdate: (game, deltaFrames) => {},
                onEnd: (game) => {
                    game.magnetActive = false;
                }
            },
            nuke: {
                name: 'Nuke',
                icon: '💣',
                color: '#ff0000',
                duration: 0, // Instant
                description: 'Kills all enemies on screen!',
                onStart: (game) => {
                    // Kill all non-boss enemies
                    if (game.enemies) {
                        game.enemies.forEach(enemy => {
                            if (!enemy.isBoss) {
                                enemy.health = 0;
                            }
                        });
                    }
                    // Add screen flash
                    if (game.visualEffects) {
                        game.visualEffects.addFlash('#ffffff', 0.8);
                        game.visualEffects.addScreenShake(30, 20);
                    }
                },
                onUpdate: (game, deltaFrames) => {},
                onEnd: (game) => {}
            },
            clone: {
                name: 'Clone',
                icon: '👥',
                color: '#00ff88',
                duration: 900, // 15 seconds
                description: 'Creates a turret copy of you!',
                onStart: (game) => {
                    // Spawn turret at player position
                    if (game.player) {
                        const turret = {
                            x: game.player.x,
                            y: game.player.y,
                            damage: game.player.damage,
                            range: game.player.range,
                            fireRate: game.player.fireRate,
                            fireCooldown: 0,
                            isClone: true,
                            lifetime: 900,
                        };
                        if (!game.clones) game.clones = [];
                        game.clones.push(turret);
                    }
                },
                onUpdate: (game, deltaFrames) => {},
                onEnd: (game) => {}
            },
            berserk: {
                name: 'Berserk',
                icon: '⚔️',
                color: '#ff0000',
                duration: 600, // 10 seconds
                description: '+100% damage, +50% speed, but take 2x damage!',
                onStart: (game) => {
                    game.berserkActive = true;
                    if (game.player) {
                        game.player.berserkDamageBoost = 2;
                        game.player.berserkSpeedBoost = 1.5;
                        game.player.berserkDamageTaken = 2;
                    }
                },
                onUpdate: (game, deltaFrames) => {},
                onEnd: (game) => {
                    game.berserkActive = false;
                    if (game.player) {
                        game.player.berserkDamageBoost = 1;
                        game.player.berserkSpeedBoost = 1;
                        game.player.berserkDamageTaken = 1;
                    }
                }
            },
            shield: {
                name: 'Shield',
                icon: '🛡️',
                color: '#0088ff',
                duration: 480, // 8 seconds
                description: 'Temporary invulnerability!',
                onStart: (game) => {
                    game.shieldActive = true;
                },
                onUpdate: (game, deltaFrames) => {},
                onEnd: (game) => {
                    game.shieldActive = false;
                }
            },
            multishot: {
                name: 'Multi-Shot',
                icon: '🔫',
                color: '#ffff00',
                duration: 600, // 10 seconds
                description: '+5 projectiles!',
                onStart: (game) => {
                    if (game.player) {
                        game.player.bonusProjectiles = 5;
                    }
                },
                onUpdate: (game, deltaFrames) => {},
                onEnd: (game) => {
                    if (game.player) {
                        game.player.bonusProjectiles = 0;
                    }
                }
            }
        };
    }

    // Update all active powerups
    update(game, deltaFrames = 1) {
        this.activePowerups = this.activePowerups.filter(powerup => {
            powerup.timer += deltaFrames;

            const def = this.powerupDefinitions[powerup.type];
            if (def && def.onUpdate) {
                def.onUpdate(game, deltaFrames);
            }

            // Check if expired
            if (powerup.timer >= powerup.duration) {
                if (def && def.onEnd) {
                    def.onEnd(game);
                }
                return false; // Remove
            }

            return true; // Keep
        });
    }

    // Activate a powerup
    activatePowerup(type, game) {
        const def = this.powerupDefinitions[type];
        if (!def) return false;

        // Check if already active (some powerups stack, others don't)
        const stackable = ['multishot', 'clone'];
        if (!stackable.includes(type)) {
            const existing = this.activePowerups.find(p => p.type === type);
            if (existing) {
                // Refresh duration
                existing.timer = 0;
                return true;
            }
        }

        // Add new powerup
        const powerup = {
            type,
            timer: 0,
            duration: def.duration,
            name: def.name,
            icon: def.icon,
            color: def.color,
        };

        this.activePowerups.push(powerup);

        // Execute start effect
        if (def.onStart) {
            def.onStart(game);
        }

        // Play sound
        if (game.sound) {
            game.sound.playPowerup();
        }

        return true;
    }

    // Get active powerups for UI
    getActivePowerups() {
        return this.activePowerups.map(p => ({
            type: p.type,
            name: p.name,
            icon: p.icon,
            color: p.color,
            timeRemaining: p.duration - p.timer,
            progress: p.timer / p.duration
        }));
    }

    // Check if specific powerup is active
    isPowerupActive(type) {
        return this.activePowerups.some(p => p.type === type);
    }

    // Clear all powerups (e.g., on death)
    clearAll(game) {
        this.activePowerups.forEach(powerup => {
            const def = this.powerupDefinitions[powerup.type];
            if (def && def.onEnd) {
                def.onEnd(game);
            }
        });
        this.activePowerups = [];
    }

    // Spawn powerup pickup in world
    static createPickup(x, y, type = null) {
        // Random type if not specified
        if (!type) {
            const types = ['magnet', 'nuke', 'clone', 'berserk', 'shield', 'multishot'];
            const weights = [30, 5, 15, 20, 25, 30]; // Nuke is rare
            
            const total = weights.reduce((a, b) => a + b, 0);
            let random = Math.random() * total;
            
            for (let i = 0; i < types.length; i++) {
                random -= weights[i];
                if (random <= 0) {
                    type = types[i];
                    break;
                }
            }
            
            // Fallback if none selected
            if (!type) type = 'magnet';
        }

        return {
            x, y,
            type,
            size: 20,
            lifetime: 600, // 10 seconds before disappearing
            collected: false,
        };
    }
}
