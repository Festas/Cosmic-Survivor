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
      e.shootT = (e.shootT || randRange(0, 2)) - dt;
      if (e.shootT <= 0 && d < 520) {
        e.shootT = 2.2;
        fireAt(world, e, world.player.x, world.player.y, 260, e.damage, 7, '#8affc1');
        world.audio?.play('espit');
      }
    },
  },
  dasher: {
    key: 'dasher', name: 'Stalker', hp: 30, speed: 82, radius: 14, damage: 13, xp: 2,
    color: '#ff3df0', shape: 'arrow',
    update(e, dt, world) {
      e.state = e.state || 'approach';
      e.timer = (e.timer ?? randRange(1, 3)) - dt;
      const d = dist(e.x, e.y, world.player.x, world.player.y);
      if (e.state === 'approach') {
        steerTo(e, world.player.x, world.player.y, dt, 0.8);
        if (e.timer <= 0 && d < 420) { e.state = 'windup'; e.timer = 0.45; }
      } else if (e.state === 'windup') {
        e.vx *= 0.8; e.vy *= 0.8;
        if (e.timer <= 0) {
          const a = angleTo(e.x, e.y, world.player.x, world.player.y);
          e.vx = Math.cos(a) * e.speed * 5.5;
          e.vy = Math.sin(a) * e.speed * 5.5;
          e.state = 'dash'; e.timer = 0.32; world.audio?.play('edash');
        }
      } else if (e.state === 'dash') {
        if (e.timer <= 0) { e.state = 'approach'; e.timer = randRange(1.4, 2.6); }
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
      e.shootT = (e.shootT ?? randRange(1.2, 2.8)) - dt;
      if (e.shootT <= 0 && dist(e.x, e.y, world.player.x, world.player.y) < 560) {
        e.shootT = randRange(2.2, 3.4);
        fireAt(world, e, world.player.x, world.player.y, 240, e.damage, 7, COLORS.invGreen);
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
      e.beamT = (e.beamT ?? randRange(1, 2.4)) - dt;
      if (e.beamT <= 0 && d < 640) {
        e.beamT = 2;
        fireAt(world, e, world.player.x, world.player.y, 300, e.damage, 7, COLORS.invRed);
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
      e.volleyT = (e.volleyT ?? randRange(1.6, 3)) - dt;
      const d = dist(e.x, e.y, world.player.x, world.player.y);
      if (e.volleyT <= 0 && d < 560) {
        e.volleyT = 3.4;
        const a = angleTo(e.x, e.y, world.player.x, world.player.y);
        for (let k = -1; k <= 1; k++) {
          const aa = a + k * 0.26;
          world.enemyBullets.push({
            x: e.x, y: e.y, vx: Math.cos(aa) * 230, vy: Math.sin(aa) * 230,
            r: 8, dmg: e.damage, life: 3.4, color: COLORS.invMagenta,
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
      e.sowT = (e.sowT ?? randRange(1.4, 2.6)) - dt;
      if (e.sowT <= 0 && d < 520) {
        e.sowT = 3.2;
        const n = 2;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + rand() * 0.5;
          world.enemyBullets.push({
            x: e.x, y: e.y, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55,
            r: 9, dmg: e.damage, life: 2.8, color: '#7bdcb5',
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
      e.burstT = (e.burstT ?? randRange(1.8, 3)) - dt;
      if (e.burstT <= 0 && dist(e.x, e.y, world.player.x, world.player.y) < 620) {
        e.burstT = 3.6;
        ringBurst(world, e, 7, 170, Math.round(e.damage * 0.7), COLORS.invAmber, e.spin, 4);
        world.audio?.play('bossfire');
      }
    },
  },
};

export const BOSS_TYPES = {
  devourer: {
    key: 'devourer', name: 'The Devourer', hp: 2600, speed: 46, radius: 50, damage: 26, xp: 60,
    color: '#ff3b6b', shape: 'boss', boss: true, massive: true,
    update(e, dt, world) {
      steerTo(e, world.player.x, world.player.y, dt, 0.8);
      e.ringT = (e.ringT ?? 2) - dt;
      e.sumT = (e.sumT ?? 4) - dt;
      e.spin = (e.spin || 0) + dt * 0.8;
      if (e.ringT <= 0) {
        e.ringT = 3.2;
        ringBurst(world, e, 14, 190, 12, COLORS.danger, e.spin, 4);
        world.audio?.play('bossfire');
        world.shake(8);
      }
      if (e.sumT <= 0) {
        e.sumT = 6.5;
        for (let i = 0; i < 3; i++) world.spawnEnemy('swarm', e.x + randRange(-40, 40), e.y + randRange(-40, 40));
      }
    },
  },
  warden: {
    key: 'warden', name: 'The Warden', hp: 3400, speed: 58, radius: 46, damage: 24, xp: 75,
    color: '#51e9ff', shape: 'boss', boss: true, massive: true,
    update(e, dt, world) {
      e.state = e.state || 'strafe';
      e.timer = (e.timer ?? 3) - dt;
      e.spin = (e.spin || 0) + dt * 2.2;
      const d = dist(e.x, e.y, world.player.x, world.player.y);
      if (e.state === 'strafe') {
        if (d > 360) steerTo(e, world.player.x, world.player.y, dt, 0.9);
        else { const a = angleTo(e.x, e.y, world.player.x, world.player.y) + Math.PI / 2; steerTo(e, e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, dt); }
        e.spiralT = (e.spiralT ?? 0.12) - dt;
        if (e.spiralT <= 0) {
          e.spiralT = 0.18;
          for (let k = 0; k < 2; k++) {
            const a = e.spin + k * Math.PI;
            world.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, r: 7, dmg: 10, life: 3.5, color: COLORS.cryo });
          }
        }
        if (e.timer <= 0) { e.state = 'charge'; e.timer = 0.5; }
      } else if (e.state === 'charge') {
        e.vx *= 0.9; e.vy *= 0.9;
        if (e.timer <= 0) {
          const a = angleTo(e.x, e.y, world.player.x, world.player.y);
          e.vx = Math.cos(a) * e.speed * 6; e.vy = Math.sin(a) * e.speed * 6;
          e.state = 'dash'; e.timer = 0.5; world.audio?.play('edash'); world.shake(6);
        }
      } else if (e.state === 'dash') {
        if (e.timer <= 0) { e.state = 'strafe'; e.timer = randRange(3, 5); }
      }
    },
  },
  mothership: {
    // Wide UFO flagship. Hovers at range and cycles three retro phases:
    //   volley  -> rapid aimed 3-shot invader fire
    //   sweep   -> a rotating spiral ring burst that walks around the arena
    //   summon  -> drops a small formation of invaders beside itself
    key: 'mothership', name: 'The Mothership', hp: 3000, speed: 50, radius: 52, damage: 24, xp: 80,
    color: COLORS.saucer, shape: 'mothership', boss: true, massive: true,
    update(e, dt, world) {
      // Hover-keep a mid distance from the player.
      const d = dist(e.x, e.y, world.player.x, world.player.y);
      if (d > 400) steerTo(e, world.player.x, world.player.y, dt, 0.7);
      else if (d < 260) steerTo(e, world.player.x, world.player.y, dt, -0.6);
      else {
        const a = angleTo(e.x, e.y, world.player.x, world.player.y) + Math.PI / 2;
        steerTo(e, e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, dt, 0.7);
      }

      e.phase = e.phase || 'volley';
      e.timer = (e.timer ?? 4) - dt;

      if (e.phase === 'volley') {
        e.volleyT = (e.volleyT ?? 0.6) - dt;
        if (e.volleyT <= 0) {
          e.volleyT = 0.7;
          const a = angleTo(e.x, e.y, world.player.x, world.player.y);
          for (let k = -1; k <= 1; k++) {
            const aa = a + k * 0.18;
            world.enemyBullets.push({
              x: e.x, y: e.y, vx: Math.cos(aa) * 250, vy: Math.sin(aa) * 250,
              r: 8, dmg: 12, life: 3.8, color: COLORS.saucer,
            });
          }
          world.audio?.play('espit');
        }
        if (e.timer <= 0) { e.phase = 'sweep'; e.timer = 3; world.shake(6); }
      } else if (e.phase === 'sweep') {
        e.sweepT = (e.sweepT ?? 0.1) - dt;
        if (e.sweepT <= 0) {
          e.sweepT = 0.14;
          e.sweepA = (e.sweepA || 0) + 0.5; // rotate the emitter -> spiral
          for (let k = 0; k < 2; k++) {
            const a = e.sweepA + k * Math.PI;
            world.enemyBullets.push({
              x: e.x, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200,
              r: 7, dmg: 11, life: 3.5, color: COLORS.shock,
            });
          }
        }
        if (e.timer <= 0) {
          e.phase = 'summon'; e.timer = 1.2;
          world.shake(8); world.audio?.play('bossfire');
          const n = 5;
          const base = angleTo(e.x, e.y, world.player.x, world.player.y);
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.32;
            world.spawnEnemy(i % 2 ? 'squid' : 'crab', e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80);
          }
        }
      } else { // summon dwell, then loop back to volley
        if (e.timer <= 0) { e.phase = 'volley'; e.timer = 4; }
      }
    },
  },
  // Void-gravity flagship tying the pack together: hovers at range and cycles a
  // rotating plasma spiral, a full collapse ring-burst, then summons an escort.
  // Massive, so it ignores the player's Singularity/Void pulls (a proper duel).
  singularis: {
    key: 'singularis', name: 'The Singularis', hp: 3200, speed: 50, radius: 50, damage: 24, xp: 80,
    color: COLORS.void, shape: 'boss', boss: true, massive: true,
    update(e, dt, world) {
      // Hover-keep a mid distance from the player (mirrors the Mothership).
      const d = dist(e.x, e.y, world.player.x, world.player.y);
      if (d > 420) steerTo(e, world.player.x, world.player.y, dt, 0.7);
      else if (d < 260) steerTo(e, world.player.x, world.player.y, dt, -0.6);
      else {
        const a = angleTo(e.x, e.y, world.player.x, world.player.y) + Math.PI / 2;
        steerTo(e, e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, dt, 0.7);
      }

      e.spin = (e.spin || 0) + dt * 1.2;
      e.phase = e.phase || 'spiral';
      e.timer = (e.timer ?? 5) - dt;

      if (e.phase === 'spiral') {
        e.emitT = (e.emitT ?? 0.09) - dt;
        if (e.emitT <= 0) {
          e.emitT = 0.14;
          e.sweepA = (e.sweepA || 0) + 0.42; // rotate the emitter -> spiral
          for (let k = 0; k < 2; k++) {
            const a = e.sweepA + k * Math.PI;
            world.enemyBullets.push({
              x: e.x, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200,
              r: 8, dmg: 12, life: 3.5, color: COLORS.void,
            });
          }
        }
        if (e.timer <= 0) { e.phase = 'collapse'; e.timer = 0.7; world.shake(7); }
      } else if (e.phase === 'collapse') {
        e.vx *= 0.9; e.vy *= 0.9; // brace, then erupt
        if (e.timer <= 0) {
          ringBurst(world, e, 18, 210, 14, COLORS.void, e.spin, 4);
          world.audio?.play('bossfire'); world.shake(12);
          const n = 4;
          const base = angleTo(e.x, e.y, world.player.x, world.player.y);
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.4;
            world.spawnEnemy(i % 2 ? 'swarm' : 'seeder', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70);
          }
          e.phase = 'summon'; e.timer = 1.4;
        }
      } else { // summon dwell, then loop back to the spiral
        if (e.timer <= 0) { e.phase = 'spiral'; e.timer = 5; }
      }
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
  const roll = typeof r === 'function' ? r() : rand();
  return roll < eliteChance(t);
}
