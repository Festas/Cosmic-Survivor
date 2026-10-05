// audio.js — procedural sound effects and ambient music via the Web Audio API.
// No external assets: everything is synthesized. Must be started by a user
// gesture (browsers block audio otherwise); call unlock() from a click/tap.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.musicOn = true;
    this._musicTimer = null;
    this._nextNote = 0;
    this._step = 0;
    this._lastShoot = 0;
    // Per-sound throttle + a global polyphony budget. Boss fights can request
    // hundreds of SFX/second (every bullet hit, crit and elemental reaction);
    // minting that many WebAudio node graphs is a real source of main-thread
    // jank, so we rate-limit noisy effects and cap concurrent voices.
    this._last = Object.create(null);
    this._voices = [];
  }

  // Minimum seconds between successive plays of the same sound. Keeps rapid-fire
  // combat sounds from stacking into a buzzing wall (and from flooding the audio
  // graph). Important one-shots (level up, boss, death) are intentionally absent.
  static THROTTLE = {
    shoot: 0.045, hit: 0.05, crit: 0.05, reaction: 0.06,
    explode: 0.05, espit: 0.04, edash: 0.06, pickup: 0.02,
  };

  // Sounds that must always play even when the voice budget is saturated.
  static PRIORITY = new Set([
    'levelup', 'implode', 'singularity', 'bosswarn', 'hurt', 'gameover', 'ui', 'evolve',
  ]);

  // Returns false if this request should be dropped (throttled or over-budget).
  _gate(name, now) {
    const minGap = AudioEngine.THROTTLE[name];
    if (minGap) {
      const last = this._last[name] || 0;
      if (now - last < minGap) return false;
      this._last[name] = now;
    }
    // Prune finished voices, then enforce a concurrency cap for non-priority SFX.
    const v = this._voices;
    let w = 0;
    for (let i = 0; i < v.length; i++) if (v[i] > now) v[w++] = v[i];
    v.length = w;
    if (!AudioEngine.PRIORITY.has(name) && v.length >= 20) return false;
    v.push(now + 0.25);
    return true;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(ctx.destination);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.musicOn ? 0.5 : 0;
    this.musicGain.connect(this.master);

    // one-shot noise buffer reused for percussive sounds
    const len = ctx.sampleRate * 1;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;

    this.startMusic();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }

  setMusic(on) {
    this.musicOn = on;
    if (this.musicGain) this.musicGain.gain.value = on ? 0.5 : 0;
  }

  _env(node, gain, dur, t0, attack = 0.005) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    node.connect(g);
    return g;
  }

  _tone(freq, dur, type = 'square', gain = 0.3, t0 = 0, glideTo = null, dest = null) {
    const ctx = this.ctx;
    const t = t0 || ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t + dur);
    const g = this._env(osc, gain, dur, t);
    g.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise(dur, gain = 0.3, filterFreq = 1200, type = 'lowpass', t0 = 0, sweepTo = null) {
    const ctx = this.ctx;
    const t = t0 || ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filterFreq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(60, sweepTo), t + dur);
    src.connect(f);
    const g = this._env(f, gain, dur, t);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(name, opts = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (!this._gate(name, t)) return;
    switch (name) {
      case 'shoot': {
        this._lastShoot = t;
        this._tone(660, 0.09, 'square', 0.12, t, 240);
        break;
      }
      case 'hit': this._noise(0.05, 0.12, 3200, 'bandpass', t); break;
      case 'crit': this._tone(1200, 0.12, 'square', 0.18, t, 500); this._noise(0.06, 0.1, 4000, 'bandpass', t); break;
      case 'explode': this._noise(0.4, 0.5, 900, 'lowpass', t, 120); this._tone(90, 0.4, 'sine', 0.5, t, 40); break;
      case 'pickup': { const p = 520 + (opts.pitch || 0) * 40; this._tone(p, 0.07, 'triangle', 0.1, t, p * 1.5); break; }
      case 'levelup': [0, 1, 2, 3].forEach((i) => this._tone(523.25 * Math.pow(2, i / 12 * 4), 0.18, 'triangle', 0.22, t + i * 0.06, null)); break;
      case 'hurt': this._tone(180, 0.22, 'sawtooth', 0.3, t, 60); this._noise(0.12, 0.2, 800, 'lowpass', t); break;
      case 'dash': this._noise(0.25, 0.3, 500, 'highpass', t, 4000); break;
      case 'singularity': this._tone(60, 0.9, 'sine', 0.5, t, 240); this._noise(0.9, 0.2, 300, 'lowpass', t, 1500); break;
      case 'implode': this._tone(260, 0.7, 'sine', 0.6, t, 30); this._noise(0.6, 0.6, 1800, 'lowpass', t, 80); break;
      case 'reaction': this._tone(900, 0.2, 'square', 0.22, t, 1600); this._noise(0.14, 0.14, 5000, 'bandpass', t); break;
      case 'bossfire': this._tone(140, 0.3, 'sawtooth', 0.3, t, 70); break;
      case 'espit': this._tone(320, 0.12, 'square', 0.1, t, 180); break;
      case 'edash': this._noise(0.2, 0.2, 700, 'bandpass', t, 2500); break;
      case 'bosswarn': this._tone(80, 1.2, 'sawtooth', 0.4, t, 160); break;
      case 'ui': this._tone(440, 0.06, 'square', 0.12, t, 660); break;
      case 'gameover': [0, -2, -4, -7].forEach((s, i) => this._tone(330 * Math.pow(2, s / 12), 0.5, 'sawtooth', 0.22, t + i * 0.18, null)); break;
      default: break;
    }
  }

  // ---- Ambient music: a simple lookahead step sequencer -------------------
  startMusic() {
    if (!this.ctx || this._musicTimer) return;
    this._nextNote = this.ctx.currentTime + 0.1;
    this._step = 0;
    const bpm = 96;
    const stepDur = 60 / bpm / 2; // eighth notes
    // A minor-ish atmospheric progression
    const bass = [55, 55, 82.41, 65.41]; // A1 A1 E2 C2 per bar
    const scale = [220, 261.63, 329.63, 392, 440, 523.25];
    const tick = () => {
      if (!this.ctx) return;
      while (this._nextNote < this.ctx.currentTime + 0.2) {
        const t = this._nextNote;
        const step = this._step;
        const bar = Math.floor(step / 8) % bass.length;
        if (step % 4 === 0) {
          // bass pulse
          this._tone(bass[bar], stepDur * 2.2, 'sine', 0.35, t, bass[bar] * 0.98, this.musicGain);
          this._tone(bass[bar] * 2, stepDur * 1.5, 'triangle', 0.08, t, null, this.musicGain);
        }
        if (step % 8 === 2 || step % 8 === 6) {
          const n = scale[(step * 3) % scale.length];
          this._tone(n, stepDur * 1.6, 'triangle', 0.07, t, null, this.musicGain);
        }
        // soft hat
        if (step % 2 === 1) this._noise(0.03, 0.02, 7000, 'highpass', t);
        this._nextNote += stepDur;
        this._step++;
      }
      this._musicTimer = setTimeout(tick, 25);
    };
    tick();
  }

  stopMusic() {
    if (this._musicTimer) { clearTimeout(this._musicTimer); this._musicTimer = null; }
  }
}
