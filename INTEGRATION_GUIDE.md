# Manual Integration Guide for Cosmic Survivor Enhanced Features

This document outlines the remaining manual integration work needed in `main.js` to fully implement all enhanced features.

## 1. New Enemy Behaviors

### Bomber Alien (Wave 22+)
The Bomber enemy type has been defined in `enemyTypes.js` but needs implementation in the enemy death handler:

```javascript
// In the enemy death handling code (around line 1400-1500 in main.js)
function handleEnemyDeath(enemy) {
    // ... existing code ...
    
    // Add bomber explosion
    if (enemy.type === 'bomber') {
        // Create explosion damage area
        const explosionRadius = 100;
        const explosionDamage = 30;
        
        // Damage player if in range
        const distToPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (distToPlayer <= explosionRadius) {
            applyDamageToPlayer(explosionDamage);
        }
        
        // Damage nearby enemies
        enemies.forEach(e => {
            const dist = Math.hypot(enemy.x - e.x, enemy.y - e.y);
            if (dist <= explosionRadius && e !== enemy) {
                e.health -= explosionDamage / 2; // Half damage to enemies
            }
        });
        
        // Visual effect
        if (window.enhancedSystems.visualEffects) {
            window.enhancedSystems.visualEffects.addFlash('#ff3300', 0.3);
            window.enhancedSystems.visualEffects.addScreenShake(15, 20);
        }
        
        // Spawn explosion particles
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                size: 3 + Math.random() * 5,
                color: '#ff3300',
                life: 30 + Math.random() * 30
            });
        }
    }
}
```

### Mimic Alien (Wave 25+)
Mimics disguise as credit pickups and attack when player gets close:

```javascript
// In enemy spawn code
function spawnEnemy(x, y, type) {
    const enemy = {
        // ... existing properties ...
        type: type,
        isMimic: type === 'mimic',
        disguised: type === 'mimic',
    };
    
    // ... rest of spawn code ...
}

// In enemy rendering code
function renderEnemy(enemy) {
    if (enemy.isMimic && enemy.disguised) {
        // Render as credit pickup
        ctx.fillStyle = '#ffd93d';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 8, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Normal enemy rendering
        // ... existing code ...
    }
}

// In enemy update code
function updateEnemy(enemy) {
    if (enemy.isMimic && enemy.disguised) {
        // Check if player is close
        const distToPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (distToPlayer <= 150) {
            enemy.disguised = false;
            // Play reveal sound
            Sound.play('enemySpawn');
        }
    }
    
    // ... rest of update code ...
}
```

## 2. New Boss Behaviors

### Swarm Queen (Wave 25, 45, etc.)
The Swarm Queen continuously spawns swarm enemies and has weak points:

```javascript
// In boss creation
function createBoss(type) {
    const boss = {
        // ... existing boss properties ...
        weakPoints: type === 'swarmqueen' ? [
            { x: -20, y: -20, destroyed: false },
            { x: 20, y: -20, destroyed: false },
            { x: 0, y: 25, destroyed: false }
        ] : null,
        spawnTimer: 0,
        spawnInterval: 180, // 3 seconds
    };
    
    return boss;
}

// In boss update
function updateBoss(boss) {
    // ... existing code ...
    
    if (boss.type === 'swarmqueen') {
        // Spawn swarm enemies periodically
        boss.spawnTimer++;
        if (boss.spawnTimer >= boss.spawnInterval) {
            boss.spawnTimer = 0;
            for (let i = 0; i < 3; i++) {
                spawnEnemy(boss.x + Math.random() * 100 - 50, boss.y + Math.random() * 100 - 50, 'swarm');
            }
        }
        
        // Check if all weak points destroyed
        if (boss.weakPoints && boss.weakPoints.every(wp => wp.destroyed)) {
            boss.vulnerableToMainDamage = true;
        } else {
            boss.vulnerableToMainDamage = false;
        }
    }
}

// In bullet collision
function checkBulletBossCollision(bullet, boss) {
    if (boss.type === 'swarmqueen' && boss.weakPoints) {
        // Check collision with weak points first
        for (let wp of boss.weakPoints) {
            if (!wp.destroyed) {
                const wpX = boss.x + wp.x;
                const wpY = boss.y + wp.y;
                const dist = Math.hypot(bullet.x - wpX, bullet.y - wpY);
                if (dist < 15) {
                    wp.destroyed = true;
                    // Visual feedback
                    Sound.play('hit');
                    return true;
                }
            }
        }
        
        // Only damage main body if all weak points destroyed
        if (!boss.vulnerableToMainDamage) {
            return false; // Immune to main body damage
        }
    }
    
    // ... existing collision code ...
}
```

