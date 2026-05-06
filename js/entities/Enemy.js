/**
 * js/entities/Enemy.js — Enemy class (§9 entity peeling, Part 6)
 *
 * Extracted verbatim from main.js. Globals accessed at call-time via the global
 * scope (window.* in browser, globalThis.* in tests):
 *   BOSS_TYPES, ENEMY_TYPES, ELITE_MODIFIERS, CONFIG, game, Sound,
 *   createExplosion, createParticles, createTextParticle, screenShake,
 *   showNotification, getNearestPlayerTarget, getRandomAlivePlayer,
 *   _enemyBulletPool, XPOrb, Pickup, spawnPowerup, checkAchievements,
 *   WEAPON_TYPES, checkWeaponEvolution, WAVE_MODIFIERS
 *
 * window.Enemy is set at bottom for main.js backward-compat.
 */

export class Enemy {
    constructor(x, y, wave, type, isBoss = false) {
        this.x = x;
        this.y = y;
        this.wave = wave;
        this.isBoss = isBoss;
        
        // Walk animation state
        this.walkFrame = 0;
        this.walkTimer = 0;
        this.facingRight = true;
        this.prevX = x;
        
        if (isBoss) {
            const bossType = BOSS_TYPES[type] || BOSS_TYPES.destroyer;
            this.type = type;
            this.size = CONFIG.ENEMY_SIZE * bossType.size;
            const diffSettings = game.difficultySettings || CONFIG.DIFFICULTY.normal;
            this.speed = (0.4 + Math.log2(1 + wave * 0.12)) * 0.4 * diffSettings.enemySpeedMult;
            // Smoother late-wave HP curve: replaced runaway wave^1.3 with
            // wave^1.15 + slightly steeper linear term. Same difficulty up to
            // ~wave 20, much fairer past wave 30 where things became unwinnable.
            this.maxHealth = (15 + wave * 4 + Math.pow(wave, 1.15)) * bossType.health * diffSettings.enemyHealthMult;
            this.health = this.maxHealth;
            this.damage = (4 + wave * 0.9 + Math.pow(wave, 1.05) * 0.25) * bossType.damage * diffSettings.enemyDamageMult;
            this.creditValue = Math.floor(bossType.credits * (diffSettings.creditMult || 1));
            this.color = bossType.color;
            this.name = bossType.name;
            this.canSummon = bossType.summons;
            this.canTeleport = bossType.teleports;
            this.canCommand = bossType.commands;
            this.canCharge = bossType.charges;
            this.summonCooldown = 0;
            this.teleportCooldown = 0;
            this.commandCooldown = 0;
            this.chargeCooldown = 0;
            this.isCharging = false;
            this.chargeTargetX = 0;
            this.chargeTargetY = 0;
            // Boss phase system
            this.phase = 1;
            this.phaseThresholds = [1.0, 0.6, 0.3]; // Phase changes at 60% and 30% HP
            this.phaseTransitioning = false;
            this.phaseTransitionTimer = 0;
            this.specialAttackCooldown = 0;
            this.shockwaveChargeTimer = 0;
            this.isChargingShockwave = false;
        } else {
            const enemyType = ENEMY_TYPES[type] || ENEMY_TYPES.normal;
            this.type = type;
            this.size = CONFIG.ENEMY_SIZE * (enemyType.size || 1);
            const diffSettings = game.difficultySettings || CONFIG.DIFFICULTY.normal;
            // Tame "fast" enemy speed runaway: log2(1+wave*0.18) so
            // wave-30 Stalkers don't outrun base player speed.
            this.speed = (1 + Math.log2(1 + wave * 0.18)) * enemyType.speed * diffSettings.enemySpeedMult;
            // See boss block above — same gentler late-wave curve.
            this.maxHealth = (15 + wave * 4 + Math.pow(wave, 1.15)) * enemyType.health * diffSettings.enemyHealthMult;
            this.health = this.maxHealth;
            this.damage = (4 + wave * 0.9 + Math.pow(wave, 1.05) * 0.25) * enemyType.damage * diffSettings.enemyDamageMult;
            this.creditValue = Math.floor((2 + wave * 0.8) * enemyType.credits * (diffSettings.creditMult || 1));

            // Corruption scaling - enemies harder but better rewards at high corruption
            if (game.corruption >= 5) {
                const corruptionMult = 1 + (game.corruption - 4) * 0.08;
                this.maxHealth *= corruptionMult;
                this.health = this.maxHealth;
                this.damage *= (1 + (game.corruption - 4) * 0.05);
                this.creditValue = Math.floor(this.creditValue * (1 + game.corruption * 0.1));
            }

            this.color = enemyType.color;
            this.canTeleport = enemyType.canTeleport;
            this.isRanged = enemyType.ranged;
            this.canHeal = enemyType.heals;
            this.canSplit = enemyType.splits;
            this.canFreeze = enemyType.freezes;
            this.canEnrage = enemyType.enrages;
            this.canExplode = enemyType.explodes;
            this.canDrain = enemyType.drains;
            this.canShield = enemyType.shields;
            this.canRevive = enemyType.revives;
            this.teleportCooldown = 0;
            this.shootCooldown = 0;
            this.healCooldown = 0;
            this.shieldCooldown = 0;
            this.reviveCooldown = 0;
            this.enraged = false;
            this.shieldActive = false;
            this.shieldHealth = 0;
            this.splitGeneration = 0; // Track split depth to prevent infinite splitting
            
            // Movement pattern properties
            this.movementPattern = enemyType.movementPattern || 'chase';
            this.orbitAngle = Math.random() * Math.PI * 2;
            this.zigzagPhase = Math.random() * Math.PI * 2;
            this.lungeCooldown = 0;
            this.lungeFrames = 0;
            this.isLunging = false;
            this.dashCooldown = 0;
            this.dashFrames = 0;
            this.isDashing = false;
            this.prevY = y;
            
            // Elite enemy modification
            this.isElite = false;
            if (!isBoss && game.wave >= 5 && Math.random() < CONFIG.ELITE_CHANCE) {
                this.isElite = true;
                const modKeys = Object.keys(ELITE_MODIFIERS);
                const modKey = modKeys[Math.floor(Math.random() * modKeys.length)];
                this.eliteModifier = ELITE_MODIFIERS[modKey];
                this.eliteType = modKey;
                
                this.maxHealth *= this.eliteModifier.healthMult;
                this.health = this.maxHealth;
                this.damage *= this.eliteModifier.damageMult;
                this.speed *= this.eliteModifier.speedMult;
                this.creditValue = Math.floor(this.creditValue * this.eliteModifier.creditMult);
                this.size *= 1.25; // Slightly larger
                this.eliteShield = this.eliteModifier.hasShield ? this.maxHealth * 0.3 : 0;
            }
        }
        
        // Boss-specific abilities
        if (isBoss) {
            const bossType = BOSS_TYPES[type] || BOSS_TYPES.destroyer;
            this.canResurrect = bossType.resurrects;
            this.canEarthquake = bossType.earthquake;
            this.resurrectCooldown = 0;
            this.earthquakeCooldown = 0;
            this.resurrectedEnemies = [];
        }
        
        // Sentinel shield initialization
        if (this.canShield && !isBoss) {
            this.shieldActive = true;
            this.shieldHealth = this.maxHealth * 0.4;
            this.shieldMaxHealth = this.maxHealth * 0.4;
        }
        
        // Speed cap - prevents oppressively fast enemies
        const maxSpeed = this.isBoss ? 3 : 4;
        this.speed = Math.min(this.speed, maxSpeed);

        this.attackCooldown = 0;
    }

