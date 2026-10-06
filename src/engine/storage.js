// storage.js — safe localStorage wrapper for high scores and settings.

const KEY = 'cosmic-survivor:v1';

const DEFAULT = {
  highScore: 0,
  bestTime: 0,
  bestLevel: 0,
  runs: 0,
  totalKills: 0,
  bossKillsTotal: 0,    // lifetime bosses destroyed (for commendations)
  // ---- Meta-progression ("Ascension") -----------------------------------
  stardust: 0,          // current spendable currency
  lifetimeStardust: 0,  // total ever earned (for stats / prestige display)
  meta: {},             // { [upgradeId]: level }
  ships: ['vanguard'],  // unlocked ship ids (vanguard is always free)
  ship: 'vanguard',     // last-selected ship id
  achievements: [],     // unlocked commendation ids
  directives: [],       // active challenge-directive ids (carried across runs)
  settings: { muted: false, shake: true, music: true },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshDefault();
    const data = JSON.parse(raw);
    return {
      ...DEFAULT,
      ...data,
      meta: { ...(data.meta || {}) },
      ships: Array.isArray(data.ships) && data.ships.length ? data.ships : ['vanguard'],
      achievements: Array.isArray(data.achievements) ? [...data.achievements] : [],
      directives: Array.isArray(data.directives) ? [...data.directives] : [],
      settings: { ...DEFAULT.settings, ...(data.settings || {}) },
    };
  } catch {
    return freshDefault();
  }
}

// A pristine copy of DEFAULT with fresh (non-shared) object/array fields.
function freshDefault() {
  return {
    ...DEFAULT,
    meta: {},
    ships: ['vanguard'],
    achievements: [],
    directives: [],
    settings: { ...DEFAULT.settings },
  };
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
  recordRun({ score, time, level, kills, bossKills }) {
    const d = this.data;
    const newBest = score > d.highScore;
    d.runs += 1;
    d.totalKills += kills || 0;
    d.bossKillsTotal = (d.bossKillsTotal || 0) + (bossKills || 0);
    if (score > d.highScore) d.highScore = score;
    if (time > d.bestTime) d.bestTime = time;
    if (level > d.bestLevel) d.bestLevel = level;
    this.save();
    return { newBest };
  },

  // ---- Commendations (achievements) --------------------------------------
  getAchievements() {
    if (!Array.isArray(this.data.achievements)) this.data.achievements = [];
    return this.data.achievements;
  },
  isAchievementUnlocked(id) { return this.getAchievements().includes(id); },

  // Unlock a commendation (idempotent). Returns true only if it was newly added.
  unlockAchievement(id) {
    const list = this.getAchievements();
    if (list.includes(id)) return false;
    list.push(id);
    this.save();
    return true;
  },

  // ---- Directives (run modifiers) ----------------------------------------
  getDirectives() {
    if (!Array.isArray(this.data.directives)) this.data.directives = [];
    return this.data.directives;
  },
  isDirectiveActive(id) { return this.getDirectives().includes(id); },

  // Toggle a directive on/off for future runs. Returns the new active state.
  toggleDirective(id) {
    const list = this.getDirectives();
    const i = list.indexOf(id);
    if (i >= 0) { list.splice(i, 1); this.save(); return false; }
    list.push(id);
    this.save();
    return true;
  },
  clearDirectives() { this.data.directives = []; this.save(); },
};
