// Cosmic Events System - Random Mid-Wave Events
export class CosmicEventsSystem {
    constructor() {
        this.activeEvent = null;
        this.eventTimer = 0;
        this.eventCooldown = 0;
        this.eventsThisWave = 0;
        this.maxEventsPerWave = 2;
        this.eventCheckInterval = 600; // 10 seconds in frames (60fps)
        this.eventChance = 0.15; // 15% chance
        this.eventDefinitions = this.defineEvents();
    }

    defineEvents() {
        return {
            meteorShower: {
                name: 'Meteor Shower',
                icon: '☄️',
                duration: 900, // 15 seconds
                color: '#ff6b00',
                description: 'Meteors rain from the sky!',
                onStart: (game) => {
                    this.meteorCount = 0;
                    this.meteorTimer = 0;
                },
                onUpdate: (game, deltaFrames) => {
                    this.meteorTimer += deltaFrames;
                    if (this.meteorTimer >= 30) { // Spawn meteor every 0.5 seconds
                        this.meteorTimer = 0;
                        this.spawnMeteor(game);
                    }
                },
                onEnd: (game) => {
                    this.meteorCount = 0;
                }
            },
            powerSurge: {
                name: 'Power Surge',
                icon: '⚡',
                duration: 600, // 10 seconds
                color: '#ffff00',
                description: '2x damage and fire rate!',
                onStart: (game) => {
                    game.eventModifiers.damageMultiplier = 2;
                    game.eventModifiers.fireRateMultiplier = 0.5; // Lower is faster
                },
                onUpdate: (game, deltaFrames) => {},
                onEnd: (game) => {
                    game.eventModifiers.damageMultiplier = 1;
                    game.eventModifiers.fireRateMultiplier = 1;
                }
            },
            gravityAnomaly: {
                name: 'Gravity Anomaly',
                icon: '🌀',
                duration: 720, // 12 seconds
                color: '#9d00ff',
                description: 'Controls inverted!',
                onStart: (game) => {
                    game.eventModifiers.invertedControls = true;
                },
                onUpdate: (game, deltaFrames) => {},
                onEnd: (game) => {
                    game.eventModifiers.invertedControls = false;
                }
            },
            creditRush: {
                name: 'Credit Rush',
                icon: '💰',
                duration: 480, // 8 seconds
                color: '#00ff88',
                description: '3x credits from kills!',
                onStart: (game) => {
                    game.eventModifiers.creditMultiplier = 3;
                },
                onUpdate: (game, deltaFrames) => {},
                onEnd: (game) => {
                    game.eventModifiers.creditMultiplier = 1;
                }
            },
            shieldBubble: {
                name: 'Shield Bubble',
                icon: '🛡️',
                duration: 600, // 10 seconds
                color: '#00bbff',
                description: 'Invulnerable but cannot attack!',
                onStart: (game) => {
                    game.eventModifiers.invulnerable = true;
                    game.eventModifiers.cannotAttack = true;
                },
                onUpdate: (game, deltaFrames) => {},
                onEnd: (game) => {
                    game.eventModifiers.invulnerable = false;
                    game.eventModifiers.cannotAttack = false;
                }
            },
            swarmAlert: {
                name: 'Swarm Alert',
                icon: '🐝',
                duration: 900, // 15 seconds (bonus window)
                color: '#ff9900',
                description: 'Defeat all swarm enemies for bonus crystals!',
                onStart: (game) => {
                    this.swarmEnemiesSpawned = 20;
                    this.swarmEnemiesKilled = 0;
                    // Spawn 20 swarm enemies
                    for (let i = 0; i < 20; i++) {
                        this.spawnSwarmEnemy(game);
                    }
                },
                onUpdate: (game, deltaFrames) => {},
                onEnd: (game) => {
                    // Award bonus if all killed
                    if (this.swarmEnemiesKilled >= this.swarmEnemiesSpawned) {
                        game.bonusCrystals = (game.bonusCrystals || 0) + 25;
                        this.showBonus(game, 'Swarm Cleared! +25 Crystals');
                    }
                }
            },
            eliteHunter: {
                name: 'Elite Hunter',
                icon: '👹',
                duration: 1800, // 30 seconds
                color: '#ff0000',
                description: 'Elite enemy spawned!',
                onStart: (game) => {
                    this.spawnEliteEnemy(game);
                },
                onUpdate: (game, deltaFrames) => {},
                onEnd: (game) => {}
            },
            timeWarp: {
                name: 'Time Warp',
                icon: '⏰',
                duration: 480, // 8 seconds
                color: '#00ffff',
                description: 'Everything slowed except you!',
                onStart: (game) => {
                    game.eventModifiers.enemySpeedMultiplier = 0.5;
                    game.eventModifiers.bulletSpeedMultiplier = 0.5;
                },
                onUpdate: (game, deltaFrames) => {},
                onEnd: (game) => {
                    game.eventModifiers.enemySpeedMultiplier = 1;
                    game.eventModifiers.bulletSpeedMultiplier = 1;
                }
            }
        };
    }