    update() {
        // Track movement for walk animation
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Target nearest player (supports multiplayer)
        const nearestPlayer = getNearestPlayerTarget(this.x, this.y);
        let targetX = nearestPlayer.x, targetY = nearestPlayer.y;
        if (game.player && game.player.decoy && game.player.decoy.health > 0 && !this.isBoss) {
            const distDecoy = Math.hypot(game.player.decoy.x - this.x, game.player.decoy.y - this.y);
            const distPlayer = Math.hypot(nearestPlayer.x - this.x, nearestPlayer.y - this.y);
            if (distDecoy < distPlayer * 0.8) { targetX = game.player.decoy.x; targetY = game.player.decoy.y; }
        }
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);

        // Boss abilities
        if (this.isBoss) {
            // Boss phase transitions
            const healthPercent = this.health / this.maxHealth;
            const newPhase = healthPercent <= 0.3 ? 3 : healthPercent <= 0.6 ? 2 : 1;
            
            if (newPhase > this.phase) {
                this.phase = newPhase;
                this.phaseTransitioning = true;
                this.phaseTransitionTimer = 60; // 1 second invulnerable during transition
                
                // Phase transition effects
                screenShake(15);
                createExplosion(this.x, this.y, this.color, 40);
                
                if (this.phase === 2) {
                    showNotification(`${this.name} enters Phase 2!`, '#ff6b6b', 3000);
                    // Phase 2: speed boost
                    this.speed *= 1.3;
                    Sound.play('boss');
                } else if (this.phase === 3) {
                    showNotification(`${this.name} enters FINAL PHASE!`, '#ff0000', 4000);
                    // Phase 3: desperate, very aggressive
                    this.speed *= 1.5;
                    this.damage *= 1.3;
                    Sound.play('boss');
                    createExplosion(this.x, this.y, '#ff0000', 60);
                }
            }
            
            if (this.phaseTransitioning) {
                this.phaseTransitionTimer--;
                if (this.phaseTransitionTimer <= 0) {
                    this.phaseTransitioning = false;
                }
                // Pulsing invulnerability visual
                if (game.frameCount % 4 < 2) {
                    createParticles(this.x, this.y, this.color, 2);
                }
            }
            
            // Phase-specific special attacks
            if (this.specialAttackCooldown > 0) this.specialAttackCooldown--;
            
            if (!this.phaseTransitioning && this.specialAttackCooldown <= 0) {
                // Phase 2+: Shockwave attack (all boss types)
                if (this.phase >= 2 && !this.isChargingShockwave) {
                    const nearestForShockwave = getNearestPlayerTarget(this.x, this.y);
                    const playerDist = Math.hypot(nearestForShockwave.x - this.x, nearestForShockwave.y - this.y);
                    if (playerDist < 250) {
                        this.isChargingShockwave = true;
                        this.shockwaveChargeTimer = 45; // 0.75s telegraph
                        createTextParticle(this.x, this.y - this.size - 20, '⚠️', '#ff0000', 24);
                    }
                }
                
                // Phase 3: Bullet burst (all boss types)
                if (this.phase >= 3 && this.specialAttackCooldown <= 0) {
                    const burstCount = 8 + Math.floor(Math.random() * 8);
                    for (let i = 0; i < burstCount; i++) {
                        const angle = (i / burstCount) * Math.PI * 2;
                        const speed = 3 + Math.random() * 2;
                        let eb = _enemyBulletPool?.acquire(this.x, this.y, angle, speed, 6, this.damage * 0.4, this.color) ?? null;
                        if (eb) { eb._pool = _enemyBulletPool; } else {
                            eb = { x: this.x, y: this.y, angle, speed, size: 6, damage: this.damage * 0.4, color: this.color, isEnemyBullet: true, _pool: null };
                        }
                        game.bullets.push(eb);
                    }
                    this.specialAttackCooldown = this.phase >= 3 ? 180 : 300;
                    createExplosion(this.x, this.y, this.color, 25);
                }
            }
            
            // Shockwave execution
            if (this.isChargingShockwave) {
                this.shockwaveChargeTimer--;
                // Telegraph: red circle growing
                if (this.shockwaveChargeTimer <= 0) {
                    // Execute shockwave
                    this.isChargingShockwave = false;
                    this.specialAttackCooldown = this.phase >= 3 ? 120 : 240;
                    
                    const shockRadius = 200;
                    const playerDist = Math.hypot(game.player.x - this.x, game.player.y - this.y);
                    if (playerDist < shockRadius) {
                        game.player.takeDamage(this.damage * 0.8);
                        // Knockback
                        if (!game.player.knockbackImmune) {
                            const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
                            game.player.x += Math.cos(angle) * 80;
                            game.player.y += Math.sin(angle) * 80;
                            game.player.x = Math.max(game.player.size, Math.min(CONFIG.WORLD_WIDTH - game.player.size, game.player.x));
                            game.player.y = Math.max(game.player.size, Math.min(CONFIG.WORLD_HEIGHT - game.player.size, game.player.y));
                        }
                    }
                    screenShake(12);
                    createExplosion(this.x, this.y, '#ff4444', 35);
                }
            }
            if (this.canSummon && this.summonCooldown <= 0 && game.enemies.length < 30) {
                this.summonMinions();
                this.summonCooldown = 300;
            }
            if (this.canTeleport && this.teleportCooldown <= 0 && dist > 200) {
                this.teleport();
                this.teleportCooldown = 240;
            }
            // Necromancer resurrection ability
            if (this.canResurrect && this.resurrectCooldown <= 0 && this.resurrectedEnemies.length < 5) {
                this.resurrectEnemy();
                this.resurrectCooldown = 600; // 10 seconds
            }
            // Titan earthquake ability
            if (this.canEarthquake && this.earthquakeCooldown <= 0) {
                this.earthquake();
                this.earthquakeCooldown = 480; // 8 seconds
            }
            // Hivemind command ability - buffs nearby enemies
            if (this.canCommand && this.commandCooldown <= 0) {
                this.commandAllies();
                this.commandCooldown = 360; // 6 seconds
            }
            // Leviathan charge ability
            if (this.canCharge && !this.isCharging && this.chargeCooldown <= 0 && dist > 100) {
                this.startCharge();
                this.chargeCooldown = 420; // 7 seconds
            }
            if (this.isCharging) {
                this.updateCharge();
            }
            if (this.summonCooldown > 0) this.summonCooldown--;
            if (this.teleportCooldown > 0) this.teleportCooldown--;
            if (this.resurrectCooldown > 0) this.resurrectCooldown--;
            if (this.earthquakeCooldown > 0) this.earthquakeCooldown--;
            if (this.commandCooldown > 0) this.commandCooldown--;
            if (this.chargeCooldown > 0) this.chargeCooldown--;
        }

