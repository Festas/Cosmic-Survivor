// Extended Game - Cosmic Survivor
// This is the main refactored game file with all improvements

// ==================== CONFIGURATION ====================
const CONFIG = {
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 800,
    WAVE_DURATION: 60,
    WAVE_CLEAR_COUNTDOWN: 5,
    PLAYER_SIZE: 30,
    ENEMY_SIZE: 25,
    BULLET_SIZE: 5,
    BULLET_SPEED: 8,
    PICKUP_SIZE: 15,
    BOSS_WAVE_INTERVAL: 5,
    MAX_PARTICLES: 500,
    PARTICLE_POOL_SIZE: 1000,
    GRID_CELL_SIZE: 100,
    TARGET_FPS: 60,
    COMBO_TIMEOUT: 3000,
    POWERUP_DURATION: 8000,
    SCREEN_SHAKE_INTENSITY: 10,
    POWERUP_DROP_CHANCE: 0.15,
    POWERUP_DROP_CHANCE_BOSS: 0.8,
    // New balance constants
    DASH_COOLDOWN: 90, // frames (1.5 seconds)
    DASH_DISTANCE: 120,
    DASH_INVULNERABLE_FRAMES: 12,
    XP_BASE: 10, // XP needed for level 2
    XP_SCALING: 1.15, // Each level needs 15% more XP
    ELITE_CHANCE: 0.08, // 8% chance for elite enemies after wave 5
    MINIMAP_SIZE: 140,
    MINIMAP_MARGIN: 10,
    // Difficulty presets
    DIFFICULTY: {
        easy: { enemyHealthMult: 0.7, enemyDamageMult: 0.6, enemySpeedMult: 0.85, creditMult: 1.3, xpMult: 1.2 },
        normal: { enemyHealthMult: 1.0, enemyDamageMult: 1.0, enemySpeedMult: 1.0, creditMult: 1.0, xpMult: 1.0 },
        hard: { enemyHealthMult: 1.4, enemyDamageMult: 1.3, enemySpeedMult: 1.1, creditMult: 0.85, xpMult: 0.9 },
        nightmare: { enemyHealthMult: 2.0, enemyDamageMult: 1.6, enemySpeedMult: 1.2, creditMult: 0.7, xpMult: 0.8 },
    },
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
        description: 'Well-rounded stats for all situations',
        maxHealth: 100, speed: 3, damage: 10, fireRate: 30,
    },
    {
        id: 'tank',
        name: '🛡️ Tank',
        description: 'Heavy armor, solid damage',
        maxHealth: 180, speed: 2.2, damage: 9, fireRate: 38, armor: 6,
    },
    {
        id: 'speedster',
        name: '⚡ Speedster',
        description: 'Lightning fast, elusive fighter',
        maxHealth: 85, speed: 4.5, damage: 8, fireRate: 18, dodge: 0.08,
    },
    {
        id: 'sniper',
        name: '🎯 Sniper',
        description: 'Precision shots from afar',
        maxHealth: 80, speed: 2.5, damage: 22, fireRate: 48, critChance: 0.2, critDamage: 2.2, range: 650,
    },
    {
        id: 'gunslinger',
        name: '🔫 Gunslinger',
        description: 'Multi-shot specialist',
        maxHealth: 90, speed: 3.2, damage: 7, fireRate: 22, projectileCount: 3, dodge: 0.05,
    },
    {
        id: 'vampire',
        name: '🧛 Vampire',
        description: 'Sustain through life drain',
        maxHealth: 95, speed: 2.8, damage: 11, fireRate: 34, armor: 2, lifeSteal: 0.2,
    },
    {
        id: 'berserker',
        name: '⚔️ Berserker',
        description: 'Aggressive glass cannon',
        maxHealth: 75, speed: 3.8, damage: 16, fireRate: 24, critChance: 0.2, critDamage: 1.8, dodge: 0.1,
    },
    {
        id: 'engineer',
        name: '🔧 Engineer',
        description: 'Defensive specialist with range',
        maxHealth: 130, speed: 2.3, damage: 9, fireRate: 36, armor: 7, range: 500, pickupRange: 65,
    },
    {
        id: 'medic',
        name: '💊 Medic',
        description: 'Regenerates health over time',
        maxHealth: 120, speed: 2.6, damage: 8, fireRate: 34, armor: 3, lifeSteal: 0.1, healthRegen: 0.4,
    },
    {
        id: 'assassin',
        name: '🗡️ Assassin',
        description: 'High dodge and deadly criticals',
        maxHealth: 70, speed: 4.2, damage: 14, fireRate: 26, critChance: 0.25, critDamage: 2.5, dodge: 0.2,
    },
    {
        id: 'summoner',
        name: '🔮 Summoner',
        description: 'Commands powerful attack drones',
        maxHealth: 100, speed: 2.6, damage: 8, fireRate: 42, armor: 2, dodge: 0.05, maxDrones: 2,
    },
    {
        id: 'juggernaut',
        name: '💪 Juggernaut',
        description: 'Unstoppable force, immovable object',
        maxHealth: 200, speed: 1.8, damage: 12, fireRate: 45, armor: 10, lifeSteal: 0.08, knockbackImmune: true,
    },
];

// Weapon types
const WEAPON_TYPES = {
    basic: { name: '🔫 Blaster', fireRate: 1, damage: 1, color: '#00ff88', desc: 'Reliable all-rounder' },
    laser: { name: '⚡ Laser', fireRate: 0.25, damage: 0.35, color: '#ff00ff', continuous: true, desc: 'Continuous beam' },
    rocket: { name: '🚀 Rocket', fireRate: 2.2, damage: 2.5, color: '#ff6b6b', explosion: 70, desc: 'Explosive area damage' },
    spread: { name: '🌟 Spread', fireRate: 1.4, damage: 0.6, projectiles: 5, color: '#ffd93d', desc: 'Wide coverage' },
    flamethrower: { name: '🔥 Flamethrower', fireRate: 0.15, damage: 0.4, color: '#ff4500', cone: true, desc: 'Close range inferno' },
    lightning: { name: '⚡ Chain Lightning', fireRate: 1.3, damage: 1.0, color: '#00d4ff', chains: 3, desc: 'Chains between enemies' },
    freeze: { name: '❄️ Freeze Ray', fireRate: 0.8, damage: 0.7, color: '#87ceeb', slows: true, desc: 'Slows enemies on hit' },
    plasma: { name: '💥 Plasma', fireRate: 1.6, damage: 1.4, color: '#9d00ff', pierces: true, desc: 'Pierces through enemies' },
};

// Enemy types with behaviors
const ENEMY_TYPES = {
    normal: { color: '#a855f7', speed: 1, health: 1, damage: 1, credits: 1, xp: 1 },
    fast: { color: '#ff6b6b', speed: 1.4, health: 0.6, damage: 0.7, credits: 1.2, xp: 1.1 },
    tank: { color: '#10b981', speed: 0.55, health: 2.2, damage: 1.3, credits: 2, xp: 1.5 },
    swarm: { color: '#f59e0b', speed: 1.15, health: 0.35, damage: 0.4, credits: 0.5, xp: 0.4, size: 0.6 },
    teleporter: { color: '#8b5cf6', speed: 0.75, health: 0.9, damage: 1.1, credits: 1.5, xp: 1.3, canTeleport: true },
    shooter: { color: '#ec4899', speed: 0.45, health: 0.75, damage: 0.9, credits: 1.8, xp: 1.4, ranged: true },
    healer: { color: '#22d3ee', speed: 0.65, health: 1.1, damage: 0.5, credits: 2.5, xp: 2, heals: true },
    splitter: { color: '#fb923c', speed: 0.85, health: 1.2, damage: 1.0, credits: 2.2, xp: 1.8, splits: 3 },
    freezer: { color: '#38bdf8', speed: 0.75, health: 1.0, damage: 0.8, credits: 2, xp: 1.5, freezes: true },
    berserker: { color: '#dc2626', speed: 0.95, health: 1.4, damage: 1.5, credits: 2.3, xp: 2, enrages: true },
};

