// Extended Game - Cosmic Survivor
// This is the main refactored game file with all improvements

// ==================== CONFIGURATION ====================
const CONFIG = {
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 800,
    WAVE_DURATION: 60,
    PLAYER_SIZE: 30,
    ENEMY_SIZE: 25,
    BULLET_SIZE: 5,
    BULLET_SPEED: 8,
    PICKUP_SIZE: 15,
    BOSS_WAVE_INTERVAL: 5,
    // Performance settings
    MAX_PARTICLES: 500,
    PARTICLE_POOL_SIZE: 1000,
    GRID_CELL_SIZE: 100,
    TARGET_FPS: 60,
    // Interactivity settings
    COMBO_TIMEOUT: 3000, // 3 seconds
    POWERUP_DURATION: 8000, // 8 seconds
    SCREEN_SHAKE_INTENSITY: 10,
    POWERUP_DROP_CHANCE: 0.15, // 15% chance for regular enemies
    POWERUP_DROP_CHANCE_BOSS: 0.8, // 80% chance for bosses
};

// Helper function for time conversion
function msToFrames(ms) {
    return ms / (1000 / CONFIG.TARGET_FPS);
}

// Character presets
const CHARACTERS = [
    {
        id: 'balanced',
        name: '⚖️ Balanced',
        description: 'Well-rounded stats',
        maxHealth: 100, speed: 3, damage: 10, fireRate: 30,
    },
    {
        id: 'tank',
        name: '🛡️ Tank',
        description: 'High health, slow',
        maxHealth: 150, speed: 2, damage: 8, fireRate: 40, armor: 5,
    },
    {
        id: 'speedster',
        name: '⚡ Speedster',
        description: 'Fast and agile',
        maxHealth: 75, speed: 5, damage: 7, fireRate: 15, dodge: 0.1,
    },
    {
        id: 'sniper',
        name: '🎯 Sniper',
        description: 'Long range, high crit',
        maxHealth: 80, speed: 2.5, damage: 20, fireRate: 50, critChance: 0.3, critDamage: 2.5, range: 600,
    },
    {
        id: 'gunslinger',
        name: '🔫 Gunslinger',
        description: 'Multi-shot specialist',
        maxHealth: 85, speed: 3.5, damage: 8, fireRate: 20, projectileCount: 3, dodge: 0.05,
    },
    {
        id: 'vampire',
        name: '🧛 Vampire',
        description: 'Life drain on hit',
        maxHealth: 90, speed: 2.8, damage: 12, fireRate: 35, armor: 2, lifeSteal: 0.2,
    },
    {
        id: 'berserker',
        name: '⚔️ Berserker',
        description: 'High damage glass cannon',
        maxHealth: 60, speed: 4, damage: 18, fireRate: 25, critChance: 0.25, critDamage: 2.0, dodge: 0.15,
    },
    {
        id: 'engineer',
        name: '🔧 Engineer',
        description: 'Defensive armor specialist',
        maxHealth: 120, speed: 2.2, damage: 9, fireRate: 38, armor: 8, range: 500, pickupRange: 65,
    },
];

// Weapon types
const WEAPON_TYPES = {
    basic: { name: '🔫 Blaster', fireRate: 1, color: '#00ff88' },
    laser: { name: '⚡ Laser', fireRate: 0.2, damage: 0.3, color: '#ff00ff', continuous: true },
    rocket: { name: '🚀 Rocket', fireRate: 2, damage: 3, color: '#ff6b6b', explosion: 80 },
    spread: { name: '🌟 Spread', fireRate: 1.3, projectiles: 5, color: '#ffd93d' },
};

// Enemy types with behaviors
const ENEMY_TYPES = {
    normal: { color: '#a855f7', speed: 1, health: 1, damage: 1, credits: 1 },
    fast: { color: '#ff6b6b', speed: 1.5, health: 0.7, damage: 0.8, credits: 1.2 },
    tank: { color: '#10b981', speed: 0.6, health: 2.5, damage: 1.5, credits: 2 },
    swarm: { color: '#f59e0b', speed: 1.2, health: 0.4, damage: 0.5, credits: 0.5, size: 0.6 },
    teleporter: { color: '#8b5cf6', speed: 0.8, health: 1, damage: 1.2, credits: 1.5, canTeleport: true },
    shooter: { color: '#ec4899', speed: 0.5, health: 0.8, damage: 1, credits: 1.8, ranged: true },
};

// Boss types
const BOSS_TYPES = {
    destroyer: { name: '👹 Destroyer', color: '#dc2626', size: 2.4, health: 15, damage: 3, credits: 100 },
    broodmother: { name: '🕷️ Brood Mother', color: '#7c2d12', size: 2.8, health: 12, damage: 2, credits: 120, summons: true },
    voidwalker: { name: '👻 Void Walker', color: '#581c87', size: 2.2, health: 10, damage: 2.5, credits: 150, teleports: true },
};

// Powerup types
const POWERUP_TYPES = {
    speed: { name: '⚡ Speed Boost', color: '#ffd93d', effect: 'speed', multiplier: 1.5 },
    damage: { name: '💪 Damage Boost', color: '#ff6b6b', effect: 'damage', multiplier: 2 },
    shield: { name: '🛡️ Shield', color: '#4ecdc4', effect: 'shield', value: 50 },
    multishot: { name: '🔫 Multi-Shot', color: '#a855f7', effect: 'multishot', value: 2 },
};

// ==================== OBJECT POOLING ====================
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 100) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }
    
    get() {
        const obj = this.pool.pop() || this.createFn();
        this.active.push(obj);
        return obj;
    }
    
    release(obj) {
        const index = this.active.indexOf(obj);
        if (index > -1) {
            this.active.splice(index, 1);
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }
    
    releaseAll() {
        while (this.active.length > 0) {
            this.release(this.active[0]);
        }
    }
}

// ==================== GAME STATE ====================
const game = {
    canvas: null,
    ctx: null,
    state: 'characterSelect',
    wave: 1,
    timeLeft: CONFIG.WAVE_DURATION,
    credits: 0,
    player: null,
    selectedCharacter: null,
    enemies: [],
    bullets: [],
    pickups: [],
    particles: [],
    stars: [],
    keys: {},
    touchActive: false,
    joystick: { x: 0, y: 0, active: false, startX: 0, startY: 0 },
    currentWeapon: 'basic',
    camera: { shake: 0, offsetX: 0, offsetY: 0 },
    paused: false,
    powerups: [],
    activePowerups: [],
    notifications: [],
    fps: 60,
    frameCount: 0,
    lastFpsUpdate: 0,
    stats: {
        enemiesKilled: 0,
        damageDealt: 0,
        damageTaken: 0,
        bossesDefeated: 0,
        waveStartDamage: 0,
        comboKills: 0,
        comboTimer: 0,
    },
    persistentStats: loadPersistentStats(),
    achievements: loadAchievements(),
    highScores: loadHighScores(),
    soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
};

function loadPersistentStats() {
    const defaults = { totalKills: 0, totalCredits: 0, maxWave: 0, upgradesPurchased: 0, weaponsUnlocked: 1 };
    const saved = localStorage.getItem('cosmicSurvivor_stats');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
}

function savePersistentStats() {
    localStorage.setItem('cosmicSurvivor_stats', JSON.stringify(game.persistentStats));
}

function loadAchievements() {
    const saved = localStorage.getItem('cosmicSurvivor_achievements');
    return saved ? JSON.parse(saved) : [];
}

function saveAchievements() {
    localStorage.setItem('cosmicSurvivor_achievements', JSON.stringify(game.achievements));
}

function loadHighScores() {
    const saved = localStorage.getItem('cosmicSurvivor_highScores');
    return saved ? JSON.parse(saved) : [];
}

function saveHighScores() {
    localStorage.setItem('cosmicSurvivor_highScores', JSON.stringify(game.highScores));
}

// ==================== SOUND SYSTEM ====================
const Sound = {
    audioContext: null,
    
    getContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    },
    
    play(type) {
        if (!game.soundEnabled) return;
        const ctx = this.getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const sounds = {
            shoot: { freq: 800, type: 'square', duration: 0.1, volume: 0.1 },
            hit: { freq: 200, type: 'sawtooth', duration: 0.15, volume: 0.15 },
            death: { freq: [400, 100], type: 'triangle', duration: 0.3, volume: 0.2 },
            pickup: { freq: [500, 1000], type: 'sine', duration: 0.1, volume: 0.1 },
            powerup: { freq: [300, 800, 1200], type: 'sine', duration: 0.3, volume: 0.2 },
            waveComplete: { freq: [400, 500, 600, 800], type: 'sine', duration: 0.15, volume: 0.2 },
            boss: { freq: [100, 50], type: 'sawtooth', duration: 0.5, volume: 0.3 },
            gameOver: { freq: [300, 50], type: 'sawtooth', duration: 1, volume: 0.3 },
            combo: { freq: [600, 800, 1000], type: 'sine', duration: 0.2, volume: 0.15 },
            crit: { freq: [1200, 1500], type: 'square', duration: 0.15, volume: 0.12 },
            levelUp: { freq: [400, 600, 800, 1000], type: 'sine', duration: 0.25, volume: 0.2 },
        };
        
        const sound = sounds[type];
        if (!sound) return;
        
        if (Array.isArray(sound.freq)) {
            sound.freq.forEach((freq, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g);
                g.connect(ctx.destination);
                o.type = sound.type;
                o.frequency.value = freq;
                const start = ctx.currentTime + i * (sound.duration / sound.freq.length);
                g.gain.setValueAtTime(sound.volume, start);
                g.gain.exponentialRampToValueAtTime(0.01, start + sound.duration / sound.freq.length);
                o.start(start);
                o.stop(start + sound.duration / sound.freq.length);
            });
        } else {
            osc.type = sound.type;
            osc.frequency.value = sound.freq;
            gain.gain.setValueAtTime(sound.volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + sound.duration);
            osc.start();
            osc.stop(ctx.currentTime + sound.duration);
        }
    },
    toggle() {
        game.soundEnabled = !game.soundEnabled;
        localStorage.setItem('soundEnabled', game.soundEnabled);
        return game.soundEnabled;
    },
};

