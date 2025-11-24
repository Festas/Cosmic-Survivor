// Weapon System
import { CONFIG } from '../config.js';

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
};

export class Weapon {
    constructor(type = 'basic') {
        this.type = type;
        this.config = WEAPON_TYPES[type];
    }
    
    createProjectiles(x, y, targetAngle, player) {
        const projectiles = [];
        const config = this.config;
        
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
