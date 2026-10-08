// audio.js — procedural sound effects and adaptive music via the Web Audio API.
// No external assets: everything is synthesized. Must be started by a user
// gesture (browsers block audio otherwise); call unlock() from a click/tap.
//
// Signal chain:
//   voices ─┬─► sfxGain ──┐
//           │             ├─► master ─► limiter ─► destination
//   music ──┴─► musicGain ┘        ▲
//           └─► reverbSend ─► convolver ─► reverbReturn ┘
//
// A shared plate-style convolution reverb gives the whole mix a sense of space,
// while a final limiter (DynamicsCompressor) glues busy boss-fight moments and
// stops layered one-shots from clipping.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.limiter = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.reverb = null;
    this.reverbSend = null;
    this.reverbReturn = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.musicOn = true;
    this._musicTimer = null;
    this._nextNote = 0;
    this._step = 0;
    this._intensity = 0;       // live music intensity (ramped toward _intensityTarget)
    this._intensityTarget = 0; // 0 = calm exploration, 1 = boss / high threat
    // Music layer gains, created in unlock(). Kept here so setIntensity() can
    // cross-fade layers without rebuilding the scheduler.
    this._layer = null;
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
    explode: 0.05, espit: 0.04, edash: 0.06, pickup: 0.02, bossfire: 0.05,
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

    // Final limiter: soft-knee compressor acting as a glue/brickwall so stacked
    // one-shots never clip the output.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 24;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    limiter.connect(ctx.destination);
    this.limiter = limiter;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(limiter);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.musicOn ? 0.5 : 0;
    this.musicGain.connect(this.master);

    // Shared reverb bus. Voices connect to reverbSend for a wet send; the
    // convolved signal returns through reverbReturn into the master bus.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._makeImpulse(2.2, 2.6);
    this.reverbReturn = ctx.createGain();
    this.reverbReturn.gain.value = 0.9;
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.5;
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(this.reverbReturn);
    this.reverbReturn.connect(this.master);

    // one-shot white-noise buffer reused for percussive sounds
    const len = ctx.sampleRate * 1;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;

    this.startMusic();
  }

  // Build a stereo exponentially-decaying noise impulse response for the reverb.
  _makeImpulse(seconds = 2, decay = 2.5) {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * seconds));
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }

  setMusic(on) {
    this.musicOn = on;
    if (this.musicGain) {
      const t = this.ctx ? this.ctx.currentTime : 0;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setTargetAtTime(on ? 0.5 : 0, t, 0.3);
    }
  }

  // Adaptive music hook: 0 = calm exploration, 1 = boss / high threat. Smoothly
  // cross-fades the arpeggio + percussion layers and lifts the tempo feel. Safe
  // to call every frame — it no-ops when the target is unchanged.
  setIntensity(x) {
    const target = Math.max(0, Math.min(1, x));
    if (target === this._intensityTarget) return;
    this._intensityTarget = target;
    if (!this.ctx || !this._layer) return;
    const t = this.ctx.currentTime;
    this._layer.arp.gain.setTargetAtTime(0.05 + target * 0.14, t, 0.5);
    this._layer.drums.gain.setTargetAtTime(0.25 + target * 0.6, t, 0.5);
    this._layer.pad.gain.setTargetAtTime(0.16 + target * 0.12, t, 0.8);
  }

  // ---- low-level voice helpers --------------------------------------------

  // ADSR-ish gain envelope: exponential attack to peak then exponential decay.
  _env(dur, peak, t0, attack = 0.006) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    return g;
  }

  // Oscillator voice with optional detune layer, pitch glide and reverb send.
  _blip(opts) {
    const ctx = this.ctx;
    const {
      freq, dur = 0.2, type = 'sine', peak = 0.25, t0 = ctx.currentTime,
      glideTo = null, attack = 0.006, detune = 0, dest = this.sfxGain, reverb = 0,
    } = opts;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
    if (detune) osc.detune.setValueAtTime(detune, t0);
    const g = this._env(dur, peak, t0, attack);
    osc.connect(g);
    g.connect(dest);
    if (reverb) {
      const send = ctx.createGain();
      send.gain.value = reverb;
      g.connect(send);
      send.connect(this.reverbSend);
    }
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
    return osc;
  }

  // Filtered-noise voice with optional filter sweep and reverb send.
  _noise(opts) {
    const ctx = this.ctx;
    const {
      dur = 0.2, peak = 0.25, freq = 1200, type = 'lowpass', t0 = ctx.currentTime,
      sweepTo = null, q = 0.7, dest = this.sfxGain, reverb = 0,
    } = opts;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t0 + dur);
    const g = this._env(dur, peak, t0, 0.004);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    if (reverb) {
      const send = ctx.createGain();
      send.gain.value = reverb;
      g.connect(send);
      send.connect(this.reverbSend);
    }
    src.start(t0);
    src.stop(t0 + dur + 0.03);
    return src;
  }

  // ---- percussion synths (used by the music engine) ------------------------
  _kick(t0, peak = 0.6, dest = this.musicGain) {
    this._blip({ freq: 150, glideTo: 45, dur: 0.22, type: 'sine', peak, t0, attack: 0.004, dest });
    this._noise({ freq: 1600, sweepTo: 200, dur: 0.05, peak: peak * 0.4, type: 'lowpass', t0, dest });
  }

  _snare(t0, peak = 0.4, dest = this.musicGain) {
    this._noise({ freq: 1800, dur: 0.18, peak, type: 'highpass', t0, sweepTo: 900, q: 0.6, dest, reverb: 0.25 });
    this._blip({ freq: 210, glideTo: 150, dur: 0.12, type: 'triangle', peak: peak * 0.5, t0, dest });
  }

  _hat(t0, peak = 0.12, open = false, dest = this.musicGain) {
    this._noise({ freq: 9000, dur: open ? 0.14 : 0.03, peak, type: 'highpass', t0, q: 1.2, dest });
  }

  // ---- sound effects -------------------------------------------------------
  play(name, opts = {}) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    if (!this._gate(name, t)) return;
    switch (name) {
      case 'shoot': {
        // Tight detuned pew: two saw layers dropping in pitch + a noise transient.
        this._blip({ freq: 720, glideTo: 220, dur: 0.1, type: 'sawtooth', peak: 0.1, t0: t });
        this._blip({ freq: 720, glideTo: 220, dur: 0.1, type: 'square', peak: 0.06, t0: t, detune: 12 });
        this._noise({ freq: 3600, dur: 0.03, peak: 0.05, type: 'bandpass', t0: t });
        break;
      }
      case 'hit':
        this._noise({ freq: 3200, dur: 0.05, peak: 0.12, type: 'bandpass', t0: t, q: 1.2 });
        break;
      case 'crit':
        this._blip({ freq: 1400, glideTo: 560, dur: 0.12, type: 'square', peak: 0.16, t0: t, reverb: 0.2 });
        this._blip({ freq: 2100, dur: 0.1, type: 'triangle', peak: 0.1, t0: t });
        this._noise({ freq: 4200, dur: 0.06, peak: 0.1, type: 'bandpass', t0: t, q: 1.5 });
        break;
      case 'explode':
        this._blip({ freq: 110, glideTo: 36, dur: 0.5, type: 'sine', peak: 0.55, t0: t, reverb: 0.3 });
        this._noise({ freq: 1200, sweepTo: 90, dur: 0.45, peak: 0.45, type: 'lowpass', t0: t, reverb: 0.25 });
        this._blip({ freq: 60, dur: 0.3, type: 'sine', peak: 0.3, t0: t }); // sub thump
        break;
      case 'pickup': {
        // Two-note major third chirp; opts.pitch nudges it up for combo pickups.
        const p = 520 + (opts.pitch || 0) * 45;
        this._blip({ freq: p, dur: 0.07, type: 'triangle', peak: 0.1, t0: t });
        this._blip({ freq: p * 1.26, dur: 0.1, type: 'triangle', peak: 0.09, t0: t + 0.05 });
        break;
      }
      case 'levelup': {
        // Bright ascending arpeggio over a sustained shimmer.
        const root = 523.25;
        [0, 4, 7, 12].forEach((s, i) => this._blip({
          freq: root * Math.pow(2, s / 12), dur: 0.3, type: 'triangle',
          peak: 0.2, t0: t + i * 0.07, reverb: 0.3,
        }));
        this._blip({ freq: root * 2, dur: 0.5, type: 'sine', peak: 0.07, t0: t + 0.2, reverb: 0.4 });
        break;
      }
      case 'evolve': {
        // Triumphant rising sweep + sparkle for weapon evolutions.
        this._blip({ freq: 330, glideTo: 990, dur: 0.5, type: 'sawtooth', peak: 0.16, t0: t, reverb: 0.3 });
        [0, 5, 9, 12, 16].forEach((s, i) => this._blip({
          freq: 523.25 * Math.pow(2, s / 12), dur: 0.26, type: 'triangle',
          peak: 0.14, t0: t + 0.08 + i * 0.06, reverb: 0.35,
        }));
        break;
      }
      case 'hurt':
        this._blip({ freq: 200, glideTo: 60, dur: 0.24, type: 'sawtooth', peak: 0.28, t0: t });
        this._noise({ freq: 900, dur: 0.14, peak: 0.2, type: 'lowpass', t0: t, sweepTo: 300 });
        break;
      case 'dash':
        this._noise({ freq: 400, sweepTo: 5000, dur: 0.22, peak: 0.24, type: 'highpass', t0: t, q: 0.8 });
        break;
      case 'singularity':
        this._blip({ freq: 50, glideTo: 260, dur: 0.9, type: 'sine', peak: 0.45, t0: t, reverb: 0.4 });
        this._blip({ freq: 75, glideTo: 390, dur: 0.9, type: 'triangle', peak: 0.12, t0: t, detune: -8 });
        this._noise({ freq: 250, sweepTo: 1800, dur: 0.9, peak: 0.18, type: 'bandpass', t0: t, q: 2 });
        break;
      case 'implode':
        this._blip({ freq: 320, glideTo: 28, dur: 0.7, type: 'sine', peak: 0.55, t0: t, reverb: 0.35 });
        this._noise({ freq: 2200, sweepTo: 70, dur: 0.6, peak: 0.5, type: 'lowpass', t0: t, reverb: 0.3 });
        break;
      case 'reaction':
        // Metallic FM-ish ping for elemental reactions.
        this._blip({ freq: 980, glideTo: 1760, dur: 0.2, type: 'square', peak: 0.2, t0: t, reverb: 0.25 });
        this._blip({ freq: 1470, dur: 0.14, type: 'sine', peak: 0.12, t0: t, detune: 20 });
        this._noise({ freq: 5200, dur: 0.1, peak: 0.12, type: 'bandpass', t0: t, q: 2 });
        break;
      case 'bossfire':
        this._blip({ freq: 160, glideTo: 60, dur: 0.3, type: 'sawtooth', peak: 0.3, t0: t, reverb: 0.2 });
        this._blip({ freq: 80, dur: 0.26, type: 'square', peak: 0.14, t0: t });
        break;
      case 'espit':
        this._blip({ freq: 340, glideTo: 170, dur: 0.12, type: 'square', peak: 0.09, t0: t });
        break;
      case 'edash':
        this._noise({ freq: 700, sweepTo: 2600, dur: 0.2, peak: 0.16, type: 'bandpass', t0: t, q: 0.9 });
        break;
      case 'bosswarn': {
        // Ominous detuned low-brass cluster with a slow swell.
        [80, 80.6, 120].forEach((f, i) => this._blip({
          freq: f, glideTo: f * 1.9, dur: 1.3, type: 'sawtooth',
          peak: i === 2 ? 0.14 : 0.26, t0: t, reverb: 0.4, attack: 0.2,
        }));
        this._noise({ freq: 200, sweepTo: 600, dur: 1.3, peak: 0.1, type: 'lowpass', t0: t, reverb: 0.3 });
        break;
      }
      case 'ui':
        this._blip({ freq: 520, glideTo: 740, dur: 0.06, type: 'square', peak: 0.1, t0: t });
        break;
      case 'gameover': {
        // Descending minor arpeggio resolving into a soft pad.
        [0, -3, -7, -12].forEach((s, i) => this._blip({
          freq: 392 * Math.pow(2, s / 12), dur: 0.6, type: 'sawtooth',
          peak: 0.2, t0: t + i * 0.2, reverb: 0.4,
        }));
        this._blip({ freq: 98, dur: 1.4, type: 'sine', peak: 0.22, t0: t + 0.2, reverb: 0.3 });
        break;
      }
      default: break;
    }
  }

  // ---- Adaptive music: a layered lookahead step sequencer ------------------
  // Four layers (bass, pad, arp, drums) play over a looping chord progression.
  // setIntensity() cross-fades the arp + drums for boss fights. Everything is
  // scheduled ~0.2s ahead on a 25ms timer so timing stays tight without a
  // worklet.
  startMusic() {
    if (!this.ctx || this._musicTimer) return;
    const ctx = this.ctx;

    // Per-layer sub-mix gains so setIntensity() can cross-fade without touching
    // the scheduler. All feed the shared musicGain bus.
    if (!this._layer) {
      const mk = (v) => { const g = ctx.createGain(); g.gain.value = v; g.connect(this.musicGain); return g; };
      this._layer = {
        bass: mk(0.34),
        pad: mk(0.16),
        arp: mk(0.05),
        drums: mk(0.25),
      };
    }

    this._nextNote = ctx.currentTime + 0.12;
    this._step = 0;

    const bpm = 84;
    const stepDur = 60 / bpm / 4; // sixteenth notes
    // A natural-minor progression in A: Am – F – C – G, one bar each. Each entry
    // is [bass root (Hz), chord tones (Hz) for the pad/arp].
    const A2 = 110, F2 = 87.31, C3 = 130.81, G2 = 98;
    const prog = [
      { bass: A2, chord: [220, 261.63, 329.63] },        // Am  (A C E)
      { bass: F2, chord: [174.61, 220, 261.63] },        // F   (F A C)
      { bass: C3, chord: [261.63, 329.63, 392] },        // C   (C E G)
      { bass: G2, chord: [196, 246.94, 293.66] },        // G   (G B D)
    ];
    const arpSeq = [0, 1, 2, 1, 2, 1, 0, 2]; // index into chord tones

    const tick = () => {
      if (!this.ctx) return;
      // Ramp live intensity toward its target (also handled per-change in
      // setIntensity, this keeps _intensity readable for future hooks).
      this._intensity += (this._intensityTarget - this._intensity) * 0.08;
      const L = this._layer;
      while (this._nextNote < ctx.currentTime + 0.2) {
        const t = this._nextNote;
        const step = this._step;
        const beat16 = step % 16;       // position within the bar (16 steps/bar)
        const bar = Math.floor(step / 16) % prog.length;
        const cell = prog[bar];

        // Bass: root on the downbeat + a syncopated octave pickup.
        if (beat16 === 0) {
          this._blip({ freq: cell.bass, dur: stepDur * 6, type: 'triangle', peak: 0.4, t0: t, glideTo: cell.bass * 0.995, dest: L.bass });
          this._blip({ freq: cell.bass / 2, dur: stepDur * 7, type: 'sine', peak: 0.3, t0: t, dest: L.bass });
        } else if (beat16 === 10) {
          this._blip({ freq: cell.bass, dur: stepDur * 3, type: 'triangle', peak: 0.22, t0: t, dest: L.bass });
        }

        // Pad: sustained detuned chord at the start of each bar, sent to reverb.
        if (beat16 === 0) {
          for (const f of cell.chord) {
            this._blip({ freq: f, dur: stepDur * 15, type: 'sawtooth', peak: 0.05, t0: t, detune: -6, dest: L.pad, reverb: 0.5, attack: 0.25 });
            this._blip({ freq: f, dur: stepDur * 15, type: 'sawtooth', peak: 0.05, t0: t, detune: 6, dest: L.pad, reverb: 0.5, attack: 0.25 });
          }
        }

        // Arp: plucky triangle on every other sixteenth, octave-up for sparkle.
        if (beat16 % 2 === 0) {
          const tone = cell.chord[arpSeq[(step / 2) % arpSeq.length | 0] % cell.chord.length];
          this._blip({ freq: tone * 2, dur: stepDur * 1.6, type: 'triangle', peak: 0.5, t0: t, dest: L.arp, reverb: 0.3 });
        }

        // Drums: four-on-the-floor kick, backbeat snare, offbeat hats. The snare
        // only really bites once intensity climbs (boss fights).
        if (beat16 % 4 === 0) this._kick(t, 0.6, L.drums);
        if (beat16 === 4 || beat16 === 12) this._snare(t, 0.3 + this._intensityTarget * 0.3, L.drums);
        if (beat16 % 2 === 1) this._hat(t, 0.08 + this._intensityTarget * 0.06, beat16 % 8 === 7, L.drums);

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
