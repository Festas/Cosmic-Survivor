// js/entities/Bullet.js
// Extracted from main.js – Part 5 of the renderer migration (§9 entity peeling).
//
// Migration rules:
//   - Class lifted verbatim; globals accessed via window.* at call-time.
//   - reset() method added for ObjectPool compatibility (PR #40).
//   - window.Bullet and window.EnemyBullet assigned at module load so
//     main.js continues to work without any callsite changes.
//   - No circular imports: Player.js and Bullet.js are siblings; each
//     reads the other via window.* aliases set at module-load time.

// ─── Bullet ──────────────────────────────────────────────────────────────────

export class Bullet {
    constructor(x, y, angle, owner, weapon) {
        const game = window.game;
        const CONFIG = window.CONFIG;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = CONFIG.BULLET_SPEED;
        this.size = CONFIG.BULLET_SIZE;
        // Phase 4 rework — stance + weather damage multipliers. Critical: only
        // apply when this bullet originates from the local player (so AI
        // turrets and split-shots driven by ENEMY damage don't get the boost).
        let stanceMult = 1;
        if (window.rework && owner === game.player) {
            if (window.rework.stance) {
                stanceMult *= window.rework.stance.modifiers.damageMultiplier;
            }
            if (window.rework.weather && window.rework.weather.current) {
                stanceMult *= window.rework.weather.current.playerDamageMultiplier || 1;
            }
        }
        this.damage = owner.damage * (weapon.damage || 1) * stanceMult;
        this.critChance = owner.critChance;
        // Stance grants a small flat crit-chance bonus (additive).
        if (window.rework && owner === game.player && window.rework.stance) {
            this.critChance = Math.min(1, this.critChance + window.rework.stance.modifiers.critChanceBonus);
        }
        this.critDamage = owner.critDamage;
        this.lifeSteal = owner.lifeSteal;
        this.color = weapon.color;
        this.explosion = weapon.explosion;
        this.piercing = 1;
        // `pierce` is the name used by the Phase 6 co-op aura system; we
        // mirror it onto `piercing` (the legacy field consumed by the hit
        // loop below) so a +pierce buff actually increases the legacy
        // hit-count cap. Keep them in sync via the helper below.
        this.pierce = 1;
        this.hitEnemies = [];
        // Remember the source weapon so per-bullet effects (e.g. split shot)
        // can spawn matching projectiles regardless of which orbiting weapon
        // fired this bullet.
        this.weapon = weapon;
        // Mark whether this bullet is locally-owned (coop aura only buffs
        // bullets that *I* fired).
        this._isLocalPlayerBullet = (owner === game.player);
        // Part D rework — monotonic id for worker broadphase batch-query
        // tracking. Assigned from the shared counter on window.rework.broadphase
        // so it's stable across frames for as long as the bullet lives.
        // JavaScript is single-threaded on the main thread, so this increment
        // is always synchronous — no race conditions possible.
        this._bpId = (window.rework?.broadphase?._nextBulletId != null)
            ? window.rework.broadphase._nextBulletId++
            : 0;
        // Part E rework — fixed-timestep interpolation snapshot fields.
        this._interpPrevX = this.x;
        this._interpPrevY = this.y;
    }

    /**
     * Re-initialise all mutable instance fields to match a post-constructor
     * state. Enables pool reuse via ObjectPool (PR #40).
     */
    reset(x, y, angle, owner, weapon) {
        const game = window.game;
        const CONFIG = window.CONFIG;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = CONFIG.BULLET_SPEED;
        this.size = CONFIG.BULLET_SIZE;

        let stanceMult = 1;
        if (window.rework && owner === game.player) {
            if (window.rework.stance) {
                stanceMult *= window.rework.stance.modifiers.damageMultiplier;
            }
            if (window.rework.weather && window.rework.weather.current) {
                stanceMult *= window.rework.weather.current.playerDamageMultiplier || 1;
            }
        }
        this.damage = owner.damage * (weapon.damage || 1) * stanceMult;
        this.critChance = owner.critChance;
        if (window.rework && owner === game.player && window.rework.stance) {
            this.critChance = Math.min(1, this.critChance + window.rework.stance.modifiers.critChanceBonus);
        }
        this.critDamage = owner.critDamage;
        this.lifeSteal = owner.lifeSteal;
        this.color = weapon.color;
        this.explosion = weapon.explosion;
        this.piercing = 1;
        this.pierce = 1;
        this.hitEnemies = [];
        this.weapon = weapon;
        this._isLocalPlayerBullet = (owner === game.player);
        this._bpId = (window.rework?.broadphase?._nextBulletId != null)
            ? window.rework.broadphase._nextBulletId++
            : 0;
        this._interpPrevX = this.x;
        this._interpPrevY = this.y;
        // Clear any state added after construction
        this.isSplit = undefined;
        this.isMirror = undefined;
        this.bounceLeft = undefined;
        return this;
    }