// Boss types
const BOSS_TYPES = {
    destroyer: { name: '👹 Destroyer', color: '#dc2626', size: 2.4, health: 12, damage: 2.5, credits: 100, xp: 50 },
    broodmother: { name: '🕷️ Brood Mother', color: '#7c2d12', size: 2.8, health: 10, damage: 1.8, credits: 120, xp: 60, summons: true },
    voidwalker: { name: '👻 Void Walker', color: '#581c87', size: 2.2, health: 8, damage: 2.2, credits: 150, xp: 70, teleports: true },
    necromancer: { name: '💀 Necromancer', color: '#4c1d95', size: 2.6, health: 11, damage: 2.0, credits: 180, xp: 80, resurrects: true },
    titan: { name: '⚡ Titan', color: '#b91c1c', size: 3.2, health: 16, damage: 3.5, credits: 200, xp: 100, earthquake: true },
};

// Elite enemy modifiers - rare empowered enemies
const ELITE_MODIFIERS = {
    vampiric: { name: '🧛 Vampiric', color: '#991b1b', healthMult: 1.5, damageMult: 1.2, speedMult: 1.0, healsOnHit: true, creditMult: 2.5, xpMult: 2.5 },
    shielded: { name: '🛡️ Shielded', color: '#1e40af', healthMult: 2.0, damageMult: 1.0, speedMult: 0.9, hasShield: true, creditMult: 2.0, xpMult: 2.0 },
    enraged: { name: '🔥 Enraged', color: '#ea580c', healthMult: 1.2, damageMult: 1.8, speedMult: 1.3, creditMult: 2.5, xpMult: 2.5 },
    toxic: { name: '☠️ Toxic', color: '#65a30d', healthMult: 1.3, damageMult: 1.0, speedMult: 1.0, poisonOnHit: true, creditMult: 2.0, xpMult: 2.0 },
    ghostly: { name: '👻 Ghostly', color: '#94a3b8', healthMult: 0.8, damageMult: 1.5, speedMult: 1.4, phasing: true, creditMult: 3.0, xpMult: 3.0 },
};

// XP level-up passive abilities (pick 1 of 3)
const PASSIVE_ABILITIES = [
    { id: 'glass_cannon', name: '🔥 Glass Cannon', desc: '+15% Damage, -10% Max HP', apply: p => { p.damage = Math.floor(p.damage * 1.15); p.maxHealth = Math.floor(p.maxHealth * 0.9); p.health = Math.min(p.health, p.maxHealth); } },
    { id: 'fortify', name: '🛡️ Fortify', desc: '+2 Armor, +15 Max HP', apply: p => { p.armor += 2; p.maxHealth += 15; p.health += 15; } },
    { id: 'quick_hands', name: '⚡ Quick Hands', desc: '+10% Fire Rate', apply: p => { p.fireRate = Math.max(5, Math.floor(p.fireRate * 0.9)); } },
    { id: 'nimble', name: '🏃 Nimble', desc: '+0.3 Speed, +5% Dodge', apply: p => { p.speed += 0.3; p.dodge = Math.min(0.7, p.dodge + 0.05); } },
    { id: 'vampirism', name: '🧛 Vampirism', desc: '+8% Life Steal', apply: p => { p.lifeSteal += 0.08; } },
    { id: 'eagle_eye', name: '🎯 Eagle Eye', desc: '+8% Crit Chance, +0.3x Crit Damage', apply: p => { p.critChance = Math.min(0.9, p.critChance + 0.08); p.critDamage += 0.3; } },
    { id: 'thick_skin', name: '💚 Thick Skin', desc: '+25 Max HP, Full Heal', apply: p => { p.maxHealth += 25; p.health = p.maxHealth; } },
    { id: 'bullet_storm', name: '🌟 Bullet Storm', desc: '+1 Projectile', apply: p => { p.projectileCount += 1; } },
    { id: 'scavenger', name: '🧲 Scavenger', desc: '+25 Pickup Range, +10% Credits', apply: p => { p.pickupRange += 25; } },
    { id: 'regeneration', name: '💊 Regeneration', desc: '+0.3 HP/s Regen', apply: p => { p.healthRegen = (p.healthRegen || 0) + 0.3; } },
    { id: 'adrenaline', name: '💉 Adrenaline', desc: '+0.5 Speed, +5 Damage when below 50% HP', apply: p => { p.adrenaline = (p.adrenaline || 0) + 1; } },
    { id: 'thorns', name: '🌵 Thorns', desc: 'Reflect 20% melee damage back', apply: p => { p.thorns = (p.thorns || 0) + 0.2; } },
];

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
        xp: 0,
        level: 1,
        xpToNext: 10,
        totalXpEarned: 0,
    },
    persistentStats: loadPersistentStats(),
    achievements: loadAchievements(),
    highScores: loadHighScores(),
    difficulty: 'normal',
    difficultySettings: null,
    levelUpChoices: [],
    passivesChosen: [],
    playerDPS: { damage: 0, timer: 0, history: [] },
    eliteKills: 0,
    soundEnabled: (() => {
        try {
            return localStorage.getItem('soundEnabled') !== 'false';
        } catch (error) {
            console.warn('Failed to load sound preference:', error);
            return true;
        }
    })(),
};

function loadPersistentStats() {
    const defaults = { totalKills: 0, totalCredits: 0, maxWave: 0, upgradesPurchased: 0, weaponsUnlocked: 1 };
    try {
        const saved = localStorage.getItem('cosmicSurvivor_stats');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch (error) {
        console.warn('Failed to load persistent stats from localStorage:', error);
        return defaults;
    }
}

function savePersistentStats() {
    try {
        localStorage.setItem('cosmicSurvivor_stats', JSON.stringify(game.persistentStats));
    } catch (error) {
        console.warn('Failed to save persistent stats to localStorage:', error);
    }
}

function loadAchievements() {
    try {
        const saved = localStorage.getItem('cosmicSurvivor_achievements');
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.warn('Failed to load achievements from localStorage:', error);
        return [];
    }
}

function saveAchievements() {
    try {
        localStorage.setItem('cosmicSurvivor_achievements', JSON.stringify(game.achievements));
    } catch (error) {
        console.warn('Failed to save achievements to localStorage:', error);
    }
}

function loadHighScores() {
    try {
        const saved = localStorage.getItem('cosmicSurvivor_highScores');
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.warn('Failed to load high scores from localStorage:', error);
        return [];
    }
}

function saveHighScores() {
    try {
        localStorage.setItem('cosmicSurvivor_highScores', JSON.stringify(game.highScores));
    } catch (error) {
        console.warn('Failed to save high scores to localStorage:', error);
    }
}

// ==================== SOUND SYSTEM ====================
const Sound = {
    audioContext: null,
    
    getContext() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (error) {
                console.warn('AudioContext not supported:', error);
                // Return a comprehensive mock context to prevent errors
                const noop = () => {};
                const mockNode = {
                    connect: noop,
                    disconnect: noop,
                    start: noop,
                    stop: noop
                };
                this.audioContext = {
                    createOscillator: () => ({
                        ...mockNode,
                        type: '',
                        frequency: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop }
                    }),
                    createGain: () => ({
                        ...mockNode,
                        gain: { 
                            value: 0,
                            setValueAtTime: noop,
                            exponentialRampToValueAtTime: noop,
                            linearRampToValueAtTime: noop
                        }
                    }),
                    destination: mockNode,
                    currentTime: 0,
                    close: noop,
                    resume: () => Promise.resolve(),
                    suspend: () => Promise.resolve()
                };
            }
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
        try {
            localStorage.setItem('soundEnabled', game.soundEnabled);
        } catch (error) {
            console.warn('Failed to save sound preference:', error);
        }
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

function triggerLevelUp() {
    // Pause the game briefly for level-up choice
    game.paused = true;
    Sound.play('levelUp');
    screenShake(8);
    showNotification(`⬆️ LEVEL ${game.stats.level}!`, '#ffd93d', 3000);
    
    // Pick 3 random passives
    const available = PASSIVE_ABILITIES.filter(p => true); // All available
    const choices = [];
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(3, shuffled.length); i++) {
        choices.push(shuffled[i]);
    }
    
    game.levelUpChoices = choices;
    showLevelUpModal();
}

