// Extended Game - Cosmic Survivor
// This is the main refactored game file with all improvements
// With Co-op Multiplayer Support (up to 4 players)

// ==================== CONFIGURATION ====================
const CONFIG = {
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 800,
    WORLD_WIDTH: 3000,
    WORLD_HEIGHT: 2000,
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
        easy:      { enemyHealthMult: 0.7, enemyDamageMult: 0.6,  enemySpeedMult: 0.85, creditMult: 1.3,  xpMult: 1.2 },
        normal:    { enemyHealthMult: 1.0, enemyDamageMult: 1.0,  enemySpeedMult: 1.0,  creditMult: 1.0,  xpMult: 1.0 },
        hard:      { enemyHealthMult: 1.3, enemyDamageMult: 1.25, enemySpeedMult: 1.08, creditMult: 0.9,  xpMult: 0.95 },
        nightmare: { enemyHealthMult: 1.7, enemyDamageMult: 1.45, enemySpeedMult: 1.18, creditMult: 0.75, xpMult: 0.85 },
    },
};

// Part D rework — broadphase cell size (≈ playerBulletRadius × 8).
// CONFIG.BULLET_SIZE = 5 → cell = 40 px. Larger cells reduce cell count but
// increase average candidates per query; 40 is a good balance for typical
// enemy/bullet sizes in Cosmic Survivor. Must match enhanced-init.js.
const BROADPHASE_CELL_SIZE = CONFIG.BULLET_SIZE * 8; // 40

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
        maxHealth: 100, speed: 3, damage: 10, fireRate: 32,
    },
    {
        id: 'tank',
        name: '🛡️ Tank',
        description: 'Heavy armor, solid damage',
        maxHealth: 180, speed: 2.2, damage: 11, fireRate: 38, armor: 8,
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
        maxHealth: 80, speed: 2.5, damage: 22, fireRate: 44, critChance: 0.2, critDamage: 2.2, range: 650,
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
        maxHealth: 75, speed: 3.8, damage: 14, fireRate: 24, critChance: 0.2, critDamage: 1.8, dodge: 0.1,
    },
    {
        id: 'engineer',
        name: '🔧 Engineer',
        description: 'Defensive specialist with range',
        maxHealth: 130, speed: 2.3, damage: 10, fireRate: 36, armor: 8, range: 500, pickupRange: 65,
    },
    {
        id: 'medic',
        name: '💊 Medic',
        description: 'Regenerates health over time',
        maxHealth: 120, speed: 2.6, damage: 9, fireRate: 32, armor: 3, lifeSteal: 0.1, healthRegen: 0.8,
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
        maxHealth: 100, speed: 2.6, damage: 9, fireRate: 38, armor: 2, dodge: 0.05, maxDrones: 2,
    },
    {
        id: 'juggernaut',
        name: '💪 Juggernaut',
        description: 'Unstoppable force, immovable object',
        maxHealth: 200, speed: 1.8, damage: 13, fireRate: 45, armor: 14, lifeSteal: 0.08, knockbackImmune: true,
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

// Weapon Evolution System
// Each weapon can evolve when paired with a specific passive/item at weapon level 5
const WEAPON_EVOLUTIONS = {
    basic: {
        name: '⚡ Railgun',
        requiredItem: 'eagle_eye', // Requires crit-related item
        desc: 'Pierces all enemies with massive crits',
        color: '#00ffff',
        fireRate: 1.8,
        damage: 3.0,
        pierces: true,
        evolvedStats: { critChance: 0.5, critDamage: 3.0 }
    },
    spread: {
        name: '🌌 Galaxy Burst',
        requiredItem: 'bullet_storm', // Extra projectile passive
        desc: '360° bullet ring every shot',
        color: '#ffd700',
        fireRate: 1.5,
        damage: 0.8,
        projectiles: 12,
        fullCircle: true,
        evolvedStats: {}
    },
    freeze: {
        name: '❄️ Absolute Zero',
        requiredItem: 'fortify', // Armor passive
        desc: 'Freezes everything in massive radius',
        color: '#00ffff',
        fireRate: 0.6,
        damage: 1.2,
        aoeFreeze: true,
        freezeRadius: 200,
        evolvedStats: {}
    },
    rocket: {
        name: '☄️ Orbital Strike',
        requiredItem: 'glass_cannon', // Damage passive
        desc: 'Rains rockets from the sky',
        color: '#ff4500',
        fireRate: 2.5,
        damage: 2.0,
        orbitalStrike: true,
        strikeCount: 5,
        evolvedStats: {}
    },
    lightning: {
        name: '🌩️ Storm Caller',
        requiredItem: 'quick_hands', // Fire rate passive
        desc: 'Permanent lightning field around you',
        color: '#00d4ff',
        fireRate: 0.5,
        damage: 0.6,
        lightningField: true,
        fieldRadius: 180,
        evolvedStats: {}
    },
    flamethrower: {
        name: '🔥 Inferno Dash',
        requiredItem: 'nimble', // Speed passive
        desc: 'Leave devastating fire trail while moving',
        color: '#ff6600',
        fireRate: 0.1,
        damage: 0.5,
        infernoDash: true,
        evolvedStats: { speed: 0.5 }
    },
    plasma: {
        name: '🟣 Void Beam',
        requiredItem: 'piercing_rounds', // Piercing item
        desc: 'Continuous sweeping beam of destruction',
        color: '#9d00ff',
        fireRate: 0.08,
        damage: 0.8,
        voidBeam: true,
        beamWidth: 15,
        evolvedStats: {}
    },
    laser: {
        name: '💜 Siphon Ray',
        requiredItem: 'vampirism', // Life steal passive
        desc: 'Drains HP continuously from enemies',
        color: '#ff00ff',
        fireRate: 0.2,
        damage: 0.5,
        siphonRay: true,
        drainAmount: 0.15,
        evolvedStats: { lifeSteal: 0.1 }
    },
};

function checkWeaponEvolution(slot) {
    const evolution = WEAPON_EVOLUTIONS[slot.type];
    if (!evolution || slot.evolved) return;
    
    // Check if player has the required item/passive
    const hasRequired = game.passivesChosen.includes(evolution.requiredItem) ||
        (game.player && (
            (evolution.requiredItem === 'piercing_rounds' && game.player.extraPiercing > 0) ||
            (evolution.requiredItem === 'eagle_eye' && game.player.critChance > 0.2)
        ));
    
    if (hasRequired) {
        evolveWeapon(slot);
    } else {
        showNotification(`${WEAPON_TYPES[slot.type]?.name} ready to evolve! Need: ${evolution.requiredItem.replace(/_/g, ' ')}`, '#ffd93d', 4000);
    }
}

function evolveWeapon(slot) {
    const evolution = WEAPON_EVOLUTIONS[slot.type];
    if (!evolution) return;
    
    slot.evolved = true;
    slot.evolvedData = evolution;
    
    // Apply evolved stats to player
    if (evolution.evolvedStats) {
        Object.entries(evolution.evolvedStats).forEach(([stat, value]) => {
            if (typeof game.player[stat] === 'number') {
                game.player[stat] += value;
            }
        });
    }
    
    // Epic evolution notification
    showNotification(`🌟 EVOLUTION: ${evolution.name}! 🌟`, '#ffd700', 5000);
    Sound.play('combo');
    screenShake(20);
    createExplosion(game.player.x, game.player.y, evolution.color, 50);
    createExplosion(game.player.x, game.player.y, '#ffd700', 30);
}

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
// Credits roughly doubled vs old values — bosses now actually feel like the
// jackpot they're meant to be (was: 5 trash mobs > 1 boss in payout).
// Health multipliers slightly trimmed so wave 25+ bosses aren't HP sponges.
const BOSS_TYPES = {
    destroyer: { name: '👹 Destroyer', color: '#dc2626', size: 2.4, health: 9, damage: 2.5, credits: 200, xp: 80,
        palette: { body: '#dc2626', core: '#fecaca', glow: '#ff0000', accent: '#991b1b', wing: '#7f1d1d' } },
    broodmother: { name: '🕷️ Brood Mother', color: '#7c2d12', size: 2.8, health: 8, damage: 1.8, credits: 240, xp: 100, summons: true,
        palette: { body: '#7c2d12', core: '#d97706', glow: '#f59e0b', accent: '#451a03', wing: '#a16207' } },
    voidwalker: { name: '👻 Void Walker', color: '#581c87', size: 2.2, health: 7, damage: 2.2, credits: 280, xp: 120, teleports: true,
        palette: { body: '#581c87', core: '#a78bfa', glow: '#8b5cf6', accent: '#3b0764', wing: '#7c3aed' } },
    necromancer: { name: '💀 Necromancer', color: '#4c1d95', size: 2.6, health: 8, damage: 2.0, credits: 320, xp: 140, resurrects: true,
        palette: { body: '#4c1d95', core: '#a78bfa', glow: '#8b5cf6', accent: '#2e1065', wing: '#6d28d9' } },
    titan: { name: '⚡ Titan', color: '#b91c1c', size: 3.2, health: 12, damage: 3.5, credits: 400, xp: 180, earthquake: true,
        palette: { body: '#b91c1c', core: '#fbbf24', glow: '#f59e0b', accent: '#7f1d1d', wing: '#92400e' } },
    hivemind: { name: '🧠 Hivemind', color: '#7e22ce', size: 2.5, health: 11, damage: 1.5, credits: 380, xp: 160, commands: true,
        palette: { body: '#7e22ce', core: '#d8b4fe', glow: '#c084fc', accent: '#581c87', wing: '#a855f7' } },
    leviathan: { name: '🐉 Leviathan', color: '#0f766e', size: 3.5, health: 14, damage: 3.0, credits: 480, xp: 200, charges: true,
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
    { id: 'fortify', name: '🛡️ Fortify', desc: '+3 Armor, +15 Max HP', apply: p => { p.armor += 3; p.maxHealth += 15; p.health = Math.min(p.health + 15, p.maxHealth); } },
    { id: 'quick_hands', name: '⚡ Quick Hands', desc: '+10% Fire Rate', apply: p => { p.fireRate = Math.max(5, Math.floor(p.fireRate * 0.9)); } },
    { id: 'nimble', name: '🏃 Nimble', desc: '+0.3 Speed, +5% Dodge', apply: p => { p.speed += 0.3; p.dodge = Math.min(0.7, p.dodge + 0.05); } },
    { id: 'vampirism', name: '🧛 Vampirism', desc: '+8% Life Steal', apply: p => { p.lifeSteal += 0.08; } },
    { id: 'eagle_eye', name: '🎯 Eagle Eye', desc: '+8% Crit Chance, +0.3x Crit Damage', apply: p => { p.critChance = Math.min(0.9, p.critChance + 0.08); p.critDamage += 0.3; } },
    { id: 'thick_skin', name: '💚 Thick Skin', desc: '+25 Max HP, Full Heal', apply: p => { p.maxHealth += 25; p.health = p.maxHealth; } },
    { id: 'bullet_storm', name: '🌟 Bullet Storm', desc: '+1 Projectile', apply: p => { p.projectileCount += 1; } },
    { id: 'scavenger', name: '🧲 Scavenger', desc: '+25 Pickup Range', apply: p => { p.pickupRange += 25; } },
    { id: 'regeneration', name: '💊 Regeneration', desc: '+0.6 HP/s Regen', apply: p => { p.healthRegen = (p.healthRegen || 0) + 0.6; } },
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
    { id: 'iron_skin', name: '🛡️ Iron Skin', desc: '+5 Armor, +20 Max HP', category: 'defensive',
      apply: p => { p.armor += 5; p.maxHealth += 20; p.health = Math.min(p.health + 20, p.maxHealth); } },
    
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
// Expose key constants for ES-module renderer
window.CONFIG = CONFIG;
window.ENEMY_TYPES = ENEMY_TYPES;
window.WEAPON_TYPES = WEAPON_TYPES;
window.BOSS_TYPES = BOSS_TYPES;
window.POWERUP_TYPES = POWERUP_TYPES;

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
    camera: { shake: 0, offsetX: 0, offsetY: 0, x: 0, y: 0, targetX: 0, targetY: 0 },
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
    waveModifier: null,
    fogOfWar: false,
    creditMultiplier: 1,
    corruption: 0,
    devilDealActive: false,
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
    // ===== Multiplayer State =====
    isMultiplayer: false,
    remotePlayers: new Map(), // playerId -> RemotePlayer instance
    localPlayerId: null,
    multiplayerPlayerCount: 1,
    coopSettings: {
        sharedXP: true,
        friendlyFire: false,
        difficultyScale: 1.0,
        sharedXPMultiplier: 0.5,
        enemyScalePerPlayer: 0.3,
    },
    // ===== Game mode (classic | story | daily | multiplayer) =====
    gameMode: 'classic',
    activeStoryChapter: null,   // chapter object when gameMode === 'story'
    activeDailyChallenge: null, // {seed, mutator, difficulty} when gameMode === 'daily'
    storyChapterFinalBossSpawned: false,
    isLocalPlayerDowned: false, // multiplayer: local player downed (waiting for revive)
};

// Expose game state on window so the service-worker reload handler (and other
// integration scripts) can detect when the player is mid-run.
try { window.game = game; } catch {}

// Expose CHARACTERS array so integration scripts (e.g. game-integration.js
// filterCharacterSelection) can rebuild the character list. Without this
// exposure the integration script clears #character-list and bails out,
// leaving an empty character-select modal — i.e. character selection breaks.
try { window.CHARACTERS = CHARACTERS; } catch {}

// --- Phase 1 rework: Object pools (feature-detected; created in init()) ---
let _textParticlePool = null;
let _particlePool = null;
let _enemyBulletPool = null;

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
        const _ac = this.getContext();
        const osc = _ac.createOscillator();
        const gain = _ac.createGain();
        osc.connect(gain);
        gain.connect(_ac.destination);
        
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
                const o = _ac.createOscillator();
                const g = _ac.createGain();
                o.connect(g);
                g.connect(_ac.destination);
                o.type = sound.type;
                o.frequency.value = freq;
                const start = _ac.currentTime + i * (sound.duration / sound.freq.length);
                g.gain.setValueAtTime(sound.volume, start);
                g.gain.exponentialRampToValueAtTime(0.01, start + sound.duration / sound.freq.length);
                o.start(start);
                o.stop(start + sound.duration / sound.freq.length);
            });
        } else {
            osc.type = sound.type;
            osc.frequency.value = sound.freq;
            gain.gain.setValueAtTime(sound.volume, _ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, _ac.currentTime + sound.duration);
            osc.start();
            osc.stop(_ac.currentTime + sound.duration);
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
// Expose Sound on window for entity modules (Player.js, Bullet.js) which are
// ESM scripts and cannot reference `const Sound` from main.js's classic scope.
window.Sound = Sound;

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
                p.weaponSlots.push({ type: weaponKey, cooldown: 0, level: 1, xp: 0, evolved: false });
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
            createExplosion(game.player.x, game.player.y, '#ffd93d', 25);
            
            modal.remove();
            game.paused = false;
        });
    });
}

// ==================== VISUAL FEEDBACK HELPERS ====================
function screenShake(intensity = CONFIG.SCREEN_SHAKE_INTENSITY) {
    game.camera.shake = Math.max(game.camera.shake, intensity);
    // Phase 2 rework: also feed the trauma-model shake when present so the
    // new juice system layers on top of legacy shake without changing
    // any callsites. Trauma is squared internally so we normalize the
    // legacy intensity (0..25-ish) to the trauma scale (0..1).
    if (window.rework && window.rework.juice) {
        window.rework.juice.shake.add(Math.min(1, intensity / 25));
    }
}

/**
 * Phase 2 rework — pause sim for short windows on heavy hits. Safe no-op
 * when the rework module hasn't loaded.
 */
function hitStop(durationMs) {
    if (window.rework && window.rework.juice) {
        window.rework.juice.hitStop.trigger(durationMs);
    }
}

function updateCamera() {
    // Camera follows local player (in multiplayer, only follow the local player)
    const targetPlayer = game.player;
    if (targetPlayer) {
        game.camera.targetX = targetPlayer.x - CONFIG.CANVAS_WIDTH / 2;
        game.camera.targetY = targetPlayer.y - CONFIG.CANVAS_HEIGHT / 2;
        
        // Clamp to world bounds
        game.camera.targetX = Math.max(0, Math.min(CONFIG.WORLD_WIDTH - CONFIG.CANVAS_WIDTH, game.camera.targetX));
        game.camera.targetY = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.CANVAS_HEIGHT, game.camera.targetY));
        
        // Smooth follow (lerp)
        game.camera.x += (game.camera.targetX - game.camera.x) * 0.08;
        game.camera.y += (game.camera.targetY - game.camera.y) * 0.08;
    }
    
    // Screen shake
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
    if (game.enemies.length === 0 && game.state === 'playing' && game.timeLeft > CONFIG.WAVE_CLEAR_COUNTDOWN) {
        game.timeLeft = CONFIG.WAVE_CLEAR_COUNTDOWN;
        
        // Wave complete celebration
        const waveDamageThisWave = game.stats.damageTaken - (game.stats.waveStartDamage || 0);
        const perfectWave = waveDamageThisWave === 0;
        
        if (perfectWave) {
            showNotification('⭐ PERFECT WAVE! No damage taken! +10 bonus credits ⭐', '#ffd93d', 3000);
            game.credits += 10;
            screenShake(5);
        } else {
            showNotification(`Wave Cleared! Shop opening soon...`, '#00ff88');
        }
        
        Sound.play('powerup');
        
        // Celebration particles
        for (let i = 0; i < 20; i++) {
            const px = game.player.x + (Math.random() - 0.5) * 200;
            const py = game.player.y + (Math.random() - 0.5) * 200;
            createParticles(px, py, perfectWave ? '#ffd93d' : '#00ff88', 3);
        }
    }
}

