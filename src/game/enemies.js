// enemies.js — enemy archetypes, behaviors, bosses and the spawn director table.

import { TAU, angleTo, dist, clamp, rand, randRange, chance } from '../engine/utils.js';
import { COLORS } from './config.js';
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

function ringBurst(world, e, count, speed, dmg, color, offset = 0) {
  for (let i = 0; i < count; i++) {
    const a = offset + (i / count) * TAU;
    world.enemyBullets.push({
      x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      r: 8, dmg, life: 5, color: color || COLORS.void,
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
        e.ringT = 3.0;
        ringBurst(world, e, 20, 190, 12, COLORS.danger, e.spin);
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
          e.spiralT = 0.12;
          for (let k = 0; k < 2; k++) {
            const a = e.spin + k * Math.PI;
            world.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, r: 7, dmg: 10, life: 5, color: COLORS.cryo });
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
};

// Time-gated spawn table. Each entry: [typeKey, unlockSeconds, weightFn(t)].
const SPAWN_TABLE = [
  ['drone', 0, () => 10],
  ['swarm', 0, (t) => 6 + t * 0.04],
  ['spitter', 25, () => 5],
  ['dasher', 45, () => 4],
  ['splitter', 55, () => 3.5],
  ['brute', 80, (t) => 2 + t * 0.01],
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

// Swarms should arrive in small packs for a juicier feel.
export function packSize(typeKey) {
  if (typeKey === 'swarm') return 3 + (chance(0.4) ? 2 : 0);
  return 1;
}
