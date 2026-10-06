// enemies.js — enemy archetypes, behaviors, bosses and the spawn director table.

import { TAU, angleTo, dist, clamp, rand, randRange, chance } from '../engine/utils.js';
import { COLORS, eliteChance } from './config.js';
import { createStatus } from './elements.js';

// Steer an enemy toward a point at its current speed with light smoothing.
function steerTo(e, tx, ty, dt, speedMul = 1) {
  const a = angleTo(e.x, e.y, tx, ty);
  const sp = e.speed * speedMul;
  e.vx += (Math.cos(a) * sp - e.vx) * Math.min(1, dt * 6);
  e.vy += (Math.sin(a) * sp - e.vy) * Math.min(1, dt * 6);
}

function fireAt(world, e, tx, ty, speed, dmg, r, color) {
  const a = angleTo(e.x, e.y, tx, ty);
  world.enemyBullets.push({
    x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
    r: r || 7, dmg, life: 4, color: color || COLORS.danger,
  });
}

function ringBurst(world, e, count, speed, dmg, color, offset = 0, life = 4) {
  for (let i = 0; i < count; i++) {
    const a = offset + (i / count) * TAU;
    world.enemyBullets.push({
      x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      r: 8, dmg, life, color: color || COLORS.void,
    });
  }
}

// ---- shared attack primitives --------------------------------------------
// Small, composable bullet patterns reused by the richer mobs and by every
// boss ability, so new content is a couple of lines rather than a bespoke
// emitter. All push onto world.enemyBullets (no new world hooks needed).

// Aimed cone of `n` bullets centred on the player, `spread` radians apart.
function aimedSpread(world, e, n, spread, speed, dmg, color, life = 4, r = 8) {
  const base = angleTo(e.x, e.y, world.player.x, world.player.y);
  for (let i = 0; i < n; i++) {
    const a = base + (i - (n - 1) / 2) * spread;
    world.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, dmg, life, color });
  }
}

// One tick of a rotating spiral emitter (advances e.sweepA). `arms` bullets per
// tick evenly spaced; call on a short cadence while in a spiral phase.
function spiralEmit(world, e, arms, step, speed, dmg, color, life = 3.6, r = 7) {
  e.sweepA = (e.sweepA || 0) + step;
  for (let k = 0; k < arms; k++) {
    const a = e.sweepA + (k / arms) * TAU;
    world.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, dmg, life, color });
  }
}

// A broad bullet "wall" aimed at the player with a single dodgeable gap: `span`
// bullets across `arc` radians, the centre lane left open so a moving player can
// thread it — the staple telegraphed boss attack that rewards positioning.
function wallWithGap(world, e, span, arc, speed, dmg, color, life = 4.5, r = 8) {
  const base = angleTo(e.x, e.y, world.player.x, world.player.y);
  const gapHalf = 0.16; // fraction of the span left open at centre
  for (let i = 0; i < span; i++) {
    const f = span === 1 ? 0 : i / (span - 1) - 0.5; // -0.5..0.5
    if (Math.abs(f) < gapHalf) continue; // leave the dodge lane
    const a = base + f * arc;
    world.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, dmg, life, color });
  }
}

// Concentric expanding ring-bursts (a shock-nova). `rings` rings of `per`
// bullets each, launched at staggered speeds so they read as waves rolling out.
function novaRings(world, e, rings, per, speed, dmg, color, offset = 0) {
  for (let ring = 0; ring < rings; ring++) {
    const sp = speed * (0.6 + ring * 0.32);
    ringBurst(world, e, per, sp, dmg, color, offset + ring * 0.2, 4);
  }
}

// Drop a small fan of minions beside the boss (summon pattern).
function spawnMinions(world, e, types, n, distAway = 80) {
  const base = angleTo(e.x, e.y, world.player.x, world.player.y);
  for (let i = 0; i < n; i++) {
    const a = base + (i - (n - 1) / 2) * 0.4;
    const key = types[i % types.length];
    world.spawnEnemy(key, e.x + Math.cos(a) * distAway, e.y + Math.sin(a) * distAway);
  }
}

// Hurl the boss toward the player (a charge/lunge) at `mult`× its base speed.
function lungeAt(e, world, mult = 6) {
  const a = angleTo(e.x, e.y, world.player.x, world.player.y);
  e.vx = Math.cos(a) * e.speed * mult;
  e.vy = Math.sin(a) * e.speed * mult;
}

// ---- boss framework: telegraphs, phases and a shared "brain" -------------

// Announce an incoming special so the player can prep an evasive manoeuvre: a
// floating label plus an on-boss warning cue (drawn by world.drawTelegraph from
// e.tele). `aim` true draws a lance toward the player for directional attacks.
function warn(world, e, label, color, dur, aim = false) {
  e.tele = { label, color, t: dur, dur, aim };
  world.addText?.(e.x, e.y - e.radius - 34, label, color, 18);
  world.audio?.play('bosswarn');
  world.shake?.(5);
}

// Phase index from remaining HP: 0 (>66%), 1 (>33%), 2 (enrage, <=33%). Bosses
// escalate — faster cadence and extra patterns — as they are worn down. Falls
// back to phase 0 when HP is unknown (defensive, e.g. isolated unit tests).
function phaseOf(e) {
  const f = (e.maxHp && e.hp != null) ? e.hp / e.maxHp : 1;
  return f > 0.66 ? 0 : f > 0.33 ? 1 : 2;
}

// Hover / strafe / chase movement shared by the bosses.
function moveBoss(e, dt, world, style) {
  const p = world.player;
  const d = dist(e.x, e.y, p.x, p.y);
  if (style === 'chase') {
    steerTo(e, p.x, p.y, dt, 0.85);
  } else if (style === 'strafe') {
    if (d > 420) steerTo(e, p.x, p.y, dt, 0.85);
    else {
      const a = angleTo(e.x, e.y, p.x, p.y) + Math.PI / 2;
      steerTo(e, e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80, dt, 0.9);
    }
  } else { // 'hover' — keep a mid distance, drift laterally
    if (d > 420) steerTo(e, p.x, p.y, dt, 0.7);
    else if (d < 250) steerTo(e, p.x, p.y, dt, -0.6);
    else {
      const a = angleTo(e.x, e.y, p.x, p.y) + Math.PI / 2;
      steerTo(e, e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, dt, 0.7);
    }
  }
}

