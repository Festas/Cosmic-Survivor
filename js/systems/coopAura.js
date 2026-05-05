// coopAura.js — Phase 6 (Seamless Multiplayer / Co-op Synergies)
//
// Adds a co-op-specific synergy: when a player projectile passes within
// `AURA_RADIUS` of an *ally* (remote player), it gains a temporary damage
// and pierce buff. This is the brief's "Player 1 shoots through Player 2's
// energy shield" mechanic, simplified to a passive aura that doesn't require
// either player to spend an active resource.
//
// The buff is computed entirely on the local client using state we already
// receive (`game.remotePlayers` is updated by `multiplayer-client.js`). No
// new server messages are required beyond an optional 'coop_buff' relay for
// VFX flair on the *donor* ally's screen.

const AURA_RADIUS = 80;
const DAMAGE_BONUS = 0.20; // +20%
const PIERCE_BONUS = 1;
// Throttle the broadcast VFX event so we can't spam the relay.
const BROADCAST_INTERVAL_MS = 300;

let lastBroadcastAt = 0;

/**
 * Inspect a bullet against the local + remote players. If the bullet just
 * crossed an ally's aura, apply the buff (idempotent — we tag the bullet so
 * it cannot be buffed twice by the same ally). Returns true if any buff
 * was applied this frame.
 *
 * @param {{ x:number, y:number, damage:number, pierce?:number, _coopBuffedBy?:Set<string> }} bullet
 * @param {{ remotePlayers:Map<string,{x:number,y:number}>, player:{x:number,y:number}, isMultiplayer:boolean, localPlayerId:string|null }} game
 * @returns {boolean}
 */
export function applyCoopAura(bullet, game) {
    if (!game || !game.isMultiplayer) return false;
    const allies = game.remotePlayers;
    if (!allies || allies.size === 0) return false;
    let buffed = false;
    for (const [pid, rp] of allies) {
        if (!rp || pid === game.localPlayerId) continue;
        const dx = rp.x - bullet.x;
        const dy = rp.y - bullet.y;
        if ((dx * dx + dy * dy) > AURA_RADIUS * AURA_RADIUS) continue;
        if (!bullet._coopBuffedBy) bullet._coopBuffedBy = new Set();
        if (bullet._coopBuffedBy.has(pid)) continue;
        bullet._coopBuffedBy.add(pid);
        bullet.damage = Math.round(bullet.damage * (1 + DAMAGE_BONUS));
        if (typeof bullet.pierce === 'number') bullet.pierce += PIERCE_BONUS;
        buffed = true;
    }
    return buffed;
}

/**
 * Optionally tell the *other* clients we just got a buff from one of them
 * (so they can play a celebratory sparkle on their ally indicator). The
 * server only relays events present in its GAME_EVENT_LIMITS map; if
 * `coop_buff` isn't whitelisted yet the server silently drops it, so this
 * function is safe to call regardless.
 *
 * @param {{ x:number, y:number }} bullet
 */
export function notifyCoopBuff(bullet) {
    // performance.now() and Date.now() use different epochs (since-load vs
    // since-Unix) but we only ever subtract two readings from the *same*
    // source within one process — so the absolute epoch doesn't matter,
    // only the delta does. The fallback to Date.now() exists for the
    // node:test environment where `performance` may be unavailable.
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - lastBroadcastAt < BROADCAST_INTERVAL_MS) return;
    lastBroadcastAt = now;
    const mp = (typeof window !== 'undefined') ? window.MultiplayerClient : null;
    if (!mp || typeof mp.sendGameEvent !== 'function') return;
    try {
        mp.sendGameEvent('coop_buff', {
            x: Math.round(bullet.x),
            y: Math.round(bullet.y),
        });
    } catch { /* best-effort */ }
}

export const COOP_AURA_RADIUS = AURA_RADIUS;
