// Player Entity
import { CONFIG } from '../config.js';

export class Player {
    constructor(x, y, stats, weapon) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PLAYER_SIZE;
        Object.assign(this, stats);
        this.fireCooldown = 0;
        this.weapon = weapon;
    }

    update(game) {
        // Movement from keyboard
        let dx = 0;
        let dy = 0;
        
        if (game.keys['w'] || game.keys['ArrowUp']) dy -= 1;
        if (game.keys['s'] || game.keys['ArrowDown']) dy += 1;
        if (game.keys['a'] || game.keys['ArrowLeft']) dx -= 1;
        if (game.keys['d'] || game.keys['ArrowRight']) dx += 1;
        
        // Add touch controls
        if (game.touchControls && game.touchControls.isMobile) {
            const touch = game.touchControls.getMovement();
            dx += touch.dx;
            dy += touch.dy;
        }

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        this.x += dx * this.speed;
        this.y += dy * this.speed;

        // Keep player in bounds
        this.x = Math.max(this.size, Math.min(CONFIG.CANVAS_WIDTH - this.size, this.x));
        this.y = Math.max(this.size, Math.min(CONFIG.CANVAS_HEIGHT - this.size, this.y));

        // Auto-shoot
        if (this.fireCooldown > 0) {
            this.fireCooldown--;
        } else {
            this.shoot(game);
        }

        // Pickup collection
        this.collectPickups(game);
    }

    shoot(game) {
        const nearestEnemies = this.findNearestEnemies(game, this.projectileCount);
        
        if (nearestEnemies.length > 0) {
            nearestEnemies.forEach(enemy => {
                const angle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
                const projectileData = this.weapon.createProjectiles(this.x, this.y, angle, this);
                
                projectileData.forEach(pd => {
                    game.bullets.push(this.createBullet(pd, game));
                });
            });
            this.fireCooldown = this.fireRate;
            game.sound.playShoot();
        }
    }

    createBullet(projectileData, game) {
        return {
            x: this.x,
            y: this.y,
            angle: projectileData.angle,
            speed: CONFIG.BULLET_SPEED,
            size: CONFIG.BULLET_SIZE,
            damage: this.damage,
            critChance: this.critChance,
            critDamage: this.critDamage,
            lifeSteal: this.lifeSteal,
            piercing: 1,
            hitEnemies: [],
            type: projectileData.type,
            config: projectileData.config,
            color: projectileData.config.color,
            explosionRadius: projectileData.config.explosionRadius,
        };
    }

    findNearestEnemies(game, count) {
        return game.enemies
            .filter(enemy => {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                return dist <= this.range;
            })
            .sort((a, b) => {
                const distA = Math.hypot(a.x - this.x, a.y - this.y);
                const distB = Math.hypot(b.x - this.x, b.y - this.y);
                return distA - distB;
            })
            .slice(0, count);
    }

    collectPickups(game) {
        game.pickups = game.pickups.filter(pickup => {
            const dist = Math.hypot(pickup.x - this.x, pickup.y - this.y);
            if (dist <= this.pickupRange) {
                game.credits += pickup.value;
                game.stats.totalCreditsEarned += pickup.value;
                game.savePersistentStat('totalCreditsEarned', game.stats.totalCreditsEarned);
                createParticles(game, pickup.x, pickup.y, '#ffd93d', 5);
                game.sound.playPickup();
                return false;
            }
            return true;
        });
    }

    takeDamage(amount, game) {
        // Check dodge
        if (Math.random() < this.dodge) {
            createTextParticle(game, this.x, this.y, 'DODGE!', '#4ecdc4');
            return;
        }

        // Apply armor
        const finalDamage = Math.max(1, amount - this.armor);
        this.health -= finalDamage;
        game.stats.damageTaken += finalDamage;
        
        createTextParticle(game, this.x, this.y, `-${finalDamage}`, '#ff6b6b');

        if (this.health <= 0) {
            game.sound.playGameOver();
            gameOver(game);
        }
    }

    heal(amount, game) {
        const healAmount = Math.min(amount, this.maxHealth - this.health);
        this.health += healAmount;
        if (healAmount > 0) {
            createTextParticle(game, this.x, this.y, `+${healAmount}`, '#00ff88');
        }
    }

    draw(ctx, game) {
        // Draw player (astronaut helmet)
        ctx.save();
        
        // Helmet
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // Visor
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Visor reflection
        ctx.fillStyle = 'rgba(78, 205, 196, 0.5)';
        ctx.beginPath();
        ctx.arc(this.x - this.size * 0.2, this.y - this.size * 0.2, this.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Body
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(this.x - this.size * 0.4, this.y + this.size * 0.3, this.size * 0.8, this.size * 0.6);
        
        // Range indicator (faint)
        if (game.enemies.length > 0) {
            ctx.strokeStyle = 'rgba(78, 205, 196, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// Helper functions
function createParticles(game, x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 2 + Math.random() * 3;
        game.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            color,
            life: 30 + Math.random() * 20,
            maxLife: 30 + Math.random() * 20,
            type: 'particle',
        });
    }
}

function createTextParticle(game, x, y, text, color) {
    game.particles.push({
        x, y,
        text,
        color,
        life: 60,
        maxLife: 60,
        vy: -1,
        type: 'text',
    });
}

function gameOver(game) {
    // Will be implemented in main
}
