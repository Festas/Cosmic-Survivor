// Game Constants
const CONFIG = {
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 800,
    WAVE_DURATION: 60,
    PLAYER_SIZE: 30,
    ENEMY_SIZE: 25,
    BULLET_SIZE: 5,
    BULLET_SPEED: 8,
    PICKUP_SIZE: 15,
};

// Game State
const game = {
    canvas: null,
    ctx: null,
    state: 'start', // start, playing, shop, gameOver
    wave: 1,
    timeLeft: CONFIG.WAVE_DURATION,
    credits: 0,
    player: null,
    enemies: [],
    bullets: [],
    pickups: [],
    particles: [],
    keys: {},
    joystick: { x: 0, y: 0, active: false, startX: 0, startY: 0 },
    stats: {
        enemiesKilled: 0,
        damageDealt: 0,
        damageTaken: 0,
    },
};

// Player Class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PLAYER_SIZE;
        this.maxHealth = 100;
        this.health = 100;
        this.speed = 3;
        this.damage = 10;
        this.fireRate = 30; // frames between shots
        this.fireCooldown = 0;
        this.range = 400;
        this.projectileCount = 1;
        this.critChance = 0.1;
        this.critDamage = 1.5;
        this.armor = 0;
        this.dodge = 0;
        this.lifeSteal = 0;
        this.pickupRange = 50;
    }

    update() {
        // Movement
        let dx = 0;
        let dy = 0;
        
        if (game.keys['w'] || game.keys['ArrowUp']) dy -= 1;
        if (game.keys['s'] || game.keys['ArrowDown']) dy += 1;
        if (game.keys['a'] || game.keys['ArrowLeft']) dx -= 1;
        if (game.keys['d'] || game.keys['ArrowRight']) dx += 1;

        // Touch joystick
        if (game.joystick && game.joystick.active) {
            dx += game.joystick.x;
            dy += game.joystick.y;
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
            this.shoot();
        }

        // Pickup collection
        this.collectPickups();
    }

    shoot() {
        const nearestEnemies = this.findNearestEnemies(this.projectileCount);
        
        if (nearestEnemies.length > 0) {
            nearestEnemies.forEach(enemy => {
                const angle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
                game.bullets.push(new Bullet(this.x, this.y, angle, this));
            });
            this.fireCooldown = this.fireRate;
        }
    }

    findNearestEnemies(count) {
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

    collectPickups() {
        game.pickups = game.pickups.filter(pickup => {
            const dist = Math.hypot(pickup.x - this.x, pickup.y - this.y);
            if (dist <= this.pickupRange) {
                game.credits += pickup.value;
                createParticles(pickup.x, pickup.y, '#ffd93d', 5);
                return false;
            }
            return true;
        });
    }

    takeDamage(amount) {
        // Check dodge
        if (Math.random() < this.dodge) {
            createTextParticle(this.x, this.y, 'DODGE!', '#4ecdc4');
            return;
        }

        // Apply armor
        const finalDamage = Math.max(1, amount - this.armor);
        this.health -= finalDamage;
        game.stats.damageTaken += finalDamage;
        
        createTextParticle(this.x, this.y, `-${finalDamage}`, '#ff6b6b');

        if (this.health <= 0) {
            gameOver();
        }
    }

    heal(amount) {
        const healAmount = Math.min(amount, this.maxHealth - this.health);
        this.health += healAmount;
        if (healAmount > 0) {
            createTextParticle(this.x, this.y, `+${healAmount}`, '#00ff88');
        }
    }

    draw(ctx) {
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

// Enemy Class
class Enemy {
    constructor(x, y, wave) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.ENEMY_SIZE;
        this.speed = 1 + wave * 0.1;
        this.maxHealth = 20 + wave * 5;
        this.health = this.maxHealth;
        this.damage = 5 + wave * 2;
        this.creditValue = 2 + wave;
        this.attackCooldown = 0;
        this.type = Math.random() < 0.7 ? 'normal' : 'fast';
        
        // Walk animation
        this.walkFrame = 0;
        this.walkTimer = 0;
        this.facingRight = true;
        this.prevX = x;
        
        // Color palettes for each type
        const palettes = {
            normal: { body: '#a855f7', head: '#c084fc', limb: '#7c3aed', accent: '#e9d5ff' },
            fast: { body: '#ff6b6b', head: '#fca5a5', limb: '#dc2626', accent: '#fef2f2' },
        };
        
        this.palette = palettes[this.type] || palettes.normal;
        this.color = this.palette.body;
        
        if (this.type === 'fast') {
            this.speed *= 1.5;
            this.health *= 0.7;
        }
    }

    update() {
        this.prevX = this.x;
        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
        
        // Walk animation
        const movedX = this.x - this.prevX;
        if (Math.abs(movedX) > 0.1) {
            this.facingRight = movedX > 0;
            this.walkTimer++;
            if (this.walkTimer >= 12) { this.walkTimer = 0; this.walkFrame = this.walkFrame === 0 ? 1 : 0; }
        } else {
            this.walkTimer = 0;
            this.walkFrame = 0;
        }

        // Attack player if close
        if (dist < this.size + game.player.size) {
            if (this.attackCooldown <= 0) {
                game.player.takeDamage(this.damage);
                this.attackCooldown = 60; // Attack once per second
            }
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
    }

    takeDamage(amount, isCrit = false) {
        this.health -= amount;
        game.stats.damageDealt += amount;
        
        createTextParticle(this.x, this.y, `-${amount}${isCrit ? '!' : ''}`, isCrit ? '#ffd93d' : '#fff');

        if (this.health <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    die() {
        game.stats.enemiesKilled++;
        game.pickups.push(new Pickup(this.x, this.y, this.creditValue));
        createParticles(this.x, this.y, this.color, 15);
    }

    draw(ctx) {
        ctx.save();
        
        const s = this.size;
        const cx = this.x;
        const cy = this.y;
        const cc = this.palette;
        const walkSwing = this.walkFrame === 0 ? 0.25 : -0.25;
        
        // Humanoid proportions
        const headR = s * 0.28;
        const headY = cy - s * 0.5;
        const torsoW = s * 0.4;
        const torsoH = s * 0.45;
        const torsoTop = cy - s * 0.2;
        const armW = s * 0.08;
        const armLen = s * 0.35;
        const legW = s * 0.09;
        const legLen = s * 0.3;
        
        // === LEGS ===
        ctx.fillStyle = cc.limb;
        ctx.save(); ctx.translate(cx - s * 0.1, cy + s * 0.25);
        ctx.rotate(walkSwing); ctx.fillRect(-legW / 2, 0, legW, legLen); ctx.restore();
        ctx.save(); ctx.translate(cx + s * 0.1, cy + s * 0.25);
        ctx.rotate(-walkSwing); ctx.fillRect(-legW / 2, 0, legW, legLen); ctx.restore();
        
        // === TORSO ===
        ctx.fillStyle = cc.body;
        ctx.fillRect(cx - torsoW / 2, torsoTop, torsoW, torsoH);
        
        // === ARMS ===
        ctx.fillStyle = cc.limb;
        ctx.save(); ctx.translate(cx - s * 0.22, cy - s * 0.15);
        ctx.rotate(-0.3 + walkSwing * 0.5); ctx.fillRect(-armW / 2, 0, armW, armLen); ctx.restore();
        ctx.save(); ctx.translate(cx + s * 0.22, cy - s * 0.15);
        ctx.rotate(0.3 - walkSwing * 0.5); ctx.fillRect(-armW / 2, 0, armW, armLen); ctx.restore();
        
        // === HEAD ===
        ctx.fillStyle = cc.head;
        ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fill();
        
        // Type-specific head detail
        if (this.type === 'fast') {
            // Sleek crest
            ctx.fillStyle = cc.head;
            ctx.beginPath();
            ctx.moveTo(cx + headR, headY);
            ctx.lineTo(cx + headR * 1.5, headY - headR * 0.3);
            ctx.lineTo(cx + headR * 0.8, headY - headR * 0.5);
            ctx.closePath(); ctx.fill();
        } else {
            // Antenna nubs
            ctx.fillStyle = cc.accent;
            ctx.beginPath(); ctx.arc(cx - headR * 0.4, headY - headR * 0.9, headR * 0.15, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + headR * 0.4, headY - headR * 0.9, headR * 0.15, 0, Math.PI * 2); ctx.fill();
        }
        
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx - headR * 0.3, headY - headR * 0.1, headR * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + headR * 0.3, headY - headR * 0.1, headR * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx - headR * 0.3, headY - headR * 0.1, headR * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + headR * 0.3, headY - headR * 0.1, headR * 0.1, 0, Math.PI * 2); ctx.fill();
        
        // Health bar
        if (this.health < this.maxHealth) {
            const barWidth = s * 2;
            const barHeight = 4;
            const barY = cy - s - 8;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(cx - barWidth / 2, barY, barWidth, barHeight);
            
            const healthPercent = this.health / this.maxHealth;
            const healthColor = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffd93d' : '#ff6b6b';
            ctx.fillStyle = healthColor;
            ctx.fillRect(cx - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        }
        
        ctx.restore();
    }
}

// Bullet Class
class Bullet {
    constructor(x, y, angle, owner) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = CONFIG.BULLET_SPEED;
        this.size = CONFIG.BULLET_SIZE;
        this.damage = owner.damage;
        this.critChance = owner.critChance;
        this.critDamage = owner.critDamage;
        this.lifeSteal = owner.lifeSteal;
        this.piercing = 1; // Can hit 1 enemy (0 would mean can't hit any)
        this.hitEnemies = [];
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Check collision with enemies
        for (let i = game.enemies.length - 1; i >= 0; i--) {
            const enemy = game.enemies[i];
            
            if (this.hitEnemies.includes(enemy)) continue;
            
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < enemy.size + this.size) {
                const isCrit = Math.random() < this.critChance;
                const finalDamage = Math.floor(this.damage * (isCrit ? this.critDamage : 1));
                
                if (enemy.takeDamage(finalDamage, isCrit)) {
                    game.enemies.splice(i, 1);
                    
                    // Life steal
                    if (this.lifeSteal > 0) {
                        game.player.heal(Math.floor(finalDamage * this.lifeSteal));
                    }
                }
                
                this.hitEnemies.push(enemy);
                
                if (this.hitEnemies.length >= this.piercing) {
                    return false; // Bullet destroyed
                }
            }
        }

        // Check if out of bounds
        if (this.x < 0 || this.x > CONFIG.CANVAS_WIDTH || 
            this.y < 0 || this.y > CONFIG.CANVAS_HEIGHT) {
            return false;
        }

        return true;
    }

    draw(ctx) {
        ctx.fillStyle = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ff88';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// Pickup Class
class Pickup {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PICKUP_SIZE;
        this.value = value;
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    draw(ctx) {
        const bob = Math.sin(Date.now() / 200 + this.bobOffset) * 3;
        
        ctx.save();
        ctx.fillStyle = '#ffd93d';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffd93d';
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Credit symbol
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', this.x, this.y + bob);
        
        ctx.restore();
    }
}

// Particle System
class Particle {
    constructor(x, y, vx, vy, color, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // Gravity
        this.life--;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
        ctx.globalAlpha = 1;
    }
}

class TextParticle {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 60;
        this.maxLife = 60;
        this.vy = -1;
    }

    update() {
        this.y += this.vy;
        this.life--;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 2 + Math.random() * 3;
        game.particles.push(new Particle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed - 2,
            color,
            30 + Math.random() * 20
        ));
    }
}

function createTextParticle(x, y, text, color) {
    game.particles.push(new TextParticle(x, y, text, color));
}

// Shop System
const SHOP_ITEMS = [
    {
        name: '💚 Health Boost',
        description: '+20 Max Health, Full Heal',
        price: 10,
        apply: (player) => {
            player.maxHealth += 20;
            player.health = player.maxHealth;
        }
    },
    {
        name: '⚡ Faster Shots',
        description: 'Increase fire rate by 20%',
        price: 15,
        apply: (player) => {
            player.fireRate = Math.max(5, Math.floor(player.fireRate * 0.8));
        }
    },
    {
        name: '💪 More Damage',
        description: '+5 Damage per shot',
        price: 12,
        apply: (player) => {
            player.damage += 5;
        }
    },
    {
        name: '🎯 Extra Projectile',
        description: 'Shoot one more projectile',
        price: 25,
        apply: (player) => {
            player.projectileCount += 1;
        }
    },
    {
        name: '🏃 Movement Speed',
        description: '+0.5 Movement Speed',
        price: 10,
        apply: (player) => {
            player.speed += 0.5;
        }
    },
    {
        name: '🛡️ Armor Plating',
        description: '+2 Damage Reduction',
        price: 15,
        apply: (player) => {
            player.armor += 2;
        }
    },
    {
        name: '✨ Critical Chance',
        description: '+10% Crit Chance',
        price: 20,
        apply: (player) => {
            player.critChance = Math.min(0.9, player.critChance + 0.1);
        }
    },
    {
        name: '💥 Critical Damage',
        description: '+0.5x Crit Multiplier',
        price: 20,
        apply: (player) => {
            player.critDamage += 0.5;
        }
    },
    {
        name: '🔭 Range Increase',
        description: '+100 Attack Range',
        price: 15,
        apply: (player) => {
            player.range += 100;
        }
    },
    {
        name: '🧲 Pickup Range',
        description: '+30 Pickup Range',
        price: 8,
        apply: (player) => {
            player.pickupRange += 30;
        }
    },
    {
        name: '💉 Life Steal',
        description: '+15% Life Steal',
        price: 25,
        apply: (player) => {
            player.lifeSteal += 0.15;
        }
    },
    {
        name: '🎲 Dodge Chance',
        description: '+10% Dodge Chance',
        price: 20,
        apply: (player) => {
            player.dodge = Math.min(0.7, player.dodge + 0.1);
        }
    },
];

function openShop() {
    game.state = 'shop';
    document.getElementById('shop-modal').classList.remove('hidden');
    document.getElementById('completed-wave').textContent = game.wave - 1;
    
    const shopContainer = document.getElementById('shop-items');
    shopContainer.innerHTML = '';
    
    // Select random items for this shop using Fisher-Yates shuffle
    const shuffled = [...SHOP_ITEMS];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const shopOfferings = shuffled.slice(0, 6);
    
    shopOfferings.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';
        if (game.credits < item.price) {
            itemDiv.classList.add('disabled');
        }
        
        itemDiv.innerHTML = `
            <h4>${item.name}</h4>
            <p>${item.description}</p>
            <p class="price">💰 ${item.price} Credits</p>
        `;
        
        itemDiv.addEventListener('click', () => {
            if (game.credits >= item.price) {
                game.credits -= item.price;
                item.apply(game.player);
                updateUI();
                openShop(); // Refresh shop
            }
        });
        
        shopContainer.appendChild(itemDiv);
    });
}