function updateNotifications() {
    game.notifications = game.notifications.filter(n => {
        n.life--;
        return n.life > 0;
    });
}

function drawNotifications(ctx) {
    
}

// ==================== POWERUP SYSTEM ====================
// Powerup class extracted to js/entities/Pickup.js (§9 entity peeling)
// window.Powerup is set by enhanced-init.js before init() runs.

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

// ==================== WEAPON VISUAL HELPER ====================
/**
 * Draw a weapon-specific icon at (ox, oy) rotated so that the weapon
 * faces "outward" along orbitAngle.  ctx should already have globalAlpha
 * and shadowBlur set by the caller.
 */
function drawWeaponVisual(ctx, slotType, ox, oy, orbitAngle, color, now) {
    
}

// Player class extracted to js/entities/Player.js (Part 5 – §9 entity peeling)
// window.Player is set by enhanced-init.js before init() runs.

// ==================== REMOTE PLAYER CLASS (Multiplayer) ====================
class RemotePlayer {
    constructor(playerData) {
        this.id = playerData.id;
        this.displayName = playerData.displayName || 'Player';
        this.characterId = playerData.characterId;
        this.playerIndex = playerData.playerIndex || 0;
        this.color = playerData.color || '#ff6b6b';
        
        // Position & state (interpolated)
        this.x = playerData.spawnX || CONFIG.WORLD_WIDTH / 2;
        this.y = playerData.spawnY || CONFIG.WORLD_HEIGHT / 2;
        this.targetX = this.x;
        this.targetY = this.y;
        this.size = CONFIG.PLAYER_SIZE;
        
        // Visual state
        this.health = 100;
        this.maxHealth = 100;
        this.isAlive = true;
        this.facingRight = true;
        this.aimAngle = 0;
        this.isMoving = false;
        this.walkFrame = 0;
        this.walkTimer = 0;
        this.isDashing = false;
        this.level = 1;
        this.activeWeaponSlot = 0;
        this.weaponSlots = [{ type: 'basic', level: 1 }];
        
        // Interpolation
        this.interpFactor = 0.15;
        this.lastUpdateTime = Date.now();
    }

    updateFromNetwork(state) {
        if (state.x !== undefined) this.targetX = state.x;
        if (state.y !== undefined) this.targetY = state.y;
        if (state.health !== undefined) this.health = state.health;
        if (state.maxHealth !== undefined) this.maxHealth = state.maxHealth;
        if (state.isAlive !== undefined) this.isAlive = state.isAlive;
        if (state.facingRight !== undefined) this.facingRight = state.facingRight;
        if (state.aimAngle !== undefined) this.aimAngle = state.aimAngle;
        if (state.isMoving !== undefined) this.isMoving = state.isMoving;
        if (state.walkFrame !== undefined) this.walkFrame = state.walkFrame;
        if (state.isDashing !== undefined) this.isDashing = state.isDashing;
        if (state.level !== undefined) this.level = state.level;
        if (state.activeWeaponSlot !== undefined) this.activeWeaponSlot = state.activeWeaponSlot;
        if (state.weaponSlots !== undefined) this.weaponSlots = state.weaponSlots;
        if (state.characterId !== undefined) this.characterId = state.characterId;
        this.lastUpdateTime = Date.now();
    }

    update() {
        // Smooth interpolation toward target position
        this.x += (this.targetX - this.x) * this.interpFactor;
        this.y += (this.targetY - this.y) * this.interpFactor;
        
        // Walk animation for visual smoothness
        if (this.isMoving) {
            this.walkTimer++;
            if (this.walkTimer >= 8) {
                this.walkTimer = 0;
                this.walkFrame = this.walkFrame === 0 ? 1 : 0;
            }
        } else {
            this.walkTimer = 0;
            this.walkFrame = 0;
        }
    }

    draw(ctx) {
    }
    
    _lightenColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + amount);
        const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
        const b = Math.min(255, (num & 0x0000FF) + amount);
        return `rgb(${r},${g},${b})`;
    }
    
    _darkenColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - amount);
        const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
        const b = Math.max(0, (num & 0x0000FF) - amount);
        return `rgb(${r},${g},${b})`;
    }
}

// ==================== MULTIPLAYER HELPERS ====================
// Returns the nearest alive player target (local + remote) to a position
function getNearestPlayerTarget(fromX, fromY) {
    let nearest = null;
    let nearestDist = Infinity;

    // Check local player
    if (game.player && game.player.health > 0) {
        const d = Math.hypot(game.player.x - fromX, game.player.y - fromY);
        if (d < nearestDist) {
            nearest = game.player;
            nearestDist = d;
        }
    }

    // Check remote players in multiplayer
    if (game.isMultiplayer) {
        for (const rp of game.remotePlayers.values()) {
            if (rp.isAlive) {
                const d = Math.hypot(rp.x - fromX, rp.y - fromY);
                if (d < nearestDist) {
                    nearest = rp;
                    nearestDist = d;
                }
            }
        }
    }

    return nearest || game.player;
}

// Get all alive players as an array
function getAllAlivePlayers() {
    const players = [];
    if (game.player && game.player.health > 0) {
        players.push(game.player);
    }
    if (game.isMultiplayer) {
        for (const rp of game.remotePlayers.values()) {
            if (rp.isAlive) players.push(rp);
        }
    }
    return players;
}

// Get a random alive player (for spawn targeting)
function getRandomAlivePlayer() {
    const players = getAllAlivePlayers();
    if (players.length === 0) return game.player;
    return players[Math.floor(Math.random() * players.length)];
}

// Enemy class extracted to js/entities/Enemy.js (§9 entity peeling)
// window.Enemy is set by enhanced-init.js before init() runs.


// Bullet / EnemyBullet class extracted to js/entities/Bullet.js (Part 5 – §9 entity peeling)
// window.Bullet / window.EnemyBullet are set by enhanced-init.js before init() runs.

// ==================== PICKUP & PARTICLES ====================
// Pickup, XPOrb classes extracted to js/entities/Pickup.js (§9 entity peeling)
// window.Pickup / window.XPOrb are set by enhanced-init.js before init() runs.

// ==================== VISUAL EFFECTS ====================
// Enhanced particle system
function createParticles(x, y, color, count) {
    // Limit total particles for performance
    if (game.particles.length > CONFIG.MAX_PARTICLES) return;
    
    count = Math.min(count, CONFIG.MAX_PARTICLES - game.particles.length);
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        const speed = 2 + Math.random() * 4;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 2;
        const pLife = 30 + Math.random() * 20;
        const pSize = 2 + Math.random() * 2;
        let p = null;
        if (_particlePool) {
            p = _particlePool.acquire(x, y, vx, vy, color, pLife, pSize);
            if (p) p._pool = _particlePool;
        }
        if (!p) {
            p = { x, y, vx, vy, color, life: pLife, maxLife: 50, size: pSize, type: 'particle', _pool: null };
        }
        game.particles.push(p);
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
    let p = null;
    if (_textParticlePool) {
        p = _textParticlePool.acquire(x, y, text, color, size);
        if (p) p._pool = _textParticlePool;
    }
    if (!p) {
        p = { x, y, text, color, life: 60, maxLife: 60, vy: -1.5, scale: 1, fontSize: size, type: 'text', _pool: null };
    }
    game.particles.push(p);
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
            if (p.life > 0) return true;
            p._pool?.release(p);
            return false;
        } else if (p.type === 'explosion') {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life--;
            if (p.life > 0) return true;
            p._pool?.release(p);
            return false;
        } else if (p.type === 'fire_trail') {
            p.life--;
            p.size *= 0.98;
            if (p.life % 15 === 0) {
                game.enemies.forEach(e => { if (Math.hypot(e.x - p.x, e.y - p.y) < p.size + e.size) e.takeDamage(p.damage, false); });
            }
            if (p.life > 0) return true;
            p._pool?.release(p);
            return false;
        } else {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life--;
            if (p.life > 0) return true;
            p._pool?.release(p);
            return false;
        }
    });
}

function drawParticles(ctx) {
    
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

// Devil Deal items - cost HP instead of credits, offered after boss waves
const DEVIL_DEAL_ITEMS = [
    { name: '😈 Dark Power', hpCost: 20, effects: ['+30% Damage', '-20 Max HP'],
      apply: p => { p.damage = Math.floor(p.damage * 1.3); p.maxHealth -= 20; p.health = Math.min(p.health, p.maxHealth); } },
    { name: '😈 Soul Pact', hpCost: 25, effects: ['+50% Fire Rate', '-25 Max HP'],
      apply: p => { p.fireRate = Math.max(5, Math.floor(p.fireRate * 0.5)); p.maxHealth -= 25; p.health = Math.min(p.health, p.maxHealth); } },
    { name: '😈 Blood Oath', hpCost: 15, effects: ['+25% Life Steal', '-15 Max HP'],
      apply: p => { p.lifeSteal += 0.25; p.maxHealth -= 15; p.health = Math.min(p.health, p.maxHealth); } },
    { name: '😈 Forbidden Knowledge', hpCost: 30, effects: ['+2 Projectiles', '+15 Damage', '-30 Max HP'],
      apply: p => { p.projectileCount += 2; p.damage += 15; p.maxHealth -= 30; p.health = Math.min(p.health, p.maxHealth); } },
    { name: '😈 Shadow Step', hpCost: 20, effects: ['+30% Dodge', '+1 Speed', '-20 Max HP'],
      apply: p => { p.dodge = Math.min(0.7, p.dodge + 0.3); p.speed += 1; p.maxHealth -= 20; p.health = Math.min(p.health, p.maxHealth); } },
    { name: '😈 Eldritch Eye', hpCost: 25, effects: ['+40% Crit', '+1.5x Crit Dmg', '-25 Max HP'],
      apply: p => { p.critChance = Math.min(0.9, p.critChance + 0.4); p.critDamage += 1.5; p.maxHealth -= 25; p.health = Math.min(p.health, p.maxHealth); } },
    { name: '😈 Demonic Vigor', hpCost: 10, effects: ['+3 Projectiles', '+1 Speed', '-10 Max HP'],
      apply: p => { p.projectileCount += 3; p.speed += 1; p.maxHealth -= 10; p.health = Math.min(p.health, p.maxHealth); } },
    { name: '😈 Void Touch', hpCost: 35, effects: ['+All Bullets Pierce', 'Chain Lightning', '-35 Max HP'],
      apply: p => { p.extraPiercing = (p.extraPiercing || 0) + 5; p.chainLightningChance = (p.chainLightningChance || 0) + 0.3; p.maxHealth -= 35; p.health = Math.min(p.health, p.maxHealth); } },
];

// Cursed items - appear in shop at discount but have drawbacks + add corruption
const CURSED_ITEMS = [
    { name: '👑 Cursed Crown', rarity: RARITY.EPIC, basePrice: 12, corruption: 2,
      effects: ['+50% Damage', '-30% Fire Rate', '+2 Corruption'],
      apply: p => { p.damage = Math.floor(p.damage * 1.5); p.fireRate = Math.floor(p.fireRate * 1.3); } },
    { name: '💎 Glass Cannon', rarity: RARITY.LEGENDARY, basePrice: 8, corruption: 3,
      effects: ['2x Damage', 'Max HP set to 1', '+3 Corruption'],
      apply: p => { p.damage *= 2; p.maxHealth = 1; p.health = 1; } },
    { name: '🩸 Berserker\'s Blood', rarity: RARITY.EPIC, basePrice: 15, corruption: 2,
      effects: ['+80% Damage below 30% HP', 'No healing', '+2 Corruption'],
      apply: p => { p.berserkerSoul = (p.berserkerSoul || 0) + 0.8; p.healingBlocked = true; } },
    { name: '💥 Unstable Core', rarity: RARITY.RARE, basePrice: 10, corruption: 1,
      effects: ['+3 Projectiles', 'Random spread', '+1 Corruption'],
      apply: p => { p.projectileCount += 3; p.unstableSpread = true; } },
    { name: '🕳️ Void Shard', rarity: RARITY.EPIC, basePrice: 14, corruption: 2,
      effects: ['+4 Piercing', '+200 Range', '-2 Speed', '+2 Corruption'],
      apply: p => { p.extraPiercing = (p.extraPiercing || 0) + 4; p.range += 200; p.speed = Math.max(1, p.speed - 2); } },
    { name: '💀 Death\'s Embrace', rarity: RARITY.LEGENDARY, basePrice: 5, corruption: 4,
      effects: ['Enemies explode on death', '-50 Max HP', '+4 Corruption'],
      apply: p => { p.explosiveFinale = true; p.explosionRadius = (p.explosionRadius || 0) + 80; p.maxHealth -= 50; p.health = Math.min(p.health, p.maxHealth); } },
];

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
      effects: ['+25% Fire Rate', '-5 Max HP'], apply: p => { p.fireRate = Math.max(5, Math.floor(p.fireRate * 0.75)); p.maxHealth -= 5; p.health = Math.min(p.health, p.maxHealth); } },
    { name: '🎯 Focus Lens', category: ITEM_CATEGORIES.STAT, rarity: RARITY.UNCOMMON, basePrice: 15,
      effects: ['+150 Range', '-0.3 Speed'], apply: p => { p.range += 150; p.speed = Math.max(1, p.speed - 0.3); } },
    { name: '⚔️ Battle Fury', category: ITEM_CATEGORIES.STAT, rarity: RARITY.UNCOMMON, basePrice: 14,
      effects: ['+8 Damage', '-10 Max HP'], apply: p => { p.damage += 8; p.maxHealth -= 10; p.health = Math.min(p.health, p.maxHealth); } },
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
      effects: ['+20% Life Steal', '-15 Max HP'], apply: p => { p.lifeSteal += 0.20; p.maxHealth -= 15; p.health = Math.min(p.health, p.maxHealth); } },
    { name: '⚡ Overclocked Core', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.RARE, basePrice: 20,
      effects: ['+35% Fire Rate', '+10 Damage', '-20 Max HP'], apply: p => { p.fireRate = Math.max(5, Math.floor(p.fireRate * 0.65)); p.damage += 10; p.maxHealth -= 20; p.health = Math.min(p.health, p.maxHealth); } },
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
      effects: ['+25% Dodge', '+1.2 Speed', '-10 Max HP'], apply: p => { p.dodge = Math.min(0.7, p.dodge + 0.25); p.speed += 1.2; p.maxHealth -= 10; p.health = Math.min(p.health, p.maxHealth); } },
    
    // Legendary Items
    { name: '👑 Crown of Power', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.LEGENDARY, basePrice: 35,
      effects: ['+20 Damage', '+2 Projectiles', '+100 Range', '-30 Max HP'], apply: p => { p.damage += 20; p.projectileCount += 2; p.range += 100; p.maxHealth -= 30; p.health = Math.min(p.health, p.maxHealth); } },
    { name: '🔮 Mystic Orb', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.LEGENDARY, basePrice: 38,
      effects: ['+40% Crit Chance', '+1.5x Crit Dmg', '+30% Life Steal'], apply: p => { p.critChance = Math.min(0.9, p.critChance + 0.40); p.critDamage += 1.5; p.lifeSteal += 0.30; } },
    { name: '⚔️ God Slayer', category: ITEM_CATEGORIES.SPECIAL, rarity: RARITY.LEGENDARY, basePrice: 40,
      effects: ['+35 Damage', '+50% Fire Rate', '-40 Max HP', '-1.0 Speed'], apply: p => { p.damage += 35; p.fireRate = Math.max(5, Math.floor(p.fireRate * 0.5)); p.maxHealth -= 40; p.health = Math.min(p.health, p.maxHealth); p.speed = Math.max(1, p.speed - 1.0); } },
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
      effects: ['+1 Weapon Slot'], apply: p => { if (p.weaponSlots.length < p.maxWeaponSlots) p.weaponSlots.push({ type: 'basic', cooldown: 0, level: 1, xp: 0, evolved: false }); } },
    { name: '⚡ Auto-Turret Mount', category: ITEM_CATEGORIES.WEAPON, rarity: RARITY.RARE, basePrice: 30,
      effects: ['+1 Slot (Laser)'], apply: p => { if (p.weaponSlots.length < p.maxWeaponSlots) p.weaponSlots.push({ type: 'laser', cooldown: 0, level: 1, xp: 0, evolved: false }); } },
    { name: '🚀 Heavy Mount', category: ITEM_CATEGORIES.WEAPON, rarity: RARITY.EPIC, basePrice: 40,
      effects: ['+1 Slot (Rocket)'], apply: p => { if (p.weaponSlots.length < p.maxWeaponSlots) p.weaponSlots.push({ type: 'rocket', cooldown: 0, level: 1, xp: 0, evolved: false }); } },
];

