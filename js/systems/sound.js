// Sound System
export class SoundSystem {
    constructor() {
        this.enabled = true;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.audioContext = null;
        
        // Load settings
        const savedEnabled = localStorage.getItem('cosmicSurvivor_soundEnabled');
        if (savedEnabled !== null) {
            this.enabled = savedEnabled === 'true';
        }
    }
    
    getContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }
    
    playShoot() {
        if (!this.enabled) return;
        this.playTone(800, 'square', 0.1, this.sfxVolume * 0.1);
    }
    
    playHit() {
        if (!this.enabled) return;
        this.playTone(200, 'sawtooth', 0.15, this.sfxVolume * 0.15);
    }
    
    playEnemyDeath() {
        if (!this.enabled) return;
        this.playToneRamp(400, 100, 'triangle', 0.3, this.sfxVolume * 0.2);
    }
    
    playPickup() {
        if (!this.enabled) return;
        this.playToneRamp(500, 1000, 'sine', 0.1, this.sfxVolume * 0.1);
    }
    
    playPowerUp() {
        if (!this.enabled) return;
        this.playToneRamp(300, 800, 'sine', 0.2, this.sfxVolume * 0.15);
    }
    
    playWaveComplete() {
        if (!this.enabled) return;
        const notes = [400, 500, 600, 800];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'sine', 0.15, this.sfxVolume * 0.2), i * 100);
        });
    }
    
    playBossSpawn() {
        if (!this.enabled) return;
        this.playToneRamp(100, 50, 'sawtooth', 0.5, this.sfxVolume * 0.3);
    }
    
    playGameOver() {
        if (!this.enabled) return;
        this.playToneRamp(300, 50, 'sawtooth', 1, this.sfxVolume * 0.3);
    }
    
    playTone(frequency, type, duration, volume) {
        const ctx = this.getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.value = frequency;
        osc.type = type;
        
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }
    
    playToneRamp(startFreq, endFreq, type, duration, volume) {
        const ctx = this.getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
        osc.type = type;
        
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }
    
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('cosmicSurvivor_soundEnabled', this.enabled);
        return this.enabled;
    }
}