    // Update event system
    update(game, deltaFrames) {
        // Update cooldown
        if (this.eventCooldown > 0) {
            this.eventCooldown -= deltaFrames;
        }

        // Update active event
        if (this.activeEvent) {
            this.eventTimer += deltaFrames;
            
            const eventDef = this.eventDefinitions[this.activeEvent];
            if (eventDef && eventDef.onUpdate) {
                eventDef.onUpdate(game, deltaFrames);
            }

            // Check if event ended
            if (this.eventTimer >= eventDef.duration) {
                this.endEvent(game);
            }
        } else {
            // Check for new event
            if (this.eventCooldown <= 0 && 
                this.eventsThisWave < this.maxEventsPerWave &&
                game.state === 'playing') {
                
                // Check every interval
                if (game.frameCount % this.eventCheckInterval === 0) {
                    if (Math.random() < this.eventChance) {
                        this.startRandomEvent(game);
                    }
                }
            }
        }
    }

    // Start a random event
    startRandomEvent(game) {
        const eventKeys = Object.keys(this.eventDefinitions);
        const randomEvent = eventKeys[Math.floor(Math.random() * eventKeys.length)];
        this.startEvent(randomEvent, game);
    }

    // Start specific event
    startEvent(eventKey, game) {
        if (this.activeEvent) return; // Already active

        const eventDef = this.eventDefinitions[eventKey];
        if (!eventDef) return;

        this.activeEvent = eventKey;
        this.eventTimer = 0;
        this.eventsThisWave++;

        // Initialize event modifiers if needed
        if (!game.eventModifiers) {
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
        }

        if (eventDef.onStart) {
            eventDef.onStart(game);
        }

        // Play event start sound
        if (game.sound) {
            game.sound.playEventStart();
        }
    }

    // End current event
    endEvent(game) {
        if (!this.activeEvent) return;

        const eventDef = this.eventDefinitions[this.activeEvent];
        if (eventDef && eventDef.onEnd) {
            eventDef.onEnd(game);
        }

        this.activeEvent = null;
        this.eventTimer = 0;
        this.eventCooldown = 600; // 10 second cooldown

        // Play event end sound
        if (game.sound) {
            game.sound.playEventEnd();
        }
    }

    // Reset for new wave
    resetForWave() {
        this.eventsThisWave = 0;
        this.eventCooldown = 300; // 5 second initial delay
    }

    // Get current event info for UI
    getCurrentEvent() {
        if (!this.activeEvent) return null;

        const eventDef = this.eventDefinitions[this.activeEvent];
        return {
            name: eventDef.name,
            icon: eventDef.icon,
            color: eventDef.color,
            description: eventDef.description,
            timeRemaining: eventDef.duration - this.eventTimer,
            progress: this.eventTimer / eventDef.duration
        };
    }

    // Helper methods for specific events
    spawnMeteor(game) {
        // Create meteor projectile that damages both enemies and player
        const x = Math.random() * game.canvas.width;
        const y = -20;
        
        const meteor = {
            x, y,
            vx: 0,
            vy: 8,
            size: 15,
            damage: 20,
            color: '#ff6b00',
            type: 'meteor',
            lifetime: 200
        };
        
        if (!game.meteors) game.meteors = [];
        game.meteors.push(meteor);
    }

    spawnSwarmEnemy(game) {
        // Spawn a swarm enemy for the swarm alert event
        if (!game.spawnEnemy) return;
        
        const edge = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(edge) {
            case 0: x = Math.random() * game.canvas.width; y = -25; break;
            case 1: x = game.canvas.width + 25; y = Math.random() * game.canvas.height; break;
            case 2: x = Math.random() * game.canvas.width; y = game.canvas.height + 25; break;
            case 3: x = -25; y = Math.random() * game.canvas.height; break;
        }
        
        game.spawnEnemy(x, y, 'swarm', true); // true = track for event
    }

    spawnEliteEnemy(game) {
        // Spawn elite enemy with 5x health
        if (!game.spawnEnemy) return;
        
        const x = game.canvas.width / 2;
        const y = -50;
        
        game.spawnEnemy(x, y, 'elite', false);
    }

    showBonus(game, message) {
        // Show bonus message (game should implement this in UI)
        if (game.showNotification) {
            game.showNotification(message, '#00ff88');
        }
    }
}