    update() {
        const game = window.game;
        const CONFIG = window.CONFIG;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Phase 6 rework — co-op aura: passing near an ally buffs damage/pierce.
        // Cheap early-out for solo runs.
        if (this._isLocalPlayerBullet && window.rework && window.rework.coop) {
            if (window.rework.coop.applyAura(this, game)) {
                window.rework.coop.notify(this);
                // Coop aura mutates `this.pierce`; mirror onto the legacy
                // `piercing` field that the hit loop actually checks.
                if (typeof this.pierce === 'number' && this.pierce > this.piercing) {
                    this.piercing = this.pierce;
                }
            }
        }

        // Part D rework — broadphase-aware collision loop.
        // Default: hash (or worker) broadphase — O(query) instead of O(N×M).
        // Fallback: ?broadphase=naive keeps the exact legacy O(N×M) scan.
        //
        // Worker path (Part F): use last frame's batchResult if available and
        // from the matching tick; otherwise fall back to main-thread hash.
        const _bp = window.rework?.broadphase;
        let _candidates;
        let _useHashIndex = false; // true → candidates are from hash (not game.enemies)
        if (_bp && _bp.kind !== 'naive' && _bp._hash) {
            const _qT0 = performance.now();

            if (_bp.kind === 'worker' && _bp._workerTick === _bp._currentTick) {
                // Part F: use worker results from the previous tick's batchResult.
                const _wRes = _bp._workerResults[this._bpId];
                if (_wRes instanceof Int32Array && _wRes.length > 0) {
                    // Convert Int32Array of enemy indices to enemy objects.
                    const _eim = _bp._enemyIndexMap;
                    const _arr = [];
                    for (let _wi = 0; _wi < _wRes.length; _wi++) {
                        const _eobj = _eim[_wRes[_wi]];
                        if (_eobj) _arr.push(_eobj);
                    }
                    _candidates = _arr;
                    _useHashIndex = true;
                } else {
                    // Worker had no result for this bullet — fall through to hash.
                    _bp.staleResults = (_bp.staleResults || 0) + 1;
                }
            }

            if (!_candidates) {
                // Hash fallback (also the default 'hash' path).
                _candidates = _bp._hash.query(this.x, this.y, this.size + _bp._maxEnemyRadius);
                _useHashIndex = true;
            }

            _bp.lastQueryCount = (_bp.lastQueryCount || 0) + _candidates.length;
            _bp.lastQueryMs = (_bp.lastQueryMs || 0) + (performance.now() - _qT0);
        } else {
            // Naive O(N×M) path (?broadphase=naive or no window.rework).
            _candidates = game.enemies;
            _useHashIndex = false;
        }

        for (let i = _candidates.length - 1; i >= 0; i--) {
            const enemy = _candidates[i];
            if (this.hitEnemies.includes(enemy)) continue;
            // Guard: hash candidates can contain enemies already killed this
            // frame by a previous bullet (they've been removed from game.enemies
            // but still exist in the hash's scratch buffer). All Enemy instances
            // in game.enemies are guaranteed to have a `health` property, so no
            // undefined check is needed.
            if (_useHashIndex && enemy.health <= 0) continue;
            
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < enemy.size + this.size) {
                // Apply damage powerup
                const damageMult = window.getPowerupMultiplier('damage');
                const isCrit = Math.random() < this.critChance;
                let finalDamage = Math.floor(this.damage * damageMult * (isCrit ? this.critDamage : 1));
                // Phase 5 rework — shielder buddy absorbs a fraction of damage.
                if (window.rework && window.rework.applyShieldBuddyAbsorption) {
                    finalDamage = Math.floor(window.rework.applyShieldBuddyAbsorption(
                        enemy, finalDamage, { enemies: game.enemies, absorbFraction: 0.5 }
                    ));
                    if (finalDamage < 1) finalDamage = 1;
                }
                game.playerDPS.damage += finalDamage;
                
                if (this.explosion) {
                    this.explode();
                    return false;
                }
                
                if (enemy.takeDamage(finalDamage, isCrit)) {
                    // When iterating hash candidates we don't have the enemy's
                    // game.enemies index directly — find it via indexOf.
                    if (_useHashIndex) {
                        const idx = game.enemies.indexOf(enemy);
                        if (idx !== -1) game.enemies.splice(idx, 1);
                    } else {
                        game.enemies.splice(i, 1);
                    }
                    if (this.lifeSteal > 0) {
                        game.player.heal(Math.floor(finalDamage * this.lifeSteal));
                    }
                    
                    // Check if wave is cleared after enemy removal
                    window.checkWaveClear();
                }
                
                // Chain lightning
                if (game.player.chainLightningChance > 0 && Math.random() < game.player.chainLightningChance) {
                    const nearby = game.enemies.filter(ne => ne !== enemy && Math.hypot(ne.x - enemy.x, ne.y - enemy.y) < 150);
                    if (nearby.length > 0) {
                        const target = nearby[Math.floor(Math.random() * nearby.length)];
                        target.takeDamage(this.damage * 0.5, false);
                        game.particles.push({
                            x: enemy.x, y: enemy.y, x2: target.x, y2: target.y,
                            type: 'lightning_arc', color: '#00d4ff', life: 10, maxLife: 10
                        });
                    }
                }
                
                // Visual feedback for crits
                if (isCrit) {
                    window.createExplosion(enemy.x, enemy.y, '#ffd93d', 10);
                    window.Sound.play('crit');
                    // Phase 2 rework — short hit-stop on crits adds the
                    // classic "thwack" feel from the brief.
                    window.hitStop(35);
                }
                
                this.hitEnemies.push(enemy);
                // Split shot
                if (game.player && game.player.splitShot && !this.isSplit) {
                    const splitWeapon = this.weapon || window.WEAPON_TYPES.basic;
                    [this.angle + 0.5, this.angle - 0.5].forEach(a => {
                        const splitBullet = new window.Bullet(this.x, this.y, a, game.player, splitWeapon);
                        splitBullet.damage *= 0.5; splitBullet.isSplit = true; splitBullet.size *= 0.7;
                        game.bullets.push(splitBullet);
                    });
                }
                if (this.hitEnemies.length >= this.piercing) return false;
            }
        }

