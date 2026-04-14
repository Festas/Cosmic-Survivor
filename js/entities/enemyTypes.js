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
        behavior: 'wander',
        movementPattern: 'wander',
        palette: { body: '#a855f7', core: '#e9d5ff', glow: '#c084fc', accent: '#7c3aed' },
    },
    fast: {
        name: '⚡ Stalker',
        color: '#ff6b6b',
        speedMultiplier: 1.5,
        healthMultiplier: 0.5,
        damageMultiplier: 0.8,
        creditMultiplier: 1.2,
        behavior: 'zigzag',
        movementPattern: 'zigzag',
        palette: { body: '#ff6b6b', core: '#fef2f2', glow: '#f87171', accent: '#dc2626' },
    },
    tank: {
        name: '💎 Golem',
        color: '#10b981',
        speedMultiplier: 0.5,
        healthMultiplier: 2.5,
        damageMultiplier: 1.4,
        creditMultiplier: 2,
        behavior: 'chase',
        movementPattern: 'chase',
        palette: { body: '#10b981', core: '#6ee7b7', glow: '#34d399', accent: '#065f46' },
    },
    swarm: {
        name: '🦟 Drone',
        color: '#f59e0b',
        speedMultiplier: 1.2,
        healthMultiplier: 0.3,
        damageMultiplier: 0.4,
        creditMultiplier: 0.5,
        behavior: 'orbit',
        movementPattern: 'orbit',
        size: 15,
        palette: { body: '#f59e0b', core: '#fef3c7', glow: '#fbbf24', accent: '#b45309' },
    },
    teleporter: {
        name: '🌀 Warper',
        color: '#8b5cf6',
        speedMultiplier: 0.7,
        healthMultiplier: 0.9,
        damageMultiplier: 1.1,
        creditMultiplier: 1.5,
        behavior: 'phase',
        movementPattern: 'phase',
        teleportCooldown: 180,
        palette: { body: '#8b5cf6', core: '#c4b5fd', glow: '#a78bfa', accent: '#6d28d9' },
    },
    shooter: {
        name: '🎯 Marksman',
        color: '#ec4899',
        speedMultiplier: 0.4,
        healthMultiplier: 0.75,
        damageMultiplier: 1.0,
        creditMultiplier: 1.8,
        behavior: 'strafe',
        movementPattern: 'strafe',
        shootRange: 300,
        shootCooldown: 120,
        palette: { body: '#ec4899', core: '#fce7f3', glow: '#f472b6', accent: '#be185d' },
    },
    healer: {
        name: '✨ Oracle',
        color: '#22d3ee',
        speedMultiplier: 0.6,
        healthMultiplier: 1.1,
        damageMultiplier: 0.5,
        creditMultiplier: 2.5,
        behavior: 'flee',
        movementPattern: 'flee',
        healRange: 150,
        healAmount: 5,
        healCooldown: 120,
        palette: { body: '#22d3ee', core: '#cffafe', glow: '#67e8f9', accent: '#0891b2' },
    },
    splitter: {
        name: '🧬 Mitotic',
        color: '#fb923c',
        speedMultiplier: 0.85,
        healthMultiplier: 1.2,
        damageMultiplier: 1.0,
        creditMultiplier: 2.2,
        behavior: 'wander',
        movementPattern: 'wander',
        splitCount: 3,
        splitSize: 0.5,
        palette: { body: '#fb923c', core: '#fed7aa', glow: '#fdba74', accent: '#c2410c' },
    },
    freezer: {
        name: '❄️ Cryo',
        color: '#38bdf8',
        speedMultiplier: 0.7,
        healthMultiplier: 1.0,
        damageMultiplier: 0.8,
        creditMultiplier: 2,
        behavior: 'chase',
        movementPattern: 'chase',
        slowDuration: 120,
        slowAmount: 0.5,
        palette: { body: '#38bdf8', core: '#e0f2fe', glow: '#7dd3fc', accent: '#0284c7' },
    },
    berserker: {
        name: '👹 Ravager',
        color: '#dc2626',
        speedMultiplier: 1.0,
        healthMultiplier: 1.5,
        damageMultiplier: 1.6,
        creditMultiplier: 2.3,
        behavior: 'lunge',
        movementPattern: 'lunge',
        rageThreshold: 0.3,
        rageSpeedBoost: 1.5,
        rageDamageBoost: 1.5,
        palette: { body: '#dc2626', core: '#fecaca', glow: '#f87171', accent: '#991b1b' },
    },
    bomber: {
        name: '💣 Detonator',
        color: '#ff3300',
        speedMultiplier: 0.75,
        healthMultiplier: 0.8,
        damageMultiplier: 1.0,
        creditMultiplier: 2.5,
        behavior: 'dash',
        movementPattern: 'dash',
        explosionRadius: 100,
        explosionDamage: 30,
        palette: { body: '#ff3300', core: '#ff9966', glow: '#ff6633', accent: '#cc2900' },
    },
    parasite: {
        name: '🦠 Leech',
        color: '#84cc16',
        speedMultiplier: 1.15,
        healthMultiplier: 0.5,
        damageMultiplier: 0.6,
        creditMultiplier: 1.8,
        behavior: 'orbit',
        movementPattern: 'orbit',
        drains: true,
        palette: { body: '#84cc16', core: '#d9f99d', glow: '#a3e635', accent: '#4d7c0f' },
    },
    shielder: {
        name: '🛡️ Sentinel',
        color: '#6366f1',
        speedMultiplier: 0.55,
        healthMultiplier: 1.6,
        damageMultiplier: 0.8,
        creditMultiplier: 2.8,
        behavior: 'chase',
        movementPattern: 'chase',
        shields: true,
        palette: { body: '#6366f1', core: '#c7d2fe', glow: '#818cf8', accent: '#4338ca' },
    },
    necro: {
        name: '💀 Wraith',
        color: '#78716c',
        speedMultiplier: 0.65,
        healthMultiplier: 1.3,
        damageMultiplier: 1.2,
        creditMultiplier: 3.0,
        behavior: 'flee',
        movementPattern: 'flee',
        revives: true,
        palette: { body: '#78716c', core: '#d6d3d1', glow: '#a8a29e', accent: '#44403c' },
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