// Wave System
function spawnWave() {
    const enemyCount = 5 + game.wave * 3;
    
    for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => {
            const side = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(side) {
                case 0: // Top
                    x = Math.random() * CONFIG.CANVAS_WIDTH;
                    y = -50;
                    break;
                case 1: // Right
                    x = CONFIG.CANVAS_WIDTH + 50;
                    y = Math.random() * CONFIG.CANVAS_HEIGHT;
                    break;
                case 2: // Bottom
                    x = Math.random() * CONFIG.CANVAS_WIDTH;
                    y = CONFIG.CANVAS_HEIGHT + 50;
                    break;
                case 3: // Left
                    x = -50;
                    y = Math.random() * CONFIG.CANVAS_HEIGHT;
                    break;
            }
            
            game.enemies.push(new Enemy(x, y, game.wave));
        }, i * 200); // Stagger spawns
    }
}

function nextWave() {
    game.wave++;
    game.timeLeft = CONFIG.WAVE_DURATION;
    game.state = 'playing';
    document.getElementById('shop-modal').classList.add('hidden');
    spawnWave();
}

// Game Over
function gameOver() {
    game.state = 'gameOver';
    document.getElementById('game-over-modal').classList.remove('hidden');
    document.getElementById('final-wave').textContent = game.wave;
    
    const finalStats = document.getElementById('final-stats');
    finalStats.innerHTML = `
        <h3>Mission Statistics</h3>
        <p>🌊 Waves Survived: ${game.wave}</p>
        <p>👾 Enemies Eliminated: ${game.stats.enemiesKilled}</p>
        <p>💥 Total Damage Dealt: ${game.stats.damageDealt}</p>
        <p>❤️ Damage Taken: ${game.stats.damageTaken}</p>
        <p>💰 Credits Earned: ${game.credits}</p>
    `;
    
    const title = document.getElementById('game-over-title');
    if (game.wave >= 10) {
        title.textContent = '🏆 Mission Success! 🏆';
        document.getElementById('game-over-message').textContent = 
            `Amazing! You survived ${game.wave} waves and saved the mission!`;
    } else {
        title.textContent = '💀 Mission Failed 💀';
    }
}