        // Regular enemy abilities
        if (this.canTeleport && !this.isBoss && this.teleportCooldown <= 0 && dist > 150 && Math.random() < 0.01) {
            this.teleport();
            this.teleportCooldown = 180;
        }
        
        if (this.isRanged && dist > 100 && dist < 300 && this.shootCooldown <= 0) {
            this.shootAtPlayer();
            this.shootCooldown = 120;
        }
        
        // Healer ability - heal nearby enemies
        if (this.canHeal && this.healCooldown <= 0) {
            this.healNearbyEnemies();
            this.healCooldown = 120; // 2 seconds
        }
        
        // Berserker enrage - when health drops below 30%
        if (this.canEnrage && !this.enraged && this.health < this.maxHealth * 0.3) {
            this.enraged = true;
            this.speed *= 1.5;
            this.damage *= 1.5;
            createTextParticle(this.x, this.y - 30, 'ENRAGED!', '#ff0000', 20);
            createParticles(this.x, this.y, '#ff0000', 20);
        }
        
        // Sentinel shield - regenerate shield when not active
        if (this.canShield && !this.shieldActive && this.shieldCooldown <= 0) {
            this.shieldActive = true;
            this.shieldHealth = this.shieldMaxHealth;
            createTextParticle(this.x, this.y - 30, 'SHIELDED!', '#818cf8', 16);
            createParticles(this.x, this.y, '#6366f1', 12);
        }
        
        // Parasite drain - steal health on hit (handled in attack)
        
        // Revenant revive - raise dead enemies nearby
        if (this.canRevive && this.reviveCooldown <= 0 && game.enemies.length < 40) {
            this.reviveNearby();
            this.reviveCooldown = 480; // 8 seconds
        }

