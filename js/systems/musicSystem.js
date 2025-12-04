// Background Music System - Procedural Music with Web Audio API
export class MusicSystem {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.masterGain = null;
        this.volume = 0.3;
        this.currentBPM = 120;
        this.bassOscillator = null;
        this.drumGain = null;
        this.leadGain = null;
        this.intensity = 0; // 0-1, increases with enemy count
        this.isBossMusic = false;
        this.isShopMusic = false;
        
        // Load volume from settings
        const savedVolume = localStorage.getItem('cosmicSurvivor_musicVolume');
        if (savedVolume !== null) {
            this.volume = parseFloat(savedVolume);
        }
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.volume;
            return true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            return false;
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
        localStorage.setItem('cosmicSurvivor_musicVolume', this.volume.toString());
    }

    getVolume() {
        return this.volume;
    }

    startMusic(type = 'normal') {
        if (!this.audioContext) {
            if (!this.init()) return;
        }

        // Resume audio context if suspended (browser policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isPlaying = true;

        switch (type) {
            case 'boss':
                this.startBossMusic();
                break;
            case 'shop':
                this.startShopMusic();
                break;
            default:
                this.startNormalMusic();
                break;
        }
    }

    stopMusic() {
        this.isPlaying = false;
        this.stopAllOscillators();
    }

    startNormalMusic() {
        this.isBossMusic = false;
        this.isShopMusic = false;
        this.currentBPM = 120;
        
        // Start bass line
        this.startBassLine();
        
        // Start drum loop
        this.startDrumLoop();
        
        // Start arpeggio lead
        this.startArpeggio();
    }

    startBossMusic() {
        this.isBossMusic = true;
        this.isShopMusic = false;
        this.currentBPM = 140;
        
        // More intense bass and drums
        this.startBassLine();
        this.startDrumLoop();
        this.startArpeggio();
    }

    startShopMusic() {
        this.isBossMusic = false;
        this.isShopMusic = true;
        this.currentBPM = 100;
        
        // Calmer ambient tones
        this.startAmbientPad();
    }

    startBassLine() {
        if (!this.audioContext || !this.isPlaying) return;

        const bassGain = this.audioContext.createGain();
        bassGain.connect(this.masterGain);
        bassGain.gain.value = 0.15;

        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 55; // A1
        osc.connect(bassGain);
        osc.start();

        this.bassOscillator = osc;

        // Simple bass pattern
        const beatDuration = 60 / this.currentBPM;
        const pattern = [55, 55, 65.4, 73.4]; // A, A, C, D
        let patternIndex = 0;

        const playBassNote = () => {
            if (!this.isPlaying) return;
            
            osc.frequency.setValueAtTime(pattern[patternIndex], this.audioContext.currentTime);
            patternIndex = (patternIndex + 1) % pattern.length;
            
            setTimeout(playBassNote, beatDuration * 1000);
        };

        playBassNote();
    }

    startDrumLoop() {
        if (!this.audioContext || !this.isPlaying) return;

        const beatDuration = 60 / this.currentBPM;
        
        const playKick = () => {
            if (!this.isPlaying) return;

            const kick = this.audioContext.createOscillator();
            const kickGain = this.audioContext.createGain();
            
            kick.type = 'sine';
            kick.frequency.setValueAtTime(150, this.audioContext.currentTime);
            kick.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.1);
            
            kickGain.gain.setValueAtTime(this.isBossMusic ? 0.3 : 0.2, this.audioContext.currentTime);
            kickGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            kick.connect(kickGain);
            kickGain.connect(this.masterGain);
            kick.start(this.audioContext.currentTime);
            kick.stop(this.audioContext.currentTime + 0.2);
            
            setTimeout(playKick, beatDuration * 1000);
        };

        const playHihat = () => {
            if (!this.isPlaying) return;

            const hihat = this.audioContext.createOscillator();
            const hihatGain = this.audioContext.createGain();
            const hihatFilter = this.audioContext.createBiquadFilter();
            
            hihat.type = 'square';
            hihat.frequency.value = 10000;
            
            hihatFilter.type = 'highpass';
            hihatFilter.frequency.value = 7000;
            
            hihatGain.gain.setValueAtTime(0.05 * (1 + this.intensity * 0.5), this.audioContext.currentTime);
            hihatGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
            
            hihat.connect(hihatFilter);
            hihatFilter.connect(hihatGain);
            hihatGain.connect(this.masterGain);
            hihat.start(this.audioContext.currentTime);
            hihat.stop(this.audioContext.currentTime + 0.05);
            
            setTimeout(playHihat, beatDuration * 0.5 * 1000);
        };

        playKick();
        playHihat();
    }

    startArpeggio() {
        if (!this.audioContext || !this.isPlaying) return;

        const leadGain = this.audioContext.createGain();
        leadGain.connect(this.masterGain);
        leadGain.gain.value = 0;
        this.leadGain = leadGain;

        const beatDuration = 60 / this.currentBPM;
        const noteDuration = beatDuration / 4;
        
        // Arpeggio pattern in A minor
        const pattern = [220, 261.6, 329.6, 440]; // A, C, E, A
        let noteIndex = 0;

        const playArpNote = () => {
            if (!this.isPlaying) return;

            const osc = this.audioContext.createOscillator();
            osc.type = 'square';
            osc.frequency.value = pattern[noteIndex];
            
            const noteGain = this.audioContext.createGain();
            noteGain.gain.setValueAtTime(0.08 * this.intensity, this.audioContext.currentTime);
            noteGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + noteDuration * 0.8);
            
            osc.connect(noteGain);
            noteGain.connect(this.masterGain);
            osc.start(this.audioContext.currentTime);
            osc.stop(this.audioContext.currentTime + noteDuration * 0.8);
            
            noteIndex = (noteIndex + 1) % pattern.length;
            
            setTimeout(playArpNote, noteDuration * 1000);
        };

        playArpNote();
    }

    startAmbientPad() {
        if (!this.audioContext || !this.isPlaying) return;

        const padGain = this.audioContext.createGain();
        padGain.connect(this.masterGain);
        padGain.gain.value = 0.08;

        // Create pad with multiple oscillators for richness
        const frequencies = [220, 261.6, 329.6]; // A minor chord
        
        frequencies.forEach(freq => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(padGain);
            osc.start();
        });
    }

    updateIntensity(enemyCount, maxEnemies = 50) {
        // Update intensity based on enemy count (0-1)
        this.intensity = Math.min(1, enemyCount / maxEnemies);
        
        // Adjust lead volume based on intensity
        if (this.leadGain) {
            this.leadGain.gain.value = 0.1 * this.intensity;
        }
    }

    stopAllOscillators() {
        if (this.bassOscillator) {
            try {
                this.bassOscillator.stop();
            } catch (e) {
                // Already stopped
            }
            this.bassOscillator = null;
        }
    }

    // Resume audio context (needed for browser policies)
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}