// The shared boss brain. Keeps each boss definition tiny — just a `cfg`:
//   move:      'hover' | 'strafe' | 'chase'
//   spin:      core spin rate
//   novaColor: colour of the phase-change clearing nova
//   ambient(e, dt, world, phase):  optional continuous low-pressure fire
//   abilities: [{ label, color, windup, cd, minPhase, aim, fire(e, world, phase) }]
// Abilities are cycled round-robin (filtered by the current phase) and each is
// telegraphed for its `windup` seconds before firing, then goes on `cd` cooldown.
// Higher phases shorten the windup, so enraged bosses feel frantic but still fair.
function bossThink(e, dt, world, cfg) {
  e.spin = (e.spin || 0) + dt * (cfg.spin || 1);

  // Phase escalation — announce + a clearing nova on each new phase so the fight
  // visibly "turns up" and the player gets breathing room to reposition.
  const ph = phaseOf(e);
  if (e._phase === undefined) e._phase = 0;
  if (ph > e._phase) {
    e._phase = ph;
    world.addText?.(e.x, e.y - e.radius - 50, ph >= 2 ? 'ENRAGE' : 'PHASE ' + (ph + 1), COLORS.gold, 24);
    world.audio?.play('implode');
    world.shake?.(14);
    ringBurst(world, e, 20, 240, Math.round(e.damage * 0.5), cfg.novaColor || e.color, e.spin, 3.5);
  }

  moveBoss(e, dt, world, cfg.move || 'hover');
  if (cfg.ambient) cfg.ambient(e, dt, world, e._phase);

  // Mid-telegraph: brace (ease to a stop) and fire when the windup elapses.
  if (e.tele && e.tele.t > 0) {
    e.tele.t -= dt;
    e.vx *= 0.86; e.vy *= 0.86;
    if (e.tele.t <= 0) {
      const ab = e._pending; e.tele = null; e._pending = null;
      if (ab) { ab.fire(e, world, e._phase); world.audio?.play('bossfire'); }
      e.abilityT = (ab && ab.cd) || 2.2;
    }
    return;
  }

  // Choose the next ability (round-robin, phase-gated) and telegraph it.
  e.abilityT = (e.abilityT ?? (cfg.firstDelay ?? 1.6)) - dt;
  if (e.abilityT <= 0) {
    const avail = cfg.abilities.filter((a) => (a.minPhase || 0) <= e._phase);
    if (!avail.length) { e.abilityT = 1.2; return; }
    e._abi = ((e._abi ?? -1) + 1) % avail.length;
    const ab = avail[e._abi];
    const windup = Math.max(0.2, (ab.windup ?? 0.7) * (e._phase >= 2 ? 0.7 : 1));
    warn(world, e, ab.label, ab.color || e.color, windup, ab.aim);
    e._pending = ab;
  }
}