function showLevelUpModal() {
    // Remove existing if present
    const existing = document.getElementById('level-up-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'level-up-modal';
    modal.className = 'modal level-up-modal';
    modal.innerHTML = `
        <div class="modal-content level-up-content">
            <h2>⬆️ Level ${game.stats.level}!</h2>
            <p class="level-up-subtitle">Choose a passive ability:</p>
            <div class="level-up-choices">
                ${game.levelUpChoices.map((choice, i) => `
                    <div class="level-up-choice" data-index="${i}">
                        <h3>${choice.name}</h3>
                        <p>${choice.desc}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.getElementById('game-container').appendChild(modal);
    
    // Add click handlers
    modal.querySelectorAll('.level-up-choice').forEach(el => {
        el.addEventListener('click', () => {
            const index = parseInt(el.dataset.index);
            const chosen = game.levelUpChoices[index];
            chosen.apply(game.player);
            game.passivesChosen.push(chosen.id);
            
            showNotification(`${chosen.name} acquired!`, '#ffd93d', 2000);
            Sound.play('powerup');
            
            modal.remove();
            game.paused = false;
        });
    });
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

function checkWaveClear() {
    // Check if wave is cleared (all enemies defeated)
    if (game.enemies.length === 0 && game.state === 'playing' && game.timeLeft > CONFIG.WAVE_CLEAR_COUNTDOWN) {
        game.timeLeft = CONFIG.WAVE_CLEAR_COUNTDOWN;
        showNotification(`Wave Cleared! Shop opening in ${CONFIG.WAVE_CLEAR_COUNTDOWN}s...`, '#00ff88');
        Sound.play('powerup');
    }
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
        this.life = msToFrames(10000); // 10 seconds
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
    }

    update() {
        // Health regeneration (Medic ability)
        if (this.healthRegen && this.healthRegen > 0) {
            this.heal(this.healthRegen / CONFIG.TARGET_FPS); // Convert per-second to per-frame
        }
        
        // Adrenaline passive - bonus stats when below 50% HP
        let adrenalineBonus = 0;
        if (this.adrenaline > 0 && this.health < this.maxHealth * 0.5) {
            adrenalineBonus = this.adrenaline;
        }
        
        // Poison damage over time
        if (this.poisonTimer > 0) {
            this.health -= this.poisonDamage / CONFIG.TARGET_FPS;
            this.poisonTimer--;
            if (this.poisonTimer % 30 === 0) {
                createTextParticle(this.x, this.y, `☠️`, '#65a30d', 14);
            }
            if (this.health <= 0) gameOver();
        }
        
        // Dash update
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.dashInvulnerable > 0) this.dashInvulnerable--;
        
        if (this.isDashing) {
            this.x += this.dashVx;
            this.y += this.dashVy;
            this.x = Math.max(this.size, Math.min(CONFIG.CANVAS_WIDTH - this.size, this.x));
            this.y = Math.max(this.size, Math.min(CONFIG.CANVAS_HEIGHT - this.size, this.y));
            createParticles(this.x, this.y, '#4ecdc4', 2);
            this.isDashing = false;
        }
        
        // Apply powerup modifiers
        const speedMult = getPowerupMultiplier('speed');
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
                const nearest = game.enemies
                    .filter(e => Math.hypot(e.x - droneX, e.y - droneY) <= 300)
                    .sort((a, b) => Math.hypot(a.x - droneX, a.y - droneY) - Math.hypot(b.x - droneX, b.y - droneY))[0];
                
                if (nearest) {
                    const angle = Math.atan2(nearest.y - droneY, nearest.x - droneX);
                    // Create a simple drone bullet object with an update method
                    const droneBullet = {
                        x: droneX,
                        y: droneY,
                        angle,
                        speed: CONFIG.BULLET_SPEED,
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
                            
                            for (let i = game.enemies.length - 1; i >= 0; i--) {
                                const e = game.enemies[i];
                                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                                if (dist < e.size + this.size && !this.hitEnemies.includes(e)) {
                                    const killed = e.takeDamage(this.damage, false);
                                    this.hitEnemies.push(e);
                                    if (this.hitEnemies.length >= this.piercing) {
                                        return false;
                                    }
                                }
                            }
                            
                            return this.x >= 0 && this.x <= CONFIG.CANVAS_WIDTH && 
                                   this.y >= 0 && this.y <= CONFIG.CANVAS_HEIGHT;
                        },
                        draw(ctx) {
                            ctx.fillStyle = this.color;
                            ctx.beginPath();
                            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    };
                    game.bullets.push(droneBullet);
                    drone.shootCooldown = 60; // 1 second
                }
            }
            if (drone.shootCooldown > 0) drone.shootCooldown--;
        });
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
        // Dash invulnerability
        if (this.dashInvulnerable > 0) {
            createTextParticle(this.x, this.y, 'INVULNERABLE!', '#4ecdc4', 16);
            return;
        }
        
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
        
        // Thorns passive - reflect damage
        if (this.thorns > 0) {
            const thornsDamage = Math.floor(finalDamage * this.thorns);
            if (thornsDamage > 0) {
                // Find the nearest enemy and damage it
                const nearest = game.enemies.sort((a, b) => 
                    Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y)
                )[0];
                if (nearest) {
                    nearest.takeDamage(thornsDamage, false);
                    createTextParticle(nearest.x, nearest.y, `🌵${thornsDamage}`, '#65a30d', 14);
                }
            }
        }
        
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

    dash(dx, dy) {
        if (this.dashCooldown > 0) return;
        if (dx === 0 && dy === 0) return;
        
        const dist = Math.hypot(dx, dy);
        this.dashVx = (dx / dist) * CONFIG.DASH_DISTANCE / 4;
        this.dashVy = (dy / dist) * CONFIG.DASH_DISTANCE / 4;
        this.isDashing = true;
        this.dashCooldown = CONFIG.DASH_COOLDOWN;
        this.dashInvulnerable = CONFIG.DASH_INVULNERABLE_FRAMES;
        
        createParticles(this.x, this.y, '#4ecdc4', 15);
        Sound.play('powerup');
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
                
            case 'medic':
                // Medic: Cross emblem with healing aura
                ctx.fillStyle = '#ec4899';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                // Cross emblem
                ctx.fillStyle = '#dc2626';
                ctx.fillRect(this.x - this.size * 0.35, this.y - this.size * 0.1, this.size * 0.7, this.size * 0.2);
                ctx.fillRect(this.x - this.size * 0.1, this.y - this.size * 0.35, this.size * 0.2, this.size * 0.7);
                // Healing aura particles
                if (this.healthRegen > 0) {
                    const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
                    ctx.fillStyle = `rgba(134, 239, 172, ${pulse * 0.5})`;
                    for (let i = 0; i < 4; i++) {
                        const angle = (i / 4) * Math.PI * 2 + Date.now() * 0.002;
                        const dist = this.size * (1.2 + Math.sin(Date.now() * 0.003 + i) * 0.3);
                        ctx.beginPath();
                        ctx.arc(
                            this.x + Math.cos(angle) * dist,
                            this.y + Math.sin(angle) * dist,
                            this.size * 0.15,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();
                    }
                }
                break;
                
            case 'assassin':
                // Assassin: Hooded figure with shadow trail
                ctx.fillStyle = '#7c3aed';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a1a2e';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                // Hood
                ctx.fillStyle = '#581c87';
                ctx.beginPath();
                ctx.moveTo(this.x - this.size * 0.5, this.y - this.size * 0.8);
                ctx.lineTo(this.x, this.y - this.size * 0.9);
                ctx.lineTo(this.x + this.size * 0.5, this.y - this.size * 0.8);
                ctx.lineTo(this.x + this.size * 0.4, this.y - this.size * 0.3);
                ctx.lineTo(this.x - this.size * 0.4, this.y - this.size * 0.3);
                ctx.closePath();
                ctx.fill();
                // Shadow trail effect
                const shadowPulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.5;
                ctx.fillStyle = `rgba(88, 28, 135, ${shadowPulse * 0.4})`;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size * (1.2 + i * 0.2), 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'summoner':
                // Summoner: Floating orbs with mystical runes
                ctx.fillStyle = '#a855f7';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a1a2e';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                // Mystical runes
                ctx.strokeStyle = '#c084fc';
                ctx.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + Date.now() * 0.001;
                    const x = this.x + Math.cos(angle) * this.size * 0.3;
                    const y = this.y + Math.sin(angle) * this.size * 0.3;
                    ctx.beginPath();
                    ctx.moveTo(x, y - 3);
                    ctx.lineTo(x, y + 3);
                    ctx.moveTo(x - 3, y);
                    ctx.lineTo(x + 3, y);
                    ctx.stroke();
                }
                // Draw drones
                this.drones.forEach(drone => {
                    const orbitRadius = 60;
                    const droneX = this.x + Math.cos(drone.angle) * orbitRadius;
                    const droneY = this.y + Math.sin(drone.angle) * orbitRadius;
                    
                    ctx.fillStyle = '#a855f7';
                    ctx.beginPath();
                    ctx.arc(droneX, droneY, 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#c084fc';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    // Drone health bar
                    if (drone.health < drone.maxHealth) {
                        const barWidth = 16;
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                        ctx.fillRect(droneX - barWidth / 2, droneY - 12, barWidth, 2);
                        ctx.fillStyle = '#00ff88';
                        ctx.fillRect(droneX - barWidth / 2, droneY - 12, barWidth * (drone.health / drone.maxHealth), 2);
                    }
                });
                break;
                
            case 'juggernaut':
                // Juggernaut: Massive armored titan with glowing core
                ctx.fillStyle = '#d97706';
                // Larger outer armor
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.9, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#92400e';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                // Glowing core
                const corePulse = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
                ctx.fillStyle = `rgba(251, 191, 36, ${corePulse})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
                ctx.fill();
                // Armor plates
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 3;
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(this.x + Math.cos(angle) * this.size * 0.5, this.y + Math.sin(angle) * this.size * 0.5);
                    ctx.lineTo(this.x + Math.cos(angle) * this.size * 0.85, this.y + Math.sin(angle) * this.size * 0.85);
                    ctx.stroke();
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
            const diffSettings = game.difficultySettings || CONFIG.DIFFICULTY.normal;
            this.speed = (0.4 + Math.log2(1 + wave * 0.15)) * 0.4 * diffSettings.enemySpeedMult;
            this.maxHealth = (15 + wave * 3 + Math.pow(wave, 1.3)) * bossType.health * diffSettings.enemyHealthMult;
            this.health = this.maxHealth;
            this.damage = (4 + wave * 1.2 + Math.pow(wave, 1.1) * 0.3) * bossType.damage * diffSettings.enemyDamageMult;
            this.creditValue = Math.floor(bossType.credits * (diffSettings.creditMult || 1));
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
            const diffSettings = game.difficultySettings || CONFIG.DIFFICULTY.normal;
            this.speed = (1 + Math.log2(1 + wave * 0.3)) * enemyType.speed * diffSettings.enemySpeedMult;
            this.maxHealth = (15 + wave * 3 + Math.pow(wave, 1.3)) * enemyType.health * diffSettings.enemyHealthMult;
            this.health = this.maxHealth;
            this.damage = (4 + wave * 1.2 + Math.pow(wave, 1.1) * 0.3) * enemyType.damage * diffSettings.enemyDamageMult;
            this.creditValue = Math.floor((2 + wave * 0.8) * enemyType.credits * (diffSettings.creditMult || 1));
            this.color = enemyType.color;
            this.canTeleport = enemyType.canTeleport;
            this.isRanged = enemyType.ranged;
            this.canHeal = enemyType.heals;
            this.canSplit = enemyType.splits;
            this.canFreeze = enemyType.freezes;
            this.canEnrage = enemyType.enrages;
            this.teleportCooldown = 0;
            this.shootCooldown = 0;
            this.healCooldown = 0;
            this.enraged = false;
            this.splitGeneration = 0; // Track split depth to prevent infinite splitting
            
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
            if (this.summonCooldown > 0) this.summonCooldown--;
            if (this.teleportCooldown > 0) this.teleportCooldown--;
            if (this.resurrectCooldown > 0) this.resurrectCooldown--;
            if (this.earthquakeCooldown > 0) this.earthquakeCooldown--;
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

        if (this.teleportCooldown > 0) this.teleportCooldown--;
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.healCooldown > 0) this.healCooldown--;

        // Move toward player
        if (dist > (this.isRanged ? 200 : 0)) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
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

    takeDamage(amount, isCrit = false) {
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
        
        // XP gain
        const baseXP = this.isBoss ? (BOSS_TYPES[this.type]?.xp || 50) : (ENEMY_TYPES[this.type]?.xp || 1);
        const xpMult = game.difficultySettings?.xpMult || 1;
        const xpGain = Math.floor(baseXP * xpMult * (this.isElite ? 2 : 1));
        game.stats.xp += xpGain;
        game.stats.totalXpEarned += xpGain;
        
        // Check level up
        while (game.stats.xp >= game.stats.xpToNext) {
            game.stats.xp -= game.stats.xpToNext;
            game.stats.level++;
            game.stats.xpToNext = Math.floor(CONFIG.XP_BASE * Math.pow(CONFIG.XP_SCALING, game.stats.level - 1));
            triggerLevelUp();
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
            } else if (this.type === 'necromancer') {
                // Skeletal mage with staff and soul flames
                // Skeletal body
                ctx.strokeStyle = '#6b21a8';
                ctx.lineWidth = 4;
                
                // Staff
                ctx.beginPath();
                ctx.moveTo(this.x - this.size * 0.3, this.y + this.size * 0.8);
                ctx.lineTo(this.x - this.size * 0.3, this.y - this.size * 0.9);
                ctx.stroke();
                
                // Skull orb on staff
                ctx.fillStyle = '#8b5cf6';
                ctx.beginPath();
                ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.9, this.size * 0.25, 0, Math.PI * 2);
                ctx.fill();
                
                // Soul flames
                const soulPulse = Math.sin(Date.now() * 0.008) * 0.4 + 0.6;
                ctx.fillStyle = `rgba(167, 139, 250, ${soulPulse})`;
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2 + Date.now() * 0.003;
                    const dist = this.size * (1.1 + Math.sin(Date.now() * 0.005 + i) * 0.2);
                    const flameHeight = Math.sin(Date.now() * 0.01 + i) * this.size * 0.3;
                    ctx.beginPath();
                    ctx.moveTo(this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist);
                    ctx.lineTo(
                        this.x + Math.cos(angle) * dist,
                        this.y + Math.sin(angle) * dist - flameHeight
                    );
                    ctx.lineTo(
                        this.x + Math.cos(angle) * (dist + this.size * 0.1),
                        this.y + Math.sin(angle) * dist - flameHeight * 0.5
                    );
                    ctx.closePath();
                    ctx.fill();
                }
                
                // Resurrection visual effect
                if (this.resurrectCooldown < 60) {
                    const resurrectGlow = (60 - this.resurrectCooldown) / 60;
                    ctx.strokeStyle = `rgba(167, 139, 250, ${resurrectGlow})`;
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size * (1 + resurrectGlow * 0.5), 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else if (this.type === 'titan') {
                // Colossal golem with bronze color and glowing runes
                // Bronze armor segments
                ctx.fillStyle = '#92400e';
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y - this.size * 0.3 + i * this.size * 0.3, this.size * 0.9, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Glowing runes
                const runePulse = Math.sin(Date.now() * 0.006) * 0.4 + 0.6;
                ctx.fillStyle = `rgba(251, 191, 36, ${runePulse})`;
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const x = this.x + Math.cos(angle) * this.size * 0.6;
                    const y = this.y + Math.sin(angle) * this.size * 0.6;
                    
                    // Rune symbols
                    ctx.beginPath();
                    ctx.arc(x, y, this.size * 0.1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = `rgba(251, 191, 36, ${runePulse})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x - this.size * 0.08, y);
                    ctx.lineTo(x + this.size * 0.08, y);
                    ctx.moveTo(x, y - this.size * 0.08);
                    ctx.lineTo(x, y + this.size * 0.08);
                    ctx.stroke();
                }
                
                // Earthquake charging effect
                if (this.earthquakeCooldown < 60) {
                    const quakePulse = (60 - this.earthquakeCooldown) / 60;
                    ctx.strokeStyle = `rgba(251, 191, 36, ${quakePulse})`;
                    ctx.lineWidth = 6;
                    for (let i = 0; i < 3; i++) {
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.size * (1.2 + i * 0.3 + quakePulse * 0.5), 0, Math.PI * 2);
                        ctx.stroke();
                    }
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
                    
                case 'healer':
                    // Healer drone with healing aura and plus symbol
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Plus symbol
                    ctx.fillStyle = '#fff';
                    const crossSize = this.size * 0.6;
                    ctx.fillRect(this.x - crossSize / 2, this.y - crossSize * 0.15, crossSize, crossSize * 0.3);
                    ctx.fillRect(this.x - crossSize * 0.15, this.y - crossSize / 2, crossSize * 0.3, crossSize);
                    
                    // Glowing aura to make it stand out as high priority
                    const healGlow = Math.sin(Date.now() * 0.008) * 0.4 + 0.6;
                    ctx.strokeStyle = `rgba(34, 211, 238, ${healGlow})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size * 1.3, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    // Healing pulse rings
                    if (this.healCooldown < 30) {
                        const pulseRadius = this.size * (1.5 + (30 - this.healCooldown) / 30 * 3);
                        ctx.strokeStyle = `rgba(0, 255, 136, ${0.5 - (30 - this.healCooldown) / 60})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, pulseRadius, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    break;
                    
                case 'splitter':
                    // Gelatinous blob with internal cores visible
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Wobble effect
                    const wobble = Math.sin(Date.now() * 0.01) * 0.1 + 1;
                    ctx.fillStyle = 'rgba(251, 146, 60, 0.6)';
                    ctx.beginPath();
                    ctx.ellipse(this.x, this.y, this.size * 0.9 * wobble, this.size * 0.9 / wobble, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Internal cores
                    ctx.fillStyle = '#ea580c';
                    for (let i = 0; i < 3; i++) {
                        const angle = (i / 3) * Math.PI * 2 + Date.now() * 0.001;
                        const dist = this.size * 0.4;
                        ctx.beginPath();
                        ctx.arc(
                            this.x + Math.cos(angle) * dist,
                            this.y + Math.sin(angle) * dist,
                            this.size * 0.15,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();
                    }
                    break;
                    
                case 'freezer':
                    // Ice crystal entity with frost particles
                    ctx.fillStyle = this.color;
                    
                    // Crystal shape
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = (i / 6) * Math.PI * 2;
                        const radius = i % 2 === 0 ? this.size * 1.1 : this.size * 0.7;
                        const x = this.x + Math.cos(angle) * radius;
                        const y = this.y + Math.sin(angle) * radius;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    
                    // Inner glow
                    ctx.fillStyle = 'rgba(125, 211, 252, 0.6)';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Frost particles
                    const frostPulse = Math.sin(Date.now() * 0.006) * 0.3 + 0.7;
                    ctx.fillStyle = `rgba(186, 230, 253, ${frostPulse * 0.6})`;
                    for (let i = 0; i < 6; i++) {
                        const angle = (i / 6) * Math.PI * 2 + Date.now() * 0.003;
                        const dist = this.size * (1.3 + Math.sin(Date.now() * 0.005 + i) * 0.2);
                        ctx.beginPath();
                        ctx.arc(
                            this.x + Math.cos(angle) * dist,
                            this.y + Math.sin(angle) * dist,
                            this.size * 0.1,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();
                    }
                    break;
                    
                case 'berserker':
                    // Rage demon with flame effects
                    const berserkerColor = this.enraged ? '#ff0000' : this.color;
                    ctx.fillStyle = berserkerColor;
                    
                    // Demon body with horns
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Horns
                    ctx.fillStyle = '#7f1d1d';
                    ctx.beginPath();
                    ctx.moveTo(this.x - this.size * 0.6, this.y - this.size * 0.3);
                    ctx.lineTo(this.x - this.size * 0.4, this.y - this.size * 0.8);
                    ctx.lineTo(this.x - this.size * 0.2, this.y - this.size * 0.3);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(this.x + this.size * 0.6, this.y - this.size * 0.3);
                    ctx.lineTo(this.x + this.size * 0.4, this.y - this.size * 0.8);
                    ctx.lineTo(this.x + this.size * 0.2, this.y - this.size * 0.3);
                    ctx.fill();
                    
                    // Enraged effects
                    if (this.enraged) {
                        // Pulsing red aura
                        const ragePulse = Math.sin(Date.now() * 0.015) * 0.4 + 0.6;
                        ctx.strokeStyle = `rgba(255, 0, 0, ${ragePulse})`;
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.size * 1.4, 0, Math.PI * 2);
                        ctx.stroke();
                        
                        // Flame particles
                        ctx.fillStyle = `rgba(251, 146, 60, ${ragePulse * 0.7})`;
                        for (let i = 0; i < 8; i++) {
                            const angle = (i / 8) * Math.PI * 2 + Date.now() * 0.01;
                            const dist = this.size * (1.2 + Math.sin(Date.now() * 0.012 + i) * 0.3);
                            ctx.beginPath();
                            ctx.arc(
                                this.x + Math.cos(angle) * dist,
                                this.y + Math.sin(angle) * dist,
                                this.size * 0.15,
                                0,
                                Math.PI * 2
                            );
                            ctx.fill();
                        }
                        
                        // Angry eyes (red)
                        ctx.fillStyle = '#ff0000';
                        ctx.beginPath();
                        ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.2, this.size * 0.15, 0, Math.PI * 2);
                        ctx.arc(this.x + this.size * 0.3, this.y - this.size * 0.2, this.size * 0.15, 0, Math.PI * 2);
                        ctx.fill();
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
        
        // Elite indicator
        if (this.isElite && !this.isBoss) {
            ctx.strokeStyle = this.eliteModifier.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Elite name tag
            ctx.fillStyle = this.eliteModifier.color;
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.eliteModifier.name, this.x, this.y - this.size - 15);
        }
        
        // Health bar for all enemies
        if (this.health < this.maxHealth) {
            const barWidth = this.size * 2;
            const barHeight = 4;
            const barY = this.y - this.size - 8;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);
            
            const healthPercent = this.health / this.maxHealth;
            const healthColor = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffd93d' : '#ff6b6b';
            ctx.fillStyle = healthColor;
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
            
            // Elite shield bar
            if (this.isElite && this.eliteShield > 0 && this.eliteModifier?.hasShield) {
                const shieldMax = this.maxHealth * 0.3;
                ctx.fillStyle = '#60a5fa';
                ctx.fillRect(this.x - barWidth / 2, barY - 3, barWidth * (this.eliteShield / shieldMax), 2);
            }
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
                game.playerDPS.damage += finalDamage;
                
                if (this.explosion) {
                    this.explode();
                    return false;
                }
                
                if (enemy.takeDamage(finalDamage, isCrit)) {
                    game.enemies.splice(i, 1);
                    if (this.lifeSteal > 0) {
                        game.player.heal(Math.floor(finalDamage * this.lifeSteal));
                    }
                    
                    // Check if wave is cleared after enemy removal
                    checkWaveClear();
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
        
        // Check if wave is cleared after explosion
        checkWaveClear();
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
    showWaveAnnouncement();
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
                    if (t === 'healer') return game.wave >= 12;
                    if (t === 'splitter') return game.wave >= 15;
                    if (t === 'freezer') return game.wave >= 18;
                    if (t === 'berserker') return game.wave >= 20;
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
    
    const score = game.wave * 1000 + game.stats.enemiesKilled * 10 + game.stats.bossesDefeated * 500 + game.stats.level * 200;
    game.highScores.push({ wave: game.wave, score, difficulty: game.difficulty, timestamp: Date.now() });
    game.highScores.sort((a, b) => b.score - a.score);
    game.highScores = game.highScores.slice(0, 10);
    saveHighScores();
    
    document.getElementById('game-over-modal').classList.remove('hidden');
    document.getElementById('final-wave').textContent = game.wave;
    
    const avgDPS = getAverageDPS();
    const survivalTime = game.wave * CONFIG.WAVE_DURATION;
    const minutes = Math.floor(survivalTime / 60);
    const seconds = survivalTime % 60;
    
    const stats = document.getElementById('final-stats');
    stats.innerHTML = `
        <h3>📊 Mission Report</h3>
        <div class="final-stats-grid">
            <div class="stat-group">
                <h4>⚔️ Combat</h4>
                <p>🌊 Waves Survived: ${game.wave}</p>
                <p>👾 Enemies Eliminated: ${game.stats.enemiesKilled}</p>
                <p>👹 Bosses Defeated: ${game.stats.bossesDefeated}</p>
                <p>⭐ Elites Slain: ${game.eliteKills}</p>
                <p>💥 Total Damage: ${game.stats.damageDealt.toLocaleString()}</p>
                <p>📊 Avg DPS: ${avgDPS}</p>
            </div>
            <div class="stat-group">
                <h4>📈 Progression</h4>
                <p>⬆️ Level Reached: ${game.stats.level}</p>
                <p>🎯 Difficulty: ${game.difficulty.charAt(0).toUpperCase() + game.difficulty.slice(1)}</p>
                <p>⏱️ Survival Time: ${minutes}m ${seconds}s</p>
                <p>❤️ Damage Taken: ${game.stats.damageTaken.toLocaleString()}</p>
                <p>💰 Credits Earned: ${game.credits}</p>
                <p>🎭 Character: ${game.selectedCharacter?.name || 'Unknown'}</p>
            </div>
        </div>
        <div class="passives-summary">
            <h4>🔮 Passives Acquired (${game.passivesChosen.length})</h4>
            <p>${game.passivesChosen.length > 0 ? game.passivesChosen.map(id => {
                const p = PASSIVE_ABILITIES.find(a => a.id === id);
                return p ? p.name : id;
            }).join(', ') : 'None'}</p>
        </div>
        <p class="score-display">🏆 Score: ${score.toLocaleString()}</p>
    `;
    
    const title = document.getElementById('game-over-title');
    if (game.wave >= 20) {
        title.textContent = '🌟 LEGENDARY SURVIVOR! 🌟';
    } else if (game.wave >= 10) {
        title.textContent = '🏆 Mission Success! 🏆';
    } else if (game.wave >= 5) {
        title.textContent = '⚔️ Valiant Effort ⚔️';
    } else {
        title.textContent = '💀 Mission Failed 💀';
    }
}

function restartGame() {
    document.getElementById('game-over-modal').classList.add('hidden');
    // Remove level up modal if present
    const levelUpModal = document.getElementById('level-up-modal');
    if (levelUpModal) levelUpModal.remove();
    
    // Reset new systems
    game.stats.xp = 0;
    game.stats.level = 1;
    game.stats.xpToNext = CONFIG.XP_BASE;
    game.stats.totalXpEarned = 0;
    game.levelUpChoices = [];
    game.passivesChosen = [];
    game.playerDPS = { damage: 0, timer: 0, history: [] };
    game.eliteKills = 0;
    
    game.state = 'characterSelect';
    showDifficultySelect();
}

// ==================== UI & NOTIFICATIONS ====================
// Track last UI values to avoid unnecessary DOM updates
const lastUIValues = {
    wave: -1,
    timeLeft: -1,
    credits: -1,
    health: -1,
    maxHealth: -1
};

function updateUI() {
    // Only update wave if it changed
    if (lastUIValues.wave !== game.wave) {
        document.getElementById('wave-number').textContent = game.wave;
        lastUIValues.wave = game.wave;
    }
    
    // Only update time if it changed (rounded)
    const timeLeft = Math.ceil(game.timeLeft);
    if (lastUIValues.timeLeft !== timeLeft) {
        document.getElementById('time-left').textContent = timeLeft;
        lastUIValues.timeLeft = timeLeft;
    }
    
    // Only update credits if they changed
    if (lastUIValues.credits !== game.credits) {
        document.getElementById('credit-amount').textContent = game.credits;
        lastUIValues.credits = game.credits;
    }
    
    // Only update health if it changed (rounded)
    const health = Math.ceil(game.player.health);
    if (lastUIValues.health !== health || lastUIValues.maxHealth !== game.player.maxHealth) {
        const healthPercent = (game.player.health / game.player.maxHealth) * 100;
        const healthBar = document.getElementById('health-bar');
        healthBar.style.width = healthPercent + '%';
        document.getElementById('health-text').textContent = `${health} / ${game.player.maxHealth}`;
        lastUIValues.health = health;
        lastUIValues.maxHealth = game.player.maxHealth;
        
        // Low health warning effect
        const healthContainer = document.getElementById('health-bar-container');
        if (healthPercent <= 25) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
            healthContainer.style.boxShadow = `0 0 ${20 + pulse * 10}px rgba(255, 0, 0, ${0.5 + pulse * 0.5})`;
        } else {
            healthContainer.style.boxShadow = '';
        }
    }
}