// ==================== ACHIEVEMENT SYSTEM ====================
const ACHIEVEMENTS = [
    { id: 'first_blood', name: '🎯 First Blood', desc: 'Defeat first enemy', check: () => game.persistentStats.totalKills >= 1 },
    { id: 'wave_5', name: '🌊 Wave Warrior', desc: 'Reach wave 5', check: () => game.persistentStats.maxWave >= 5 },
    { id: 'wave_10', name: '🏆 Wave Master', desc: 'Reach wave 10', check: () => game.persistentStats.maxWave >= 10 },
    { id: 'wave_20', name: '👑 Legend', desc: 'Reach wave 20', check: () => game.persistentStats.maxWave >= 20 },
    { id: 'slayer', name: '💀 Slayer', desc: 'Defeat 100 enemies', check: () => game.persistentStats.totalKills >= 100 },
    { id: 'exterminator', name: '☠️ Exterminator', desc: 'Defeat 500 enemies', check: () => game.persistentStats.totalKills >= 500 },
    { id: 'boss_killer', name: '👹 Boss Killer', desc: 'Defeat first boss', check: () => game.stats.bossesDefeated >= 1 },
    { id: 'rich', name: '💰 Wealthy', desc: 'Collect 1000 credits', check: () => game.persistentStats.totalCredits >= 1000 },
    { id: 'weapon_master', name: '🔫 Weapon Master', desc: 'Use all weapons', check: () => game.persistentStats.weaponsUnlocked >= 4 },
    { id: 'big_spender', name: '🛒 Big Spender', desc: 'Buy 50 upgrades', check: () => game.persistentStats.upgradesPurchased >= 50 },
];

function checkAchievements() {
    const newUnlocks = [];
    ACHIEVEMENTS.forEach(ach => {
        if (!game.achievements.includes(ach.id) && ach.check()) {
            game.achievements.push(ach.id);
            newUnlocks.push(ach);
        }
    });
    if (newUnlocks.length > 0) {
        saveAchievements();
        newUnlocks.forEach(ach => showNotification(`${ach.name} Unlocked!`));
    }
}

// ==================== VISUAL FEEDBACK HELPERS ====================
function screenShake(intensity = CONFIG.SCREEN_SHAKE_INTENSITY) {
    game.camera.shake = Math.max(game.camera.shake, intensity);
}

function updateCamera() {
    if (game.camera.shake > 0) {
        game.camera.offsetX = (Math.random() - 0.5) * game.camera.shake;
        game.camera.offsetY = (Math.random() - 0.5) * game.camera.shake;
        game.camera.shake *= 0.9;
        if (game.camera.shake < 0.1) {
            game.camera.shake = 0;
            game.camera.offsetX = 0;
            game.camera.offsetY = 0;
        }
    }
}

function showNotification(text, color = '#ffd93d', duration = 2000) {
    game.notifications.push({
        text,
        color,
        life: msToFrames(duration),
        maxLife: msToFrames(duration),
        y: 100,
    });
}

function updateNotifications() {
    game.notifications = game.notifications.filter(n => {
        n.life--;
        return n.life > 0;
    });
}

function drawNotifications(ctx) {
    game.notifications.forEach((n, i) => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, n.life / 30);
        ctx.fillStyle = n.color;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 10;
        ctx.fillText(n.text, CONFIG.CANVAS_WIDTH / 2, n.y + i * 40);
        ctx.restore();
    });
}

// ==================== POWERUP SYSTEM ====================
class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PICKUP_SIZE * 1.5;
        this.type = type;
        this.data = POWERUP_TYPES[type];
        this.life = 600; // 10 seconds at 60 FPS
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    update() {
        this.life--;
        return this.life > 0;
    }

    draw(ctx) {
        const bob = Math.sin(Date.now() * 0.005 + this.bobOffset) * 5;
        
        ctx.save();
        ctx.globalAlpha = this.life < 120 ? 0.5 + Math.sin(Date.now() * 0.02) * 0.5 : 1;
        
        // Glow effect
        ctx.shadowColor = this.data.color;
        ctx.shadowBlur = 15;
        
        // Icon
        ctx.fillStyle = this.data.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner circle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

function spawnPowerup(x, y) {
    // Chance to spawn a powerup based on CONFIG
    if (Math.random() > CONFIG.POWERUP_DROP_CHANCE) return;
    
    const types = Object.keys(POWERUP_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    game.powerups.push(new Powerup(x, y, type));
}

function collectPowerups() {
    game.powerups = game.powerups.filter(p => {
        if (!p.update()) return false;
        
        const dist = Math.hypot(game.player.x - p.x, game.player.y - p.y);
        if (dist < game.player.pickupRange + p.size) {
            activatePowerup(p.type);
            Sound.play('powerup');
            showNotification(`${p.data.name} Activated!`, p.data.color);
            createExplosion(p.x, p.y, p.data.color, 20);
            return false;
        }
        return true;
    });
}

function activatePowerup(type) {
    const data = POWERUP_TYPES[type];
    game.activePowerups.push({
        type,
        data,
        timeLeft: msToFrames(CONFIG.POWERUP_DURATION),
        maxTime: msToFrames(CONFIG.POWERUP_DURATION),
    });
}

function updatePowerups() {
    game.activePowerups = game.activePowerups.filter(p => {
        p.timeLeft--;
        if (p.timeLeft <= 0) {
            showNotification(`${p.data.name} Expired`, '#888', 1000);
            return false;
        }
        return true;
    });
}

function getPowerupMultiplier(stat) {
    let multiplier = 1;
    game.activePowerups.forEach(p => {
        if (p.data.effect === stat) {
            multiplier *= p.data.multiplier || 1;
        }
    });
    return multiplier;
}

function hasPowerup(effect) {
    return game.activePowerups.some(p => p.data.effect === effect);
}

// ==================== PLAYER CLASS ====================
class Player {
    constructor(character) {
        this.x = CONFIG.CANVAS_WIDTH / 2;
        this.y = CONFIG.CANVAS_HEIGHT / 2;
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
    }

    update() {
        // Apply powerup modifiers
        const speedMult = getPowerupMultiplier('speed');
        const currentSpeed = this.speed * speedMult;
        
        // Movement
        let dx = 0, dy = 0;
        
        // Keyboard
        if (game.keys['w'] || game.keys['ArrowUp']) dy -= 1;
        if (game.keys['s'] || game.keys['ArrowDown']) dy += 1;
        if (game.keys['a'] || game.keys['ArrowLeft']) dx -= 1;
        if (game.keys['d'] || game.keys['ArrowRight']) dx += 1;
        
        // Touch
        if (game.joystick.active) {
            dx += game.joystick.x;
            dy += game.joystick.y;
        }

        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        this.x += dx * currentSpeed;
        this.y += dy * currentSpeed;
        this.x = Math.max(this.size, Math.min(CONFIG.CANVAS_WIDTH - this.size, this.x));
        this.y = Math.max(this.size, Math.min(CONFIG.CANVAS_HEIGHT - this.size, this.y));

        if (this.fireCooldown > 0) {
            this.fireCooldown--;
        } else {
            this.shoot();
        }

        this.collectPickups();
    }

    shoot() {
        // Apply multishot powerup
        let projectiles = this.projectileCount;
        if (hasPowerup('multishot')) {
            const powerup = game.activePowerups.find(p => p.data.effect === 'multishot');
            projectiles += powerup.data.value;
        }
        
        const nearest = game.enemies
            .filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= this.range)
            .sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))
            .slice(0, projectiles);
        
        if (nearest.length > 0) {
            const weapon = WEAPON_TYPES[game.currentWeapon];
            nearest.forEach(enemy => {
                const angle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
                
                if (game.currentWeapon === 'spread') {
                    for (let i = 0; i < 5; i++) {
                        const spreadAngle = angle + (i - 2) * 0.15;
                        game.bullets.push(new Bullet(this.x, this.y, spreadAngle, this, weapon));
                    }
                } else {
                    game.bullets.push(new Bullet(this.x, this.y, angle, this, weapon));
                }
            });
            this.fireCooldown = this.fireRate * (weapon.fireRate || 1);
            Sound.play('shoot');
        }
    }

    collectPickups() {
        game.pickups = game.pickups.filter(p => {
            const dist = Math.hypot(p.x - this.x, p.y - this.y);
            if (dist <= this.pickupRange) {
                game.credits += p.value;
                game.persistentStats.totalCredits += p.value;
                createParticles(p.x, p.y, '#ffd93d', 5);
                Sound.play('pickup');
                return false;
            }
            return true;
        });
    }

    takeDamage(amount) {
        // Shield powerup protection
        if (hasPowerup('shield')) {
            const shield = game.activePowerups.find(p => p.data.effect === 'shield');
            if (shield.data.value > 0) {
                const absorbed = Math.min(amount, shield.data.value);
                shield.data.value -= absorbed;
                amount -= absorbed;
                createTextParticle(this.x, this.y, 'SHIELD!', '#4ecdc4', 18);
                if (shield.data.value <= 0) {
                    game.activePowerups = game.activePowerups.filter(p => p !== shield);
                    showNotification('Shield Broken!', '#ff6b6b', 1000);
                }
                if (amount <= 0) return;
            }
        }
        
        if (Math.random() < this.dodge) {
            createTextParticle(this.x, this.y, 'DODGE!', '#4ecdc4', 18);
            createParticles(this.x, this.y, '#4ecdc4', 8);
            return;
        }
        const finalDamage = Math.max(1, amount - this.armor);
        this.health -= finalDamage;
        game.stats.damageTaken += finalDamage;
        
        // Enhanced damage feedback
        createTextParticle(this.x, this.y, `-${finalDamage}`, '#ff6b6b', 18);
        createParticles(this.x, this.y, '#ff6b6b', 5);
        screenShake(finalDamage * 0.5);
        
        Sound.play('hit');
        if (this.health <= 0) gameOver();
    }

    heal(amount) {
        const heal = Math.min(amount, this.maxHealth - this.health);
        this.health += heal;
        if (heal > 0) {
            createTextParticle(this.x, this.y, `+${heal}`, '#00ff88', 18);
            createParticles(this.x, this.y, '#00ff88', 8);
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Different visuals for each character
        switch(this.characterId) {
            case 'balanced':
                // Balanced: Classic astronaut with cyan helmet
                ctx.fillStyle = '#4ecdc4';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a1a2e';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(78, 205, 196, 0.5)';
                ctx.beginPath();
                ctx.arc(this.x - this.size * 0.2, this.y - this.size * 0.2, this.size * 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#00ff88';
                ctx.fillRect(this.x - this.size * 0.4, this.y + this.size * 0.3, this.size * 0.8, this.size * 0.6);
                break;
                
            case 'tank':
                // Tank: Heavy armor plating with shield emblem
                ctx.fillStyle = '#64748b';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#334155';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
                ctx.fill();
                // Shield emblem
                ctx.fillStyle = '#94a3b8';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - this.size * 0.4);
                ctx.lineTo(this.x - this.size * 0.3, this.y);
                ctx.lineTo(this.x, this.y + this.size * 0.5);
                ctx.lineTo(this.x + this.size * 0.3, this.y);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'speedster':
                // Speedster: Sleek design with lightning pattern
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a1a2e';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
                ctx.fill();
                // Lightning bolt
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - this.size * 0.5);
                ctx.lineTo(this.x - this.size * 0.2, this.y);
                ctx.lineTo(this.x + this.size * 0.1, this.y);
                ctx.lineTo(this.x, this.y + this.size * 0.5);
                ctx.lineTo(this.x + this.size * 0.2, this.y - this.size * 0.1);
                ctx.lineTo(this.x - this.size * 0.1, this.y - this.size * 0.1);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'sniper':
                // Sniper: Scope/targeting reticle design
                ctx.fillStyle = '#22c55e';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.65, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a1a2e';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.45, 0, Math.PI * 2);
                ctx.fill();
                // Crosshair
                ctx.strokeStyle = '#86efac';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x - this.size * 0.6, this.y);
                ctx.lineTo(this.x + this.size * 0.6, this.y);
                ctx.moveTo(this.x, this.y - this.size * 0.6);
                ctx.lineTo(this.x, this.y + this.size * 0.6);
                ctx.stroke();
                break;
                
            case 'gunslinger':
                // Gunslinger: Dual-wielding with bullets
                ctx.fillStyle = '#f97316';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a1a2e';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                // Bullets
                ctx.fillStyle = '#fdba74';
                for (let i = 0; i < 3; i++) {
                    const angle = (i - 1) * 0.4;
                    const dx = Math.cos(angle) * this.size * 0.5;
                    const dy = Math.sin(angle) * this.size * 0.5;
                    ctx.fillRect(this.x + dx - 2, this.y + dy - 4, 4, 8);
                }
                break;
                
            case 'vampire':
                // Vampire: Dark with blood-red accents
                ctx.fillStyle = '#7c2d12';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a1a2e';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                // Fangs
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.moveTo(this.x - this.size * 0.2, this.y + this.size * 0.2);
                ctx.lineTo(this.x - this.size * 0.1, this.y + this.size * 0.4);
                ctx.lineTo(this.x, this.y + this.size * 0.2);
                ctx.lineTo(this.x + this.size * 0.1, this.y + this.size * 0.4);
                ctx.lineTo(this.x + this.size * 0.2, this.y + this.size * 0.2);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'berserker':
                // Berserker: Aggressive spiky design
                ctx.fillStyle = '#dc2626';
                // Spiky circle
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const radius = i % 2 === 0 ? this.size * 0.8 : this.size * 0.5;
                    const x = this.x + Math.cos(angle) * radius;
                    const y = this.y + Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#1a1a2e';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'engineer':
                // Engineer: Mechanical/gear design
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a1a2e';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                // Gear teeth
                ctx.fillStyle = '#60a5fa';
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const x = this.x + Math.cos(angle) * this.size * 0.6;
                    const y = this.y + Math.sin(angle) * this.size * 0.6;
                    ctx.fillRect(x - 3, y - 3, 6, 6);
                }
                break;
                
            default:
                // Fallback to balanced design
                ctx.fillStyle = '#4ecdc4';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a1a2e';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
        }
        
        ctx.restore();
    }
}