export const ENEMY_TYPES = {
  drone: {
    key: 'drone', name: 'Drone', hp: 22, speed: 96, radius: 14, damage: 9, xp: 1,
    color: '#ff5d7a', shape: 'tri',
    update(e, dt, world) { steerTo(e, world.player.x, world.player.y, dt); },
  },
  swarm: {
    key: 'swarm', name: 'Swarmling', hp: 10, speed: 170, radius: 9, damage: 6, xp: 1,
    color: '#ff9f43', shape: 'diamond',
    update(e, dt, world) {
      e.wob = (e.wob || rand() * TAU) + dt * 8;
      const px = world.player.x + Math.cos(e.wob) * 14;
      const py = world.player.y + Math.sin(e.wob) * 14;
      steerTo(e, px, py, dt);
    },
  },
  spitter: {
    key: 'spitter', name: 'Spitter', hp: 26, speed: 74, radius: 15, damage: 8, xp: 2,
    color: '#8affc1', shape: 'pentagon',
    update(e, dt, world) {
      const d = dist(e.x, e.y, world.player.x, world.player.y);
      if (d < 240) steerTo(e, world.player.x, world.player.y, dt, -0.8);
      else if (d > 360) steerTo(e, world.player.x, world.player.y, dt, 0.9);
      else {
        const a = angleTo(e.x, e.y, world.player.x, world.player.y) + Math.PI / 2;
        steerTo(e, e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40, dt, 0.6);
      }
      e.shootT = (e.shootT || randRange(0, 1.6)) - dt;
      if (e.shootT <= 0 && d < 560) {
        e.shootT = 1.7;
        fireAt(world, e, world.player.x, world.player.y, 310, e.damage, 7, '#8affc1');
        world.audio?.play('espit');
      }
    },
  },
  dasher: {
    key: 'dasher', name: 'Stalker', hp: 30, speed: 82, radius: 14, damage: 14, xp: 2,
    color: '#ff3df0', shape: 'arrow',
    update(e, dt, world) {
      e.state = e.state || 'approach';
      e.timer = (e.timer ?? randRange(0.8, 2.2)) - dt;
      const d = dist(e.x, e.y, world.player.x, world.player.y);
      if (e.state === 'approach') {
        steerTo(e, world.player.x, world.player.y, dt, 0.85);
        if (e.timer <= 0 && d < 460) { e.state = 'windup'; e.timer = 0.38; }
      } else if (e.state === 'windup') {
        e.vx *= 0.8; e.vy *= 0.8;
        if (e.timer <= 0) {
          const a = angleTo(e.x, e.y, world.player.x, world.player.y);
          e.vx = Math.cos(a) * e.speed * 6;
          e.vy = Math.sin(a) * e.speed * 6;
          e.state = 'dash'; e.timer = 0.34; world.audio?.play('edash');
        }
      } else if (e.state === 'dash') {
        if (e.timer <= 0) { e.state = 'approach'; e.timer = randRange(1, 2); }
      }
    },
  },
  splitter: {
    key: 'splitter', name: 'Splitter', hp: 44, speed: 88, radius: 18, damage: 11, xp: 3,
    color: '#b06bff', shape: 'blob',
    update(e, dt, world) { steerTo(e, world.player.x, world.player.y, dt); },
    onDeath(e, world) {
      if (e.isSplit) return;
      for (let i = 0; i < 2; i++) {
        const c = world.spawnEnemy('swarm', e.x + randRange(-14, 14), e.y + randRange(-14, 14));
        if (c) {
          c.isSplit = true; c.hp = c.maxHp = 16; c.radius = 11; c.color = '#c79bff'; c.xp = 1;
        }
      }
    },
  },
  brute: {
    key: 'brute', name: 'Brute', hp: 150, speed: 54, radius: 27, damage: 20, xp: 6,
    color: '#ff6a3d', shape: 'hex', massive: true,
    update(e, dt, world) { steerTo(e, world.player.x, world.player.y, dt); },
  },

  // ---- "OG alien invaders" archetypes --------------------------------------
  // Classic Space-Invaders-style critters. Bilaterally-symmetric pixel shapes
  // (see world.drawShape) that march, weave and fire the way a retro fleet does.
  squid: {
    // Small top-row invader: fast, weaves down toward the player in waves.
    key: 'squid', name: 'Squid', hp: 16, speed: 128, radius: 11, damage: 7, xp: 1,
    color: COLORS.invCyan, shape: 'squid',
    update(e, dt, world) {
      e.wave = (e.wave ?? rand() * TAU) + dt * 6;
      const toward = angleTo(e.x, e.y, world.player.x, world.player.y);
      const perp = toward + Math.PI / 2;
      const tx = world.player.x + Math.cos(perp) * Math.sin(e.wave) * 70;
      const ty = world.player.y + Math.sin(perp) * Math.sin(e.wave) * 70;
      steerTo(e, tx, ty, dt, 1);
    },
  },
  crab: {
    // Middle-row invader: strafes side-to-side in formation while creeping in,
    // lobbing the occasional aimed shot.
    key: 'crab', name: 'Crab', hp: 30, speed: 72, radius: 15, damage: 10, xp: 2,
    color: COLORS.invGreen, shape: 'crab',
    update(e, dt, world) {
      e.march = (e.march ?? rand() * TAU) + dt * 2.4;
      const toward = angleTo(e.x, e.y, world.player.x, world.player.y);
      const perp = toward + Math.PI / 2;
      // sideways strafe layered over a slow advance -> a marching column feel
      const tx = world.player.x + Math.cos(perp) * Math.sin(e.march) * 110;
      const ty = world.player.y + Math.sin(perp) * Math.sin(e.march) * 110;
      steerTo(e, tx, ty, dt, 0.95);
      e.shootT = (e.shootT ?? randRange(1, 2.2)) - dt;
      if (e.shootT <= 0 && dist(e.x, e.y, world.player.x, world.player.y) < 600) {
        e.shootT = randRange(1.6, 2.6);
        fireAt(world, e, world.player.x, world.player.y, 285, e.damage, 7, COLORS.invGreen);
        world.audio?.play('espit');
      }
    },
  },
  ufo: {
    // Bonus saucer: keeps its distance, drifts laterally and fires aimed shots.
    key: 'ufo', name: 'Saucer', hp: 40, speed: 92, radius: 16, damage: 11, xp: 4,
    color: COLORS.invRed, shape: 'ufo',
    update(e, dt, world) {
      const d = dist(e.x, e.y, world.player.x, world.player.y);
      if (d > 430) steerTo(e, world.player.x, world.player.y, dt, 0.85);
      else if (d < 300) steerTo(e, world.player.x, world.player.y, dt, -0.7);
      else {
        const a = angleTo(e.x, e.y, world.player.x, world.player.y) + Math.PI / 2;
        steerTo(e, e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80, dt, 0.8);
      }
      e.beamT = (e.beamT ?? randRange(0.8, 2)) - dt;
      if (e.beamT <= 0 && d < 680) {
        e.beamT = 1.5;
        const a = angleTo(e.x, e.y, world.player.x, world.player.y);
        for (let k = -1; k <= 1; k += 2) {
          const aa = a + k * 0.09;
          world.enemyBullets.push({
            x: e.x, y: e.y, vx: Math.cos(aa) * 330, vy: Math.sin(aa) * 330,
            r: 7, dmg: e.damage, life: 4, color: COLORS.invRed,
          });
        }
        world.audio?.play('espit');
      }
    },
  },
  octopus: {
    // Bottom-row heavy: tanky, slow, lobs a small aimed spread.
    key: 'octopus', name: 'Octopus', hp: 56, speed: 52, radius: 17, damage: 12, xp: 3,
    color: COLORS.invMagenta, shape: 'octopus',
    update(e, dt, world) {
      steerTo(e, world.player.x, world.player.y, dt, 0.7);
      e.volleyT = (e.volleyT ?? randRange(1.2, 2.4)) - dt;
      const d = dist(e.x, e.y, world.player.x, world.player.y);
      if (e.volleyT <= 0 && d < 600) {
        e.volleyT = 2.6;
        const a = angleTo(e.x, e.y, world.player.x, world.player.y);
        for (let k = -2; k <= 2; k++) {
          const aa = a + k * 0.22;
          world.enemyBullets.push({
            x: e.x, y: e.y, vx: Math.cos(aa) * 265, vy: Math.sin(aa) * 265,
            r: 8, dmg: e.damage, life: 3.6, color: COLORS.invMagenta,
          });
        }
        world.audio?.play('espit');
      }
    },
  },

  // ---- Expansion archetypes ------------------------------------------------
  // Area-denial skirmisher: hovers at mid range and sows drifting spore-mines
  // that linger as a slow hazard field (reuses the enemy-bullet primitive with a
  // near-stationary velocity, so no new world hooks are needed).
  seeder: {
    key: 'seeder', name: 'Seeder', hp: 40, speed: 70, radius: 15, damage: 9, xp: 3,
    color: '#7bdcb5', shape: 'blob',
    update(e, dt, world) {
      const d = dist(e.x, e.y, world.player.x, world.player.y);
      if (d < 260) steerTo(e, world.player.x, world.player.y, dt, -0.7);
      else if (d > 380) steerTo(e, world.player.x, world.player.y, dt, 0.85);
      else {
        const a = angleTo(e.x, e.y, world.player.x, world.player.y) + Math.PI / 2;
        steerTo(e, e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 50, dt, 0.6);
      }
      e.sowT = (e.sowT ?? randRange(1.2, 2.2)) - dt;
      if (e.sowT <= 0 && d < 560) {
        e.sowT = 2.6;
        const n = 3;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + rand() * 0.5;
          world.enemyBullets.push({
            x: e.x, y: e.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60,
            r: 9, dmg: e.damage, life: 3, color: '#7bdcb5',
          });
        }
        world.audio?.play('espit');
      }
    },
  },
  // Siege artillery: slow, tanky and gravity-resistant (massive) like the Brute,
  // but anchors the swarm by lobbing a rotating ring of flak on a cadence — the
  // first non-boss bullet-hell pressure, arriving in the late game.
  sentinel: {
    key: 'sentinel', name: 'Sentinel', hp: 120, speed: 40, radius: 24, damage: 16, xp: 5,
    color: COLORS.invAmber, shape: 'hex', massive: true,
    update(e, dt, world) {
      steerTo(e, world.player.x, world.player.y, dt, 0.45);
      e.burstT = (e.burstT ?? randRange(1.4, 2.4)) - dt;
      if (e.burstT <= 0 && dist(e.x, e.y, world.player.x, world.player.y) < 680) {
        e.burstT = 2.8;
        ringBurst(world, e, 10, 200, Math.round(e.damage * 0.7), COLORS.invAmber, e.spin, 4);
        world.audio?.play('bossfire');
      }
    },
  },

  // ---- Theme skirmishers ---------------------------------------------------
  // A second tier of mobs that makes the swarm read as more than "chase you":
  // orbiters circle, bombers blossom on death, weavers blink, frostlings and
  // sparklings zone with aimed fire and mortars lob area-denial. Each reuses an
  // existing silhouette + bullet primitive, so no new render/world hooks.

  // Keeps its distance and circles the player on a fixed orbit, sniping inward.
  orbiter: {
    key: 'orbiter', name: 'Orbiter', hp: 34, speed: 150, radius: 12, damage: 9, xp: 2,
    color: COLORS.invCyan, shape: 'diamond',
    update(e, dt, world) {
      const p = world.player;
      const d = dist(e.x, e.y, p.x, p.y);
      const a = angleTo(e.x, e.y, p.x, p.y);
      const ring = 220;                 // preferred orbit radius
      const radial = d - ring;          // +ve => too far, step in; -ve => back off
      const tang = a + Math.PI / 2;     // tangent for the circling motion
      const tx = e.x + Math.cos(tang) * 60 - Math.cos(a) * radial;
      const ty = e.y + Math.sin(tang) * 60 - Math.sin(a) * radial;
      steerTo(e, tx, ty, dt, 1);
      e.shootT = (e.shootT ?? randRange(0.6, 1.4)) - dt;
      if (e.shootT <= 0 && d < 520) {
        e.shootT = 1.3;
        fireAt(world, e, p.x, p.y, 300, e.damage, 7, COLORS.invCyan);
        world.audio?.play('espit');
      }
    },
  },
  // Slow fire-blob that detonates into a ring of flak when destroyed — rewards
  // killing it at range and punishes face-tanking it.
  bomber: {
    key: 'bomber', name: 'Bomber', hp: 42, speed: 72, radius: 16, damage: 12, xp: 3,
    color: COLORS.fire, shape: 'blob',
    update(e, dt, world) { steerTo(e, world.player.x, world.player.y, dt, 0.9); },
    onDeath(e, world) {
      ringBurst(world, e, 12, 215, Math.max(6, Math.round(e.damage * 0.7)), COLORS.fire, rand() * TAU, 3.2);
      world.audio?.play('implode');
      world.shake(5);
    },
  },
  // Phase-stalker: closes in, then blinks a short distance toward the player on a
  // cadence (a teleport read via a particle puff) so it is hard to pin down.
  weaver: {
    key: 'weaver', name: 'Weaver', hp: 30, speed: 120, radius: 12, damage: 12, xp: 2,
    color: COLORS.invMagenta, shape: 'arrow',
    update(e, dt, world) {
      const p = world.player;
      steerTo(e, p.x, p.y, dt, 0.9);
      e.blinkT = (e.blinkT ?? randRange(1.6, 2.6)) - dt;
      if (e.blinkT <= 0) {
        e.blinkT = randRange(1.8, 2.8);
        const d = dist(e.x, e.y, p.x, p.y);
        if (d > 170) {
          const a = angleTo(e.x, e.y, p.x, p.y);
          const hop = Math.min(180, d * 0.6);
          e.x += Math.cos(a) * hop;
          e.y += Math.sin(a) * hop;
          world.particles?.burst(e.x, e.y, COLORS.invMagenta, 10, { speed: 200, life: 0.4, size: 3, budget: 360 });
          world.audio?.play('edash');
        }
      }
    },
  },
  // Cryo zoner: hangs at range and fires slow aimed frost spreads.
  frostling: {
    key: 'frostling', name: 'Frostling', hp: 28, speed: 92, radius: 12, damage: 9, xp: 2,
    color: COLORS.cryo, shape: 'diamond',
    update(e, dt, world) {
      const p = world.player;
      const d = dist(e.x, e.y, p.x, p.y);
      if (d < 240) steerTo(e, p.x, p.y, dt, -0.6);
      else steerTo(e, p.x, p.y, dt, 0.8);
      e.shootT = (e.shootT ?? randRange(1, 2)) - dt;
      if (e.shootT <= 0 && d < 520) {
        e.shootT = 1.8;
        aimedSpread(world, e, 3, 0.16, 250, e.damage, COLORS.cryo);
        world.audio?.play('espit');
      }
    },
  },
  // Fast electric harrier: zig-zags across the player and snaps off quick 2-shots.
  sparkling: {
    key: 'sparkling', name: 'Sparkling', hp: 18, speed: 205, radius: 10, damage: 8, xp: 2,
    color: COLORS.shock, shape: 'squid',
    update(e, dt, world) {
      e.wob = (e.wob ?? rand() * TAU) + dt * 10;
      const toward = angleTo(e.x, e.y, world.player.x, world.player.y);
      const perp = toward + Math.PI / 2;
      const tx = world.player.x + Math.cos(perp) * Math.sin(e.wob) * 90;
      const ty = world.player.y + Math.sin(perp) * Math.sin(e.wob) * 90;
      steerTo(e, tx, ty, dt, 1.05);
      e.shootT = (e.shootT ?? randRange(0.8, 1.6)) - dt;
      if (e.shootT <= 0 && dist(e.x, e.y, world.player.x, world.player.y) < 480) {
        e.shootT = 1.4;
        aimedSpread(world, e, 2, 0.12, 330, e.damage, COLORS.shock);
      }
    },
  },
  // Siege mortar: near-stationary (massive) area-denial that lobs slow drifting
  // clusters, forcing the player to keep moving through the mid game.
  mortar: {
    key: 'mortar', name: 'Mortar', hp: 78, speed: 42, radius: 18, damage: 13, xp: 4,
    color: COLORS.invAmber, shape: 'hex', massive: true,
    update(e, dt, world) {
      steerTo(e, world.player.x, world.player.y, dt, 0.4);
      e.lobT = (e.lobT ?? randRange(1.6, 2.6)) - dt;
      if (e.lobT <= 0 && dist(e.x, e.y, world.player.x, world.player.y) < 640) {
        e.lobT = 2.6;
        const a = angleTo(e.x, e.y, world.player.x, world.player.y);
        for (let k = -1; k <= 1; k++) {
          const aa = a + k * 0.26;
          world.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(aa) * 120, vy: Math.sin(aa) * 120, r: 10, dmg: e.damage, life: 3.6, color: COLORS.invAmber });
        }
        world.audio?.play('bossfire');
      }
    },
  },
};

