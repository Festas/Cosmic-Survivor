// High Score System
export class HighScoreSystem {
    constructor() {
        this.scores = [];
        this.load();
    }
    
    load() {
        const saved = localStorage.getItem('cosmicSurvivor_highScores');
        if (saved) {
            this.scores = JSON.parse(saved);
        }
    }
    
    save() {
        localStorage.setItem('cosmicSurvivor_highScores', JSON.stringify(this.scores));
    }
    
    addScore(playerName, wave, stats) {
        const score = {
            playerName: playerName || 'Astronaut',
            wave,
            enemiesKilled: stats.enemiesKilled,
            damageDealt: stats.damageDealt,
            bossesDefeated: stats.bossesDefeated || 0,
            timestamp: Date.now(),
            score: this.calculateScore(wave, stats),
        };
        
        this.scores.push(score);
        this.scores.sort((a, b) => b.score - a.score);
        this.scores = this.scores.slice(0, 10); // Keep top 10
        this.save();
        
        return this.scores.findIndex(s => s === score) + 1; // Return rank
    }
    
    calculateScore(wave, stats) {
        return wave * 1000 + 
               stats.enemiesKilled * 10 + 
               (stats.bossesDefeated || 0) * 500 +
               Math.floor(stats.damageDealt / 10);
    }
    
    getTopScores(count = 10) {
        return this.scores.slice(0, count);
    }
    
    isHighScore(wave, stats) {
        const score = this.calculateScore(wave, stats);
        return this.scores.length < 10 || score > this.scores[this.scores.length - 1].score;
    }
}
