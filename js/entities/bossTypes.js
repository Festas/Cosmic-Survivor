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