function restartGame() {
    game.wave = 1;
    game.timeLeft = CONFIG.WAVE_DURATION;
    game.credits = 0;
    game.enemies = [];
    game.bullets = [];
    game.pickups = [];
    game.particles = [];
    game.stats = {
        enemiesKilled: 0,
        damageDealt: 0,
        damageTaken: 0,
    };
    game.player = new Player(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
    game.state = 'playing';
    document.getElementById('game-over-modal').classList.add('hidden');
    spawnWave();
}

// UI Update
function updateUI() {
    document.getElementById('wave-number').textContent = game.wave;
    document.getElementById('time-left').textContent = Math.ceil(game.timeLeft);
    document.getElementById('credit-amount').textContent = game.credits;
    
    const healthPercent = (game.player.health / game.player.maxHealth) * 100;
    document.getElementById('health-bar').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = 
        `${Math.ceil(game.player.health)} / ${game.player.maxHealth}`;
}

// Game Loop
let lastTime = 0;
let timer = 0;

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Clear canvas
    game.ctx.fillStyle = '#1a1a2e';
    game.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Draw grid background
    game.ctx.strokeStyle = 'rgba(78, 205, 196, 0.05)';
    game.ctx.lineWidth = 1;
    for (let x = 0; x < CONFIG.CANVAS_WIDTH; x += 50) {
        game.ctx.beginPath();
        game.ctx.moveTo(x, 0);
        game.ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
        game.ctx.stroke();
    }
    for (let y = 0; y < CONFIG.CANVAS_HEIGHT; y += 50) {
        game.ctx.beginPath();
        game.ctx.moveTo(0, y);
        game.ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
        game.ctx.stroke();
    }
    
    if (game.state === 'playing') {
        // Update timer
        timer += deltaTime;
        if (timer >= 1000) {
            timer = 0;
            game.timeLeft--;
            
            if (game.timeLeft <= 0) {
                openShop();
            }
        }
        
        // Update player
        game.player.update();
        
        // Update enemies
        game.enemies.forEach(enemy => enemy.update());
        
        // Update bullets
        game.bullets = game.bullets.filter(bullet => bullet.update());
        
        // Update particles
        game.particles = game.particles.filter(particle => particle.update());
        
        // Draw everything
        game.pickups.forEach(pickup => pickup.draw(game.ctx));
        game.enemies.forEach(enemy => enemy.draw(game.ctx));
        game.bullets.forEach(bullet => bullet.draw(game.ctx));
        game.player.draw(game.ctx);
        game.particles.forEach(particle => particle.draw(game.ctx));
        
        // Draw joystick on mobile
        drawJoystick(game.ctx);
        
        updateUI();
    }
    
    requestAnimationFrame(gameLoop);
}