// ==================== ENEMY CLASS ====================
class Enemy {
    constructor(x, y, wave, type, isBoss = false) {
        this.x = x;
        this.y = y;
        this.wave = wave;
        this.isBoss = isBoss;
        
        if (isBoss) {
            const bossType = BOSS_TYPES[type] || BOSS_TYPES.destroyer;
            this.type = type;
            this.size = CONFIG.ENEMY_SIZE * bossType.size;
            this.speed = (0.5 + wave * 0.05) * 0.4;
            this.maxHealth = (20 + wave * 5) * bossType.health;
            this.health = this.maxHealth;
            this.damage = (5 + wave * 2) * bossType.damage;
            this.creditValue = bossType.credits;
            this.color = bossType.color;
            this.name = bossType.name;
            this.canSummon = bossType.summons;
            this.canTeleport = bossType.teleports;
            this.summonCooldown = 0;
            this.teleportCooldown = 0;
        } else {
            const enemyType = ENEMY_TYPES[type] || ENEMY_TYPES.normal;
            this.type = type;
            this.size = CONFIG.ENEMY_SIZE * (enemyType.size || 1);
            this.speed = (1 + wave * 0.1) * enemyType.speed;
            this.maxHealth = (20 + wave * 5) * enemyType.health;
            this.health = this.maxHealth;
            this.damage = (5 + wave * 2) * enemyType.damage;
            this.creditValue = Math.floor((2 + wave) * enemyType.credits);
            this.color = enemyType.color;
            this.canTeleport = enemyType.canTeleport;
            this.isRanged = enemyType.ranged;
            this.teleportCooldown = 0;
            this.shootCooldown = 0;
        }
        
        this.attackCooldown = 0;
    }

