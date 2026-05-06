// js/entities/Player.js
// Extracted from main.js – Part 5 of the renderer migration (§9 entity peeling).
//
// Migration rules:
//   - Class lifted verbatim; globals accessed via window.* at call-time.
//   - reset() method added for ObjectPool compatibility (PR #40).
//   - window.Player assigned at module load so main.js continues to work
//     without any callsite changes.
//   - Globals accessed: window.CONFIG, window.game, window.ARENA_CONSTANTS,
//     window.Sound, window.WEAPON_TYPES, window.Bullet (set by Bullet.js),
//     and top-level functions (createParticles, etc.) which are on window
//     as function-declarations from main.js classic script.

export class Player {
    constructor(character) {
        this.x = window.CONFIG.WORLD_WIDTH / 2;
        this.y = window.CONFIG.WORLD_HEIGHT / 2;
        this.size = window.CONFIG.PLAYER_SIZE;
        this.characterId = character.id;
        this.maxHealth = character.maxHealth;
        this.health = character.maxHealth;
        this.speed = character.speed;
        this.damage = character.damage;
        this.fireRate = character.fireRate;
        this.fireCooldown = 0;
        this.range = character.range || 400;
        this.projectileCount = character.projectileCount || 1;
        this.critChance = character.critChance || 0.1;
        this.critDamage = character.critDamage || 1.5;
        this.armor = character.armor || 0;
        this.dodge = character.dodge || 0;
        this.lifeSteal = character.lifeSteal || 0;
        this.pickupRange = character.pickupRange || 50;
        this.healthRegen = character.healthRegen || 0;
        this.maxDrones = character.maxDrones || 0;
        this.knockbackImmune = character.knockbackImmune || false;
        this.drones = [];
        this.droneRespawnCooldown = 0;
        this.slowDebuff = 0; // Frames remaining for slow effect
        this.slowAmount = 0; // Slow percentage
        this.dashCooldown = 0;
        this.dashInvulnerable = 0;
        this.isDashing = false;
        this.dashVx = 0;
        this.dashVy = 0;
        this.adrenaline = 0;
        this.thorns = 0;
        this.poisonDamage = 0;
        this.poisonTimer = 0;
        // Walk animation
        this.walkFrame = 0;
        this.walkTimer = 0;
        this.isMoving = false;
        this.facingRight = true;
        this.aimAngle = 0;
        // Part E rework — fixed-timestep interpolation snapshot fields.
        // Snapshotted at the start of each sim step; render lerps between
        // _interpPrevX/Y and x/y by alpha. Separate from Enemy.prevX/prevY
        // (which are used for walk animation).
        this._interpPrevX = this.x;
        this._interpPrevY = this.y;
        // Multi-weapon system - all weapons stay simultaneously active and
        // orbit the player like Vampire Survivors / Brotato / Binding of Isaac orbs.
        this.weaponSlots = [{ type: 'basic', cooldown: 0, level: 1, xp: 0, evolved: false }];
        this.maxWeaponSlots = 4;
        // Orbital weapon orbs around the player
        this.weaponOrbitAngle = 0;            // global rotation of the orbit ring
        this.weaponOrbitRadius = 48;          // px from player center
        this.weaponOrbitSpeed = 0.025;        // radians per frame
        // Gameplay-changing item flags
        this.bulletBounce = 0;
        this.splitShot = false;
        this.orbitalCount = 0;
        this.orbitalAngle = 0;
        this.fireTrail = false;
        this.hasDecoy = false;
        this.decoy = null;
        this.timeDilation = 0;
        this.magnetField = false;
        this.poisonCloudDmg = 0;
        // Character abilities
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.afterImages = [];
        this.bloodPools = [];
        this.rageMeter = 0;
        this.rageActive = false;
        this.rageTimer = 0;
        this.rageDmgBonus = 0;
        this.rageSpdBonus = 0;
        this.turrets = [];
        this.isInvisible = false;
        // Character-specific starting weapon slots
        if (character.id === 'balanced') {
            this.weaponSlots = [{ type: 'basic', cooldown: 0, level: 1, xp: 0, evolved: false }, { type: 'basic', cooldown: 0, level: 1, xp: 0, evolved: false }];
        } else if (character.id === 'gunslinger') {
            this.weaponSlots = [{ type: 'basic', cooldown: 0, level: 1, xp: 0, evolved: false }, { type: 'basic', cooldown: 0, level: 1, xp: 0, evolved: false }, { type: 'basic', cooldown: 0, level: 1, xp: 0, evolved: false }];
        }
    }

