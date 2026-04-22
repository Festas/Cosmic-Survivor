// Game State Management
import { CONFIG, CHARACTERS } from './config.js';
import { AchievementSystem } from './systems/achievements.js';
import { HighScoreSystem } from './systems/highscore.js';
import { SoundSystem } from './systems/sound.js';
import { TouchControls } from './systems/touchControls.js';
import { Weapon, WEAPON_TYPES, createWeapon } from './weapons/weaponSystem.js';
import { WeaponEvolutionSystem } from './systems/weaponEvolutionSystem.js';
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
        this.weaponEvolution = new WeaponEvolutionSystem();
        
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
        const startWeapon = createWeapon(this.selectedCharacter.startWeapon);
        return {
            x: CONFIG.CANVAS_WIDTH / 2,
            y: CONFIG.CANVAS_HEIGHT / 2,
            size: CONFIG.PLAYER_SIZE,
            ...stats,
            fireCooldown: 0,
            // Active weapons array (mutated when a weapon evolves).
            // `weapon` is kept for backward compatibility with code that
            // only expects a single primary weapon.
            weapons: [startWeapon],
            weapon: startWeapon,
            // Passive items the player owns (ids from PASSIVE_ITEMS).
            // The evolution system reads this list to decide which
            // recipes are eligible.
            passives: [],
        };
    }

    /**
     * Build the level-up choice list. If the player meets the criteria
     * for a Weapon Evolution, that choice is offered in place of one of
     * the standard upgrades.
     *
     * @param {Array} standardChoices - upgrade choices the UI would
     *   normally show (stat passives, new weapons, etc.)
     * @returns {Array} the (possibly augmented) choice list.
     */
    buildLevelUpChoices(standardChoices = []) {
        if (!this.player) return standardChoices;
        const evolutionChoice = this.weaponEvolution.buildLevelUpChoice(this.player);
        if (!evolutionChoice) return standardChoices;

        // Replace the first standard choice with the evolution to keep
        // the total number of options stable. Evolutions are rare and
        // game-defining, so they take priority over a regular upgrade.
        const choices = standardChoices.slice();
        if (choices.length === 0) {
            choices.push(evolutionChoice);
        } else {
            choices[0] = evolutionChoice;
        }
        return choices;
    }
}

export const game = new Game();