// Input Handling
window.addEventListener('keydown', (e) => {
    game.keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    game.keys[e.key] = false;
});

// Canvas scaling
let canvasScale = 1;

function resizeCanvas() {
    const canvas = game.canvas;
    const container = document.getElementById('game-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const aspect = containerWidth / containerHeight;
    const isMobile = containerWidth <= 1024 || 'ontouchstart' in window;
    
    if (isMobile) {
        const maxDim = 1200;
        let canvasW, canvasH;
        if (aspect >= 1) {
            canvasW = maxDim;
            canvasH = Math.round(maxDim / aspect);
        } else {
            canvasH = maxDim;
            canvasW = Math.round(maxDim * aspect);
        }
        canvas.width = canvasW;
        canvas.height = canvasH;
        CONFIG.CANVAS_WIDTH = canvasW;
        CONFIG.CANVAS_HEIGHT = canvasH;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.marginLeft = '0';
        canvas.style.marginTop = '0';
        canvasScale = containerWidth / canvasW;
    } else {
        canvas.width = 1200;
        canvas.height = 800;
        CONFIG.CANVAS_WIDTH = 1200;
        CONFIG.CANVAS_HEIGHT = 800;
        const scaleX = containerWidth / 1200;
        const scaleY = containerHeight / 800;
        canvasScale = Math.min(scaleX, scaleY);
        const scaledWidth = 1200 * canvasScale;
        const scaledHeight = 800 * canvasScale;
        canvas.style.width = scaledWidth + 'px';
        canvas.style.height = scaledHeight + 'px';
        canvas.style.marginLeft = ((containerWidth - scaledWidth) / 2) + 'px';
        canvas.style.marginTop = ((containerHeight - scaledHeight) / 2) + 'px';
    }
}

function getTouchPos(touch) {
    const rect = game.canvas.getBoundingClientRect();
    return {
        x: (touch.clientX - rect.left) / canvasScale,
        y: (touch.clientY - rect.top) / canvasScale
    };
}

function setupTouchControls() {
    const canvas = game.canvas;
    let joystickTouchId = null;
    
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const pos = getTouchPos(touch);
            if (!game.joystick.active && pos.y > CONFIG.CANVAS_HEIGHT * 0.3) {
                joystickTouchId = touch.identifier;
                game.joystick.active = true;
                game.joystick.startX = pos.x;
                game.joystick.startY = pos.y;
            }
        }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier !== joystickTouchId || !game.joystick.active) continue;
            const pos = getTouchPos(touch);
            const dx = pos.x - game.joystick.startX;
            const dy = pos.y - game.joystick.startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 60;
            if (dist > 0) {
                const clamp = Math.min(dist, maxDist);
                game.joystick.x = (dx / dist) * (clamp / maxDist);
                game.joystick.y = (dy / dist) * (clamp / maxDist);
            }
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchId) {
                game.joystick.active = false;
                game.joystick.x = 0;
                game.joystick.y = 0;
                joystickTouchId = null;
            }
        }
    }, { passive: false });
    
    canvas.addEventListener('touchcancel', () => {
        game.joystick.active = false;
        game.joystick.x = 0;
        game.joystick.y = 0;
        joystickTouchId = null;
    }, { passive: false });
}