// ==================== TOUCH CONTROLS ====================
function setupTouchControls() {
    const canvas = game.canvas;
    
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = getTouchPos(touch);
        
        if (pos.x < CONFIG.CANVAS_WIDTH / 2) {
            game.joystick.active = true;
            game.joystick.startX = pos.x;
            game.joystick.startY = pos.y;
        }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (!game.joystick.active) return;
        
        const touch = e.touches[0];
        const pos = getTouchPos(touch);
        
        const dx = pos.x - game.joystick.startX;
        const dy = pos.y - game.joystick.startY;
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
    
    // Outer circle with pulse effect for better visibility
    const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 0.35;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#4ecdc4';
    ctx.beginPath();
    ctx.arc(startX, startY, 50, 0, Math.PI * 2);
    ctx.fill();
    
    // Outer ring for better definition
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(startX, startY, 50, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner control stick with radial gradient for glow effect (more performant than shadow)
    const gradient = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 30);
    gradient.addColorStop(0, '#00ff88');
    gradient.addColorStop(0.7, '#00ff88');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
    
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Solid center
    ctx.globalAlpha = 1;
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
        const timeLeft = Math.ceil(p.timeLeft / CONFIG.TARGET_FPS);
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
    const weapon = WEAPON_TYPES[game.currentWeapon];
    const weaponName = weapon.name;
    ctx.fillText(`Current Weapon: ${weaponName}`, CONFIG.CANVAS_WIDTH / 2, menuY + 250);
    
    // Player stats in pause
    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    ctx.fillText(`Level: ${game.stats.level} | DPS: ${getAverageDPS()} | Difficulty: ${game.difficulty}`, CONFIG.CANVAS_WIDTH / 2, menuY + 270);
    
    // Active powerups
    if (game.activePowerups.length > 0) {
        ctx.fillStyle = '#ffd93d';
        ctx.font = '16px monospace';
        ctx.fillText('Active Powerups:', CONFIG.CANVAS_WIDTH / 2, menuY + 290);
        game.activePowerups.forEach((p, i) => {
            ctx.fillStyle = p.data.color;
            const timeLeft = Math.ceil(p.timeLeft / CONFIG.TARGET_FPS);
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
    const weapons = ['basic', 'laser', 'rocket', 'spread', 'flamethrower', 'lightning', 'freeze', 'plasma'];
    const x = CONFIG.CANVAS_WIDTH - 350;
    const y = CONFIG.CANVAS_HEIGHT - 45;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, 340, 38);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 340, 38);
    
    weapons.forEach((weapon, i) => {
        const wx = x + 5 + i * 42;
        const wy = y + 5;
        
        if (game.currentWeapon === weapon) {
            ctx.fillStyle = WEAPON_TYPES[weapon].color;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(wx, wy, 38, 28);
            ctx.globalAlpha = 1;
        }
        
        ctx.strokeStyle = game.currentWeapon === weapon ? WEAPON_TYPES[weapon].color : '#475569';
        ctx.lineWidth = game.currentWeapon === weapon ? 2 : 1;
        ctx.strokeRect(wx, wy, 38, 28);
        
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, wx + 19, wy + 12);
        
        ctx.fillStyle = WEAPON_TYPES[weapon].color;
        ctx.font = '10px monospace';
        ctx.fillText(WEAPON_TYPES[weapon].name.split(' ')[0], wx + 19, wy + 24);
    });
    
    ctx.restore();
}