export const BOSS_TYPES = {
  // Each boss is a thin `cfg` over the shared bossThink brain: distinct movement,
  // an ambient pressure pattern and a set of telegraphed, phase-gated specials so
  // every fight reads differently and escalates through three phases. Definition
  // order matches the theme order in waves.js (one boss per 10-wave theme), and
  // the hand-tuned hp ramps across the ten slots toward the wave-100 finale.

  // ---- Theme 0 · Crimson Vanguard · wave 10 --------------------------------
  // A relentless red bruiser that chases, spawns swarms and charges. The teaching
  // boss: big obvious tells, simple patterns, rewards learning to dodge the lunge.
  devourer: {
    key: 'devourer', name: 'The Devourer', hp: 2200, speed: 50, radius: 50, damage: 24, xp: 60,
    color: '#ff3b6b', shape: 'boss', boss: true, massive: true,
    update(e, dt, world) {
      bossThink(e, dt, world, {
        move: 'chase', spin: 0.8, novaColor: COLORS.danger,
        abilities: [
          { label: 'RADIAL BURST', windup: 0.8, cd: 2.4,
            fire(e, w) { ringBurst(w, e, 16, 200, 12, COLORS.danger, e.spin, 4); w.shake?.(8); } },
          { label: 'SPAWN SWARM', windup: 0.6, cd: 2.8,
            fire(e, w) { spawnMinions(w, e, ['swarm', 'drone'], 4); } },
          { label: 'DEVOUR CHARGE', windup: 0.9, cd: 3.0, aim: true, minPhase: 1,
            fire(e, w) { lungeAt(e, w, 7); w.audio?.play('edash'); w.shake?.(10); } },
          { label: 'CRIMSON NOVA', windup: 1.0, cd: 3.2, minPhase: 2,
            fire(e, w) { novaRings(w, e, 3, 14, 180, 13, COLORS.danger, e.spin); w.shake?.(12); } },
        ],
      });
    },
  },

  // ---- Theme 1 · Azure Sentinels · wave 20 ---------------------------------
  // A cyan duelist: constant frost-spiral ambient, telegraphed gapped frost walls
  // and a blink strike. Teaches threading a wall through its dodge lane.
  warden: {
    key: 'warden', name: 'The Warden', hp: 2700, speed: 60, radius: 46, damage: 24, xp: 75,
    color: '#51e9ff', shape: 'boss', boss: true, massive: true,
    update(e, dt, world) {
      bossThink(e, dt, world, {
        move: 'strafe', spin: 2.2, novaColor: COLORS.cryo,
        ambient(e, dt, w, ph) {
          e._amT = (e._amT ?? 0.16) - dt;
          if (e._amT <= 0) { e._amT = ph >= 2 ? 0.1 : 0.16; spiralEmit(w, e, 2, 0.4, 200, 10, COLORS.cryo); }
        },
        abilities: [
          { label: 'FROST WALL', windup: 0.85, cd: 2.6, aim: true,
            fire(e, w) { wallWithGap(w, e, 13, 1.7, 260, 12, COLORS.cryo); } },
          { label: 'CROSS SWEEP', windup: 0.8, cd: 2.4,
            fire(e, w) { ringBurst(w, e, 20, 220, 11, COLORS.cryo, e.spin, 4); ringBurst(w, e, 20, 220, 11, COLORS.shield, e.spin + 0.16, 4); } },
          { label: 'BLINK STRIKE', windup: 0.7, cd: 2.8, aim: true, minPhase: 1,
            fire(e, w) { lungeAt(e, w, 6); w.audio?.play('edash'); } },
          { label: 'GLACIAL NOVA', windup: 1.0, cd: 3.2, minPhase: 2,
            fire(e, w) { novaRings(w, e, 3, 16, 190, 12, COLORS.cryo, e.spin); w.shake?.(12); } },
        ],
      });
    },
  },

  // ---- Theme 2 · Verdant Hive · wave 30 ------------------------------------
  // A green brood-mother built around adds: hatches minions, rains slow spores and
  // sprays acid. Pressure comes from the board filling up, not raw bullet speed.
  hivequeen: {
    key: 'hivequeen', name: 'The Hive Queen', hp: 3200, speed: 48, radius: 50, damage: 23, xp: 85,
    color: COLORS.invGreen, shape: 'boss', boss: true, massive: true,
    update(e, dt, world) {
      bossThink(e, dt, world, {
        move: 'hover', spin: 1.0, novaColor: COLORS.invGreen,
        ambient(e, dt, w, ph) {
          e._amT = (e._amT ?? 0.7) - dt;
          if (e._amT <= 0) { e._amT = ph >= 2 ? 0.5 : 0.8; aimedSpread(w, e, 1, 0, 230, 10, COLORS.invGreen); }
        },
        abilities: [
          { label: 'BROOD HATCH', windup: 0.7, cd: 3.4,
            fire(e, w) { spawnMinions(w, e, ['swarm', 'bomber', 'splitter'], 4); } },
          { label: 'SPORE RING', windup: 0.85, cd: 2.6,
            fire(e, w) { ringBurst(w, e, 18, 150, 11, COLORS.invGreen, e.spin, 4.5); } },
          { label: 'ACID SPREAD', windup: 0.9, cd: 2.8, aim: true,
            fire(e, w) { aimedSpread(w, e, 7, 0.14, 275, 11, COLORS.invGreen); } },
          { label: 'HIVE FRENZY', windup: 1.0, cd: 3.6, minPhase: 2,
            fire(e, w) { spawnMinions(w, e, ['sparkling', 'swarm'], 6); ringBurst(w, e, 16, 180, 12, COLORS.invGreen, e.spin, 4); w.shake?.(10); } },
        ],
      });
    },
  },

  // ---- Theme 3 · Amber Legion · wave 40 ------------------------------------
  // An amber artillery marshal: the first true bullet-hell boss. Dense gapped flak
  // walls, arc barrages and deployed mortars demand constant repositioning.
  siegemarshal: {
    key: 'siegemarshal', name: 'The Siege Marshal', hp: 3700, speed: 52, radius: 52, damage: 25, xp: 95,
    color: COLORS.invAmber, shape: 'boss', boss: true, massive: true,
    update(e, dt, world) {
      bossThink(e, dt, world, {
        move: 'strafe', spin: 1.4, novaColor: COLORS.invAmber,
        abilities: [
          { label: 'FLAK WALL', windup: 0.9, cd: 2.6, aim: true,
            fire(e, w) { wallWithGap(w, e, 15, 1.8, 240, 12, COLORS.invAmber); } },
          { label: 'ARC BARRAGE', windup: 0.85, cd: 2.8,
            fire(e, w) { novaRings(w, e, 2, 20, 210, 12, COLORS.invAmber, e.spin); } },
          { label: 'MORTAR LINE', windup: 0.8, cd: 3.2,
            fire(e, w) { spawnMinions(w, e, ['mortar'], 2, 110); aimedSpread(w, e, 5, 0.16, 200, 12, COLORS.invAmber); } },
          { label: 'SIEGE STORM', windup: 1.1, cd: 3.6, minPhase: 2,
            fire(e, w) { novaRings(w, e, 4, 18, 200, 13, COLORS.invAmber, e.spin); w.shake?.(14); } },
        ],
      });
    },
  },

  // ---- Theme 4 · Void Choir · wave 50 --------------------------------------
  // The void flagship (massive, so it ignores the player's Singularity pulls — a
  // proper duel): a rotating plasma spiral, collapse bursts and an event horizon.
  singularis: {
    key: 'singularis', name: 'The Singularis', hp: 4300, speed: 50, radius: 50, damage: 25, xp: 100,
    color: COLORS.void, shape: 'boss', boss: true, massive: true,
    update(e, dt, world) {
      bossThink(e, dt, world, {
        move: 'hover', spin: 1.2, novaColor: COLORS.void,
        ambient(e, dt, w, ph) {
          e._amT = (e._amT ?? 0.14) - dt;
          if (e._amT <= 0) { e._amT = ph >= 2 ? 0.1 : 0.14; spiralEmit(w, e, 2, 0.42, 200, 12, COLORS.void); }
        },
        abilities: [
          { label: 'COLLAPSE', windup: 0.85, cd: 2.8,
            fire(e, w) { ringBurst(w, e, 18, 210, 14, COLORS.void, e.spin, 4); spawnMinions(w, e, ['swarm', 'seeder'], 4); w.shake?.(10); } },
          { label: 'VOID LANCE', windup: 0.9, cd: 2.6, aim: true,
            fire(e, w) { wallWithGap(w, e, 13, 1.6, 250, 13, COLORS.void); } },
          { label: 'SINGULAR PULL', windup: 0.9, cd: 3.0, minPhase: 1,
            fire(e, w) { novaRings(w, e, 2, 18, 195, 13, COLORS.void, e.spin); } },
          { label: 'EVENT HORIZON', windup: 1.1, cd: 3.4, minPhase: 2,
            fire(e, w) { novaRings(w, e, 4, 16, 200, 13, COLORS.void, e.spin); w.shake?.(16); } },
        ],
      });
    },
  },

  // ---- Theme 5 · Saucer Armada · wave 60 -----------------------------------
  // The retro UFO mothership: aimed invader volleys for ambient pressure, rotating
  // sweeps, beam walls and fleet summons. A busy, "classic shmup" flagship.
  mothership: {
    key: 'mothership', name: 'The Mothership', hp: 5000, speed: 50, radius: 54, damage: 25, xp: 110,
    color: COLORS.saucer, shape: 'mothership', boss: true, massive: true,
    update(e, dt, world) {
      bossThink(e, dt, world, {
        move: 'hover', spin: 1.5, novaColor: COLORS.saucer,
        ambient(e, dt, w, ph) {
          e._amT = (e._amT ?? 0.6) - dt;
          if (e._amT <= 0) { e._amT = ph >= 2 ? 0.4 : 0.6; aimedSpread(w, e, 3, 0.18, 250, 12, COLORS.saucer); }
        },
        abilities: [
          { label: 'SPIRAL SWEEP', windup: 0.85, cd: 2.6,
            fire(e, w) { ringBurst(w, e, 24, 210, 11, COLORS.shock, e.spin, 4); } },
          { label: 'SUMMON FLEET', windup: 0.7, cd: 3.2,
            fire(e, w) { spawnMinions(w, e, ['squid', 'crab', 'ufo'], 5); } },
          { label: 'BEAM WALL', windup: 0.9, cd: 2.8, aim: true,
            fire(e, w) { wallWithGap(w, e, 15, 1.7, 250, 12, COLORS.saucer); } },
          { label: 'ARMADA', windup: 1.0, cd: 3.6, minPhase: 2,
            fire(e, w) { spawnMinions(w, e, ['ufo', 'sparkling'], 6); ringBurst(w, e, 18, 200, 12, COLORS.saucer, e.spin, 4); w.shake?.(12); } },
        ],
      });
    },
  },

  // ---- Theme 6 · Spectral Shoal · wave 70 ----------------------------------
  // A magenta phantom that teleports around the arena, fires fast spectral lances
  // and gapped walls, and summons blinking weavers. Punishes losing track of it.
  phantom: {
    key: 'phantom', name: 'The Phantom', hp: 5400, speed: 72, radius: 48, damage: 26, xp: 120,
    color: COLORS.invMagenta, shape: 'boss', boss: true, massive: true,
    update(e, dt, world) {
      bossThink(e, dt, world, {
        move: 'strafe', spin: 2.4, novaColor: COLORS.invMagenta,
        abilities: [
          { label: 'PHASE SHIFT', windup: 0.7, cd: 2.4,
            fire(e, w) {
              const ang = rand() * TAU, rr = 320;
              e.x = w.player.x + Math.cos(ang) * rr; e.y = w.player.y + Math.sin(ang) * rr;
              e.vx = 0; e.vy = 0;
              w.particles?.burst(e.x, e.y, COLORS.invMagenta, 24, { speed: 260, life: 0.5, size: 4, budget: 480 });
              w.shake?.(8);
            } },
          { label: 'SPECTRAL WALL', windup: 0.85, cd: 2.6, aim: true,
            fire(e, w) { wallWithGap(w, e, 13, 1.6, 270, 13, COLORS.invMagenta); } },
          { label: 'GHOST LANCE', windup: 0.8, cd: 2.4, aim: true,
            fire(e, w) { aimedSpread(w, e, 5, 0.1, 340, 13, COLORS.invMagenta); } },
          { label: 'HAUNT', windup: 0.9, cd: 3.2, minPhase: 1,
            fire(e, w) { spawnMinions(w, e, ['weaver'], 3); } },
          { label: 'SPECTRAL NOVA', windup: 1.0, cd: 3.4, minPhase: 2,
            fire(e, w) { novaRings(w, e, 3, 16, 200, 13, COLORS.invMagenta, e.spin); w.shake?.(12); } },
        ],
      });
    },
  },

  // ---- Theme 7 · Glacier Maw · wave 80 -------------------------------------
  // A huge, slow ice leviathan: towering HP, a grinding frost-spiral ambient and
  // overlapping glacier novas. A tank-and-spank endurance wall with big nova tells.
  cryoleviathan: {
    key: 'cryoleviathan', name: 'The Cryo Leviathan', hp: 6400, speed: 42, radius: 58, damage: 27, xp: 135,
    color: COLORS.cryo, shape: 'boss', boss: true, massive: true,
    update(e, dt, world) {
      bossThink(e, dt, world, {
        move: 'hover', spin: 0.8, novaColor: COLORS.cryo,
        ambient(e, dt, w, ph) {
          e._amT = (e._amT ?? 0.2) - dt;
          if (e._amT <= 0) { e._amT = ph >= 2 ? 0.14 : 0.2; spiralEmit(w, e, 1, 0.5, 175, 10, COLORS.cryo); }
        },
        abilities: [
          { label: 'GLACIER NOVA', windup: 0.95, cd: 2.8,
            fire(e, w) { novaRings(w, e, 3, 18, 190, 13, COLORS.cryo, e.spin); } },
          { label: 'ICE WALL', windup: 0.95, cd: 2.8, aim: true,
            fire(e, w) { wallWithGap(w, e, 17, 1.9, 230, 13, COLORS.cryo); } },
          { label: 'FROST BROOD', windup: 0.8, cd: 3.2,
            fire(e, w) { spawnMinions(w, e, ['frostling', 'octopus'], 4); } },
          { label: 'ABSOLUTE ZERO', windup: 1.2, cd: 3.8, minPhase: 2,
            fire(e, w) { novaRings(w, e, 4, 20, 200, 14, COLORS.cryo, e.spin); w.shake?.(18); } },
        ],
      });
    },
  },

  // ---- Theme 8 · Plasma Storm · wave 90 ------------------------------------
  // A frantic electric herald: a near-constant bolt ambient plus very fast thunder
  // walls and chain-storm novas. The highest bullet velocity before the finale.
  stormherald: {
    key: 'stormherald', name: 'The Storm Herald', hp: 6900, speed: 64, radius: 52, damage: 27, xp: 145,
    color: COLORS.shock, shape: 'boss', boss: true, massive: true,
    update(e, dt, world) {
      bossThink(e, dt, world, {
        move: 'strafe', spin: 2.6, novaColor: COLORS.shock,
        ambient(e, dt, w, ph) {
          e._amT = (e._amT ?? 0.4) - dt;
          if (e._amT <= 0) { e._amT = ph >= 2 ? 0.26 : 0.4; aimedSpread(w, e, 2, 0.14, 300, 11, COLORS.shock); }
        },
        abilities: [
          { label: 'CHAIN STORM', windup: 0.8, cd: 2.4,
            fire(e, w) { novaRings(w, e, 2, 22, 250, 12, COLORS.shock, e.spin); } },
          { label: 'THUNDER WALL', windup: 0.8, cd: 2.4, aim: true,
            fire(e, w) { wallWithGap(w, e, 15, 1.7, 300, 13, COLORS.shock); } },
          { label: 'STATIC FIELD', windup: 0.8, cd: 3.0,
            fire(e, w) { spawnMinions(w, e, ['sparkling', 'orbiter'], 5); } },
          { label: 'OVERLOAD', windup: 1.0, cd: 3.4, minPhase: 2,
            fire(e, w) { novaRings(w, e, 4, 18, 240, 13, COLORS.shock, e.spin); w.shake?.(14); } },
        ],
      });
    },
  },

  // ---- Theme 9 · Dread Nemesis · wave 100 ----------------------------------
  // The finale: every tool at once. A dense triple-arm spiral ambient, omega walls,
  // annihilation novas, a mixed legion of adds, a crimson lance+charge and — at
  // enrage — a Final Judgment that fills the arena. The climax of the run.
  nemesis: {
    key: 'nemesis', name: 'The Nemesis', hp: 9000, speed: 60, radius: 58, damage: 28, xp: 200,
    color: COLORS.invRed, shape: 'boss', boss: true, massive: true,
    update(e, dt, world) {
      bossThink(e, dt, world, {
        move: 'strafe', spin: 3.0, novaColor: COLORS.white,
        ambient(e, dt, w, ph) {
          e._amT = (e._amT ?? 0.14) - dt;
          if (e._amT <= 0) { e._amT = ph >= 2 ? 0.1 : 0.14; spiralEmit(w, e, 3, 0.36, 210, 12, COLORS.danger); }
        },
        abilities: [
          { label: 'OMEGA WALL', windup: 0.85, cd: 2.4, aim: true,
            fire(e, w) { wallWithGap(w, e, 19, 2.0, 280, 14, COLORS.danger); } },
          { label: 'ANNIHILATE', windup: 0.9, cd: 2.6,
            fire(e, w) { novaRings(w, e, 4, 20, 210, 14, COLORS.danger, e.spin); w.shake?.(12); } },
          { label: 'LEGION', windup: 0.8, cd: 3.2,
            fire(e, w) { spawnMinions(w, e, ['dasher', 'weaver', 'mortar', 'bomber'], 6); } },
          { label: 'CRIMSON LANCE', windup: 0.8, cd: 3.0, aim: true, minPhase: 1,
            fire(e, w) { aimedSpread(w, e, 7, 0.12, 360, 14, COLORS.danger); lungeAt(e, w, 5); w.audio?.play('edash'); } },
          { label: 'FINAL JUDGMENT', windup: 1.2, cd: 4.0, minPhase: 2,
            fire(e, w) { novaRings(w, e, 5, 22, 220, 15, COLORS.danger, e.spin); spawnMinions(w, e, ['sentinel'], 2, 120); w.shake?.(20); } },
        ],
      });
    },
  },
};