### Cosmic Horror (Wave 30, 50, etc.)
Large boss with multiple phases, tentacles, and void zones:

```javascript
// In boss creation
function createBoss(type) {
    const boss = {
        // ... existing properties ...
        phase: type === 'cosmichorror' ? 1 : 0,
        maxPhases: 3,
        tentacles: type === 'cosmichorror' ? [] : null,
        voidZones: [],
        attackTimer: 0,
    };
    
    if (type === 'cosmichorror') {
        // Create tentacles
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 * i) / 4;
            boss.tentacles.push({
                angle: angle,
                length: 100,
                active: true,
                health: 200
            });
        }
    }
    
    return boss;
}

// In boss update
function updateBoss(boss) {
    if (boss.type === 'cosmichorror') {
        // Update phase based on health
        const healthPercent = boss.health / boss.maxHealth;
        if (healthPercent <= 0.66 && boss.phase === 1) {
            boss.phase = 2;
            // Phase transition effects
            Sound.play('bossAbility');
        } else if (healthPercent <= 0.33 && boss.phase === 2) {
            boss.phase = 3;
            Sound.play('bossAbility');
        }
        
        // Tentacle attacks
        boss.attackTimer++;
        if (boss.attackTimer >= 120) { // Every 2 seconds
            boss.attackTimer = 0;
            
            // Spawn void zone at player position
            boss.voidZones.push({
                x: player.x,
                y: player.y,
                radius: 50,
                damage: 5,
                lifetime: 180 // 3 seconds
            });
        }
        
        // Update void zones
        boss.voidZones = boss.voidZones.filter(vz => {
            vz.lifetime--;
            
            // Damage player if in zone
            const dist = Math.hypot(vz.x - player.x, vz.y - player.y);
            if (dist < vz.radius) {
                applyDamageToPlayer(vz.damage / 60); // Per frame damage
            }
            
            return vz.lifetime > 0;
        });
    }
}
```

## 3. Powerup Drops

Add powerup drops from enemies and bosses:

```javascript
// In enemy death handling
function handleEnemyDeath(enemy) {
    // ... existing code ...
    
    // Drop powerups
    if (Math.random() < 0.15 || (enemy.isBoss && Math.random() < 0.8)) {
        const powerup = window.enhancedSystems.powerupSystem.PowerupSystem.createPickup(
            enemy.x,
            enemy.y
        );
        
        pickups.push({
            ...powerup,
            isPowerup: true
        });
    }
}

// In pickup collection
function collectPickup(pickup) {
    if (pickup.isPowerup) {
        window.enhancedSystems.powerup.activatePowerup(pickup.type, game);
    } else {
        // Normal credit collection
        credits += pickup.value;
    }
}
```

## 4. Berserker Rage Synergy

Apply the Berserker Rage synergy when player is low on health:

```javascript
// In player update
function updatePlayer() {
    // ... existing code ...
    
    // Apply berserker rage synergy if active
    if (window.enhancedSystems.synergy.isSynergyActive('berserkerRage')) {
        const healthPercent = player.health / player.maxHealth;
        if (healthPercent <= 0.3) {
            // Apply temporary boosts
            player.tempDamageMultiplier = 1.5;
            player.tempSpeedMultiplier = 1.3;
        } else {
            player.tempDamageMultiplier = 1;
            player.tempSpeedMultiplier = 1;
        }
    }
}
```

## 5. Event Modifiers

Apply event modifiers to game mechanics:

```javascript
// In player movement
function movePlayer(dx, dy) {
    const modifiers = game.eventModifiers;
    
    // Invert controls if Gravity Anomaly is active
    if (modifiers.invertedControls) {
        dx = -dx;
        dy = -dy;
    }
    
    player.x += dx * player.speed;
    player.y += dy * player.speed;
}

// In damage application
function applyDamageToPlayer(damage) {
    const modifiers = game.eventModifiers;
    
    // Invulnerable during Shield Bubble
    if (modifiers.invulnerable) {
        return;
    }
    
    player.health -= damage;
}

// In shooting
function tryShoot() {
    const modifiers = game.eventModifiers;
    
    // Cannot attack during Shield Bubble
    if (modifiers.cannotAttack) {
        return;
    }
    
    // Apply fire rate modifier from Power Surge
    const effectiveFireRate = player.fireRate * modifiers.fireRateMultiplier;
    
    // ... rest of shooting code ...
}

// In credit collection
function collectCredit(credit) {
    const modifiers = game.eventModifiers;
    
    // Apply credit multiplier from Credit Rush event
    const creditValue = credit.value * modifiers.creditMultiplier;
    
    credits += creditValue;
}
```

## 6. Synergy Application

Ensure synergies are properly applied in damage calculations:

```javascript
// In damage calculation
function calculateDamage(baseDamage, isCrit) {
    let damage = baseDamage;
    
    // Apply Glass Cannon synergy
    if (window.enhancedSystems.synergy.isSynergyActive('glassCannon')) {
        damage *= 1.25;
        if (isCrit) {
            damage *= 1.15; // Additional crit damage bonus
        }
    }
    
    // Apply Sniper Elite instant kill chance
    if (window.enhancedSystems.synergy.isSynergyActive('sniperElite') && 
        Math.random() < 0.05 && 
        !enemy.isBoss) {
        damage = enemy.health; // Instant kill
    }
    
    // Apply Vampire Lord kill healing
    if (window.enhancedSystems.synergy.isSynergyActive('vampireLord') && 
        damage >= enemy.health) {
        const healAmount = enemy.maxHealth * 0.05;
        player.health = Math.min(player.maxHealth, player.health + healAmount);
    }
    
    return damage;
}
```

## 7. Character Unlock Tracking

Track stats for character unlocks:

```javascript
// Track critical hits
function handleCriticalHit() {
    game.persistentStats.criticalHits = (game.persistentStats.criticalHits || 0) + 1;
}

// Track healing
function healPlayer(amount) {
    player.health = Math.min(player.maxHealth, player.health + amount);
    game.persistentStats.healingDone = (game.persistentStats.healingDone || 0) + amount;
}
```

## 8. Music Transitions

The music system is already integrated, but ensure transitions happen smoothly:

```javascript
// Shop music when entering shop
function showShop() {
    // ... existing code ...
    
    if (window.enhancedSystems.music) {
        window.enhancedSystems.music.stopMusic();
        window.enhancedSystems.music.startMusic('shop');
    }
}

// Resume normal music after shop
function closeShop() {
    // ... existing code ...
    
    if (window.enhancedSystems.music) {
        window.enhancedSystems.music.stopMusic();
        const isBoss = game.wave % 5 === 0;
        window.enhancedSystems.music.startMusic(isBoss ? 'boss' : 'normal');
    }
}
```

## Testing Checklist

- [ ] Test meta-progression: Earn crystals, buy upgrades, verify stat increases
- [ ] Test character unlocks: Check initial 4 characters, unlock others with crystals
- [ ] Test synergies: Build combinations and verify bonus effects
- [ ] Test cosmic events: Verify all 8 events trigger and work correctly
- [ ] Test visual effects: Check screen shake, hit stop, slow motion, vignette
- [ ] Test music: Verify normal, boss, and shop music play correctly
- [ ] Test settings: Change all settings and verify they apply
- [ ] Test powerups: Collect and verify all powerup effects
- [ ] Test new enemies: Bomber explosions, Mimic disguises
- [ ] Test new bosses: Swarm Queen weak points, Cosmic Horror phases
- [ ] Test on desktop browser
- [ ] Test on mobile device
- [ ] Performance test with many enemies
- [ ] Test save/load of meta-progression data

## Notes

The integration script (`game-integration.js`) provides hooks for most features, but the specific enemy/boss behaviors and powerup mechanics require modifications to `main.js` due to the tight coupling with the existing game loop and entity systems.

For a production implementation, consider refactoring `main.js` into a more modular architecture that better supports these kinds of extensions.