// Shop state management
let shopState = {
    currentOfferings: [],
    lockedItems: new Set(),
    rerollCost: 0,
    rerollCount: 0,
    page: 0,                // current shop page (mobile pagination)
    itemsPerPage: 4         // items shown per page on small screens
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
    
    for (let i = 0; i < 8; i++) {
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
    
    // 25% chance to replace one item with a cursed item (after wave 5)
    if (game.wave >= 5 && Math.random() < 0.25) {
        const cursed = CURSED_ITEMS[Math.floor(Math.random() * CURSED_ITEMS.length)];
        const replaceIndex = Math.floor(Math.random() * offerings.length);
        if (!shopState.lockedItems.has(replaceIndex)) {
            offerings[replaceIndex] = {
                ...cursed,
                price: Math.ceil(cursed.basePrice * (1 + game.wave * 0.05)),
                isCursed: true,
                category: ITEM_CATEGORIES.SPECIAL,
            };
        }
    }

    return offerings;
}

function openShop() {
    // After boss waves, offer devil deal first
    const justBeatBoss = (game.wave - 1) % CONFIG.BOSS_WAVE_INTERVAL === 0 && game.wave > 1;
    if (justBeatBoss && !game.devilDealActive) {
        game.devilDealActive = true;
        showDevilDeal();
        return;
    }
    game.devilDealActive = false;

    game.state = 'shop';

    // Interest mechanic - earn 10% of unspent credits
    const interest = Math.floor(game.credits * 0.1);
    if (interest > 0) {
        game.credits += interest;
        showNotification(`💰 Interest: +${interest} credits (10% of savings)`, '#ffd93d', 3000);
    }

    document.getElementById('shop-modal').classList.remove('hidden');
    document.getElementById('completed-wave').textContent = game.wave - 1;

    // Show credits with interest info in shop
    const interestDisplay = document.getElementById('shop-credits');
    if (interestDisplay) {
        interestDisplay.textContent = game.credits;
    }
    
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
        shopState.rerollCost = 0;
        shopState.rerollCount = 0;
    }
    shopState.page = 0; // start each shop visit on the first page
    
    renderShop();
}

function showDevilDeal() {
    // Pick 2 random devil deal items
    const shuffled = [...DEVIL_DEAL_ITEMS].sort(() => Math.random() - 0.5);
    const deals = shuffled.slice(0, 2);
    
    const modal = document.createElement('div');
    modal.id = 'devil-deal-modal';
    modal.className = 'modal devil-deal-modal';
    modal.innerHTML = `
        <div class="modal-content devil-deal-content" style="background: rgba(30, 0, 0, 0.95); border: 2px solid #dc2626;">
            <h2 style="color: #dc2626;">😈 Devil's Bargain 😈</h2>
            <p style="color: #fca5a5; margin-bottom: 15px;">Trade your life force for power...</p>
            <div class="devil-deals" style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                ${deals.map((deal, i) => `
                    <div class="devil-deal-card" data-index="${i}" style="
                        background: rgba(50, 0, 0, 0.8); border: 1px solid #991b1b; padding: 15px; border-radius: 8px;
                        cursor: pointer; min-width: 200px; max-width: 250px; transition: all 0.2s;">
                        <h3 style="color: #fca5a5; margin: 0 0 8px 0;">${deal.name}</h3>
                        <div style="margin-bottom: 8px;">
                            ${deal.effects.map(e => `<p style="color: ${e.startsWith('+') ? '#4ade80' : e.startsWith('-') ? '#f87171' : '#fbbf24'}; margin: 2px 0; font-size: 13px;">${e}</p>`).join('')}
                        </div>
                        <p style="color: #dc2626; font-weight: bold; font-size: 14px;">Cost: ❤️ ${deal.hpCost} Max HP</p>
                    </div>
                `).join('')}
            </div>
            <button id="skip-devil-deal" style="
                margin-top: 15px; padding: 8px 20px; background: #334155; border: 1px solid #475569;
                color: #94a3b8; border-radius: 4px; cursor: pointer; font-size: 14px;">
                Skip (No deal)
            </button>
        </div>
    `;
    
    document.getElementById('game-container').appendChild(modal);
    
    // Add click handlers for deals
    modal.querySelectorAll('.devil-deal-card').forEach(el => {
        el.addEventListener('mouseenter', () => { el.style.borderColor = '#dc2626'; el.style.boxShadow = '0 0 15px rgba(220, 38, 38, 0.5)'; });
        el.addEventListener('mouseleave', () => { el.style.borderColor = '#991b1b'; el.style.boxShadow = 'none'; });
        el.addEventListener('click', () => {
            const index = parseInt(el.dataset.index);
            const deal = deals[index];
            
            if (game.player.maxHealth <= deal.hpCost) {
                showNotification('Not enough HP for this deal!', '#ff6b6b', 2000);
                return;
            }
            
            deal.apply(game.player);
            Sound.play('boss');
            screenShake(10);
            showNotification(`${deal.name} accepted!`, '#dc2626', 3000);
            createExplosion(game.player.x, game.player.y, '#dc2626', 30);
            
            modal.remove();
            openShop();
        });
    });
    
    // Skip button
    modal.querySelector('#skip-devil-deal').addEventListener('click', () => {
        modal.remove();
        openShop();
    });
}

function renderShop() {
    const shopContainer = document.getElementById('shop-items');
    shopContainer.innerHTML = '';
    
    const tt = (k, f, v) => (window.t ? window.t(k, f, v) : f);
    
    // ===== Always-visible credits header (sticks to top of the modal) =====
    const creditsHeader = document.createElement('div');
    creditsHeader.className = 'shop-credits-header';
    creditsHeader.innerHTML = `
        <div>
            <div class="shop-credits-label">💰 ${tt('hud.credits', 'Credits')}</div>
            <div class="shop-wave-info">${tt('hud.wave', 'Wave')} ${game.wave - 1} ${tt('shop.complete', 'complete')}</div>
        </div>
        <div class="shop-credits-value" id="shop-credits-value">${game.credits}</div>
    `;
    shopContainer.appendChild(creditsHeader);
    
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
    
    // ===== Pagination: limit visible items on small screens =====
    // We always render the pager element; CSS only displays it on narrow
    // viewports, so desktop users still see the full grid at once.
    const isMobile = (typeof window !== 'undefined') && window.matchMedia
        ? window.matchMedia('(max-width: 600px)').matches
        : false;
    const totalItems = shopState.currentOfferings.length;
    const perPage = Math.max(1, shopState.itemsPerPage || 4);
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    if (shopState.page >= totalPages) shopState.page = totalPages - 1;
    if (shopState.page < 0) shopState.page = 0;
    
    let visibleStart, visibleEnd;
    if (isMobile) {
        visibleStart = shopState.page * perPage;
        visibleEnd = Math.min(totalItems, visibleStart + perPage);
    } else {
        visibleStart = 0;
        visibleEnd = totalItems;
    }
    
    const pager = document.createElement('div');
    pager.className = 'shop-pager';
    pager.innerHTML = `
        <button class="pager-btn" id="shop-prev-btn" ${shopState.page === 0 ? 'disabled' : ''}>◀ ${tt('common.prev', 'Prev')}</button>
        <div class="pager-info">${tt('shop.pageFmt', 'Page {page} of {total}', { page: shopState.page + 1, total: totalPages })}</div>
        <button class="pager-btn" id="shop-next-btn" ${shopState.page >= totalPages - 1 ? 'disabled' : ''}>${tt('common.next', 'Next')} ▶</button>
    `;
    shopContainer.appendChild(pager);
    
    const itemsGrid = document.createElement('div');
    itemsGrid.className = 'shop-items-grid';
    
    shopState.currentOfferings.forEach((item, index) => {
        if (index < visibleStart || index >= visibleEnd) return;
        
        const isLocked = shopState.lockedItems.has(index);
        const canAfford = game.credits >= item.price;
        
        const div = document.createElement('div');
        div.className = `shop-item rarity-${item.rarity.name.toLowerCase()}${item.isCursed ? ' cursed-item' : ''}${!canAfford ? ' disabled' : ''}${isLocked ? ' locked' : ''}`;
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

    // Sell equipped items section
    if (game.passivesChosen.length > 0) {
        const sellSection = document.createElement('div');
        sellSection.className = 'shop-sell-section';
        sellSection.innerHTML = `
            <h4 style="color: #f59e0b; margin: 10px 0 5px;">♻️ Sell Passives (50% value)</h4>
            <div class="sell-items" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
                ${game.passivesChosen.map((id, i) => {
                    const passive = PASSIVE_ABILITIES.find(p => p.id === id);
                    if (!passive) return '';
                    const sellPrice = Math.floor(5 + game.wave * 2);
                    return `<button class="sell-btn" data-index="${i}" style="
                        padding: 4px 10px; background: rgba(50,20,0,0.8); border: 1px solid #f59e0b;
                        color: #fbbf24; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        ${passive.name} → ${sellPrice}💰
                    </button>`;
                }).join('')}
            </div>
        `;
        shopContainer.appendChild(sellSection);
        
        // Add sell handlers
        sellSection.querySelectorAll('.sell-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                const sellPrice = Math.floor(5 + game.wave * 2);
                game.credits += sellPrice;
                game.passivesChosen.splice(idx, 1);
                showNotification(`Sold for ${sellPrice} credits`, '#f59e0b', 1500);
                Sound.play('pickup');
                updateUI();
                renderShop();
            });
        });
    }

    // Add reroll button event listener
    const rerollBtn = document.getElementById('reroll-btn');
    if (rerollBtn) {
        rerollBtn.addEventListener('click', rerollShop);
    }
    
    // Pager handlers
    const prevBtn = document.getElementById('shop-prev-btn');
    const nextBtn = document.getElementById('shop-next-btn');
    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (shopState.page > 0) { shopState.page--; renderShop(); }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (shopState.page < totalPages - 1) { shopState.page++; renderShop(); }
    });
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

    // Track corruption from cursed items
    if (item.isCursed && item.corruption) {
        game.corruption += item.corruption;
        showNotification(`Corruption: ${game.corruption}`, '#7c3aed', 2000);
        
        // Corruption effects
        if (game.corruption >= 10) {
            showNotification('⚠️ MAX CORRUPTION! The Cosmic Devourer stirs...', '#ff0000', 4000);
        } else if (game.corruption >= 5) {
            showNotification('⚠️ High corruption! Enemies are stronger but drop better loot', '#fbbf24', 3000);
        }
    }

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
    shopState.rerollCost = Math.ceil(5 + shopState.rerollCount * 5); // 0, 5, 10, 15, 20...
    
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

// Wave modifiers - one random modifier per wave starting wave 3
const WAVE_MODIFIERS = {
    speed_surge: { name: '⚡ Speed Surge', desc: 'All enemies +30% speed', color: '#fbbf24',
        apply: () => { game.enemies.forEach(e => { e.speed *= 1.3; }); },
        onSpawn: e => { e.speed *= 1.3; } },
    armored_horde: { name: '🛡️ Armored Horde', desc: 'All enemies +50% HP', color: '#60a5fa',
        apply: () => { game.enemies.forEach(e => { e.maxHealth *= 1.5; e.health = e.maxHealth; }); },
        onSpawn: e => { e.maxHealth *= 1.5; e.health = e.maxHealth; } },
    bullet_hell: { name: '🎯 Bullet Hell', desc: 'Shooter enemies appear more', color: '#ec4899',
        apply: () => {},
        onSpawn: null,
        spawnBias: 'shooter' },
    the_swarm: { name: '🐝 The Swarm', desc: '3x enemies, 0.5x HP each', color: '#f59e0b',
        apply: () => { game.enemies.forEach(e => { if (!e.isBoss) { e.maxHealth *= 0.5; e.health = e.maxHealth; } }); },
        onSpawn: e => { if (!e.isBoss) { e.maxHealth *= 0.5; e.health = e.maxHealth; } },
        enemyCountMult: 3 },
    fog_of_war: { name: '🌫️ Fog of War', desc: 'Reduced vision radius', color: '#94a3b8',
        apply: () => { game.fogOfWar = true; },
        onSpawn: null },
    jackpot: { name: '🎰 Jackpot', desc: '2x credit drops this wave', color: '#ffd93d',
        apply: () => { game.creditMultiplier = 2; },
        onSpawn: null },
    regenerating: { name: '💚 Regenerating', desc: 'Enemies slowly heal', color: '#22c55e',
        apply: () => {},
        onSpawn: e => { e.regens = true; } },
    giant: { name: '🗿 Giant', desc: 'Fewer but much larger enemies', color: '#a78bfa',
        apply: () => { game.enemies.forEach(e => { if (!e.isBoss) { e.size *= 1.5; e.maxHealth *= 2; e.health = e.maxHealth; e.speed *= 0.7; } }); },
        onSpawn: e => { if (!e.isBoss) { e.size *= 1.5; e.maxHealth *= 2; e.health = e.maxHealth; e.speed *= 0.7; } },
        enemyCountMult: 0.5 },
};

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
window.HAZARD_ICONS = HAZARD_ICONS;

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
// Expose for entity modules (Player.js) — see window.Sound comment above.
window.ARENA_CONSTANTS = ARENA_CONSTANTS;

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
        const x = margin + Math.random() * (CONFIG.WORLD_WIDTH - margin * 2);
        const y = margin + Math.random() * (CONFIG.WORLD_HEIGHT - margin * 2);
        if (Math.hypot(x - CONFIG.WORLD_WIDTH / 2, y - CONFIG.WORLD_HEIGHT / 2) < 120) continue;
        const types = ['rock', 'crater', 'pillar'];
        const type = types[Math.floor(Math.random() * types.length)];
        const radius = 20 + Math.random() * 25;
        const hp = type === 'pillar' ? 50 + game.wave * 5 : Infinity;
        game.obstacles.push({ x, y, radius, type, health: hp, maxHealth: hp, color: theme.obstacleColor });
    }
    if (theme.hazardColor) {
        const hzCount = Math.min(2 + Math.floor(game.wave / 5), 6);
        for (let i = 0; i < hzCount; i++) {
            const x = margin + Math.random() * (CONFIG.WORLD_WIDTH - margin * 2);
            const y = margin + Math.random() * (CONFIG.WORLD_HEIGHT - margin * 2);
            if (Math.hypot(x - CONFIG.WORLD_WIDTH / 2, y - CONFIG.WORLD_HEIGHT / 2) < 150) continue;
            const htype = theme.key === 'ice' ? 'ice_patch' : theme.key === 'lava' ? 'lava_pool' : 'void_zone';
            game.hazards.push({ x, y, radius: 40 + Math.random() * 30, type: htype, color: theme.hazardColor, damage: 1 + game.wave * 0.2 });
        }
    }
}

function drawArenaObstacles(ctx) {
    
}

// ==================== WAVE SYSTEM ====================
// spawnWave extracted to js/systems/waveSystem.js (§9 entity peeling)
// window.spawnWave is set by enhanced-init.js before init() runs.

function nextWave() {
    // Non-host multiplayer clients must wait for the host's wave_start event
    if (game.isMultiplayer && window.MultiplayerClient && !window.MultiplayerClient.isHost()) {
        return;
    }
    // ===== Story Mode: did we just complete the final wave (boss killed)? =====
    if (game.gameMode === 'story' && game.activeStoryChapter) {
        const ch = game.activeStoryChapter;
        if (game.wave >= ch.waves) {
            // Chapter complete!
            const completedChapter = ch;
            const wasMultiplayer = game.isMultiplayer;
            // Mark progress
            if (window.StoryMode) {
                try { window.StoryMode.markCompleted(ch.id); } catch {}
            }
            game.state = 'gameOver'; // suspend gameplay
            document.getElementById('shop-modal').classList.add('hidden');
            // Outro cinematic, then return to story menu (or main menu)
            if (window.StoryMode && window.StoryMode.showChapterVictory) {
                window.StoryMode.showChapterVictory(completedChapter, () => {
                    // Reset & return to start menu
                    game.activeStoryChapter = null;
                    game.gameMode = 'classic';
                    game.storyChapterFinalBossSpawned = false;
                    if (window.StoryMode.clearActiveChapter) window.StoryMode.clearActiveChapter();
                    // Soft restart of overall state
                    softResetForMenu();
                    // Show story menu so the player can pick the next chapter
                    if (!wasMultiplayer) {
                        window.StoryMode.showMenu();
                    } else {
                        document.getElementById('start-modal')?.classList.remove('hidden');
                    }
                });
            }
            return;
        }
    }
    
    game.wave++;
    if (game.wave > game.persistentStats.maxWave) {
        game.persistentStats.maxWave = game.wave;
        game.stats.maxWave = game.wave;
        savePersistentStats();
    }
    game.state = 'playing';
    document.getElementById('shop-modal').classList.add('hidden');

    // Phase 4 rework — roll new weather for the wave. Boss waves get the
    // dramatic eclipse profile every 10th wave.
    if (window.rework && window.rework.weather) {
        const isBossWave = (game.wave % CONFIG.BOSS_WAVE_INTERVAL) === 0;
        const w = window.rework.weather.rollForWave(game.wave, isBossWave);
        if (w && w.id !== 'clear') {
            showNotification(`${w.label}`, '#a5b4fc', 2200);
        }
    }
    // Phase 5 rework — tag enemies with stable shield-ids for shielder
    // absorption targeting.
    if (window.rework && window.rework.ensureShieldIds) {
        window.rework.ensureShieldIds(game.enemies);
    }
    
    // Reset shop state for next wave
    shopState.currentOfferings = [];
    shopState.lockedItems.clear();
    shopState.rerollCost = 0;
    shopState.rerollCount = 0;
    
    // In multiplayer, host broadcasts wave_start to sync all clients
    if (game.isMultiplayer && window.MultiplayerClient && window.MultiplayerClient.isHost()) {
        window.MultiplayerClient.sendGameEvent('wave_start', { wave: game.wave });
    }
    
    spawnWave();
    checkAchievements();
}