// Time-gated spawn table. Each entry: [typeKey, unlockSeconds, weightFn(t)].
const SPAWN_TABLE = [
  ['drone', 0, () => 10],
  ['swarm', 0, (t) => 6 + t * 0.04],
  ['squid', 15, (t) => 5 + t * 0.02],
  ['spitter', 25, () => 5],
  ['crab', 30, () => 5],
  ['dasher', 45, () => 4],
  ['ufo', 50, () => 3],
  ['splitter', 55, () => 3.5],
  ['octopus', 70, (t) => 3 + t * 0.01],
  ['brute', 80, (t) => 2 + t * 0.01],
  ['seeder', 60, (t) => 3 + t * 0.01],
  ['sentinel', 90, (t) => 2 + t * 0.008],
];

export function pickEnemyType(t, r = rand) {
  const avail = SPAWN_TABLE.filter((e) => t >= e[1]);
  let total = 0;
  for (const e of avail) total += e[2](t);
  let roll = (typeof r === 'function' ? r() : rand()) * total;
  for (const e of avail) {
    roll -= e[2](t);
    if (roll <= 0) return e[0];
  }
  return 'drone';
}

// Swarms and the smaller invaders should arrive in small packs for a juicier,
// "fleet" feel. Always returns a positive integer.
export function packSize(typeKey) {
  if (typeKey === 'swarm') return 3 + (chance(0.4) ? 2 : 0);
  if (typeKey === 'squid') return 2 + (chance(0.5) ? 2 : 0);
  if (typeKey === 'crab') return 2 + (chance(0.3) ? 1 : 0);
  return 1;
}

// Decide whether a freshly spawned enemy should be promoted to an elite. Pure so
// it can be unit-tested. Bosses and the xp:1 trash tier (drone/swarm/squid —
// which also arrive in packs) are never eligible, so elites always read as a
// single, heavier threat rather than a wall of buffed swarmlings.
export function rollElite(def, t, r = rand) {
  if (!def || def.boss || (def.xp || 0) < 2) return false;
  // r is normally an RNG function, but a caller may pass a pre-rolled sample in
  // [0,1) (deterministic replay/testing); honour it instead of discarding it.
  const roll = typeof r === 'function' ? r() : r;
  return roll < eliteChance(t);
}
