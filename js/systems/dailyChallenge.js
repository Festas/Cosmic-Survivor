// Daily Challenge — deterministic per-day modifier + difficulty
// Same seed for everyone on the same UTC day.

const STORAGE_KEY = 'cosmicSurvivor_dailyProgress';

// Tiny deterministic hash → 32-bit unsigned int
function hash32(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
}

// Mulberry32 PRNG
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const MUTATORS = [
    { id: 'doubleTrouble',  nameEn: 'Double Trouble',   nameDe: 'Doppelte Gefahr',   desc: '2× enemies, 1.5× XP' },
    { id: 'glassCannon',    nameEn: 'Glass Cannon',     nameDe: 'Glaskanone',        desc: '+100% damage dealt, -50% max HP' },
    { id: 'speedDemon',     nameEn: 'Speed Demon',      nameDe: 'Geschwindigkeitsteufel', desc: 'All enemies +30% speed, you +20% speed' },
    { id: 'gold rush',      nameEn: 'Gold Rush',        nameDe: 'Goldrausch',        desc: 'Triple credits, half XP' },
    { id: 'bossfest',       nameEn: 'Boss Fest',        nameDe: 'Bossfest',          desc: 'A boss every 3 waves' },
    { id: 'ironman',        nameEn: 'Iron Man',         nameDe: 'Eisenmann',         desc: 'No healing pickups, +50% max HP' },
    { id: 'fogBound',       nameEn: 'Fog Bound',        nameDe: 'Im Nebel',          desc: 'Permanent fog of war' },
    { id: 'critFiesta',     nameEn: 'Crit Fiesta',      nameDe: 'Crit-Fiesta',       desc: '+25% crit chance, +50% crit damage' },
];

const DIFFICULTIES = ['easy', 'normal', 'hard', 'nightmare'];

export class DailyChallenge {
    constructor() {
        this.progress = this._load();
    }

    _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch {}
        return { lastPlayedDay: null, bestWaveByDay: {} };
    }
    _save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress)); } catch {} }

    /** UTC day key like 2026-04-21 */
    getTodayKey() {
        const d = new Date();
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    /** Returns today's challenge: { day, seed, mutator, difficulty } */
    getTodayChallenge() {
        const day = this.getTodayKey();
        const seed = hash32('cosmic-survivor::' + day);
        const rng = mulberry32(seed);
        const mutator = MUTATORS[Math.floor(rng() * MUTATORS.length)];
        const difficulty = DIFFICULTIES[1 + Math.floor(rng() * 3)]; // normal..nightmare
        return { day, seed, mutator, difficulty };
    }

    markPlayed(wave) {
        const day = this.getTodayKey();
        this.progress.lastPlayedDay = day;
        const prev = this.progress.bestWaveByDay[day] || 0;
        if (wave > prev) this.progress.bestWaveByDay[day] = wave;
        this._save();
    }

    playedToday() {
        return this.progress.lastPlayedDay === this.getTodayKey();
    }

    bestToday() {
        return this.progress.bestWaveByDay[this.getTodayKey()] || 0;
    }
}

const _daily = new DailyChallenge();
if (typeof window !== 'undefined') {
    window.DailyChallenge = {
        instance: _daily,
        getTodayChallenge: () => _daily.getTodayChallenge(),
        markPlayed: (w) => _daily.markPlayed(w),
        playedToday: () => _daily.playedToday(),
        bestToday: () => _daily.bestToday(),
        MUTATORS,
    };
}

export default _daily;
