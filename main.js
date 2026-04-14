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
    normal: { name: '👾 Grunt', color: '#a855f7', speed: 1, health: 1, damage: 1, credits: 1, xp: 1,
        movementPattern: 'wander',
        palette: { body: '#a855f7', core: '#e9d5ff', glow: '#c084fc', accent: '#7c3aed' } },
    fast: { name: '⚡ Stalker', color: '#ff6b6b', speed: 1.5, health: 0.5, damage: 0.8, credits: 1.2, xp: 1.1,
        movementPattern: 'zigzag',
        palette: { body: '#ff6b6b', core: '#fef2f2', glow: '#f87171', accent: '#dc2626' } },
    tank: { name: '💎 Golem', color: '#10b981', speed: 0.5, health: 2.5, damage: 1.4, credits: 2, xp: 1.5,
        movementPattern: 'chase',
        palette: { body: '#10b981', core: '#6ee7b7', glow: '#34d399', accent: '#065f46' } },
    swarm: { name: '🦟 Drone', color: '#f59e0b', speed: 1.2, health: 0.3, damage: 0.4, credits: 0.5, xp: 0.4, size: 0.55,
        movementPattern: 'orbit',
        palette: { body: '#f59e0b', core: '#fef3c7', glow: '#fbbf24', accent: '#b45309' } },
    teleporter: { name: '🌀 Warper', color: '#8b5cf6', speed: 0.7, health: 0.9, damage: 1.1, credits: 1.5, xp: 1.3, canTeleport: true,
        movementPattern: 'phase',
        palette: { body: '#8b5cf6', core: '#c4b5fd', glow: '#a78bfa', accent: '#6d28d9' } },
    shooter: { name: '🎯 Marksman', color: '#ec4899', speed: 0.4, health: 0.75, damage: 1.0, credits: 1.8, xp: 1.4, ranged: true,
        movementPattern: 'strafe',
        palette: { body: '#ec4899', core: '#fce7f3', glow: '#f472b6', accent: '#be185d' } },
    healer: { name: '✨ Oracle', color: '#22d3ee', speed: 0.6, health: 1.1, damage: 0.5, credits: 2.5, xp: 2, heals: true,
        movementPattern: 'flee',
        palette: { body: '#22d3ee', core: '#cffafe', glow: '#67e8f9', accent: '#0891b2' } },
    splitter: { name: '🧬 Mitotic', color: '#fb923c', speed: 0.85, health: 1.2, damage: 1.0, credits: 2.2, xp: 1.8, splits: 3,
        movementPattern: 'wander',
        palette: { body: '#fb923c', core: '#fed7aa', glow: '#fdba74', accent: '#c2410c' } },
    freezer: { name: '❄️ Cryo', color: '#38bdf8', speed: 0.7, health: 1.0, damage: 0.8, credits: 2, xp: 1.5, freezes: true,
        movementPattern: 'chase',
        palette: { body: '#38bdf8', core: '#e0f2fe', glow: '#7dd3fc', accent: '#0284c7' } },
    berserker: { name: '👹 Ravager', color: '#dc2626', speed: 1.0, health: 1.5, damage: 1.6, credits: 2.3, xp: 2, enrages: true,
        movementPattern: 'lunge',
        palette: { body: '#dc2626', core: '#fecaca', glow: '#f87171', accent: '#991b1b' } },
    bomber: { name: '💣 Detonator', color: '#ff3300', speed: 0.75, health: 0.8, damage: 1.0, credits: 2.5, xp: 2.2, explodes: true,
        movementPattern: 'dash',
        palette: { body: '#ff3300', core: '#ff9966', glow: '#ff6633', accent: '#cc2900' } },
    parasite: { name: '🦠 Leech', color: '#84cc16', speed: 1.15, health: 0.5, damage: 0.6, credits: 1.8, xp: 1.6, drains: true,
        movementPattern: 'orbit',
        palette: { body: '#84cc16', core: '#d9f99d', glow: '#a3e635', accent: '#4d7c0f' } },
    shielder: { name: '🛡️ Sentinel', color: '#6366f1', speed: 0.55, health: 1.6, damage: 0.8, credits: 2.8, xp: 2.5, shields: true,
        movementPattern: 'chase',
        palette: { body: '#6366f1', core: '#c7d2fe', glow: '#818cf8', accent: '#4338ca' } },
    necro: { name: '💀 Wraith', color: '#78716c', speed: 0.65, health: 1.3, damage: 1.2, credits: 3.0, xp: 2.8, revives: true,
        movementPattern: 'flee',
        palette: { body: '#78716c', core: '#d6d3d1', glow: '#a8a29e', accent: '#44403c' } },
};

// Boss types
const BOSS_TYPES = {
    destroyer: { name: '👹 Destroyer', color: '#dc2626', size: 2.4, health: 12, damage: 2.5, credits: 100, xp: 50,
        palette: { body: '#dc2626', core: '#fecaca', glow: '#ff0000', accent: '#991b1b', wing: '#7f1d1d' } },
    broodmother: { name: '🕷️ Brood Mother', color: '#7c2d12', size: 2.8, health: 10, damage: 1.8, credits: 120, xp: 60, summons: true,
        palette: { body: '#7c2d12', core: '#d97706', glow: '#f59e0b', accent: '#451a03', wing: '#a16207' } },
    voidwalker: { name: '👻 Void Walker', color: '#581c87', size: 2.2, health: 8, damage: 2.2, credits: 150, xp: 70, teleports: true,
        palette: { body: '#581c87', core: '#a78bfa', glow: '#8b5cf6', accent: '#3b0764', wing: '#7c3aed' } },
    necromancer: { name: '💀 Necromancer', color: '#4c1d95', size: 2.6, health: 11, damage: 2.0, credits: 180, xp: 80, resurrects: true,
        palette: { body: '#4c1d95', core: '#a78bfa', glow: '#8b5cf6', accent: '#2e1065', wing: '#6d28d9' } },
    titan: { name: '⚡ Titan', color: '#b91c1c', size: 3.2, health: 16, damage: 3.5, credits: 200, xp: 100, earthquake: true,
        palette: { body: '#b91c1c', core: '#fbbf24', glow: '#f59e0b', accent: '#7f1d1d', wing: '#92400e' } },
    hivemind: { name: '🧠 Hivemind', color: '#7e22ce', size: 2.5, health: 14, damage: 1.5, credits: 220, xp: 90, commands: true,
        palette: { body: '#7e22ce', core: '#d8b4fe', glow: '#c084fc', accent: '#581c87', wing: '#a855f7' } },
    leviathan: { name: '🐉 Leviathan', color: '#0f766e', size: 3.5, health: 20, damage: 3.0, credits: 280, xp: 120, charges: true,
        palette: { body: '#0f766e', core: '#5eead4', glow: '#2dd4bf', accent: '#134e4a', wing: '#14b8a6' } },
};

// Elite enemy modifiers - rare empowered enemies
const ELITE_MODIFIERS = {
    vampiric: { name: '🧛 Vampiric', color: '#991b1b', healthMult: 1.5, damageMult: 1.2, speedMult: 1.0, healsOnHit: true, creditMult: 2.5, xpMult: 2.5 },
    shielded: { name: '🛡️ Shielded', color: '#1e40af', healthMult: 2.0, damageMult: 1.0, speedMult: 0.9, hasShield: true, creditMult: 2.0, xpMult: 2.0 },
    enraged: { name: '🔥 Enraged', color: '#ea580c', healthMult: 1.2, damageMult: 1.8, speedMult: 1.3, creditMult: 2.5, xpMult: 2.5 },
    toxic: { name: '☠️ Toxic', color: '#65a30d', healthMult: 1.3, damageMult: 1.0, speedMult: 1.0, poisonOnHit: true, creditMult: 2.0, xpMult: 2.0 },
    ghostly: { name: '👻 Ghostly', color: '#94a3b8', healthMult: 0.8, damageMult: 1.5, speedMult: 1.4, phasing: true, creditMult: 3.0, xpMult: 3.0 },
    thorned: { name: '🌵 Thorned', color: '#166534', healthMult: 1.6, damageMult: 1.0, speedMult: 0.85, reflectDamage: 0.25, creditMult: 2.5, xpMult: 2.5 },
    arcane: { name: '🔮 Arcane', color: '#7e22ce', healthMult: 1.1, damageMult: 1.4, speedMult: 1.1, aoeAttack: true, creditMult: 3.0, xpMult: 3.0 },
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
    { id: 'scavenger', name: '🧲 Scavenger', desc: '+25 Pickup Range', apply: p => { p.pickupRange += 25; } },
    { id: 'regeneration', name: '💊 Regeneration', desc: '+0.3 HP/s Regen', apply: p => { p.healthRegen = (p.healthRegen || 0) + 0.3; } },
    { id: 'adrenaline', name: '💉 Adrenaline', desc: '+0.5 Speed when below 50% HP', apply: p => { p.adrenaline = (p.adrenaline || 0) + 1; } },
    { id: 'thorns', name: '🌵 Thorns', desc: 'Reflect 20% melee damage back', apply: p => { p.thorns = (p.thorns || 0) + 0.2; } },
];

