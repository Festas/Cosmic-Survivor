// Boss Entities
import { CONFIG } from '../config.js';

export const BOSS_TYPES = {
    destroyer: {
        name: '👹 The Destroyer',
        color: '#dc2626',
        size: 60,
        speedMultiplier: 0.4,
        healthMultiplier: 15,
        damageMultiplier: 3,
        creditValue: 100,
        behavior: 'boss_melee',
        abilities: ['charge', 'summon'],
    },
    broodmother: {
        name: '🕷️ Brood Mother',
        color: '#7c2d12',
        size: 70,
        speedMultiplier: 0.3,
        healthMultiplier: 12,
        damageMultiplier: 2,
        creditValue: 120,
        behavior: 'boss_summoner',
        abilities: ['spawn_minions'],
    },
    voidwalker: {
        name: '👻 Void Walker',
        color: '#581c87',
        size: 55,
        speedMultiplier: 0.6,
        healthMultiplier: 10,
        damageMultiplier: 2.5,
        creditValue: 150,
        behavior: 'boss_teleporter',
        abilities: ['teleport_attack', 'void_beam'],
    },
    necromancer: {
        name: '💀 Necromancer',
        color: '#4c1d95',
        size: 65,
        speedMultiplier: 0.35,
        healthMultiplier: 13,
        damageMultiplier: 2.2,
        creditValue: 180,
        behavior: 'boss_necromancer',
        abilities: ['resurrect_enemies', 'death_curse'],
    },
    titan: {
        name: '⚡ Titan',
        color: '#b91c1c',
        size: 80,
        speedMultiplier: 0.25,
        healthMultiplier: 20,
        damageMultiplier: 4,
        creditValue: 200,
        behavior: 'boss_melee',
        abilities: ['earthquake', 'ground_slam'],
    },
    swarmqueen: {
        name: '👑 Swarm Queen',
        color: '#f59e0b',
        size: 75,
        speedMultiplier: 0.4,
        healthMultiplier: 18,
        damageMultiplier: 2.5,
        creditValue: 250,
        behavior: 'boss_swarm_queen',
        abilities: ['spawn_swarm', 'weak_points'],
        weakPoints: 3,
    },
    cosmichorror: {
        name: '🐙 Cosmic Horror',
        color: '#4c0099',
        size: 100,
        speedMultiplier: 0.2,
        healthMultiplier: 25,
        damageMultiplier: 3.5,
        creditValue: 300,
        behavior: 'boss_cosmic_horror',
        abilities: ['tentacle_attack', 'void_zone', 'phase_shift'],
        phases: 3,
    },
};

export function getBossForWave(wave) {
    const bossNumber = Math.floor(wave / CONFIG.BOSS_WAVE_INTERVAL);
    const bossTypes = Object.keys(BOSS_TYPES);
    const bossType = bossTypes[bossNumber % bossTypes.length];
    return bossType;
}

export function isBossWave(wave) {
    return wave > 0 && wave % CONFIG.BOSS_WAVE_INTERVAL === 0;
}
