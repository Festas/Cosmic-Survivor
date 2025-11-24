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
};

export function getEnemyTypeForWave(wave) {
    // Unlock enemy types progressively
    const availableTypes = ['normal', 'fast'];
    
    if (wave >= 3) availableTypes.push('tank');
    if (wave >= 5) availableTypes.push('swarm');
    if (wave >= 7) availableTypes.push('teleporter');
    if (wave >= 10) availableTypes.push('shooter');
    
    // Weight distribution
    const weights = {
        normal: 40,
        fast: 30,
        tank: 10,
        swarm: 15,
        teleporter: 3,
        shooter: 2,
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