    update() {
        // Health regeneration (Medic ability)
        if (this.healthRegen && this.healthRegen > 0) {
            this.heal(this.healthRegen / window.CONFIG.TARGET_FPS); // Convert per-second to per-frame
        }
        
        // Adrenaline passive - bonus stats when below 50% HP
        let adrenalineBonus = 0;
        if (this.adrenaline > 0 && this.health < this.maxHealth * 0.5) {
            adrenalineBonus = this.adrenaline;
        }
        
        // Poison damage over time
        if (this.poisonTimer > 0) {
            const poisonDmg = this.poisonDamage / window.CONFIG.TARGET_FPS;
            this.health -= poisonDmg;
            this.poisonTimer--;
            if (this.poisonTimer % 30 === 0) {
                window.createTextParticle(this.x, this.y, `☠️`, '#65a30d', 14);
            }
            if (this.health <= 0) {
                this.health = 0;
                window.handlePlayerDeath();
                return; // Stop further updates
            }
        }
        
        // Dash update
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.dashInvulnerable > 0) this.dashInvulnerable--;
        if (this.phaseShiftCooldown > 0) this.phaseShiftCooldown--;
        
        if (this.isDashing) {
            this.x += this.dashVx;
            this.y += this.dashVy;
            this.x = Math.max(this.size, Math.min(window.CONFIG.WORLD_WIDTH - this.size, this.x));
            this.y = Math.max(this.size, Math.min(window.CONFIG.WORLD_HEIGHT - this.size, this.y));
            this.isDashing = false;
        }
        
        // Apply powerup modifiers
        const speedMult = window.getPowerupMultiplier('speed');
        let currentSpeed = this.speed * speedMult;
        currentSpeed += adrenalineBonus * 0.5;
        
        // Apply slow debuff (from Freezer enemies)
        if (this.slowDebuff > 0) {
            currentSpeed *= (1 - this.slowAmount);
            this.slowDebuff--;
        }
        
        // Movement
        let dx = 0, dy = 0;
        
        // Keyboard
        if (window.game.keys['w'] || window.game.keys['ArrowUp']) dy -= 1;
        if (window.game.keys['s'] || window.game.keys['ArrowDown']) dy += 1;
        if (window.game.keys['a'] || window.game.keys['ArrowLeft']) dx -= 1;
        if (window.game.keys['d'] || window.game.keys['ArrowRight']) dx += 1;
        
        // Touch
        if (window.game.joystick.active) {
            dx += window.game.joystick.x;
            dy += window.game.joystick.y;
        }

        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        this.x += dx * currentSpeed;
        this.y += dy * currentSpeed;
        this.x = Math.max(this.size, Math.min(window.CONFIG.WORLD_WIDTH - this.size, this.x));
        this.y = Math.max(this.size, Math.min(window.CONFIG.WORLD_HEIGHT - this.size, this.y));

        // Movement tracking for walk animation
        this.isMoving = (dx !== 0 || dy !== 0);
        if (dx > 0) this.facingRight = true;
        else if (dx < 0) this.facingRight = false;
        if (this.isMoving) {
            this.walkTimer++;
            if (this.walkTimer >= window.ARENA_CONSTANTS.WALK_ANIM_FRAME_DURATION) { this.walkTimer = 0; this.walkFrame = this.walkFrame === 0 ? 1 : 0; }
        } else { this.walkTimer = 0; this.walkFrame = 0; }

        // Phase 4 rework — Stance switching. Updates the global stance
        // singleton based on whether the local player is moving. Other
        // systems read `window.rework.stance.modifiers` to apply the buff.
        if (window.rework && window.rework.stance) {
            window.rework.stance.update(this.isMoving);
        }

        // Advance the orbit angle for the orbiting weapon orbs.
        this.weaponOrbitAngle += this.weaponOrbitSpeed;
        if (this.weaponOrbitAngle > Math.PI * 2) this.weaponOrbitAngle -= Math.PI * 2;

        this.shoot();

        this.collectPickups();

