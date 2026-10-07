// storage.js — safe localStorage wrapper for high scores and settings.

import {
  createIdleState, GENERATOR_BY_ID, generatorBulkCost, prestigeGain,
  SPECIAL_BY_ID, specialCost, canBuySpecial,
  clickYield, clickUpgradeCost,
} from '../game/idle.js';

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
  // ---- Idle layer ("Orbital Station") -----------------------------------
  idle: createIdleState(), // Nebula/Cores economy; see game/idle.js
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
      idle: mergeIdle(data.idle),
      settings: { ...DEFAULT.settings, ...(data.settings || {}) },
    };
  } catch {
    return freshDefault();
  }
}

// Merge a persisted idle blob onto a pristine state so new fields (added in
// later versions) always exist and nested maps are fresh, non-shared objects.
function mergeIdle(saved) {
  const base = createIdleState();
  if (!saved || typeof saved !== 'object') return base;
  base.nebula = Math.max(0, +saved.nebula || 0);
  base.lifetimeNebula = Math.max(0, +saved.lifetimeNebula || 0);
  base.cores = Math.max(0, +saved.cores || 0);
  base.lifetimeCores = Math.max(0, +saved.lifetimeCores || 0);
  base.clickLevel = Math.max(0, Math.floor(+saved.clickLevel || 0));
  base.lastTick = Math.max(0, +saved.lastTick || 0);
  if (saved.generators && typeof saved.generators === 'object') {
    for (const id in GENERATOR_BY_ID) {
      const n = Math.max(0, Math.floor(+saved.generators[id] || 0));
      if (n > 0) base.generators[id] = n;
    }
  }
  if (saved.special && typeof saved.special === 'object') {
    for (const id in SPECIAL_BY_ID) {
      const n = Math.max(0, Math.floor(+saved.special[id] || 0));
      if (n > 0) base.special[id] = Math.min(n, SPECIAL_BY_ID[id].max);
    }
  }
  return base;
}

// A pristine copy of DEFAULT with fresh (non-shared) object/array fields.
function freshDefault() {
  return {
    ...DEFAULT,
    meta: {},
    ships: ['vanguard'],
    achievements: [],
    directives: [],
    idle: createIdleState(),
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

  // ---- Idle layer ("Orbital Station") ------------------------------------
  getIdle() {
    if (!this.data.idle || typeof this.data.idle !== 'object') this.data.idle = createIdleState();
    return this.data.idle;
  },

  // The run-profile that feeds the main → idle production boost.
  getRunProfile() {
    return {
      lifetimeStardust: this.data.lifetimeStardust || 0,
      bestLevel: this.data.bestLevel || 0,
      bossKillsTotal: this.data.bossKillsTotal || 0,
    };
  },

  // Credit produced Nebula (from a tick, offline catch-up, or a run burst).
  addNebula(amount) {
    const n = Math.max(0, Math.floor(amount || 0));
    if (n === 0) return this.getIdle().nebula;
    const idle = this.getIdle();
    idle.nebula += n;
    idle.lifetimeNebula += n;
    this.save();
    return idle.nebula;
  },

  // Manual tap on the Station's mining beam (the Cookie-Clicker "big cookie").
  // Mints a whole-Nebula amount from the live clickYield and returns how much was
  // granted, so the UI can show a floating "+N". Always mints at least 1 so a
  // pristine Station can always be bootstrapped by hand.
  tapNebula() {
    const idle = this.getIdle();
    const got = Math.max(1, Math.round(clickYield(idle, this.getRunProfile())));
    idle.nebula += got;
    idle.lifetimeNebula += got;
    this.save();
    return got;
  },

  // Stamp the last production tick (epoch ms); used for offline catch-up.
  setIdleTick(ms) {
    this.getIdle().lastTick = Math.max(0, Math.floor(ms || 0));
    this.save();
  },

  // Spend Nebula to buy `qty` units of a generator. Returns units actually bought.
  buyGenerator(id, qty = 1) {
    const def = GENERATOR_BY_ID[id];
    if (!def) return 0;
    const idle = this.getIdle();
    const owned = Math.max(0, Math.floor(idle.generators[id] || 0));
    const n = Math.max(0, Math.floor(qty));
    if (n === 0) return 0;
    const cost = generatorBulkCost(def, owned, n);
    if (idle.nebula < cost) return 0;
    idle.nebula -= cost;
    idle.generators[id] = owned + n;
    this.save();
    return n;
  },

  // Spend Nebula to raise the Mining Laser (manual-tap power) by one level.
  // Returns true on success.
  buyClickUpgrade() {
    const idle = this.getIdle();
    const level = Math.max(0, Math.floor(idle.clickLevel || 0));
    const cost = clickUpgradeCost(level);
    if (idle.nebula < cost) return false;
    idle.nebula -= cost;
    idle.clickLevel = level + 1;
    this.save();
    return true;
  },

  // Collapse the station: mint Cores from this epoch's lifetime Nebula and reset
  // generators + Nebula. Returns the number of Cores gained (0 if below threshold).
  prestigeIdle() {
    const idle = this.getIdle();
    const gain = prestigeGain(idle.lifetimeNebula);
    if (gain <= 0) return 0;
    idle.cores += gain;
    idle.lifetimeCores += gain;
    idle.nebula = 0;
    idle.lifetimeNebula = 0;
    idle.generators = Object.create(null);
    idle.clickLevel = 0; // the Mining Laser is a Nebula-era investment — reset with it
    this.save();
    return gain;
  },

  // Spend Cores to raise a special (premium) run upgrade by one level.
  buySpecial(id) {
    const def = SPECIAL_BY_ID[id];
    if (!def) return false;
    const idle = this.getIdle();
    if (!canBuySpecial(def, idle.special, idle.cores)) return false;
    const cur = Math.max(0, Math.floor(idle.special[id] || 0));
    idle.cores -= specialCost(def, cur);
    idle.special[id] = cur + 1;
    this.save();
    return true;
  },
};
