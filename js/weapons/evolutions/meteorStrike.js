// Meteor Strike — evolved form of the Rocket Launcher.
//
// Adding a new evolved weapon:
//   1. Create a file like this one that exports:
//        - A WEAPON_TYPES-compatible config object (e.g. METEOR_STRIKE_TYPE)
//        - A class extending `Weapon` with custom `createProjectiles`
//   2. Register the config in WEAPON_TYPES and the class in EVOLVED_WEAPON_CLASSES
//      inside js/weapons/weaponSystem.js.
//   3. Add an EVOLUTION_RECIPES entry in js/config.js pointing at the new key.
import { Weapon } from '../weaponBase.js';

// Stat profile for the evolved weapon. Shape mirrors WEAPON_TYPES entries so
// the rest of the game can treat it identically.
export const METEOR_STRIKE_TYPE = {
    name: '☄️ Meteor Strike',
    description: 'Rains piercing meteors that explode on impact',
    projectileType: 'meteor',
    fireRate: 50,
    damage: 75,
    range: 600,
    projectileCount: 3,
    color: '#ff8c1a',
    explosionRadius: 160,   // Massive area-of-effect (much larger than the base Rocket)
    pierceCount: 999,       // Meteors plow through every enemy in their path
    spreadAngle: 0.25,
    isEvolved: true,
    evolvedFrom: 'rocket',
};

export class MeteorStrikeWeapon extends Weapon {
    constructor() {
        // Pass the config inline so we don't need a circular import on
        // WEAPON_TYPES from weaponSystem.js.
        super('meteorStrike', { meteorStrike: METEOR_STRIKE_TYPE });
        // Evolved weapons start at max level and cannot be levelled further.
        this.level = this.maxLevel;
    }

    /**
     * Override projectile generation so meteors visually and mechanically
     * differ from the base Rocket: a small fan of large, piercing meteors
     * with an oversized explosion radius.
     */
    createProjectiles(x, y, targetAngle, _player) {
        const projectiles = [];
        const config = this.config;
        const count = config.projectileCount;
        const spread = config.spreadAngle;
        const angleStep = count > 1 ? (spread * 2) / (count - 1) : 0;

        for (let i = 0; i < count; i++) {
            const angle = count > 1 ? targetAngle - spread + i * angleStep : targetAngle;
            projectiles.push({
                angle,
                type: config.projectileType,
                config,
                // Visual + mechanical distinction from base rocket
                radius: 18,
                pierce: config.pierceCount,
                explosionRadius: config.explosionRadius,
                color: config.color,
                trailColor: '#ffd166',
            });
        }

        return projectiles;
    }
}