function drawMinimap(ctx) {
    const size = CONFIG.MINIMAP_SIZE;
    const margin = CONFIG.MINIMAP_MARGIN;
    const x = CONFIG.CANVAS_WIDTH - size - margin;
    const y = CONFIG.CANVAS_HEIGHT - size - margin;
    const scaleX = size / CONFIG.CANVAS_WIDTH;
    const scaleY = size / CONFIG.CANVAS_HEIGHT;
    
    // Background
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
    
    // Player dot
    ctx.fillStyle = '#4ecdc4';
    ctx.beginPath();
    ctx.arc(x + game.player.x * scaleX, y + game.player.y * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Enemy dots
    game.enemies.forEach(e => {
        if (e.isBoss) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(x + e.x * scaleX, y + e.y * scaleY, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (e.isElite) {
            ctx.fillStyle = e.eliteModifier?.color || '#ffd93d';
            ctx.beginPath();
            ctx.arc(x + e.x * scaleX, y + e.y * scaleY, 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#ff6b6b';
            ctx.fillRect(x + e.x * scaleX - 1, y + e.y * scaleY - 1, 2, 2);
        }
    });
    
    // Powerup dots
    game.powerups.forEach(p => {
        ctx.fillStyle = p.data.color;
        ctx.beginPath();
        ctx.arc(x + p.x * scaleX, y + p.y * scaleY, 2, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.restore();
}

function drawXPBar(ctx) {
    const barWidth = 300;
    const barHeight = 8;
    const x = CONFIG.CANVAS_WIDTH / 2 - barWidth / 2;
    const y = CONFIG.CANVAS_HEIGHT - 25;
    
    ctx.save();
    ctx.globalAlpha = 0.7;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // XP progress
    const xpPercent = game.stats.xp / game.stats.xpToNext;
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(x, y, barWidth * xpPercent, barHeight);
    
    // Border
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);
    
    // Level text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 1;
    ctx.fillText(`Lv.${game.stats.level}`, x + barWidth / 2, y - 5);
    
    ctx.restore();
}

function drawDashIndicator(ctx) {
    if (!game.player) return;
    const x = 20;
    const y = CONFIG.CANVAS_HEIGHT - 50;
    
    ctx.save();
    ctx.globalAlpha = 0.8;
    
    const ready = game.player.dashCooldown <= 0;
    const progress = ready ? 1 : 1 - (game.player.dashCooldown / CONFIG.DASH_COOLDOWN);
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, 100, 30);
    
    // Progress bar
    ctx.fillStyle = ready ? '#4ecdc4' : '#334155';
    ctx.fillRect(x, y, 100 * progress, 30);
    
    // Border
    ctx.strokeStyle = ready ? '#4ecdc4' : '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 100, 30);
    
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ready ? '⚡ DASH' : `⚡ ${(game.player.dashCooldown / CONFIG.TARGET_FPS).toFixed(1)}s`, x + 50, y + 20);
    
    ctx.restore();
}

function updateDPS() {
    const now = Date.now();
    if (game.playerDPS.timer === 0) game.playerDPS.timer = now;
    
    const elapsed = (now - game.playerDPS.timer) / 1000;
    if (elapsed >= 1) {
        game.playerDPS.history.push(game.playerDPS.damage);
        if (game.playerDPS.history.length > 10) game.playerDPS.history.shift();
        game.playerDPS.damage = 0;
        game.playerDPS.timer = now;
    }
}

function getAverageDPS() {
    if (game.playerDPS.history.length === 0) return 0;
    return Math.floor(game.playerDPS.history.reduce((a, b) => a + b, 0) / game.playerDPS.history.length);
}

function drawDPSMeter(ctx) {
    const dps = getAverageDPS();
    if (dps === 0) return;
    
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`DPS: ${dps}`, CONFIG.CANVAS_WIDTH - 20, 40);
    ctx.restore();
}

function showWaveAnnouncement() {
    const isBoss = game.wave % CONFIG.BOSS_WAVE_INTERVAL === 0;
    
    if (isBoss) {
        const bossTypes = Object.keys(BOSS_TYPES);
        const bossType = bossTypes[Math.floor(game.wave / CONFIG.BOSS_WAVE_INTERVAL) % bossTypes.length];
        const boss = BOSS_TYPES[bossType];
        showNotification(`⚠️ BOSS WAVE ${game.wave}: ${boss.name} ⚠️`, '#ff0000', 3000);
    } else {
        const enemyCount = 5 + game.wave * 3;
        const availableTypes = Object.keys(ENEMY_TYPES).filter(t => {
            if (t === 'tank') return game.wave >= 3;
            if (t === 'swarm') return game.wave >= 5;
            if (t === 'teleporter') return game.wave >= 7;
            if (t === 'shooter') return game.wave >= 10;
            if (t === 'healer') return game.wave >= 12;
            if (t === 'splitter') return game.wave >= 15;
            if (t === 'freezer') return game.wave >= 18;
            if (t === 'berserker') return game.wave >= 20;
            return true;
        });
        
        const newType = availableTypes.find(t => {
            const unlockWaves = { tank: 3, swarm: 5, teleporter: 7, shooter: 10, healer: 12, splitter: 15, freezer: 18, berserker: 20 };
            return unlockWaves[t] === game.wave;
        });
        
        let msg = `Wave ${game.wave}: ${enemyCount} enemies`;
        if (newType) {
            msg += ` | NEW: ${ENEMY_TYPES[newType].color ? '🆕' : ''} ${newType.charAt(0).toUpperCase() + newType.slice(1)}!`;
        }
        showNotification(msg, '#00ff88', 2500);
    }
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
    // Use timestamp divided by ~33ms (approximately 30 FPS) for consistent rendering pattern
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
                
                // Check collision with player
                const distPlayer = Math.hypot(game.player.x - b.x, game.player.y - b.y);
                if (distPlayer < game.player.size + b.size) {
                    game.player.takeDamage(b.damage);
                    return false;
                }
                
                // Check collision with drones (Summoner ability)
                if (game.player.drones && game.player.drones.length > 0) {
                    for (let i = 0; i < game.player.drones.length; i++) {
                        const drone = game.player.drones[i];
                        const orbitRadius = 60;
                        const droneX = game.player.x + Math.cos(drone.angle) * orbitRadius;
                        const droneY = game.player.y + Math.sin(drone.angle) * orbitRadius;
                        const distDrone = Math.hypot(droneX - b.x, droneY - b.y);
                        
                        if (distDrone < 8 + b.size) {
                            drone.health -= b.damage;
                            createParticles(droneX, droneY, '#a855f7', 5);
                            if (drone.health <= 0) {
                                createTextParticle(droneX, droneY, 'DESTROYED!', '#ff6b6b', 14);
                            }
                            return false;
                        }
                    }
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
        drawMinimap(game.ctx);
        drawXPBar(game.ctx);
        drawDashIndicator(game.ctx);
        drawDPSMeter(game.ctx);
        updateDPS();
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

// Canvas scaling and responsiveness
let canvasScale = 1;
let canvasOffsetX = 0;
let canvasOffsetY = 0;

function resizeCanvas() {
    const canvas = game.canvas;
    const container = document.getElementById('game-container');
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate scale to fit canvas while maintaining aspect ratio
    const scaleX = containerWidth / CONFIG.CANVAS_WIDTH;
    const scaleY = containerHeight / CONFIG.CANVAS_HEIGHT;
    canvasScale = Math.min(scaleX, scaleY);
    
    // Apply scaling via CSS
    const scaledWidth = CONFIG.CANVAS_WIDTH * canvasScale;
    const scaledHeight = CONFIG.CANVAS_HEIGHT * canvasScale;
    
    canvas.style.width = scaledWidth + 'px';
    canvas.style.height = scaledHeight + 'px';
    
    // Center the canvas
    canvasOffsetX = (containerWidth - scaledWidth) / 2;
    canvasOffsetY = (containerHeight - scaledHeight) / 2;
    
    canvas.style.marginLeft = canvasOffsetX + 'px';
    canvas.style.marginTop = canvasOffsetY + 'px';
}

// Convert touch coordinates to canvas coordinates
function getTouchPos(touch) {
    const canvas = game.canvas;
    const rect = canvas.getBoundingClientRect();
    return {
        x: (touch.clientX - rect.left) / canvasScale,
        y: (touch.clientY - rect.top) / canvasScale
    };
}

// Loading screen management
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = loadingScreen.querySelector('.loading-text');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, 300);
        }
        loadingBar.style.width = progress + '%';
        
        if (progress < 30) {
            loadingText.textContent = 'Loading assets...';
        } else if (progress < 60) {
            loadingText.textContent = 'Initializing game...';
        } else if (progress < 90) {
            loadingText.textContent = 'Almost ready...';
        } else {
            loadingText.textContent = 'Ready!';
        }
    }, 100);
}