    update() {
        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const dist = Math.hypot(dx, dy);

        // Boss abilities
        if (this.isBoss) {
            if (this.canSummon && this.summonCooldown <= 0 && game.enemies.length < 30) {
                this.summonMinions();
                this.summonCooldown = 300;
            }
            if (this.canTeleport && this.teleportCooldown <= 0 && dist > 200) {
                this.teleport();
                this.teleportCooldown = 240;
            }
            if (this.summonCooldown > 0) this.summonCooldown--;
            if (this.teleportCooldown > 0) this.teleportCooldown--;
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

        if (this.teleportCooldown > 0) this.teleportCooldown--;
        if (this.shootCooldown > 0) this.shootCooldown--;

        // Move toward player
        if (dist > (this.isRanged ? 200 : 0)) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }

        // Attack player
        if (dist < this.size + game.player.size && this.attackCooldown <= 0) {
            game.player.takeDamage(this.damage);
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
        this.x = Math.max(50, Math.min(CONFIG.CANVAS_WIDTH - 50, this.x));
        this.y = Math.max(50, Math.min(CONFIG.CANVAS_HEIGHT - 50, this.y));
        createParticles(this.x, this.y, this.color, 15);
    }

    shootAtPlayer() {
        const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
        game.bullets.push({
            x: this.x,
            y: this.y,
            angle,
            speed: 4,
            size: 8,
            damage: this.damage * 0.5,
            color: this.color,
            isEnemyBullet: true,
        });
    }

    takeDamage(amount, isCrit = false) {
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
        
        if (this.isBoss) {
            game.stats.bossesDefeated++;
            showNotification(`${this.name} Defeated!`, '#ffd93d');
            screenShake(20);
            createExplosion(this.x, this.y, this.color, 60);
        } else {
            screenShake(3);
            createExplosion(this.x, this.y, this.color, 20);
        }
        
        // Chance to spawn powerup (higher for bosses)
        const powerupChance = this.isBoss ? CONFIG.POWERUP_DROP_CHANCE_BOSS : CONFIG.POWERUP_DROP_CHANCE;
        if (Math.random() < powerupChance) {
            spawnPowerup(this.x, this.y);
        }
        
        game.pickups.push(new Pickup(this.x, this.y, this.creditValue));
        Sound.play('death');
        checkAchievements();
    }

    draw(ctx) {
        ctx.save();
        
        const typeData = ENEMY_TYPES[this.type] || ENEMY_TYPES.normal;
        
        if (this.isBoss) {
            // Boss design - large and imposing
            const bossType = BOSS_TYPES[this.type] || BOSS_TYPES.destroyer;
            
            // Main body
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Boss-specific features
            if (this.type === 'destroyer' || this.type === 'normal') {
                // Horns for destroyer
                ctx.fillStyle = '#991b1b';
                ctx.beginPath();
                ctx.moveTo(this.x - this.size * 0.8, this.y - this.size * 0.5);
                ctx.lineTo(this.x - this.size * 0.5, this.y - this.size);
                ctx.lineTo(this.x - this.size * 0.3, this.y - this.size * 0.5);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(this.x + this.size * 0.8, this.y - this.size * 0.5);
                ctx.lineTo(this.x + this.size * 0.5, this.y - this.size);
                ctx.lineTo(this.x + this.size * 0.3, this.y - this.size * 0.5);
                ctx.fill();
            } else if (this.type === 'broodmother') {
                // Spider-like legs
                ctx.strokeStyle = '#92400e';
                ctx.lineWidth = 4;
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(this.x + Math.cos(angle) * this.size * 1.5, this.y + Math.sin(angle) * this.size * 1.5);
                    ctx.stroke();
                }
            } else if (this.type === 'voidwalker') {
                // Ethereal wispy tentacles
                ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
                ctx.lineWidth = 3;
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + Date.now() * 0.001;
                    const wave = Math.sin(Date.now() * 0.003 + i) * 20;
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.quadraticCurveTo(
                        this.x + Math.cos(angle) * this.size,
                        this.y + Math.sin(angle) * this.size + wave,
                        this.x + Math.cos(angle) * this.size * 1.3,
                        this.y + Math.sin(angle) * this.size * 1.3
                    );
                    ctx.stroke();
                }
            }
            
            // Boss border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // Regular enemy designs - unique for each type
            switch(this.type) {
                case 'normal':
                    // Classic alien blob with tentacles
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    // Small tentacles
                    ctx.fillStyle = '#9333ea';
                    for (let i = 0; i < 4; i++) {
                        const angle = (i / 4) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.arc(
                            this.x + Math.cos(angle) * this.size * 0.8,
                            this.y + Math.sin(angle) * this.size * 0.8,
                            this.size * 0.3,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();
                    }
                    break;
                    
                case 'fast':
                    // Sleek predator design
                    ctx.fillStyle = this.color;
                    // Elongated oval body
                    ctx.beginPath();
                    ctx.ellipse(this.x, this.y, this.size * 1.2, this.size * 0.7, Math.PI / 4, 0, Math.PI * 2);
                    ctx.fill();
                    // Spikes
                    ctx.fillStyle = '#dc2626';
                    for (let i = 0; i < 3; i++) {
                        const angle = Math.PI / 4 + (i - 1) * 0.3;
                        ctx.beginPath();
                        ctx.moveTo(this.x + Math.cos(angle) * this.size * 0.5, this.y + Math.sin(angle) * this.size * 0.5);
                        ctx.lineTo(this.x + Math.cos(angle) * this.size * 1.5, this.y + Math.sin(angle) * this.size * 1.5);
                        ctx.lineTo(this.x + Math.cos(angle + 0.3) * this.size * 0.5, this.y + Math.sin(angle + 0.3) * this.size * 0.5);
                        ctx.fill();
                    }
                    break;
                    
                case 'tank':
                    // Armored beetle design
                    ctx.fillStyle = this.color;
                    // Shell segments
                    for (let i = 0; i < 3; i++) {
                        ctx.beginPath();
                        ctx.arc(
                            this.x,
                            this.y - this.size * 0.4 + i * this.size * 0.4,
                            this.size * 0.8,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();
                    }
                    // Armor plating
                    ctx.strokeStyle = '#065f46';
                    ctx.lineWidth = 2;
                    for (let i = 0; i < 4; i++) {
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.size * (0.9 - i * 0.2), 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    break;
                    
                case 'swarm':
                    // Small insect-like creature
                    ctx.fillStyle = this.color;
                    // Body
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
                    ctx.fill();
                    // Wings
                    ctx.fillStyle = 'rgba(251, 191, 36, 0.5)';
                    ctx.beginPath();
                    ctx.ellipse(this.x - this.size * 0.5, this.y, this.size * 0.6, this.size * 0.3, -Math.PI / 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(this.x + this.size * 0.5, this.y, this.size * 0.6, this.size * 0.3, Math.PI / 6, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'teleporter':
                    // Mystical orb with energy rings
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    // Energy rings
                    const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;
                    ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
                    ctx.lineWidth = 2;
                    for (let i = 0; i < 3; i++) {
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.size * (1.2 + i * 0.3) * pulse, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    break;
                    
                case 'shooter':
                    // Ranged attacker with cannon
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    // Cannon barrels
                    const angle = game.player ? Math.atan2(game.player.y - this.y, game.player.x - this.x) : 0;
                    ctx.fillStyle = '#9f1239';
                    for (let i = -1; i <= 1; i += 2) {
                        ctx.save();
                        ctx.translate(this.x, this.y);
                        ctx.rotate(angle);
                        ctx.fillRect(this.size * 0.5, this.size * 0.2 * i, this.size * 0.8, this.size * 0.15);
                        ctx.restore();
                    }
                    break;
                    
                default:
                    // Fallback blob
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
            }
        }
        
        // Eyes for all enemies
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.2, this.size * 0.2, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 0.3, this.y - this.size * 0.2, this.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.2, this.size * 0.1, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 0.3, this.y - this.size * 0.2, this.size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        
        // Health bar
        if (this.health < this.maxHealth) {
            const barWidth = this.size * 1.5;
            const barX = this.x - barWidth / 2;
            const barY = this.y - this.size - 10;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(barX, barY, barWidth, 4);
            ctx.fillStyle = this.isBoss ? '#ffd93d' : '#ff6b6b';
            ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), 4);
        }
        
        ctx.restore();
    }
}

// ==================== BULLET CLASS ====================
class Bullet {
    constructor(x, y, angle, owner, weapon) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = CONFIG.BULLET_SPEED;
        this.size = CONFIG.BULLET_SIZE;
        this.damage = owner.damage * (weapon.damage || 1);
        this.critChance = owner.critChance;
        this.critDamage = owner.critDamage;
        this.lifeSteal = owner.lifeSteal;
        this.color = weapon.color;
        this.explosion = weapon.explosion;
        this.piercing = 1;
        this.hitEnemies = [];
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        for (let i = game.enemies.length - 1; i >= 0; i--) {
            const enemy = game.enemies[i];
            if (this.hitEnemies.includes(enemy)) continue;
            
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < enemy.size + this.size) {
                // Apply damage powerup
                const damageMult = getPowerupMultiplier('damage');
                const isCrit = Math.random() < this.critChance;
                const finalDamage = Math.floor(this.damage * damageMult * (isCrit ? this.critDamage : 1));
                
                if (this.explosion) {
                    this.explode();
                    return false;
                }
                
                if (enemy.takeDamage(finalDamage, isCrit)) {
                    game.enemies.splice(i, 1);
                    if (this.lifeSteal > 0) {
                        game.player.heal(Math.floor(finalDamage * this.lifeSteal));
                    }
                }
                
                // Visual feedback for crits
                if (isCrit) {
                    createExplosion(enemy.x, enemy.y, '#ffd93d', 10);
                    Sound.play('crit');
                }
                
                this.hitEnemies.push(enemy);
                if (this.hitEnemies.length >= this.piercing) return false;
            }
        }

        return this.x >= 0 && this.x <= CONFIG.CANVAS_WIDTH && 
               this.y >= 0 && this.y <= CONFIG.CANVAS_HEIGHT;
    }

    explode() {
        game.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < this.explosion) {
                const finalDamage = Math.floor(this.damage * (1 - dist / this.explosion));
                if (enemy.takeDamage(finalDamage)) {
                    game.enemies = game.enemies.filter(e => e !== enemy);
                }
            }
        });
        createParticles(this.x, this.y, this.color, 20);
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ==================== PICKUP & PARTICLES ====================
class Pickup {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PICKUP_SIZE;
        this.value = value;
        this.bob = Math.random() * Math.PI * 2;
    }

    draw(ctx) {
        const bob = Math.sin(Date.now() / 200 + this.bob) * 3;
        ctx.save();
        ctx.fillStyle = '#ffd93d';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffd93d';
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', this.x, this.y + bob);
        ctx.restore();
    }
}

// ==================== VISUAL EFFECTS ====================
// Enhanced particle system
function createParticles(x, y, color, count) {
    // Limit total particles for performance
    if (game.particles.length > CONFIG.MAX_PARTICLES) return;
    
    count = Math.min(count, CONFIG.MAX_PARTICLES - game.particles.length);
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        const speed = 2 + Math.random() * 4;
        game.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            color,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            size: 2 + Math.random() * 2,
            type: 'particle',
        });
    }
}

// Create explosion effect
function createExplosion(x, y, color, count = 30) {
    // Limit total particles for performance
    if (game.particles.length > CONFIG.MAX_PARTICLES) return;
    
    count = Math.min(count, CONFIG.MAX_PARTICLES - game.particles.length);
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 3 + Math.random() * 5;
        game.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color,
            life: 40 + Math.random() * 20,
            maxLife: 60,
            size: 3 + Math.random() * 3,
            type: 'explosion',
        });
    }
}

function createTextParticle(x, y, text, color, size = 16) {
    game.particles.push({ 
        x, y, text, color, 
        life: 60, maxLife: 60, 
        vy: -1.5, 
        scale: 1, 
        fontSize: size,
        type: 'text' 
    });
}

