// Weapon System
import { CONFIG } from '../config.js';
import { Weapon } from './weaponBase.js';
import { METEOR_STRIKE_TYPE, MeteorStrikeWeapon } from './evolutions/meteorStrike.js';

// Re-export the base class so existing imports (`import { Weapon } from
// './weapons/weaponSystem.js'`) keep working.
export { Weapon };

export const WEAPON_TYPES = {
    basic: {
        name: '🔫 Basic Blaster',
        description: 'Standard energy weapon',
        projectileType: 'basic',
        fireRate: 30,
        damage: 10,
        range: 400,
        projectileCount: 1,
        color: '#00ff88',
    },
    laser: {
        name: '⚡ Laser Gun',
        description: 'Continuous beam weapon',
        projectileType: 'laser',
        fireRate: 5,
        damage: 3,
        range: 500,
        projectileCount: 1,
        color: '#ff00ff',
    },
    rocket: {
        name: '🚀 Rocket Launcher',
        description: 'Explosive area damage',
        projectileType: 'rocket',
        fireRate: 60,
        damage: 30,
        range: 400,
        projectileCount: 1,
        color: '#ff6b6b',
        explosionRadius: 80,
    },
    spread: {
        name: '🌟 Spread Shot',
        description: 'Fires multiple projectiles in a spread',
        projectileType: 'basic',
        fireRate: 40,
        damage: 7,
        range: 350,
        projectileCount: 5,
        color: '#ffd93d',
        spreadAngle: 0.3,
    },
    flamethrower: {
        name: '🔥 Flamethrower',
        description: 'Continuous cone of fire damage',
        projectileType: 'flame',
        fireRate: 3,
        damage: 2,
        range: 250,
        projectileCount: 1,
        color: '#ff4500',
        coneAngle: 0.5,
    },
    lightning: {
        name: '⚡ Lightning Gun',
        description: 'Chains between nearby enemies',
        projectileType: 'lightning',
        fireRate: 35,
        damage: 12,
        range: 450,
        projectileCount: 1,
        color: '#00d4ff',
        chainCount: 3,
        chainRange: 150,
    },
    freeze: {
        name: '❄️ Freeze Ray',
        description: 'Slows enemies and deals damage',
        projectileType: 'freeze',
        fireRate: 20,
        damage: 8,
        range: 400,
        projectileCount: 1,
        color: '#87ceeb',
        slowDuration: 90,
        slowAmount: 0.6,
    },
    plasma: {
        name: '💥 Plasma Cannon',
        description: 'Piercing shots that go through enemies',
        projectileType: 'plasma',
        fireRate: 45,
        damage: 16,
        range: 500,
        projectileCount: 1,
        color: '#9d00ff',
        pierceCount: 5,
    },

    // ---- Evolved weapons (registered from js/weapons/evolutions/*) ----
    meteorStrike: METEOR_STRIKE_TYPE,
};

// Map of evolved weapon id -> custom Weapon subclass. The factory below
// uses this so callers can stay agnostic of which class implements a weapon.
// Add a new entry here whenever a new evolved weapon class is created.
export const EVOLVED_WEAPON_CLASSES = {
    meteorStrike: MeteorStrikeWeapon,
};

/**
 * Factory that returns the right Weapon subclass for a given type id.
 * Evolved weapons may have bespoke `createProjectiles` logic; standard
 * weapons fall back to the base `Weapon` class.
 */
export function createWeapon(type) {
    const EvolvedClass = EVOLVED_WEAPON_CLASSES[type];
    if (EvolvedClass) {
        return new EvolvedClass();
    }
    return new Weapon(type, WEAPON_TYPES);
}
