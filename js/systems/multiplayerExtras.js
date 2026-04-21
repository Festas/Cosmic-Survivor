// Multiplayer Extras for Cosmic Survivor
// Adds: emote bubbles, world pings, downed/revive system, end-of-match MVP screen,
// quick-chat presets, friendly boss-kill banner.
//
// Strategy: piggyback on the existing generic `game_event` relay so the server
// stays simple. Whitelist a small set of new event types in the server which
// only re-broadcast them. All inputs are validated client- and server-side.

const t = (k, f, v) => (window.t ? window.t(k, f, v) : (f || k));

// ===== EMOTES =====
export const EMOTES = [
    { id: 'wave',      labelKey: 'emote.wave',      emoji: '👋' },
    { id: 'lol',       labelKey: 'emote.lol',       emoji: '😂' },
    { id: 'angry',     labelKey: 'emote.angry',     emoji: '😡' },
    { id: 'heart',     labelKey: 'emote.heart',     emoji: '❤️' },
    { id: 'alert',     labelKey: 'emote.alert',     emoji: '🚨' },
    { id: 'help',      labelKey: 'emote.help',      emoji: '🆘' },
    { id: 'celebrate', labelKey: 'emote.celebrate', emoji: '🎉' },
    { id: 'teamup',    labelKey: 'emote.teamup',    emoji: '🤝' },
];
const EMOTE_DURATION_MS = 2500;
const PING_DURATION_MS = 4000;
const REVIVE_DOWNED_MS = 15000; // Time until permanent death if no revive
const REVIVE_HOLD_MS = 3000;    // Time another player must hold F to revive
const REVIVE_RANGE = 80;
const QUICKCHAT_COOLDOWN_MS = 800; // anti-spam

export class MultiplayerExtras {
    constructor() {
        // Per-player active emotes: playerId -> { emoji, expiresAt }
        this.activeEmotes = new Map();
        // Active world pings: array of { x, y, type, owner, expiresAt }
        this.activePings = [];
        // Downed players (local + remote): playerId -> { expiresAt, beingRevivedBy, reviveStartedAt, reviveProgress }
        this.downed = new Map();
        // Per-player match stats: playerId -> { kills, damage, revives, bosses, name, color }
        this.matchStats = new Map();
        // Last quick-chat send time (anti-spam)
        this.lastQuickChat = 0;
        // Emote wheel open
        this.emoteWheelOpen = false;
        // F-key revive hold
        this.reviveHold = { playerId: null, startedAt: 0 };
    }

    // ===== Emotes =====
    sendEmote(emoteId) {
        const mp = window.MultiplayerClient;
        if (!mp || !mp.isMultiplayerGame || typeof mp.isMultiplayerGame !== 'function' || !mp.isInRoom()) return;
        const def = EMOTES.find(e => e.id === emoteId);
        if (!def) return;
        const localId = mp.localPlayerId;
        // Show locally immediately
        this.activeEmotes.set(localId, { emoji: def.emoji, expiresAt: Date.now() + EMOTE_DURATION_MS });
        // Broadcast
        mp.sendGameEvent('emote', { emoteId });
    }

    receiveEmote(playerId, data) {
        const def = EMOTES.find(e => e.id === (data && data.emoteId));
        if (!def) return;
        this.activeEmotes.set(playerId, { emoji: def.emoji, expiresAt: Date.now() + EMOTE_DURATION_MS });
    }

    getEmoteFor(playerId) {
        const e = this.activeEmotes.get(playerId);
        if (!e) return null;
        if (e.expiresAt < Date.now()) {
            this.activeEmotes.delete(playerId);
            return null;
        }
        return e.emoji;
    }