function updateParticles() {
    // Update combo timer
    if (game.stats.comboTimer > 0) {
        game.stats.comboTimer--;
        if (game.stats.comboTimer === 0) {
            game.stats.comboKills = 0;
        }
    }

    game.particles = game.particles.filter(p => {
        if (p.type === 'text') {
            p.y += p.vy;
            p.vy *= 0.95; // Slow down
            p.scale = 1 + (1 - p.life / p.maxLife) * 0.3; // Pop effect
            p.life--;
            return p.life > 0;
        } else if (p.type === 'explosion') {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life--;
            return p.life > 0;
        } else {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life--;
            return p.life > 0;
        }
    });
}

function drawParticles(ctx) {
    game.particles.forEach(p => {
        if (p.type === 'text') {
            ctx.save();
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.font = `bold ${p.fontSize * p.scale}px monospace`;
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.strokeText(p.text, p.x, p.y);
            ctx.fillText(p.text, p.x, p.y);
            
            // Add glow effect for critical hits
            if (p.text.includes('!') || p.fontSize > 16) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10 * (p.life / p.maxLife);
                ctx.fillText(p.text, p.x, p.y);
            }
            ctx.restore();
        } else if (p.type === 'explosion') {
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else {
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 3;
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
            ctx.restore();
        }
    });
    
    // Draw combo counter
    if (game.stats.comboKills > 1 && game.state === 'playing') {
        ctx.save();
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'right';
        const alpha = Math.min(game.stats.comboTimer / 60, 1);
        ctx.globalAlpha = alpha;
        
        const comboColor = game.stats.comboKills >= 10 ? '#ffd93d' : 
                          game.stats.comboKills >= 5 ? '#ff6b6b' : '#00ff88';
        
        ctx.fillStyle = comboColor;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.shadowColor = comboColor;
        ctx.shadowBlur = 10;
        
        const text = `${game.stats.comboKills}x COMBO!`;
        ctx.strokeText(text, CONFIG.CANVAS_WIDTH - 20, 120);
        ctx.fillText(text, CONFIG.CANVAS_WIDTH - 20, 120);
        ctx.restore();
    }
}

// ==================== SHOP SYSTEM ====================
// Brotato-style items with rarity, trade-offs, and categories
const ITEM_CATEGORIES = {
    WEAPON: 'weapon',
    STAT: 'stat',
    SPECIAL: 'special'
};

const RARITY = {
    COMMON: { name: 'Common', color: '#9ca3af', priceMultiplier: 1 },
    UNCOMMON: { name: 'Uncommon', color: '#22c55e', priceMultiplier: 1.5 },
    RARE: { name: 'Rare', color: '#3b82f6', priceMultiplier: 2 },
    EPIC: { name: 'Epic', color: '#a855f7', priceMultiplier: 2.5 },
    LEGENDARY: { name: 'Legendary', color: '#f59e0b', priceMultiplier: 3 }
};

const SHOP_ITEMS = [
    // Common Stat Items
    { name: '💚 Medkit', category: ITEM_CATEGORIES.STAT, rarity: RARITY.COMMON, basePrice: 8,
      effects: ['+20 Max HP', 'Full Heal'], apply: p => { p.maxHealth += 20; p.health = p.maxHealth; } },
    { name: '🏃 Running Shoes', category: ITEM_CATEGORIES.STAT, rarity: RARITY.COMMON, basePrice: 10,
      effects: ['+0.5 Speed'], apply: p => p.speed += 0.5 },
    { name: '🧲 Magnet', category: ITEM_CATEGORIES.STAT, rarity: RARITY.COMMON, basePrice: 6,
      effects: ['+30 Pickup Range'], apply: p => p.pickupRange += 30 },
    { name: '💪 Power Glove', category: ITEM_CATEGORIES.STAT, rarity: RARITY.COMMON, basePrice: 10,
      effects: ['+5 Damage'], apply: p => p.damage += 5 },
    { name: '🛡️ Armor Plate', category: ITEM_CATEGORIES.STAT, rarity: RARITY.COMMON, basePrice: 12,
      effects: ['+2 Armor'], apply: p => p.armor += 2 },
      
    // Uncommon Items with Trade-offs
    { name: '⚡ Energy Drink', category: ITEM_CATEGORIES.STAT, rarity: RARITY.UNCOMMON, basePrice: 12,
      effects: ['+25% Fire Rate', '-5 Max HP'], apply: p => { p.fireRate = Math.max(5, Math.floor(p.fireRate * 0.75)); p.maxHealth -= 5; } },
    { name: '🎯 Focus Lens', category: ITEM_CATEGORIES.STAT, rarity: RARITY.UNCOMMON, basePrice: 15,
      effects: ['+150 Range', '-0.3 Speed'], apply: p => { p.range += 150; p.speed = Math.max(1, p.speed - 0.3); } },
    { name: '⚔️ Battle Fury', category: ITEM_CATEGORIES.STAT, rarity: RARITY.UNCOMMON, basePrice: 14,
      effects: ['+8 Damage', '-10 Max HP'], apply: p => { p.damage += 8; p.maxHealth -= 10; } },
    { name: '🦅 Eagle Eye', category: ITEM_CATEGORIES.STAT, rarity: RARITY.UNCOMMON, basePrice: 16,
      effects: ['+15% Crit Chance', '+100 Range'], apply: p => { p.critChance = Math.min(0.9, p.critChance + 0.15); p.range += 100; } },
    { name: '🌪️ Whirlwind', category: ITEM_CATEGORIES.STAT, rarity: RARITY.UNCOMMON, basePrice: 15,
      effects: ['+1.0 Speed', '-3 Armor'], apply: p => { p.speed += 1.0; p.armor = Math.max(0, p.armor - 3); } },
    
    // Rare Items
    { name: '💎 Diamond Heart', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.RARE, basePrice: 18,
      effects: ['+40 Max HP', '+4 Armor', '-0.4 Speed'], apply: p => { p.maxHealth += 40; p.armor += 4; p.speed = Math.max(1, p.speed - 0.4); } },
    { name: '🎯 Multi-Shot', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.RARE, basePrice: 22,
      effects: ['+1 Projectile', '-3 Damage'], apply: p => { p.projectileCount += 1; p.damage = Math.max(1, p.damage - 3); } },
    { name: '💉 Vampire Fang', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.RARE, basePrice: 20,
      effects: ['+20% Life Steal', '-15 Max HP'], apply: p => { p.lifeSteal += 0.20; p.maxHealth -= 15; } },
    { name: '⚡ Overclocked Core', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.RARE, basePrice: 20,
      effects: ['+35% Fire Rate', '+10 Damage', '-20 Max HP'], apply: p => { p.fireRate = Math.max(5, Math.floor(p.fireRate * 0.65)); p.damage += 10; p.maxHealth -= 20; } },
    { name: '🎲 Lucky Charm', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.RARE, basePrice: 18,
      effects: ['+20% Crit Chance', '+15% Dodge'], apply: p => { p.critChance = Math.min(0.9, p.critChance + 0.20); p.dodge = Math.min(0.7, p.dodge + 0.15); } },
    
    // Epic Items
    { name: '💥 Critical Mass', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.EPIC, basePrice: 24,
      effects: ['+25% Crit Chance', '+1.0x Crit Dmg', '-10% Fire Rate'], apply: p => { p.critChance = Math.min(0.9, p.critChance + 0.25); p.critDamage += 1.0; p.fireRate = Math.floor(p.fireRate * 1.1); } },
    { name: '🛡️ Titan Armor', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.EPIC, basePrice: 26,
      effects: ['+60 Max HP', '+6 Armor', '-0.8 Speed'], apply: p => { p.maxHealth += 60; p.armor += 6; p.speed = Math.max(1, p.speed - 0.8); } },
    { name: '🌟 Nova Burst', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.EPIC, basePrice: 28,
      effects: ['+2 Projectiles', '+15 Damage', '-20% Fire Rate'], apply: p => { p.projectileCount += 2; p.damage += 15; p.fireRate = Math.floor(p.fireRate * 1.2); } },
    { name: '⚡ Lightning Reflexes', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.EPIC, basePrice: 25,
      effects: ['+25% Dodge', '+1.2 Speed', '-10 Max HP'], apply: p => { p.dodge = Math.min(0.7, p.dodge + 0.25); p.speed += 1.2; p.maxHealth -= 10; } },
    
    // Legendary Items
    { name: '👑 Crown of Power', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.LEGENDARY, basePrice: 35,
      effects: ['+20 Damage', '+2 Projectiles', '+100 Range', '-30 Max HP'], apply: p => { p.damage += 20; p.projectileCount += 2; p.range += 100; p.maxHealth -= 30; } },
    { name: '🔮 Mystic Orb', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.LEGENDARY, basePrice: 38,
      effects: ['+40% Crit Chance', '+1.5x Crit Dmg', '+30% Life Steal'], apply: p => { p.critChance = Math.min(0.9, p.critChance + 0.40); p.critDamage += 1.5; p.lifeSteal += 0.30; } },
    { name: '⚔️ God Slayer', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.LEGENDARY, basePrice: 40,
      effects: ['+35 Damage', '+50% Fire Rate', '-40 Max HP', '-1.0 Speed'], apply: p => { p.damage += 35; p.fireRate = Math.max(5, Math.floor(p.fireRate * 0.5)); p.maxHealth -= 40; p.speed = Math.max(1, p.speed - 1.0); } },
    { name: '🌌 Cosmic Shield', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.LEGENDARY, basePrice: 36,
      effects: ['+100 Max HP', '+10 Armor', '+30% Dodge', '-1.2 Speed'], apply: p => { p.maxHealth += 100; p.armor += 10; p.dodge = Math.min(0.7, p.dodge + 0.30); p.speed = Math.max(1, p.speed - 1.2); } },
    
    // Weapons
    { name: '🔫 Plasma Rifle', category: ITEM_CATEGORIES.WEAPON, rarity: RARITY.UNCOMMON, basePrice: 18,
      effects: ['+12 Damage', '+200 Range', 'Weapon Unlock'], apply: p => { p.damage += 12; p.range += 200; } },
    { name: '⚡ Tesla Coil', category: ITEM_CATEGORIES.WEAPON, rarity: RARITY.RARE, basePrice: 24,
      effects: ['+60% Fire Rate', '+1 Projectile', 'Weapon Unlock'], apply: p => { p.fireRate = Math.max(5, Math.floor(p.fireRate * 0.4)); p.projectileCount += 1; } },
    { name: '🚀 Rocket Pod', category: ITEM_CATEGORIES.WEAPON, rarity: RARITY.EPIC, basePrice: 30,
      effects: ['+25 Damage', '+3 Projectiles', '-30% Fire Rate'], apply: p => { p.damage += 25; p.projectileCount += 3; p.fireRate = Math.floor(p.fireRate * 1.3); } },
    { name: '🌟 Cosmic Cannon', category: ITEM_CATEGORIES.WEAPON, rarity: RARITY.LEGENDARY, basePrice: 42,
      effects: ['+40 Damage', '+4 Projectiles', '+300 Range', '-40% Fire Rate'], apply: p => { p.damage += 40; p.projectileCount += 4; p.range += 300; p.fireRate = Math.floor(p.fireRate * 1.4); } },
];