        if (this.teleportCooldown > 0) this.teleportCooldown--;
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.healCooldown > 0) this.healCooldown--;
        if (this.shieldCooldown > 0) this.shieldCooldown--;
        if (this.reviveCooldown > 0) this.reviveCooldown--;
        
        // Command buff expiry
        if (this.isCommandBuffed) {
            this.commandBuffTimer--;
            if (this.commandBuffTimer <= 0) {
                this.isCommandBuffed = false;
                this.speed = this.baseSpeed;
                this.damage = this.baseDamage;
            }
        }

        // Movement patterns
        let moveSpeed = this.speed;
        if (game.player && game.player.timeDilation > 0 && dist < 200) moveSpeed *= (1 - game.player.timeDilation);
        
        if (this.isBoss) {
            // Bosses always chase directly
            if (dist > 10) {
                this.x += (dx / dist) * moveSpeed;
                this.y += (dy / dist) * moveSpeed;
            }
        } else {
            const pattern = this.movementPattern || 'chase';
            switch(pattern) {
                case 'wander': {
                    if (dist > 20) {
                        const wanderOffset = Math.sin(Date.now() * 0.003 + this.zigzagPhase) * 0.4;
                        const angle = Math.atan2(dy, dx) + wanderOffset;
                        this.x += Math.cos(angle) * moveSpeed;
                        this.y += Math.sin(angle) * moveSpeed;
                    }
                    break;
                }
                case 'zigzag': {
                    if (dist > 20) {
                        const baseAngle = Math.atan2(dy, dx);
                        const zigzag = Math.sin(Date.now() * 0.012 + this.zigzagPhase) * 0.8;
                        this.x += Math.cos(baseAngle + zigzag) * moveSpeed;
                        this.y += Math.sin(baseAngle + zigzag) * moveSpeed;
                    }
                    break;
                }
                case 'strafe': {
                    if (dist > 280) {
                        this.x += (dx / dist) * moveSpeed;
                        this.y += (dy / dist) * moveSpeed;
                    } else if (dist > 180) {
                        const strafeAngle = Math.atan2(dy, dx) + Math.PI / 2;
                        this.x += Math.cos(strafeAngle) * moveSpeed * 0.8;
                        this.y += Math.sin(strafeAngle) * moveSpeed * 0.8;
                    } else {
                        const retreatAngle = Math.atan2(dy, dx) + Math.PI * 0.7;
                        this.x += Math.cos(retreatAngle) * moveSpeed;
                        this.y += Math.sin(retreatAngle) * moveSpeed;
                    }
                    break;
                }
                case 'orbit': {
                    this.orbitAngle += 0.02 * (this.speed / 1.2);
                    if (dist > 120) {
                        this.x += (dx / dist) * moveSpeed * 0.7;
                        this.y += (dy / dist) * moveSpeed * 0.7;
                    } else {
                        const orbitDist = 80;
                        const orbTargetX = targetX + Math.cos(this.orbitAngle) * orbitDist;
                        const orbTargetY = targetY + Math.sin(this.orbitAngle) * orbitDist;
                        const ox = orbTargetX - this.x;
                        const oy = orbTargetY - this.y;
                        const od = Math.hypot(ox, oy);
                        if (od > 5) {
                            this.x += (ox / od) * moveSpeed;
                            this.y += (oy / od) * moveSpeed;
                        }
                    }
                    break;
                }
                case 'flee': {
                    if (dist < 180) {
                        this.x -= (dx / dist) * moveSpeed * 1.2;
                        this.y -= (dy / dist) * moveSpeed * 1.2;
                    } else if (dist > 350) {
                        this.x += (dx / dist) * moveSpeed * 0.5;
                        this.y += (dy / dist) * moveSpeed * 0.5;
                    }
                    break;
                }
                case 'lunge': {
                    if (this.isLunging) {
                        this.lungeFrames++;
                        if (dist > 5) {
                            this.x += (dx / dist) * moveSpeed * 4;
                            this.y += (dy / dist) * moveSpeed * 4;
                        }
                        if (this.lungeFrames > 10) this.isLunging = false;
                    } else if (dist > 30) {
                        this.x += (dx / dist) * moveSpeed;
                        this.y += (dy / dist) * moveSpeed;
                    }
                    if (!this.isLunging && this.lungeCooldown <= 0 && dist < 150 && dist > 40) {
                        this.isLunging = true;
                        this.lungeFrames = 0;
                        this.lungeCooldown = 90;
                        createParticles(this.x, this.y, this.color, 8);
                    }
                    if (this.lungeCooldown > 0) this.lungeCooldown--;
                    break;
                }
                case 'dash': {
                    if (this.isDashing) {
                        this.dashFrames++;
                        if (dist > 5) {
                            this.x += (dx / dist) * moveSpeed * 3;
                            this.y += (dy / dist) * moveSpeed * 3;
                        }
                        if (this.dashFrames > 15) {
                            this.isDashing = false;
                            this.dashCooldown = 45;
                        }
                    } else if (this.dashCooldown <= 0) {
                        this.isDashing = true;
                        this.dashFrames = 0;
                    }
                    if (this.dashCooldown > 0) this.dashCooldown--;
                    break;
                }
                case 'phase': {
                    if (dist > 30) {
                        this.x += (dx / dist) * moveSpeed;
                        this.y += (dy / dist) * moveSpeed;
                    }
                    break;
                }
                default: {
                    if (dist > (this.isRanged ? 200 : 0)) {
                        this.x += (dx / dist) * moveSpeed;
                        this.y += (dy / dist) * moveSpeed;
                    }
                    break;
                }
            }
        }
        
        // Keep enemy in bounds
        this.x = Math.max(this.size, Math.min(CONFIG.WORLD_WIDTH - this.size, this.x));
        this.y = Math.max(this.size, Math.min(CONFIG.WORLD_HEIGHT - this.size, this.y));
        
        // Update walk animation
        const movedX = this.x - this.prevX;
        if (Math.abs(movedX) > 0.1) {
            this.facingRight = movedX > 0;
            this.walkTimer++;
            if (this.walkTimer >= 12) { this.walkTimer = 0; this.walkFrame = this.walkFrame === 0 ? 1 : 0; }
        } else {
            this.walkTimer = 0;
            this.walkFrame = 0;
        }

        // Wave modifier: regenerating enemies
        if (this.regens && !this.isBoss && game.frameCount % 60 === 0) {
            this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.02);
        }

        // Attack player
        if (dist < this.size + game.player.size && this.attackCooldown <= 0) {
            game.player.takeDamage(this.damage);
            
            // Freezer slow debuff
            if (this.canFreeze) {
                const newSlow = 0.5; // 50% slow
                // Stack slow up to 70% max
                if (game.player.slowDebuff > 0) {
                    game.player.slowAmount = Math.min(0.7, game.player.slowAmount + 0.2);
                } else {
                    game.player.slowAmount = newSlow;
                }
                game.player.slowDebuff = 120; // 2 seconds
                createTextParticle(game.player.x, game.player.y - 30, 'FROZEN!', '#38bdf8', 16);
                createParticles(game.player.x, game.player.y, '#38bdf8', 10);
            }
            
            // Parasite drain - heal self on hit
            if (this.canDrain) {
                const drainAmount = this.damage * 0.3;
                this.health = Math.min(this.maxHealth, this.health + drainAmount);
                createTextParticle(this.x, this.y, `+${Math.floor(drainAmount)}`, '#84cc16', 14);
            }
            
            this.attackCooldown = 60;
        }
        if (this.attackCooldown > 0) this.attackCooldown--;
    }

    summonMinions() {
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3;
            const x = this.x + Math.cos(angle) * 100;
            const y = this.y + Math.sin(angle) * 100;
            game.enemies.push(new Enemy(x, y, this.wave, 'swarm', false));
        }
        createParticles(this.x, this.y, this.color, 20);
    }

    teleport() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 150 + Math.random() * 100;
        this.x = game.player.x + Math.cos(angle) * dist;
        this.y = game.player.y + Math.sin(angle) * dist;
        this.x = Math.max(50, Math.min(CONFIG.WORLD_WIDTH - 50, this.x));
        this.y = Math.max(50, Math.min(CONFIG.WORLD_HEIGHT - 50, this.y));
        createParticles(this.x, this.y, this.color, 15);
    }

    shootAtPlayer() {
        const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
        let eb = _enemyBulletPool?.acquire(this.x, this.y, angle, 4, 8, this.damage * 0.5, this.color) ?? null;
        if (eb) { eb._pool = _enemyBulletPool; } else {
            eb = { x: this.x, y: this.y, angle, speed: 4, size: 8, damage: this.damage * 0.5, color: this.color, isEnemyBullet: true, _pool: null };
        }
        game.bullets.push(eb);
    }
    
    healNearbyEnemies() {
        const healRadius = 150;
        const healAmount = 0.05; // 5% of max health
        
        game.enemies.forEach(enemy => {
            if (enemy !== this && !enemy.isBoss) {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist <= healRadius && enemy.health < enemy.maxHealth) {
                    const heal = Math.min(enemy.maxHealth * healAmount, enemy.maxHealth - enemy.health);
                    enemy.health += heal;
                    createTextParticle(enemy.x, enemy.y, `+${Math.floor(heal)}`, '#00ff88', 14);
                }
            }
        });
        
        // Green healing pulse visual
        createParticles(this.x, this.y, '#00ff88', 15);
    }
    
    resurrectEnemy() {
        // Try to resurrect a recently killed enemy (simulate by spawning a zombie)
        if (Math.random() < 0.5 && game.enemies.length < 50) { // 50% chance
            const angle = Math.random() * Math.PI * 2;
            const dist = 100 + Math.random() * 50;
            const x = this.x + Math.cos(angle) * dist;
            const y = this.y + Math.sin(angle) * dist;
            
            // Create a zombie enemy with 50% stats
            const zombie = new Enemy(x, y, this.wave, 'normal', false);
            zombie.maxHealth *= 0.5;
            zombie.health = zombie.maxHealth;
            zombie.color = '#4ade80'; // Green tint for zombies
            zombie.isZombie = true;
            
            game.enemies.push(zombie);
            this.resurrectedEnemies.push(zombie);
            
            createTextParticle(this.x, this.y - 40, 'RESURRECTION!', '#a78bfa', 18);
            createParticles(x, y, '#a78bfa', 20);
        }
    }
    
    earthquake() {
        const shockwaveRadius = 200;
        const dist = Math.hypot(game.player.x - this.x, game.player.y - this.y);
        
        // Screen shake
        screenShake(15);
        
        // Damage and slow player if in range
        if (dist <= shockwaveRadius) {
            game.player.takeDamage(this.damage * 0.5);
            game.player.slowDebuff = Math.max(game.player.slowDebuff, 120); // 2 seconds
            game.player.slowAmount = Math.max(game.player.slowAmount, 0.3); // 30% slow
            createTextParticle(this.x, this.y - 50, 'EARTHQUAKE!', '#fbbf24', 20);
        }
        
        // Visual shockwave effect
        createParticles(this.x, this.y, '#fbbf24', 40);
    }
    
    commandAllies() {
        // Hivemind buffs all nearby enemies temporarily
        const commandRadius = 250;
        game.enemies.forEach(enemy => {
            if (enemy !== this && !enemy.isBoss && !enemy.isCommandBuffed) {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist <= commandRadius) {
                    enemy.isCommandBuffed = true;
                    enemy.commandBuffTimer = 300; // 5 seconds
                    enemy.baseSpeed = enemy.baseSpeed || enemy.speed;
                    enemy.baseDamage = enemy.baseDamage || enemy.damage;
                    enemy.speed = enemy.baseSpeed * 1.3;
                    enemy.damage = enemy.baseDamage * 1.2;
                    createTextParticle(enemy.x, enemy.y, 'BUFFED!', '#c084fc', 14);
                }
            }
        });
        createTextParticle(this.x, this.y - 50, 'COMMAND!', '#a855f7', 20);
        createParticles(this.x, this.y, '#c084fc', 30);
    }
    
    startCharge() {
        this.isCharging = true;
        this.chargeTargetX = game.player.x;
        this.chargeTargetY = game.player.y;
        this.chargeFrames = 0;
        createTextParticle(this.x, this.y - 50, 'CHARGE!', '#2dd4bf', 22);
    }
    
    updateCharge() {
        this.chargeFrames++;
        if (this.chargeFrames <= 30) {
            // Wind-up phase - glow effect
            return;
        }
        // Rush toward target
        const dx = this.chargeTargetX - this.x;
        const dy = this.chargeTargetY - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 10) {
            const chargeSpeed = this.speed * 5;
            this.x += (dx / dist) * chargeSpeed;
            this.y += (dy / dist) * chargeSpeed;
            createParticles(this.x, this.y, '#2dd4bf', 3);
            
            // Damage player if colliding during charge
            const playerDist = Math.hypot(game.player.x - this.x, game.player.y - this.y);
            if (playerDist < this.size + game.player.size) {
                game.player.takeDamage(this.damage * 2);
                screenShake(12);
                this.isCharging = false;
            }
        } else {
            this.isCharging = false;
            screenShake(8);
            createParticles(this.x, this.y, '#2dd4bf', 25);
        }
        if (this.chargeFrames > 60) this.isCharging = false;
    }
    
    reviveNearby() {
        // Revenant spawns a ghostly copy of a random enemy type
        const types = ['normal', 'fast', 'swarm'];
        const revType = types[Math.floor(Math.random() * types.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 40;
        const x = this.x + Math.cos(angle) * dist;
        const y = this.y + Math.sin(angle) * dist;
        
        const revived = new Enemy(x, y, this.wave, revType, false);
        revived.maxHealth *= 0.4;
        revived.health = revived.maxHealth;
        revived.color = '#d4d4d4';
        revived.isZombie = true;
        revived.creditValue = Math.floor(revived.creditValue * 0.3);
        
        game.enemies.push(revived);
        createTextParticle(this.x, this.y - 30, 'REVIVE!', '#a3a3a3', 16);
        createParticles(x, y, '#d4d4d4', 15);
    }

    takeDamage(amount, isCrit = false) {
        // Boss phase transition invulnerability
        if (this.isBoss && this.phaseTransitioning) {
            createTextParticle(this.x, this.y, 'IMMUNE!', '#ffd93d', 14);
            return false;
        }
        // Sentinel shield absorbs damage first
        if (this.canShield && this.shieldActive && this.shieldHealth > 0) {
            const absorbed = Math.min(amount, this.shieldHealth);
            this.shieldHealth -= absorbed;
            amount -= absorbed;
            createTextParticle(this.x, this.y - 20, `🛡️${Math.floor(absorbed)}`, '#818cf8', 14);
            if (this.shieldHealth <= 0) {
                this.shieldActive = false;
                this.shieldCooldown = 300; // 5 seconds to regenerate
                createTextParticle(this.x, this.y - 30, 'SHIELD DOWN!', '#f59e0b', 18);
                createParticles(this.x, this.y, '#818cf8', 15);
            }
            if (amount <= 0) return false;
        }
        
        // Elite shield absorbs damage first
        if (this.isElite && this.eliteShield > 0) {
            const absorbed = Math.min(amount, this.eliteShield);
            this.eliteShield -= absorbed;
            amount -= absorbed;
            createTextParticle(this.x, this.y - 20, `🛡️${Math.floor(absorbed)}`, '#60a5fa', 14);
            if (this.eliteShield <= 0) {
                createTextParticle(this.x, this.y - 30, 'SHIELD BROKEN!', '#f59e0b', 18);
                createParticles(this.x, this.y, '#60a5fa', 15);
            }
            if (amount <= 0) return false;
        }
        
        this.health -= amount;
        game.stats.damageDealt += amount;
        
        // Enhanced damage numbers
        const fontSize = isCrit ? 22 : 16;
        createTextParticle(this.x, this.y, `-${amount}${isCrit ? '!' : ''}`, isCrit ? '#ffd93d' : '#fff', fontSize);
        
        // Hit flash effect
        createParticles(this.x, this.y, this.color, 3);
        
        if (this.health <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    die() {
        game.stats.enemiesKilled++;
        game.persistentStats.totalKills++;
        
        // Spawn XP orbs instead of giving XP directly
        const baseXP = this.isBoss ? (BOSS_TYPES[this.type]?.xp || 50) : (ENEMY_TYPES[this.type]?.xp || 1);
        const xpMult = game.difficultySettings?.xpMult || 1;
        const totalXP = Math.floor(baseXP * xpMult * (this.isElite ? 2 : 1));

        // Broadcast enemy kill to co-op partners for shared XP
        if (game.isMultiplayer && window.MultiplayerClient && window.MultiplayerClient.connected) {
            window.MultiplayerClient.sendGameEvent('enemy_killed', {
                xp: totalXP,
                type: this.type,
                isBoss: this.isBoss,
                isElite: this.isElite,
            });
            // Track local MVP stats
            if (window.MultiplayerExtras) {
                const localId = window.MultiplayerClient.localPlayerId;
                window.MultiplayerExtras.bumpStat(localId, 'kills', 1);
                if (this.isBoss) {
                    window.MultiplayerExtras.bumpStat(localId, 'bosses', 1);
                    // Friendly boss-kill banner for the team
                    window.MultiplayerClient.sendGameEvent('boss_down', { type: this.type });
                    const tt = (k, f) => (window.t ? window.t(k, f) : f);
                    showNotification(tt('mp.bossDownFmt', '🏆 Boss defeated! Team strikes again!'), '#ffd93d', 4000);
                }
            }
        }

        // Split large XP into multiple orbs
        if (totalXP >= 25) {
            const largeOrbs = Math.floor(totalXP / 25);
            const remainder = totalXP % 25;
            for (let i = 0; i < largeOrbs; i++) {
                const angle = (i / largeOrbs) * Math.PI * 2;
                const spread = 15 + Math.random() * 10;
                game.xpOrbs.push(new XPOrb(this.x + Math.cos(angle) * spread, this.y + Math.sin(angle) * spread, 25));
            }
            if (remainder >= 5) {
                game.xpOrbs.push(new XPOrb(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, remainder));
            } else if (remainder > 0) {
                game.xpOrbs.push(new XPOrb(this.x, this.y, remainder));
            }
        } else if (totalXP >= 5) {
            game.xpOrbs.push(new XPOrb(this.x, this.y, totalXP));
        } else {
            game.xpOrbs.push(new XPOrb(this.x + (Math.random() - 0.5) * 10, this.y + (Math.random() - 0.5) * 10, Math.max(1, totalXP)));
        }
        
        // Weapon XP - level up equipped weapons
        if (game.player && game.player.weaponSlots) {
            game.player.weaponSlots.forEach(slot => {
                if (slot.evolved || slot.level >= 5) return;
                slot.xp = (slot.xp || 0) + 1;
                const xpNeeded = slot.level * 15; // 15, 30, 45, 60 kills to level
                if (slot.xp >= xpNeeded) {
                    slot.xp = 0;
                    slot.level++;
                    const weapon = WEAPON_TYPES[slot.type];
                    showNotification(`${weapon?.name || slot.type} leveled to ${slot.level}!`, weapon?.color || '#ffd93d', 2000);
                    Sound.play('levelUp');
                    
                    // Check for evolution at level 5
                    if (slot.level >= 5) {
                        checkWeaponEvolution(slot);
                    }
                }
            });
        }
        
        // Elite kill tracking
        if (this.isElite) {
            game.eliteKills++;
        }
        
        // Enhanced combo system
        game.stats.comboKills++;
        game.stats.comboTimer = msToFrames(CONFIG.COMBO_TIMEOUT);
        
        // Combo rewards
        if (game.stats.comboKills >= 10) {
            const bonus = Math.floor(game.stats.comboKills / 10);
            game.credits += bonus;
            if (game.stats.comboKills % 10 === 0) {
                createTextParticle(this.x, this.y - 30, `${game.stats.comboKills}x COMBO! +${bonus}💰`, '#ffd93d', 20);
                Sound.play('combo');
                screenShake(5);
            }
        } else if (game.stats.comboKills > 1 && game.stats.comboKills % 5 === 0) {
            createTextParticle(this.x, this.y - 30, `${game.stats.comboKills}x COMBO!`, '#ffd93d', 18);
        }
        
        // Splitter ability - split into smaller enemies
        if (this.canSplit && this.splitGeneration === 0 && game.enemies.length < 50) {
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2;
                const dist = this.size * 2;
                const x = this.x + Math.cos(angle) * dist;
                const y = this.y + Math.sin(angle) * dist;
                
                const split = new Enemy(x, y, this.wave, this.type, false);
                // Smaller enemies have 40% stats
                split.maxHealth *= 0.4;
                split.health = split.maxHealth;
                split.damage *= 0.4;
                split.speed *= 0.4;
                split.size *= 0.7;
                split.creditValue = Math.floor(split.creditValue * 0.3); // Reduced credits
                split.splitGeneration = 1; // Prevent further splitting
                split.canSplit = false; // Can't split again
                
                game.enemies.push(split);
            }
            createTextParticle(this.x, this.y - 30, 'SPLIT!', '#fb923c', 18);
        }
        
        // Bomber explosion on death - damages player if close
        if (this.canExplode) {
            const explosionRadius = 100;
            const playerDist = Math.hypot(game.player.x - this.x, game.player.y - this.y);
            if (playerDist <= explosionRadius) {
                game.player.takeDamage(this.damage * 1.5);
                createTextParticle(game.player.x, game.player.y - 30, 'EXPLOSION!', '#ff3300', 20);
            }
            screenShake(10);
            createExplosion(this.x, this.y, '#ff3300', 40);
            createExplosion(this.x, this.y, '#ff6633', 30);
        }
        
        if (this.isBoss) {
            game.stats.bossesDefeated++;
            showNotification(`🏆 ${this.name} Defeated! 🏆`, '#ffd93d', 4000);
            screenShake(25);
            // Massive multi-stage explosion
            createExplosion(this.x, this.y, this.color, 80);
            setTimeout(() => createExplosion(this.x + 30, this.y - 20, '#ffd93d', 50), 100);
            setTimeout(() => createExplosion(this.x - 20, this.y + 30, '#ff6b6b', 60), 200);
            setTimeout(() => createExplosion(this.x, this.y, '#fff', 40), 300);
        } else {
            // Bigger death for elites
            if (this.isElite) {
                screenShake(6);
                createExplosion(this.x, this.y, this.color, 35);
                createExplosion(this.x, this.y, this.eliteModifier?.color || '#fff', 20);
            } else {
                screenShake(3);
                createExplosion(this.x, this.y, this.color, 20);
            }
        }
        
        // Chance to spawn powerup (higher for bosses)
        const powerupChance = this.isBoss ? CONFIG.POWERUP_DROP_CHANCE_BOSS : CONFIG.POWERUP_DROP_CHANCE;
        if (Math.random() < powerupChance) {
            spawnPowerup(this.x, this.y);
        }
        
        // Kill streak credit bonus
        let streakBonus = 1;
        if (game.stats.comboKills >= 20) streakBonus = 2.5;
        else if (game.stats.comboKills >= 10) streakBonus = 2.0;
        else if (game.stats.comboKills >= 5) streakBonus = 1.5;

        const creditDrop = Math.floor(this.creditValue * (game.creditMultiplier || 1) * (1 + (game.player?.creditBonus || 0)) * streakBonus);
        game.pickups.push(new Pickup(this.x, this.y, creditDrop));
        // Vampire blood pools
        if (game.player && game.player.characterId === 'vampire') {
            if (!game.player.bloodPools) game.player.bloodPools = [];
            game.player.bloodPools.push({ x: this.x, y: this.y, life: 300 });
        }
        Sound.play('death');
        checkAchievements();
    }

    draw(ctx) {
    }
    
    // === GRUNT: Floating alien eye-orb with organic tentacles ===
    _drawGrunt(ctx, cx, cy, s, t, p, angle) {
    }
    
    // === STALKER: Dart-shaped predator with motion trail ===
    _drawStalker(ctx, cx, cy, s, t, p, angle) {
    }
    
    // === GOLEM: Floating crystal cluster ===
    _drawGolem(ctx, cx, cy, s, t, p) {
    }
    
    // === DRONE: Tiny buzzing insect with fluttering wings ===
    _drawDrone(ctx, cx, cy, s, t, p) {
    }
    
    // === WARPER: Cosmic jellyfish with trailing energy ribbons ===
    _drawWarper(ctx, cx, cy, s, t, p) {
    }
    
    // === MARKSMAN: Floating turret eye with stabilizers ===
    _drawMarksman(ctx, cx, cy, s, t, p, angle) {
    }
    
    // === ORACLE: Angelic moth with luminous wings ===
    _drawOracle(ctx, cx, cy, s, t, p) {
    }
    
    // === MITOTIC: Amoeba blob with visible nuclei ===
    _drawMitotic(ctx, cx, cy, s, t, p) {
    }
    
    // === CRYO: Crystalline ice entity with frost aura ===
    _drawCryo(ctx, cx, cy, s, t, p) {
    }
    
    // === RAVAGER: Low aggressive beast with claws ===
    _drawRavager(ctx, cx, cy, s, t, p) {
    }
    
    // === DETONATOR: Living bomb/mine with pulsing core ===
    _drawDetonator(ctx, cx, cy, s, t, p) {
    }
    
    // === LEECH: Segmented cosmic worm ===
    _drawLeech(ctx, cx, cy, s, t, p, angle) {
    }
    
    // === SENTINEL: Floating geometric obelisk with shield projectors ===
    _drawSentinel(ctx, cx, cy, s, t, p) {
    }
    
    // === WRAITH: Spectral entity with fading body ===
    _drawWraith(ctx, cx, cy, s, t, p) {
    }
    drawBoss(ctx) {
    }
    
    // === DESTROYER: Demonic war entity with burning wings ===
    _drawBossDestroyer(ctx, cx, cy, s, t, p) {
    }
    
    // === BROOD MOTHER: Spider queen with legs ===
    _drawBossBroodmother(ctx, cx, cy, s, t, p) {
    }
    
    // === VOID WALKER: Spectral horror with void portals ===
    _drawBossVoidwalker(ctx, cx, cy, s, t, p) {
    }
    
    // === NECROMANCER: Floating lich with soul energy ===
    _drawBossNecromancer(ctx, cx, cy, s, t, p) {
    }
    
    // === TITAN: Colossal armored war machine ===
    _drawBossTitan(ctx, cx, cy, s, t, p) {
    }
    
    // === HIVEMIND: Massive brain entity with psychic tentacles ===
    _drawBossHivemind(ctx, cx, cy, s, t, p) {
    }
    
    // === LEVIATHAN: Enormous serpent/dragon ===
    _drawBossLeviathan(ctx, cx, cy, s, t, p) {
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
    }
}

globalThis.Enemy = Enemy;
