/**
 * js/entities/Pickup.js — Pickup, XPOrb, Powerup classes (§9 entity peeling, Part 6)
 *
 * Extracted verbatim from main.js. Globals accessed at call-time:
 *   CONFIG, game, createParticles, triggerLevelUp, POWERUP_TYPES, msToFrames
 *
 * window.Pickup, window.XPOrb, window.Powerup set at bottom for main.js backward-compat.
 */

export class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PICKUP_SIZE * 1.5;
        this.type = type;
        this.data = POWERUP_TYPES[type];
        this.life = msToFrames(10000); // 10 seconds
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    reset(x, y, type) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PICKUP_SIZE * 1.5;
        this.type = type;
        this.data = POWERUP_TYPES[type];
        this.life = msToFrames(10000);
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    update() {
        this.life--;
        return this.life > 0;
    }

    draw(ctx) {
    }
}

export class Pickup {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PICKUP_SIZE;
        this.value = value;
        this.bob = Math.random() * Math.PI * 2;
    }

    reset(x, y, value) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PICKUP_SIZE;
        this.value = value;
        this.bob = Math.random() * Math.PI * 2;
    }

    draw(ctx) {
    }
}

export class XPOrb {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.size = value >= 25 ? 8 : value >= 5 ? 6 : 4;
        this.color = value >= 25 ? '#a855f7' : value >= 5 ? '#7c3aed' : '#6366f1';
        this.glowColor = value >= 25 ? '#c084fc' : value >= 5 ? '#a78bfa' : '#818cf8';
        this.bobOffset = Math.random() * Math.PI * 2;
        this.magnetSpeed = 0;
        this.life = 1800; // 30 seconds before despawn
    }
    
    reset(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.size = value >= 25 ? 8 : value >= 5 ? 6 : 4;
        this.color = value >= 25 ? '#a855f7' : value >= 5 ? '#7c3aed' : '#6366f1';
        this.glowColor = value >= 25 ? '#c084fc' : value >= 5 ? '#a78bfa' : '#818cf8';
        this.bobOffset = Math.random() * Math.PI * 2;
        this.magnetSpeed = 0;
        this.life = 1800;
    }
    
    update() {
        this.life--;
        // Magnet effect - accelerate toward player when in range
        if (game.player) {
            const dist = Math.hypot(game.player.x - this.x, game.player.y - this.y);
            const magnetRange = game.player.pickupRange * 2.5;
            
            if (dist < magnetRange) {
                this.magnetSpeed = Math.min(this.magnetSpeed + 0.5, 8);
                const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
                this.x += Math.cos(angle) * this.magnetSpeed;
                this.y += Math.sin(angle) * this.magnetSpeed;
            } else {
                this.magnetSpeed = Math.max(0, this.magnetSpeed - 0.3);
            }
            
            // Collect when close
            if (dist < game.player.pickupRange) {
                game.stats.xp += this.value;
                game.stats.totalXpEarned += this.value;
                
                // Check level up
                while (game.stats.xp >= game.stats.xpToNext) {
                    game.stats.xp -= game.stats.xpToNext;
                    game.stats.level++;
                    game.stats.xpToNext = Math.floor(CONFIG.XP_BASE * Math.pow(CONFIG.XP_SCALING, game.stats.level - 1));
                    triggerLevelUp();
                }
                
                createParticles(this.x, this.y, this.color, 3);
                return false; // Remove this orb
            }
        }
        
        return this.life > 0;
    }
    
    draw(ctx) {
    }
}

globalThis.Pickup = Pickup;
globalThis.XPOrb = XPOrb;
globalThis.Powerup = Powerup;
