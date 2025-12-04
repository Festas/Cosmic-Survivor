// Meta-Progression System - Cosmic Crystals and Permanent Upgrades
export class MetaProgressionSystem {
    constructor() {
        this.crystals = this.loadCrystals();
        this.starshipUpgrades = this.loadStarshipUpgrades();
        this.unlockedCharacters = this.loadUnlockedCharacters();
        this.lifetimeStats = this.loadLifetimeStats();
    }

    loadCrystals() {
        const stored = localStorage.getItem('cosmicSurvivor_crystals');
        return stored ? parseInt(stored) : 0;
    }

    saveCrystals() {
        localStorage.setItem('cosmicSurvivor_crystals', this.crystals.toString());
    }

    loadStarshipUpgrades() {
        const stored = localStorage.getItem('cosmicSurvivor_starshipUpgrades');
        return stored ? JSON.parse(stored) : {
            hullReinforcement: 0,      // +5 max health per level (max 10)
            engineBoost: 0,             // +0.1 speed per level (max 5)
            weaponCalibration: 0,       // +2 damage per level (max 10)
            shieldGenerator: 0,         // +1 armor per level (max 5)
            luckyCharm: 0,              // +1% crit chance per level (max 10)
            creditMagnet: 0,            // +10 pickup range per level (max 5)
            rapidFireModule: 0,         // -1 fire rate per level (max 5)
            lifeSupport: 0,             // +0.5% life steal per level (max 10)
        };
    }

    saveStarshipUpgrades() {
        localStorage.setItem('cosmicSurvivor_starshipUpgrades', JSON.stringify(this.starshipUpgrades));
    }

    loadUnlockedCharacters() {
        const stored = localStorage.getItem('cosmicSurvivor_unlockedCharacters');
        // Start with 4 characters unlocked
        return stored ? JSON.parse(stored) : ['balanced', 'tank', 'speedster', 'sniper'];
    }

    saveUnlockedCharacters() {
        localStorage.setItem('cosmicSurvivor_unlockedCharacters', JSON.stringify(this.unlockedCharacters));
    }

    loadLifetimeStats() {
        const stored = localStorage.getItem('cosmicSurvivor_lifetimeStats');
        return stored ? JSON.parse(stored) : {
            totalEnemiesKilled: 0,
            totalBossesDefeated: 0,
            totalWavesSurvived: 0,
            totalCreditsEarned: 0,
            totalUpgradesPurchased: 0,
            totalCriticalHits: 0,
            totalDamageTaken: 0,
            totalHealingDone: 0,
            highestWaveReached: 0,
            bossesDefeatedInSingleRun: 0,
        };
    }

    saveLifetimeStats() {
        localStorage.setItem('cosmicSurvivor_lifetimeStats', JSON.stringify(this.lifetimeStats));
    }

    // Calculate crystals earned from a run
    calculateCrystalsEarned(wavesSurvived, enemiesKilled, bossesDefeated) {
        let crystals = 0;
        crystals += wavesSurvived * 5; // 5 crystals per wave
        crystals += Math.floor(enemiesKilled / 10); // 1 crystal per 10 enemies
        crystals += bossesDefeated * 50; // 50 crystals per boss
        return crystals;
    }

    // Award crystals at end of run
    awardCrystals(amount) {
        this.crystals += amount;
        this.saveCrystals();
    }

    // Get upgrade cost (escalating)
    getUpgradeCost(upgradeName) {
        const level = this.starshipUpgrades[upgradeName] || 0;
        const baseCosts = {
            hullReinforcement: 50,
            engineBoost: 75,
            weaponCalibration: 50,
            shieldGenerator: 100,
            luckyCharm: 60,
            creditMagnet: 80,
            rapidFireModule: 90,
            lifeSupport: 70,
        };
        const baseCost = baseCosts[upgradeName] || 50;
        // Cost escalates: level 0->1 = base, level 1->2 = base*2.5, level 2->3 = base*4, etc.
        return Math.floor(baseCost * (1 + level * 1.5));
    }

    // Get max level for upgrade
    getMaxLevel(upgradeName) {
        const maxLevels = {
            hullReinforcement: 10,
            engineBoost: 5,
            weaponCalibration: 10,
            shieldGenerator: 5,
            luckyCharm: 10,
            creditMagnet: 5,
            rapidFireModule: 5,
            lifeSupport: 10,
        };
        return maxLevels[upgradeName] || 1;
    }

    // Purchase upgrade
    purchaseUpgrade(upgradeName) {
        const cost = this.getUpgradeCost(upgradeName);
        const currentLevel = this.starshipUpgrades[upgradeName] || 0;
        const maxLevel = this.getMaxLevel(upgradeName);

        if (this.crystals >= cost && currentLevel < maxLevel) {
            this.crystals -= cost;
            this.starshipUpgrades[upgradeName] = currentLevel + 1;
            this.saveCrystals();
            this.saveStarshipUpgrades();
            return true;
        }
        return false;
    }

