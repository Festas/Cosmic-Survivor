// storage.js — safe localStorage wrapper for high scores and settings.

const KEY = 'cosmic-survivor:v1';

const DEFAULT = {
  highScore: 0,
  bestTime: 0,
  bestLevel: 0,
  runs: 0,
  totalKills: 0,
  settings: { muted: false, shake: true, music: true },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT, settings: { ...DEFAULT.settings } };
    const data = JSON.parse(raw);
    return { ...DEFAULT, ...data, settings: { ...DEFAULT.settings, ...(data.settings || {}) } };
  } catch {
    return { ...DEFAULT, settings: { ...DEFAULT.settings } };
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export const Store = {
  data: load(),
  get() { return this.data; },
  save() { save(this.data); },
  reload() { this.data = load(); return this.data; },

  getSettings() { return this.data.settings; },
  setSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  },

  // Record the result of a finished run. Returns { newBest }.
  recordRun({ score, time, level, kills }) {
    const d = this.data;
    const newBest = score > d.highScore;
    d.runs += 1;
    d.totalKills += kills || 0;
    if (score > d.highScore) d.highScore = score;
    if (time > d.bestTime) d.bestTime = time;
    if (level > d.bestLevel) d.bestLevel = level;
    this.save();
    return { newBest };
  },
};