// Orientation detection
function checkOrientation() {
    const rotateMessage = document.getElementById('rotate-message');
    // Allow both portrait and landscape mode
    // Only show rotate message if element exists (for backwards compatibility)
    if (rotateMessage) {
        rotateMessage.classList.add('hidden');
    }
}

// Pause functionality
function togglePause() {
    if (game.state !== 'playing') return;
    
    game.paused = !game.paused;
    const pauseOverlay = document.getElementById('pause-overlay');
    
    if (game.paused) {
        pauseOverlay.classList.add('active');
    } else {
        pauseOverlay.classList.remove('active');
    }
}

// Visibility change handler
function handleVisibilityChange() {
    if (document.hidden && game.state === 'playing' && !game.paused) {
        togglePause();
    }
}

function showDifficultySelect() {
    const existing = document.getElementById('difficulty-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'difficulty-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>⚙️ Select Difficulty</h2>
            <div class="difficulty-list">
                <div class="difficulty-card" data-diff="easy">
                    <h3>🟢 Easy</h3>
                    <p>Enemies are weaker, more credits earned</p>
                    <div class="diff-stats">-30% Enemy HP, -40% Enemy Damage, +30% Credits</div>
                </div>
                <div class="difficulty-card" data-diff="normal">
                    <h3>🟡 Normal</h3>
                    <p>The intended experience</p>
                    <div class="diff-stats">Standard enemies and rewards</div>
                </div>
                <div class="difficulty-card" data-diff="hard">
                    <h3>🔴 Hard</h3>
                    <p>For experienced survivors</p>
                    <div class="diff-stats">+40% Enemy HP, +30% Enemy Damage, -15% Credits</div>
                </div>
                <div class="difficulty-card" data-diff="nightmare">
                    <h3>💀 Nightmare</h3>
                    <p>Only the strongest survive</p>
                    <div class="diff-stats">+100% Enemy HP, +60% Enemy Damage, -30% Credits</div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('game-container').appendChild(modal);
    
    modal.querySelectorAll('.difficulty-card').forEach(el => {
        el.addEventListener('click', () => {
            game.difficulty = el.dataset.diff;
            game.difficultySettings = CONFIG.DIFFICULTY[game.difficulty];
            modal.remove();
            document.getElementById('character-select-modal').classList.remove('hidden');
        });
    });
}

function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    
    // Initialize loading screen
    showLoadingScreen();
    
    // Initialize visual systems
    initStarfield();
    
    // Setup canvas scaling with debouncing
    resizeCanvas();
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeCanvas();
            checkOrientation();
        }, 100); // Debounce for 100ms
    });
    
    // Check orientation on load
    checkOrientation();
    window.addEventListener('orientationchange', checkOrientation);
    
    // Setup visibility change handler
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
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
                <span>🔫 ${Math.round(60 / char.fireRate * 10) / 10}/s</span>
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
        showDifficultySelect();
    });
    
    document.getElementById('next-wave-btn').addEventListener('click', nextWave);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    
    // Pause button
    const pauseBtn = document.getElementById('pause-btn');
    pauseBtn.addEventListener('click', togglePause);
    
    // Resume button
    const resumeBtn = document.getElementById('resume-btn');
    resumeBtn.addEventListener('click', togglePause);
    
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
    
    // Dash ability
    if (e.key === ' ' && game.state === 'playing' && !game.paused && game.player) {
        let dx = 0, dy = 0;
        if (game.keys['w'] || game.keys['ArrowUp']) dy -= 1;
        if (game.keys['s'] || game.keys['ArrowDown']) dy += 1;
        if (game.keys['a'] || game.keys['ArrowLeft']) dx -= 1;
        if (game.keys['d'] || game.keys['ArrowRight']) dx += 1;
        
        // Default dash direction: toward nearest enemy if no movement keys
        if (dx === 0 && dy === 0 && game.enemies.length > 0) {
            const nearest = game.enemies.sort((a, b) => 
                Math.hypot(a.x - game.player.x, a.y - game.player.y) - Math.hypot(b.x - game.player.x, b.y - game.player.y)
            )[0];
            dx = nearest.x - game.player.x;
            dy = nearest.y - game.player.y;
        }
        
        game.player.dash(dx, dy);
        e.preventDefault();
    }
    
    // Weapon switching
    if (game.state === 'playing' && !game.paused) {
        const weapons = ['basic', 'laser', 'rocket', 'spread', 'flamethrower', 'lightning', 'freeze', 'plasma'];
        if (e.key >= '1' && e.key <= '8') {
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