    // Apply starship upgrades to player stats
    applyStarshipUpgrades(playerStats) {
        const upgrades = this.starshipUpgrades;
        
        playerStats.maxHealth += upgrades.hullReinforcement * 5;
        playerStats.health += upgrades.hullReinforcement * 5;
        playerStats.speed += upgrades.engineBoost * 0.1;
        playerStats.damage += upgrades.weaponCalibration * 2;
        playerStats.armor += upgrades.shieldGenerator * 1;
        playerStats.critChance += upgrades.luckyCharm * 0.01;
        playerStats.pickupRange += upgrades.creditMagnet * 10;
        playerStats.fireRate -= upgrades.rapidFireModule * 1;
        playerStats.lifeSteal += upgrades.lifeSupport * 0.005;

        return playerStats;
    }

    // Check character unlock conditions
    checkCharacterUnlocks(stats) {
        const unlocks = [];

        // Gunslinger: Reach wave 10 OR purchase for 500 crystals
        if (!this.unlockedCharacters.includes('gunslinger')) {
            if (this.lifetimeStats.highestWaveReached >= 10) {
                this.unlockedCharacters.push('gunslinger');
                unlocks.push('gunslinger');
            }
        }

        // Vampire: Kill 1000 total enemies OR purchase for 750 crystals
        if (!this.unlockedCharacters.includes('vampire')) {
            if (this.lifetimeStats.totalEnemiesKilled >= 1000) {
                this.unlockedCharacters.push('vampire');
                unlocks.push('vampire');
            }
        }

        // Berserker: Defeat 5 bosses in a single run OR purchase for 1000 crystals
        if (!this.unlockedCharacters.includes('berserker')) {
            if (stats && stats.bossesDefeated >= 5) {
                this.unlockedCharacters.push('berserker');
                unlocks.push('berserker');
            }
        }

        // Engineer: Purchase 100 total upgrades OR purchase for 750 crystals
        if (!this.unlockedCharacters.includes('engineer')) {
            if (this.lifetimeStats.totalUpgradesPurchased >= 100) {
                this.unlockedCharacters.push('engineer');
                unlocks.push('engineer');
            }
        }

        // Medic: Heal 5000 total HP (via life steal) OR purchase for 500 crystals
        if (!this.unlockedCharacters.includes('medic')) {
            if (this.lifetimeStats.totalHealingDone >= 5000) {
                this.unlockedCharacters.push('medic');
                unlocks.push('medic');
            }
        }

        // Assassin: Get 500 critical hits in a single run OR purchase for 1000 crystals
        if (!this.unlockedCharacters.includes('assassin')) {
            if (stats && stats.criticalHits >= 500) {
                this.unlockedCharacters.push('assassin');
                unlocks.push('assassin');
            }
        }

        // Summoner: Reach wave 20 OR purchase for 1500 crystals
        if (!this.unlockedCharacters.includes('summoner')) {
            if (this.lifetimeStats.highestWaveReached >= 20) {
                this.unlockedCharacters.push('summoner');
                unlocks.push('summoner');
            }
        }

        // Juggernaut: Take 10000 total damage across all runs OR purchase for 1500 crystals
        if (!this.unlockedCharacters.includes('juggernaut')) {
            if (this.lifetimeStats.totalDamageTaken >= 10000) {
                this.unlockedCharacters.push('juggernaut');
                unlocks.push('juggernaut');
            }
        }

        if (unlocks.length > 0) {
            this.saveUnlockedCharacters();
        }

        return unlocks;
    }

    // Purchase character unlock with crystals
    purchaseCharacterUnlock(characterId) {
        const costs = {
            gunslinger: 500,
            vampire: 750,
            berserker: 1000,
            engineer: 750,
            medic: 500,
            assassin: 1000,
            summoner: 1500,
            juggernaut: 1500,
        };

        const cost = costs[characterId];
        if (!cost || this.unlockedCharacters.includes(characterId)) {
            return false;
        }

        if (this.crystals >= cost) {
            this.crystals -= cost;
            this.unlockedCharacters.push(characterId);
            this.saveCrystals();
            this.saveUnlockedCharacters();
            return true;
        }

        return false;
    }

    // Update lifetime stats at end of run
    updateLifetimeStats(runStats) {
        this.lifetimeStats.totalEnemiesKilled += runStats.enemiesKilled || 0;
        this.lifetimeStats.totalBossesDefeated += runStats.bossesDefeated || 0;
        this.lifetimeStats.totalWavesSurvived += runStats.wavesSurvived || 0;
        this.lifetimeStats.totalCreditsEarned += runStats.creditsEarned || 0;
        this.lifetimeStats.totalUpgradesPurchased += runStats.upgradesPurchased || 0;
        this.lifetimeStats.totalCriticalHits += runStats.criticalHits || 0;
        this.lifetimeStats.totalDamageTaken += runStats.damageTaken || 0;
        this.lifetimeStats.totalHealingDone += runStats.healingDone || 0;
        
        if (runStats.wavesSurvived > this.lifetimeStats.highestWaveReached) {
            this.lifetimeStats.highestWaveReached = runStats.wavesSurvived;
        }
        
        if (runStats.bossesDefeated > this.lifetimeStats.bossesDefeatedInSingleRun) {
            this.lifetimeStats.bossesDefeatedInSingleRun = runStats.bossesDefeated;
        }

        this.saveLifetimeStats();
    }

    isCharacterUnlocked(characterId) {
        return this.unlockedCharacters.includes(characterId);
    }
}
