// enemyBehaviors.js — Phase 5 (Enemies & Bosses)
//
// Drop-in AI behaviors that an enemy can opt into. The existing enemy update
// in `main.js` follows a giant switch on `movementPattern`; this module is
// strictly *additive* — it provides extra behaviors that more advanced
// enemies (and bosses) can use *on top of* their base movement.
//
// Each behavior is a pure function of (enemy, ctx) -> { dx, dy } adjustment
// that callers apply to the enemy's per-frame velocity. The `ctx` object
// gives behaviors access to allies, the player, and game-wide state without
// pulling in `main.js` directly (avoiding a circular import).

/**
 * Flanker behavior — instead of charging straight at the player, the enemy
 * tries to approach from the side perpendicular to the player's facing.
 * Mixes well with `chase` to produce enemies that feel like they're trying
 * to encircle the player rather than rushing in single file.
 *
 * @param {{x:number,y:number,size:number}} enemy
 * @param {{ player: {x:number,y:number,facingRight:boolean}, baseSpeed:number }} ctx
 * @returns {{dx:number, dy:number}}
 */
export function flank(enemy, ctx) {
    const player = ctx.player;
    if (!player) return { dx: 0, dy: 0 };
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 200) {
        // Close enough — switch to a sideways arc rather than a head-on
        // approach. We compute a vector perpendicular to the player-relative
        // direction, picking the side that the enemy is already closer to.
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const sign = (enemy.x - player.x) * perpX + (enemy.y - player.y) * perpY > 0 ? 1 : -1;
        return {
            dx: (perpX * sign * 0.7 + dx / dist * 0.3) * ctx.baseSpeed,
            dy: (perpY * sign * 0.7 + dy / dist * 0.3) * ctx.baseSpeed,
        };
    }
    // Too far — use a normal chase vector.
    return {
        dx: (dx / dist) * ctx.baseSpeed,
        dy: (dy / dist) * ctx.baseSpeed,
    };
}

/**
 * ShieldBuddy behavior — sticks close to the nearest *non-shielder* ally and
 * absorbs a fraction of damage targeted at them. The damage absorption itself
 * is wired by `applyShieldBuddyAbsorption` (called from the enemy
 * `takeDamage` path on the *protected* ally, not on the shielder).
 *
 * Movement: head toward the nearest ally; if already adjacent, orbit them.
 *
 * @param {any} enemy
 * @param {{ allies: any[], baseSpeed:number, frame:number }} ctx
 */
export function shieldBuddy(enemy, ctx) {
    const ally = findNearestAlly(enemy, ctx.allies);
    if (!ally) return { dx: 0, dy: 0 };
    enemy._shieldedAllyId = ally.__shieldId; // tag for the absorption helper
    const dx = ally.x - enemy.x;
    const dy = ally.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const desiredDist = ally.size + enemy.size + 4;
    if (dist > desiredDist + 6) {
        // Approach
        return {
            dx: (dx / dist) * ctx.baseSpeed,
            dy: (dy / dist) * ctx.baseSpeed,
        };
    }
    // Orbit slowly so we don't stack on the protected ally.
    const a = ctx.frame * 0.04;
    return {
        dx: Math.cos(a) * ctx.baseSpeed * 0.4,
        dy: Math.sin(a) * ctx.baseSpeed * 0.4,
    };
}

/**
 * Damage absorption helper: when an enemy with a shielder buddy nearby is
 * hit, divert `absorbFraction` of the damage to the shielder (which dies
 * first to expose its protégé). Returns the *adjusted* damage that the
 * original target should still take.
 *
 * @param {any} target enemy that was hit
 * @param {number} damage incoming damage
 * @param {{ enemies:any[], absorbFraction?:number }} ctx
 * @returns {number} damage to apply to `target`
 */
export function applyShieldBuddyAbsorption(target, damage, ctx) {
    if (!target || damage <= 0) return damage;
    const id = target.__shieldId;
    if (id == null) return damage;
    const absorb = ctx.absorbFraction ?? 0.5;
    // Find the shielder protecting *this* target.
    const enemies = ctx.enemies;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e === target || !e || !e.alive) continue;
        if (e.behavior !== 'shieldBuddy') continue;
        if (e._shieldedAllyId !== id) continue;
        const dist = Math.hypot(e.x - target.x, e.y - target.y);
        if (dist > 80) continue;
        const absorbed = damage * absorb;
        try { e.takeDamage(absorbed, false); } catch { /* defensive */ }
        return damage - absorbed;
    }
    return damage;
}

function findNearestAlly(self, allies) {
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < allies.length; i++) {
        const a = allies[i];
        if (!a || a === self) continue;
        if (a.behavior === 'shieldBuddy') continue; // shielders don't shield other shielders
        const d = Math.hypot(a.x - self.x, a.y - self.y);
        if (d < bestDist) {
            bestDist = d;
            best = a;
        }
    }
    return best;
}

// Single registry so `main.js` can dispatch by name without importing each
// function individually.
export const ENEMY_BEHAVIORS = Object.freeze({
    flank,
    shieldBuddy,
});

/**
 * Tag every enemy in `enemies` with a stable __shieldId for absorption
 * targeting. Idempotent and cheap; safe to call every frame.
 */
let _shieldIdCounter = 1;
export function ensureShieldIds(enemies) {
    for (let i = 0; i < enemies.length; i++) {
        if (enemies[i] && enemies[i].__shieldId == null) {
            enemies[i].__shieldId = _shieldIdCounter++;
        }
    }
}
