// Enemy Types
import { CONFIG } from '../config.js';

export const ENEMY_TYPES = {
    normal: {
        name: 'Normal Alien',
        color: '#a855f7',
        speedMultiplier: 1,
        healthMultiplier: 1,
        damageMultiplier: 1,
        creditMultiplier: 1,
        behavior: 'chase',
    },
    fast: {
        name: 'Fast Alien',
        color: '#ff6b6b',
        speedMultiplier: 1.5,
        healthMultiplier: 0.7,
        damageMultiplier: 0.8,
        creditMultiplier: 1.2,
        behavior: 'chase',
    },
    tank: {
        name: 'Tank Alien',
        color: '#10b981',
        speedMultiplier: 0.6,
        healthMultiplier: 2.5,
        damageMultiplier: 1.5,
        creditMultiplier: 2,
        behavior: 'chase',
    },
    swarm: {
        name: 'Swarm Alien',
        color: '#f59e0b',
        speedMultiplier: 1.2,
        healthMultiplier: 0.4,
        damageMultiplier: 0.5,
        creditMultiplier: 0.5,
        behavior: 'swarm',
        size: 15,
    },
    teleporter: {
        name: 'Teleporter',
        color: '#8b5cf6',
        speedMultiplier: 0.8,
        healthMultiplier: 1,
        damageMultiplier: 1.2,
        creditMultiplier: 1.5,
        behavior: 'teleport',
        teleportCooldown: 180,
    },
    shooter: {
        name: 'Shooter Alien',
        color: '#ec4899',
        speedMultiplier: 0.5,
        healthMultiplier: 0.8,
        damageMultiplier: 1,
        creditMultiplier: 1.8,
        behavior: 'ranged',
        shootRange: 300,
        shootCooldown: 120,
    },
    healer: {
        name: 'Healer Alien',
        color: '#22d3ee',
        speedMultiplier: 0.7,
        healthMultiplier: 1.2,
        damageMultiplier: 0.6,
        creditMultiplier: 2.5,
        behavior: 'healer',
        healRange: 200,
        healAmount: 5,
        healCooldown: 90,
    },
    splitter: {
        name: 'Splitter Alien',
        color: '#fb923c',
        speedMultiplier: 0.9,
        healthMultiplier: 1.3,
        damageMultiplier: 1.1,
        creditMultiplier: 2.2,
        behavior: 'chase',
        splitCount: 3,
        splitSize: 0.5,
    },
    freezer: {
        name: 'Freezer Alien',
        color: '#38bdf8',
        speedMultiplier: 0.8,
        healthMultiplier: 1.1,
        damageMultiplier: 0.9,
        creditMultiplier: 2,
        behavior: 'chase',
        slowDuration: 120,
        slowAmount: 0.5,
    },
    berserker: {
        name: 'Berserker Alien',
        color: '#dc2626',
        speedMultiplier: 1,
        healthMultiplier: 1.5,
        damageMultiplier: 1.8,
        creditMultiplier: 2.3,
        behavior: 'berserker',
        rageThreshold: 0.5,
        rageSpeedBoost: 2,
        rageDamageBoost: 1.5,
    },
    bomber: {
        name: 'Bomber Alien',
        color: '#ff3300',
        speedMultiplier: 0.7,
        healthMultiplier: 0.9,
        damageMultiplier: 1,
        creditMultiplier: 2.5,
        behavior: 'chase',
        explosionRadius: 100,
        explosionDamage: 30,
        unlockWave: 22,
    },
    mimic: {
        name: 'Mimic Alien',
        color: '#ffd93d',
        speedMultiplier: 0,
        healthMultiplier: 0.6,
        damageMultiplier: 2,
        creditMultiplier: 3,
        behavior: 'mimic',
        disguiseRange: 150,
        unlockWave: 25,
    },
};

export function getEnemyTypeForWave(wave) {
    // Unlock enemy types progressively
    const availableTypes = ['normal', 'fast'];
    
    if (wave >= 3) availableTypes.push('tank');
    if (wave >= 5) availableTypes.push('swarm');
    if (wave >= 7) availableTypes.push('teleporter');
    if (wave >= 10) availableTypes.push('shooter');
    if (wave >= 12) availableTypes.push('healer');
    if (wave >= 15) availableTypes.push('splitter');
    if (wave >= 18) availableTypes.push('freezer');
    if (wave >= 20) availableTypes.push('berserker');
    if (wave >= 22) availableTypes.push('bomber');
    if (wave >= 25) availableTypes.push('mimic');
    
    // Weight distribution
    const weights = {
        normal: 40,
        fast: 30,
        tank: 10,
        swarm: 15,
        teleporter: 3,
        shooter: 2,
        healer: 2,
        splitter: 3,
        freezer: 2,
        berserker: 2,
        bomber: 3,
        mimic: 2,
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