// Shop state management
let shopState = {
    currentOfferings: [],
    lockedItems: new Set(),
    rerollCost: 3,
    rerollCount: 0
};

function generateShopOfferings() {
    // Generate weighted random items based on rarity
    const offerings = [];
    const rarityWeights = [
        { rarity: RARITY.COMMON, weight: 50 },
        { rarity: RARITY.UNCOMMON, weight: 30 },
        { rarity: RARITY.RARE, weight: 12 },
        { rarity: RARITY.EPIC, weight: 6 },
        { rarity: RARITY.LEGENDARY, weight: 2 }
    ];
    
    for (let i = 0; i < 6; i++) {
        // Skip if item is locked from previous reroll
        if (shopState.currentOfferings[i] && shopState.lockedItems.has(i)) {
            offerings.push(shopState.currentOfferings[i]);
            continue;
        }
        
        // Weighted random rarity selection
        const totalWeight = rarityWeights.reduce((sum, r) => sum + r.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedRarity = RARITY.COMMON;
        
        for (const { rarity, weight } of rarityWeights) {
            random -= weight;
            if (random <= 0) {
                selectedRarity = rarity;
                break;
            }
        }
        
        // Get items of selected rarity
        const itemsOfRarity = SHOP_ITEMS.filter(item => item.rarity === selectedRarity);
        if (itemsOfRarity.length > 0) {
            const item = itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];
            offerings.push({
                ...item,
                price: Math.ceil(item.basePrice * item.rarity.priceMultiplier * (1 + game.wave * 0.1))
            });
        } else {
            // Fallback to common if no items of selected rarity
            const commonItems = SHOP_ITEMS.filter(item => item.rarity === RARITY.COMMON);
            const item = commonItems[Math.floor(Math.random() * commonItems.length)];
            offerings.push({
                ...item,
                price: Math.ceil(item.basePrice * item.rarity.priceMultiplier * (1 + game.wave * 0.1))
            });
        }
    }
    
    return offerings;
}

function openShop() {
    game.state = 'shop';
    document.getElementById('shop-modal').classList.remove('hidden');
    document.getElementById('completed-wave').textContent = game.wave - 1;
    
    // Check for perfect wave or low health survival
    if (game.stats.damageTaken === game.stats.waveStartDamage) {
        game.persistentStats.perfectWaves = (game.persistentStats.perfectWaves || 0) + 1;
    }
    if (game.player.health < game.player.maxHealth * 0.2) {
        game.persistentStats.lowHealthSurvival = (game.persistentStats.lowHealthSurvival || 0) + 1;
    }
    
    // Reset shop state for new wave
    if (shopState.currentOfferings.length === 0) {
        shopState.currentOfferings = generateShopOfferings();
        shopState.lockedItems.clear();
        shopState.rerollCost = 3;
        shopState.rerollCount = 0;
    }
    
    renderShop();
}

function renderShop() {
    const shopContainer = document.getElementById('shop-items');
    shopContainer.innerHTML = '';
    
    // Add reroll button at the top
    const rerollSection = document.createElement('div');
    rerollSection.className = 'shop-reroll-section';
    rerollSection.innerHTML = `
        <button id="reroll-btn" class="btn-reroll ${game.credits < shopState.rerollCost ? 'disabled' : ''}">
            🔄 Reroll Shop (${shopState.rerollCost} 💰)
        </button>
        <p class="reroll-info">Click on items to lock/unlock them before rerolling</p>
    `;
    shopContainer.appendChild(rerollSection);
    
    const itemsGrid = document.createElement('div');
    itemsGrid.className = 'shop-items-grid';
    
    shopState.currentOfferings.forEach((item, index) => {
        const isLocked = shopState.lockedItems.has(index);
        const canAfford = game.credits >= item.price;
        
        const div = document.createElement('div');
        div.className = `shop-item rarity-${item.rarity.name.toLowerCase()}${!canAfford ? ' disabled' : ''}${isLocked ? ' locked' : ''}`;
        div.dataset.index = index;
        
        // Create effects display
        const effectsHTML = item.effects.map(effect => {
            const isPositive = effect.startsWith('+');
            const isNegative = effect.startsWith('-');
            const className = isPositive ? 'positive' : (isNegative ? 'negative' : 'neutral');
            return `<span class="effect ${className}">${effect}</span>`;
        }).join('');
        
        div.innerHTML = `
            <div class="item-header">
                <h4>${item.name}</h4>
                <span class="rarity-badge" style="background: ${item.rarity.color}">${item.rarity.name}</span>
            </div>
            <div class="item-category">${item.category}</div>
            <div class="item-effects">${effectsHTML}</div>
            <div class="item-footer">
                <p class="price">💰 ${item.price}</p>
                ${isLocked ? '<span class="lock-icon">🔒</span>' : '<span class="lock-icon-hover">🔓</span>'}
            </div>
        `;
        
        // Right-click to lock/unlock
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            toggleItemLock(index);
        });
        
        // Click to purchase
        div.addEventListener('click', (e) => {
            // Don't purchase if clicking to lock
            if (e.shiftKey || e.ctrlKey) {
                toggleItemLock(index);
                return;
            }
            
            if (canAfford) {
                purchaseItem(item, index);
            }
        });
        
        itemsGrid.appendChild(div);
    });
    
    shopContainer.appendChild(itemsGrid);
    
    // Add reroll button event listener
    const rerollBtn = document.getElementById('reroll-btn');
    if (rerollBtn) {
        rerollBtn.addEventListener('click', rerollShop);
    }
}

function toggleItemLock(index) {
    if (shopState.lockedItems.has(index)) {
        shopState.lockedItems.delete(index);
    } else {
        shopState.lockedItems.add(index);
    }
    renderShop();
}

function purchaseItem(item, index) {
    game.credits -= item.price;
    item.apply(game.player);
    game.persistentStats.upgradesPurchased++;
    savePersistentStats();
    Sound.play('powerup');
    
    // Remove purchased item and unlock it
    shopState.currentOfferings.splice(index, 1);
    
    // Adjust locked items indices
    const newLockedItems = new Set();
    shopState.lockedItems.forEach(lockedIndex => {
        if (lockedIndex < index) {
            newLockedItems.add(lockedIndex);
        } else if (lockedIndex > index) {
            newLockedItems.add(lockedIndex - 1);
        }
    });
    shopState.lockedItems = newLockedItems;
    
    // Add a new item to replace the purchased one
    const newItem = generateShopOfferings()[0];
    shopState.currentOfferings.push(newItem);
    
    updateUI();
    renderShop();
    checkAchievements();
}

function rerollShop() {
    if (game.credits < shopState.rerollCost) return;
    
    game.credits -= shopState.rerollCost;
    shopState.rerollCount++;
    shopState.rerollCost = Math.ceil(3 * (1 + shopState.rerollCount * 0.5)); // Increase reroll cost
    
    // Generate new offerings, keeping locked items
    const newOfferings = [];
    for (let i = 0; i < shopState.currentOfferings.length; i++) {
        if (shopState.lockedItems.has(i)) {
            newOfferings.push(shopState.currentOfferings[i]);
        } else {
            newOfferings.push(generateShopOfferings()[0]);
        }
    }
    
    shopState.currentOfferings = newOfferings;
    Sound.play('powerup');
    updateUI();
    renderShop();
}

