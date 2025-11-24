// Achievement System
export class AchievementSystem {
    constructor() {
        this.achievements = [
            {
                id: 'first_blood',
                name: '🎯 First Blood',
                description: 'Defeat your first enemy',
                check: (stats) => stats.enemiesKilled >= 1,
                unlocked: false,
            },
            {
                id: 'wave_5',
                name: '🌊 Wave Warrior',
                description: 'Survive to wave 5',
                check: (stats) => stats.maxWave >= 5,
                unlocked: false,
            },
            {
                id: 'wave_10',
                name: '🏆 Wave Master',
                description: 'Survive to wave 10',
                check: (stats) => stats.maxWave >= 10,
                unlocked: false,
            },
            {
                id: 'wave_20',
                name: '👑 Wave Legend',
                description: 'Survive to wave 20',
                check: (stats) => stats.maxWave >= 20,
                unlocked: false,
            },
            {
                id: 'slayer',
                name: '💀 Slayer',
                description: 'Defeat 100 enemies',
                check: (stats) => stats.totalEnemiesKilled >= 100,
                unlocked: false,
            },
            {
                id: 'exterminator',
                name: '☠️ Exterminator',
                description: 'Defeat 500 enemies',
                check: (stats) => stats.totalEnemiesKilled >= 500,
                unlocked: false,
            },
            {
                id: 'boss_killer',
                name: '👹 Boss Killer',
                description: 'Defeat your first boss',
                check: (stats) => stats.bossesDefeated >= 1,
                unlocked: false,
            },
            {
                id: 'rich',
                name: '💰 Wealthy',
                description: 'Collect 1000 total credits',
                check: (stats) => stats.totalCreditsEarned >= 1000,
                unlocked: false,
            },
            {
                id: 'survivor',
                name: '❤️ Survivor',
                description: 'Complete a wave with less than 20% health',
                check: (stats) => stats.lowHealthSurvival >= 1,
                unlocked: false,
            },
            {
                id: 'untouchable',
                name: '✨ Untouchable',
                description: 'Complete a wave without taking damage',
                check: (stats) => stats.perfectWaves >= 1,
                unlocked: false,
            },
            {
                id: 'weapon_master',
                name: '🔫 Weapon Master',
                description: 'Use all weapon types',
                check: (stats) => stats.weaponsUsed >= 4,
                unlocked: false,
            },
            {
                id: 'big_spender',
                name: '🛒 Big Spender',
                description: 'Purchase 50 upgrades',
                check: (stats) => stats.upgradesPurchased >= 50,
                unlocked: false,
            },
        ];
        
        this.load();
    }
    
    load() {
        const saved = localStorage.getItem('cosmicSurvivor_achievements');
        if (saved) {
            const unlocked = JSON.parse(saved);
            this.achievements.forEach(achievement => {
                if (unlocked.includes(achievement.id)) {
                    achievement.unlocked = true;
                }
            });
        }
    }
    
    save() {
        const unlocked = this.achievements
            .filter(a => a.unlocked)
            .map(a => a.id);
        localStorage.setItem('cosmicSurvivor_achievements', JSON.stringify(unlocked));
    }
    
    check(stats) {
        const newlyUnlocked = [];
        
        this.achievements.forEach(achievement => {
            if (!achievement.unlocked && achievement.check(stats)) {
                achievement.unlocked = true;
                newlyUnlocked.push(achievement);
            }
        });
        
        if (newlyUnlocked.length > 0) {
            this.save();
        }
        
        return newlyUnlocked;
    }
    
    getUnlocked() {
        return this.achievements.filter(a => a.unlocked);
    }
    
    getAll() {
        return this.achievements;
    }
    
    getProgress() {
        const unlocked = this.getUnlocked().length;
        const total = this.achievements.length;
        return { unlocked, total, percentage: Math.floor((unlocked / total) * 100) };
    }
}