// Soft reset of game state to return to menu (without showing difficulty select)
function softResetForMenu() {
    game.state = 'menu';
    game.paused = false;
    game.enemies = [];
    game.bullets = [];
    game.particles = [];
    game.pickups = [];
    game.powerups = [];
    game.xpOrbs = [];
    game.blackHoles = [];
    game.hazards = [];
    game.wave = 1;
    game.timeLeft = 60;
    // Phase 4 rework — reset stance/weather/juice on soft reset.
    if (window.rework) {
        if (window.rework.stance) window.rework.stance.reset();
        if (window.rework.weather) window.rework.weather.current = window.rework.WEATHER_PROFILES.clear;
        if (window.rework.juice) {
            window.rework.juice.flash.clear();
        }
    }
    game.stats = {
        enemiesKilled: 0, damageDealt: 0, damageTaken: 0,
        bossesDefeated: 0, waveStartDamage: 0, comboKills: 0, comboTimer: 0,
        xp: 0, level: 1, xpToNext: CONFIG.XP_BASE, totalXpEarned: 0,
    };
    game.passivesChosen = [];
    game.levelUpChoices = [];
    game.eliteKills = 0;
    game.player = null;
    game.isLocalPlayerDowned = false;
    if (window.MultiplayerExtras) {
        window.MultiplayerExtras.activeEmotes.clear();
        window.MultiplayerExtras.activePings = [];
        window.MultiplayerExtras.downed.clear();
        window.MultiplayerExtras.resetMatchStats();
    }
}

// ==================== GAME OVER & RESTART ====================
function gameOver() {
    // Guard against re-entrant calls. In multiplayer every client that receives
    // the 'game_over' game_event calls gameOver(), which would in turn broadcast
    // another 'game_over' event — creating an infinite relay loop.
    if (game.state === 'gameOver') return;
    game.state = 'gameOver';
    savePersistentStats();
    checkAchievements();
    Sound.play('gameOver');
    
    const score = game.wave * 1000 + game.stats.enemiesKilled * 10 + game.stats.bossesDefeated * 500 + game.stats.level * 200;
    game.highScores.push({ wave: game.wave, score, difficulty: game.difficulty, timestamp: Date.now() });
    game.highScores.sort((a, b) => b.score - a.score);
    game.highScores = game.highScores.slice(0, 10);
    saveHighScores();
    
    // Daily Challenge: record progress
    if (game.gameMode === 'daily' && window.DailyChallenge) {
        try { window.DailyChallenge.markPlayed(game.wave); } catch {}
    }
    
    // Sync stats to server in multiplayer
    if (window.MultiplayerClient && window.MultiplayerClient.authenticated) {
        window.MultiplayerClient.syncStats({
            totalKills: game.persistentStats.totalKills,
            totalCredits: game.persistentStats.totalCredits,
            maxWave: game.persistentStats.maxWave,
            gamesPlayed: 1,
        });
        window.MultiplayerClient.syncHighScore({
            wave: game.wave, score, difficulty: game.difficulty,
            characterId: game.selectedCharacter?.id, timestamp: Date.now()
        });
        // Notify other players
        window.MultiplayerClient.sendGameEvent('game_over', { wave: game.wave, score });
    }
    
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
    const tt = (k, f, v) => (window.t ? window.t(k, f, v) : f);
    if (game.gameMode === 'story' && game.activeStoryChapter) {
        title.textContent = tt('story.defeat', 'Chapter failed — try again, survivor.');
    } else if (game.wave >= 20) {
        title.textContent = tt('gameover.legendary', '🌟 LEGENDARY SURVIVOR! 🌟');
    } else if (game.wave >= 10) {
        title.textContent = tt('gameover.success', '🏆 Mission Success! 🏆');
    } else if (game.wave >= 5) {
        title.textContent = tt('gameover.valiant', '⚔️ Valiant Effort ⚔️');
    } else {
        title.textContent = tt('gameover.fail', '💀 Mission Failed 💀');
    }
    
    // Multiplayer MVP screen
    if (game.isMultiplayer && window.MultiplayerExtras) {
        try {
            // Build playerInfoById from local + remote players
            const info = new Map();
            const mp = window.MultiplayerClient;
            if (mp && mp.localPlayerId) {
                info.set(mp.localPlayerId, {
                    name: (mp.profile && mp.profile.displayName) || 'You',
                    color: '#00ff88',
                });
            }
            for (const rp of game.remotePlayers.values()) {
                info.set(rp.id, { name: rp.displayName || 'Player', color: rp.color || '#ff6b6b' });
            }
            // Show after a short delay so the player sees the game-over screen first
            setTimeout(() => {
                window.MultiplayerExtras.showMVPScreen(info, () => {});
            }, 600);
        } catch (e) { console.warn('[MVP] failed to show', e); }
    }
}

function restartGame() {
    document.getElementById('game-over-modal').classList.add('hidden');
    // Remove level up modal if present
    const levelUpModal = document.getElementById('level-up-modal');
    if (levelUpModal) levelUpModal.remove();
    // Remove any leftover MVP overlay
    const mvp = document.getElementById('mvp-overlay');
    if (mvp) mvp.remove();
    
    // Reset new systems
    game.stats.xp = 0;
    game.stats.level = 1;
    game.stats.xpToNext = CONFIG.XP_BASE;
    game.stats.totalXpEarned = 0;
    game.levelUpChoices = [];
    game.passivesChosen = [];
    game.playerDPS = { damage: 0, timer: 0, history: [] };
    game.waveModifier = null;
    game.fogOfWar = false;
    game.creditMultiplier = 1;
    game.corruption = 0;
    game.devilDealActive = false;
    game.eliteKills = 0;
    game.xpOrbs = [];
    game.blackHoles = [];
    game.camera.x = 0;
    game.camera.y = 0;
    game.camera.targetX = 0;
    game.camera.targetY = 0;
    game.isLocalPlayerDowned = false;
    if (window.MultiplayerExtras) {
        window.MultiplayerExtras.activeEmotes.clear();
        window.MultiplayerExtras.activePings = [];
        window.MultiplayerExtras.downed.clear();
        window.MultiplayerExtras.resetMatchStats();
    }
    
    // Reset multiplayer state
    game.isMultiplayer = false;
    game.remotePlayers.clear();
    game.multiplayerPlayerCount = 1;
    
    // Honor active game mode for retry
    const mode = game.gameMode || 'classic';
    if (mode === 'story' && game.activeStoryChapter) {
        const ch = game.activeStoryChapter;
        game.wave = 1;
        game.storyChapterFinalBossSpawned = false;
        game.state = 'characterSelect';
        document.getElementById('character-select-modal').classList.remove('hidden');
        return;
    }
    if (mode === 'daily' && game.activeDailyChallenge) {
        game.wave = 1;
        game.state = 'characterSelect';
        document.getElementById('character-select-modal').classList.remove('hidden');
        return;
    }
    
    game.gameMode = 'classic';
    game.activeStoryChapter = null;
    game.activeDailyChallenge = null;
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
        // Keep the in-shop sticky credit counter in sync as well, so the
        // player always sees their current balance while shopping.
        const shopCredits = document.getElementById('shop-credits-value');
        if (shopCredits) shopCredits.textContent = game.credits;
        lastUIValues.credits = game.credits;
    }
    
    // Safety clamp: ensure health never exceeds maxHealth
    if (game.player.health > game.player.maxHealth) {
        game.player.health = game.player.maxHealth;
    }
    
    // Only update health if it changed (rounded)
    const health = Math.ceil(game.player.health);
    if (lastUIValues.health !== health || lastUIValues.maxHealth !== game.player.maxHealth) {
        const healthPercent = Math.min((game.player.health / game.player.maxHealth) * 100, 100);
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
    let joystickTouchId = null;
    
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const pos = getTouchPos(touch);
            
            // Any touch on the lower 70% of the screen activates joystick
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
            if (touch.identifier !== joystickTouchId) continue;
            if (!game.joystick.active) continue;
            
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
            const touch = e.changedTouches[i];
            if (touch.identifier === joystickTouchId) {
                game.joystick.active = false;
                game.joystick.x = 0;
                game.joystick.y = 0;
                joystickTouchId = null;
            }
        }
    }, { passive: false });
    
    canvas.addEventListener('touchcancel', e => {
        game.joystick.active = false;
        game.joystick.x = 0;
        game.joystick.y = 0;
        joystickTouchId = null;
    }, { passive: false });
}

function drawJoystick(ctx) {
    
}

// Draw active powerups UI
function drawActivePowerups(ctx) {
    
}

// Draw combo meter
function drawComboMeter(ctx) {
    
}

// Draw pause menu
function drawPauseMenu(ctx) {
    
}

// Draw weapon indicator - lists all simultaneously-active orbiting weapons.
function drawWeaponIndicator(ctx) {
    
}

function drawMinimap(ctx) {
    
}

function drawComboCounter(ctx) {
    
}

// Phase 3 rework — Stance + Weather HUD badges. Compact top-center pill row
// surfacing the two new gameplay modifiers so the player can see what's
// active at a glance.
function drawStanceWeatherHUD(ctx) {
    
}

function roundRect(ctx, x, y, w, h, r) {
    
}

function drawXPBar(ctx) {
    
}

function drawWaveModifier(ctx) {
    
}

function drawCorruptionIndicator(ctx) {
    
}

function drawDashIndicator(ctx) {
    
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
    
}

// Draw all entries in game.bullets. Player bullets are Bullet instances with
// a draw() method, but enemy bullets (e.g. boss phase-3 bursts and shooter
// projectiles) are pushed as plain objects without one. We render those
// inline so they are visible and never crash the renderer with
// "b.draw is not a function".
// Screen-space overlays drawn over the world view but under the HUD:
//   - red full-screen damage flash whenever the player just took a hit
//   - subtle dark vignette while a boss is alive (focuses the eye on action)
function drawScreenOverlays(ctx) {
    
}

function drawBullets(ctx) {
    
}

function drawBossHealthBar(ctx) {
    
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
        // Boss wave dramatic intro
        setTimeout(() => {
            showNotification('⚠️ BOSS INCOMING ⚠️', '#dc2626', 3000);
            screenShake(8);
        }, 500);
    } else if (game.waveModifier) {
        showNotification(`Wave ${game.wave} — ${game.waveModifier.name}`, game.waveModifier.color, 2500);
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
    
    Sound.play('boss');
}

// ==================== MULTIPLAYER GAME FUNCTIONS ====================

// Handle player death - multiplayer aware
function handlePlayerDeath() {
    if (game.isMultiplayer) {
        const mp = window.MultiplayerClient;
        const localId = mp ? mp.localPlayerId : null;
        const extras = window.MultiplayerExtras;
        
        // Enter "downed" state instead of dying immediately, giving teammates a chance to revive.
        // Only if not already downed (prevent re-trigger), and at least one teammate is alive.
        let anyTeammateAlive = false;
        for (const rp of game.remotePlayers.values()) {
            if (rp.isAlive) { anyTeammateAlive = true; break; }
        }
        
        if (extras && localId && anyTeammateAlive && !game.isLocalPlayerDowned) {
            game.isLocalPlayerDowned = true;
            extras.markDowned(localId);
            // Stay alive but disabled: prevent further damage / shooting
            game.player.health = 1; // Keep alive but at 1 HP visually
            if (mp && mp.connected) {
                mp.sendGameEvent('downed', { playerId: localId });
            }
            const tt = (k, f, v) => (window.t ? window.t(k, f, v) : f);
            showNotification(tt('revive.downedYou', '💔 You are down! Hold on!'), '#ff6b6b', 4000);
            return;
        }
        
        // No teammates left to revive - permanent death
        if (mp && mp.connected) {
            mp.sendGameEvent('player_died', { playerId: localId });
        }
        let anyAlive = false;
        for (const rp of game.remotePlayers.values()) {
            if (rp.isAlive) { anyAlive = true; break; }
        }
        if (!anyAlive) {
            gameOver();
        } else {
            showNotification('💀 You have been eliminated! Spectating...', '#ff6b6b', 5000);
            game.player.health = 0;
        }
    } else {
        gameOver();
    }
}

// Send local player state to multiplayer server
function sendLocalPlayerState() {
    if (!window.MultiplayerClient || !window.MultiplayerClient.connected || !game.player) return;
    
    window.MultiplayerClient.sendPlayerState({
        x: game.player.x,
        y: game.player.y,
        health: game.player.health,
        maxHealth: game.player.maxHealth,
        isAlive: game.player.health > 0,
        facingRight: game.player.facingRight,
        aimAngle: game.player.aimAngle,
        isMoving: game.player.isMoving,
        walkFrame: game.player.walkFrame,
        isDashing: game.player.isDashing,
        characterId: game.player.characterId,
        activeWeaponSlot: game.activeWeaponSlot,
        weaponSlots: game.player.weaponSlots.map(s => ({ type: s.type, level: s.level, evolved: s.evolved })),
        level: game.stats.level,
    });
}

