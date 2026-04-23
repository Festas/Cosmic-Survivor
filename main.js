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
                handlePlayerDeath();
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
            this.x = Math.max(this.size, Math.min(CONFIG.WORLD_WIDTH - this.size, this.x));
            this.y = Math.max(this.size, Math.min(CONFIG.WORLD_HEIGHT - this.size, this.y));
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
        this.x = Math.max(this.size, Math.min(CONFIG.WORLD_WIDTH - this.size, this.x));
        this.y = Math.max(this.size, Math.min(CONFIG.WORLD_HEIGHT - this.size, this.y));

        // Movement tracking for walk animation
        this.isMoving = (dx !== 0 || dy !== 0);
        if (dx > 0) this.facingRight = true;
        else if (dx < 0) this.facingRight = false;
        if (this.isMoving) {
            this.walkTimer++;
            if (this.walkTimer >= ARENA_CONSTANTS.WALK_ANIM_FRAME_DURATION) { this.walkTimer = 0; this.walkFrame = this.walkFrame === 0 ? 1 : 0; }
        } else { this.walkTimer = 0; this.walkFrame = 0; }

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
                            
                            return this.x >= 0 && this.x <= CONFIG.WORLD_WIDTH && 
                                   this.y >= 0 && this.y <= CONFIG.WORLD_HEIGHT;
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
        const inRange = game.enemies
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
            const weapon = WEAPON_TYPES[slot.type];
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
            if (hasPowerup('multishot')) {
                const powerup = game.activePowerups.find(p => p.data.effect === 'multishot');
                if (powerup) projectiles += powerup.data.value;
            }

            const targets = sortedForOrb.slice(0, projectiles);
            targets.forEach((enemy) => {
                const angle = Math.atan2(enemy.y - orbY, enemy.x - orbX);
                if (slot.type === 'spread') {
                    for (let i = 0; i < 5; i++) {
                        const spreadAngle = angle + (i - 2) * 0.15;
                        game.bullets.push(new Bullet(orbX, orbY, spreadAngle, this, weapon));
                    }
                    // Mirror shot - fire reverse copy
                    if (this.mirrorShot && !weapon.continuous) {
                        const mirrorAngle = angle + Math.PI;
                        const mirrorBullet = new Bullet(orbX, orbY, mirrorAngle, this, weapon);
                        mirrorBullet.isMirror = true;
                        game.bullets.push(mirrorBullet);
                    }
                } else {
                    game.bullets.push(new Bullet(orbX, orbY, angle, this, weapon));
                    // Mirror shot - fire reverse copy
                    if (this.mirrorShot && !weapon.continuous) {
                        const mirrorAngle = angle + Math.PI;
                        const mirrorBullet = new Bullet(orbX, orbY, mirrorAngle, this, weapon);
                        mirrorBullet.isMirror = true;
                        game.bullets.push(mirrorBullet);
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
                        const b = new Bullet(orbX, orbY, ringAngle, this, weapon);
                        b.damage *= evo.damage;
                        b.color = evo.color;
                        game.bullets.push(b);
                    }
                }
                // Orbital Strike - rain rockets from sky (still centered on player)
                if (evo.orbitalStrike) {
                    for (let s = 0; s < evo.strikeCount; s++) {
                        setTimeout(() => {
                            const sx = game.player.x + (Math.random() - 0.5) * 300;
                            const sy = game.player.y + (Math.random() - 0.5) * 300;
                            createExplosion(sx, sy, evo.color, 30);
                            game.enemies.forEach(e => {
                                if (Math.hypot(e.x - sx, e.y - sy) < 80) {
                                    e.takeDamage(game.player.damage * 2, false);
                                }
                            });
                            screenShake(5);
                        }, s * 200);
                    }
                }
            }
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
        
        // Phase Shift - invulnerability after damage
        if (this.phaseShift && this.phaseShiftCooldown > 0) {
            createTextParticle(this.x, this.y, '👻 PHASE!', '#8b5cf6', 16);
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
        // Diminishing-returns armor: 10 armor ≈ 25% reduction, 20 ≈ 40%,
        // 30 ≈ 50%, hard-capped at 60% so even Juggernaut can still die.
        // Old `100/(100+armor)` made 10 armor a measly 9% reduction, which
        // made Tank/Juggernaut/Engineer not actually feel tanky.
        const armorReduction = Math.min(0.60, this.armor / (this.armor + 30));
        const finalDamage = Math.max(1, Math.floor(amount * (1 - armorReduction)));
        this.health -= finalDamage;
        game.stats.damageTaken += finalDamage;
        // Track when the player was last actually hit so the renderer can
        // pulse a brief red full-screen damage flash for visceral feedback.
        this._lastHitTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        this._lastHitDamage = finalDamage;
        
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
        
        // Trigger Phase Shift cooldown
        if (this.phaseShift && this.phaseShiftCooldown <= 0) {
            this.dashInvulnerable = Math.max(this.dashInvulnerable, 60);
            this.phaseShiftCooldown = 300;
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
                handlePlayerDeath();
            }
        }
    }

    heal(amount) {
        if (this.healingBlocked) return;
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

        // Weapon orbs - all collected weapons orbit the player like
        // Vampire Survivors / Brotato / Binding of Isaac familiars.
        if (this.weaponSlots && this.weaponSlots.length > 0) {
            ctx.save();
            const slotCount = this.weaponSlots.length;
            const now = Date.now();
            for (let i = 0; i < slotCount; i++) {
                const slot = this.weaponSlots[i];
                const weapon = WEAPON_TYPES[slot.type];
                if (!weapon) continue;
                const a = this.weaponOrbitAngle + (i / slotCount) * Math.PI * 2;
                const ox = cx + Math.cos(a) * this.weaponOrbitRadius;
                const oy = cy + Math.sin(a) * this.weaponOrbitRadius;
                const orbColor = (slot.evolved && slot.evolvedData) ? slot.evolvedData.color : weapon.color;
                // Cooldown indicator - the orb pulses & dims while reloading.
                const cdRatio = (slot.maxCooldown && slot.cooldown > 0)
                    ? slot.cooldown / slot.maxCooldown : 0;
                const ready = cdRatio <= 0;
                const pulse = ready ? (0.85 + Math.sin(now * 0.012 + i) * 0.15) : 0.55;
                const orbR = 8 + (ready ? 1.5 : 0);
                ctx.globalAlpha = pulse;
                ctx.shadowColor = orbColor;
                ctx.shadowBlur = ready ? 12 : 4;
                ctx.fillStyle = orbColor;
                ctx.beginPath(); ctx.arc(ox, oy, orbR, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
                // Inner highlight
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.beginPath(); ctx.arc(ox - orbR * 0.3, oy - orbR * 0.3, orbR * 0.35, 0, Math.PI * 2); ctx.fill();
                // Cooldown ring
                if (!ready) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(ox, oy, orbR + 2, -Math.PI / 2, -Math.PI / 2 + (1 - cdRatio) * Math.PI * 2);
                    ctx.stroke();
                }
            }
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
        if (!this.isAlive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const scale = this.facingRight ? 1 : -1;
        ctx.scale(scale, 1);

        // Draw astronaut body (simplified version of Player.draw)
        const s = this.size;
        
        // Suit body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 2, s * 0.35, s * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this._lightenColor(this.color, 30);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Helmet
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(0, -s * 0.25, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Visor
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(s * 0.05, -s * 0.25, s * 0.2, -0.3, 1.2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // Visor shine
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(-s * 0.05, -s * 0.32, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        
        // Legs with walk animation
        const legOffset = this.walkFrame === 1 ? 3 : -3;
        ctx.fillStyle = this._darkenColor(this.color, 30);
        ctx.fillRect(-s * 0.2, s * 0.3, s * 0.15, s * 0.2 + legOffset);
        ctx.fillRect(s * 0.05, s * 0.3, s * 0.15, s * 0.2 - legOffset);
        
        // Arms
        ctx.fillRect(-s * 0.4, -s * 0.05, s * 0.15, s * 0.25);
        ctx.fillRect(s * 0.25, -s * 0.05, s * 0.15, s * 0.25);
        
        ctx.restore();
        
        // Player name tag above head
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.displayName, this.x, this.y - s - 8);
        
        // Level badge
        ctx.fillStyle = '#ffd93d';
        ctx.font = '9px monospace';
        ctx.fillText(`Lv.${this.level}`, this.x, this.y - s + 2);
        
        // Health bar
        if (this.health < this.maxHealth) {
            const barWidth = 40;
            const barHeight = 4;
            const barX = this.x - barWidth / 2;
            const barY = this.y - s - 18;
            
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            const healthPercent = Math.max(0, this.health / this.maxHealth);
            ctx.fillStyle = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffd93d' : '#ff6b6b';
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        }
        
        // Dash effect
        if (this.isDashing) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, s * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
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
            this.speed = (0.4 + Math.log2(1 + wave * 0.12)) * 0.4 * diffSettings.enemySpeedMult;
            // Smoother late-wave HP curve: replaced runaway wave^1.3 with
            // wave^1.15 + slightly steeper linear term. Same difficulty up to
            // ~wave 20, much fairer past wave 30 where things became unwinnable.
            this.maxHealth = (15 + wave * 4 + Math.pow(wave, 1.15)) * bossType.health * diffSettings.enemyHealthMult;
            this.health = this.maxHealth;
            this.damage = (4 + wave * 0.9 + Math.pow(wave, 1.05) * 0.25) * bossType.damage * diffSettings.enemyDamageMult;
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
            // Boss phase system
            this.phase = 1;
            this.phaseThresholds = [1.0, 0.6, 0.3]; // Phase changes at 60% and 30% HP
            this.phaseTransitioning = false;
            this.phaseTransitionTimer = 0;
            this.specialAttackCooldown = 0;
            this.shockwaveChargeTimer = 0;
            this.isChargingShockwave = false;
        } else {
            const enemyType = ENEMY_TYPES[type] || ENEMY_TYPES.normal;
            this.type = type;
            this.size = CONFIG.ENEMY_SIZE * (enemyType.size || 1);
            const diffSettings = game.difficultySettings || CONFIG.DIFFICULTY.normal;
            // Tame "fast" enemy speed runaway: log2(1+wave*0.18) so
            // wave-30 Stalkers don't outrun base player speed.
            this.speed = (1 + Math.log2(1 + wave * 0.18)) * enemyType.speed * diffSettings.enemySpeedMult;
            // See boss block above — same gentler late-wave curve.
            this.maxHealth = (15 + wave * 4 + Math.pow(wave, 1.15)) * enemyType.health * diffSettings.enemyHealthMult;
            this.health = this.maxHealth;
            this.damage = (4 + wave * 0.9 + Math.pow(wave, 1.05) * 0.25) * enemyType.damage * diffSettings.enemyDamageMult;
            this.creditValue = Math.floor((2 + wave * 0.8) * enemyType.credits * (diffSettings.creditMult || 1));

            // Corruption scaling - enemies harder but better rewards at high corruption
            if (game.corruption >= 5) {
                const corruptionMult = 1 + (game.corruption - 4) * 0.08;
                this.maxHealth *= corruptionMult;
                this.health = this.maxHealth;
                this.damage *= (1 + (game.corruption - 4) * 0.05);
                this.creditValue = Math.floor(this.creditValue * (1 + game.corruption * 0.1));
            }

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
        
        // Speed cap - prevents oppressively fast enemies
        const maxSpeed = this.isBoss ? 3 : 4;
        this.speed = Math.min(this.speed, maxSpeed);

        this.attackCooldown = 0;
    }

    update() {
        // Track movement for walk animation
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Target nearest player (supports multiplayer)
        const nearestPlayer = getNearestPlayerTarget(this.x, this.y);
        let targetX = nearestPlayer.x, targetY = nearestPlayer.y;
        if (game.player && game.player.decoy && game.player.decoy.health > 0 && !this.isBoss) {
            const distDecoy = Math.hypot(game.player.decoy.x - this.x, game.player.decoy.y - this.y);
            const distPlayer = Math.hypot(nearestPlayer.x - this.x, nearestPlayer.y - this.y);
            if (distDecoy < distPlayer * 0.8) { targetX = game.player.decoy.x; targetY = game.player.decoy.y; }
        }
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);

        // Boss abilities
        if (this.isBoss) {
            // Boss phase transitions
            const healthPercent = this.health / this.maxHealth;
            const newPhase = healthPercent <= 0.3 ? 3 : healthPercent <= 0.6 ? 2 : 1;
            
            if (newPhase > this.phase) {
                this.phase = newPhase;
                this.phaseTransitioning = true;
                this.phaseTransitionTimer = 60; // 1 second invulnerable during transition
                
                // Phase transition effects
                screenShake(15);
                createExplosion(this.x, this.y, this.color, 40);
                
                if (this.phase === 2) {
                    showNotification(`${this.name} enters Phase 2!`, '#ff6b6b', 3000);
                    // Phase 2: speed boost
                    this.speed *= 1.3;
                    Sound.play('boss');
                } else if (this.phase === 3) {
                    showNotification(`${this.name} enters FINAL PHASE!`, '#ff0000', 4000);
                    // Phase 3: desperate, very aggressive
                    this.speed *= 1.5;
                    this.damage *= 1.3;
                    Sound.play('boss');
                    createExplosion(this.x, this.y, '#ff0000', 60);
                }
            }
            
            if (this.phaseTransitioning) {
                this.phaseTransitionTimer--;
                if (this.phaseTransitionTimer <= 0) {
                    this.phaseTransitioning = false;
                }
                // Pulsing invulnerability visual
                if (game.frameCount % 4 < 2) {
                    createParticles(this.x, this.y, this.color, 2);
                }
            }
            
            // Phase-specific special attacks
            if (this.specialAttackCooldown > 0) this.specialAttackCooldown--;
            
            if (!this.phaseTransitioning && this.specialAttackCooldown <= 0) {
                // Phase 2+: Shockwave attack (all boss types)
                if (this.phase >= 2 && !this.isChargingShockwave) {
                    const nearestForShockwave = getNearestPlayerTarget(this.x, this.y);
                    const playerDist = Math.hypot(nearestForShockwave.x - this.x, nearestForShockwave.y - this.y);
                    if (playerDist < 250) {
                        this.isChargingShockwave = true;
                        this.shockwaveChargeTimer = 45; // 0.75s telegraph
                        createTextParticle(this.x, this.y - this.size - 20, '⚠️', '#ff0000', 24);
                    }
                }
                
                // Phase 3: Bullet burst (all boss types)
                if (this.phase >= 3 && this.specialAttackCooldown <= 0) {
                    const burstCount = 8 + Math.floor(Math.random() * 8);
                    for (let i = 0; i < burstCount; i++) {
                        const angle = (i / burstCount) * Math.PI * 2;
                        game.bullets.push({
                            x: this.x,
                            y: this.y,
                            angle,
                            speed: 3 + Math.random() * 2,
                            size: 6,
                            damage: this.damage * 0.4,
                            color: this.color,
                            isEnemyBullet: true,
                        });
                    }
                    this.specialAttackCooldown = this.phase >= 3 ? 180 : 300;
                    createExplosion(this.x, this.y, this.color, 25);
                }
            }
            
            // Shockwave execution
            if (this.isChargingShockwave) {
                this.shockwaveChargeTimer--;
                // Telegraph: red circle growing
                if (this.shockwaveChargeTimer <= 0) {
                    // Execute shockwave
                    this.isChargingShockwave = false;
                    this.specialAttackCooldown = this.phase >= 3 ? 120 : 240;
                    
                    const shockRadius = 200;
                    const playerDist = Math.hypot(game.player.x - this.x, game.player.y - this.y);
                    if (playerDist < shockRadius) {
                        game.player.takeDamage(this.damage * 0.8);
                        // Knockback
                        if (!game.player.knockbackImmune) {
                            const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
                            game.player.x += Math.cos(angle) * 80;
                            game.player.y += Math.sin(angle) * 80;
                            game.player.x = Math.max(game.player.size, Math.min(CONFIG.WORLD_WIDTH - game.player.size, game.player.x));
                            game.player.y = Math.max(game.player.size, Math.min(CONFIG.WORLD_HEIGHT - game.player.size, game.player.y));
                        }
                    }
                    screenShake(12);
                    createExplosion(this.x, this.y, '#ff4444', 35);
                }
            }
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
        this.x = Math.max(this.size, Math.min(CONFIG.WORLD_WIDTH - this.size, this.x));
        this.y = Math.max(this.size, Math.min(CONFIG.WORLD_HEIGHT - this.size, this.y));
        
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

        // Wave modifier: regenerating enemies
        if (this.regens && !this.isBoss && game.frameCount % 60 === 0) {
            this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.02);
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
        this.x = Math.max(50, Math.min(CONFIG.WORLD_WIDTH - 50, this.x));
        this.y = Math.max(50, Math.min(CONFIG.WORLD_HEIGHT - 50, this.y));
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
        // Boss phase transition invulnerability
        if (this.isBoss && this.phaseTransitioning) {
            createTextParticle(this.x, this.y, 'IMMUNE!', '#ffd93d', 14);
            return false;
        }
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

        // Broadcast enemy kill to co-op partners for shared XP
        if (game.isMultiplayer && window.MultiplayerClient && window.MultiplayerClient.connected) {
            window.MultiplayerClient.sendGameEvent('enemy_killed', {
                xp: totalXP,
                type: this.type,
                isBoss: this.isBoss,
                isElite: this.isElite,
            });
            // Track local MVP stats
            if (window.MultiplayerExtras) {
                const localId = window.MultiplayerClient.localPlayerId;
                window.MultiplayerExtras.bumpStat(localId, 'kills', 1);
                if (this.isBoss) {
                    window.MultiplayerExtras.bumpStat(localId, 'bosses', 1);
                    // Friendly boss-kill banner for the team
                    window.MultiplayerClient.sendGameEvent('boss_down', { type: this.type });
                    const tt = (k, f) => (window.t ? window.t(k, f) : f);
                    showNotification(tt('mp.bossDownFmt', '🏆 Boss defeated! Team strikes again!'), '#ffd93d', 4000);
                }
            }
        }

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
        
        // Weapon XP - level up equipped weapons
        if (game.player && game.player.weaponSlots) {
            game.player.weaponSlots.forEach(slot => {
                if (slot.evolved || slot.level >= 5) return;
                slot.xp = (slot.xp || 0) + 1;
                const xpNeeded = slot.level * 15; // 15, 30, 45, 60 kills to level
                if (slot.xp >= xpNeeded) {
                    slot.xp = 0;
                    slot.level++;
                    const weapon = WEAPON_TYPES[slot.type];
                    showNotification(`${weapon?.name || slot.type} leveled to ${slot.level}!`, weapon?.color || '#ffd93d', 2000);
                    Sound.play('levelUp');
                    
                    // Check for evolution at level 5
                    if (slot.level >= 5) {
                        checkWeaponEvolution(slot);
                    }
                }
            });
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
            showNotification(`🏆 ${this.name} Defeated! 🏆`, '#ffd93d', 4000);
            screenShake(25);
            // Massive multi-stage explosion
            createExplosion(this.x, this.y, this.color, 80);
            setTimeout(() => createExplosion(this.x + 30, this.y - 20, '#ffd93d', 50), 100);
            setTimeout(() => createExplosion(this.x - 20, this.y + 30, '#ff6b6b', 60), 200);
            setTimeout(() => createExplosion(this.x, this.y, '#fff', 40), 300);
        } else {
            // Bigger death for elites
            if (this.isElite) {
                screenShake(6);
                createExplosion(this.x, this.y, this.color, 35);
                createExplosion(this.x, this.y, this.eliteModifier?.color || '#fff', 20);
            } else {
                screenShake(3);
                createExplosion(this.x, this.y, this.color, 20);
            }
        }
        
        // Chance to spawn powerup (higher for bosses)
        const powerupChance = this.isBoss ? CONFIG.POWERUP_DROP_CHANCE_BOSS : CONFIG.POWERUP_DROP_CHANCE;
        if (Math.random() < powerupChance) {
            spawnPowerup(this.x, this.y);
        }
        
        // Kill streak credit bonus
        let streakBonus = 1;
        if (game.stats.comboKills >= 20) streakBonus = 2.5;
        else if (game.stats.comboKills >= 10) streakBonus = 2.0;
        else if (game.stats.comboKills >= 5) streakBonus = 1.5;

        const creditDrop = Math.floor(this.creditValue * (game.creditMultiplier || 1) * (1 + (game.player?.creditBonus || 0)) * streakBonus);
        game.pickups.push(new Pickup(this.x, this.y, creditDrop));
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
        
        // Phase glow effect
        if (this.phase >= 2) {
            ctx.save();
            const glowPulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.5;
            ctx.globalAlpha = glowPulse * (this.phase >= 3 ? 0.4 : 0.2);
            ctx.fillStyle = this.phase >= 3 ? '#ff0000' : '#ff6b00';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
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
        // Remember the source weapon so per-bullet effects (e.g. split shot)
        // can spawn matching projectiles regardless of which orbiting weapon
        // fired this bullet.
        this.weapon = weapon;
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
                
                // Chain lightning
                if (game.player.chainLightningChance > 0 && Math.random() < game.player.chainLightningChance) {
                    const nearby = game.enemies.filter(ne => ne !== enemy && Math.hypot(ne.x - enemy.x, ne.y - enemy.y) < 150);
                    if (nearby.length > 0) {
                        const target = nearby[Math.floor(Math.random() * nearby.length)];
                        target.takeDamage(this.damage * 0.5, false);
                        game.particles.push({
                            x: enemy.x, y: enemy.y, x2: target.x, y2: target.y,
                            type: 'lightning_arc', color: '#00d4ff', life: 10, maxLife: 10
                        });
                    }
                }
                
                // Visual feedback for crits
                if (isCrit) {
                    createExplosion(enemy.x, enemy.y, '#ffd93d', 10);
                    Sound.play('crit');
                }
                
                this.hitEnemies.push(enemy);
                // Split shot
                if (game.player && game.player.splitShot && !this.isSplit) {
                    const splitWeapon = this.weapon || WEAPON_TYPES.basic;
                    [this.angle + 0.5, this.angle - 0.5].forEach(a => {
                        const splitBullet = new Bullet(this.x, this.y, a, game.player, splitWeapon);
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
                if (this.x < 0 || this.x > CONFIG.WORLD_WIDTH) { this.angle = Math.PI - this.angle; this.x = Math.max(1, Math.min(CONFIG.WORLD_WIDTH - 1, this.x)); this.bounceLeft--; return true; }
                if (this.y < 0 || this.y > CONFIG.WORLD_HEIGHT) { this.angle = -this.angle; this.y = Math.max(1, Math.min(CONFIG.WORLD_HEIGHT - 1, this.y)); this.bounceLeft--; return true; }
            }
        }

        return this.x >= 0 && this.x <= CONFIG.WORLD_WIDTH && 
               this.y >= 0 && this.y <= CONFIG.WORLD_HEIGHT;
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
        } else if (p.type === 'lightning_arc') {
            ctx.save();
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            const midX = (p.x + p.x2) / 2 + (Math.random() - 0.5) * 30;
            const midY = (p.y + p.y2) / 2 + (Math.random() - 0.5) * 30;
            ctx.quadraticCurveTo(midX, midY, p.x2, p.y2);
            ctx.stroke();
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
    
    // ===== Story Mode: override wave behavior =====
    const storyChapter = game.gameMode === 'story' ? game.activeStoryChapter : null;
    const isStoryFinalWave = !!(storyChapter && game.wave >= storyChapter.waves);
    
    // Variable wave duration
    let waveDuration;
    if (game.wave <= 3) waveDuration = 35;
    else if (game.wave <= 8) waveDuration = 45;
    else if (game.wave <= 15) waveDuration = 55;
    else if (game.wave <= 20) waveDuration = 70;
    else waveDuration = 80;
    
    // Boss waves are always 90 seconds
    let isBoss = game.wave % CONFIG.BOSS_WAVE_INTERVAL === 0;
    // In story mode, the chapter's last wave is always a boss wave with the chapter's final boss
    if (isStoryFinalWave) {
        isBoss = true;
    }
    if (isBoss) waveDuration = 90;
    
    game.timeLeft = waveDuration;
    
    // Reset wave-specific state
    game.fogOfWar = false;
    game.creditMultiplier = 1;
    game.waveModifier = null;
    
    // Apply wave modifier (starting wave 3, not on boss waves, not in story mode)
    if (game.wave >= 3 && !isBoss && !storyChapter) {
        const modKeys = Object.keys(WAVE_MODIFIERS);
        const modKey = modKeys[Math.floor(Math.random() * modKeys.length)];
        game.waveModifier = { key: modKey, ...WAVE_MODIFIERS[modKey] };
        showNotification(`${game.waveModifier.name}: ${game.waveModifier.desc}`, game.waveModifier.color, 3000);
    }
    
    showWaveAnnouncement();
    
    if (isBoss) {
        Sound.play('boss');
        let bossType;
        if (isStoryFinalWave && storyChapter.finalBoss && BOSS_TYPES[storyChapter.finalBoss]) {
            bossType = storyChapter.finalBoss;
            game.storyChapterFinalBossSpawned = true;
        } else {
            const bossTypes = Object.keys(BOSS_TYPES);
            bossType = bossTypes[Math.floor(game.wave / CONFIG.BOSS_WAVE_INTERVAL) % bossTypes.length];
        }
        const spawnTarget = getRandomAlivePlayer();
        const boss = new Enemy(spawnTarget.x + 300, spawnTarget.y - 300, game.wave, bossType, true);
        game.enemies.push(boss);
        showNotification(`BOSS WAVE: ${boss.name}`);
    } else {
        // Enemy count: was wave^1.2 which made wave 50+ unrenderable (220+
        // enemies). Trimmed to wave^1.1 so wave 50 ≈ 180 enemies, wave 30 ≈
        // 110 — still feels swarm-y, no longer a slideshow.
        let enemyCount = Math.floor(8 + game.wave * 2 + Math.pow(game.wave, 1.1));
        
        // Scale enemy count for multiplayer
        if (game.isMultiplayer) {
            const playerCount = 1 + game.remotePlayers.size;
            enemyCount = Math.floor(enemyCount * (1 + (playerCount - 1) * game.coopSettings.enemyScalePerPlayer));
        }
        
        // Apply wave modifier to enemy count
        if (game.waveModifier && game.waveModifier.enemyCountMult) {
            enemyCount = Math.floor(enemyCount * game.waveModifier.enemyCountMult);
        }
        
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => {
                // Spawn around a random alive player
                const spawnTarget = getRandomAlivePlayer();
                const px = spawnTarget ? spawnTarget.x : CONFIG.WORLD_WIDTH / 2;
                const py = spawnTarget ? spawnTarget.y : CONFIG.WORLD_HEIGHT / 2;
                const spawnDist = 500 + Math.random() * 200;
                const spawnAngle = Math.random() * Math.PI * 2;
                let x = px + Math.cos(spawnAngle) * spawnDist;
                let y = py + Math.sin(spawnAngle) * spawnDist;
                x = Math.max(50, Math.min(CONFIG.WORLD_WIDTH - 50, x));
                y = Math.max(50, Math.min(CONFIG.WORLD_HEIGHT - 50, y));
                
                let typeKeys = Object.keys(ENEMY_TYPES).filter(t => {
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
                
                // Story mode: restrict to chapter's enemy pool (intersected with currently-unlocked types)
                if (storyChapter && Array.isArray(storyChapter.enemyPool) && storyChapter.enemyPool.length > 0) {
                    const allowed = typeKeys.filter(t => storyChapter.enemyPool.includes(t));
                    if (allowed.length > 0) typeKeys = allowed;
                    else typeKeys = storyChapter.enemyPool.filter(t => ENEMY_TYPES[t]);
                }
                
                // Wave modifier spawn bias
                if (game.waveModifier && game.waveModifier.spawnBias && typeKeys.includes(game.waveModifier.spawnBias)) {
                    if (Math.random() < 0.4) {
                        typeKeys = [game.waveModifier.spawnBias];
                    }
                }
                
                const type = typeKeys[Math.floor(Math.random() * typeKeys.length)];
                const enemy = new Enemy(x, y, game.wave, type, false);
                
                // Apply wave modifier to spawned enemy
                if (game.waveModifier && game.waveModifier.onSpawn) {
                    game.waveModifier.onSpawn(enemy);
                }
                
                game.enemies.push(enemy);
            }, i * 150); // Slightly faster spawn interval
        }
    }
    
    // Apply wave modifier to existing enemies
    if (game.waveModifier && game.waveModifier.apply) {
        setTimeout(() => game.waveModifier.apply(), 500);
    }
    
    game.stats.waveStartDamage = game.stats.damageTaken;
}

function nextWave() {
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
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Show joystick hint when not active on mobile
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
    
    // Outer circle with pulse effect for better visibility
    const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 0.35;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#4ecdc4';
    ctx.beginPath();
    ctx.arc(startX, startY, 60, 0, Math.PI * 2);
    ctx.fill();
    
    // Outer ring for better definition
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(startX, startY, 60, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner control stick with radial gradient for glow effect
    const gradient = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 35);
    gradient.addColorStop(0, '#00ff88');
    gradient.addColorStop(0.7, '#00ff88');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
    
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 35, 0, Math.PI * 2);
    ctx.fill();
    
    // Solid center
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 28, 0, Math.PI * 2);
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
    // Undo camera transform so pause menu is screen-relative
    ctx.translate(game.camera.x, game.camera.y);
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Menu box
    ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    const menuW = Math.min(500, CONFIG.CANVAS_WIDTH - 40);
    const menuH = Math.min(400, CONFIG.CANVAS_HEIGHT - 80);
    const menuX = CONFIG.CANVAS_WIDTH / 2 - menuW / 2;
    const menuY = CONFIG.CANVAS_HEIGHT / 2 - menuH / 2;
    ctx.fillRect(menuX, menuY, menuW, menuH);
    ctx.strokeRect(menuX, menuY, menuW, menuH);
    
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
    
    // Active weapons - all collected weapons orbit the player simultaneously.
    ctx.fillStyle = '#4ecdc4';
    ctx.font = '20px monospace';
    let activeWeaponNames = '🔫 Blaster';
    if (game.player && Array.isArray(game.player.weaponSlots) && game.player.weaponSlots.length > 0) {
        activeWeaponNames = game.player.weaponSlots
            .map(s => {
                const w = WEAPON_TYPES[s.type];
                if (s.evolved && s.evolvedData) return s.evolvedData.name;
                return w ? w.name : s.type;
            })
            .join(', ');
    }
    ctx.fillText(`Active Weapons: ${activeWeaponNames}`, CONFIG.CANVAS_WIDTH / 2, menuY + 250);
    
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

// Draw weapon indicator - lists all simultaneously-active orbiting weapons.
function drawWeaponIndicator(ctx) {
    if (!game.player) return;
    const slots = game.player.weaponSlots;
    const isMobile = CONFIG.CANVAS_WIDTH < 800;
    const slotWidth = isMobile ? 60 : 80;
    const totalWidth = slots.length * slotWidth + (slots.length - 1) * 5;
    const x = CONFIG.CANVAS_WIDTH - totalWidth - 10;
    const y = CONFIG.CANVAS_HEIGHT - 50;
    ctx.save();
    slots.forEach((slot, i) => {
        const sx = x + i * (slotWidth + 5);
        const weapon = WEAPON_TYPES[slot.type];
        // All weapons are always active in the orbital weapon system, so we
        // no longer highlight a single "active" slot.
        ctx.fillStyle = 'rgba(0,255,136,0.10)';
        ctx.fillRect(sx, y, slotWidth, 38);
        if (slot.cooldown > 0 && slot.maxCooldown > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(sx, y, slotWidth * (slot.cooldown / slot.maxCooldown), 38);
        }
        ctx.strokeStyle = weapon ? weapon.color : '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, y, slotWidth, 38);
        ctx.fillStyle = '#888'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
        ctx.fillText(`#${i + 1}`, sx + 3, y + 12);
        ctx.fillStyle = weapon ? weapon.color : '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        const displayName = slot.evolved && slot.evolvedData ? slot.evolvedData.name.split(' ').pop() : (weapon ? weapon.name.split(' ').pop() : '???');
        const displayColor = slot.evolved && slot.evolvedData ? slot.evolvedData.color : (weapon ? weapon.color : '#fff');
        ctx.fillStyle = displayColor;
        ctx.fillText(displayName, sx + slotWidth / 2, y + 28);
        // Level indicator
        if (slot.level > 1 || slot.evolved) {
            ctx.fillStyle = slot.evolved ? '#ffd700' : '#fff';
            ctx.font = '9px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(slot.evolved ? '★EVO' : `Lv${slot.level}`, sx + slotWidth - 3, y + 12);
        }
    });
    ctx.restore();
}

function drawMinimap(ctx) {
    if (game.state !== 'playing') return;
    
    const isMobile = CONFIG.CANVAS_WIDTH < 800;
    const mapW = isMobile ? 100 : 150;
    const mapH = isMobile ? 67 : 100;
    const mapX = CONFIG.CANVAS_WIDTH - mapW - 10;
    const mapY = CONFIG.CANVAS_HEIGHT - mapH - 10;
    const scaleX = mapW / CONFIG.WORLD_WIDTH;
    const scaleY = mapH / CONFIG.WORLD_HEIGHT;
    
    ctx.save();
    
    // Background
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX, mapY, mapW, mapH);
    
    // Camera view rectangle
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 1;
    ctx.strokeRect(
        mapX + game.camera.x * scaleX,
        mapY + game.camera.y * scaleY,
        CONFIG.CANVAS_WIDTH * scaleX,
        CONFIG.CANVAS_HEIGHT * scaleY
    );
    
    // Player dot
    if (game.player) {
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(mapX + game.player.x * scaleX, mapY + game.player.y * scaleY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Remote player dots (multiplayer)
    if (game.isMultiplayer) {
        for (const rp of game.remotePlayers.values()) {
            if (rp.isAlive) {
                ctx.fillStyle = rp.color;
                ctx.beginPath();
                ctx.arc(mapX + rp.x * scaleX, mapY + rp.y * scaleY, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Enemy dots
    ctx.fillStyle = '#ff6b6b';
    game.enemies.forEach(e => {
        const dotSize = e.isBoss ? 3 : 1;
        ctx.beginPath();
        ctx.arc(mapX + e.x * scaleX, mapY + e.y * scaleY, dotSize, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // XP orb clusters (draw every 5th for performance)
    if (game.xpOrbs) {
        ctx.fillStyle = '#a855f7';
        game.xpOrbs.forEach((orb, i) => {
            if (i % 5 === 0) {
                ctx.fillRect(mapX + orb.x * scaleX - 0.5, mapY + orb.y * scaleY - 0.5, 1, 1);
            }
        });
    }
    
    ctx.restore();
}

function drawComboCounter(ctx) {
    if (game.state !== 'playing' || game.stats.comboKills < 3) return;
    
    const combo = game.stats.comboKills;
    const timerPercent = game.stats.comboTimer / msToFrames(CONFIG.COMBO_TIMEOUT);
    
    ctx.save();
    
    // Position on screen (not in world space)
    const x = CONFIG.CANVAS_WIDTH - 100;
    const y = 100;
    
    // Combo number with size scaling
    const fontSize = Math.min(48, 24 + combo * 0.5);
    const pulse = Math.sin(Date.now() * 0.01) * 2;
    
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = combo >= 20 ? '#ff0000' : combo >= 10 ? '#ffd93d' : '#fff';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.fillText(`${combo}x`, x, y + pulse);
    
    ctx.font = '12px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.shadowBlur = 0;
    ctx.fillText('COMBO', x, y + 18);
    
    // Timer bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 30, y + 22, 60, 4);
    ctx.fillStyle = timerPercent > 0.5 ? '#00ff88' : timerPercent > 0.25 ? '#ffd93d' : '#ff6b6b';
    ctx.fillRect(x - 30, y + 22, 60 * timerPercent, 4);
    
    ctx.restore();
}

function drawXPBar(ctx) {
    const barWidth = Math.min(300, CONFIG.CANVAS_WIDTH - 100);
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
    
    // Glow when close to level up
    if (xpPercent > 0.8) {
        const glowPulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.5;
        ctx.save();
        ctx.globalAlpha = glowPulse * 0.4;
        ctx.fillStyle = '#ffd93d';
        ctx.fillRect(x, y, barWidth * xpPercent, barHeight);
        ctx.restore();
    }

    ctx.restore();
}

function drawWaveModifier(ctx) {
    if (!game.waveModifier || game.state !== 'playing') return;
    
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, 80, 200, 28);
    ctx.fillStyle = game.waveModifier.color;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(game.waveModifier.name, 15, 99);
    ctx.restore();
}

function drawCorruptionIndicator(ctx) {
    if (game.corruption <= 0) return;
    
    ctx.save();
    const x = 10;
    const y = 115;
    
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, 130, 22);
    
    // Corruption bar
    const fillPercent = Math.min(game.corruption / 10, 1);
    const barColor = game.corruption >= 10 ? '#dc2626' : game.corruption >= 5 ? '#f59e0b' : '#7c3aed';
    ctx.fillStyle = barColor;
    ctx.fillRect(x, y, 130 * fillPercent, 22);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`☠️ Corruption: ${game.corruption}`, x + 5, y + 15);
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

// Draw all entries in game.bullets. Player bullets are Bullet instances with
// a draw() method, but enemy bullets (e.g. boss phase-3 bursts and shooter
// projectiles) are pushed as plain objects without one. We render those
// inline so they are visible and never crash the renderer with
// "b.draw is not a function".
// Screen-space overlays drawn over the world view but under the HUD:
//   - red full-screen damage flash whenever the player just took a hit
//   - subtle dark vignette while a boss is alive (focuses the eye on action)
function drawScreenOverlays(ctx) {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;

    // Boss vignette: subtle radial darkening at the corners while a boss
    // is in play, gives the encounter a heavier "this is dangerous" feel.
    const bossPresent = game.enemies && game.enemies.some(e => e && e.isBoss);
    if (bossPresent) {
        ctx.save();
        const cx = W / 2;
        const cy = H / 2;
        const inner = Math.max(W, H) * 0.32;
        const outer = Math.max(W, H) * 0.78;
        const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.45)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    // Damage flash: 220 ms red overlay scaled by hit severity.
    if (game.player && game.player._lastHitTime) {
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const elapsed = now - game.player._lastHitTime;
        const DURATION = 220;
        if (elapsed >= 0 && elapsed < DURATION) {
            const t = 1 - elapsed / DURATION; // 1 → 0
            // Cap base alpha by hit severity vs. max HP, but always show at
            // least a faint flash so even 1 HP scratches register.
            const sev = Math.min(1, (game.player._lastHitDamage || 1) / Math.max(1, game.player.maxHealth * 0.25));
            const alpha = (0.10 + 0.30 * sev) * t;
            ctx.save();
            ctx.fillStyle = `rgba(255, 40, 40, ${alpha.toFixed(3)})`;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }
    }
}

function drawBullets(ctx) {
    for (const b of game.bullets) {
        if (typeof b.draw === 'function') {
            b.draw(ctx);
        } else {
            ctx.save();
            const color = b.color || '#ff6b6b';
            ctx.fillStyle = color;
            ctx.shadowBlur = 12;
            ctx.shadowColor = color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size || 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

function drawBossHealthBar(ctx) {
    const boss = game.enemies.find(e => e.isBoss);
    if (!boss || game.state !== 'playing') return;
    
    const barWidth = Math.min(500, CONFIG.CANVAS_WIDTH - 60);
    const barHeight = 20;
    const x = CONFIG.CANVAS_WIDTH / 2 - barWidth / 2;
    const y = 15;
    
    ctx.save();
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 5, y - 5, barWidth + 10, barHeight + 30);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 5, y - 5, barWidth + 10, barHeight + 30);
    
    // Boss name
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${boss.name}`, CONFIG.CANVAS_WIDTH / 2, y + 8);
    
    // Health bar background
    ctx.fillStyle = 'rgba(50, 0, 0, 0.8)';
    ctx.fillRect(x, y + 12, barWidth, barHeight);
    
    // Health fill
    const healthPercent = boss.health / boss.maxHealth;
    const healthColor = boss.phase >= 3 ? '#dc2626' : boss.phase >= 2 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = healthColor;
    ctx.fillRect(x, y + 12, barWidth * healthPercent, barHeight);
    
    // Phase markers
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + barWidth * 0.6, y + 12);
    ctx.lineTo(x + barWidth * 0.6, y + 12 + barHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + barWidth * 0.3, y + 12);
    ctx.lineTo(x + barWidth * 0.3, y + 12 + barHeight);
    ctx.stroke();
    
    // Phase indicator
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Phase ${boss.phase}/3`, x + barWidth, y + 8);
    
    // HP text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(boss.health)} / ${Math.ceil(boss.maxHealth)}`, CONFIG.CANVAS_WIDTH / 2, y + 27);
    
    // Charging shockwave telegraph
    if (boss.isChargingShockwave) {
        const chargeProgress = 1 - (boss.shockwaveChargeTimer / 45);
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 14px monospace';
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.5;
        ctx.fillText('⚠️ INCOMING ATTACK ⚠️', CONFIG.CANVAS_WIDTH / 2, y + barHeight + 35);
        ctx.globalAlpha = 1;
    }
    
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
        startBtn.disabled = !lobby.players.every(p => p.ready);
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
    if (!game.stars) return;
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Nebula puffs (deepest, behind stars)
    if (game.nebulae) {
        for (const n of game.nebulae) {
            const sx = (((n.x - game.camera.x * n.parallax) % W) + W) % W;
            const sy = (((n.y - game.camera.y * n.parallax) % H) + H) % H;
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, n.radius);
            grad.addColorStop(0, n.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(sx - n.radius, sy - n.radius, n.radius * 2, n.radius * 2);
        }
    }

    // Stars per layer with parallax — modulo wraps around the viewport so
    // they appear to scroll infinitely in any direction.
    for (const star of game.stars) {
        const sx = (((star.x - game.camera.x * star.parallax) % W) + W) % W;
        const sy = (((star.y - game.camera.y * star.parallax) % H) + H) % H;
        const twinkle = 0.55 + Math.sin(star.twinkle) * 0.45;
        ctx.globalAlpha = Math.max(0.05, twinkle * star.brightness);
        ctx.fillStyle = star.color;
        ctx.shadowColor = star.color;
        ctx.shadowBlur = star.size * 2.5;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
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
    ctx.translate(-game.camera.x + game.camera.offsetX, -game.camera.y + game.camera.offsetY);
    
    // Background
    const theme = game.arenaTheme || getCurrentTheme();
    ctx.fillStyle = theme.bgColor;
    ctx.fillRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
    
    // Animated starfield
    updateStarfield();
    drawStarfield(ctx);
    
    // Grid with subtle animation (optimized - draw less frequently)
    // Use timestamp divided by ~33ms (approximately 30 FPS) for consistent rendering pattern
    if (Math.floor(timestamp / 33) % 2 === 0) {
        const gridPulse = Math.sin(timestamp * 0.0005) * 0.02 + 0.05;
        ctx.strokeStyle = theme.gridColor || `rgba(78, 205, 196, ${gridPulse})`;
        ctx.lineWidth = 1;
        const camX = Math.floor(game.camera.x);
        const camY = Math.floor(game.camera.y);
        const gridStartX = Math.floor(camX / 50) * 50;
        const gridStartY = Math.floor(camY / 50) * 50;
        for (let x = gridStartX; x < camX + CONFIG.CANVAS_WIDTH + 50; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, camY);
            ctx.lineTo(x, camY + CONFIG.CANVAS_HEIGHT);
            ctx.stroke();
        }
        for (let y = gridStartY; y < camY + CONFIG.CANVAS_HEIGHT + 50; y += 50) {
            ctx.beginPath();
            ctx.moveTo(camX, y);
            ctx.lineTo(camX + CONFIG.CANVAS_WIDTH, y);
            ctx.stroke();
        }
    }
    
    // Draw arena obstacles
    drawArenaObstacles(ctx);
    
    // Boss shockwave telegraph
    game.enemies.forEach(e => {
        if (e.isBoss && e.isChargingShockwave) {
            ctx.save();
            const progress = 1 - (e.shockwaveChargeTimer / 45);
            ctx.globalAlpha = 0.2 + progress * 0.3;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.arc(e.x, e.y, 200 * progress, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            ctx.fill();
            ctx.restore();
        }
    });
    
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
                if (game.isMultiplayer) {
                    // In multiplayer, only the host triggers wave completion
                    const mp = window.MultiplayerClient;
                    if (mp && mp.isHost()) {
                        mp.sendGameEvent('wave_complete', { wave: game.wave });
                        Sound.play('waveComplete');
                        openShop();
                    }
                    // Non-host clients wait for the host's wave_complete event
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
        game.bullets = game.bullets.filter(b => {
            if (b.isEnemyBullet) {
                b.x += Math.cos(b.angle) * b.speed;
                b.y += Math.sin(b.angle) * b.speed;
                
                // Check collision with local player
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
                
                return b.x >= 0 && b.x <= CONFIG.WORLD_WIDTH && b.y >= 0 && b.y <= CONFIG.WORLD_HEIGHT;
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
        drawBullets(ctx);
        game.player.draw(ctx);
        // Draw remote players (multiplayer)
        if (game.isMultiplayer) {
            for (const rp of game.remotePlayers.values()) {
                rp.draw(ctx);
            }
        }
        drawParticles(ctx);
        
        // Multiplayer extras: emotes, pings, downed indicators (in-world, with camera)
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
        
        // Fog of war overlay
        if (game.fogOfWar && game.player) {
            ctx.save();
            const fogGradient = ctx.createRadialGradient(
                game.player.x, game.player.y, 100,
                game.player.x, game.player.y, 350
            );
            fogGradient.addColorStop(0, 'rgba(0,0,0,0)');
            fogGradient.addColorStop(0.7, 'rgba(0,0,0,0.6)');
            fogGradient.addColorStop(1, 'rgba(0,0,0,0.85)');
            ctx.fillStyle = fogGradient;
            ctx.fillRect(game.camera.x, game.camera.y, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            ctx.restore();
        }
        
        // Low HP warning - screen edge vignette
        if (game.player && game.player.health <= game.player.maxHealth * 0.3 && game.player.health > 0) {
            ctx.save();
            const vx = game.camera.x;
            const vy = game.camera.y;
            const pulse = Math.sin(Date.now() * 0.004) * 0.15 + 0.25;
            const vignette = ctx.createRadialGradient(
                game.player.x, game.player.y, CONFIG.CANVAS_WIDTH * 0.3,
                game.player.x, game.player.y, CONFIG.CANVAS_WIDTH * 0.7
            );
            vignette.addColorStop(0, 'rgba(200, 0, 0, 0)');
            vignette.addColorStop(1, `rgba(200, 0, 0, ${pulse})`);
            ctx.fillStyle = vignette;
            ctx.fillRect(vx, vy, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            ctx.restore();
        }
        
        // Draw HUD elements (outside camera transform)
        ctx.restore();
        ctx.save();
        // Screen-space damage flash + boss vignette (drawn over the world,
        // under the HUD so HUD text stays crisp).
        drawScreenOverlays(ctx);
        drawNotifications(ctx);
        drawJoystick(ctx);
        drawActivePowerups(ctx);
        drawComboMeter(ctx);
        drawWeaponIndicator(ctx);
        drawMinimap(game.ctx);
        drawXPBar(game.ctx);
        drawDashIndicator(game.ctx);
        drawDPSMeter(game.ctx);
        drawWaveModifier(game.ctx);
        drawCorruptionIndicator(game.ctx);
        drawBossHealthBar(game.ctx);
        drawComboCounter(game.ctx);
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
                rp.draw(ctx);
            }
        }
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
                    <p><strong>Name:</strong> ${profile.displayName}</p>
                    <p><strong>Username:</strong> ${profile.username}</p>
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
        if (mp) {
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