        // Orbital Shield
        if (this.orbitalCount > 0) {
            this.orbitalAngle += 0.04;
            for (let i = 0; i < this.orbitalCount; i++) {
                const oAngle = this.orbitalAngle + (i / this.orbitalCount) * Math.PI * 2;
                const orbX = this.x + Math.cos(oAngle) * 50;
                const orbY = this.y + Math.sin(oAngle) * 50;
                for (let j = window.game.enemies.length - 1; j >= 0; j--) {
                    const e = window.game.enemies[j];
                    if (Math.hypot(e.x - orbX, e.y - orbY) < e.size + 8) {
                        if (e.takeDamage(Math.floor(this.damage * 0.3), false)) {
                            window.game.enemies.splice(j, 1);
                            window.checkWaveClear();
                        }
                    }
                }
            }
        }
        // Fire trail
        if (this.fireTrail && this.isMoving && window.game.frameCount % 5 === 0) {
            window.game.particles.push({ x: this.x, y: this.y + this.size * 0.5, vx: 0, vy: 0, color: '#ff4500', life: window.ARENA_CONSTANTS.FIRE_TRAIL_LIFE, maxLife: window.ARENA_CONSTANTS.FIRE_TRAIL_LIFE, size: window.ARENA_CONSTANTS.FIRE_TRAIL_SIZE, type: 'fire_trail', damage: window.ARENA_CONSTANTS.FIRE_TRAIL_DAMAGE });
        }
        // Poison cloud
        if (this.poisonCloudDmg > 0 && window.game.frameCount % 30 === 0) {
            window.game.enemies.forEach(e => { if (Math.hypot(e.x - this.x, e.y - this.y) < 100) e.takeDamage(this.poisonCloudDmg, false); });
        }
        // Thorns aura - damage nearby enemies
        if (this.thornsAuraDmg > 0 && window.game.frameCount % 30 === 0) {
            window.game.enemies.forEach(e => {
                if (Math.hypot(e.x - this.x, e.y - this.y) < 80) {
                    e.takeDamage(this.thornsAuraDmg, false);
                    window.createParticles(e.x, e.y, '#65a30d', 2);
                }
            });
        }
        // Black hole ability
        if (this.hasBlackHole) {
            if (this.blackHoleCooldown <= 0) {
                this.blackHoleCooldown = 1500; // 25 seconds
                window.game.blackHoles = window.game.blackHoles || [];
                window.game.blackHoles.push({
                    x: this.x,
                    y: this.y,
                    radius: 150,
                    life: 300, // 5 seconds
                    maxLife: 300,
                    pullStrength: 3
                });
                window.createParticles(this.x, this.y, '#8b5cf6', 20);
                window.showNotification('🌀 Black Hole!', '#8b5cf6', 1500);
            }
            this.blackHoleCooldown--;
        }
        // Decoy management
        if (this.hasDecoy && this.decoy && this.decoy.health > 0) { /* Decoy alive, enemies target it */ }
        else if (this.hasDecoy) {
            if (!this.decoy) this.decoy = { x: this.x - 80, y: this.y, health: window.ARENA_CONSTANTS.DECOY_HEALTH, maxHealth: window.ARENA_CONSTANTS.DECOY_HEALTH, respawnTimer: 0 };
            else { this.decoy.respawnTimer = (this.decoy.respawnTimer || window.ARENA_CONSTANTS.DECOY_RESPAWN_TIME) - 1;
                if (this.decoy.respawnTimer <= 0) this.decoy = { x: this.x - 80, y: this.y, health: window.ARENA_CONSTANTS.DECOY_HEALTH, maxHealth: window.ARENA_CONSTANTS.DECOY_HEALTH, respawnTimer: 0 };
            }
        }
        // Magnetic field
        if (this.magnetField) {
            window.game.pickups.forEach(p => {
                const pDist = Math.hypot(p.x - this.x, p.y - this.y);
                if (pDist < this.pickupRange * 3 && pDist > 5) { p.x += (this.x - p.x) / pDist * 2; p.y += (this.y - p.y) / pDist * 2; }
            });
        }
        // Character abilities
        if (this.characterId === 'tank') {
            if (this.shieldTimer > 0) this.shieldTimer--;
            if (this.shieldTimer <= 0) this.shieldActive = true;
        }
        if (this.characterId === 'speedster' && this.isMoving && window.game.frameCount % 8 === 0) {
            this.afterImages.push({ x: this.x, y: this.y, life: 20, damage: this.damage * 0.1 });
            if (this.afterImages.length > 5) this.afterImages.shift();
        }
        if (this.afterImages.length > 0) {
            this.afterImages = this.afterImages.filter(ai => {
                ai.life--;
                window.game.enemies.forEach(e => { if (Math.hypot(e.x - ai.x, e.y - ai.y) < e.size + 10) e.takeDamage(ai.damage, false); });
                return ai.life > 0;
            });
        }
        if (this.characterId === 'vampire' && this.bloodPools.length > 0) {
            this.bloodPools = this.bloodPools.filter(bp => {
                bp.life--;
                if (Math.hypot(this.x - bp.x, this.y - bp.y) < 20) { this.heal(2); return false; }
                return bp.life > 0;
            });
        }
        if (this.characterId === 'berserker' && this.rageActive) {
            this.rageTimer--;
            if (this.rageTimer <= 0) { this.rageActive = false; this.damage -= this.rageDmgBonus; this.speed -= this.rageSpdBonus; this.rageDmgBonus = 0; this.rageSpdBonus = 0; this.rageMeter = 0; }
        }
        if (this.characterId === 'engineer') {
            if (this.turrets.length < window.ARENA_CONSTANTS.TURRET_MAX && window.game.frameCount % window.ARENA_CONSTANTS.TURRET_SPAWN_INTERVAL === 0) {
                this.turrets.push({ x: this.x + (Math.random() - 0.5) * window.ARENA_CONSTANTS.TURRET_SPREAD, y: this.y + (Math.random() - 0.5) * window.ARENA_CONSTANTS.TURRET_SPREAD, health: window.ARENA_CONSTANTS.TURRET_HEALTH, shootCooldown: 0 });
            }
            this.turrets = this.turrets.filter(t => {
                if (t.shootCooldown > 0) t.shootCooldown--;
                if (t.shootCooldown <= 0) {
                    const near = window.game.enemies.filter(e => Math.hypot(e.x - t.x, e.y - t.y) < 250).sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0];
                    if (near) { const a = Math.atan2(near.y - t.y, near.x - t.x); window.game.bullets.push(new window.Bullet(t.x, t.y, a, this, window.WEAPON_TYPES.basic)); t.shootCooldown = 45; }
                }
                return t.health > 0;
            });
        }
        if (this.characterId === 'medic' && !this.isMoving && window.game.frameCount % 30 === 0) this.heal(2);
        if (this.characterId === 'assassin') this.isInvisible = this.dashInvulnerable > 0;
        
        // Drone system (Summoner ability)
        if (this.maxDrones > 0) {
            this.updateDrones();
        }
    }
    
    updateDrones() {
        // Remove dead drones
        this.drones = this.drones.filter(drone => drone.health > 0);
        
        // Spawn new drones if needed
        if (this.drones.length < this.maxDrones && this.droneRespawnCooldown <= 0) {
            this.drones.push({
                angle: (this.drones.length / this.maxDrones) * Math.PI * 2,
                health: 30,
                maxHealth: 30,
                shootCooldown: 0,
            });
            if (this.drones.length < this.maxDrones) {
                this.droneRespawnCooldown = 180; // 3 seconds
            }
        }
        
        if (this.droneRespawnCooldown > 0) {
            this.droneRespawnCooldown--;
        }
        
        // Update drone positions and behavior
        this.drones.forEach((drone, i) => {
            // Orbit around player
            drone.angle += 0.02;
            const orbitRadius = 60;
            const droneX = this.x + Math.cos(drone.angle) * orbitRadius;
            const droneY = this.y + Math.sin(drone.angle) * orbitRadius;
            
            // Shoot at nearby enemies
            if (drone.shootCooldown <= 0) {
                const nearest = window.game.enemies
                    .filter(e => Math.hypot(e.x - droneX, e.y - droneY) <= 300)
                    .sort((a, b) => Math.hypot(a.x - droneX, a.y - droneY) - Math.hypot(b.x - droneX, b.y - droneY))[0];
                
                if (nearest) {
                    const angle = Math.atan2(nearest.y - droneY, nearest.x - droneX);
                    // Create a simple drone bullet object with an update method
                    const droneBullet = {
                        x: droneX,
                        y: droneY,
                        angle,
                        speed: window.CONFIG.BULLET_SPEED,
                        size: 4,
                        damage: this.damage * 0.3, // 30% of player damage
                        color: '#a855f7',
                        critChance: 0,
                        critDamage: 1,
                        lifeSteal: 0,
                        piercing: 1,
                        hitEnemies: [],
                        isDroneBullet: true,
                        update() {
                            this.x += Math.cos(this.angle) * this.speed;
                            this.y += Math.sin(this.angle) * this.speed;
                            
                            for (let i = window.game.enemies.length - 1; i >= 0; i--) {
                                const e = window.game.enemies[i];
                                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                                if (dist < e.size + this.size && !this.hitEnemies.includes(e)) {
                                    const killed = e.takeDamage(this.damage, false);
                                    this.hitEnemies.push(e);
                                    if (this.hitEnemies.length >= this.piercing) {
                                        return false;
                                    }
                                }
                            }
                            
                            return this.x >= 0 && this.x <= window.CONFIG.WORLD_WIDTH && 
                                   this.y >= 0 && this.y <= window.CONFIG.WORLD_HEIGHT;
                        },
                        draw(ctx) {
                        }
                    };
                    window.game.bullets.push(droneBullet);
                    drone.shootCooldown = 60; // 1 second
                }
            }
            if (drone.shootCooldown > 0) drone.shootCooldown--;
        });
    }

    /**
     * Compute the world-space position of a weapon orb for a given slot.
     * Orbs are evenly spaced around the player and rotate with weaponOrbitAngle.
     */
    getWeaponOrbPosition(slotIndex) {
        const slotCount = Math.max(1, this.weaponSlots.length);
        const a = this.weaponOrbitAngle + (slotIndex / slotCount) * Math.PI * 2;
        return {
            angle: a,
            x: this.x + Math.cos(a) * this.weaponOrbitRadius,
            y: this.y + Math.sin(a) * this.weaponOrbitRadius,
        };
    }

    shoot() {
        // Find candidate enemies in range relative to the player center.
        const inRange = window.game.enemies
            .filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= this.range);

        if (inRange.length === 0) {
            // Still tick down weapon cooldowns so that newly-spawned enemies
            // can be engaged immediately, and keep the aim angle pointing to
            // the orbit so the body draw code doesn't snap.
            this.weaponSlots.forEach(slot => { if (slot.cooldown > 0) slot.cooldown--; });
            return;
        }
        // For the body/arm aim animation, point at the nearest enemy from
        // the player center.
        const nearestForAim = inRange.reduce((a, b) =>
            Math.hypot(a.x - this.x, a.y - this.y) < Math.hypot(b.x - this.x, b.y - this.y) ? a : b);
        this.aimAngle = Math.atan2(nearestForAim.y - this.y, nearestForAim.x - this.x);

        this.weaponSlots.forEach((slot, slotIndex) => {
            if (slot.cooldown > 0) { slot.cooldown--; return; }
            const weapon = window.WEAPON_TYPES[slot.type];
            if (!weapon) return;

            // Each weapon fires from its current orbit position so the
            // weapons feel like Vampire-Survivors / Isaac orbs flying around
            // the character.
            const orb = this.getWeaponOrbPosition(slotIndex);
            const orbX = orb.x;
            const orbY = orb.y;

            // Each orb picks the enemies nearest *to itself*, which gives
            // each orb its own coverage arc instead of all firing the same
            // direction.
            const sortedForOrb = inRange.slice().sort((a, b) =>
                Math.hypot(a.x - orbX, a.y - orbY) - Math.hypot(b.x - orbX, b.y - orbY));

            let projectiles = this.projectileCount;
            if (window.hasPowerup('multishot')) {
                const powerup = window.game.activePowerups.find(p => p.data.effect === 'multishot');
                if (powerup) projectiles += powerup.data.value;
            }

            const targets = sortedForOrb.slice(0, projectiles);
            targets.forEach((enemy) => {
                const angle = Math.atan2(enemy.y - orbY, enemy.x - orbX);
                if (slot.type === 'spread') {
                    for (let i = 0; i < 5; i++) {
                        const spreadAngle = angle + (i - 2) * 0.15;
                        window.game.bullets.push(new window.Bullet(orbX, orbY, spreadAngle, this, weapon));
                    }
                    // Mirror shot - fire reverse copy
                    if (this.mirrorShot && !weapon.continuous) {
                        const mirrorAngle = angle + Math.PI;
                        const mirrorBullet = new window.Bullet(orbX, orbY, mirrorAngle, this, weapon);
                        mirrorBullet.isMirror = true;
                        window.game.bullets.push(mirrorBullet);
                    }
                } else {
                    window.game.bullets.push(new window.Bullet(orbX, orbY, angle, this, weapon));
                    // Mirror shot - fire reverse copy
                    if (this.mirrorShot && !weapon.continuous) {
                        const mirrorAngle = angle + Math.PI;
                        const mirrorBullet = new window.Bullet(orbX, orbY, mirrorAngle, this, weapon);
                        mirrorBullet.isMirror = true;
                        window.game.bullets.push(mirrorBullet);
                    }
                }
            });
            // Evolved weapon bonuses
            if (slot.evolved && slot.evolvedData) {
                const evo = slot.evolvedData;
                // Galaxy Burst - 360° ring (centered on the orb)
                if (evo.fullCircle) {
                    for (let ring = 0; ring < evo.projectiles; ring++) {
                        const ringAngle = (ring / evo.projectiles) * Math.PI * 2;
                        const b = new window.Bullet(orbX, orbY, ringAngle, this, weapon);
                        b.damage *= evo.damage;
                        b.color = evo.color;
                        window.game.bullets.push(b);
                    }
                }
                // Orbital Strike - rain rockets from sky (still centered on player)
                if (evo.orbitalStrike) {
                    for (let s = 0; s < evo.strikeCount; s++) {
                        setTimeout(() => {
                            const sx = window.game.player.x + (Math.random() - 0.5) * 300;
                            const sy = window.game.player.y + (Math.random() - 0.5) * 300;
                            window.createExplosion(sx, sy, evo.color, 30);
                            window.game.enemies.forEach(e => {
                                if (Math.hypot(e.x - sx, e.y - sy) < 80) {
                                    e.takeDamage(window.game.player.damage * 2, false);
                                }
                            });
                            window.screenShake(5);
                        }, s * 200);
                    }
                }
            }
            slot.cooldown = Math.floor(this.fireRate * (weapon.fireRate || 1));
            slot.maxCooldown = slot.cooldown;
            window.Sound.play('shoot');
        });
    }

    collectPickups() {
        window.game.pickups = window.game.pickups.filter(p => {
            const dist = Math.hypot(p.x - this.x, p.y - this.y);
            if (dist <= this.pickupRange) {
                window.game.credits += p.value;
                window.game.persistentStats.totalCredits += p.value;
                window.createParticles(p.x, p.y, '#ffd93d', 5);
                window.Sound.play('pickup');
                return false;
            }
            return true;
        });
    }

    takeDamage(amount) {
        // Dash invulnerability
        if (this.dashInvulnerable > 0) {
            window.createTextParticle(this.x, this.y, 'INVULNERABLE!', '#4ecdc4', 16);
            return;
        }
        
        // Phase Shift - invulnerability after damage
        if (this.phaseShift && this.phaseShiftCooldown > 0) {
            window.createTextParticle(this.x, this.y, '👻 PHASE!', '#8b5cf6', 16);
            return;
        }
        
        // Tank shield block
        if (this.shieldActive && this.characterId === 'tank') {
            this.shieldActive = false;
            this.shieldTimer = 900;
            window.createTextParticle(this.x, this.y, '🛡️ BLOCKED!', '#60a5fa', 22);
            window.createParticles(this.x, this.y, '#60a5fa', 15);
            window.screenShake(5);
            return;
        }
        
        // Shield powerup protection
        if (window.hasPowerup('shield')) {
            const shield = window.game.activePowerups.find(p => p.data.effect === 'shield');
            if (shield.data.value > 0) {
                const absorbed = Math.min(amount, shield.data.value);
                shield.data.value -= absorbed;
                amount -= absorbed;
                window.createTextParticle(this.x, this.y, 'SHIELD!', '#4ecdc4', 18);
                if (shield.data.value <= 0) {
                    window.game.activePowerups = window.game.activePowerups.filter(p => p !== shield);
                    window.showNotification('Shield Broken!', '#ff6b6b', 1000);
                }
                if (amount <= 0) return;
            }
        }
        
        if (Math.random() < this.dodge) {
            window.createTextParticle(this.x, this.y, 'DODGE!', '#4ecdc4', 18);
            window.createParticles(this.x, this.y, '#4ecdc4', 8);
            return;
        }
        // Diminishing-returns armor: 10 armor ≈ 25% reduction, 20 ≈ 40%,
        // 30 ≈ 50%, hard-capped at 60% so even Juggernaut can still die.
        // Old `100/(100+armor)` made 10 armor a measly 9% reduction, which
        // made Tank/Juggernaut/Engineer not actually feel tanky.
        const armorReduction = Math.min(0.60, this.armor / (this.armor + 30));
        let finalDamage = Math.max(1, Math.floor(amount * (1 - armorReduction)));
        // Phase 4 rework — Focus stance reduces incoming damage. Weather
        // also adjusts defense (e.g. storm grants +5% reduction).
        if (window.rework) {
            let defMult = 1;
            if (window.rework.stance) defMult *= window.rework.stance.modifiers.defenseMultiplier;
            if (window.rework.weather && window.rework.weather.current) {
                // Weather profiles store playerDefenseMultiplier where >1 = MORE
                // damage-reduction (rare). Convert to a damage-taken multiplier.
                const w = window.rework.weather.current.playerDefenseMultiplier;
                if (w && w > 0) defMult *= (2 - w); // 1.05 -> 0.95 incoming dmg
            }
            finalDamage = Math.max(1, Math.floor(finalDamage * defMult));
        }
        this.health -= finalDamage;
        window.game.stats.damageTaken += finalDamage;
        // Track when the player was last actually hit so the renderer can
        // pulse a brief red full-screen damage flash for visceral feedback.
        this._lastHitTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        this._lastHitDamage = finalDamage;
        
        // Thorns passive - reflect damage to nearest enemy
        if (this.thorns > 0) {
            const thornsDamage = Math.floor(finalDamage * this.thorns);
            if (thornsDamage > 0 && window.game.enemies.length > 0) {
                let nearest = window.game.enemies[0];
                let nearestDist = Math.hypot(nearest.x - this.x, nearest.y - this.y);
                for (let i = 1; i < window.game.enemies.length; i++) {
                    const d = Math.hypot(window.game.enemies[i].x - this.x, window.game.enemies[i].y - this.y);
                    if (d < nearestDist) { nearest = window.game.enemies[i]; nearestDist = d; }
                }
                nearest.takeDamage(thornsDamage, false);
                window.createTextParticle(nearest.x, nearest.y, `🌵${thornsDamage}`, '#65a30d', 14);
            }
        }
        
        // Enhanced damage feedback
        window.createTextParticle(this.x, this.y, `-${finalDamage}`, '#ff6b6b', 18);
        window.createParticles(this.x, this.y, '#ff6b6b', 5);
        window.screenShake(finalDamage * 0.5);
        // Phase 2 rework — red hit-flash overlay on player damage. Bigger
        // hits = brighter pulse. Capped at 0.4 alpha so the screen never
        // becomes unreadable.
        if (window.rework && window.rework.juice) {
            const peak = Math.min(0.4, 0.10 + finalDamage * 0.012);
            window.rework.juice.flash.pulse('#ff2244', peak, 220);
            // Brief hit-stop (~30ms) on heavy hits so they register.
            if (finalDamage >= 15) window.hitStop(30);
        }
        
        // Berserker rage
        if (this.characterId === 'berserker' && !this.rageActive) {
            this.rageMeter = (this.rageMeter || 0) + finalDamage * 2;
            if (this.rageMeter >= 100) {
                this.rageActive = true; this.rageTimer = 300;
                this.rageDmgBonus = Math.floor(this.damage * 0.5); this.rageSpdBonus = 1;
                this.damage += this.rageDmgBonus; this.speed += this.rageSpdBonus;
                window.createTextParticle(this.x, this.y, '🔥 RAGE!', '#ff0000', 24);
                window.screenShake(15);
            }
        }
        
        // Trigger Phase Shift cooldown
        if (this.phaseShift && this.phaseShiftCooldown <= 0) {
            this.dashInvulnerable = Math.max(this.dashInvulnerable, 60);
            this.phaseShiftCooldown = 300;
        }

        window.Sound.play('hit');
        if (this.health <= 0) {
            if (this.secondWind) {
                this.secondWind = false;
                this.health = Math.floor(this.maxHealth * 0.3);
                window.createTextParticle(this.x, this.y, '💨 SECOND WIND!', '#ffd93d', 24);
                window.createParticles(this.x, this.y, '#ffd93d', 30);
                window.screenShake(15);
                window.showNotification('💨 Second Wind! Revived with 30% HP!', '#ffd93d', 3000);
                window.Sound.play('levelUp');
                // Brief invulnerability
                this.dashInvulnerable = 60;
            } else {
                window.handlePlayerDeath();
            }
        }
    }

    heal(amount) {
        if (this.healingBlocked) return;
        const heal = Math.min(amount, this.maxHealth - this.health);
        this.health += heal;
        if (heal > 0) {
            window.createTextParticle(this.x, this.y, `+${heal}`, '#00ff88', 18);
            window.createParticles(this.x, this.y, '#00ff88', 8);
        }
    }

    dash(dx, dy) {
        if (this.dashCooldown > 0) return;
        if (dx === 0 && dy === 0) return;
        
        const dist = Math.hypot(dx, dy);
        this.dashVx = (dx / dist) * window.CONFIG.DASH_DISTANCE / 4;
        this.dashVy = (dy / dist) * window.CONFIG.DASH_DISTANCE / 4;
        this.isDashing = true;
        this.dashCooldown = window.CONFIG.DASH_COOLDOWN;
        this.dashInvulnerable = window.CONFIG.DASH_INVULNERABLE_FRAMES;
        
        window.createParticles(this.x, this.y, '#4ecdc4', 15);
        window.Sound.play('powerup');
    }


    /**
     * Re-initialise all mutable instance fields to match a post-constructor
     * state. Enables pool reuse via ObjectPool (PR #40).
     * @param {object} character  Character definition object (same as constructor arg)
     */
    reset(character) {
        const CONFIG = window.CONFIG;
        this.x = CONFIG.WORLD_WIDTH / 2;
        this.y = CONFIG.WORLD_HEIGHT / 2;
        this.size = CONFIG.PLAYER_SIZE;
        this.characterId = character.id;
        this.maxHealth = character.maxHealth;
        this.health = character.maxHealth;
        this.speed = character.speed;
        this.damage = character.damage;
        this.fireRate = character.fireRate;
        this.fireCooldown = 0;
        this.range = character.range || 400;
        this.projectileCount = character.projectileCount || 1;
        this.critChance = character.critChance || 0.1;
        this.critDamage = character.critDamage || 1.5;
        this.armor = character.armor || 0;
        this.dodge = character.dodge || 0;
        this.lifeSteal = character.lifeSteal || 0;
        this.pickupRange = character.pickupRange || 50;
        this.healthRegen = character.healthRegen || 0;
        this.maxDrones = character.maxDrones || 0;
        this.knockbackImmune = character.knockbackImmune || false;
        this.drones = [];
        this.droneRespawnCooldown = 0;
        this.slowDebuff = 0;
        this.slowAmount = 0;
        this.dashCooldown = 0;
        this.dashInvulnerable = 0;
        this.isDashing = false;
        this.dashVx = 0;
        this.dashVy = 0;
        this.adrenaline = 0;
        this.thorns = 0;
        this.poisonDamage = 0;
        this.poisonTimer = 0;
        this.walkFrame = 0;
        this.walkTimer = 0;
        this.isMoving = false;
        this.facingRight = true;
        this.aimAngle = 0;
        this._interpPrevX = this.x;
        this._interpPrevY = this.y;
        this.weaponSlots = [{ type: 'basic', cooldown: 0, level: 1, xp: 0, evolved: false }];
        this.maxWeaponSlots = 4;
        this.weaponOrbitAngle = 0;
        this.weaponOrbitRadius = 48;
        this.weaponOrbitSpeed = 0.025;
        this.bulletBounce = 0;
        this.splitShot = false;
        this.orbitalCount = 0;
        this.orbitalAngle = 0;
        this.fireTrail = false;
        this.hasDecoy = false;
        this.decoy = null;
        this.timeDilation = 0;
        this.magnetField = false;
        this.poisonCloudDmg = 0;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.afterImages = [];
        this.bloodPools = [];
        this.rageMeter = 0;
        this.rageActive = false;
        this.rageTimer = 0;
        this.rageDmgBonus = 0;
        this.rageSpdBonus = 0;
        this.turrets = [];
        this.isInvisible = false;
        if (character.id === 'balanced') {
            this.weaponSlots = [{ type: 'basic', cooldown: 0, level: 1, xp: 0, evolved: false }, { type: 'basic', cooldown: 0, level: 1, xp: 0, evolved: false }];
        } else if (character.id === 'gunslinger') {
            this.weaponSlots = [{ type: 'basic', cooldown: 0, level: 1, xp: 0, evolved: false }, { type: 'basic', cooldown: 0, level: 1, xp: 0, evolved: false }, { type: 'basic', cooldown: 0, level: 1, xp: 0, evolved: false }];
        }
        return this;
    }

    draw(ctx) {
    }
}

// ─── window alias ────────────────────────────────────────────────────────────
// main.js accesses Player via `new Player(...)` — the class name is resolved
// at runtime, so setting window.Player after module load is sufficient.
window.Player = Player;