// Initialize multiplayer callbacks
function initMultiplayerCallbacks() {
    const mp = window.MultiplayerClient;
    if (!mp) return;
    
    // Wire MultiplayerExtras hooks
    if (window.MultiplayerExtras) {
        window.MultiplayerExtras.onLocalPermanentDeath(() => {
            // Local player downed timer expired — convert to permanent death
            game.isLocalPlayerDowned = false;
            if (game.player) game.player.health = 0;
            const mp2 = window.MultiplayerClient;
            if (mp2 && mp2.connected) {
                mp2.sendGameEvent('player_died', { playerId: mp2.localPlayerId });
            }
            const tt = (k, f) => (window.t ? window.t(k, f) : f);
            showNotification(tt('revive.youDied', '💀 You could not be saved.'), '#ff6b6b', 4000);
            // Trigger game over check
            let anyAlive = false;
            for (const r of game.remotePlayers.values()) {
                if (r.isAlive) { anyAlive = true; break; }
            }
            if (!anyAlive) gameOver();
        });
        window.MultiplayerExtras.onRevived((targetId) => {
            // We just revived someone
            const rp = game.remotePlayers.get(targetId);
            if (rp) {
                rp.isAlive = true;
                rp.health = Math.max(rp.health, Math.floor(rp.maxHealth * 0.5));
            }
            const tt = (k, f, v) => (window.t ? window.t(k, f, v) : f);
            showNotification(tt('revive.revived', '💚 {name} is back in the fight!', { name: rp ? rp.displayName : 'Player' }), '#00ff88', 3000);
        });
    }

    mp.onPlayerStateUpdate = (playerId, state) => {
        const rp = game.remotePlayers.get(playerId);
        if (rp) {
            rp.updateFromNetwork(state);
        }
    };

    mp.onGameStart = (data) => {
        game.isMultiplayer = true;
        game.gameMode = 'multiplayer';
        game.multiplayerPlayerCount = data.playerCount;
        game.remotePlayers.clear();
        if (window.MultiplayerExtras) window.MultiplayerExtras.resetMatchStats();
        game.isLocalPlayerDowned = false;
        
        // Create remote players for all non-local players
        data.players.forEach(p => {
            if (p.id !== mp.localPlayerId) {
                const rp = new RemotePlayer(p);
                game.remotePlayers.set(p.id, rp);
            } else {
                // Set local player spawn position
                game.localPlayerId = p.id;
                if (game.player) {
                    game.player.x = p.spawnX;
                    game.player.y = p.spawnY;
                }
            }
        });

        // Close lobby modal, start the game
        const lobbyModal = document.getElementById('multiplayer-lobby-modal');
        if (lobbyModal) lobbyModal.classList.add('hidden');
        
        game.difficulty = data.settings.difficulty || 'normal';
        game.difficultySettings = CONFIG.DIFFICULTY[game.difficulty];
        game.coopSettings.sharedXP = data.settings.sharedXP !== false;
        
        game.state = 'playing';
        spawnWave();
        
        showNotification(`🎮 Co-op game started with ${data.playerCount} players!`, '#00ff88', 3000);
    };

    mp.onPlayerJoined = (playerId, displayName, lobby) => {
        showNotification(`${displayName} joined the room!`, '#4ecdc4', 2000);
        updateLobbyUI(lobby);
    };

    mp.onPlayerLeft = (playerId, lobby) => {
        // Remove from remote players if in game
        const rp = game.remotePlayers.get(playerId);
        if (rp) {
            showNotification(`${rp.displayName} disconnected`, '#ff6b6b', 3000);
            game.remotePlayers.delete(playerId);
        }
        updateLobbyUI(lobby);
    };

    mp.onLobbyUpdate = (lobby) => {
        updateLobbyUI(lobby);
    };

    mp.onGameEvent = (event, data, playerId) => {
        if (event === 'player_died') {
            const rp = game.remotePlayers.get(playerId);
            if (rp) {
                rp.isAlive = false;
                showNotification(`💀 ${rp.displayName} has been eliminated!`, '#ff6b6b', 3000);
            }
            // Clear any downed state for this player
            if (window.MultiplayerExtras) window.MultiplayerExtras.clearDowned(playerId);
            // Check if all players are dead
            if (game.player.health <= 0) {
                let anyAlive = false;
                for (const r of game.remotePlayers.values()) {
                    if (r.isAlive) { anyAlive = true; break; }
                }
                if (!anyAlive) gameOver();
            }
        } else if (event === 'wave_complete') {
            // Host has declared wave complete — sync to non-host clients
            Sound.play('waveComplete');
            openShop();
        } else if (event === 'wave_start') {
            // Host started next wave — sync wave number and spawn
            if (data && typeof data.wave === 'number' && data.wave > 0) {
                game.wave = data.wave;
            }
            game.state = 'playing';
            document.getElementById('shop-modal').classList.add('hidden');
            spawnWave();
        } else if (event === 'game_over') {
            gameOver();
        } else if (event === 'enemy_killed') {
            // Shared XP handling - broadcast kills
            if (data && data.xp && game.coopSettings.sharedXP) {
                game.stats.xp += Math.floor(data.xp * game.coopSettings.sharedXPMultiplier);
                while (game.stats.xp >= game.stats.xpToNext) {
                    game.stats.xp -= game.stats.xpToNext;
                    game.stats.level++;
                    game.stats.xpToNext = Math.floor(CONFIG.XP_BASE * Math.pow(CONFIG.XP_SCALING, game.stats.level - 1));
                    triggerLevelUp();
                }
            }
            // Track MVP stats per remote player
            if (window.MultiplayerExtras && data) {
                window.MultiplayerExtras.bumpStat(playerId, 'kills', 1);
                if (data.isBoss) window.MultiplayerExtras.bumpStat(playerId, 'bosses', 1);
            }
        } else if (event === 'emote') {
            if (window.MultiplayerExtras) window.MultiplayerExtras.receiveEmote(playerId, data);
        } else if (event === 'ping') {
            if (window.MultiplayerExtras) window.MultiplayerExtras.receivePing(playerId, data);
        } else if (event === 'quickchat') {
            // Localize on receive
            const rp = game.remotePlayers.get(playerId);
            const name = rp ? rp.displayName : 'Player';
            const tt = (k, f) => (window.t ? window.t(k, f) : f);
            const allowedKeys = { 'help': 'quickchat.help', 'push': 'quickchat.push', 'defend': 'quickchat.defend', 'gg': 'quickchat.gg' };
            const key = data && allowedKeys[data.key] ? allowedKeys[data.key] : null;
            if (key) {
                showNotification(`${name}: ${tt(key)}`, '#4ecdc4', 3000);
            }
        } else if (event === 'downed') {
            const rp = game.remotePlayers.get(playerId);
            if (rp && window.MultiplayerExtras) {
                window.MultiplayerExtras.markDowned(playerId);
                const tt = (k, f, v) => (window.t ? window.t(k, f, v) : f);
                showNotification(tt('revive.downed', '💔 {name} is down! Revive them!', { name: rp.displayName }), '#ffd93d', 3000);
            }
        } else if (event === 'revive_complete') {
            if (data && data.targetId && window.MultiplayerExtras) {
                window.MultiplayerExtras.clearDowned(data.targetId);
                const mp2 = window.MultiplayerClient;
                const tt = (k, f, v) => (window.t ? window.t(k, f, v) : f);
                if (mp2 && data.targetId === mp2.localPlayerId) {
                    // I was just revived
                    game.isLocalPlayerDowned = false;
                    if (game.player) game.player.health = Math.max(game.player.health, Math.floor(game.player.maxHealth * 0.5));
                    showNotification(tt('revive.revivedYou', '💚 You are back in the fight!'), '#00ff88', 3000);
                } else {
                    const rp = game.remotePlayers.get(data.targetId);
                    if (rp) {
                        rp.isAlive = true;
                        showNotification(tt('revive.revived', '💚 {name} is back in the fight!', { name: rp.displayName }), '#00ff88', 3000);
                    }
                }
            }
        } else if (event === 'boss_down') {
            const tt = (k, f) => (window.t ? window.t(k, f) : f);
            showNotification(tt('mp.bossDownFmt', '🏆 Boss defeated! Team strikes again!'), '#ffd93d', 4000);
        }
    };

    mp.onChatMessage = (msg) => {
        showNotification(`${msg.displayName}: ${msg.message}`, '#4ecdc4', 4000);
    };

    mp.onAuthSuccess = (profile) => {
        showNotification(`Welcome, ${profile.displayName}!`, '#00ff88', 2000);
        // Sync local stats to server
        mp.syncStats(game.persistentStats);
        updateAccountUI(profile);
    };

    mp.onError = (message) => {
        showNotification('⚠️ ' + message, '#ff6b6b', 3000);
    };

    mp.onAuthError = (message) => {
        showNotification(`Auth error: ${message}`, '#ff6b6b', 3000);
        const errorEl = document.getElementById('auth-error');
        if (errorEl) errorEl.textContent = message;
        // Re-enable submit buttons so user can retry
        const loginBtn = document.getElementById('login-submit-btn');
        if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Login'; }
        const registerBtn = document.getElementById('register-submit-btn');
        if (registerBtn) { registerBtn.disabled = false; registerBtn.textContent = 'Register'; }
    };

    mp.onRoomCreated = (roomCode, lobby) => {
        showNotification(`Room created: ${roomCode}`, '#00ff88', 3000);
        // Hide multiplayer modal if still visible
        const mpModal = document.getElementById('multiplayer-modal');
        if (mpModal) mpModal.classList.add('hidden');
        showLobbyUI(lobby);
    };

    mp.onRoomJoined = (roomCode, lobby) => {
        showNotification(`Joined room: ${roomCode}`, '#00ff88', 3000);
        // Hide multiplayer modal on successful join
        const mpModal = document.getElementById('multiplayer-modal');
        if (mpModal) mpModal.classList.add('hidden');
        showLobbyUI(lobby);
    };

    mp.onJoinError = (message) => {
        showNotification(`Join error: ${message}`, '#ff6b6b', 3000);
        const errorEl = document.getElementById('join-error');
        if (errorEl) errorEl.textContent = message;
        // Re-enable join button
        const joinBtn = document.getElementById('mp-join-btn');
        if (joinBtn) {
            joinBtn.disabled = false;
            joinBtn.textContent = 'Join Room';
        }
    };

    mp.onDisconnected = () => {
        if (game.isMultiplayer && game.state === 'playing') {
            showNotification('⚠️ Disconnected from server!', '#ff6b6b', 5000);
            // Gracefully continue as single player
            game.isMultiplayer = false;
            game.remotePlayers.clear();
        }
    };
}

// ==================== MULTIPLAYER UI FUNCTIONS ====================

function updateLobbyUI(lobby) {
    const playerList = document.getElementById('lobby-player-list');
    if (!playerList) return;
    
    playerList.innerHTML = '';
    lobby.players.forEach(p => {
        const div = document.createElement('div');
        div.className = 'lobby-player' + (p.ready ? ' ready' : '');
        
        const dot = document.createElement('span');
        dot.className = 'lobby-player-dot';
        dot.style.background = p.color;
        
        const name = document.createElement('span');
        name.className = 'lobby-player-name';
        name.textContent = p.displayName + (p.isHost ? ' 👑' : '');
        
        const charSpan = document.createElement('span');
        charSpan.className = 'lobby-player-character';
        charSpan.textContent = p.characterId ? (CHARACTERS.find(c => c.id === p.characterId)?.name || p.characterId) : 'Choosing...';
        
        const status = document.createElement('span');
        status.className = 'lobby-player-status';
        status.textContent = p.ready ? '✅ Ready' : '⏳ Not Ready';
        
        div.appendChild(dot);
        div.appendChild(name);
        div.appendChild(charSpan);
        div.appendChild(status);
        playerList.appendChild(div);
    });

    const roomCodeEl = document.getElementById('lobby-room-code');
    if (roomCodeEl) roomCodeEl.textContent = lobby.code;

    const startBtn = document.getElementById('lobby-start-btn');
    if (startBtn) {
        const mp = window.MultiplayerClient;
        const isHost = mp && lobby.hostId === mp.localPlayerId;
        startBtn.style.display = isHost ? 'block' : 'none';
        startBtn.disabled = !lobby.players.every(p => p.ready && p.characterId !== null);
    }
}

function showLobbyUI(lobby) {
    // Hide other modals
    document.getElementById('start-modal')?.classList.add('hidden');
    document.getElementById('character-select-modal')?.classList.add('hidden');
    
    let modal = document.getElementById('multiplayer-lobby-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'multiplayer-lobby-modal';
        modal.className = 'modal';
        document.getElementById('game-container').appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content multiplayer-lobby">
            <h2 data-i18n="mp.lobby">🎮 Co-op Lobby</h2>
            <div class="lobby-room-code-display">
                <span data-i18n="mp.roomCode">Room Code:</span>
                <span id="lobby-room-code" class="room-code-value">${lobby.code}</span>
                <button class="btn-small" id="lobby-copy-btn" data-i18n="mp.copy">📋 Copy</button>
            </div>
            <div class="lobby-settings">
                <span><span data-i18n="mp.difficulty">Difficulty:</span> <strong>${lobby.settings.difficulty}</strong></span>
                <span><span data-i18n="mp.maxPlayers">Max Players:</span> <strong>${lobby.settings.maxPlayers}</strong></span>
                <span><span data-i18n="mp.sharedXp">Shared XP</span>: <strong>${lobby.settings.sharedXP ? '✔' : '✗'}</strong></span>
            </div>
            <h3><span data-i18n="mp.players">Players</span> (${lobby.players.length}/${lobby.settings.maxPlayers})</h3>
            <div id="lobby-player-list"></div>
            <div class="lobby-character-select">
                <h3 data-i18n="mp.selectChar">Select Character</h3>
                <div id="lobby-character-list" class="lobby-char-grid"></div>
            </div>
            <div class="lobby-actions">
                <button id="lobby-ready-btn" class="btn-primary" data-i18n="mp.ready">Ready Up</button>
                <button id="lobby-start-btn" class="btn-primary" style="display:none" data-i18n="mp.startGame">Start Game</button>
                <button id="lobby-leave-btn" class="btn-secondary" data-i18n="mp.leave">Leave Room</button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
    if (window.translateDOM) window.translateDOM(modal);
    
    // Wire copy button (replaces inline onclick to keep CSP-friendly behavior)
    const copyBtn = modal.querySelector('#lobby-copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const tt = (k, f) => (window.t ? window.t(k, f) : f);
            try {
                navigator.clipboard.writeText(lobby.code).then(() => showNotification(tt('mp.copied', 'Code copied!'), '#00ff88', 1500));
            } catch {}
        });
    }

    // Populate character selection
    const charList = document.getElementById('lobby-character-list');
    let selectedCharId = null;
    CHARACTERS.forEach(char => {
        const btn = document.createElement('div');
        btn.className = 'lobby-char-card';
        btn.innerHTML = `<strong>${char.name}</strong><br><small>${char.description}</small>`;
        btn.addEventListener('click', () => {
            selectedCharId = char.id;
            game.selectedCharacter = char;
            charList.querySelectorAll('.lobby-char-card').forEach(c => c.classList.remove('selected'));
            btn.classList.add('selected');
        });
        charList.appendChild(btn);
    });

    // Ready button
    document.getElementById('lobby-ready-btn').addEventListener('click', () => {
        if (!selectedCharId) {
            showNotification('Please select a character first!', '#ffd93d', 2000);
            return;
        }
        const mp = window.MultiplayerClient;
        if (mp) {
            game.player = new Player(game.selectedCharacter);
            mp.setReady(true, selectedCharId);
        }
    });

    // Start button (host only)
    document.getElementById('lobby-start-btn').addEventListener('click', () => {
        const mp = window.MultiplayerClient;
        if (mp) mp.startGame();
    });

    // Leave button
    document.getElementById('lobby-leave-btn').addEventListener('click', () => {
        const mp = window.MultiplayerClient;
        if (mp) mp.leaveRoom();
        modal.classList.add('hidden');
        document.getElementById('start-modal')?.classList.remove('hidden');
    });

    updateLobbyUI(lobby);
}

function updateAccountUI(profile) {
    const btn = document.getElementById('account-btn');
    if (btn) {
        btn.textContent = profile ? `👤 ${profile.displayName}` : '👤 Account';
    }
}

// ==================== GAME LOOP ====================
let lastTime = 0;
let timer = 0;

// Initialize a multi-layer parallax starfield. Stars are stored in canvas
// coordinates (0..CANVAS_WIDTH/HEIGHT) and rendered in screen space with a
// per-layer parallax factor against the camera, so far stars barely move
// when the player walks while near stars scroll quickly — gives real depth.
function initStarfield() {
    game.stars = [];
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    // 3 layers: far (slow scroll, dim, small), mid, near (fast, bright, big).
    const layers = [
        { count: 100, parallax: 0.15, sizeMin: 0.4, sizeMax: 1.0, brightnessMin: 0.4, brightnessMax: 0.7, palette: ['#9bb6ff', '#c6d4ff', '#ffffff'] },
        { count: 60,  parallax: 0.45, sizeMin: 0.8, sizeMax: 1.6, brightnessMin: 0.6, brightnessMax: 0.9, palette: ['#ffffff', '#fff7d6', '#d6e4ff'] },
        { count: 30,  parallax: 0.85, sizeMin: 1.4, sizeMax: 2.4, brightnessMin: 0.85, brightnessMax: 1.0, palette: ['#ffffff', '#ffd6f5', '#d6fff0', '#ffe9b3'] },
    ];
    for (const layer of layers) {
        for (let i = 0; i < layer.count; i++) {
            game.stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin),
                parallax: layer.parallax,
                brightness: layer.brightnessMin + Math.random() * (layer.brightnessMax - layer.brightnessMin),
                color: layer.palette[Math.floor(Math.random() * layer.palette.length)],
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.02 + Math.random() * 0.06,
            });
        }
    }
    // A few large soft "nebula puff" sprites in the deepest layer for color depth.
    game.nebulae = [];
    const nebulaColors = ['rgba(138, 43, 226, 0.10)', 'rgba(78, 205, 196, 0.08)', 'rgba(255, 107, 107, 0.07)', 'rgba(0, 255, 136, 0.07)'];
    for (let i = 0; i < 4; i++) {
        game.nebulae.push({
            x: Math.random() * W,
            y: Math.random() * H,
            radius: 180 + Math.random() * 220,
            parallax: 0.08 + Math.random() * 0.06,
            color: nebulaColors[i % nebulaColors.length],
        });
    }
}

function updateStarfield() {
    if (!game.stars) return;
    for (const star of game.stars) {
        star.twinkle += star.twinkleSpeed;
    }
}

// Render the starfield + nebula puffs in screen space so we can apply
// per-layer parallax against the camera. Called inside the camera-translated
// block, so we temporarily reset the transform to draw screen-relative,
// then restore it for the rest of the world rendering.
function drawStarfield(ctx) {
    
}

// ─── Part E rework: entity-interpolation helpers ─────────────────────────────
// These functions snapshot and restore entity world positions for the
// fixed-timestep interpolation path (?fixedstep=1). The swap approach keeps
// draw() methods untouched: before render we temporarily move entities to
// their lerped render positions; after render we put the simulation positions
// back so the next sim tick starts from the correct state.
//
// Only runs when fixedStepEnabled AND interpEnabled are both true.
// Enemy._interpPrevX/Y are separate from the existing Enemy.prevX/prevY fields
// (which are used for walk-animation direction detection).

function _snapshotEntityPositions() {
    const p = game.player;
    if (p) { p._interpPrevX = p.x; p._interpPrevY = p.y; }
    for (let i = 0; i < game.enemies.length; i++) {
        const e = game.enemies[i];
        e._interpPrevX = e.x; e._interpPrevY = e.y;
    }
    for (let i = 0; i < game.bullets.length; i++) {
        const b = game.bullets[i];
        if (!b.isEnemyBullet) { b._interpPrevX = b.x; b._interpPrevY = b.y; }
    }
}

