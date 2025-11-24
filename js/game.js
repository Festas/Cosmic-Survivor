// Game State Management
import { CONFIG, CHARACTERS } from './config.js';
import { AchievementSystem } from './systems/achievements.js';
import { HighScoreSystem } from './systems/highscore.js';
import { SoundSystem } from './systems/sound.js';
import { TouchControls } from './systems/touchControls.js';
import { Weapon, WEAPON_TYPES } from './weapons/weaponSystem.js';
import { ENEMY_TYPES, getEnemyTypeForWave } from './entities/enemyTypes.js';
import { BOSS_TYPES, getBossForWave, isBossWave } from './entities/bossTypes.js';

export class Game {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.state = 'start';
        this.wave = 1;
        this.timeLeft = CONFIG.WAVE_DURATION;
        this.credits = 0;
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.pickups = [];
        this.particles = [];
        this.keys = {};
        this.selectedCharacter = null;
        
        // Systems
        this.achievements = new AchievementSystem();
        this.highScores = new HighScoreSystem();
        this.sound = new SoundSystem();
        this.touchControls = null;
        
        // Stats tracking
        this.stats = {
            enemiesKilled: 0,
            damageDealt: 0,
            damageTaken: 0,
            maxWave: 1,
            totalEnemiesKilled: this.loadPersistentStat('totalEnemiesKilled'),
            totalCreditsEarned: this.loadPersistentStat('totalCreditsEarned'),
            bossesDefeated: 0,
            lowHealthSurvival: 0,
            perfectWaves: 0,
            weaponsUsed: this.loadPersistentStat('weaponsUsed') || 1,
            upgradesPurchased: this.loadPersistentStat('upgradesPurchased'),
            waveStartDamageTaken: 0,
        };
    }
    
    loadPersistentStat(key) {
        const value = localStorage.getItem(`cosmicSurvivor_${key}`);
        return value ? parseInt(value) : 0;
    }
    
    savePersistentStat(key, value) {
        localStorage.setItem(`cosmicSurvivor_${key}`, value.toString());
    }
    
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.touchControls = new TouchControls(canvas);
    }
    
    selectCharacter(characterId) {
        const character = CHARACTERS.find(c => c.id === characterId);
        if (character) {
            this.selectedCharacter = character;
        }
    }
    
    startGame() {
        if (!this.selectedCharacter) {
            this.selectedCharacter = CHARACTERS[0]; // Default to balanced
        }
        
        this.wave = 1;
        this.timeLeft = CONFIG.WAVE_DURATION;
        this.credits = 0;
        this.enemies = [];
        this.bullets = [];
        this.pickups = [];
        this.particles = [];
        
        // Reset session stats
        this.stats.enemiesKilled = 0;
        this.stats.damageDealt = 0;
        this.stats.damageTaken = 0;
        this.stats.maxWave = 1;
        this.stats.bossesDefeated = 0;
        this.stats.lowHealthSurvival = 0;
        this.stats.perfectWaves = 0;
        this.stats.waveStartDamageTaken = 0;
        
        this.player = this.createPlayer();
        this.state = 'playing';
    }
    
    createPlayer() {
        const stats = { ...this.selectedCharacter.stats };
        return {
            x: CONFIG.CANVAS_WIDTH / 2,
            y: CONFIG.CANVAS_HEIGHT / 2,
            size: CONFIG.PLAYER_SIZE,
            ...stats,
            fireCooldown: 0,
            weapon: new Weapon(this.selectedCharacter.startWeapon),
        };
    }
}

export const game = new Game();
