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
};

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
    keys: {},
    touchActive: false,
    joystick: { x: 0, y: 0, active: false, startX: 0, startY: 0 },
    currentWeapon: 'basic',
    stats: {
        enemiesKilled: 0,
        damageDealt: 0,
        damageTaken: 0,
        bossesDefeated: 0,
        waveStartDamage: 0,
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
            powerup: { freq: [300, 800], type: 'sine', duration: 0.2, volume: 0.15 },
            waveComplete: { freq: [400, 500, 600, 800], type: 'sine', duration: 0.15, volume: 0.2 },
            boss: { freq: [100, 50], type: 'sawtooth', duration: 0.5, volume: 0.3 },
            gameOver: { freq: [300, 50], type: 'sawtooth', duration: 1, volume: 0.3 },
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

        this.x += dx * this.speed;
        this.y += dy * this.speed;
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
        const nearest = game.enemies
            .filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= this.range)
            .sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))
            .slice(0, this.projectileCount);
        
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
        if (Math.random() < this.dodge) {
            createTextParticle(this.x, this.y, 'DODGE!', '#4ecdc4');
            return;
        }
        const finalDamage = Math.max(1, amount - this.armor);
        this.health -= finalDamage;
        game.stats.damageTaken += finalDamage;
        createTextParticle(this.x, this.y, `-${finalDamage}`, '#ff6b6b');
        Sound.play('hit');
        if (this.health <= 0) gameOver();
    }

    heal(amount) {
        const heal = Math.min(amount, this.maxHealth - this.health);
        this.health += heal;
        if (heal > 0) createTextParticle(this.x, this.y, `+${heal}`, '#00ff88');
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
        createTextParticle(this.x, this.y, `-${amount}${isCrit ? '!' : ''}`, isCrit ? '#ffd93d' : '#fff');
        if (this.health <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    die() {
        game.stats.enemiesKilled++;
        game.persistentStats.totalKills++;
        if (this.isBoss) {
            game.stats.bossesDefeated++;
            showNotification(`${this.name} Defeated!`);
        }
        game.pickups.push(new Pickup(this.x, this.y, this.creditValue));
        createParticles(this.x, this.y, this.color, this.isBoss ? 30 : 15);
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
                    const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
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
                const isCrit = Math.random() < this.critChance;
                const finalDamage = Math.floor(this.damage * (isCrit ? this.critDamage : 1));
                
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

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 2 + Math.random() * 3;
        game.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            color,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            type: 'particle',
        });
    }
}

function createTextParticle(x, y, text, color) {
    game.particles.push({ x, y, text, color, life: 60, maxLife: 60, vy: -1, type: 'text' });
}

function updateParticles() {
    game.particles = game.particles.filter(p => {
        if (p.type === 'text') {
            p.y += p.vy;
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
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(p.text, p.x, p.y);
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        } else {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
            ctx.globalAlpha = 1;
        }
    });
}

// ==================== SHOP SYSTEM ====================
const SHOP_ITEMS = [
    { name: '💚 Health', desc: '+20 Max HP, Full Heal', price: 10, apply: p => { p.maxHealth += 20; p.health = p.maxHealth; } },
    { name: '⚡ Fire Rate', desc: '+20% Fire Rate', price: 15, apply: p => p.fireRate = Math.max(5, Math.floor(p.fireRate * 0.8)) },
    { name: '💪 Damage', desc: '+5 Damage', price: 12, apply: p => p.damage += 5 },
    { name: '🎯 Projectile', desc: '+1 Projectile', price: 25, apply: p => p.projectileCount += 1 },
    { name: '🏃 Speed', desc: '+0.5 Speed', price: 10, apply: p => p.speed += 0.5 },
    { name: '🛡️ Armor', desc: '+2 Armor', price: 15, apply: p => p.armor += 2 },
    { name: '✨ Crit Chance', desc: '+10% Crit', price: 20, apply: p => p.critChance = Math.min(0.9, p.critChance + 0.1) },
    { name: '💥 Crit Damage', desc: '+0.5x Crit', price: 20, apply: p => p.critDamage += 0.5 },
    { name: '🔭 Range', desc: '+100 Range', price: 15, apply: p => p.range += 100 },
    { name: '🧲 Pickup Range', desc: '+30 Pickup', price: 8, apply: p => p.pickupRange += 30 },
    { name: '💉 Life Steal', desc: '+15% Lifesteal', price: 25, apply: p => p.lifeSteal += 0.15 },
    { name: '🎲 Dodge', desc: '+10% Dodge', price: 20, apply: p => p.dodge = Math.min(0.7, p.dodge + 0.1) },
];

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
    
    const shopContainer = document.getElementById('shop-items');
    shopContainer.innerHTML = '';
    
    const shuffled = [...SHOP_ITEMS].sort(() => Math.random() - 0.5);
    const offerings = shuffled.slice(0, 6);
    
    offerings.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item' + (game.credits < item.price ? ' disabled' : '');
        div.innerHTML = `
            <h4>${item.name}</h4>
            <p>${item.desc}</p>
            <p class="price">💰 ${item.price} Credits</p>
        `;
        div.addEventListener('click', () => {
            if (game.credits >= item.price) {
                game.credits -= item.price;
                item.apply(game.player);
                game.persistentStats.upgradesPurchased++;
                savePersistentStats();
                Sound.play('powerup');
                updateUI();
                openShop();
                checkAchievements();
            }
        });
        shopContainer.appendChild(div);
    });
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
    document.getElementById('health-bar').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = `${Math.ceil(game.player.health)} / ${game.player.maxHealth}`;
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

// ==================== GAME LOOP ====================
let lastTime = 0;
let timer = 0;

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    const ctx = game.ctx;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Grid
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.05)';
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
    
    if (game.state === 'playing') {
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
        
        game.pickups.forEach(p => p.draw(ctx));
        game.enemies.forEach(e => e.draw(ctx));
        game.bullets.forEach(b => b.draw(ctx));
        game.player.draw(ctx);
        drawParticles(ctx);
        drawNotifications(ctx);
        drawJoystick(ctx);
        
        updateUI();
    }
    
    requestAnimationFrame(gameLoop);
}

// ==================== INITIALIZATION ====================
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    
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

window.addEventListener('keydown', e => game.keys[e.key] = true);
window.addEventListener('keyup', e => game.keys[e.key] = false);
window.addEventListener('load', init);
