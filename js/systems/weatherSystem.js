// weatherSystem.js — Phase 4 (Environmental Interactivity / Weather)
//
// Per-wave weather changes the gameplay landscape without rewriting any
// existing systems. Each weather profile exposes:
//   - stat modifiers (consumed by the player's shoot / takeDamage paths)
//   - aggro range modifier (consumed by enemy AI when they pick a target)
//   - a render hook for the visual overlay (rain streaks, fog wash,
//     periodic lightning flashes)
//
// The weather is selected once per wave from a weighted table; bosses get a
// dedicated dramatic profile.

import { gameBus } from '../core/eventBus.js';
import { rngFromSeed } from '../core/rng.js';

export const WEATHER_PROFILES = Object.freeze({
    clear: {
        id: 'clear',
        label: '☀️ Clear',
        weight: 4,
        // Multipliers are *applied* multiplicatively to base stats. 1.0 = no-op.
        playerDamageMultiplier: 1.0,
        playerDefenseMultiplier: 1.0,
        elementalMultipliers: { fire: 1.0, shock: 1.0, poison: 1.0, frost: 1.0 },
        enemyAggroMultiplier: 1.0,
        ambientLight: 1.0,
        renderColor: null,
    },
    rain: {
        id: 'rain',
        label: '🌧️ Rain',
        weight: 2,
        playerDamageMultiplier: 1.0,
        playerDefenseMultiplier: 1.0,
        // Wet enemies conduct more shock; fire fizzles.
        elementalMultipliers: { fire: 0.85, shock: 1.20, poison: 1.0, frost: 1.05 },
        enemyAggroMultiplier: 1.0,
        ambientLight: 0.85,
        renderColor: 'rgba(120,160,210,0.10)',
    },
    fog: {
        id: 'fog',
        label: '🌫️ Fog',
        weight: 2,
        playerDamageMultiplier: 1.0,
        playerDefenseMultiplier: 0.95, // slight stealth bonus
        elementalMultipliers: { fire: 1.0, shock: 1.0, poison: 1.10, frost: 1.0 },
        enemyAggroMultiplier: 0.75,    // enemies see less far
        ambientLight: 0.65,
        renderColor: 'rgba(180,190,200,0.18)',
    },
    storm: {
        id: 'storm',
        label: '⛈️ Storm',
        weight: 1,
        // Extreme: chaotic waves where lightning randomly strikes enemies.
        playerDamageMultiplier: 1.10,
        playerDefenseMultiplier: 1.05, // taken-damage *5% reduction*
        elementalMultipliers: { fire: 0.85, shock: 1.30, poison: 1.0, frost: 1.0 },
        enemyAggroMultiplier: 1.10,
        ambientLight: 0.55,
        renderColor: 'rgba(70,90,150,0.22)',
        randomLightning: true,
    },
    eclipse: {
        id: 'eclipse',
        label: '🌑 Eclipse',
        weight: 0, // boss-only special
        playerDamageMultiplier: 1.15,
        playerDefenseMultiplier: 1.0,
        elementalMultipliers: { fire: 1.10, shock: 1.0, poison: 1.0, frost: 0.90 },
        enemyAggroMultiplier: 1.20,
        ambientLight: 0.40,
        renderColor: 'rgba(20,10,40,0.30)',
    },
});

export class WeatherSystem {
    constructor() {
        this.current = WEATHER_PROFILES.clear;
        this._rainSeed = 1234;
        this._frame = 0;
        // Pending lightning strike events: { x, y, life, target }.
        this._lightning = [];
        this._lastLightningFrame = 0;
    }

    /**
     * Roll new weather for a wave. Bosses get the eclipse profile.
     * @param {number} waveNumber
     * @param {boolean} isBossWave
     */
    rollForWave(waveNumber, isBossWave) {
        const prev = this.current;
        let next;
        if (isBossWave && waveNumber % 10 === 0) {
            next = WEATHER_PROFILES.eclipse;
        } else {
            next = this._weightedPick(waveNumber);
        }
        this.current = next;
        this._lightning.length = 0;
        if (prev !== next) gameBus.emit('weather:changed', { prev, next, wave: waveNumber });
        return next;
    }

