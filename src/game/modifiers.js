// modifiers.js — "Directives". Opt-in challenge modifiers the pilot toggles in the
// Hangar before a run. Each directive makes the run harder in some dimension and, in
// return, multiplies the Stardust earned. Directives stack: their Stardust bonuses
// multiply together, so stacking three tough directives is a real risk/reward gamble.
//
// Pure data + pure helpers (no DOM). World.reset folds the selected ids into a single
// `effect` object via computeDirectiveEffect and reads it at the spawn / damage / XP /
// reward call sites. A neutral effect (all multipliers 1) changes nothing, so running
// with no directives behaves exactly like the base game.

import { clamp } from '../engine/utils.js';

// Neutral effect: every field is a 1.0 multiplier. NOTE: spawnMul is an *interval*
// multiplier — values below 1 mean enemies spawn MORE often (shorter interval).
export function createDirectiveEffect() {
  return {
    hpMul: 1,        // enemy HP
    speedMul: 1,     // enemy move speed
    spawnMul: 1,     // spawn interval (<1 = faster spawns)
    capMul: 1,       // max concurrent enemies
    dmgTakenMul: 1,  // damage the player takes
    bossHpMul: 1,    // boss HP (on top of hpMul? no — bosses use bossHpMul only)
    xpMul: 1,        // XP gained from orbs
    stardustMul: 1,  // Stardust earned for the run
  };
}

function D(id, name, icon, desc, risk, stardustMul, apply) {
  return { id, name, icon, desc, risk, stardustMul, apply };
}

// The directive catalogue. `risk` is a short human label for the Hangar card; the real
// mechanical effect lives in apply(effect). `stardustMul` is the reward multiplier the
// directive contributes (multiplied together across all active directives).
export const DIRECTIVES = [
  D('elite', 'Elite Fleet', '💢', 'Enemies have +50% HP.', 'Tougher enemies', 1.25,
    (e) => { e.hpMul *= 1.5; }),
  D('blitz', 'Blitz Swarm', '🌀', 'Enemies move 25% faster.', 'Faster enemies', 1.2,
    (e) => { e.speedMul *= 1.25; }),
  D('frenzy', 'Frenzy', '🌊', 'Enemies spawn far more often.', 'Denser swarms', 1.3,
    (e) => { e.spawnMul *= 0.6; e.capMul *= 1.2; }),
  D('glass', 'Glass Protocol', '💔', 'You take +50% damage.', 'Fragile hull', 1.3,
    (e) => { e.dmgTakenMul *= 1.5; }),
  D('titans', 'Titan Bosses', '👹', 'Bosses have +80% HP.', 'Bulkier bosses', 1.25,
    (e) => { e.bossHpMul *= 1.8; }),
  D('lean', 'Lean Times', '📉', 'XP gain reduced by 20%.', 'Slower leveling', 1.2,
    (e) => { e.xpMul *= 0.8; }),
  D('nightmare', 'Nightmare', '☠️', 'Enemies gain +30% HP and +15% speed.', 'All-round harder', 1.4,
    (e) => { e.hpMul *= 1.3; e.speedMul *= 1.15; }),
];

export const DIRECTIVE_BY_ID = Object.create(null);
for (const d of DIRECTIVES) DIRECTIVE_BY_ID[d.id] = d;

// Fold a list of directive ids into a single effect object. Unknown ids are ignored.
export function computeDirectiveEffect(ids = []) {
  const eff = createDirectiveEffect();
  const seen = new Set();
  for (const id of ids) {
    const def = DIRECTIVE_BY_ID[id];
    if (!def || seen.has(id)) continue;
    seen.add(id);
    def.apply(eff);
    eff.stardustMul *= def.stardustMul;
  }
  // Guard against pathological combinations making the run impossible / trivial.
  eff.hpMul = clamp(eff.hpMul, 0.1, 10);
  eff.speedMul = clamp(eff.speedMul, 0.1, 6);
  eff.spawnMul = clamp(eff.spawnMul, 0.2, 4);
  eff.capMul = clamp(eff.capMul, 0.5, 4);
  eff.dmgTakenMul = clamp(eff.dmgTakenMul, 0.5, 6);
  eff.bossHpMul = clamp(eff.bossHpMul, 0.1, 10);
  eff.xpMul = clamp(eff.xpMul, 0.25, 4);
  eff.stardustMul = clamp(eff.stardustMul, 1, 20);
  return eff;
}

// Convenience: the combined Stardust multiplier for a set of active directives.
export function directiveStardustMultiplier(ids = []) {
  return computeDirectiveEffect(ids).stardustMul;
}
