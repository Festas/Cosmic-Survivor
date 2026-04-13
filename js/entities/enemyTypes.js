// Enemy Types
import { CONFIG } from '../config.js';

export const ENEMY_TYPES = {
    normal: {
        name: '👾 Grunt',
        color: '#a855f7',
        speedMultiplier: 1,
        healthMultiplier: 1,
        damageMultiplier: 1,
        creditMultiplier: 1,
        behavior: 'chase',
        palette: { body: '#a855f7', head: '#c084fc', limb: '#7c3aed', accent: '#e9d5ff' },
    },
    fast: {
        name: '💨 Stalker',
        color: '#ff6b6b',
        speedMultiplier: 1.4,
        healthMultiplier: 0.6,
        damageMultiplier: 0.7,
        creditMultiplier: 1.2,
        behavior: 'chase',
        palette: { body: '#ff6b6b', head: '#fca5a5', limb: '#dc2626', accent: '#fef2f2' },
    },
    tank: {
        name: '🪨 Golem',
        color: '#10b981',
        speedMultiplier: 0.55,
        healthMultiplier: 2.2,
        damageMultiplier: 1.3,
        creditMultiplier: 2,
        behavior: 'chase',
        palette: { body: '#10b981', head: '#34d399', limb: '#065f46', accent: '#6ee7b7' },
    },
    swarm: {
        name: '🦟 Drone',
        color: '#f59e0b',
        speedMultiplier: 1.15,
        healthMultiplier: 0.35,
        damageMultiplier: 0.4,
        creditMultiplier: 0.5,
        behavior: 'swarm',
        size: 15,
        palette: { body: '#f59e0b', head: '#fbbf24', limb: '#b45309', accent: '#fef3c7' },
    },
    teleporter: {
        name: '🌀 Warper',
        color: '#8b5cf6',
        speedMultiplier: 0.75,
        healthMultiplier: 0.9,
        damageMultiplier: 1.1,
        creditMultiplier: 1.5,
        behavior: 'teleport',
        teleportCooldown: 180,
        palette: { body: '#8b5cf6', head: '#a78bfa', limb: '#6d28d9', accent: '#c4b5fd' },
    },
    shooter: {
        name: '🔫 Marksman',
        color: '#ec4899',
        speedMultiplier: 0.45,
        healthMultiplier: 0.75,
        damageMultiplier: 0.9,
        creditMultiplier: 1.8,
        behavior: 'ranged',
        shootRange: 300,
        shootCooldown: 120,
        palette: { body: '#ec4899', head: '#f472b6', limb: '#be185d', accent: '#fce7f3' },
    },
    healer: {
        name: '💚 Medic',
        color: '#22d3ee',
        speedMultiplier: 0.65,
        healthMultiplier: 1.1,
        damageMultiplier: 0.5,
        creditMultiplier: 2.5,
        behavior: 'healer',
        healRange: 150,
        healAmount: 5,
        healCooldown: 120,
        palette: { body: '#22d3ee', head: '#67e8f9', limb: '#0891b2', accent: '#cffafe' },
    },
    splitter: {
        name: '🧬 Mitotic',
        color: '#fb923c',
        speedMultiplier: 0.85,
        healthMultiplier: 1.2,
        damageMultiplier: 1.0,
        creditMultiplier: 2.2,
        behavior: 'chase',
        splitCount: 3,
        splitSize: 0.5,
        palette: { body: '#fb923c', head: '#fdba74', limb: '#c2410c', accent: '#fed7aa' },
    },
    freezer: {
        name: '❄️ Cryo',
        color: '#38bdf8',
        speedMultiplier: 0.75,
        healthMultiplier: 1.0,
        damageMultiplier: 0.8,
        creditMultiplier: 2,
        behavior: 'chase',
        slowDuration: 120,
        slowAmount: 0.5,
        palette: { body: '#38bdf8', head: '#7dd3fc', limb: '#0284c7', accent: '#bae6fd' },
    },
    berserker: {
        name: '🔥 Ravager',
        color: '#dc2626',
        speedMultiplier: 0.95,
        healthMultiplier: 1.4,
        damageMultiplier: 1.5,
        creditMultiplier: 2.3,
        behavior: 'berserker',
        rageThreshold: 0.3,
        rageSpeedBoost: 1.5,
        rageDamageBoost: 1.5,
        palette: { body: '#dc2626', head: '#f87171', limb: '#991b1b', accent: '#fecaca' },
    },
    bomber: {
        name: '💣 Detonator',
        color: '#ff3300',
        speedMultiplier: 0.7,
        healthMultiplier: 0.9,
        damageMultiplier: 1.0,
        creditMultiplier: 2.5,
        behavior: 'chase',
        explosionRadius: 100,
        explosionDamage: 30,
        palette: { body: '#ff3300', head: '#ff6633', limb: '#cc2900', accent: '#ff9966' },
    },
    parasite: {
        name: '🦠 Parasite',
        color: '#84cc16',
        speedMultiplier: 1.1,
        healthMultiplier: 0.5,
        damageMultiplier: 0.6,
        creditMultiplier: 1.8,
        behavior: 'chase',
        drains: true,
        palette: { body: '#84cc16', head: '#a3e635', limb: '#4d7c0f', accent: '#d9f99d' },
    },
    shielder: {
        name: '🛡️ Sentinel',
        color: '#6366f1',
        speedMultiplier: 0.6,
        healthMultiplier: 1.5,
        damageMultiplier: 0.8,
        creditMultiplier: 2.8,
        behavior: 'chase',
        shields: true,
        palette: { body: '#6366f1', head: '#818cf8', limb: '#4338ca', accent: '#c7d2fe' },
    },
    necro: {
        name: '💀 Revenant',
        color: '#a3a3a3',
        speedMultiplier: 0.7,
        healthMultiplier: 1.3,
        damageMultiplier: 1.2,
        creditMultiplier: 3.0,
        behavior: 'chase',
        revives: true,
        palette: { body: '#a3a3a3', head: '#d4d4d4', limb: '#525252', accent: '#e5e5e5' },
    },
};

export function getEnemyTypeForWave(wave) {
    // Unlock enemy types progressively
    const availableTypes = ['normal', 'fast'];
    
    if (wave >= 3) availableTypes.push('tank');
    if (wave >= 5) availableTypes.push('swarm');
    if (wave >= 7) availableTypes.push('teleporter');
    if (wave >= 8) availableTypes.push('bomber');
    if (wave >= 10) availableTypes.push('shooter');
    if (wave >= 12) availableTypes.push('healer');
    if (wave >= 14) availableTypes.push('parasite');
    if (wave >= 15) availableTypes.push('splitter');
    if (wave >= 16) availableTypes.push('shielder');
    if (wave >= 18) availableTypes.push('freezer');
    if (wave >= 20) availableTypes.push('berserker');
    if (wave >= 22) availableTypes.push('necro');
    
    // Weight distribution
    const weights = {
        normal: 40,
        fast: 30,
        tank: 10,
        swarm: 15,
        teleporter: 3,
        shooter: 3,
        healer: 2,
        splitter: 3,
        freezer: 2,
        berserker: 2,
        bomber: 3,
        parasite: 3,
        shielder: 2,
        necro: 2,
    };
    
    // Calculate total weight
    let totalWeight = 0;
    availableTypes.forEach(type => {
        totalWeight += weights[type] || 10;
    });
    
    // Random selection based on weights
    let random = Math.random() * totalWeight;
    for (const type of availableTypes) {
        random -= weights[type] || 10;
        if (random <= 0) {
            return type;
        }
    }
    
    return 'normal';
}