function _applyEntityInterp(alpha) {
    // Temporarily replace x/y with lerped render position.
    // Saves actual sim positions in _interpSaveX/Y for _restoreEntityInterp().
    const p = game.player;
    if (p && p._interpPrevX !== undefined) {
        p._interpSaveX = p.x; p._interpSaveY = p.y;
        p.x = p._interpPrevX + (p.x - p._interpPrevX) * alpha;
        p.y = p._interpPrevY + (p.y - p._interpPrevY) * alpha;
    }
    for (let i = 0; i < game.enemies.length; i++) {
        const e = game.enemies[i];
        if (e._interpPrevX !== undefined) {
            e._interpSaveX = e.x; e._interpSaveY = e.y;
            e.x = e._interpPrevX + (e.x - e._interpPrevX) * alpha;
            e.y = e._interpPrevY + (e.y - e._interpPrevY) * alpha;
        }
    }
    for (let i = 0; i < game.bullets.length; i++) {
        const b = game.bullets[i];
        if (!b.isEnemyBullet && b._interpPrevX !== undefined) {
            b._interpSaveX = b.x; b._interpSaveY = b.y;
            b.x = b._interpPrevX + (b.x - b._interpPrevX) * alpha;
            b.y = b._interpPrevY + (b.y - b._interpPrevY) * alpha;
        }
    }
}