// ==================== WAVE SYSTEM ====================
function spawnWave() {
    const isBoss = game.wave % CONFIG.BOSS_WAVE_INTERVAL === 0;
    
    if (isBoss) {
        Sound.play('boss');
        const bossTypes = Object.keys(BOSS_TYPES);
        const bossType = bossTypes[Math.floor(game.wave / CONFIG.BOSS_WAVE_INTERVAL) % bossTypes.length];
        const boss = new Enemy(CONFIG.CANVAS_WIDTH / 2, -100, game.wave, bossType, true);
        game.enemies.push(boss);
        showNotification(`BOSS WAVE: ${boss.name}`);
    } else {
        const enemyCount = 5 + game.wave * 3;
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => {
                const side = Math.floor(Math.random() * 4);
                let x, y;
                switch(side) {
                    case 0: x = Math.random() * CONFIG.CANVAS_WIDTH; y = -50; break;
                    case 1: x = CONFIG.CANVAS_WIDTH + 50; y = Math.random() * CONFIG.CANVAS_HEIGHT; break;
                    case 2: x = Math.random() * CONFIG.CANVAS_WIDTH; y = CONFIG.CANVAS_HEIGHT + 50; break;
                    case 3: x = -50; y = Math.random() * CONFIG.CANVAS_HEIGHT; break;
                }
                
                const typeKeys = Object.keys(ENEMY_TYPES).filter(t => {
                    if (t === 'tank') return game.wave >= 3;
                    if (t === 'swarm') return game.wave >= 5;
                    if (t === 'teleporter') return game.wave >= 7;
                    if (t === 'shooter') return game.wave >= 10;
                    return true;
                });
                const type = typeKeys[Math.floor(Math.random() * typeKeys.length)];
                game.enemies.push(new Enemy(x, y, game.wave, type, false));
            }, i * 200);
        }
    }
    
    game.stats.waveStartDamage = game.stats.damageTaken;
}

function nextWave() {
    game.wave++;
    if (game.wave > game.persistentStats.maxWave) {
        game.persistentStats.maxWave = game.wave;
        game.stats.maxWave = game.wave;
        savePersistentStats();
    }
    game.timeLeft = CONFIG.WAVE_DURATION;
    game.state = 'playing';
    document.getElementById('shop-modal').classList.add('hidden');
    
    // Reset shop state for next wave
    shopState.currentOfferings = [];
    shopState.lockedItems.clear();
    shopState.rerollCost = 3;
    shopState.rerollCount = 0;
    
    spawnWave();
    checkAchievements();
}

// ==================== GAME OVER & RESTART ====================
function gameOver() {
    game.state = 'gameOver';
    savePersistentStats();
    checkAchievements();
    Sound.play('gameOver');
    
    // High score
    const score = game.wave * 1000 + game.stats.enemiesKilled * 10 + game.stats.bossesDefeated * 500;
    game.highScores.push({ wave: game.wave, score, timestamp: Date.now() });
    game.highScores.sort((a, b) => b.score - a.score);
    game.highScores = game.highScores.slice(0, 10);
    saveHighScores();
    
    document.getElementById('game-over-modal').classList.remove('hidden');
    document.getElementById('final-wave').textContent = game.wave;
    
    const stats = document.getElementById('final-stats');
    stats.innerHTML = `
        <h3>Mission Statistics</h3>
        <p>🌊 Waves Survived: ${game.wave}</p>
        <p>👾 Enemies Eliminated: ${game.stats.enemiesKilled}</p>
        <p>👹 Bosses Defeated: ${game.stats.bossesDefeated}</p>
        <p>💥 Damage Dealt: ${game.stats.damageDealt}</p>
        <p>❤️ Damage Taken: ${game.stats.damageTaken}</p>
        <p>💰 Credits Earned: ${game.credits}</p>
        <p>🏆 Score: ${score}</p>
    `;
    
    const title = document.getElementById('game-over-title');
    title.textContent = game.wave >= 10 ? '🏆 Mission Success! 🏆' : '💀 Mission Failed 💀';
}

function restartGame() {
    document.getElementById('game-over-modal').classList.add('hidden');
    game.state = 'characterSelect';
    document.getElementById('character-select-modal').classList.remove('hidden');
}

// ==================== UI & NOTIFICATIONS ====================
function updateUI() {
    document.getElementById('wave-number').textContent = game.wave;
    document.getElementById('time-left').textContent = Math.ceil(game.timeLeft);
    document.getElementById('credit-amount').textContent = game.credits;
    
    const healthPercent = (game.player.health / game.player.maxHealth) * 100;
    const healthBar = document.getElementById('health-bar');
    healthBar.style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = `${Math.ceil(game.player.health)} / ${game.player.maxHealth}`;
    
    // Low health warning effect
    const healthContainer = document.getElementById('health-bar-container');
    if (healthPercent <= 25) {
        const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
        healthContainer.style.boxShadow = `0 0 ${20 + pulse * 10}px rgba(255, 0, 0, ${0.5 + pulse * 0.5})`;
    } else {
        healthContainer.style.boxShadow = '';
    }
}

let notifications = [];
function showNotification(text) {
    notifications.push({ text, life: 180, y: 100 + notifications.length * 40 });
}

function updateNotifications() {
    notifications = notifications.filter(n => {
        n.life--;
        return n.life > 0;
    });
}

function drawNotifications(ctx) {
    ctx.save();
    notifications.forEach(n => {
        ctx.globalAlpha = Math.min(1, n.life / 60);
        ctx.fillStyle = '#000';
        ctx.fillRect(CONFIG.CANVAS_WIDTH / 2 - 200, n.y - 15, 400, 30);
        ctx.fillStyle = '#ffd93d';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(n.text, CONFIG.CANVAS_WIDTH / 2, n.y + 5);
    });
    ctx.restore();
}

// ==================== TOUCH CONTROLS ====================
function setupTouchControls() {
    const canvas = game.canvas;
    
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        if (x < CONFIG.CANVAS_WIDTH / 2) {
            game.joystick.active = true;
            game.joystick.startX = x;
            game.joystick.startY = y;
        }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (!game.joystick.active) return;
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const dx = x - game.joystick.startX;
        const dy = y - game.joystick.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 50;
        
        if (dist > 0) {
            const clamp = Math.min(dist, maxDist);
            game.joystick.x = (dx / dist) * (clamp / maxDist);
            game.joystick.y = (dy / dist) * (clamp / maxDist);
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        game.joystick.active = false;
        game.joystick.x = 0;
        game.joystick.y = 0;
    }, { passive: false });
}

function drawJoystick(ctx) {
    if (!game.joystick.active) return;
    
    const startX = game.joystick.startX;
    const startY = game.joystick.startY;
    const currentX = startX + game.joystick.x * 50;
    const currentY = startY + game.joystick.y * 50;
    
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#4ecdc4';
    ctx.beginPath();
    ctx.arc(startX, startY, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Draw active powerups UI
function drawActivePowerups(ctx) {
    ctx.save();
    let offsetY = 150;
    game.activePowerups.forEach((p, i) => {
        const x = 20;
        const y = offsetY + i * 45;
        const progress = p.timeLeft / p.maxTime;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, 150, 35);
        
        // Progress bar
        ctx.fillStyle = p.data.color;
        ctx.fillRect(x, y, 150 * progress, 35);
        
        // Text
        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 5;
        ctx.fillText(p.data.name, x + 5, y + 22);
        
        // Time left
        const timeLeft = Math.ceil(p.timeLeft / 60);
        ctx.textAlign = 'right';
        ctx.fillText(`${timeLeft}s`, x + 145, y + 22);
    });
    ctx.restore();
}

// Draw combo meter
function drawComboMeter(ctx) {
    if (game.stats.comboKills <= 1) return;
    
    ctx.save();
    const x = CONFIG.CANVAS_WIDTH / 2;
    const y = 50;
    const progress = game.stats.comboTimer / msToFrames(CONFIG.COMBO_TIMEOUT);
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 75, y, 150, 30);
    
    // Progress bar
    ctx.fillStyle = progress > 0.5 ? '#ffd93d' : '#ff6b6b';
    ctx.fillRect(x - 75, y, 150 * progress, 30);
    
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 5;
    ctx.fillText(`${game.stats.comboKills}x COMBO`, x, y + 20);
    
    ctx.restore();
}

// Draw pause menu
function drawPauseMenu(ctx) {
    ctx.save();
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Menu box
    ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    const menuX = CONFIG.CANVAS_WIDTH / 2 - 250;
    const menuY = CONFIG.CANVAS_HEIGHT / 2 - 200;
    ctx.fillRect(menuX, menuY, 500, 400);
    ctx.strokeRect(menuX, menuY, 500, 400);
    
    // Title
    ctx.fillStyle = '#ffd93d';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 10;
    ctx.fillText('PAUSED', CONFIG.CANVAS_WIDTH / 2, menuY + 60);
    
    // Stats
    ctx.fillStyle = '#00ff88';
    ctx.font = '18px monospace';
    ctx.fillText(`Wave: ${game.wave}`, CONFIG.CANVAS_WIDTH / 2, menuY + 120);
    ctx.fillText(`Kills: ${game.stats.enemiesKilled}`, CONFIG.CANVAS_WIDTH / 2, menuY + 150);
    ctx.fillText(`Credits: ${game.credits}`, CONFIG.CANVAS_WIDTH / 2, menuY + 180);
    ctx.fillText(`Combo: ${game.stats.comboKills}x`, CONFIG.CANVAS_WIDTH / 2, menuY + 210);
    
    // Current weapon
    ctx.fillStyle = '#4ecdc4';
    ctx.font = '20px monospace';
    const weaponName = WEAPON_TYPES[game.currentWeapon].name;
    ctx.fillText(`Current Weapon: ${weaponName}`, CONFIG.CANVAS_WIDTH / 2, menuY + 250);
    
    // Active powerups
    if (game.activePowerups.length > 0) {
        ctx.fillStyle = '#ffd93d';
        ctx.font = '16px monospace';
        ctx.fillText('Active Powerups:', CONFIG.CANVAS_WIDTH / 2, menuY + 290);
        game.activePowerups.forEach((p, i) => {
            ctx.fillStyle = p.data.color;
            const timeLeft = Math.ceil(p.timeLeft / 60);
            ctx.fillText(`${p.data.name} (${timeLeft}s)`, CONFIG.CANVAS_WIDTH / 2, menuY + 315 + i * 25);
        });
    }
    
    // Instructions
    ctx.fillStyle = '#888';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press ESC to Resume', CONFIG.CANVAS_WIDTH / 2, menuY + 370);
    
    ctx.restore();
}