function drawJoystick(ctx) {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isMobile && !game.joystick.active && game.state === 'playing') {
        ctx.save();
        const hintX = 100;
        const hintY = CONFIG.CANVAS_HEIGHT - 120;
        const pulse = Math.sin(Date.now() * 0.003) * 0.08 + 0.15;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(hintX, hintY, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TOUCH TO MOVE', hintX, hintY + 70);
        ctx.restore();
        return;
    }
    
    if (!game.joystick.active) return;
    
    const startX = game.joystick.startX;
    const startY = game.joystick.startY;
    const currentX = startX + game.joystick.x * 60;
    const currentY = startY + game.joystick.y * 60;
    
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#4ecdc4';
    ctx.beginPath();
    ctx.arc(startX, startY, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(startX, startY, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Initialize
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    
    // Setup responsive canvas
    resizeCanvas();
    window.addEventListener('resize', () => resizeCanvas());
    
    game.player = new Player(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
    
    // Setup touch controls
    setupTouchControls();
    
    // Event listeners
    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-modal').classList.add('hidden');
        game.state = 'playing';
        spawnWave();
        requestAnimationFrame(gameLoop);
    });
    
    document.getElementById('next-wave-btn').addEventListener('click', nextWave);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
}

// Start game when page loads
window.addEventListener('load', init);