function _restoreEntityInterp() {
    const p = game.player;
    if (p && p._interpSaveX !== undefined) {
        p.x = p._interpSaveX; p.y = p._interpSaveY;
        p._interpSaveX = undefined; p._interpSaveY = undefined;
    }
    for (let i = 0; i < game.enemies.length; i++) {
        const e = game.enemies[i];
        if (e._interpSaveX !== undefined) {
            e.x = e._interpSaveX; e.y = e._interpSaveY;
            e._interpSaveX = undefined; e._interpSaveY = undefined;
        }
    }
    for (let i = 0; i < game.bullets.length; i++) {
        const b = game.bullets[i];
        if (!b.isEnemyBullet && b._interpSaveX !== undefined) {
            b.x = b._interpSaveX; b.y = b._interpSaveY;
            b._interpSaveX = undefined; b._interpSaveY = undefined;
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────

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
    
    const _r = window.rework?.renderer;
    const _c2d = _r?.ctx ?? game.ctx;
    const ctx = _c2d; // alias for legacy draw() call sites
    
    // Update camera shake
    updateCamera();

    // Phase 2 rework — advance trauma shake / hit-flash. Use real frame
    // delta in seconds so it's framerate-independent.
    if (window.rework && window.rework.juice) {
        window.rework.juice.update(Math.min(0.05, deltaTime / 1000));
    }
    // Phase 4 rework — drive weather (random lightning, etc).
    if (window.rework && window.rework.weather && game.state === 'playing' && !game.paused) {
        window.rework.weather.update(game.enemies, game.player);
    }

    // Apply camera offset (legacy shake + trauma-model shake stacked).
    let traumaOffX = 0, traumaOffY = 0, traumaRot = 0;
    if (window.rework && window.rework.juice) {
        traumaOffX = window.rework.juice.shake.offsetX;
        traumaOffY = window.rework.juice.shake.offsetY;
        traumaRot = window.rework.juice.shake.rotation;
    }
    _c2d.save();
    // Skip the canvas rotate when the trauma rotation is below ~0.06° —
    // imperceptible visually and avoids unnecessary save/restore cost in the
    // (very common) no-shake-active case.
    if (Math.abs(traumaRot) > 0.001) {
        _c2d.translate(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
        _c2d.rotate(traumaRot);
        _c2d.translate(-CONFIG.CANVAS_WIDTH / 2, -CONFIG.CANVAS_HEIGHT / 2);
    }
    _c2d.translate(-game.camera.x + game.camera.offsetX + traumaOffX, -game.camera.y + game.camera.offsetY + traumaOffY);
    
    // Background
    const theme = game.arenaTheme || getCurrentTheme();
    _c2d.fillStyle = theme.bgColor;
    _c2d.fillRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
    
    // Animated starfield
    updateStarfield();
    drawStarfield(ctx);
    
    // Grid with subtle animation (optimized - draw less frequently)
    // Use timestamp divided by ~33ms (approximately 30 FPS) for consistent rendering pattern
    if (Math.floor(timestamp / 33) % 2 === 0) {
        const gridPulse = Math.sin(timestamp * 0.0005) * 0.02 + 0.05;
        _c2d.strokeStyle = theme.gridColor || `rgba(78, 205, 196, ${gridPulse})`;
        _c2d.lineWidth = 1;
        const camX = Math.floor(game.camera.x);
        const camY = Math.floor(game.camera.y);
        const gridStartX = Math.floor(camX / 50) * 50;
        const gridStartY = Math.floor(camY / 50) * 50;
        for (let x = gridStartX; x < camX + CONFIG.CANVAS_WIDTH + 50; x += 50) {
            _c2d.beginPath();
            _c2d.moveTo(x, camY);
            _c2d.lineTo(x, camY + CONFIG.CANVAS_HEIGHT);
            _c2d.stroke();
        }
        for (let y = gridStartY; y < camY + CONFIG.CANVAS_HEIGHT + 50; y += 50) {
            _c2d.beginPath();
            _c2d.moveTo(camX, y);
            _c2d.lineTo(camX + CONFIG.CANVAS_WIDTH, y);
            _c2d.stroke();
        }
    }
    
    // Draw arena obstacles
    drawArenaObstacles(ctx);
    
    // Boss shockwave telegraph
    game.enemies.forEach(e => {
        if (e.isBoss && e.isChargingShockwave) {
            _c2d.save();
            const progress = 1 - (e.shockwaveChargeTimer / 45);
            _c2d.globalAlpha = 0.2 + progress * 0.3;
            _c2d.strokeStyle = '#ff0000';
            _c2d.lineWidth = 3;
            _c2d.setLineDash([8, 8]);
            _c2d.beginPath();
            _c2d.arc(e.x, e.y, 200 * progress, 0, Math.PI * 2);
            _c2d.stroke();
            _c2d.setLineDash([]);
            _c2d.fillStyle = 'rgba(255, 0, 0, 0.1)';
            _c2d.fill();
            _c2d.restore();
        }
    });
    
    // Draw black holes
    if (game.blackHoles) {
        game.blackHoles.forEach(bh => {
            const alpha = bh.life / bh.maxLife;
            const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;
            _c2d.save();
            _c2d.globalAlpha = alpha * 0.5;
            // Outer swirl
            for (let i = 0; i < 3; i++) {
                const angle = Date.now() * 0.003 + (i / 3) * Math.PI * 2;
                const r = bh.radius * (0.3 + i * 0.25) * pulse;
                _c2d.strokeStyle = `rgba(139, 92, 246, ${alpha * 0.3})`;
                _c2d.lineWidth = 2;
                _c2d.beginPath();
                _c2d.arc(bh.x, bh.y, r, angle, angle + Math.PI * 1.5);
                _c2d.stroke();
            }
            // Core
            _c2d.globalAlpha = alpha;
            _c2d.fillStyle = '#1e1b4b';
            _c2d.beginPath();
            _c2d.arc(bh.x, bh.y, 15 * pulse, 0, Math.PI * 2);
            _c2d.fill();
            _c2d.strokeStyle = '#8b5cf6';
            _c2d.lineWidth = 2;
            _c2d.stroke();
            _c2d.restore();
        });
    }
    
    if (game.state === 'playing' && !game.paused) {
        // Part E rework — FixedClock dual-path.
        // ?fixedstep=1: drives sim at 60 Hz, render interpolates with alpha.
        // Multiplayer is excluded from fixed step to avoid fighting the
        // server-authoritative wave timer (see REWORK.md Part E note).
        const _rw = window.rework;
        const _fixedStepActive = _rw?.clock?.fixedStepEnabled &&
            !(game.isMultiplayer && window.MultiplayerClient?.isActive?.());
        let _simSteps = 1, _simDtMs = deltaTime, _interpAlpha = 0;
        if (_fixedStepActive) {
            const { steps, alpha } = _rw.clock._fixedClock.advance(timestamp);
            _simSteps = steps;
            _simDtMs = 1000 / 60;
            _interpAlpha = alpha;
            _rw.clock.simTicksThisFrame = _simSteps;
            _rw.clock.lastAlpha = _interpAlpha;
        }

        let _needsInterpRestore = _fixedStepActive;
        for (let _si = 0; _si < _simSteps; _si++) {
            // Part E: snapshot entity positions at the start of each fixed sim
            // step so the render pass can lerp between prev and current state.
            // _needsInterpRestore is pre-set to _fixedStepActive above; the
            // snapshot call is guarded here to keep the two in sync.
            if (_fixedStepActive) { _snapshotEntityPositions(); }

            timer += _simDtMs;   // was: timer += deltaTime (legacy variable dt)
            if (timer >= 1000) {
                timer = 0;
                game.timeLeft--;
                if (game.timeLeft <= 0) {
                    if (game.isMultiplayer) {
                        // In multiplayer, only the host triggers wave completion
                        const mp = window.MultiplayerClient;
                        if (mp && mp.isHost()) {
                            mp.sendGameEvent('wave_complete', { wave: game.wave });
                            Sound.play('waveComplete');
                            openShop();
                        }
                        // Non-host clients wait for the host's wave_complete event
                        game.timeLeft = 0; // clamp so the HUD doesn't show negative time
                    } else {
                        Sound.play('waveComplete');
                        openShop();
                    }
                }
            }
            
            game.player.update();
            
            // Update remote players (multiplayer)
            if (game.isMultiplayer) {
                for (const rp of game.remotePlayers.values()) {
                    rp.update();
                }
                // Send local player state to server
                sendLocalPlayerState();
            }
            
            game.enemies.forEach(e => e.update());

            // Part D rework — build broadphase spatial hash once per sim step
            // (after enemies update, before bullets are processed).
            // Part F rework — also transmit rebuild + batch query to the
            // off-thread worker (?worker=1, default OFF).
            {
                const _bp = _rw?.broadphase;
                if (_bp && _bp.kind !== 'naive') {
                    const _bpT0 = performance.now();
                    const _h = _bp._hash;
                    _h.clear();
                    let _maxR = 0;
                    for (let _i = 0; _i < game.enemies.length; _i++) {
                        const _e = game.enemies[_i];
                        if (_e.size > _maxR) _maxR = _e.size;
                        _h.insert(_e.x, _e.y, _e);
                    }
                    _bp._maxEnemyRadius = _maxR;
                    // Snapshot enemy index → object for worker-result id lookup.
                    _bp._enemyIndexMap = game.enemies.slice();
                    _bp.lastBuildMs = performance.now() - _bpT0;
                    _bp.lastQueryCount = 0;
                    _bp.lastQueryMs = 0;

                    // Part F: transmit positions to worker and queue batch query.
                    // Auto-disabled on Safari (UA sniff in enhanced-init.js) and
                    // when typeof Worker === 'undefined' (SSR / node tests).
                    if (_bp.kind === 'worker' && _bp._worker && _bp._workerReady) {
                        const _cnt = game.enemies.length;
                        const _pos = new Float32Array(_cnt * 3);
                        const _ids = new Int32Array(_cnt);
                        for (let _i = 0; _i < _cnt; _i++) {
                            const _e = game.enemies[_i];
                            _pos[_i * 3]     = _e.x;
                            _pos[_i * 3 + 1] = _e.y;
                            _pos[_i * 3 + 2] = _e.size;
                            _ids[_i] = _i;
                        }
                        const _tick = game.frameCount;
                        _bp._currentTick = _tick;
                        _bp._worker.postMessage(
                            { type: 'rebuild', tick: _tick, count: _cnt, positions: _pos, ids: _ids },
                            [_pos.buffer, _ids.buffer]
                        );
                        // Batch all bullet queries into one message round-trip.
                        const _queries = [];
                        for (let _bi = 0; _bi < game.bullets.length; _bi++) {
                            const _b = game.bullets[_bi];
                            if (!_b.isEnemyBullet) {
                                _queries.push({ bulletId: _b._bpId, x: _b.x, y: _b.y, r: _b.size + _maxR });
                            }
                        }
                        if (_queries.length > 0) {
                            _bp._worker.postMessage({ type: 'batchQuery', tick: _tick, queries: _queries });
                            _bp.pendingQueries = _queries.length;
                        }
                    }
                }
            }

            game.bullets = game.bullets.filter(b => {
                if (b.isEnemyBullet) {
                    b.x += Math.cos(b.angle) * b.speed;
                    b.y += Math.sin(b.angle) * b.speed;
                    
                    // Check collision with local player
                    const distPlayer = Math.hypot(game.player.x - b.x, game.player.y - b.y);
                    if (distPlayer < game.player.size + b.size) {
                        game.player.takeDamage(b.damage);
                        b._pool?.release(b);
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
                                b._pool?.release(b);
                                return false;
                            }
                        }
                    }
                    
                    const alive = b.x >= 0 && b.x <= CONFIG.WORLD_WIDTH && b.y >= 0 && b.y <= CONFIG.WORLD_HEIGHT;
                    if (!alive) b._pool?.release(b);
                    return alive;
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
        } // end sim loop

        // Part E: apply position interpolation before the render pass.
        // Positions are temporarily lerped; _restoreEntityInterp() puts them
        // back after draw calls so the next sim step starts from true state.
        const _doInterp = _needsInterpRestore && (_rw?.clock?.interpEnabled ?? true);
        if (_doInterp) _applyEntityInterp(_interpAlpha);

        game.pickups.forEach(p => (_r ? _r.drawPickup(p) : p.draw(ctx)));
        game.xpOrbs.forEach(orb => (_r ? _r.drawXPOrb(orb) : orb.draw(ctx)));
        game.powerups.forEach(p => (_r ? _r.drawPowerup(p) : p.draw(ctx)));
        game.enemies.forEach(e => (_r ? _r.drawEnemy(e) : e.draw(ctx)));
        if (_r) { _r.drawBullets(game.bullets); _r.drawPlayer(game.player); } else { drawBullets(ctx); game.player.draw(ctx); }
        // Phase 4 rework — visualize Focus stance progress + active state
        // as a ring around the player. While charging it sweeps clockwise;
        // once active it pulses solid.
        if (window.rework && window.rework.stance && game.player) {
            const s = window.rework.stance;
            const cx = game.player.x, cy = game.player.y, r = game.player.size + 10;
            _c2d.save();
            if (s.isFocused) {
                const pulse = 0.55 + Math.sin(Date.now() * 0.008) * 0.25;
                _c2d.strokeStyle = `rgba(255, 217, 61, ${pulse})`;
                _c2d.lineWidth = 2.5;
                _c2d.beginPath();
                _c2d.arc(cx, cy, r, 0, Math.PI * 2);
                _c2d.stroke();
            } else if (s.focusCharge > 0.05) {
                _c2d.strokeStyle = 'rgba(255, 217, 61, 0.45)';
                _c2d.lineWidth = 2;
                _c2d.beginPath();
                _c2d.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.focusCharge);
                _c2d.stroke();
            }
            _c2d.restore();
        }
        // Draw remote players (multiplayer)
        if (game.isMultiplayer) {
            for (const rp of game.remotePlayers.values()) {
                rp.draw(ctx);
            }
        }
        if (_r) _r.drawParticles(game); else drawParticles(ctx);
        // Phase 4 rework — weather world overlay (rain streaks, lightning).
        if (window.rework && window.rework.weather) {
            window.rework.weather.drawWorldLayer(ctx, {
                x: game.camera.x, y: game.camera.y,
                w: CONFIG.CANVAS_WIDTH, h: CONFIG.CANVAS_HEIGHT,
            });
        }
        // Phase 6 rework — co-op aura ring around remote players when local
        // player is shooting (visible cue that they're buffing my bullets).
        if (game.isMultiplayer && window.rework && window.rework.coop && game.remotePlayers && game.remotePlayers.size > 0) {
            _c2d.save();
            _c2d.strokeStyle = 'rgba(167, 139, 250, 0.35)';
            _c2d.lineWidth = 2;
            _c2d.setLineDash([6, 6]);
            for (const rp of game.remotePlayers.values()) {
                if (!rp || rp.isDowned) continue;
                _c2d.beginPath();
                _c2d.arc(rp.x, rp.y, window.rework.coop.radius, 0, Math.PI * 2);
                _c2d.stroke();
            }
            _c2d.setLineDash([]);
            _c2d.restore();
        }
        if (game.isMultiplayer && window.MultiplayerExtras) {
            const ex = window.MultiplayerExtras;
            ex.updatePings();
            ex.drawPings(ctx);
            ex.drawEmotes(ctx, (pid) => {
                const mp = window.MultiplayerClient;
                if (mp && pid === mp.localPlayerId) return game.player;
                return game.remotePlayers.get(pid) || null;
            });
            ex.drawDownedIndicator(ctx, (pid) => {
                const mp = window.MultiplayerClient;
                if (mp && pid === mp.localPlayerId) return game.player;
                return game.remotePlayers.get(pid) || null;
            });
            // Drive the revive update each frame
            const fHeld = !!(game.keys['f'] || game.keys['F']);
            ex.updateRevive(game.player, game.remotePlayers, fHeld);
        }
        
        updateUI();

        // Part E: restore simulation positions now that rendering is done.
        // This must happen before the next sim tick starts.
        if (_doInterp) _restoreEntityInterp();
        
        // Fog of war overlay
        if (game.fogOfWar && game.player) {
            _c2d.save();
            const fogGradient = _c2d.createRadialGradient(
                game.player.x, game.player.y, 100,
                game.player.x, game.player.y, 350
            );
            fogGradient.addColorStop(0, 'rgba(0,0,0,0)');
            fogGradient.addColorStop(0.7, 'rgba(0,0,0,0.6)');
            fogGradient.addColorStop(1, 'rgba(0,0,0,0.85)');
            _c2d.fillStyle = fogGradient;
            _c2d.fillRect(game.camera.x, game.camera.y, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            _c2d.restore();
        }
        
        // Low HP warning - screen edge vignette
        if (game.player && game.player.health <= game.player.maxHealth * 0.3 && game.player.health > 0) {
            _c2d.save();
            const vx = game.camera.x;
            const vy = game.camera.y;
            const pulse = Math.sin(Date.now() * 0.004) * 0.15 + 0.25;
            const vignette = _c2d.createRadialGradient(
                game.player.x, game.player.y, CONFIG.CANVAS_WIDTH * 0.3,
                game.player.x, game.player.y, CONFIG.CANVAS_WIDTH * 0.7
            );
            vignette.addColorStop(0, 'rgba(200, 0, 0, 0)');
            vignette.addColorStop(1, `rgba(200, 0, 0, ${pulse})`);
            _c2d.fillStyle = vignette;
            _c2d.fillRect(vx, vy, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            _c2d.restore();
        }
        
        // Draw HUD elements (outside camera transform)
        _c2d.restore();
        _c2d.save();
        // Phase 4 rework — weather screen wash (outside camera xform so
        // colour grade applies uniformly to the viewport).
        if (window.rework && window.rework.weather) {
            window.rework.weather.drawScreenLayer(ctx, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        }
        // Phase 2 rework — hit-flash overlay (player damage, level-ups).
        if (window.rework && window.rework.juice) {
            window.rework.juice.flash.draw(ctx, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        }
        // Screen-space damage flash + boss vignette (drawn over the world,
        // under the HUD so HUD text stays crisp).
        if (_r) { _r.drawScreenOverlays(game); _r.drawNotifications(game); } else { drawScreenOverlays(ctx); drawNotifications(ctx); }
        if (_r) { _r.drawJoystick(game); _r.drawActivePowerups(game); _r.drawComboMeter(game); _r.drawWeaponIndicator(game); } else { drawJoystick(ctx); drawActivePowerups(ctx); drawComboMeter(ctx); drawWeaponIndicator(ctx); }
        if (_r) { _r.drawMinimap(game); _r.drawXPBar(game); _r.drawDashIndicator(game); _r.drawDPSMeter(game); _r.drawWaveModifier(game); _r.drawCorruptionIndicator(game); _r.drawBossHealthBar(game); _r.drawComboCounter(game); _r.drawStanceWeatherHUD(game); } else { drawMinimap(game.ctx); drawXPBar(game.ctx); drawDashIndicator(game.ctx); drawDPSMeter(game.ctx); drawWaveModifier(game.ctx); drawCorruptionIndicator(game.ctx); drawBossHealthBar(game.ctx); drawComboCounter(game.ctx); drawStanceWeatherHUD(game.ctx); }
        updateDPS();
    } else if (game.paused) {
        // Still draw everything when paused
        game.pickups.forEach(p => p.draw(ctx));
        game.xpOrbs.forEach(orb => orb.draw(ctx));
        game.powerups.forEach(p => p.draw(ctx));
        game.enemies.forEach(e => e.draw(ctx));
        drawBullets(ctx);
        game.player.draw(ctx);
        if (game.isMultiplayer) {
            for (const rp of game.remotePlayers.values()) {
                (_r ? _r.drawRemotePlayer(rp) : rp.draw(ctx));
            }
        }
        if (_r) _r.drawParticles(game); else drawParticles(ctx);
        // Phase 4 rework — weather world overlay(ctx);
        drawPauseMenu(ctx);
    }
    
    // Draw FPS counter (outside camera transform)
    _c2d.restore();
    _c2d.save();
    _c2d.fillStyle = '#00ff88';
    _c2d.font = '14px monospace';
    _c2d.textAlign = 'right';
    _c2d.fillText(`FPS: ${game.fps}`, CONFIG.CANVAS_WIDTH - 10, 20);
    _c2d.restore();
    
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
    const aspect = containerWidth / containerHeight;
    const isMobile = containerWidth <= 1024 || 'ontouchstart' in window;
    
    if (isMobile) {
        // On mobile, dynamically adjust canvas resolution to fill the viewport
        const maxDim = 1200;
        let canvasW, canvasH;
        
        if (aspect >= 1) {
            // Landscape
            canvasW = maxDim;
            canvasH = Math.round(maxDim / aspect);
        } else {
            // Portrait - fill the full screen height
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
        canvasOffsetX = 0;
        canvasOffsetY = 0;
    } else {
        // Desktop: maintain original aspect ratio
        canvas.width = 1200;
        canvas.height = 800;
        CONFIG.CANVAS_WIDTH = 1200;
        CONFIG.CANVAS_HEIGHT = 800;
        
        const scaleX = containerWidth / CONFIG.CANVAS_WIDTH;
        const scaleY = containerHeight / CONFIG.CANVAS_HEIGHT;
        canvasScale = Math.min(scaleX, scaleY);
        
        const scaledWidth = CONFIG.CANVAS_WIDTH * canvasScale;
        const scaledHeight = CONFIG.CANVAS_HEIGHT * canvasScale;
        
        canvas.style.width = scaledWidth + 'px';
        canvas.style.height = scaledHeight + 'px';
        
        canvasOffsetX = (containerWidth - scaledWidth) / 2;
        canvasOffsetY = (containerHeight - scaledHeight) / 2;
        
        canvas.style.marginLeft = canvasOffsetX + 'px';
        canvas.style.marginTop = canvasOffsetY + 'px';
    }
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

    // Initialise object pools if the rework ESM bundle has run.
    if (window.rework?.ObjectPool) {
        _textParticlePool = new window.rework.ObjectPool(
            () => ({ type: 'text', x: 0, y: 0, text: '', color: '#fff', life: 0, maxLife: 60, vy: 0, scale: 1, fontSize: 16, _pool: null }),
            (p, x, y, text, color, size) => {
                p.x = x; p.y = y; p.text = text; p.color = color;
                p.life = 60; p.maxLife = 60; p.vy = -1.5; p.scale = 1; p.fontSize = size || 16;
            },
            { maxSize: 256, name: 'textParticle' }
        );
        window.rework.registerPool?.('textParticle', _textParticlePool);

        _particlePool = new window.rework.ObjectPool(
            () => ({ type: 'particle', x: 0, y: 0, vx: 0, vy: 0, color: '#fff', life: 0, maxLife: 50, size: 2, _pool: null }),
            (p, x, y, vx, vy, color, life, size) => {
                p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.color = color;
                p.life = life; p.maxLife = 50; p.size = size;
            },
            { maxSize: 512, name: 'particle' }
        );
        window.rework.registerPool?.('particle', _particlePool);

        _enemyBulletPool = new window.rework.ObjectPool(
            () => ({ x: 0, y: 0, angle: 0, speed: 0, size: 0, damage: 0, color: '#fff', isEnemyBullet: true, _pool: null }),
            (b, x, y, angle, speed, size, damage, color) => {
                b.x = x; b.y = y; b.angle = angle; b.speed = speed;
                b.size = size; b.damage = damage; b.color = color;
            },
            { maxSize: 256, name: 'enemyBullet' }
        );
        window.rework.registerPool?.('enemyBullet', _enemyBulletPool);
    }

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
    
    // ===== Multiplayer / Account Buttons =====
    initMultiplayerUI();
    initMultiplayerCallbacks();
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
    
    // Weapon switching has been removed: all weapons stay simultaneously
    // active and orbit the player like Vampire Survivors / Brotato / Isaac
    // orbs, so there is no longer an "active slot" or per-key weapon swap.
});

window.addEventListener('keyup', e => game.keys[e.key] = false);

// ==================== MULTIPLAYER UI INITIALIZATION ====================
function initMultiplayerUI() {
    // Account button
    const accountBtn = document.createElement('button');
    accountBtn.id = 'account-btn';
    accountBtn.className = 'account-btn';
    accountBtn.textContent = '👤 Account';
    accountBtn.addEventListener('click', showAccountModal);
    document.body.appendChild(accountBtn);
    
    // Multiplayer is *also* reachable via the game-mode picker (opens after
    // pressing "Begin Mission"), but we surface a dedicated button on the
    // start menu so multiplayer remains discoverable. (Players reported
    // "Multiplayer isn't working at all" after it was hidden inside the
    // picker — most never realized it was still there.)
    const startModal = document.getElementById('start-modal');
    if (startModal) {
        const modalContent = startModal.querySelector('.modal-content');
        if (modalContent && !document.getElementById('multiplayer-btn')) {
            const mpBtn = document.createElement('button');
            mpBtn.id = 'multiplayer-btn';
            mpBtn.className = 'btn-primary multiplayer-btn';
            const tt = (k, f) => (window.t ? window.t(k, f) : f);
            mpBtn.textContent = tt('menu.multiplayer', '🎮 Co-op Multiplayer');
            mpBtn.addEventListener('click', showMultiplayerModal);
            const settingsBtn = document.getElementById('settings-btn');
            if (settingsBtn) {
                modalContent.insertBefore(mpBtn, settingsBtn);
            } else {
                modalContent.appendChild(mpBtn);
            }
            if (window.i18n) {
                window.i18n.onChange(() => {
                    mpBtn.textContent = tt('menu.multiplayer', '🎮 Co-op Multiplayer');
                });
            }
        }
    }
    
    // Try auto-connect and restore session
    if (window.MultiplayerClient) {
        window.MultiplayerClient.connect();
        // Load saved token so it's sent automatically in ws.onopen handler
        try {
            const token = localStorage.getItem('cosmicSurvivor_mpToken');
            if (token) {
                window.MultiplayerClient.sessionToken = token;
            }
        } catch {}
    }
}

function showAccountModal() {
    const mp = window.MultiplayerClient;
    const isLoggedIn = mp && mp.authenticated;
    
    let modal = document.getElementById('account-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'account-modal';
        modal.className = 'modal';
        document.getElementById('game-container').appendChild(modal);
    }
    
    if (isLoggedIn) {
        // Show profile
        const profile = mp.profile;
        modal.innerHTML = `
            <div class="modal-content account-modal">
                <h2>👤 Account</h2>
                <div class="account-profile">
                    <p><strong>Name:</strong> <span id="account-display-name"></span></p>
                    <p><strong>Username:</strong> <span id="account-username"></span></p>
                    <div class="account-stats">
                        <h3>📊 Career Stats</h3>
                        <p>👾 Total Kills: ${profile.stats?.total_kills || 0}</p>
                        <p>🌊 Max Wave: ${profile.stats?.max_wave || 0}</p>
                        <p>💰 Total Credits: ${profile.stats?.total_credits || 0}</p>
                        <p>🎮 Games Played: ${profile.stats?.total_games || 0}</p>
                    </div>
                </div>
                <button class="btn-secondary" onclick="window.MultiplayerClient.logout(); this.closest('.modal').classList.add('hidden'); updateAccountUI(null);">Logout</button>
                <button class="btn-secondary" onclick="this.closest('.modal').classList.add('hidden')">Close</button>
            </div>
        `;
        // Set user-supplied text via textContent to prevent stored XSS
        modal.querySelector('#account-display-name').textContent = profile.displayName;
        modal.querySelector('#account-username').textContent = profile.username;
    } else {
        // Show login/register form
        modal.innerHTML = `
            <div class="modal-content account-modal">
                <h2>👤 Account</h2>
                <div id="auth-error" class="auth-error"></div>
                <div class="auth-tabs">
                    <button class="auth-tab active" data-tab="login">Login</button>
                    <button class="auth-tab" data-tab="register">Register</button>
                </div>
                <div id="auth-login" class="auth-form">
                    <input type="text" id="login-username" placeholder="Username" maxlength="20" autocomplete="username">
                    <input type="password" id="login-password" placeholder="Password" autocomplete="current-password">
                    <button class="btn-primary" id="login-submit-btn">Login</button>
                </div>
                <div id="auth-register" class="auth-form" style="display:none">
                    <input type="text" id="register-username" placeholder="Username (3-20 chars)" maxlength="20" autocomplete="username">
                    <input type="text" id="register-display" placeholder="Display Name" maxlength="20">
                    <input type="password" id="register-password" placeholder="Password (6+ chars)" autocomplete="new-password">
                    <button class="btn-primary" id="register-submit-btn">Register</button>
                </div>
                <div class="auth-divider">— or —</div>
                <button class="btn-secondary" id="guest-login-btn">Play as Guest</button>
                <button class="btn-secondary" onclick="this.closest('.modal').classList.add('hidden')">Close</button>
            </div>
        `;
        
        // Tab switching
        modal.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                modal.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('auth-login').style.display = tab.dataset.tab === 'login' ? 'block' : 'none';
                document.getElementById('auth-register').style.display = tab.dataset.tab === 'register' ? 'block' : 'none';
            });
        });
        
        function checkConnection() {
            if (!mp || !mp.connected) {
                const errorEl = document.getElementById('auth-error');
                if (errorEl) errorEl.textContent = 'Connecting to server… please try again in a moment.';
                // Try to (re-)establish the connection in the background so
                // the next click succeeds. The auth error message is cleared
                // automatically once a connection event lands.
                if (mp && typeof mp.connect === 'function') {
                    try { mp.connect(); } catch {}
                }
                return false;
            }
            return true;
        }
        
        // Clear the "connecting…" error once the WebSocket actually opens,
        // so the user isn't left staring at a stale message after the
        // background reconnect succeeds.
        // Guard with a flag so we only install this hook once — reopening the
        // modal while not logged in would otherwise keep wrapping onConnected
        // indefinitely, growing a callback chain that never shrinks.
        if (mp && !mp._clearConnectingMsgHooked) {
            mp._clearConnectingMsgHooked = true;
            const prevConnected = mp.onConnected;
            mp.onConnected = () => {
                if (prevConnected) { try { prevConnected(); } catch {} }
                const errorEl = document.getElementById('auth-error');
                if (errorEl && errorEl.textContent.startsWith('Connecting')) {
                    errorEl.textContent = '';
                }
            };
        }

        // Login
        document.getElementById('login-submit-btn').addEventListener('click', () => {
            if (!checkConnection()) return;
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            if (!username || !password) return;
            const btn = document.getElementById('login-submit-btn');
            btn.disabled = true;
            btn.textContent = 'Logging in...';
            document.getElementById('auth-error').textContent = '';
            mp.login(username, password);
        });
        
        // Register
        document.getElementById('register-submit-btn').addEventListener('click', () => {
            if (!checkConnection()) return;
            const username = document.getElementById('register-username').value.trim();
            const display = document.getElementById('register-display').value.trim();
            const password = document.getElementById('register-password').value;
            if (!username || !password) return;
            const btn = document.getElementById('register-submit-btn');
            btn.disabled = true;
            btn.textContent = 'Registering...';
            document.getElementById('auth-error').textContent = '';
            mp.register(username, password, display || username);
        });
        
        // Guest login
        document.getElementById('guest-login-btn').addEventListener('click', () => {
            if (!checkConnection()) return;
            mp.loginAsGuest();
        });
        
        // Close modal on auth success — use a dedicated wrapped callback
        // Store the base callback so we don't wrap endlessly on repeated opens
        if (!mp._baseOnAuthSuccess) {
            mp._baseOnAuthSuccess = mp.onAuthSuccess;
        }
        mp.onAuthSuccess = (profile) => {
            modal.classList.add('hidden');
            if (mp._baseOnAuthSuccess) {
                mp._baseOnAuthSuccess(profile);
            } else {
                showNotification(`Welcome, ${profile.displayName}!`, '#00ff88', 2000);
                updateAccountUI(profile);
            }
            // Restore the base callback after use
            mp.onAuthSuccess = mp._baseOnAuthSuccess;
        };
    }
    
    modal.classList.remove('hidden');
}

function showMultiplayerModal() {
    const mp = window.MultiplayerClient;
    
    if (!mp) {
        showNotification('⚠️ Multiplayer module not loaded', '#ff6b6b', 3000);
        return;
    }
    
    // If we're not yet connected, wait for the auto-connect to land before
    // giving up. Opening the start menu and immediately clicking multiplayer
    // used to race the WebSocket handshake and show "Cant connect to the
    // server" even though the server was fine.
    if (!mp.connected) {
        const tt = (typeof t === 'function') ? t : (k, fb) => fb;
        showNotification('🔌 ' + tt('mp.connecting', 'Connecting to multiplayer server…'), '#ffd93d', 1500);
        if (typeof mp.connect === 'function') {
            try { mp.connect(); } catch {}
        }
        const start = Date.now();
        // Give the handshake up to 12s before reporting failure - cold-start
        // proxies / Hetzner edges can take a few seconds.
        const TIMEOUT_MS = 12000;
        const wait = setInterval(() => {
            if (mp.connected) {
                clearInterval(wait);
                showMultiplayerModal();
            } else if (Date.now() - start > TIMEOUT_MS) {
                clearInterval(wait);
                const baseMsg = tt('mp.cantConnect', '⚠️ Cannot connect to multiplayer server');
                const detail = mp.lastError ? ` — ${mp.lastError}` : '';
                showNotification(baseMsg + detail + ' (tap KOOP again to retry)', '#ff6b6b', 6000);
            }
        }, 200);
        return;
    }
    
    // No account required: silently sign in as a guest so the user can
    // jump straight into multiplayer without going through registration.
    // They can still upgrade to a real account later via the 👤 Account
    // button.
    if (!mp.authenticated) {
        const prevSuccess = mp.onAuthSuccess;
        mp.onAuthSuccess = (profile) => {
            mp.onAuthSuccess = prevSuccess;
            if (prevSuccess) {
                try { prevSuccess(profile); } catch {}
            } else if (typeof updateAccountUI === 'function') {
                updateAccountUI(profile);
            }
            // Re-open the multiplayer modal now that we're authenticated.
            showMultiplayerModal();
        };
        if (typeof mp.loginAsGuest === 'function') {
            mp.loginAsGuest();
        } else {
            showAccountModal();
        }
        return;
    }
    
    let modal = document.getElementById('multiplayer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'multiplayer-modal';
        modal.className = 'modal';
        document.getElementById('game-container').appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content multiplayer-modal">
            <h2>🎮 Co-op Multiplayer</h2>
            <p class="intro-text">Play with up to 4 players on different devices!</p>
            <div class="mp-options">
                <div class="mp-option">
                    <h3>🏠 Create Room</h3>
                    <p>Host a game and invite friends</p>
                    <div class="mp-create-settings">
                        <label>Difficulty:
                            <select id="mp-difficulty">
                                <option value="easy">Easy</option>
                                <option value="normal" selected>Normal</option>
                                <option value="hard">Hard</option>
                                <option value="nightmare">Nightmare</option>
                            </select>
                        </label>
                        <label>Max Players:
                            <select id="mp-max-players">
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4" selected>4</option>
                            </select>
                        </label>
                        <label>
                            <input type="checkbox" id="mp-shared-xp" checked> Shared XP
                        </label>
                    </div>
                    <button class="btn-primary" id="mp-create-btn">Create Room</button>
                </div>
                <div class="mp-option">
                    <h3>🔗 Join Room</h3>
                    <p>Enter a room code to join a friend</p>
                    <input type="text" id="mp-room-code" placeholder="Enter room code" maxlength="6" style="text-transform: uppercase;">
                    <div id="join-error" class="auth-error"></div>
                    <button class="btn-primary" id="mp-join-btn">Join Room</button>
                </div>
            </div>
            <button class="btn-secondary" onclick="this.closest('.modal').classList.add('hidden')">Back</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
    document.getElementById('start-modal')?.classList.add('hidden');
    
    // Create room handler
    document.getElementById('mp-create-btn').addEventListener('click', () => {
        mp.createRoom({
            difficulty: document.getElementById('mp-difficulty').value,
            maxPlayers: parseInt(document.getElementById('mp-max-players').value),
            sharedXP: document.getElementById('mp-shared-xp').checked,
        });
        modal.classList.add('hidden');
    });
    
    // Join room handler
    document.getElementById('mp-join-btn').addEventListener('click', () => {
        const code = document.getElementById('mp-room-code').value.trim().toUpperCase();
        if (code.length !== 6) {
            document.getElementById('join-error').textContent = 'Room code must be 6 characters';
            return;
        }
        document.getElementById('join-error').textContent = '';
        document.getElementById('mp-join-btn').disabled = true;
        document.getElementById('mp-join-btn').textContent = 'Joining...';
        mp.joinRoom(code);
        // Don't hide modal yet - wait for server response
    });
    
    // Allow Enter key to join
    document.getElementById('mp-room-code').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('mp-join-btn').click();
        }
    });
}

window.addEventListener('load', init);

// Expose additional symbols needed by integration scripts (game-integration.js
// rebuilds the character-select list and needs to construct Player instances
// and start the game loop). Without these exposures the integration silently
// clears the character list, which is what broke "I can't choose a character".
try {
    window.Player = Player;
    window.spawnWave = spawnWave;
    window.gameLoop = gameLoop;
} catch {}

// ==================== REWORK: GAME MODES, STORY, DAILY, MP UX ====================
// All additions below are additive; they wire the new i18n / story / multiplayer-extras systems
// into the existing game without modifying core gameplay.

/**
 * Launch a story chapter. Wired into window so the StoryMode module can call it
 * after the intro cinematic finishes.
 */
window.startStoryChapter = function startStoryChapter(chapter) {
    if (!chapter) return;
    game.gameMode = 'story';
    game.activeStoryChapter = chapter;
    game.storyChapterFinalBossSpawned = false;
    if (window.StoryMode) window.StoryMode.setActiveChapter(chapter);
    
    // Apply chapter difficulty
    game.difficulty = chapter.difficulty || 'normal';
    game.difficultySettings = CONFIG.DIFFICULTY[game.difficulty];
    
    // Hide menus, show character select
    document.getElementById('start-modal')?.classList.add('hidden');
    const charSel = document.getElementById('character-select-modal');
    if (charSel) charSel.classList.remove('hidden');
};

/**
 * Launch the daily challenge: applies seeded difficulty and shows mutator banner.
 */
window.startDailyChallenge = function startDailyChallenge() {
    if (!window.DailyChallenge) return;
    const challenge = window.DailyChallenge.getTodayChallenge();
    game.gameMode = 'daily';
    game.activeDailyChallenge = challenge;
    game.activeStoryChapter = null;
    game.difficulty = challenge.difficulty;
    game.difficultySettings = CONFIG.DIFFICULTY[game.difficulty];
    
    document.getElementById('start-modal')?.classList.add('hidden');
    const charSel = document.getElementById('character-select-modal');
    if (charSel) charSel.classList.remove('hidden');
    
    const tt = (k, f, v) => (window.t ? window.t(k, f, v) : f);
    setTimeout(() => {
        const lang = window.i18n ? window.i18n.getLanguage() : 'en';
        const mutName = lang === 'de' ? challenge.mutator.nameDe : challenge.mutator.nameEn;
        showNotification(tt('daily.modifierFmt', "Today's modifier: {mod}", { mod: mutName }), '#ffd93d', 5000);
    }, 200);
};

/**
 * Show the game-mode picker: Classic, Story, Daily, Multiplayer.
 * Replaces the old "Begin Mission → difficulty" flow with a richer hub.
 */
function showGameModeMenu() {
    const tt = (k, f) => (window.t ? window.t(k, f) : f);
    let modal = document.getElementById('gamemode-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'gamemode-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content gamemode-content">
            <h2>${tt('menu.gameMode', 'Choose Your Mission')}</h2>
            <div class="gamemode-grid">
                <div class="gamemode-card" data-mode="classic">
                    <h3>${tt('menu.classic', '🎯 Classic Survival')}</h3>
                    <p>${tt('menu.classicDesc', 'Endless waves. How long can you last?')}</p>
                </div>
                <div class="gamemode-card" data-mode="story">
                    <h3>${tt('menu.story', '📖 Story Mode')}</h3>
                    <p>${tt('menu.storyDesc', 'Five themed chapters with their own bosses.')}</p>
                </div>
                <div class="gamemode-card" data-mode="daily">
                    <h3>${tt('menu.daily', '☀️ Daily Challenge')}</h3>
                    <p>${tt('menu.dailyDesc', 'A new shared challenge every day. Same seed for everyone!')}</p>
                </div>
                <div class="gamemode-card" data-mode="multiplayer">
                    <h3>${tt('menu.multiplayer', '🎮 Co-op Multiplayer')}</h3>
                    <p>${tt('menu.multiplayerDesc', 'Up to 4 players online. Share XP, share glory. No account required.')}</p>
                </div>
            </div>
            <button class="btn-secondary gamemode-back">${tt('common.back', 'Back')}</button>
        </div>
    `;
    document.getElementById('game-container').appendChild(modal);
    
    const close = () => {
        modal.remove();
        document.getElementById('start-modal')?.classList.remove('hidden');
    };
    modal.querySelector('.gamemode-back').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    
    modal.querySelectorAll('.gamemode-card').forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.getAttribute('data-mode');
            modal.remove();
            if (mode === 'classic') {
                game.gameMode = 'classic';
                game.activeStoryChapter = null;
                game.activeDailyChallenge = null;
                if (window.StoryMode) window.StoryMode.clearActiveChapter();
                showDifficultySelect();
            } else if (mode === 'story') {
                if (window.StoryMode) window.StoryMode.showMenu();
            } else if (mode === 'daily') {
                showDailyChallengeMenu();
            } else if (mode === 'multiplayer') {
                if (typeof showMultiplayerModal === 'function') showMultiplayerModal();
            }
        });
    });
}

function showDailyChallengeMenu() {
    const tt = (k, f, v) => (window.t ? window.t(k, f, v) : f);
    if (!window.DailyChallenge) return;
    const challenge = window.DailyChallenge.getTodayChallenge();
    let modal = document.getElementById('daily-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'daily-modal';
    modal.className = 'modal';
    const lang = window.i18n ? window.i18n.getLanguage() : 'en';
    const mutName = lang === 'de' ? challenge.mutator.nameDe : challenge.mutator.nameEn;
    const best = window.DailyChallenge.bestToday();
    modal.innerHTML = `
        <div class="modal-content daily-content">
            <h2>${tt('daily.title', '☀️ Daily Challenge')}</h2>
            <p>${tt('daily.intro', "Same loadout, same modifiers, same enemies — for everyone, every day. How far can you push?")}</p>
            <div class="daily-info">
                <p><strong>${tt('daily.seedFmt', "Today's seed: {seed}", { seed: challenge.seed })}</strong></p>
                <p>${tt('daily.modifierFmt', "Today's modifier: {mod}", { mod: mutName })}</p>
                <p style="opacity:.8">${challenge.mutator.desc}</p>
                <p>⚙️ ${tt('difficulty.' + challenge.difficulty, challenge.difficulty)}</p>
                ${best > 0 ? `<p>🏆 Best today: ${tt('hud.wave', 'Wave')} ${best}</p>` : ''}
            </div>
            <button class="btn-primary daily-start">${tt('daily.start', 'Start Daily Run')}</button>
            <button class="btn-secondary daily-back">${tt('common.back', 'Back')}</button>
        </div>
    `;
    document.getElementById('game-container').appendChild(modal);
    const close = () => {
        modal.remove();
        document.getElementById('start-modal')?.classList.remove('hidden');
    };
    modal.querySelector('.daily-back').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('.daily-start').addEventListener('click', () => {
        modal.remove();
        window.startDailyChallenge();
    });
}

// ===== Replace start-button to open the mode picker instead of going straight to difficulty =====
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        // Remove any existing click handlers by cloning. The original handler set up in init()
        // also runs; we wrap it to open our menu instead. Detected via a flag.
        startBtn.addEventListener('click', (e) => {
            // The original click handler hides start-modal and calls showDifficultySelect.
            // We let it run, then immediately replace the difficulty modal with our game-mode picker.
            // showDifficultySelect appends a #difficulty-modal — remove it and show our picker.
            setTimeout(() => {
                const diff = document.getElementById('difficulty-modal');
                if (diff) diff.remove();
                showGameModeMenu();
            }, 0);
        }, false);
    }
});

// ===== Translate dynamic modals after they appear =====
// Many modals build their HTML dynamically and don't include data-i18n by default.
// We re-translate on language change for any data-i18n attributes, and on
// MutationObserver-detected modal additions.
(function setupAutoTranslate() {
    if (!window.i18n) return;
    const apply = () => { try { window.translateDOM(document); } catch {} };
    window.i18n.onChange(apply);
    // Translate after DOM mutations (modals being injected)
    try {
        const obs = new MutationObserver((muts) => {
            let needs = false;
            for (const m of muts) {
                m.addedNodes && m.addedNodes.forEach(n => {
                    if (n.nodeType === 1 && (n.matches?.('[data-i18n], [data-i18n-html], [data-i18n-placeholder], [data-i18n-title]') || n.querySelector?.('[data-i18n], [data-i18n-html], [data-i18n-placeholder], [data-i18n-title]'))) {
                        needs = true;
                    }
                });
            }
            if (needs) apply();
        });
        obs.observe(document.body, { childList: true, subtree: true });
    } catch {}
})();

// ===== Inject Story / Daily buttons into the start-modal next to Multiplayer =====
// Disabled: Story Mode and Daily Challenge are reachable from the game-mode
// picker that opens after "Begin Mission". Keeping the start menu lean.
function injectExtraStartButtons() {
    return; // Intentional no-op — see comment above.
}
window.addEventListener('load', () => setTimeout(injectExtraStartButtons, 50));

// ===== Multiplayer keys: T (emote wheel), Q (drop danger ping), E (rally ping) =====
window.addEventListener('keydown', (e) => {
    if (game.state !== 'playing' || game.paused) return;
    if (!game.isMultiplayer) return;
    // Don't interfere when typing in inputs
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
    
    const ex = window.MultiplayerExtras;
    if (!ex) return;
    
    if (e.key === 't' || e.key === 'T') {
        if (!ex.emoteWheelOpen) {
            ex.openEmoteWheel();
            e.preventDefault();
        }
    } else if (e.key === 'q' || e.key === 'Q') {
        if (game.player) {
            ex.sendPing(Math.round(game.player.x), Math.round(game.player.y), 'danger');
            const tt = (k, f) => (window.t ? window.t(k, f) : f);
            showNotification(tt('ping.placed', 'Ping placed'), '#ff4d4d', 1200);
            e.preventDefault();
        }
    } else if (e.key === 'e' || e.key === 'E') {
        if (game.player) {
            ex.sendPing(Math.round(game.player.x), Math.round(game.player.y), 'rally');
            const tt = (k, f) => (window.t ? window.t(k, f) : f);
            showNotification(tt('ping.placed', 'Ping placed'), '#4ecdc4', 1200);
            e.preventDefault();
        }
    }
});

// ===== Multiplayer HUD: quick-chat strip + emote wheel button =====
function ensureMpQuickChatHud() {
    let hud = document.getElementById('mp-quickchat-hud');
    const tt = (k, f) => (window.t ? window.t(k, f) : f);
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'mp-quickchat-hud';
        hud.className = 'mp-quickchat-hud';
        hud.innerHTML = `
            <button class="qc-btn" data-key="help">${tt('quickchat.help', 'Help!')}</button>
            <button class="qc-btn" data-key="push">${tt('quickchat.push', 'Push!')}</button>
            <button class="qc-btn" data-key="defend">${tt('quickchat.defend', 'Defend!')}</button>
            <button class="qc-btn" data-key="gg">${tt('quickchat.gg', 'GG!')}</button>
            <button class="qc-btn emote-open" title="${tt('mp.openEmote', 'Open Emote Wheel (T)')}" aria-label="emote">😀</button>
        `;
        document.body.appendChild(hud);
        hud.querySelectorAll('.qc-btn[data-key]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.MultiplayerExtras) window.MultiplayerExtras.sendQuickChat(btn.getAttribute('data-key'));
            });
        });
        hud.querySelector('.emote-open').addEventListener('click', () => {
            if (window.MultiplayerExtras && !window.MultiplayerExtras.emoteWheelOpen) {
                window.MultiplayerExtras.openEmoteWheel();
            }
        });
        if (window.i18n) {
            window.i18n.onChange(() => {
                hud.querySelectorAll('.qc-btn[data-key]').forEach(btn => {
                    const k = btn.getAttribute('data-key');
                    btn.textContent = tt('quickchat.' + k, btn.textContent);
                });
                const eb = hud.querySelector('.emote-open');
                if (eb) eb.title = tt('mp.openEmote', 'Open Emote Wheel (T)');
            });
        }
    }
    hud.style.display = (game.isMultiplayer && game.state === 'playing') ? 'flex' : 'none';
}
setInterval(ensureMpQuickChatHud, 500);

// ===== Pause-menu Settings button: open the settings modal =====
document.addEventListener('DOMContentLoaded', () => {
    const psb = document.getElementById('pause-settings-btn');
    if (psb) {
        psb.addEventListener('click', () => {
            const sm = document.getElementById('settings-modal');
            if (sm) sm.classList.remove('hidden');
        });
    }
});