// Draw weapon indicator
function drawWeaponIndicator(ctx) {
    const weapons = ['basic', 'laser', 'rocket', 'spread'];
    const x = CONFIG.CANVAS_WIDTH - 200;
    const y = CONFIG.CANVAS_HEIGHT - 60;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, 190, 50);
    
    ctx.fillStyle = '#00ff88';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Weapon:', x + 5, y + 20);
    
    weapons.forEach((weapon, i) => {
        const wx = x + 5 + i * 45;
        const wy = y + 30;
        
        if (game.currentWeapon === weapon) {
            ctx.fillStyle = WEAPON_TYPES[weapon].color;
            ctx.fillRect(wx, wy, 40, 15);
        }
        
        ctx.strokeStyle = WEAPON_TYPES[weapon].color;
        ctx.lineWidth = 2;
        ctx.strokeRect(wx, wy, 40, 15);
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, wx + 20, wy + 12);
    });
    
    ctx.restore();
}

// ==================== GAME LOOP ====================
let lastTime = 0;
let timer = 0;

// Initialize starfield
function initStarfield() {
    game.stars = [];
    for (let i = 0; i < 150; i++) {
        game.stars.push({
            x: Math.random() * CONFIG.CANVAS_WIDTH,
            y: Math.random() * CONFIG.CANVAS_HEIGHT,
            size: Math.random() * 2,
            speed: 0.1 + Math.random() * 0.5,
            twinkle: Math.random() * Math.PI * 2,
        });
    }
}

function updateStarfield() {
    game.stars.forEach(star => {
        star.y += star.speed;
        star.twinkle += 0.05;
        if (star.y > CONFIG.CANVAS_HEIGHT) {
            star.y = 0;
            star.x = Math.random() * CONFIG.CANVAS_WIDTH;
        }
    });
}

function drawStarfield(ctx) {
    ctx.save();
    game.stars.forEach(star => {
        const alpha = 0.3 + Math.sin(star.twinkle) * 0.3;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = star.size * 2;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // FPS counter
    game.frameCount++;
    if (timestamp - game.lastFpsUpdate > 1000) {
        game.fps = game.frameCount;
        game.frameCount = 0;
        game.lastFpsUpdate = timestamp;
    }
    
    const ctx = game.ctx;
    
    // Update camera shake
    updateCamera();
    
    // Apply camera offset
    ctx.save();
    ctx.translate(game.camera.offsetX, game.camera.offsetY);
    
    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Animated starfield
    updateStarfield();
    drawStarfield(ctx);
    
    // Grid with subtle animation (optimized - draw less frequently)
    // Use timestamp for consistent rendering pattern
    if (Math.floor(timestamp / 33) % 2 === 0) {
        const gridPulse = Math.sin(timestamp * 0.0005) * 0.02 + 0.05;
        ctx.strokeStyle = `rgba(78, 205, 196, ${gridPulse})`;
        ctx.lineWidth = 1;
        for (let x = 0; x < CONFIG.CANVAS_WIDTH; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
            ctx.stroke();
        }
        for (let y = 0; y < CONFIG.CANVAS_HEIGHT; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
            ctx.stroke();
        }
    }
    
    if (game.state === 'playing' && !game.paused) {
        timer += deltaTime;
        if (timer >= 1000) {
            timer = 0;
            game.timeLeft--;
            if (game.timeLeft <= 0) {
                Sound.play('waveComplete');
                openShop();
            }
        }
        
        game.player.update();
        game.enemies.forEach(e => e.update());
        game.bullets = game.bullets.filter(b => {
            if (b.isEnemyBullet) {
                b.x += Math.cos(b.angle) * b.speed;
                b.y += Math.sin(b.angle) * b.speed;
                const dist = Math.hypot(game.player.x - b.x, game.player.y - b.y);
                if (dist < game.player.size + b.size) {
                    game.player.takeDamage(b.damage);
                    return false;
                }
                return b.x >= 0 && b.x <= CONFIG.CANVAS_WIDTH && b.y >= 0 && b.y <= CONFIG.CANVAS_HEIGHT;
            }
            return b.update();
        });
        updateParticles();
        updateNotifications();
        updatePowerups();
        collectPowerups();
        
        game.pickups.forEach(p => p.draw(ctx));
        game.powerups.forEach(p => p.draw(ctx));
        game.enemies.forEach(e => e.draw(ctx));
        game.bullets.forEach(b => b.draw(ctx));
        game.player.draw(ctx);
        drawParticles(ctx);
        drawNotifications(ctx);
        drawJoystick(ctx);
        drawActivePowerups(ctx);
        drawComboMeter(ctx);
        
        updateUI();
        
        // Draw weapon indicator (outside camera transform)
        ctx.restore();
        ctx.save();
        drawWeaponIndicator(ctx);
    } else if (game.paused) {
        // Still draw everything when paused
        game.pickups.forEach(p => p.draw(ctx));
        game.powerups.forEach(p => p.draw(ctx));
        game.enemies.forEach(e => e.draw(ctx));
        game.bullets.forEach(b => b.draw(ctx));
        game.player.draw(ctx);
        drawParticles(ctx);
        drawPauseMenu(ctx);
    }
    
    // Draw FPS counter (outside camera transform)
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#00ff88';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${game.fps}`, CONFIG.CANVAS_WIDTH - 10, 20);
    ctx.restore();
    
    requestAnimationFrame(gameLoop);
}

// ==================== INITIALIZATION ====================
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    
    // Initialize visual systems
    initStarfield();
    
    setupTouchControls();
    
    // Character selection
    const charSelect = document.getElementById('character-select-modal');
    const charContainer = document.getElementById('character-list');
    
    CHARACTERS.forEach(char => {
        const div = document.createElement('div');
        div.className = 'character-card';
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
            game.selectedCharacter = char;
            game.player = new Player(char);
            charSelect.classList.add('hidden');
            game.state = 'playing';
            spawnWave();
            requestAnimationFrame(gameLoop);
        });
        charContainer.appendChild(div);
    });
    
    // Buttons
    document.getElementById('start-btn')?.addEventListener('click', () => {
        document.getElementById('start-modal').classList.add('hidden');
        charSelect.classList.remove('hidden');
    });
    
    document.getElementById('next-wave-btn').addEventListener('click', nextWave);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    
    // Sound toggle
    const soundBtn = document.createElement('button');
    soundBtn.id = 'sound-toggle';
    soundBtn.className = 'sound-btn';
    soundBtn.textContent = game.soundEnabled ? '🔊' : '🔇';
    soundBtn.addEventListener('click', () => {
        const enabled = Sound.toggle();
        soundBtn.textContent = enabled ? '🔊' : '🔇';
    });
    document.body.appendChild(soundBtn);
    
    // Achievements button
    const achBtn = document.createElement('button');
    achBtn.id = 'achievements-btn';
    achBtn.className = 'achievements-btn';
    achBtn.textContent = '🏆';
    achBtn.addEventListener('click', showAchievements);
    document.body.appendChild(achBtn);
}

function showAchievements() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>🏆 Achievements</h2>
            <div class="achievements-list">
                ${ACHIEVEMENTS.map(ach => `
                    <div class="achievement ${game.achievements.includes(ach.id) ? 'unlocked' : 'locked'}">
                        <span>${ach.name}</span>
                        <p>${ach.desc}</p>
                    </div>
                `).join('')}
            </div>
            <h3>📊 Statistics</h3>
            <p>Total Kills: ${game.persistentStats.totalKills}</p>
            <p>Total Credits: ${game.persistentStats.totalCredits}</p>
            <p>Max Wave: ${game.persistentStats.maxWave}</p>
            <p>Upgrades Purchased: ${game.persistentStats.upgradesPurchased}</p>
            <h3>🏆 High Scores</h3>
            <div class="high-scores">
                ${game.highScores.map((s, i) => `
                    <div class="score-entry">
                        <span>${i + 1}.</span>
                        <span>Wave ${s.wave}</span>
                        <span>${s.score}</span>
                    </div>
                `).join('')}
            </div>
            <button class="btn-primary close-modal">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

window.addEventListener('keydown', e => {
    game.keys[e.key] = true;
    
    // Pause toggle
    if (e.key === 'Escape' && game.state === 'playing') {
        game.paused = !game.paused;
        e.preventDefault();
    }
    
    // Weapon switching
    if (game.state === 'playing' && !game.paused) {
        const weapons = ['basic', 'laser', 'rocket', 'spread'];
        if (e.key >= '1' && e.key <= '4') {
            const weaponIndex = parseInt(e.key) - 1;
            if (weaponIndex < weapons.length) {
                game.currentWeapon = weapons[weaponIndex];
                const weaponName = WEAPON_TYPES[game.currentWeapon].name;
                showNotification(`Switched to ${weaponName}`, '#4ecdc4', 1000);
                Sound.play('pickup');
            }
        }
    }
});

window.addEventListener('keyup', e => game.keys[e.key] = false);
window.addEventListener('load', init);