    _weightedPick(seed) {
        const rng = rngFromSeed('weather:' + seed);
        // First few waves are always clear so new players aren't immediately
        // hit with mechanics they haven't learned.
        if (seed <= 2) return WEATHER_PROFILES.clear;
        const eligible = Object.values(WEATHER_PROFILES).filter(p => p.weight > 0);
        const total = eligible.reduce((s, p) => s + p.weight, 0);
        let r = rng.next() * total;
        for (const profile of eligible) {
            r -= profile.weight;
            if (r <= 0) return profile;
        }
        return eligible[eligible.length - 1];
    }

    /**
     * Per-frame update. `enemies` array is borrowed (not mutated except for
     * applying lightning damage). Returns lightning events for the renderer
     * to draw.
     * @param {{ x:number, y:number, takeDamage:(amt:number, isCrit?:boolean)=>any }[]} enemies
     * @param {{ damage: number }} player
     */
    update(enemies, player) {
        this._frame++;
        // Decay existing lightning visuals
        for (let i = this._lightning.length - 1; i >= 0; i--) {
            this._lightning[i].life--;
            if (this._lightning[i].life <= 0) this._lightning.splice(i, 1);
        }
        if (!this.current.randomLightning) return this._lightning;
        if (enemies.length === 0) return this._lightning;
        // Roughly one bolt per ~2.5 seconds of storm.
        const interval = 150;
        if (this._frame - this._lastLightningFrame < interval) return this._lightning;
        this._lastLightningFrame = this._frame;
        const target = enemies[Math.floor(Math.random() * enemies.length)];
        if (!target) return this._lightning;
        const dmg = (player && player.damage ? player.damage : 10) * 1.4;
        try {
            target.takeDamage(dmg, false);
        } catch { /* defensive: don't let weather kill the loop */ }
        this._lightning.push({
            x: target.x,
            y: target.y,
            life: 18,
            maxLife: 18,
        });
        gameBus.emit('weather:lightning', { x: target.x, y: target.y });
        return this._lightning;
    }

    /**
     * Draw the weather overlay. Caller is responsible for being inside the
     * world transform (so we can position rain streaks / lightning bolts in
     * world space).
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ x:number, y:number, w:number, h:number }} viewport
     */
    drawWorldLayer(ctx, viewport) {
        const w = this.current;
        if (w.id === 'rain' || w.id === 'storm') {
            ctx.save();
            ctx.strokeStyle = w.id === 'storm' ? 'rgba(180,200,255,0.55)' : 'rgba(180,200,255,0.40)';
            ctx.lineWidth = 1;
            const count = w.id === 'storm' ? 120 : 70;
            const seed = (Date.now() * 0.4) | 0;
            for (let i = 0; i < count; i++) {
                // Deterministic pseudo-random streak positions that scroll
                // diagonally over time without per-frame allocations.
                const k = (i * 9301 + seed) % 233280;
                const x = (k % viewport.w) + viewport.x;
                const y = ((k * 17) % viewport.h) + viewport.y;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x - 4, y + 12);
                ctx.stroke();
            }
            ctx.restore();
        }
        // Lightning bolt strikes — bright vertical zigzag.
        if (this._lightning.length > 0) {
            ctx.save();
            ctx.strokeStyle = '#dbeafe';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#93c5fd';
            ctx.shadowBlur = 18;
            for (const bolt of this._lightning) {
                ctx.globalAlpha = bolt.life / bolt.maxLife;
                ctx.beginPath();
                let yy = viewport.y;
                let xx = bolt.x + (Math.random() - 0.5) * 30;
                ctx.moveTo(xx, yy);
                while (yy < bolt.y) {
                    yy += 18 + Math.random() * 10;
                    xx += (Math.random() - 0.5) * 28;
                    ctx.lineTo(xx, yy);
                }
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    /** Screen-space colour wash. Call after world transform restored. */
    drawScreenLayer(ctx, width, height) {
        const w = this.current;
        if (!w.renderColor) return;
        ctx.save();
        ctx.fillStyle = w.renderColor;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }
}

export const weatherSystem = new WeatherSystem();
