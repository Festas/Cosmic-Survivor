// Base Weapon class.
//
// Lives in its own module so evolved weapon classes (under
// js/weapons/evolutions/) can `extends Weapon` without triggering a
// circular import with weaponSystem.js, which itself imports the
// evolved weapons to register them in WEAPON_TYPES.
import { CONFIG } from '../config.js';

export class Weapon {
    constructor(type, configLookup) {
        this.type = type;
        // `configLookup` is the WEAPON_TYPES map; it is passed in to keep
        // this module free of any cyclic dependency on weaponSystem.js.
        // Subclasses can also resolve their own config eagerly.
        this.config = configLookup ? configLookup[type] : undefined;
        this.maxLevel = CONFIG.WEAPON_MAX_LEVEL;
        this.level = 1;
    }

    /** True when this weapon has reached max level and may be eligible for evolution. */
    isMaxLevel() {
        return this.level >= this.maxLevel;
    }

    /**
     * Bump the weapon's level (e.g. when the player picks an upgrade for it).
     * Capped at maxLevel. Returns the new level.
     */
    levelUp() {
        if (this.level < this.maxLevel) {
            this.level += 1;
        }
        return this.level;
    }

    createProjectiles(x, y, targetAngle, _player) {
        const projectiles = [];
        const config = this.config;
        if (!config) return projectiles;

        if (this.type === 'spread') {
            // Create spread pattern
            const spreadAngle = config.spreadAngle;
            const angleStep = (spreadAngle * 2) / (config.projectileCount - 1);

            for (let i = 0; i < config.projectileCount; i++) {
                const angle = targetAngle - spreadAngle + (i * angleStep);
                projectiles.push({
                    angle,
                    type: config.projectileType,
                    config,
                });
            }
        } else {
            // Single projectile (or will target multiple enemies)
            projectiles.push({
                angle: targetAngle,
                type: config.projectileType,
                config,
            });
        }

        return projectiles;
    }
}
