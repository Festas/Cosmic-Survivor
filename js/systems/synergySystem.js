// Synergy System - Build Synergies and Bonus Effects
export class SynergySystem {
    constructor() {
        this.activeSynergies = new Set();
        this.synergyDefinitions = this.defineSynergies();
    }

    defineSynergies() {
        return {
            glassCannon: {
                name: 'Glass Cannon',
                icon: '💥',
                description: '+25% damage, +15% crit damage',
                check: (stats) => {
                    return stats.damage >= 40 && 
                           stats.critChance >= 0.3 && 
                           stats.maxHealth <= 80;
                },
                apply: (stats) => {
                    stats.damage *= 1.25;
                    stats.critDamage *= 1.15;
                    return stats;
                }
            },
            immortal: {
                name: 'Immortal',
                icon: '🛡️',
                description: '+20% healing, 10% damage reduction',
                check: (stats) => {
                    return stats.maxHealth >= 150 && 
                           stats.armor >= 8 && 
                           stats.lifeSteal >= 0.1;
                },
                apply: (stats) => {
                    stats.lifeSteal *= 1.2;
                    stats.damageReduction = (stats.damageReduction || 0) + 0.1;
                    return stats;
                }
            },
            speedDemon: {
                name: 'Speed Demon',
                icon: '⚡',
                description: '+15% dodge, 10% no cooldown attacks',
                check: (stats) => {
                    return stats.speed >= 5 && 
                           stats.fireRate <= 20 && 
                           stats.dodge >= 0.15;
                },
                apply: (stats) => {
                    stats.dodge += 0.15;
                    stats.noCooldownChance = 0.1;
                    return stats;
                }
            },
            collector: {
                name: 'Collector',
                icon: '💰',
                description: '+25% credit value, double pickup chance',
                check: (stats) => {
                    return stats.pickupRange >= 100 && 
                           stats.projectileCount >= 3;
                },
                apply: (stats) => {
                    stats.creditMultiplier = (stats.creditMultiplier || 1) * 1.25;
                    stats.doublePickupChance = 0.15;
                    return stats;
                }
            },
            sniperElite: {
                name: 'Sniper Elite',
                icon: '🎯',
                description: '5% instant kill on non-boss enemies',
                check: (stats) => {
                    return stats.range >= 550 && 
                           stats.critChance >= 0.35 && 
                           stats.critDamage >= 2.5;
                },
                apply: (stats) => {
                    stats.instantKillChance = 0.05;
                    return stats;
                }
            },
            vampireLord: {
                name: 'Vampire Lord',
                icon: '🧛',
                description: 'Kills heal 5% of enemy max HP',
                check: (stats) => {
                    return stats.lifeSteal >= 0.2 && 
                           stats.damage >= 25 && 
                           stats.fireRate <= 25;
                },
                apply: (stats) => {
                    stats.killHealPercent = 0.05;
                    return stats;
                }
            },
            fortress: {
                name: 'Fortress',
                icon: '🏰',
                description: 'Reflect 15% blocked damage',
                check: (stats) => {
                    return stats.armor >= 10 && 
                           stats.maxHealth >= 140 && 
                           stats.speed <= 2.5;
                },
                apply: (stats) => {
                    stats.damageReflect = 0.15;
                    return stats;
                }
            },
            berserkerRage: {
                name: 'Berserker Rage',
                icon: '⚔️',
                description: 'Below 30% HP: +50% damage, +30% speed',
                check: (stats) => {
                    return stats.maxHealth <= 80 && 
                           stats.damage >= 30 && 
                           stats.speed >= 4;
                },
                apply: (stats) => {
                    stats.lowHealthDamageBonus = 0.5;
                    stats.lowHealthSpeedBonus = 0.3;
                    stats.lowHealthThreshold = 0.3;
                    return stats;
                }
            }
        };
    }

    // Check all synergies and return active ones
    checkSynergies(playerStats) {
        const previousSynergies = new Set(this.activeSynergies);
        this.activeSynergies.clear();
        const newlyActivated = [];

        for (const [key, synergy] of Object.entries(this.synergyDefinitions)) {
            if (synergy.check(playerStats)) {
                this.activeSynergies.add(key);
                if (!previousSynergies.has(key)) {
                    newlyActivated.push({
                        key,
                        name: synergy.name,
                        icon: synergy.icon,
                        description: synergy.description
                    });
                }
            }
        }

        return newlyActivated;
    }

    // Apply all active synergies to player stats
    applySynergies(playerStats) {
        let modifiedStats = { ...playerStats };

        for (const key of this.activeSynergies) {
            const synergy = this.synergyDefinitions[key];
            if (synergy) {
                modifiedStats = synergy.apply(modifiedStats);
            }
        }

        return modifiedStats;
    }

    // Get list of active synergies for UI
    getActiveSynergies() {
        return Array.from(this.activeSynergies).map(key => {
            const synergy = this.synergyDefinitions[key];
            return {
                key,
                name: synergy.name,
                icon: synergy.icon,
                description: synergy.description
            };
        });
    }

    // Check if specific synergy is active
    isSynergyActive(key) {
        return this.activeSynergies.has(key);
    }
}
