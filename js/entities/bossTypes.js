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
        palette: { body: '#dc2626', core: '#fecaca', glow: '#ff0000', accent: '#991b1b', wing: '#7f1d1d' },
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
        palette: { body: '#7c2d12', core: '#d97706', glow: '#f59e0b', accent: '#451a03', wing: '#a16207' },
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
        palette: { body: '#581c87', core: '#a78bfa', glow: '#8b5cf6', accent: '#3b0764', wing: '#7c3aed' },
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
        palette: { body: '#4c1d95', core: '#a78bfa', glow: '#8b5cf6', accent: '#2e1065', wing: '#6d28d9' },
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
        palette: { body: '#b91c1c', core: '#fbbf24', glow: '#f59e0b', accent: '#7f1d1d', wing: '#92400e' },
    },
    hivemind: {
        name: '🧠 Hivemind',
        color: '#7e22ce',
        size: 62,
        speedMultiplier: 0.35,
        healthMultiplier: 14,
        damageMultiplier: 1.5,
        creditValue: 220,
        behavior: 'boss_commander',
        abilities: ['command_allies', 'psionic_wave'],
        palette: { body: '#7e22ce', core: '#d8b4fe', glow: '#c084fc', accent: '#581c87', wing: '#a855f7' },
    },
    leviathan: {
        name: '🐉 Leviathan',
        color: '#0f766e',
        size: 88,
        speedMultiplier: 0.2,
        healthMultiplier: 25,
        damageMultiplier: 3.5,
        creditValue: 280,
        behavior: 'boss_melee',
        abilities: ['charge', 'tail_sweep'],
        palette: { body: '#0f766e', core: '#5eead4', glow: '#2dd4bf', accent: '#134e4a', wing: '#14b8a6' },
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
