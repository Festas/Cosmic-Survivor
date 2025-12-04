// Settings System - Player preferences and accessibility
export class SettingsSystem {
    constructor() {
        this.settings = this.loadSettings();
    }

    getDefaultSettings() {
        return {
            soundVolume: 0.5,
            musicVolume: 0.3,
            screenShake: true,
            reducedMotion: false,
            colorblindMode: 'none', // 'none', 'protanopia', 'deuteranopia', 'tritanopia'
            showDamageNumbers: true,
            showFPS: false,
            uiScale: 1.0,
            controls: {
                up: ['w', 'ArrowUp'],
                down: ['s', 'ArrowDown'],
                left: ['a', 'ArrowLeft'],
                right: ['d', 'ArrowRight'],
                pause: ['Escape'],
                restart: ['r'],
            }
        };
    }

    loadSettings() {
        const stored = localStorage.getItem('cosmicSurvivor_settings');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure all settings exist
                return { ...this.getDefaultSettings(), ...parsed };
            } catch (e) {
                console.warn('Failed to parse settings, using defaults');
                return this.getDefaultSettings();
            }
        }
        return this.getDefaultSettings();
    }

    saveSettings() {
        localStorage.setItem('cosmicSurvivor_settings', JSON.stringify(this.settings));
    }

    // Getters
    getSoundVolume() {
        return this.settings.soundVolume;
    }

    getMusicVolume() {
        return this.settings.musicVolume;
    }

    isScreenShakeEnabled() {
        return this.settings.screenShake;
    }

    isReducedMotionEnabled() {
        return this.settings.reducedMotion;
    }

    getColorblindMode() {
        return this.settings.colorblindMode;
    }

    shouldShowDamageNumbers() {
        return this.settings.showDamageNumbers;
    }

    shouldShowFPS() {
        return this.settings.showFPS;
    }

    getUIScale() {
        return this.settings.uiScale;
    }

    getControls() {
        return this.settings.controls;
    }

    // Setters
    setSoundVolume(volume) {
        this.settings.soundVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    setMusicVolume(volume) {
        this.settings.musicVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    setScreenShake(enabled) {
        this.settings.screenShake = enabled;
        this.saveSettings();
    }

    setReducedMotion(enabled) {
        this.settings.reducedMotion = enabled;
        this.saveSettings();
    }

    setColorblindMode(mode) {
        const validModes = ['none', 'protanopia', 'deuteranopia', 'tritanopia'];
        if (validModes.includes(mode)) {
            this.settings.colorblindMode = mode;
            this.saveSettings();
        }
    }

    setShowDamageNumbers(show) {
        this.settings.showDamageNumbers = show;
        this.saveSettings();
    }

    setShowFPS(show) {
        this.settings.showFPS = show;
        this.saveSettings();
    }

    setUIScale(scale) {
        this.settings.uiScale = Math.max(0.5, Math.min(2, scale));
        this.saveSettings();
    }

    setControl(action, keys) {
        if (this.settings.controls[action]) {
            this.settings.controls[action] = Array.isArray(keys) ? keys : [keys];
            this.saveSettings();
        }
    }

    // Check if a key matches an action
    isKeyForAction(key, action) {
        const keys = this.settings.controls[action];
        return keys && keys.includes(key);
    }

    // Get color palette based on colorblind mode
    getColorPalette() {
        const mode = this.settings.colorblindMode;
        
        const palettes = {
            none: {
                player: '#00ff88',
                enemy: '#a855f7',
                boss: '#dc2626',
                pickup: '#ffd93d',
                bullet: '#00ffff',
            },
            protanopia: { // Red-blind
                player: '#0088ff',
                enemy: '#ffaa00',
                boss: '#cc6600',
                pickup: '#ffff00',
                bullet: '#00ffff',
            },
            deuteranopia: { // Green-blind
                player: '#0088ff',
                enemy: '#ff6600',
                boss: '#cc3300',
                pickup: '#ffcc00',
                bullet: '#00ccff',
            },
            tritanopia: { // Blue-blind
                player: '#00ff99',
                enemy: '#ff3366',
                boss: '#cc0033',
                pickup: '#ffcc00',
                bullet: '#00ff99',
            }
        };

        return palettes[mode] || palettes.none;
    }

    // Apply UI scale to elements
    applyUIScale(element) {
        if (element) {
            element.style.transform = `scale(${this.settings.uiScale})`;
            element.style.transformOrigin = 'top left';
        }
    }
}