// Transformative items - game-changing abilities offered at level-up
const TRANSFORMATIVE_ITEMS = [
    // Offensive
    { id: 'ricochet_rounds', name: '🏀 Ricochet Rounds', desc: 'Bullets bounce off walls 3 times', category: 'offensive',
      apply: p => { p.bulletBounce = (p.bulletBounce || 0) + 3; } },
    { id: 'homing_tears', name: '🎯 Homing Tears', desc: 'Projectiles curve toward enemies', category: 'offensive',
      apply: p => { p.homingStrength = (p.homingStrength || 0) + 0.03; } },
    { id: 'explosive_finale', name: '💥 Explosive Finale', desc: 'Kills cause 60px explosions', category: 'offensive',
      apply: p => { p.explosiveFinale = true; p.explosionRadius = (p.explosionRadius || 0) + 60; } },
    { id: 'chain_lightning', name: '⚡ Chain Lightning', desc: '20% chance hits arc to another enemy', category: 'offensive',
      apply: p => { p.chainLightningChance = (p.chainLightningChance || 0) + 0.2; } },
    { id: 'orbital_blades', name: '🔵 Orbital Blades', desc: '+2 orbiting blades deal contact damage', category: 'offensive',
      apply: p => { p.orbitalCount = (p.orbitalCount || 0) + 2; } },
    { id: 'toxic_trail', name: '☠️ Toxic Trail', desc: 'Leave poison clouds when moving', category: 'offensive',
      apply: p => { p.fireTrail = true; p.poisonCloudDmg = (p.poisonCloudDmg || 0) + 3; } },
    { id: 'mirror_shot', name: '🪞 Mirror Shot', desc: 'Bullets spawn a reverse copy', category: 'offensive',
      apply: p => { p.mirrorShot = true; } },
    { id: 'piercing_rounds', name: '🗡️ Piercing Rounds', desc: 'Bullets pierce +2 enemies', category: 'offensive',
      apply: p => { p.extraPiercing = (p.extraPiercing || 0) + 2; } },
    { id: 'berserker_soul', name: '🔥 Berserker Soul', desc: '+40% damage when below 40% HP', category: 'offensive',
      apply: p => { p.berserkerSoul = (p.berserkerSoul || 0) + 0.4; } },
    
    // Defensive
    { id: 'second_wind', name: '💨 Second Wind', desc: 'Revive once with 30% HP on death', category: 'defensive',
      apply: p => { p.secondWind = true; } },
    { id: 'thorns_aura', name: '🌵 Thorns Aura', desc: 'Nearby enemies take 5 DPS', category: 'defensive',
      apply: p => { p.thornsAuraDmg = (p.thornsAuraDmg || 0) + 5; } },
    { id: 'phase_shift', name: '👻 Phase Shift', desc: '1s invulnerability after taking damage (5s CD)', category: 'defensive',
      apply: p => { p.phaseShift = true; p.phaseShiftCooldown = 0; } },
    { id: 'blood_shield', name: '🩸 Blood Shield', desc: 'Overkill damage on enemies becomes temp shield', category: 'defensive',
      apply: p => { p.bloodShield = true; p.tempShield = p.tempShield || 0; } },
    { id: 'iron_skin', name: '🛡️ Iron Skin', desc: '+4 Armor, +20 Max HP', category: 'defensive',
      apply: p => { p.armor += 4; p.maxHealth += 20; p.health += 20; } },
    
    // Utility
    { id: 'black_hole', name: '🌀 Black Hole', desc: 'Every 25s, spawn a vortex pulling enemies', category: 'utility',
      apply: p => { p.blackHoleCooldown = 0; p.hasBlackHole = true; } },
    { id: 'chrono_field', name: '⏳ Chrono Field', desc: 'Enemies within 200px move 40% slower', category: 'utility',
      apply: p => { p.timeDilation = (p.timeDilation || 0) + 0.4; } },
    { id: 'treasure_hunter', name: '💎 Treasure Hunter', desc: '+25% credit drops, +20 pickup range', category: 'utility',
      apply: p => { p.creditBonus = (p.creditBonus || 0) + 0.25; p.pickupRange += 20; } },
    { id: 'xp_magnet', name: '🧲 XP Magnet', desc: 'Triple XP orb attraction range', category: 'utility',
      apply: p => { p.xpMagnetMult = (p.xpMagnetMult || 1) + 2; } },
    { id: 'decoy_master', name: '👥 Decoy Master', desc: 'Spawn a decoy that distracts enemies', category: 'utility',
      apply: p => { p.hasDecoy = true; } },
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
    xpOrbs: [],
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
    activeWeaponSlot: 0,
    obstacles: [],
    hazards: [],
    blackHoles: [],
    arenaTheme: null,
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
    game.paused = true;
    Sound.play('levelUp');
    screenShake(8);
    showNotification(`⬆️ LEVEL ${game.stats.level}!`, '#ffd93d', 3000);
    
    const choices = [];
    
    // Determine what types of choices to offer
    // Always include at least 1 stat passive and 1 transformative item
    const availablePassives = PASSIVE_ABILITIES.filter(p => true); // all available
    const availableItems = TRANSFORMATIVE_ITEMS.filter(item => {
        // Don't offer items player already has (for non-stackable ones)
        if (item.id === 'second_wind' && game.player.secondWind) return false;
        if (item.id === 'mirror_shot' && game.player.mirrorShot) return false;
        if (item.id === 'phase_shift' && game.player.phaseShift) return false;
        if (item.id === 'explosive_finale' && game.player.explosiveFinale) return false;
        if (item.id === 'blood_shield' && game.player.bloodShield) return false;
        if (item.id === 'black_hole' && game.player.hasBlackHole) return false;
        if (item.id === 'decoy_master' && game.player.hasDecoy) return false;
        return true;
    });
    
    // Weapon choice (if player has fewer than maxWeaponSlots)
    const availableWeapons = Object.keys(WEAPON_TYPES).filter(w => {
        return !game.player.weaponSlots.some(s => s.type === w);
    });
    
    // Build choices array - mix of types
    const shuffledPassives = [...availablePassives].sort(() => Math.random() - 0.5);
    const shuffledItems = [...availableItems].sort(() => Math.random() - 0.5);
    const shuffledWeapons = [...availableWeapons].sort(() => Math.random() - 0.5);
    
    // Slot 1: Transformative item (60%) or weapon (40% if available)
    if (shuffledWeapons.length > 0 && game.player.weaponSlots.length < game.player.maxWeaponSlots && Math.random() < 0.4) {
        const weaponKey = shuffledWeapons[0];
        const weapon = WEAPON_TYPES[weaponKey];
        choices.push({
            name: weapon.name,
            desc: `New weapon: ${weapon.desc || 'Equip to a weapon slot'}`,
            type: 'weapon',
            apply: p => {
                p.weaponSlots.push({ type: weaponKey, cooldown: 0 });
                showNotification(`${weapon.name} equipped!`, weapon.color, 2000);
            }
        });
    } else if (shuffledItems.length > 0) {
        choices.push(shuffledItems[0]);
    } else {
        choices.push(shuffledPassives[0]);
    }
    
    // Slot 2: Transformative item or passive
    if (shuffledItems.length > (choices[0]?.type === undefined && shuffledItems[0] === choices[0] ? 1 : 0)) {
        const idx = choices.some(c => c === shuffledItems[0]) ? 1 : 0;
        if (shuffledItems[idx]) {
            choices.push(shuffledItems[idx]);
        } else {
            choices.push(shuffledPassives[0]);
        }
    } else {
        choices.push(shuffledPassives[0]);
    }
    
    // Slot 3: Always a passive stat boost
    const usedPassiveIdx = choices.findIndex(c => shuffledPassives.includes(c));
    const passiveStart = usedPassiveIdx >= 0 ? 1 : 0;
    choices.push(shuffledPassives[passiveStart] || shuffledPassives[0]);
    
    // Ensure exactly 3 unique choices
    while (choices.length < 3) {
        const fallback = shuffledPassives[choices.length] || shuffledPassives[0];
        if (!choices.includes(fallback)) {
            choices.push(fallback);
        } else {
            choices.push(shuffledPassives[Math.floor(Math.random() * shuffledPassives.length)]);
        }
    }
    
    game.levelUpChoices = choices.slice(0, 3);
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
                    <div class="level-up-choice${choice.type === 'weapon' ? ' weapon-choice' : choice.category ? ' item-choice' : ''}" data-index="${i}">
                        <h3>${choice.name}</h3>
                        <p>${choice.desc}</p>
                        ${choice.category ? `<span class="choice-category">${choice.category}</span>` : ''}
                        ${choice.type === 'weapon' ? '<span class="choice-category">weapon</span>' : ''}
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
        // Walk animation
        this.walkFrame = 0;
        this.walkTimer = 0;
        this.isMoving = false;
        this.facingRight = true;
        this.aimAngle = 0;
        // Multi-weapon system
        this.weaponSlots = [{ type: 'basic', cooldown: 0 }];
        this.maxWeaponSlots = 4;
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
            this.weaponSlots = [{ type: 'basic', cooldown: 0 }, { type: 'basic', cooldown: 0 }];
        } else if (character.id === 'gunslinger') {
            this.weaponSlots = [{ type: 'basic', cooldown: 0 }, { type: 'basic', cooldown: 0 }, { type: 'basic', cooldown: 0 }];
        }
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
            const poisonDmg = this.poisonDamage / CONFIG.TARGET_FPS;
            this.health -= poisonDmg;
            this.poisonTimer--;
            if (this.poisonTimer % 30 === 0) {
                createTextParticle(this.x, this.y, `☠️`, '#65a30d', 14);
            }
            if (this.health <= 0) {
                this.health = 0;
                gameOver();
                return; // Stop further updates
            }
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

        // Movement tracking for walk animation
        this.isMoving = (dx !== 0 || dy !== 0);
        if (dx > 0) this.facingRight = true;
        else if (dx < 0) this.facingRight = false;
        if (this.isMoving) {
            this.walkTimer++;
            if (this.walkTimer >= ARENA_CONSTANTS.WALK_ANIM_FRAME_DURATION) { this.walkTimer = 0; this.walkFrame = this.walkFrame === 0 ? 1 : 0; }
        } else { this.walkTimer = 0; this.walkFrame = 0; }

        this.shoot();

        this.collectPickups();

        // Orbital Shield
        if (this.orbitalCount > 0) {
            this.orbitalAngle += 0.04;
            for (let i = 0; i < this.orbitalCount; i++) {
                const oAngle = this.orbitalAngle + (i / this.orbitalCount) * Math.PI * 2;
                const orbX = this.x + Math.cos(oAngle) * 50;
                const orbY = this.y + Math.sin(oAngle) * 50;
                for (let j = game.enemies.length - 1; j >= 0; j--) {
                    const e = game.enemies[j];
                    if (Math.hypot(e.x - orbX, e.y - orbY) < e.size + 8) {
                        if (e.takeDamage(Math.floor(this.damage * 0.3), false)) {
                            game.enemies.splice(j, 1);
                            checkWaveClear();
                        }
                    }
                }
            }
        }
        // Fire trail
        if (this.fireTrail && this.isMoving && game.frameCount % 5 === 0) {
            game.particles.push({ x: this.x, y: this.y + this.size * 0.5, vx: 0, vy: 0, color: '#ff4500', life: ARENA_CONSTANTS.FIRE_TRAIL_LIFE, maxLife: ARENA_CONSTANTS.FIRE_TRAIL_LIFE, size: ARENA_CONSTANTS.FIRE_TRAIL_SIZE, type: 'fire_trail', damage: ARENA_CONSTANTS.FIRE_TRAIL_DAMAGE });
        }
        // Poison cloud
        if (this.poisonCloudDmg > 0 && game.frameCount % 30 === 0) {
            game.enemies.forEach(e => { if (Math.hypot(e.x - this.x, e.y - this.y) < 100) e.takeDamage(this.poisonCloudDmg, false); });
        }
        // Thorns aura - damage nearby enemies
        if (this.thornsAuraDmg > 0 && game.frameCount % 30 === 0) {
            game.enemies.forEach(e => {
                if (Math.hypot(e.x - this.x, e.y - this.y) < 80) {
                    e.takeDamage(this.thornsAuraDmg, false);
                    createParticles(e.x, e.y, '#65a30d', 2);
                }
            });
        }
        // Black hole ability
        if (this.hasBlackHole) {
            if (this.blackHoleCooldown <= 0) {
                this.blackHoleCooldown = 1500; // 25 seconds
                game.blackHoles = game.blackHoles || [];
                game.blackHoles.push({
                    x: this.x,
                    y: this.y,
                    radius: 150,
                    life: 300, // 5 seconds
                    maxLife: 300,
                    pullStrength: 3
                });
                createParticles(this.x, this.y, '#8b5cf6', 20);
                showNotification('🌀 Black Hole!', '#8b5cf6', 1500);
            }
            this.blackHoleCooldown--;
        }
        // Decoy management
        if (this.hasDecoy && this.decoy && this.decoy.health > 0) { /* Decoy alive, enemies target it */ }
        else if (this.hasDecoy) {
            if (!this.decoy) this.decoy = { x: this.x - 80, y: this.y, health: ARENA_CONSTANTS.DECOY_HEALTH, maxHealth: ARENA_CONSTANTS.DECOY_HEALTH, respawnTimer: 0 };
            else { this.decoy.respawnTimer = (this.decoy.respawnTimer || ARENA_CONSTANTS.DECOY_RESPAWN_TIME) - 1;
                if (this.decoy.respawnTimer <= 0) this.decoy = { x: this.x - 80, y: this.y, health: ARENA_CONSTANTS.DECOY_HEALTH, maxHealth: ARENA_CONSTANTS.DECOY_HEALTH, respawnTimer: 0 };
            }
        }
        // Magnetic field
        if (this.magnetField) {
            game.pickups.forEach(p => {
                const pDist = Math.hypot(p.x - this.x, p.y - this.y);
                if (pDist < this.pickupRange * 3 && pDist > 5) { p.x += (this.x - p.x) / pDist * 2; p.y += (this.y - p.y) / pDist * 2; }
            });
        }
        // Character abilities
        if (this.characterId === 'tank') {
            if (this.shieldTimer > 0) this.shieldTimer--;
            if (this.shieldTimer <= 0) this.shieldActive = true;
        }
        if (this.characterId === 'speedster' && this.isMoving && game.frameCount % 8 === 0) {
            this.afterImages.push({ x: this.x, y: this.y, life: 20, damage: this.damage * 0.1 });
            if (this.afterImages.length > 5) this.afterImages.shift();
        }
        if (this.afterImages.length > 0) {
            this.afterImages = this.afterImages.filter(ai => {
                ai.life--;
                game.enemies.forEach(e => { if (Math.hypot(e.x - ai.x, e.y - ai.y) < e.size + 10) e.takeDamage(ai.damage, false); });
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
            if (this.turrets.length < ARENA_CONSTANTS.TURRET_MAX && game.frameCount % ARENA_CONSTANTS.TURRET_SPAWN_INTERVAL === 0) {
                this.turrets.push({ x: this.x + (Math.random() - 0.5) * ARENA_CONSTANTS.TURRET_SPREAD, y: this.y + (Math.random() - 0.5) * ARENA_CONSTANTS.TURRET_SPREAD, health: ARENA_CONSTANTS.TURRET_HEALTH, shootCooldown: 0 });
            }
            this.turrets = this.turrets.filter(t => {
                if (t.shootCooldown > 0) t.shootCooldown--;
                if (t.shootCooldown <= 0) {
                    const near = game.enemies.filter(e => Math.hypot(e.x - t.x, e.y - t.y) < 250).sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0];
                    if (near) { const a = Math.atan2(near.y - t.y, near.x - t.x); game.bullets.push(new Bullet(t.x, t.y, a, this, WEAPON_TYPES.basic)); t.shootCooldown = 45; }
                }
                return t.health > 0;
            });
        }
        if (this.characterId === 'medic' && !this.isMoving && game.frameCount % 30 === 0) this.heal(2);
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
        const nearest = game.enemies
            .filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= this.range)
            .sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));

        if (nearest.length === 0) return;
        this.aimAngle = Math.atan2(nearest[0].y - this.y, nearest[0].x - this.x);

        this.weaponSlots.forEach((slot, slotIndex) => {
            if (slot.cooldown > 0) { slot.cooldown--; return; }
            const weapon = WEAPON_TYPES[slot.type];
            if (!weapon) return;

            let projectiles = this.projectileCount;
            if (hasPowerup('multishot')) {
                const powerup = game.activePowerups.find(p => p.data.effect === 'multishot');
                if (powerup) projectiles += powerup.data.value;
            }

            const targets = nearest.slice(0, projectiles);
            targets.forEach((enemy, ti) => {
                const angle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
                if (slot.type === 'spread') {
                    for (let i = 0; i < 5; i++) {
                        const spreadAngle = angle + (i - 2) * 0.15;
                        game.bullets.push(new Bullet(this.x, this.y, spreadAngle, this, weapon));
                    }
                    // Mirror shot - fire reverse copy
                    if (this.mirrorShot && !weapon.continuous) {
                        const mirrorAngle = angle + Math.PI;
                        const mirrorBullet = new Bullet(this.x, this.y, mirrorAngle, this, weapon);
                        mirrorBullet.isMirror = true;
                        game.bullets.push(mirrorBullet);
                    }
                } else {
                    game.bullets.push(new Bullet(this.x, this.y, angle, this, weapon));
                    // Mirror shot - fire reverse copy
                    if (this.mirrorShot && !weapon.continuous) {
                        const mirrorAngle = angle + Math.PI;
                        const mirrorBullet = new Bullet(this.x, this.y, mirrorAngle, this, weapon);
                        mirrorBullet.isMirror = true;
                        game.bullets.push(mirrorBullet);
                    }
                }
            });
            slot.cooldown = Math.floor(this.fireRate * (weapon.fireRate || 1));
            slot.maxCooldown = slot.cooldown;
            Sound.play('shoot');
        });
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
        
        // Tank shield block
        if (this.shieldActive && this.characterId === 'tank') {
            this.shieldActive = false;
            this.shieldTimer = 900;
            createTextParticle(this.x, this.y, '🛡️ BLOCKED!', '#60a5fa', 22);
            createParticles(this.x, this.y, '#60a5fa', 15);
            screenShake(5);
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
        
        // Thorns passive - reflect damage to nearest enemy
        if (this.thorns > 0) {
            const thornsDamage = Math.floor(finalDamage * this.thorns);
            if (thornsDamage > 0 && game.enemies.length > 0) {
                let nearest = game.enemies[0];
                let nearestDist = Math.hypot(nearest.x - this.x, nearest.y - this.y);
                for (let i = 1; i < game.enemies.length; i++) {
                    const d = Math.hypot(game.enemies[i].x - this.x, game.enemies[i].y - this.y);
                    if (d < nearestDist) { nearest = game.enemies[i]; nearestDist = d; }
                }
                nearest.takeDamage(thornsDamage, false);
                createTextParticle(nearest.x, nearest.y, `🌵${thornsDamage}`, '#65a30d', 14);
            }
        }
        
        // Enhanced damage feedback
        createTextParticle(this.x, this.y, `-${finalDamage}`, '#ff6b6b', 18);
        createParticles(this.x, this.y, '#ff6b6b', 5);
        screenShake(finalDamage * 0.5);
        
        // Berserker rage
        if (this.characterId === 'berserker' && !this.rageActive) {
            this.rageMeter = (this.rageMeter || 0) + finalDamage * 2;
            if (this.rageMeter >= 100) {
                this.rageActive = true; this.rageTimer = 300;
                this.rageDmgBonus = Math.floor(this.damage * 0.5); this.rageSpdBonus = 1;
                this.damage += this.rageDmgBonus; this.speed += this.rageSpdBonus;
                createTextParticle(this.x, this.y, '🔥 RAGE!', '#ff0000', 24);
                screenShake(15);
            }
        }
        
        Sound.play('hit');
        if (this.health <= 0) {
            if (this.secondWind) {
                this.secondWind = false;
                this.health = Math.floor(this.maxHealth * 0.3);
                createTextParticle(this.x, this.y, '💨 SECOND WIND!', '#ffd93d', 24);
                createParticles(this.x, this.y, '#ffd93d', 30);
                screenShake(15);
                showNotification('💨 Second Wind! Revived with 30% HP!', '#ffd93d', 3000);
                Sound.play('levelUp');
                // Brief invulnerability
                this.dashInvulnerable = 60;
            } else {
                gameOver();
            }
        }
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
        const s = this.size;
        const cx = this.x;
        const cy = this.y;
        const headR = s * 0.3;
        const headY = cy - s * 0.55;
        const torsoW = s * 0.45;
        const torsoH = s * 0.5;
        const torsoTop = cy - s * 0.25;
        const armW = s * 0.1;
        const armLen = s * 0.4;
        const legW = s * 0.1;
        const legLen = s * 0.35;
        const walkSwing = this.walkFrame === 0 ? 0.3 : -0.3;
        const aimAngle = this.aimAngle;

        // Character color map
        const CHAR_COLORS = {
            balanced:   { head: '#4ecdc4', body: '#e2e8f0', limb: '#94a3b8', accent: '#00ff88' },
            tank:       { head: '#64748b', body: '#475569', limb: '#64748b', accent: '#94a3b8' },
            speedster:  { head: '#fbbf24', body: '#fef08a', limb: '#fbbf24', accent: '#fef08a' },
            sniper:     { head: '#22c55e', body: '#166534', limb: '#166534', accent: '#86efac' },
            gunslinger: { head: '#f97316', body: '#92400e', limb: '#92400e', accent: '#fdba74' },
            vampire:    { head: '#fecaca', body: '#1c1917', limb: '#450a0a', accent: '#ef4444' },
            berserker:  { head: '#fca5a5', body: '#b91c1c', limb: '#991b1b', accent: '#dc2626' },
            engineer:   { head: '#3b82f6', body: '#1e40af', limb: '#1e40af', accent: '#60a5fa' },
            medic:      { head: '#fff', body: '#fecdd3', limb: '#fecdd3', accent: '#dc2626' },
            assassin:   { head: '#c4b5fd', body: '#1e1b4b', limb: '#1e1b4b', accent: '#7c3aed' },
            summoner:   { head: '#7c3aed', body: '#581c87', limb: '#581c87', accent: '#c084fc' },
            juggernaut: { head: '#d97706', body: '#92400e', limb: '#78350f', accent: '#fbbf24' },
        };
        const cc = CHAR_COLORS[this.characterId] || CHAR_COLORS.balanced;

        // Speedster afterimages
        if (this.characterId === 'speedster' && this.afterImages.length > 0) {
            this.afterImages.forEach(ai => {
                ctx.save(); ctx.globalAlpha = ai.life / 20 * 0.3;
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(ai.x, ai.y, s * 0.4, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            });
        }

        // Assassin invisibility
        if (this.isInvisible) ctx.globalAlpha = 0.3;

        // === LEGS ===
        const legY = cy + s * 0.25;
        ctx.fillStyle = cc.limb;
        ctx.save(); ctx.translate(cx - s * 0.12, legY);
        ctx.rotate(walkSwing); ctx.fillRect(-legW / 2, 0, legW, legLen); ctx.restore();
        ctx.save(); ctx.translate(cx + s * 0.12, legY);
        ctx.rotate(-walkSwing); ctx.fillRect(-legW / 2, 0, legW, legLen); ctx.restore();

        // === TORSO ===
        ctx.fillStyle = cc.body;
        ctx.fillRect(cx - torsoW / 2, torsoTop, torsoW, torsoH);
        // Character-specific torso detail
        if (this.characterId === 'tank') {
            ctx.fillStyle = '#334155';
            ctx.fillRect(cx - torsoW / 2 - 4, torsoTop, 4, 10);
            ctx.fillRect(cx + torsoW / 2, torsoTop, 4, 10);
        } else if (this.characterId === 'medic') {
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(cx - 3, torsoTop + 3, 6, torsoH - 6);
            ctx.fillRect(cx - torsoW / 4, torsoTop + torsoH / 2 - 2, torsoW / 2, 4);
        } else if (this.characterId === 'berserker') {
            ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - 4 + i * 4, torsoTop + 2); ctx.lineTo(cx - 2 + i * 4, torsoTop + torsoH - 2); ctx.stroke(); }
        } else if (this.characterId === 'engineer') {
            ctx.fillStyle = '#3b82f6'; ctx.fillRect(cx - torsoW / 2 + 2, torsoTop + torsoH / 2, torsoW - 4, torsoH / 2 - 2);
        } else if (this.characterId === 'vampire') {
            ctx.fillStyle = '#450a0a';
            ctx.beginPath(); ctx.moveTo(cx - torsoW / 2 - 6, torsoTop); ctx.lineTo(cx - torsoW / 2, torsoTop + torsoH); ctx.lineTo(cx - torsoW / 2, torsoTop); ctx.fill();
            ctx.beginPath(); ctx.moveTo(cx + torsoW / 2 + 6, torsoTop); ctx.lineTo(cx + torsoW / 2, torsoTop + torsoH); ctx.lineTo(cx + torsoW / 2, torsoTop); ctx.fill();
        }

        // === ARMS ===
        ctx.fillStyle = cc.limb;
        ctx.save(); ctx.translate(cx - s * 0.25, cy - s * 0.2);
        ctx.rotate(aimAngle * 0.4 - 0.3); ctx.fillRect(-armW / 2, 0, armW, armLen); ctx.restore();
        ctx.save(); ctx.translate(cx + s * 0.25, cy - s * 0.2);
        ctx.rotate(aimAngle * 0.6); ctx.fillRect(-armW / 2, 0, armW, armLen);
        // Weapon at hand
        const weaponColor = WEAPON_TYPES[this.weaponSlots[0]?.type || 'basic']?.color || '#00ff88';
        ctx.fillStyle = weaponColor; ctx.fillRect(-2, armLen - 2, 5, 8); ctx.restore();

        // === HEAD ===
        ctx.fillStyle = cc.head;
        ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fill();
        // Character-specific head detail
        if (this.characterId === 'balanced') {
            ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(cx, headY, headR * 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(cx - 2, headY - 2, headR * 0.25, 0, Math.PI * 2); ctx.fill();
        } else if (this.characterId === 'tank') {
            ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#334155'; ctx.fillRect(cx - headR * 0.6, headY - 1, headR * 1.2, 4);
        } else if (this.characterId === 'speedster') {
            ctx.fillStyle = '#fef08a'; ctx.beginPath();
            ctx.moveTo(cx - headR, headY); ctx.lineTo(cx + headR * 1.2, headY); ctx.lineTo(cx + headR, headY + headR * 0.4);
            ctx.closePath(); ctx.fill();
        } else if (this.characterId === 'sniper') {
            ctx.fillStyle = '#86efac'; ctx.beginPath(); ctx.arc(cx + headR * 0.3, headY, headR * 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#86efac'; ctx.lineWidth = 1; ctx.stroke();
        } else if (this.characterId === 'gunslinger') {
            ctx.fillStyle = '#92400e'; ctx.beginPath();
            ctx.ellipse(cx, headY - headR * 0.3, headR * 1.3, headR * 0.35, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(cx - headR * 0.7, headY - headR * 0.4, headR * 1.4, headR * 0.25);
        } else if (this.characterId === 'vampire') {
            ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(cx - 3, headY - 2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 3, headY - 2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1c1917'; ctx.beginPath();
            ctx.moveTo(cx - headR * 0.4, headY - headR); ctx.lineTo(cx, headY - headR * 0.5); ctx.lineTo(cx + headR * 0.4, headY - headR); ctx.fill();
        } else if (this.characterId === 'berserker') {
            ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx - 4, headY - 2); ctx.lineTo(cx - 2, headY + 2); ctx.moveTo(cx + 4, headY - 2); ctx.lineTo(cx + 2, headY + 2); ctx.stroke();
            ctx.fillStyle = '#dc2626';
            for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.4; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * headR, headY + Math.sin(a) * headR); ctx.lineTo(cx + Math.cos(a) * (headR + 5), headY + Math.sin(a) * (headR + 5) - 2); ctx.lineTo(cx + Math.cos(a) * (headR + 1), headY + Math.sin(a) * (headR + 1)); ctx.fill(); }
        } else if (this.characterId === 'engineer') {
            ctx.fillStyle = '#fbbf24'; ctx.fillRect(cx - headR * 0.7, headY - headR * 0.4, headR * 1.4, headR * 0.4);
            ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.arc(cx - 3, headY - 1, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 3, headY - 1, 2.5, 0, Math.PI * 2); ctx.fill();
        } else if (this.characterId === 'medic') {
            ctx.fillStyle = '#dc2626'; ctx.fillRect(cx - 2, headY - headR + 1, 4, headR * 0.35);
            ctx.fillRect(cx - headR * 0.25, headY - headR + 4, headR * 0.5, 2.5);
        } else if (this.characterId === 'assassin') {
            ctx.fillStyle = '#1e1b4b'; ctx.beginPath();
            ctx.moveTo(cx - headR * 1.1, headY + headR * 0.4); ctx.lineTo(cx, headY - headR * 1.1); ctx.lineTo(cx + headR * 1.1, headY + headR * 0.4);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#c4b5fd'; ctx.beginPath(); ctx.arc(cx - 2, headY, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 2, headY, 1.5, 0, Math.PI * 2); ctx.fill();
        } else if (this.characterId === 'summoner') {
            ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(cx, headY - headR * 0.2, headR * 1.05, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
            ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(cx, headY - headR * 1.05, 2.5, 0, Math.PI * 2); ctx.fill();
        } else if (this.characterId === 'juggernaut') {
            ctx.fillStyle = '#92400e'; ctx.fillRect(cx - headR * 0.7, headY - 2, headR * 1.4, 6);
            ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(cx, headY, headR * 0.25, 0, Math.PI * 2); ctx.fill();
        }

        // Equipment overlays
        if (this.armor > 5) {
            ctx.fillStyle = 'rgba(100,116,139,0.5)';
            ctx.fillRect(cx - torsoW / 2 - 3, torsoTop, 3, 8);
            ctx.fillRect(cx + torsoW / 2, torsoTop, 3, 8);
        }
        if (this.lifeSteal > 0.1) {
            ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(cx, cy, s * 1.1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        if (this.speed > 4 && this.isMoving) {
            ctx.save(); ctx.globalAlpha = 0.2; ctx.strokeStyle = '#4ecdc4'; ctx.lineWidth = 1.5;
            const dir = this.facingRight ? -1 : 1;
            for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(cx + dir * i * 6, cy - 4); ctx.lineTo(cx + dir * i * 6, cy + 4); ctx.stroke(); }
            ctx.restore();
        }

        // Orbital shield
        if (this.orbitalCount > 0) {
            for (let i = 0; i < this.orbitalCount; i++) {
                const oAngle = this.orbitalAngle + (i / this.orbitalCount) * Math.PI * 2;
                const ox = cx + Math.cos(oAngle) * 50;
                const oy = cy + Math.sin(oAngle) * 50;
                ctx.fillStyle = '#4ecdc4'; ctx.shadowColor = '#4ecdc4'; ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(ox, oy, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            }
        }

        // Tank shield aura
        if (this.shieldActive && this.characterId === 'tank') {
            ctx.strokeStyle = 'rgba(96,165,250,0.5)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, cy, s * 1.3, 0, Math.PI * 2); ctx.stroke();
        }
        // Berserker rage aura
        if (this.rageActive) {
            const p = Math.sin(Date.now() * 0.015) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(255,0,0,${p})`; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(cx, cy, s * 1.4, 0, Math.PI * 2); ctx.stroke();
        }
        // Blood pools
        if (this.bloodPools.length > 0) {
            this.bloodPools.forEach(bp => {
                ctx.save(); ctx.globalAlpha = Math.min(1, bp.life / 100) * 0.5;
                ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(bp.x, bp.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            });
        }
        // Turrets
        if (this.turrets.length > 0) {
            this.turrets.forEach(t => {
                ctx.fillStyle = '#3b82f6'; ctx.fillRect(t.x - 7, t.y - 7, 14, 14);
                ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1.5; ctx.strokeRect(t.x - 7, t.y - 7, 14, 14);
            });
        }
        // Decoy
        if (this.decoy && this.decoy.health > 0) {
            ctx.save(); ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.15;
            ctx.fillStyle = cc.head; ctx.beginPath(); ctx.arc(this.decoy.x, this.decoy.y, s * 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
            ctx.fillText('DECOY', this.decoy.x, this.decoy.y - s * 0.5); ctx.restore();
        }
        // Poison cloud
        if (this.poisonCloudDmg > 0) {
            ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#65a30d';
            ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        // Time dilation field
        if (this.timeDilation > 0) {
            ctx.save(); ctx.globalAlpha = 0.08; ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(cx, cy, 200, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }

        // Summoner drones
        this.drones.forEach(drone => {
            const orbitRadius = 60;
            const droneX = cx + Math.cos(drone.angle) * orbitRadius;
            const droneY = cy + Math.sin(drone.angle) * orbitRadius;
            ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(droneX, droneY, 8, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2; ctx.stroke();
            if (drone.health < drone.maxHealth) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(droneX - 8, droneY - 12, 16, 2);
                ctx.fillStyle = '#00ff88'; ctx.fillRect(droneX - 8, droneY - 12, 16 * (drone.health / drone.maxHealth), 2);
            }
        });

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
            this.speed = (0.4 + Math.log2(1 + wave * 0.15)) * 0.4 * diffSettings.enemySpeedMult;
            this.maxHealth = (15 + wave * 3 + Math.pow(wave, 1.3)) * bossType.health * diffSettings.enemyHealthMult;
            this.health = this.maxHealth;
            this.damage = (4 + wave * 1.2 + Math.pow(wave, 1.1) * 0.3) * bossType.damage * diffSettings.enemyDamageMult;
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
        
        this.attackCooldown = 0;
    }

    update() {
        // Track movement for walk animation
        this.prevX = this.x;
        this.prevY = this.y;
        
        let targetX = game.player.x, targetY = game.player.y;
        if (game.player.decoy && game.player.decoy.health > 0 && !this.isBoss) {
            const distDecoy = Math.hypot(game.player.decoy.x - this.x, game.player.decoy.y - this.y);
            const distPlayer = Math.hypot(game.player.x - this.x, game.player.y - this.y);
            if (distDecoy < distPlayer * 0.8) { targetX = game.player.decoy.x; targetY = game.player.decoy.y; }
        }
        const dx = targetX - this.x;
        const dy = targetY - this.y;
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
        this.x = Math.max(this.size, Math.min(CONFIG.CANVAS_WIDTH - this.size, this.x));
        this.y = Math.max(this.size, Math.min(CONFIG.CANVAS_HEIGHT - this.size, this.y));
        
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
        // Vampire blood pools
        if (game.player && game.player.characterId === 'vampire') {
            if (!game.player.bloodPools) game.player.bloodPools = [];
            game.player.bloodPools.push({ x: this.x, y: this.y, life: 300 });
        }
        Sound.play('death');
        checkAchievements();
    }

    draw(ctx) {
        ctx.save();
        const s = this.size;
        const cx = this.x;
        const cy = this.y;
        const t = Date.now();
        
        if (this.isBoss) {
            this.drawBoss(ctx);
        } else {
            const typeData = ENEMY_TYPES[this.type] || ENEMY_TYPES.normal;
            const p = typeData.palette || { body: this.color, core: '#fff', glow: this.color, accent: this.color };
            const pa = game.player ? Math.atan2(game.player.y - cy, game.player.x - cx) : 0;
            
            switch(this.type) {
                case 'normal': this._drawGrunt(ctx, cx, cy, s, t, p, pa); break;
                case 'fast': this._drawStalker(ctx, cx, cy, s, t, p, pa); break;
                case 'tank': this._drawGolem(ctx, cx, cy, s, t, p); break;
                case 'swarm': this._drawDrone(ctx, cx, cy, s, t, p); break;
                case 'teleporter': this._drawWarper(ctx, cx, cy, s, t, p); break;
                case 'shooter': this._drawMarksman(ctx, cx, cy, s, t, p, pa); break;
                case 'healer': this._drawOracle(ctx, cx, cy, s, t, p); break;
                case 'splitter': this._drawMitotic(ctx, cx, cy, s, t, p); break;
                case 'freezer': this._drawCryo(ctx, cx, cy, s, t, p); break;
                case 'berserker': this._drawRavager(ctx, cx, cy, s, t, p); break;
                case 'bomber': this._drawDetonator(ctx, cx, cy, s, t, p); break;
                case 'parasite': this._drawLeech(ctx, cx, cy, s, t, p, pa); break;
                case 'shielder': this._drawSentinel(ctx, cx, cy, s, t, p); break;
                case 'necro': this._drawWraith(ctx, cx, cy, s, t, p); break;
                default: this._drawGrunt(ctx, cx, cy, s, t, p, pa); break;
            }
        }
        
        // Elite indicator
        if (this.isElite && !this.isBoss) {
            const eColor = this.eliteModifier.color;
            const ePulse = Math.sin(t * 0.008) * 0.3 + 0.7;
            ctx.strokeStyle = eColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(cx, cy, s + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            // Rotating elite runes
            ctx.fillStyle = eColor;
            ctx.globalAlpha = ePulse;
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * Math.PI * 2 + t * 0.003;
                const rx = cx + Math.cos(a) * (s + 8);
                const ry = cy + Math.sin(a) * (s + 8);
                ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.eliteModifier.name, cx, cy - s - 15);
        }
        
        // Sentinel shield visual
        if (this.canShield && this.shieldActive && this.shieldHealth > 0) {
            const shieldAlpha = 0.3 + Math.sin(t * 0.005) * 0.1;
            ctx.strokeStyle = `rgba(99, 102, 241, ${shieldAlpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, s * 1.3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = `rgba(99, 102, 241, ${shieldAlpha * 0.3})`;
            ctx.fill();
            // Hex pattern on shield
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 + t * 0.001;
                ctx.fillStyle = `rgba(129, 140, 248, ${shieldAlpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(cx + Math.cos(a) * s * 1.1, cy + Math.sin(a) * s * 1.1, s * 0.08, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
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
            
            // Sentinel shield bar
            if (this.canShield && this.shieldHealth > 0) {
                ctx.fillStyle = '#818cf8';
                ctx.fillRect(cx - barWidth / 2, barY - 3, barWidth * (this.shieldHealth / this.shieldMaxHealth), 2);
            }
            
            // Elite shield bar
            if (this.isElite && this.eliteShield > 0 && this.eliteModifier?.hasShield) {
                const shieldMax = this.maxHealth * 0.3;
                ctx.fillStyle = '#60a5fa';
                ctx.fillRect(cx - barWidth / 2, barY - 3, barWidth * (this.eliteShield / shieldMax), 2);
            }
        }
        
        ctx.restore();
    }
    
    // === GRUNT: Floating alien eye-orb with organic tentacles ===
    _drawGrunt(ctx, cx, cy, s, t, p, angle) {
        const pulse = Math.sin(t * 0.004) * 0.15 + 0.3;
        ctx.fillStyle = `rgba(${this.hexToRgb(p.glow)}, ${pulse})`;
        ctx.beginPath(); ctx.arc(cx, cy, s * 1.05, 0, Math.PI * 2); ctx.fill();
        // Tentacles
        ctx.strokeStyle = p.accent; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
            const tx = cx + (i - 1.5) * s * 0.22;
            const wave = Math.sin(t * 0.006 + i * 1.5) * s * 0.15;
            ctx.beginPath(); ctx.moveTo(tx, cy + s * 0.3);
            ctx.quadraticCurveTo(tx + wave, cy + s * 0.6, tx + wave * 0.5, cy + s * 0.85);
            ctx.stroke();
        }
        // Body orb
        ctx.fillStyle = p.body;
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2); ctx.fill();
        // Inner glow
        const grad = ctx.createRadialGradient(cx, cy, s * 0.1, cx, cy, s * 0.5);
        grad.addColorStop(0, p.core); grad.addColorStop(1, p.body);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.48, 0, Math.PI * 2); ctx.fill();
        // Eye
        const eyeX = cx + Math.cos(angle) * s * 0.1;
        const eyeY = cy + Math.sin(angle) * s * 0.1;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.arc(eyeX, eyeY, s * 0.11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.glow;
        ctx.beginPath(); ctx.arc(eyeX + s * 0.03, eyeY - s * 0.03, s * 0.035, 0, Math.PI * 2); ctx.fill();
    }
    
    // === STALKER: Dart-shaped predator with motion trail ===
    _drawStalker(ctx, cx, cy, s, t, p, angle) {
        const moveAngle = Math.atan2((this.y - (this.prevY ?? this.y)), (this.x - (this.prevX ?? this.x)) || 0.01);
        // Motion trail
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = p.glow;
        for (let i = 1; i <= 3; i++) {
            const trailX = cx - Math.cos(moveAngle) * s * 0.3 * i;
            const trailY = cy - Math.sin(moveAngle) * s * 0.3 * i;
            ctx.beginPath(); ctx.arc(trailX, trailY, s * (0.3 - i * 0.06), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Body - arrow/dart shape
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(moveAngle);
        ctx.fillStyle = p.body;
        ctx.beginPath();
        ctx.moveTo(s * 0.6, 0);
        ctx.lineTo(-s * 0.3, -s * 0.35);
        ctx.lineTo(-s * 0.15, 0);
        ctx.lineTo(-s * 0.3, s * 0.35);
        ctx.closePath(); ctx.fill();
        // Core streak
        ctx.fillStyle = p.core;
        ctx.beginPath();
        ctx.moveTo(s * 0.4, 0);
        ctx.lineTo(-s * 0.1, -s * 0.12);
        ctx.lineTo(-s * 0.1, s * 0.12);
        ctx.closePath(); ctx.fill();
        // Fins
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, -s * 0.25);
        ctx.lineTo(-s * 0.5, -s * 0.45);
        ctx.lineTo(-s * 0.35, -s * 0.15);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, s * 0.25);
        ctx.lineTo(-s * 0.5, s * 0.45);
        ctx.lineTo(-s * 0.35, s * 0.15);
        ctx.closePath(); ctx.fill();
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(s * 0.15, 0, s * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.accent;
        ctx.beginPath(); ctx.arc(s * 0.18, 0, s * 0.04, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    
    // === GOLEM: Floating crystal cluster ===
    _drawGolem(ctx, cx, cy, s, t, p) {
        const pulse = Math.sin(t * 0.003) * 0.1;
        // Orbiting crystal shards
        ctx.fillStyle = p.core;
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + t * 0.002;
            const d = s * (0.75 + pulse);
            const sx = cx + Math.cos(a) * d;
            const sy = cy + Math.sin(a) * d;
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(a + t * 0.004);
            ctx.beginPath();
            ctx.moveTo(0, -s * 0.12); ctx.lineTo(s * 0.07, 0);
            ctx.lineTo(0, s * 0.12); ctx.lineTo(-s * 0.07, 0);
            ctx.closePath(); ctx.fill(); ctx.restore();
        }
        // Main crystal body (hexagonal)
        ctx.fillStyle = p.body;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const r = s * 0.55;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        // Crystal facets
        ctx.strokeStyle = p.glow; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s * 0.55); ctx.lineTo(cx, cy + s * 0.55);
        ctx.moveTo(cx - s * 0.47, cy - s * 0.27); ctx.lineTo(cx + s * 0.47, cy + s * 0.27);
        ctx.moveTo(cx - s * 0.47, cy + s * 0.27); ctx.lineTo(cx + s * 0.47, cy - s * 0.27);
        ctx.stroke();
        // Inner glow core
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.35);
        grad.addColorStop(0, p.core); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2); ctx.fill();
        // Eyes (two crystal eyes)
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx - s * 0.15, cy - s * 0.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s * 0.15, cy - s * 0.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.accent;
        ctx.beginPath(); ctx.arc(cx - s * 0.15, cy - s * 0.1, s * 0.04, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s * 0.15, cy - s * 0.1, s * 0.04, 0, Math.PI * 2); ctx.fill();
    }
    
    // === DRONE: Tiny buzzing insect with fluttering wings ===
    _drawDrone(ctx, cx, cy, s, t, p) {
        const wingFlutter = Math.sin(t * 0.04) * 0.4;
        // Wings (translucent, fluttering)
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = p.core;
        ctx.save(); ctx.translate(cx, cy);
        // Left wing
        ctx.save(); ctx.rotate(-0.6 + wingFlutter);
        ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.1, s * 0.45, s * 0.15, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // Right wing
        ctx.save(); ctx.rotate(0.6 - wingFlutter);
        ctx.beginPath(); ctx.ellipse(s * 0.1, -s * 0.1, s * 0.45, s * 0.15, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.restore();
        ctx.globalAlpha = 1;
        // Body (diamond shape)
        ctx.fillStyle = p.body;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s * 0.35); ctx.lineTo(cx + s * 0.2, cy);
        ctx.lineTo(cx, cy + s * 0.35); ctx.lineTo(cx - s * 0.2, cy);
        ctx.closePath(); ctx.fill();
        // Eye dots
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx - s * 0.06, cy - s * 0.08, s * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s * 0.06, cy - s * 0.08, s * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    
    // === WARPER: Cosmic jellyfish with trailing energy ribbons ===
    _drawWarper(ctx, cx, cy, s, t, p) {
        const pulse = Math.sin(t * 0.005) * 0.15 + 0.85;
        const phaseAlpha = this.teleportCooldown > 150 ? 0.5 : 1;
        ctx.globalAlpha = phaseAlpha;
        // Energy ribbons (trailing tentacles)
        ctx.strokeStyle = p.glow; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
            const tx = cx + (i - 2.5) * s * 0.16;
            const len = s * (0.5 + Math.sin(t * 0.004 + i) * 0.15);
            const wave1 = Math.sin(t * 0.007 + i * 0.8) * s * 0.12;
            const wave2 = Math.sin(t * 0.005 + i * 1.2) * s * 0.08;
            ctx.globalAlpha = phaseAlpha * (0.3 + i * 0.1);
            ctx.beginPath(); ctx.moveTo(tx, cy + s * 0.2);
            ctx.quadraticCurveTo(tx + wave1, cy + s * 0.2 + len * 0.5, tx + wave2, cy + s * 0.2 + len);
            ctx.stroke();
        }
        ctx.globalAlpha = phaseAlpha;
        // Bell/dome body
        ctx.fillStyle = p.body;
        ctx.beginPath();
        ctx.arc(cx, cy - s * 0.1, s * 0.45, Math.PI, 0);
        ctx.quadraticCurveTo(cx + s * 0.45, cy + s * 0.2, cx, cy + s * 0.25);
        ctx.quadraticCurveTo(cx - s * 0.45, cy + s * 0.2, cx - s * 0.45, cy - s * 0.1);
        ctx.fill();
        // Inner glow
        const grad = ctx.createRadialGradient(cx, cy - s * 0.1, 0, cx, cy - s * 0.1, s * 0.4);
        grad.addColorStop(0, p.core); grad.addColorStop(0.6, p.body); grad.addColorStop(1, p.accent);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy - s * 0.1, s * 0.35 * pulse, Math.PI, 0); ctx.fill();
        // Nucleus orb
        ctx.fillStyle = p.core;
        ctx.beginPath(); ctx.arc(cx, cy - s * 0.05, s * 0.12, 0, Math.PI * 2); ctx.fill();
        // Phase rings
        ctx.strokeStyle = `rgba(${this.hexToRgb(p.glow)}, ${0.3 * pulse})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.ellipse(cx, cy, s * (0.6 + i * 0.15) * pulse, s * 0.15, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    
    // === MARKSMAN: Floating turret eye with stabilizers ===
    _drawMarksman(ctx, cx, cy, s, t, p, angle) {
        // Targeting laser toward player
        ctx.strokeStyle = `rgba(${this.hexToRgb(p.glow)}, 0.15)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * s * 4, cy + Math.sin(angle) * s * 4);
        ctx.stroke(); ctx.setLineDash([]);
        // Rotating ring
        ctx.strokeStyle = p.accent; ctx.lineWidth = 2;
        const ringAngle = t * 0.003;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ringAngle);
        ctx.beginPath(); ctx.arc(0, 0, s * 0.55, 0, Math.PI * 1.2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, s * 0.55, Math.PI * 1.4, Math.PI * 2); ctx.stroke();
        ctx.restore();
        // Stabilizer fins (3 rotating)
        ctx.fillStyle = p.accent;
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + t * 0.002;
            ctx.save(); ctx.translate(cx + Math.cos(a) * s * 0.45, cy + Math.sin(a) * s * 0.45);
            ctx.rotate(a + Math.PI / 2);
            ctx.fillRect(-s * 0.03, -s * 0.12, s * 0.06, s * 0.24);
            ctx.restore();
        }
        // Main body orb
        ctx.fillStyle = p.body;
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2); ctx.fill();
        // Eye (large targeting eye)
        const eyeX = cx + Math.cos(angle) * s * 0.08;
        const eyeY = cy + Math.sin(angle) * s * 0.08;
        ctx.fillStyle = p.core;
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.arc(eyeX, eyeY, s * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff0040';
        ctx.beginPath(); ctx.arc(eyeX + s * 0.02, eyeY, s * 0.06, 0, Math.PI * 2); ctx.fill();
        // Crosshair on eye
        ctx.strokeStyle = '#ff0040'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(eyeX - s * 0.1, eyeY); ctx.lineTo(eyeX + s * 0.1, eyeY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(eyeX, eyeY - s * 0.1); ctx.lineTo(eyeX, eyeY + s * 0.1); ctx.stroke();
    }
    
    // === ORACLE: Angelic moth with luminous wings ===
    _drawOracle(ctx, cx, cy, s, t, p) {
        const wingBeat = Math.sin(t * 0.008) * 0.15;
        const healGlow = this.healCooldown < 30 ? (30 - this.healCooldown) / 30 : 0;
        // Healing aura pulse
        if (healGlow > 0) {
            ctx.fillStyle = `rgba(0, 255, 136, ${healGlow * 0.2})`;
            ctx.beginPath(); ctx.arc(cx, cy, s * (1.2 + healGlow * 0.8), 0, Math.PI * 2); ctx.fill();
        }
        // Wings (spread moth wings)
        ctx.fillStyle = p.body;
        ctx.globalAlpha = 0.6;
        // Left wing
        ctx.save(); ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, -s * 0.1);
        ctx.quadraticCurveTo(-s * 0.7, -s * (0.6 + wingBeat), -s * 0.5, s * 0.1);
        ctx.quadraticCurveTo(-s * 0.3, s * 0.3, -s * 0.1, s * 0.15);
        ctx.closePath(); ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(s * 0.1, -s * 0.1);
        ctx.quadraticCurveTo(s * 0.7, -s * (0.6 + wingBeat), s * 0.5, s * 0.1);
        ctx.quadraticCurveTo(s * 0.3, s * 0.3, s * 0.1, s * 0.15);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
        // Wing veins
        ctx.strokeStyle = p.glow; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - s * 0.1, cy); ctx.lineTo(cx - s * 0.5, cy - s * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + s * 0.1, cy); ctx.lineTo(cx + s * 0.5, cy - s * 0.3); ctx.stroke();
        // Body
        ctx.fillStyle = p.core;
        ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.15, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        // Halo
        const haloPulse = Math.sin(t * 0.006) * 0.2 + 0.8;
        ctx.strokeStyle = `rgba(${this.hexToRgb(p.glow)}, ${haloPulse * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.35, s * 0.25, s * 0.06, 0, 0, Math.PI * 2); ctx.stroke();
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx - s * 0.06, cy - s * 0.08, s * 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s * 0.06, cy - s * 0.08, s * 0.05, 0, Math.PI * 2); ctx.fill();
    }
    
    // === MITOTIC: Amoeba blob with visible nuclei ===
    _drawMitotic(ctx, cx, cy, s, t, p) {
        const wobble1 = Math.sin(t * 0.005) * 0.12;
        const wobble2 = Math.sin(t * 0.007 + 1) * 0.1;
        const wobble3 = Math.sin(t * 0.006 + 2) * 0.08;
        // Outer membrane (blobby)
        ctx.fillStyle = p.body;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(cx + s * (0.5 + wobble1), cy);
        ctx.quadraticCurveTo(cx + s * (0.45 + wobble2), cy - s * (0.5 + wobble3), cx, cy - s * (0.48 + wobble1));
        ctx.quadraticCurveTo(cx - s * (0.5 + wobble3), cy - s * (0.45 + wobble2), cx - s * (0.5 + wobble2), cy);
        ctx.quadraticCurveTo(cx - s * (0.45 + wobble1), cy + s * (0.5 + wobble2), cx, cy + s * (0.5 + wobble3));
        ctx.quadraticCurveTo(cx + s * (0.5 + wobble3), cy + s * (0.45 + wobble1), cx + s * (0.5 + wobble1), cy);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Inner nuclei (3 visible cores)
        ctx.fillStyle = p.core;
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + t * 0.002;
            const d = s * 0.2;
            const nx = cx + Math.cos(a) * d;
            const ny = cy + Math.sin(a) * d;
            ctx.beginPath(); ctx.arc(nx, ny, s * 0.1, 0, Math.PI * 2); ctx.fill();
            // Nucleus detail
            ctx.fillStyle = p.accent;
            ctx.beginPath(); ctx.arc(nx, ny, s * 0.04, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.core;
        }
        // Membrane outline
        ctx.strokeStyle = p.glow; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + s * (0.5 + wobble1), cy);
        ctx.quadraticCurveTo(cx + s * (0.45 + wobble2), cy - s * (0.5 + wobble3), cx, cy - s * (0.48 + wobble1));
        ctx.quadraticCurveTo(cx - s * (0.5 + wobble3), cy - s * (0.45 + wobble2), cx - s * (0.5 + wobble2), cy);
        ctx.quadraticCurveTo(cx - s * (0.45 + wobble1), cy + s * (0.5 + wobble2), cx, cy + s * (0.5 + wobble3));
        ctx.quadraticCurveTo(cx + s * (0.5 + wobble3), cy + s * (0.45 + wobble1), cx + s * (0.5 + wobble1), cy);
        ctx.stroke();
    }
    
    // === CRYO: Crystalline ice entity with frost aura ===
    _drawCryo(ctx, cx, cy, s, t, p) {
        // Frost particle orbit
        ctx.fillStyle = p.core;
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + t * 0.003;
            const d = s * (0.7 + Math.sin(t * 0.005 + i) * 0.1);
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s * 0.04, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Main crystal body (diamond/star shape)
        ctx.fillStyle = p.body;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s * 0.6); ctx.lineTo(cx + s * 0.25, cy - s * 0.15);
        ctx.lineTo(cx + s * 0.55, cy); ctx.lineTo(cx + s * 0.25, cy + s * 0.15);
        ctx.lineTo(cx, cy + s * 0.6); ctx.lineTo(cx - s * 0.25, cy + s * 0.15);
        ctx.lineTo(cx - s * 0.55, cy); ctx.lineTo(cx - s * 0.25, cy - s * 0.15);
        ctx.closePath(); ctx.fill();
        // Crystal facet lines
        ctx.strokeStyle = p.glow; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.6); ctx.lineTo(cx, cy + s * 0.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - s * 0.55, cy); ctx.lineTo(cx + s * 0.55, cy); ctx.stroke();
        // Inner glow
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.3);
        grad.addColorStop(0, '#fff'); grad.addColorStop(1, p.body);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2); ctx.fill();
        // Cold aura ring
        const frostPulse = Math.sin(t * 0.006) * 0.2 + 0.6;
        ctx.strokeStyle = `rgba(${this.hexToRgb(p.glow)}, ${frostPulse * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.8, 0, Math.PI * 2); ctx.stroke();
    }
    
    // === RAVAGER: Low aggressive beast with claws ===
    _drawRavager(ctx, cx, cy, s, t, p) {
        const isEnraged = this.enraged;
        const ragePulse = isEnraged ? Math.sin(t * 0.015) * 0.3 + 0.7 : 0;
        // Rage aura
        if (isEnraged) {
            ctx.fillStyle = `rgba(255, 0, 0, ${ragePulse * 0.25})`;
            ctx.beginPath(); ctx.arc(cx, cy, s * 1.3, 0, Math.PI * 2); ctx.fill();
            // Flame particles
            ctx.fillStyle = `rgba(251, 146, 60, ${ragePulse * 0.5})`;
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 + t * 0.01;
                const d = s * (1.0 + Math.sin(t * 0.012 + i) * 0.2);
                ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s * 0.08, 0, Math.PI * 2); ctx.fill();
            }
        }
        const walkOff = this.walkFrame === 0 ? 0.15 : -0.15;
        // Legs (4 beast legs)
        ctx.fillStyle = p.accent;
        const legPositions = [[-0.35, 0.15], [0.35, 0.15], [-0.25, 0.25], [0.25, 0.25]];
        legPositions.forEach((pos, i) => {
            const lx = cx + pos[0] * s;
            const ly = cy + pos[1] * s;
            ctx.save(); ctx.translate(lx, ly);
            ctx.rotate((i < 2 ? 1 : -1) * walkOff);
            ctx.fillRect(-s * 0.04, 0, s * 0.08, s * 0.3);
            ctx.restore();
        });
        // Body (wide horizontal beast shape)
        ctx.fillStyle = isEnraged ? '#ef4444' : p.body;
        ctx.beginPath();
        ctx.ellipse(cx, cy, s * 0.55, s * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Spikes along back
        ctx.fillStyle = p.accent;
        for (let i = 0; i < 5; i++) {
            const sx = cx - s * 0.3 + i * s * 0.15;
            ctx.beginPath();
            ctx.moveTo(sx - s * 0.04, cy - s * 0.25);
            ctx.lineTo(sx, cy - s * (0.4 + Math.sin(t * 0.01 + i) * 0.05));
            ctx.lineTo(sx + s * 0.04, cy - s * 0.25);
            ctx.closePath(); ctx.fill();
        }
        // Head
        ctx.fillStyle = isEnraged ? '#ef4444' : p.body;
        ctx.beginPath(); ctx.arc(cx + s * 0.4, cy - s * 0.05, s * 0.22, 0, Math.PI * 2); ctx.fill();
        // Eyes
        ctx.fillStyle = isEnraged ? '#ff0000' : '#fff';
        ctx.beginPath(); ctx.arc(cx + s * 0.45, cy - s * 0.12, s * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s * 0.5, cy - s * 0.06, s * 0.06, 0, Math.PI * 2); ctx.fill();
        if (!isEnraged) {
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(cx + s * 0.46, cy - s * 0.12, s * 0.03, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + s * 0.51, cy - s * 0.06, s * 0.03, 0, Math.PI * 2); ctx.fill();
        }
        // Jaw/teeth
        ctx.fillStyle = p.core;
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.55, cy + s * 0.05);
        ctx.lineTo(cx + s * 0.65, cy);
        ctx.lineTo(cx + s * 0.55, cy - s * 0.05);
        ctx.closePath(); ctx.fill();
    }
    
    // === DETONATOR: Living bomb/mine with pulsing core ===
    _drawDetonator(ctx, cx, cy, s, t, p) {
        const playerDist = game.player ? Math.hypot(game.player.x - cx, game.player.y - cy) : CONFIG.CANVAS_WIDTH;
        const urgency = Math.max(0.3, 1 - playerDist / 400);
        const pulse = Math.sin(t * (0.008 + urgency * 0.02)) * 0.3 + 0.7;
        // Danger glow
        ctx.fillStyle = `rgba(${this.hexToRgb(p.glow)}, ${pulse * 0.3})`;
        ctx.beginPath(); ctx.arc(cx, cy, s * 1.1, 0, Math.PI * 2); ctx.fill();
        // Outer shell segments
        ctx.fillStyle = p.accent;
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const a2 = ((i + 1) / 8) * Math.PI * 2;
            if (i % 2 === 0) {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, s * 0.5, a, a2);
                ctx.closePath(); ctx.fill();
            }
        }
        // Body sphere
        ctx.fillStyle = p.body;
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.45, 0, Math.PI * 2); ctx.fill();
        // Pulsing core
        const coreSize = s * (0.2 + pulse * 0.1);
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
        coreGrad.addColorStop(0, '#ffcc00'); coreGrad.addColorStop(0.5, p.glow); coreGrad.addColorStop(1, p.body);
        ctx.fillStyle = coreGrad;
        ctx.beginPath(); ctx.arc(cx, cy, coreSize, 0, Math.PI * 2); ctx.fill();
        // Warning spikes
        ctx.fillStyle = p.core;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + t * 0.002;
            ctx.save(); ctx.translate(cx + Math.cos(a) * s * 0.45, cy + Math.sin(a) * s * 0.45);
            ctx.rotate(a);
            ctx.beginPath();
            ctx.moveTo(0, -s * 0.04); ctx.lineTo(s * 0.12, 0); ctx.lineTo(0, s * 0.04);
            ctx.closePath(); ctx.fill(); ctx.restore();
        }
        // Fuse on top
        ctx.strokeStyle = p.core; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.45);
        ctx.quadraticCurveTo(cx + 3, cy - s * 0.6, cx + 1, cy - s * 0.7);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 200, 0, ${pulse})`;
        ctx.beginPath(); ctx.arc(cx + 1, cy - s * 0.7, 3, 0, Math.PI * 2); ctx.fill();
    }
    
    // === LEECH: Segmented cosmic worm ===
    _drawLeech(ctx, cx, cy, s, t, p, angle) {
        const moveAngle = Math.atan2((this.y - (this.prevY ?? this.y)), (this.x - (this.prevX ?? this.x)) || 0.01);
        const segCount = 5;
        // Body segments (tail to head)
        for (let i = segCount - 1; i >= 0; i--) {
            const segPhase = Math.sin(t * 0.008 + i * 0.8) * s * 0.08;
            const segX = cx - Math.cos(moveAngle) * i * s * 0.18 + Math.sin(t * 0.006 + i) * segPhase;
            const segY = cy - Math.sin(moveAngle) * i * s * 0.18 + Math.cos(t * 0.006 + i) * segPhase;
            const segSize = s * (0.28 - i * 0.03);
            // Toxic trail from segments
            if (i > 2) {
                ctx.fillStyle = `rgba(${this.hexToRgb(p.glow)}, 0.15)`;
                ctx.beginPath(); ctx.arc(segX, segY, segSize * 1.2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = i === 0 ? p.body : p.accent;
            ctx.beginPath(); ctx.arc(segX, segY, segSize, 0, Math.PI * 2); ctx.fill();
            // Segment ring detail
            ctx.strokeStyle = p.glow; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(segX, segY, segSize * 0.7, 0, Math.PI * 2); ctx.stroke();
        }
        // Head (first segment - larger with mandibles)
        const headX = cx;
        const headY = cy;
        // Mandibles
        ctx.fillStyle = p.core;
        const mandAngle1 = angle + Math.sin(t * 0.01) * 0.3 - 0.4;
        const mandAngle2 = angle - Math.sin(t * 0.01) * 0.3 + 0.4;
        ctx.beginPath();
        ctx.moveTo(headX + Math.cos(mandAngle1) * s * 0.15, headY + Math.sin(mandAngle1) * s * 0.15);
        ctx.lineTo(headX + Math.cos(angle) * s * 0.45, headY + Math.sin(angle) * s * 0.45);
        ctx.lineTo(headX + Math.cos(mandAngle1 + 0.3) * s * 0.2, headY + Math.sin(mandAngle1 + 0.3) * s * 0.2);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(headX + Math.cos(mandAngle2) * s * 0.15, headY + Math.sin(mandAngle2) * s * 0.15);
        ctx.lineTo(headX + Math.cos(angle) * s * 0.45, headY + Math.sin(angle) * s * 0.45);
        ctx.lineTo(headX + Math.cos(mandAngle2 - 0.3) * s * 0.2, headY + Math.sin(mandAngle2 - 0.3) * s * 0.2);
        ctx.closePath(); ctx.fill();
        // Eyes
        ctx.fillStyle = '#d9f99d';
        ctx.beginPath(); ctx.arc(cx + Math.cos(angle - 0.4) * s * 0.15, cy + Math.sin(angle - 0.4) * s * 0.15, s * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + Math.cos(angle + 0.4) * s * 0.15, cy + Math.sin(angle + 0.4) * s * 0.15, s * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    
    // === SENTINEL: Floating geometric obelisk with shield projectors ===
    _drawSentinel(ctx, cx, cy, s, t, p) {
        const hover = Math.sin(t * 0.004) * s * 0.05;
        const cy2 = cy + hover;
        // Shield aura for nearby allies
        if (this.shieldActive) {
            const shieldPulse = Math.sin(t * 0.005) * 0.1 + 0.2;
            ctx.strokeStyle = `rgba(${this.hexToRgb(p.glow)}, ${shieldPulse})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, cy2, s * 2, 0, Math.PI * 2); ctx.stroke();
        }
        // Energy projectors (4 floating nodes)
        ctx.fillStyle = p.glow;
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + t * 0.003;
            const d = s * 0.65;
            const nx = cx + Math.cos(a) * d;
            const ny = cy2 + Math.sin(a) * d;
            ctx.beginPath(); ctx.arc(nx, ny, s * 0.06, 0, Math.PI * 2); ctx.fill();
            // Connection beam to body
            ctx.strokeStyle = `rgba(${this.hexToRgb(p.glow)}, 0.4)`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(cx, cy2); ctx.stroke();
        }
        // Main body (tall hexagonal obelisk)
        ctx.fillStyle = p.body;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.2, cy2 - s * 0.55);
        ctx.lineTo(cx + s * 0.2, cy2 - s * 0.55);
        ctx.lineTo(cx + s * 0.3, cy2 - s * 0.15);
        ctx.lineTo(cx + s * 0.25, cy2 + s * 0.45);
        ctx.lineTo(cx - s * 0.25, cy2 + s * 0.45);
        ctx.lineTo(cx - s * 0.3, cy2 - s * 0.15);
        ctx.closePath(); ctx.fill();
        // Energy lines
        ctx.strokeStyle = p.glow; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy2 - s * 0.55); ctx.lineTo(cx, cy2 + s * 0.45); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - s * 0.28, cy2); ctx.lineTo(cx + s * 0.28, cy2); ctx.stroke();
        // Core eye
        ctx.fillStyle = p.core;
        ctx.beginPath(); ctx.arc(cx, cy2 - s * 0.1, s * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx, cy2 - s * 0.1, s * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.accent;
        ctx.beginPath(); ctx.arc(cx, cy2 - s * 0.1, s * 0.04, 0, Math.PI * 2); ctx.fill();
    }
    
    // === WRAITH: Spectral entity with fading body ===
    _drawWraith(ctx, cx, cy, s, t, p) {
        const soulPulse = Math.sin(t * 0.005) * 0.2 + 0.7;
        // Soul wisps orbiting
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + t * 0.003;
            const d = s * (0.8 + Math.sin(t * 0.004 + i) * 0.15);
            const wx = cx + Math.cos(a) * d;
            const wy = cy + Math.sin(a) * d;
            ctx.fillStyle = `rgba(${this.hexToRgb(p.glow)}, ${soulPulse * 0.4})`;
            ctx.beginPath(); ctx.arc(wx, wy, s * 0.06, 0, Math.PI * 2); ctx.fill();
        }
        // Spectral body (fading bottom)
        const bodyGrad = ctx.createLinearGradient(cx, cy - s * 0.5, cx, cy + s * 0.7);
        bodyGrad.addColorStop(0, p.body); bodyGrad.addColorStop(0.6, p.body);
        bodyGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bodyGrad;
        // Flowing robe shape
        const wave1 = Math.sin(t * 0.004) * s * 0.08;
        const wave2 = Math.sin(t * 0.005 + 1) * s * 0.06;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s * 0.55);
        ctx.lineTo(cx + s * 0.3, cy - s * 0.3);
        ctx.lineTo(cx + s * 0.35, cy + s * 0.1);
        ctx.quadraticCurveTo(cx + s * 0.4 + wave1, cy + s * 0.5, cx + s * 0.2 + wave2, cy + s * 0.7);
        ctx.lineTo(cx - s * 0.2 - wave2, cy + s * 0.7);
        ctx.quadraticCurveTo(cx - s * 0.4 - wave1, cy + s * 0.5, cx - s * 0.35, cy + s * 0.1);
        ctx.lineTo(cx - s * 0.3, cy - s * 0.3);
        ctx.closePath(); ctx.fill();
        // Hood
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s * 0.6);
        ctx.quadraticCurveTo(cx + s * 0.35, cy - s * 0.45, cx + s * 0.3, cy - s * 0.15);
        ctx.lineTo(cx + s * 0.15, cy - s * 0.1);
        ctx.lineTo(cx - s * 0.15, cy - s * 0.1);
        ctx.lineTo(cx - s * 0.3, cy - s * 0.15);
        ctx.quadraticCurveTo(cx - s * 0.35, cy - s * 0.45, cx, cy - s * 0.6);
        ctx.fill();
        // Glowing eyes in hood
        ctx.fillStyle = `rgba(167, 139, 250, ${soulPulse})`;
        ctx.beginPath(); ctx.arc(cx - s * 0.1, cy - s * 0.25, s * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s * 0.1, cy - s * 0.25, s * 0.06, 0, Math.PI * 2); ctx.fill();
        // Skeletal hands
        ctx.strokeStyle = p.core; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        // Left hand
        ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy); ctx.lineTo(cx - s * 0.45, cy + s * 0.05); ctx.stroke();
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.45, cy + s * 0.05);
            ctx.lineTo(cx - s * 0.52, cy + s * (0.02 + i * 0.04));
            ctx.stroke();
        }
        // Right hand
        ctx.beginPath(); ctx.moveTo(cx + s * 0.3, cy); ctx.lineTo(cx + s * 0.45, cy + s * 0.05); ctx.stroke();
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + s * 0.45, cy + s * 0.05);
            ctx.lineTo(cx + s * 0.52, cy + s * (0.02 + i * 0.04));
            ctx.stroke();
        }
    }
    drawBoss(ctx) {
        const s = this.size;
        const cx = this.x;
        const cy = this.y;
        const t = Date.now();
        const bossType = BOSS_TYPES[this.type] || BOSS_TYPES.destroyer;
        const p = bossType.palette || { body: this.color, core: '#fff', glow: this.color, accent: this.color, wing: this.color };
        
        // Boss glow aura (pulsing)
        const glowPulse = Math.sin(t * 0.004) * 0.15 + 0.35;
        ctx.fillStyle = `rgba(${this.hexToRgb(p.glow)}, ${glowPulse})`;
        ctx.beginPath(); ctx.arc(cx, cy, s * 1.15, 0, Math.PI * 2); ctx.fill();
        
        switch(this.type) {
            case 'destroyer': this._drawBossDestroyer(ctx, cx, cy, s, t, p); break;
            case 'broodmother': this._drawBossBroodmother(ctx, cx, cy, s, t, p); break;
            case 'voidwalker': this._drawBossVoidwalker(ctx, cx, cy, s, t, p); break;
            case 'necromancer': this._drawBossNecromancer(ctx, cx, cy, s, t, p); break;
            case 'titan': this._drawBossTitan(ctx, cx, cy, s, t, p); break;
            case 'hivemind': this._drawBossHivemind(ctx, cx, cy, s, t, p); break;
            case 'leviathan': this._drawBossLeviathan(ctx, cx, cy, s, t, p); break;
            default: this._drawBossDestroyer(ctx, cx, cy, s, t, p); break;
        }
        
        // Boss border ring
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(t * 0.003) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.9, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        
        // Health bar
        if (this.health < this.maxHealth) {
            const barWidth = s * 2;
            const barHeight = 6;
            const barY = cy - s - 12;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(cx - barWidth / 2, barY, barWidth, barHeight);
            const healthPercent = this.health / this.maxHealth;
            const healthColor = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffd93d' : '#ff6b6b';
            ctx.fillStyle = healthColor;
            ctx.fillRect(cx - barWidth / 2, barY, barWidth * healthPercent, barHeight);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, cx, barY - 4);
        }
    }
    
    // === DESTROYER: Demonic war entity with burning wings ===
    _drawBossDestroyer(ctx, cx, cy, s, t, p) {
        const wingBeat = Math.sin(t * 0.006) * 0.1;
        // Burning wings
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = p.wing;
        // Left wing
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.15, cy - s * 0.2);
        ctx.quadraticCurveTo(cx - s * 0.8, cy - s * (0.6 + wingBeat), cx - s * 0.6, cy + s * 0.1);
        ctx.lineTo(cx - s * 0.15, cy + s * 0.05);
        ctx.closePath(); ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.15, cy - s * 0.2);
        ctx.quadraticCurveTo(cx + s * 0.8, cy - s * (0.6 + wingBeat), cx + s * 0.6, cy + s * 0.1);
        ctx.lineTo(cx + s * 0.15, cy + s * 0.05);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        // Body
        ctx.fillStyle = p.body;
        ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.35, s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        // Armor plates
        ctx.strokeStyle = p.core; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy - s * 0.1); ctx.lineTo(cx + s * 0.3, cy - s * 0.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - s * 0.25, cy + s * 0.15); ctx.lineTo(cx + s * 0.25, cy + s * 0.15); ctx.stroke();
        // Skull head
        ctx.fillStyle = p.core;
        ctx.beginPath(); ctx.arc(cx, cy - s * 0.4, s * 0.2, 0, Math.PI * 2); ctx.fill();
        // Horns
        ctx.fillStyle = p.wing;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.15, cy - s * 0.5); ctx.lineTo(cx - s * 0.1, cy - s * 0.75);
        ctx.lineTo(cx - s * 0.05, cy - s * 0.45); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.15, cy - s * 0.5); ctx.lineTo(cx + s * 0.1, cy - s * 0.75);
        ctx.lineTo(cx + s * 0.05, cy - s * 0.45); ctx.closePath(); ctx.fill();
        // Glowing eyes
        const eyeGlow = Math.sin(t * 0.01) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 0, 0, ${eyeGlow})`;
        ctx.beginPath(); ctx.arc(cx - s * 0.08, cy - s * 0.42, s * 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s * 0.08, cy - s * 0.42, s * 0.05, 0, Math.PI * 2); ctx.fill();
    }
    
    // === BROOD MOTHER: Spider queen with legs ===
    _drawBossBroodmother(ctx, cx, cy, s, t, p) {
        // Spider legs (8)
        ctx.strokeStyle = p.accent; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
            const side = i < 4 ? -1 : 1;
            const idx = i % 4;
            const baseAngle = side * (0.3 + idx * 0.35);
            const legWave = Math.sin(t * 0.006 + i * 0.5) * 0.1;
            const startX = cx + side * s * 0.3;
            const startY = cy - s * 0.1 + idx * s * 0.15;
            const midX = startX + side * s * 0.4;
            const midY = startY - s * 0.2 + Math.sin(t * 0.008 + i) * s * 0.1;
            const endX = midX + side * s * 0.2;
            const endY = startY + s * 0.15;
            ctx.beginPath(); ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(midX, midY, endX, endY); ctx.stroke();
        }
        // Abdomen (large bulbous)
        ctx.fillStyle = p.body;
        ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.15, s * 0.4, s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        // Egg sac pattern
        ctx.fillStyle = p.core;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * s * 0.2, cy + s * 0.2 + Math.sin(a) * s * 0.2, s * 0.06, 0, Math.PI * 2);
            ctx.fill();
        }
        // Cephalothorax
        ctx.fillStyle = p.accent;
        ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.25, s * 0.25, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
        // Eyes (cluster of 8 red)
        ctx.fillStyle = '#ff0000';
        const eyePositions = [[-0.1,-0.08],[0.1,-0.08],[-0.06,-0.03],[0.06,-0.03],[-0.12,0],[0.12,0],[-0.04,0.04],[0.04,0.04]];
        eyePositions.forEach(pos => {
            ctx.beginPath();
            ctx.arc(cx + pos[0] * s, cy - s * 0.25 + pos[1] * s, s * 0.03, 0, Math.PI * 2);
            ctx.fill();
        });
        // Mandibles
        ctx.strokeStyle = p.core; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - s * 0.08, cy - s * 0.15); ctx.lineTo(cx - s * 0.15, cy - s * 0.08); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + s * 0.08, cy - s * 0.15); ctx.lineTo(cx + s * 0.15, cy - s * 0.08); ctx.stroke();
    }
    
    // === VOID WALKER: Spectral horror with void portals ===
    _drawBossVoidwalker(ctx, cx, cy, s, t, p) {
        const phase = Math.sin(t * 0.004) * 0.2 + 0.8;
        // Void portals orbiting
        ctx.strokeStyle = p.glow; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + t * 0.002;
            const d = s * 0.7;
            const px = cx + Math.cos(a) * d;
            const py = cy + Math.sin(a) * d;
            ctx.save(); ctx.translate(px, py); ctx.rotate(a + t * 0.005);
            ctx.beginPath(); ctx.ellipse(0, 0, s * 0.12, s * 0.06, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = `rgba(0, 0, 0, 0.6)`;
            ctx.fill();
            ctx.restore();
        }
        // Ethereal body (fading)
        ctx.globalAlpha = phase;
        const bodyGrad = ctx.createLinearGradient(cx, cy - s * 0.5, cx, cy + s * 0.7);
        bodyGrad.addColorStop(0, p.body); bodyGrad.addColorStop(0.7, p.body); bodyGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s * 0.55);
        ctx.quadraticCurveTo(cx + s * 0.4, cy - s * 0.3, cx + s * 0.35, cy + s * 0.2);
        ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.6, cx, cy + s * 0.7);
        ctx.quadraticCurveTo(cx - s * 0.3, cy + s * 0.6, cx - s * 0.35, cy + s * 0.2);
        ctx.quadraticCurveTo(cx - s * 0.4, cy - s * 0.3, cx, cy - s * 0.55);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Hollow face
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath(); ctx.arc(cx, cy - s * 0.3, s * 0.18, 0, Math.PI * 2); ctx.fill();
        // Burning void eyes
        const voidPulse = Math.sin(t * 0.008) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(167, 139, 250, ${voidPulse})`;
        ctx.beginPath(); ctx.arc(cx - s * 0.07, cy - s * 0.32, s * 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s * 0.07, cy - s * 0.32, s * 0.05, 0, Math.PI * 2); ctx.fill();
    }
    
    // === NECROMANCER: Floating lich with soul energy ===
    _drawBossNecromancer(ctx, cx, cy, s, t, p) {
        const soulPulse = Math.sin(t * 0.005) * 0.2 + 0.7;
        // Swirling soul energy
        ctx.strokeStyle = `rgba(${this.hexToRgb(p.glow)}, ${soulPulse * 0.4})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + t * 0.002;
            const d = s * (0.6 + Math.sin(t * 0.003 + i) * 0.15);
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s * 0.05, 0, Math.PI * 2);
            ctx.stroke();
        }
        // Robed body
        const robeGrad = ctx.createLinearGradient(cx, cy - s * 0.4, cx, cy + s * 0.65);
        robeGrad.addColorStop(0, p.body); robeGrad.addColorStop(0.8, p.body); robeGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = robeGrad;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.2, cy - s * 0.35);
        ctx.lineTo(cx + s * 0.2, cy - s * 0.35);
        ctx.lineTo(cx + s * 0.4, cy + s * 0.5);
        ctx.lineTo(cx - s * 0.4, cy + s * 0.5);
        ctx.closePath(); ctx.fill();
        // Bone crown
        ctx.fillStyle = p.core;
        for (let i = 0; i < 5; i++) {
            const a = Math.PI * 1.15 + (i / 4) * Math.PI * 0.7;
            const bx = cx + Math.cos(a) * s * 0.22;
            const by = cy - s * 0.4 + Math.sin(a) * s * 0.22;
            ctx.beginPath();
            ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * s * 0.1, by + Math.sin(a) * s * 0.1 - s * 0.05);
            ctx.lineTo(bx + s * 0.02, by); ctx.closePath(); ctx.fill();
        }
        // Skull face
        ctx.fillStyle = p.core;
        ctx.beginPath(); ctx.arc(cx, cy - s * 0.35, s * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(167, 139, 250, ${soulPulse})`;
        ctx.beginPath(); ctx.arc(cx - s * 0.06, cy - s * 0.37, s * 0.04, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s * 0.06, cy - s * 0.37, s * 0.04, 0, Math.PI * 2); ctx.fill();
        // Staff
        ctx.strokeStyle = p.core; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx + s * 0.25, cy - s * 0.2); ctx.lineTo(cx + s * 0.3, cy + s * 0.45); ctx.stroke();
        ctx.fillStyle = p.glow;
        ctx.beginPath(); ctx.arc(cx + s * 0.25, cy - s * 0.2, s * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    
    // === TITAN: Colossal armored war machine ===
    _drawBossTitan(ctx, cx, cy, s, t, p) {
        const runePulse = Math.sin(t * 0.006) * 0.4 + 0.6;
        const quakeActive = this.earthquakeCooldown < 60;
        // Earthquake warning
        if (quakeActive) {
            const quakePulse = (60 - this.earthquakeCooldown) / 60;
            ctx.strokeStyle = `rgba(251, 191, 36, ${quakePulse})`;
            ctx.lineWidth = 4;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath(); ctx.arc(cx, cy, s * (1 + i * 0.2 + quakePulse * 0.3), 0, Math.PI * 2); ctx.stroke();
            }
        }
        // Massive armored body
        ctx.fillStyle = p.body;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.35, cy - s * 0.4);
        ctx.lineTo(cx + s * 0.35, cy - s * 0.4);
        ctx.lineTo(cx + s * 0.45, cy + s * 0.05);
        ctx.lineTo(cx + s * 0.35, cy + s * 0.45);
        ctx.lineTo(cx - s * 0.35, cy + s * 0.45);
        ctx.lineTo(cx - s * 0.45, cy + s * 0.05);
        ctx.closePath(); ctx.fill();
        // Rune markings
        ctx.fillStyle = `rgba(251, 191, 36, ${runePulse})`;
        for (let i = 0; i < 8; i++) {
            const rx = cx - s * 0.25 + (i % 4) * s * 0.17;
            const ry = cy - s * 0.2 + Math.floor(i / 4) * s * 0.3;
            ctx.beginPath(); ctx.arc(rx, ry, s * 0.03, 0, Math.PI * 2); ctx.fill();
        }
        // Shoulder pauldrons
        ctx.fillStyle = p.accent;
        ctx.beginPath(); ctx.ellipse(cx - s * 0.4, cy - s * 0.25, s * 0.15, s * 0.1, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + s * 0.4, cy - s * 0.25, s * 0.15, s * 0.1, 0.3, 0, Math.PI * 2); ctx.fill();
        // Helmet head
        ctx.fillStyle = p.wing;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.2, cy - s * 0.35);
        ctx.lineTo(cx, cy - s * 0.6);
        ctx.lineTo(cx + s * 0.2, cy - s * 0.35);
        ctx.lineTo(cx + s * 0.15, cy - s * 0.2);
        ctx.lineTo(cx - s * 0.15, cy - s * 0.2);
        ctx.closePath(); ctx.fill();
        // Visor
        ctx.fillStyle = `rgba(251, 191, 36, ${runePulse})`;
        ctx.fillRect(cx - s * 0.12, cy - s * 0.35, s * 0.24, s * 0.06);
        // Fists
        ctx.fillStyle = p.accent;
        ctx.beginPath(); ctx.arc(cx - s * 0.5, cy + s * 0.2, s * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s * 0.5, cy + s * 0.2, s * 0.1, 0, Math.PI * 2); ctx.fill();
    }
    
    // === HIVEMIND: Massive brain entity with psychic tentacles ===
    _drawBossHivemind(ctx, cx, cy, s, t, p) {
        const psiPulse = Math.sin(t * 0.005) * 0.3 + 0.5;
        // Psionic waves
        ctx.strokeStyle = `rgba(${this.hexToRgb(p.glow)}, ${psiPulse * 0.3})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const r = s * (0.8 + i * 0.15 + Math.sin(t * 0.003 + i) * 0.1);
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        }
        // Tentacles
        ctx.strokeStyle = p.accent; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const wave = Math.sin(t * 0.005 + i) * s * 0.15;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * s * 0.3, cy + Math.sin(a) * s * 0.3);
            ctx.quadraticCurveTo(
                cx + Math.cos(a) * s * 0.5 + wave,
                cy + Math.sin(a) * s * 0.5,
                cx + Math.cos(a) * s * 0.7,
                cy + Math.sin(a) * s * 0.7
            );
            ctx.stroke();
        }
        // Brain body
        ctx.fillStyle = p.body;
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2); ctx.fill();
        // Brain folds
        ctx.fillStyle = p.core;
        ctx.beginPath(); ctx.arc(cx, cy - s * 0.1, s * 0.35, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = p.accent; ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(cx + (i - 1.5) * s * 0.1, cy - s * 0.15, s * 0.1, Math.PI, 0);
            ctx.stroke();
        }
        // Central eye
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx, cy + s * 0.1, s * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.accent;
        ctx.beginPath(); ctx.arc(cx, cy + s * 0.1, s * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    
    // === LEVIATHAN: Enormous serpent/dragon ===
    _drawBossLeviathan(ctx, cx, cy, s, t, p) {
        const chargeGlow = this.isCharging ? 0.8 : 0;
        // Serpentine body segments
        ctx.fillStyle = p.body;
        for (let i = 5; i >= 0; i--) {
            const segAngle = Math.sin(t * 0.004 + i * 0.7) * 0.3;
            const segX = cx - Math.cos(segAngle) * i * s * 0.12;
            const segY = cy + i * s * 0.1 + Math.sin(t * 0.005 + i) * s * 0.05;
            const segSize = s * (0.35 - i * 0.03);
            ctx.beginPath(); ctx.arc(segX, segY, segSize, 0, Math.PI * 2); ctx.fill();
            // Scale detail
            if (i > 0) {
                ctx.fillStyle = p.core;
                ctx.beginPath(); ctx.arc(segX, segY, segSize * 0.5, 0, Math.PI); ctx.fill();
                ctx.fillStyle = p.body;
            }
        }
        // Head (dragon-like)
        ctx.fillStyle = p.wing;
        ctx.beginPath(); ctx.arc(cx, cy - s * 0.05, s * 0.3, 0, Math.PI * 2); ctx.fill();
        // Dragon crest
        ctx.fillStyle = p.core;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.15, cy - s * 0.25);
        ctx.lineTo(cx, cy - s * 0.5);
        ctx.lineTo(cx + s * 0.15, cy - s * 0.25);
        ctx.closePath(); ctx.fill();
        // Horns
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.2, cy - s * 0.15);
        ctx.lineTo(cx - s * 0.35, cy - s * 0.45);
        ctx.lineTo(cx - s * 0.12, cy - s * 0.2);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.2, cy - s * 0.15);
        ctx.lineTo(cx + s * 0.35, cy - s * 0.45);
        ctx.lineTo(cx + s * 0.12, cy - s * 0.2);
        ctx.closePath(); ctx.fill();
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx - s * 0.1, cy - s * 0.1, s * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s * 0.1, cy - s * 0.1, s * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.accent;
        ctx.beginPath(); ctx.arc(cx - s * 0.1, cy - s * 0.1, s * 0.035, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s * 0.1, cy - s * 0.1, s * 0.035, 0, Math.PI * 2); ctx.fill();
        // Charge effect
        if (chargeGlow > 0) {
            ctx.strokeStyle = `rgba(45, 212, 191, ${chargeGlow})`;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(cx, cy, s * 0.9, 0, Math.PI * 2); ctx.stroke();
        }
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
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
                // Split shot
                if (game.player && game.player.splitShot && !this.isSplit) {
                    [this.angle + 0.5, this.angle - 0.5].forEach(a => {
                        const splitBullet = new Bullet(this.x, this.y, a, game.player, WEAPON_TYPES[game.currentWeapon] || WEAPON_TYPES.basic);
                        splitBullet.damage *= 0.5; splitBullet.isSplit = true; splitBullet.size *= 0.7;
                        game.bullets.push(splitBullet);
                    });
                }
                if (this.hitEnemies.length >= this.piercing) return false;
            }
        }

        // Bouncing bullets
        if (game.player && game.player.bulletBounce > 0) {
            if (this.bounceLeft === undefined) this.bounceLeft = game.player.bulletBounce;
            if (this.bounceLeft > 0) {
                if (this.x < 0 || this.x > CONFIG.CANVAS_WIDTH) { this.angle = Math.PI - this.angle; this.x = Math.max(1, Math.min(CONFIG.CANVAS_WIDTH - 1, this.x)); this.bounceLeft--; return true; }
                if (this.y < 0 || this.y > CONFIG.CANVAS_HEIGHT) { this.angle = -this.angle; this.y = Math.max(1, Math.min(CONFIG.CANVAS_HEIGHT - 1, this.y)); this.bounceLeft--; return true; }
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

class XPOrb {
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
        const bob = Math.sin(Date.now() * 0.004 + this.bobOffset) * 3;
        const pulse = Math.sin(Date.now() * 0.006 + this.bobOffset) * 0.3 + 0.7;
        
        ctx.save();
        // Fade out when about to despawn
        if (this.life < 120) {
            ctx.globalAlpha = this.life / 120;
        }
        
        // Glow
        ctx.fillStyle = this.glowColor;
        ctx.globalAlpha *= 0.3 * pulse;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob, this.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.globalAlpha = this.life < 120 ? this.life / 120 : 1;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob, this.size * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright center
        ctx.fillStyle = '#fff';
        ctx.globalAlpha *= 0.6;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
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
        } else if (p.type === 'fire_trail') {
            p.life--;
            p.size *= 0.98;
            if (p.life % 15 === 0) {
                game.enemies.forEach(e => { if (Math.hypot(e.x - p.x, e.y - p.y) < p.size + e.size) e.takeDamage(p.damage, false); });
            }
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
        } else if (p.type === 'fire_trail') {
            ctx.save();
            ctx.globalAlpha = p.life / p.maxLife * 0.7;
            ctx.fillStyle = p.color;
            ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
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
    
    // Gameplay-Changing Items
    { name: '🏀 Rubber Bullets', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.RARE, basePrice: 22,
      effects: ['Bullets bounce off walls', '+1 Bounce'], apply: p => { p.bulletBounce = (p.bulletBounce || 0) + 1; } },
    { name: '💔 Split Shot', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.RARE, basePrice: 24,
      effects: ['Bullets split on hit', '-20% Damage'], apply: p => { p.splitShot = true; p.damage = Math.floor(p.damage * 0.8); } },
    { name: '🔵 Orbital Shield', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.EPIC, basePrice: 28,
      effects: ['+3 Orbital orbs', 'Deal contact damage'], apply: p => { p.orbitalCount = (p.orbitalCount || 0) + 3; } },
    { name: '🌶️ Ghost Pepper', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.UNCOMMON, basePrice: 18,
      effects: ['Leave fire trail when moving'], apply: p => { p.fireTrail = true; } },
    { name: '🪞 Mirror Image', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.EPIC, basePrice: 30,
      effects: ['Create a decoy that enemies target'], apply: p => { p.hasDecoy = true; } },
    { name: '⏳ Time Dilation', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.RARE, basePrice: 20,
      effects: ['Nearby enemies 25% slower'], apply: p => { p.timeDilation = (p.timeDilation || 0) + 0.25; } },
    { name: '🌀 Magnetic Field', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.UNCOMMON, basePrice: 16,
      effects: ['Pull nearby pickups', '+50 Range'], apply: p => { p.magnetField = true; p.pickupRange += 50; } },
    { name: '☠️ Poison Cloud', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.RARE, basePrice: 22,
      effects: ['Enemies near you take 2 DPS'], apply: p => { p.poisonCloudDmg = (p.poisonCloudDmg || 0) + 2; } },
    // Weapon Slot Items
    { name: '🔧 Weapon Mount', category: ITEM_CATEGORIES.WEAPON, rarity: RARITY.UNCOMMON, basePrice: 20,
      effects: ['+1 Weapon Slot'], apply: p => { if (p.weaponSlots.length < p.maxWeaponSlots) p.weaponSlots.push({ type: 'basic', cooldown: 0 }); } },
    { name: '⚡ Auto-Turret Mount', category: ITEM_CATEGORIES.WEAPON, rarity: RARITY.RARE, basePrice: 30,
      effects: ['+1 Slot (Laser)'], apply: p => { if (p.weaponSlots.length < p.maxWeaponSlots) p.weaponSlots.push({ type: 'laser', cooldown: 0 }); } },
    { name: '🚀 Heavy Mount', category: ITEM_CATEGORIES.WEAPON, rarity: RARITY.EPIC, basePrice: 40,
      effects: ['+1 Slot (Rocket)'], apply: p => { if (p.weaponSlots.length < p.maxWeaponSlots) p.weaponSlots.push({ type: 'rocket', cooldown: 0 }); } },
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

// ==================== ARENA SYSTEM ====================
const ARENA_THEMES = {
    asteroid: { name: 'Asteroid Field', bgColor: '#0a0a1a', gridColor: 'rgba(78,205,196,0.05)', obstacleColor: '#4a4a5a', waves: [1, 5] },
    ice: { name: 'Ice Cavern', bgColor: '#0a1a2e', gridColor: 'rgba(135,206,235,0.05)', obstacleColor: '#87ceeb', hazardColor: '#38bdf8', waves: [6, 10] },
    lava: { name: 'Lava Planet', bgColor: '#1a0a0a', gridColor: 'rgba(255,69,0,0.05)', obstacleColor: '#8b4513', hazardColor: '#ff4500', waves: [11, 15] },
    void: { name: 'Void Dimension', bgColor: '#0a0020', gridColor: 'rgba(139,92,246,0.05)', obstacleColor: '#4c1d95', hazardColor: '#8b5cf6', waves: [16, 20] },
    final: { name: 'Final Station', bgColor: '#0a0a0a', gridColor: 'rgba(255,217,61,0.03)', obstacleColor: '#ffd93d', hazardColor: '#ff0000', waves: [21, 999] },
};

// Hazard type icons (module-level for reuse)
const HAZARD_ICONS = { ice_patch: '❄️', lava_pool: '🔥', void_zone: '🌀' };

// Arena tuning constants
const ARENA_CONSTANTS = {
    WALK_ANIM_FRAME_DURATION: 10,
    FIRE_TRAIL_LIFE: 90,
    FIRE_TRAIL_SIZE: 12,
    FIRE_TRAIL_DAMAGE: 3,
    DECOY_HEALTH: 30,
    DECOY_RESPAWN_TIME: 300,
    TURRET_MAX: 3,
    TURRET_SPAWN_INTERVAL: 300,
    TURRET_HEALTH: 50,
    TURRET_SPREAD: 100,
};

function getCurrentTheme() {
    for (const key of Object.keys(ARENA_THEMES)) {
        const t = ARENA_THEMES[key];
        if (game.wave >= t.waves[0] && game.wave <= t.waves[1]) return { key, ...t };
    }
    return { key: 'asteroid', ...ARENA_THEMES.asteroid };
}

function generateArenaObstacles() {
    game.obstacles = [];
    game.hazards = [];
    game.arenaTheme = getCurrentTheme();
    const theme = game.arenaTheme;
    const count = Math.min(3 + Math.floor(game.wave / 3), 12);
    const margin = 80;
    for (let i = 0; i < count; i++) {
        const x = margin + Math.random() * (CONFIG.CANVAS_WIDTH - margin * 2);
        const y = margin + Math.random() * (CONFIG.CANVAS_HEIGHT - margin * 2);
        if (Math.hypot(x - CONFIG.CANVAS_WIDTH / 2, y - CONFIG.CANVAS_HEIGHT / 2) < 120) continue;
        const types = ['rock', 'crater', 'pillar'];
        const type = types[Math.floor(Math.random() * types.length)];
        const radius = 20 + Math.random() * 25;
        const hp = type === 'pillar' ? 50 + game.wave * 5 : Infinity;
        game.obstacles.push({ x, y, radius, type, health: hp, maxHealth: hp, color: theme.obstacleColor });
    }
    if (theme.hazardColor) {
        const hzCount = Math.min(2 + Math.floor(game.wave / 5), 6);
        for (let i = 0; i < hzCount; i++) {
            const x = margin + Math.random() * (CONFIG.CANVAS_WIDTH - margin * 2);
            const y = margin + Math.random() * (CONFIG.CANVAS_HEIGHT - margin * 2);
            if (Math.hypot(x - CONFIG.CANVAS_WIDTH / 2, y - CONFIG.CANVAS_HEIGHT / 2) < 150) continue;
            const htype = theme.key === 'ice' ? 'ice_patch' : theme.key === 'lava' ? 'lava_pool' : 'void_zone';
            game.hazards.push({ x, y, radius: 40 + Math.random() * 30, type: htype, color: theme.hazardColor, damage: 1 + game.wave * 0.2 });
        }
    }
}

function drawArenaObstacles(ctx) {
    if (game.hazards) {
        game.hazards.forEach(hz => {
            ctx.save();
            const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.4;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = hz.color;
            ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#fff'; ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(HAZARD_ICONS[hz.type] || '⚠️', hz.x, hz.y);
            ctx.restore();
        });
    }
    if (game.obstacles) {
        game.obstacles.forEach(obs => {
            if (obs.health <= 0) return;
            ctx.save();
            if (obs.type === 'rock') {
                ctx.fillStyle = obs.color; ctx.beginPath();
                for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const r = obs.radius * (0.7 + Math.sin(i * 2.3) * 0.3); const ox = obs.x + Math.cos(a) * r; const oy = obs.y + Math.sin(a) * r; i === 0 ? ctx.moveTo(ox, oy) : ctx.lineTo(ox, oy); }
                ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();
            } else if (obs.type === 'crater') {
                ctx.strokeStyle = obs.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
            } else if (obs.type === 'pillar') {
                ctx.fillStyle = obs.color; ctx.fillRect(obs.x - obs.radius * 0.5, obs.y - obs.radius, obs.radius, obs.radius * 2);
                ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(obs.x - obs.radius * 0.5, obs.y - obs.radius, obs.radius, obs.radius * 2);
                if (obs.health < obs.maxHealth && obs.maxHealth !== Infinity) {
                    const bw = obs.radius;
                    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(obs.x - bw / 2, obs.y - obs.radius - 8, bw, 4);
                    ctx.fillStyle = '#00ff88'; ctx.fillRect(obs.x - bw / 2, obs.y - obs.radius - 8, bw * (obs.health / obs.maxHealth), 4);
                }
            }
            ctx.restore();
        });
    }
}

// ==================== WAVE SYSTEM ====================
function spawnWave() {
    generateArenaObstacles();
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
                    if (t === 'bomber') return game.wave >= 8;
                    if (t === 'parasite') return game.wave >= 14;
                    if (t === 'shielder') return game.wave >= 16;
                    if (t === 'necro') return game.wave >= 22;
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
    game.xpOrbs = [];
    game.blackHoles = [];
    
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
    if (!game.player) return;
    const slots = game.player.weaponSlots;
    const slotWidth = 80;
    const totalWidth = slots.length * slotWidth + (slots.length - 1) * 5;
    const x = CONFIG.CANVAS_WIDTH - totalWidth - 10;
    const y = CONFIG.CANVAS_HEIGHT - 50;
    ctx.save();
    slots.forEach((slot, i) => {
        const sx = x + i * (slotWidth + 5);
        const weapon = WEAPON_TYPES[slot.type];
        const isActive = i === (game.activeWeaponSlot || 0);
        ctx.fillStyle = isActive ? 'rgba(0,255,136,0.15)' : 'rgba(0,0,0,0.7)';
        ctx.fillRect(sx, y, slotWidth, 38);
        if (slot.cooldown > 0 && slot.maxCooldown > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(sx, y, slotWidth * (slot.cooldown / slot.maxCooldown), 38);
        }
        ctx.strokeStyle = isActive ? '#00ff88' : (weapon ? weapon.color : '#475569');
        ctx.lineWidth = isActive ? 3 : 1;
        ctx.strokeRect(sx, y, slotWidth, 38);
        ctx.fillStyle = '#888'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
        ctx.fillText(`S${i + 1}`, sx + 3, y + 12);
        ctx.fillStyle = weapon ? weapon.color : '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        ctx.fillText(weapon ? weapon.name.split(' ').pop() : '???', sx + slotWidth / 2, y + 28);
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

let cachedDPS = 0;
let lastDPSHistoryLength = 0;

function getAverageDPS() {
    if (game.playerDPS.history.length === 0) return 0;
    // Only recalculate when history changes
    if (game.playerDPS.history.length !== lastDPSHistoryLength) {
        lastDPSHistoryLength = game.playerDPS.history.length;
        cachedDPS = Math.floor(game.playerDPS.history.reduce((a, b) => a + b, 0) / game.playerDPS.history.length);
    }
    return cachedDPS;
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
    const waveTheme = getCurrentTheme();
    if (waveTheme.waves[0] === game.wave) showNotification(`🌍 ${waveTheme.name}`, '#ffd93d', 3000);
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
            msg += ` | NEW: 🆕 ${newType.charAt(0).toUpperCase() + newType.slice(1)}!`;
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
    const theme = game.arenaTheme || getCurrentTheme();
    ctx.fillStyle = theme.bgColor;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Animated starfield
    updateStarfield();
    drawStarfield(ctx);
    
    // Grid with subtle animation (optimized - draw less frequently)
    // Use timestamp divided by ~33ms (approximately 30 FPS) for consistent rendering pattern
    if (Math.floor(timestamp / 33) % 2 === 0) {
        const gridPulse = Math.sin(timestamp * 0.0005) * 0.02 + 0.05;
        ctx.strokeStyle = theme.gridColor || `rgba(78, 205, 196, ${gridPulse})`;
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
    
    // Draw arena obstacles
    drawArenaObstacles(ctx);
    
    // Draw black holes
    if (game.blackHoles) {
        game.blackHoles.forEach(bh => {
            const alpha = bh.life / bh.maxLife;
            const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;
            ctx.save();
            ctx.globalAlpha = alpha * 0.5;
            // Outer swirl
            for (let i = 0; i < 3; i++) {
                const angle = Date.now() * 0.003 + (i / 3) * Math.PI * 2;
                const r = bh.radius * (0.3 + i * 0.25) * pulse;
                ctx.strokeStyle = `rgba(139, 92, 246, ${alpha * 0.3})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(bh.x, bh.y, r, angle, angle + Math.PI * 1.5);
                ctx.stroke();
            }
            // Core
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath();
            ctx.arc(bh.x, bh.y, 15 * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        });
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
        // Update black holes
        if (game.blackHoles) {
            game.blackHoles = game.blackHoles.filter(bh => {
                bh.life--;
                // Pull enemies toward center
                game.enemies.forEach(e => {
                    const dist = Math.hypot(e.x - bh.x, e.y - bh.y);
                    if (dist < bh.radius && dist > 5) {
                        const pull = bh.pullStrength * (1 - dist / bh.radius);
                        e.x += (bh.x - e.x) / dist * pull;
                        e.y += (bh.y - e.y) / dist * pull;
                        // Damage enemies at center
                        if (dist < 30 && bh.life % 10 === 0) {
                            e.takeDamage(game.player.damage * 0.2, false);
                        }
                    }
                });
                return bh.life > 0;
            });
        }
        // Update XP orbs
        game.xpOrbs = game.xpOrbs.filter(orb => orb.update());
        
        game.pickups.forEach(p => p.draw(ctx));
        game.xpOrbs.forEach(orb => orb.draw(ctx));
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
        game.xpOrbs.forEach(orb => orb.draw(ctx));
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
            let nearest = game.enemies[0];
            let nearestDist = Math.hypot(nearest.x - game.player.x, nearest.y - game.player.y);
            for (let i = 1; i < game.enemies.length; i++) {
                const d = Math.hypot(game.enemies[i].x - game.player.x, game.enemies[i].y - game.player.y);
                if (d < nearestDist) { nearest = game.enemies[i]; nearestDist = d; }
            }
            dx = nearest.x - game.player.x;
            dy = nearest.y - game.player.y;
        }
        
        game.player.dash(dx, dy);
        e.preventDefault();
    }
    
    // Tab cycles active weapon slot
    if (e.key === 'Tab' && game.state === 'playing' && !game.paused && game.player) {
        game.activeWeaponSlot = ((game.activeWeaponSlot || 0) + 1) % game.player.weaponSlots.length;
        showNotification(`Slot ${game.activeWeaponSlot + 1} selected`, '#4ecdc4', 800);
        e.preventDefault();
    }
    // Number keys assign weapon to active slot
    if (game.state === 'playing' && !game.paused) {
        const weapons = ['basic', 'laser', 'rocket', 'spread', 'flamethrower', 'lightning', 'freeze', 'plasma'];
        if (e.key >= '1' && e.key <= '8') {
            const weaponIndex = parseInt(e.key) - 1;
            if (weaponIndex < weapons.length && game.player) {
                const slot = game.activeWeaponSlot || 0;
                if (slot < game.player.weaponSlots.length) {
                    game.player.weaponSlots[slot].type = weapons[weaponIndex];
                    game.currentWeapon = weapons[weaponIndex];
                    showNotification(`Slot ${slot + 1}: ${WEAPON_TYPES[weapons[weaponIndex]].name}`, '#4ecdc4', 1000);
                    Sound.play('pickup');
                }
            }
        }
    }
});

window.addEventListener('keyup', e => game.keys[e.key] = false);
window.addEventListener('load', init);