        // Bouncing bullets
        if (game.player && game.player.bulletBounce > 0) {
            if (this.bounceLeft === undefined) this.bounceLeft = game.player.bulletBounce;
            if (this.bounceLeft > 0) {
                if (this.x < 0 || this.x > CONFIG.WORLD_WIDTH) { this.angle = Math.PI - this.angle; this.x = Math.max(1, Math.min(CONFIG.WORLD_WIDTH - 1, this.x)); this.bounceLeft--; return true; }
                if (this.y < 0 || this.y > CONFIG.WORLD_HEIGHT) { this.angle = -this.angle; this.y = Math.max(1, Math.min(CONFIG.WORLD_HEIGHT - 1, this.y)); this.bounceLeft--; return true; }
            }
        }

        return this.x >= 0 && this.x <= CONFIG.WORLD_WIDTH && 
               this.y >= 0 && this.y <= CONFIG.WORLD_HEIGHT;
    }

    explode() {
        const game = window.game;
        game.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < this.explosion) {
                const finalDamage = Math.floor(this.damage * (1 - dist / this.explosion));
                if (enemy.takeDamage(finalDamage)) {
                    game.enemies = game.enemies.filter(e => e !== enemy);
                }
            }
        });
        window.createParticles(this.x, this.y, this.color, 20);
        
        // Check if wave is cleared after explosion
        window.checkWaveClear();
    }

    draw(ctx) {
    }
}

// ─── EnemyBullet ─────────────────────────────────────────────────────────────
// Enemy bullets are plain objects in main.js (with isEnemyBullet:true) but
// we provide a class here for pool compatibility. The factory at line 6074 of
// main.js already uses the same field shape.

export class EnemyBullet {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.speed = 0;
        this.size = 0;
        this.damage = 0;
        this.color = '#fff';
        this.isEnemyBullet = true;
        this._pool = null;
    }

    reset(x, y, angle, speed, size, damage, color) {
        this.x = x ?? 0;
        this.y = y ?? 0;
        this.angle = angle ?? 0;
        this.speed = speed ?? 0;
        this.size = size ?? 0;
        this.damage = damage ?? 0;
        this.color = color ?? '#fff';
        this._pool = null;
        return this;
    }
}

// ─── window aliases (must be set at module-load time) ────────────────────────
// main.js accesses these via `new Bullet(...)` and `new EnemyBullet(...)`.
window.Bullet = Bullet;
window.EnemyBullet = EnemyBullet;
