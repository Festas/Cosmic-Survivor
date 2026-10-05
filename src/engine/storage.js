// storage.js — safe localStorage wrapper for high scores and settings.

const KEY = 'cosmic-survivor:v1';

const DEFAULT = {
  highScore: 0,
  bestTime: 0,
  bestLevel: 0,
  runs: 0,
  totalKills: 0,
  // ---- Meta-progression ("Ascension") -----------------------------------
  stardust: 0,          // current spendable currency
  lifetimeStardust: 0,  // total ever earned (for stats / prestige display)
  meta: {},             // { [upgradeId]: level }
  ships: ['vanguard'],  // unlocked ship ids (vanguard is always free)
  ship: 'vanguard',     // last-selected ship id
  settings: { muted: false, shake: true, music: true },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT, meta: {}, ships: ['vanguard'], settings: { ...DEFAULT.settings } };
    const data = JSON.parse(raw);
    return {
      ...DEFAULT,
      ...data,
      meta: { ...(data.meta || {}) },
      ships: Array.isArray(data.ships) && data.ships.length ? data.ships : ['vanguard'],
      settings: { ...DEFAULT.settings, ...(data.settings || {}) },
    };
  } catch {
    return { ...DEFAULT, meta: {}, ships: ['vanguard'], settings: { ...DEFAULT.settings } };
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

  // ---- Meta-progression --------------------------------------------------
  get stardust() { return this.data.stardust || 0; },
  getMeta() { return this.data.meta || (this.data.meta = {}); },
  getMetaLevel(id) { return this.getMeta()[id] || 0; },

  addStardust(amount) {
    const n = Math.max(0, Math.floor(amount || 0));
    this.data.stardust = (this.data.stardust || 0) + n;
    this.data.lifetimeStardust = (this.data.lifetimeStardust || 0) + n;
    this.save();
    return this.data.stardust;
  },

  // Spend Stardust to raise a meta upgrade by one level. Returns true on success.
  buyMeta(id, cost, maxLevel) {
    const meta = this.getMeta();
    const cur = meta[id] || 0;
    if (cur >= maxLevel) return false;
    if ((this.data.stardust || 0) < cost) return false;
    this.data.stardust -= cost;
    meta[id] = cur + 1;
    this.save();
    return true;
  },

  // ---- Ships -------------------------------------------------------------
  isShipUnlocked(id) { return (this.data.ships || []).includes(id); },
  getSelectedShip() { return this.data.ship || 'vanguard'; },
  selectShip(id) { this.data.ship = id; this.save(); },

  // Spend Stardust to permanently unlock a ship. Returns true on success.
  unlockShip(id, cost) {
    if (this.isShipUnlocked(id)) return true;
    if ((this.data.stardust || 0) < cost) return false;
    this.data.stardust -= cost;
    this.data.ships = [...(this.data.ships || []), id];
    this.save();
    return true;
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
