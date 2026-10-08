// waves.js — the Wave Director's data layer: the 10 enemy "themes", wave→theme
// mapping, boss ordering and weighted roster selection.
//
// Everything here is a pure, deterministic function of the wave number (plus an
// injectable RNG for roster picks), so the director in world.js stays thin and
// the whole progression is unit-testable. Each theme owns a boss (one per
// 10-wave block), a weighted enemy roster that flavours its trickle/formation
// spawns, and a background palette so the arena visibly shifts every 10 waves.
//
// Theme/boss order here MUST match the definition order of BOSS_TYPES in
// enemies.js (devourer, warden, hivequeen, …, nemesis).

import { WAVE } from './config.js';
import { rand } from '../engine/utils.js';

// Roster entries are [enemyKey, weight]. All keys must exist in ENEMY_TYPES.
// bg: { bg0, bg1, nebula:[c0,c1,c2], accent } drives Background.setTheme — kept
// dark enough that bullets/enemies stay readable over it.
export const THEMES = [
  {
    id: 'crimson', name: 'Crimson Vanguard', boss: 'devourer',
    roster: [['drone', 10], ['swarm', 7], ['splitter', 3]],
    bg: { bg0: '#0c0608', bg1: '#240a12', nebula: ['rgba(180,40,70,0.20)', 'rgba(150,40,120,0.16)', 'rgba(120,30,60,0.16)'], accent: '#ff3b6b' },
  },
  {
    id: 'azure', name: 'Azure Sentinels', boss: 'warden',
    roster: [['squid', 8], ['crab', 6], ['orbiter', 5], ['spitter', 4]],
    bg: { bg0: '#05080f', bg1: '#09182a', nebula: ['rgba(40,120,200,0.20)', 'rgba(60,160,210,0.16)', 'rgba(40,90,170,0.16)'], accent: '#51e9ff' },
  },
  {
    id: 'verdant', name: 'Verdant Hive', boss: 'hivequeen',
    roster: [['swarm', 8], ['seeder', 5], ['bomber', 4], ['splitter', 4]],
    bg: { bg0: '#050c08', bg1: '#0a2416', nebula: ['rgba(40,160,90,0.18)', 'rgba(90,185,60,0.16)', 'rgba(40,120,80,0.16)'], accent: '#5dff7a' },
  },
  {
    id: 'amber', name: 'Amber Legion', boss: 'siegemarshal',
    roster: [['crab', 7], ['sentinel', 3], ['mortar', 3], ['bulwark', 4], ['brute', 3]],
    bg: { bg0: '#0c0a05', bg1: '#241a08', nebula: ['rgba(200,150,40,0.18)', 'rgba(200,110,40,0.16)', 'rgba(160,100,30,0.16)'], accent: '#ffd23d' },
  },
  {
    id: 'void', name: 'Void Choir', boss: 'singularis',
    roster: [['swarm', 7], ['splitter', 5], ['seeder', 4], ['weaver', 4]],
    bg: { bg0: '#08060f', bg1: '#160a24', nebula: ['rgba(120,60,200,0.20)', 'rgba(160,60,185,0.16)', 'rgba(90,40,165,0.16)'], accent: '#b06bff' },
  },
  {
    id: 'saucer', name: 'Saucer Armada', boss: 'mothership',
    roster: [['squid', 7], ['crab', 6], ['ufo', 4], ['octopus', 3]],
    bg: { bg0: '#060c0b', bg1: '#0a2422', nebula: ['rgba(60,185,150,0.18)', 'rgba(125,205,80,0.16)', 'rgba(40,150,130,0.16)'], accent: '#9dff4d' },
  },
  {
    id: 'spectral', name: 'Spectral Shoal', boss: 'phantom',
    roster: [['weaver', 7], ['dasher', 6], ['orbiter', 5], ['sparkling', 4]],
    bg: { bg0: '#0c050c', bg1: '#240a22', nebula: ['rgba(200,50,160,0.20)', 'rgba(180,60,200,0.16)', 'rgba(150,40,120,0.16)'], accent: '#ff5df0' },
  },
  {
    id: 'glacier', name: 'Glacier Maw', boss: 'cryoleviathan',
    roster: [['frostling', 7], ['octopus', 5], ['brute', 3], ['bomber', 3]],
    bg: { bg0: '#06090f', bg1: '#0e1e2c', nebula: ['rgba(90,170,220,0.20)', 'rgba(130,200,230,0.16)', 'rgba(70,140,200,0.16)'], accent: '#7fdbff' },
  },
  {
    id: 'plasma', name: 'Plasma Storm', boss: 'stormherald',
    roster: [['sparkling', 7], ['ufo', 5], ['orbiter', 5], ['spitter', 4]],
    bg: { bg0: '#0b0b05', bg1: '#22200a', nebula: ['rgba(220,200,40,0.18)', 'rgba(205,165,40,0.16)', 'rgba(185,185,40,0.16)'], accent: '#ffe24d' },
  },
  {
    id: 'dread', name: 'Dread Nemesis', boss: 'nemesis',
    roster: [['dasher', 6], ['weaver', 5], ['mortar', 4], ['bomber', 4], ['bulwark', 3], ['sentinel', 3]],
    bg: { bg0: '#0a0608', bg1: '#1e0a12', nebula: ['rgba(200,40,60,0.22)', 'rgba(210,210,210,0.12)', 'rgba(140,30,50,0.18)'], accent: '#ff5d7a' },
  },
];

// 0-based theme index for a wave. Waves 1–10 → 0, 11–20 → 1, … clamped to the
// last theme so the endless tier keeps reusing the final themes in order.
export function themeIndexForWave(wave) {
  const i = Math.floor((Math.max(1, wave) - 1) / WAVE.themeSize);
  return Math.min(THEMES.length - 1, Math.max(0, i));
}

export function themeForWave(wave) {
  return THEMES[themeIndexForWave(wave)];
}

// 0-based boss index for a boss wave. Pre-100: one boss per theme, in order.
// Past 100 the roster cycles (nemesis → devourer → …), with the exponential
// wave scale (see config.bossWaveScale) making the repeats dramatically tankier.
export function bossIndexForWave(wave) {
  const n = Math.round(wave / WAVE.bossEvery); // 1-based boss number (wave 10 → 1)
  const i = (n - 1) % WAVE.bossCount;
  return ((i % THEMES.length) + THEMES.length) % THEMES.length;
}

export function bossKeyForWave(wave) {
  return THEMES[bossIndexForWave(wave)].boss;
}

// 1-based "Ascension Tier" of a boss wave: how many times the 10-boss roster has
// been cleared. Waves 10–100 → tier 1, 110–200 → tier 2, 210–300 → tier 3, …
// The run's exponential scale (config.bossWaveScale) already makes repeats far
// tankier; the tier is the readable label the boss art uses to look the part.
export function bossTierForWave(wave) {
  const n = Math.max(1, Math.round(wave / WAVE.bossEvery)); // 1-based boss number
  return Math.floor((n - 1) / WAVE.bossCount) + 1;
}

// Weighted pick of an enemy key from a theme roster. Accepts either an RNG
// function or a pre-rolled sample in [0,1) (deterministic replay/testing).
export function pickFromRoster(theme, r = rand) {
  const roster = (theme && theme.roster) || [];
  if (!roster.length) return 'drone';
  let total = 0;
  for (const [, w] of roster) total += w;
  let roll = (typeof r === 'function' ? r() : r) * total;
  for (const [key, w] of roster) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return roster[0][0];
}
