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
        palette: { body: '#dc2626', head: '#f87171', limb: '#991b1b', accent: '#fecaca', glow: '#ff0000' },
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
        palette: { body: '#7c2d12', head: '#a16207', limb: '#451a03', accent: '#d97706', glow: '#f59e0b' },
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
        palette: { body: '#581c87', head: '#7c3aed', limb: '#3b0764', accent: '#a78bfa', glow: '#8b5cf6' },
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
        palette: { body: '#4c1d95', head: '#6d28d9', limb: '#2e1065', accent: '#a78bfa', glow: '#8b5cf6' },
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
        palette: { body: '#b91c1c', head: '#92400e', limb: '#7f1d1d', accent: '#fbbf24', glow: '#f59e0b' },
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
        palette: { body: '#7e22ce', head: '#a855f7', limb: '#581c87', accent: '#d8b4fe', glow: '#c084fc' },
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
        palette: { body: '#0f766e', head: '#14b8a6', limb: '#134e4a', accent: '#5eead4', glow: '#2dd4bf' },
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