    openEmoteWheel(onPicked) {
        if (this.emoteWheelOpen) return;
        this.emoteWheelOpen = true;
        const wheel = document.createElement('div');
        wheel.id = 'emote-wheel';
        wheel.className = 'emote-wheel';
        const radius = 110;
        const html = EMOTES.map((e, i) => {
            const angle = (i / EMOTES.length) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            return `<button class="emote-wheel-btn" data-emote="${e.id}" style="transform: translate(${x}px, ${y}px)" title="${t(e.labelKey)}">${e.emoji}</button>`;
        }).join('');
        wheel.innerHTML = `<div class="emote-wheel-center">${t('emote.title', 'Emotes')}</div>${html}`;
        document.body.appendChild(wheel);
        const close = () => {
            this.emoteWheelOpen = false;
            wheel.remove();
            document.removeEventListener('keydown', escHandler, true);
        };
        const escHandler = (ev) => { if (ev.key === 'Escape' || ev.key === 't' || ev.key === 'T') { ev.preventDefault(); close(); } };
        document.addEventListener('keydown', escHandler, true);
        wheel.querySelectorAll('.emote-wheel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-emote');
                this.sendEmote(id);
                if (typeof onPicked === 'function') onPicked(id);
                close();
            });
        });
        // Click outside to close
        wheel.addEventListener('click', (ev) => { if (ev.target === wheel) close(); });
    }

    // ===== Pings =====
    sendPing(x, y, type) {
        const mp = window.MultiplayerClient;
        if (!mp || !mp.isInRoom()) return;
        const t = (type === 'rally') ? 'rally' : 'danger';
        // Local feedback
        const owner = mp.localPlayerId;
        this.activePings.push({ x, y, type: t, owner, expiresAt: Date.now() + PING_DURATION_MS });
        mp.sendGameEvent('ping', { x, y, type: t });
    }

    receivePing(playerId, data) {
        if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') return;
        const t = (data.type === 'rally') ? 'rally' : 'danger';
        this.activePings.push({ x: data.x, y: data.y, type: t, owner: playerId, expiresAt: Date.now() + PING_DURATION_MS });
    }

    updatePings() {
        const now = Date.now();
        this.activePings = this.activePings.filter(p => p.expiresAt > now);
    }

    drawPings(ctx) {
        const now = Date.now();
        this.activePings.forEach(p => {
            const remaining = (p.expiresAt - now) / PING_DURATION_MS;
            const pulse = 0.6 + Math.sin(now * 0.008) * 0.4;
            const r = 28 + (1 - remaining) * 30;
            ctx.save();
            ctx.globalAlpha = Math.max(0, remaining) * pulse;
            ctx.strokeStyle = p.type === 'danger' ? '#ff4d4d' : '#4ecdc4';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.font = 'bold 22px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = p.type === 'danger' ? '#ff4d4d' : '#4ecdc4';
            ctx.fillText(p.type === 'danger' ? '⚠️' : '📍', p.x, p.y - r - 6);
            ctx.restore();
        });
    }

    drawEmotes(ctx, getPlayerById) {
        const now = Date.now();
        this.activeEmotes.forEach((e, playerId) => {
            if (e.expiresAt < now) return;
            const player = getPlayerById(playerId);
            if (!player || player.isAlive === false) return;
            const x = player.x;
            const y = player.y - (player.size || 30) - 28;
            const lifeFrac = (e.expiresAt - now) / EMOTE_DURATION_MS;
            ctx.save();
            ctx.globalAlpha = Math.min(1, lifeFrac * 1.5);
            // Bubble
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.strokeStyle = '#ffd93d';
            ctx.lineWidth = 2;
            const w = 44, h = 38;
            const bx = x - w / 2, by = y - h;
            ctx.beginPath();
            // simple rounded rect
            const r = 8;
            ctx.moveTo(bx + r, by);
            ctx.lineTo(bx + w - r, by);
            ctx.quadraticCurveTo(bx + w, by, bx + w, by + r);
            ctx.lineTo(bx + w, by + h - r);
            ctx.quadraticCurveTo(bx + w, by + h, bx + w - r, by + h);
            ctx.lineTo(bx + r, by + h);
            ctx.quadraticCurveTo(bx, by + h, bx, by + h - r);
            ctx.lineTo(bx, by + r);
            ctx.quadraticCurveTo(bx, by, bx + r, by);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Tail
            ctx.beginPath();
            ctx.moveTo(x - 5, by + h);
            ctx.lineTo(x, by + h + 8);
            ctx.lineTo(x + 5, by + h);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Emoji
            ctx.font = '24px serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.fillText(e.emoji, x, by + h - 10);
            ctx.restore();
        });
    }

    // ===== Revive system =====
    /** Mark a player as downed (instead of immediate death). */
    markDowned(playerId) {
        if (this.downed.has(playerId)) return;
        this.downed.set(playerId, {
            expiresAt: Date.now() + REVIVE_DOWNED_MS,
            beingRevivedBy: null,
            reviveProgress: 0,
        });
    }

    isDowned(playerId) {
        return this.downed.has(playerId);
    }

    getDownedInfo(playerId) {
        return this.downed.get(playerId) || null;
    }

    clearDowned(playerId) {
        this.downed.delete(playerId);
    }

    /**
     * Called every frame on the local client.
     * @param {object} localPlayer - { x, y, isAlive }
     * @param {Map} remotePlayers - playerId -> RemotePlayer
     * @param {boolean} fHeld - whether F key is held
     */
    updateRevive(localPlayer, remotePlayers, fHeld) {
        const now = Date.now();
        // Auto-die any expired downed players
        for (const [pid, info] of this.downed.entries()) {
            if (info.expiresAt < now && !info.beingRevivedBy) {
                this.downed.delete(pid);
                // Local player: trigger real death via callback
                if (this._onLocalPermanentDeath && pid === (window.MultiplayerClient && window.MultiplayerClient.localPlayerId)) {
                    this._onLocalPermanentDeath();
                }
            }
        }

        if (!localPlayer || !localPlayer.isAlive) return;

        // Find nearest downed teammate within range
        let target = null;
        let targetId = null;
        let bestDist = REVIVE_RANGE;
        for (const [pid, info] of this.downed.entries()) {
            const localId = window.MultiplayerClient && window.MultiplayerClient.localPlayerId;
            if (pid === localId) continue;
            const rp = remotePlayers.get(pid);
            if (!rp) continue;
            const d = Math.hypot(rp.x - localPlayer.x, rp.y - localPlayer.y);
            if (d < bestDist) { bestDist = d; target = rp; targetId = pid; }
        }

        if (target && fHeld) {
            const info = this.downed.get(targetId);
            if (!this.reviveHold.playerId || this.reviveHold.playerId !== targetId) {
                this.reviveHold = { playerId: targetId, startedAt: now };
            }
            const progress = Math.min(1, (now - this.reviveHold.startedAt) / REVIVE_HOLD_MS);
            info.reviveProgress = progress;
            info.beingRevivedBy = window.MultiplayerClient && window.MultiplayerClient.localPlayerId;
            if (progress >= 1) {
                // Complete revive
                this.downed.delete(targetId);
                this.reviveHold = { playerId: null, startedAt: 0 };
                if (window.MultiplayerClient) {
                    window.MultiplayerClient.sendGameEvent('revive_complete', { targetId });
                }
                this.bumpStat(window.MultiplayerClient && window.MultiplayerClient.localPlayerId, 'revives', 1);
                if (this._onRevived) this._onRevived(targetId);
            }
        } else {
            // Reset hold if F released or out of range
            if (this.reviveHold.playerId) {
                const info = this.downed.get(this.reviveHold.playerId);
                if (info) { info.reviveProgress = 0; info.beingRevivedBy = null; }
                this.reviveHold = { playerId: null, startedAt: 0 };
            }
        }
    }

    /** Hook for the local player getting permanently killed (after downed timer). */
    onLocalPermanentDeath(cb) { this._onLocalPermanentDeath = cb; }
    /** Hook for any player getting revived locally. */
    onRevived(cb) { this._onRevived = cb; }

    drawDownedIndicator(ctx, getPlayerById) {
        const now = Date.now();
        for (const [pid, info] of this.downed.entries()) {
            const player = getPlayerById(pid);
            if (!player) continue;
            const x = player.x;
            const y = player.y;
            const remaining = Math.max(0, (info.expiresAt - now) / REVIVE_DOWNED_MS);
            ctx.save();
            // Pulsing red ring
            const pulse = 0.5 + Math.sin(now * 0.01) * 0.3;
            ctx.strokeStyle = `rgba(255, 80, 80, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 35, 0, Math.PI * 2);
            ctx.stroke();
            // Down arrow
            ctx.font = 'bold 22px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff5050';
            ctx.fillText('💔', x, y - 50);
            // Timer arc (shrinking)
            ctx.strokeStyle = '#ffd93d';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(x, y, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining);
            ctx.stroke();
            // Revive progress bar
            if (info.beingRevivedBy && info.reviveProgress > 0) {
                const w = 60, h = 6;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(x - w / 2, y - 70, w, h);
                ctx.fillStyle = '#00ff88';
                ctx.fillRect(x - w / 2, y - 70, w * info.reviveProgress, h);
            }
            ctx.restore();
        }
    }

    // ===== Quick chat =====
    sendQuickChat(key) {
        const now = Date.now();
        if (now - this.lastQuickChat < QUICKCHAT_COOLDOWN_MS) return;
        this.lastQuickChat = now;
        const mp = window.MultiplayerClient;
        if (!mp) return;
        // Send only the key, not localized text — recipients localize on receive.
        mp.sendGameEvent('quickchat', { key });
    }

    // ===== Match stats =====
    bumpStat(playerId, statKey, amount) {
        if (!playerId) return;
        let s = this.matchStats.get(playerId);
        if (!s) { s = { kills: 0, damage: 0, revives: 0, bosses: 0 }; this.matchStats.set(playerId, s); }
        s[statKey] = (s[statKey] || 0) + (amount || 0);
    }

    receiveStatBroadcast(playerId, data) {
        if (!data || typeof data !== 'object') return;
        let s = this.matchStats.get(playerId);
        if (!s) { s = { kills: 0, damage: 0, revives: 0, bosses: 0 }; this.matchStats.set(playerId, s); }
        ['kills','damage','revives','bosses'].forEach(k => {
            if (typeof data[k] === 'number') s[k] = (s[k] || 0) + data[k];
        });
    }

    resetMatchStats() { this.matchStats.clear(); }

    /**
     * Show end-of-match MVP overlay.
     * @param {Map} playerInfoById - id -> { name, color }
     * @param {Function} onContinue
     */
    showMVPScreen(playerInfoById, onContinue) {
        const cats = [
            { key: 'kills',   labelKey: 'mvp.kills',   icon: '⚔️' },
            { key: 'damage',  labelKey: 'mvp.damage',  icon: '💥' },
            { key: 'revives', labelKey: 'mvp.revives', icon: '💚' },
            { key: 'bosses',  labelKey: 'mvp.bosses',  icon: '👹' },
        ];
        const winners = cats.map(cat => {
            let bestId = null, bestVal = -1;
            for (const [pid, s] of this.matchStats.entries()) {
                const v = s[cat.key] || 0;
                if (v > bestVal) { bestVal = v; bestId = pid; }
            }
            const info = bestId ? playerInfoById.get(bestId) : null;
            return { ...cat, winnerName: info ? info.name : '—', winnerColor: info ? info.color : '#999', value: bestVal > 0 ? bestVal : 0 };
        });

        const overlay = document.createElement('div');
        overlay.id = 'mvp-overlay';
        overlay.className = 'mvp-overlay';
        overlay.innerHTML = `
            <div class="mvp-content">
                <h2>${t('mvp.title', '🏆 Match Summary')}</h2>
                <div class="mvp-grid">
                    ${winners.map(w => `
                        <div class="mvp-card">
                            <div class="mvp-icon">${w.icon}</div>
                            <div class="mvp-cat">${t(w.labelKey)}</div>
                            <div class="mvp-winner" style="color:${w.winnerColor}">${w.winnerName}</div>
                            <div class="mvp-value">${w.value.toLocaleString()}</div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-primary mvp-continue">${t('mvp.continue', 'Continue')}</button>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('.mvp-continue').addEventListener('click', () => {
            overlay.remove();
            if (typeof onContinue === 'function') onContinue();
        });
    }
}

// Singleton & global exposure
const _instance = new MultiplayerExtras();
if (typeof window !== 'undefined') {
    window.MultiplayerExtras = _instance;
    window.MP_EMOTES = EMOTES;
    window.MP_REVIVE_RANGE = REVIVE_RANGE;
    window.MP_REVIVE_DOWNED_MS = REVIVE_DOWNED_MS;
}

export default _instance;
