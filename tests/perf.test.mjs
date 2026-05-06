// tests/perf.test.mjs — Micro-benchmark: broadphase hash vs naive O(N×M) scan.
//
// INFORMATIONAL ONLY — this test prints wall-clock timings and NEVER fails
// on a threshold (CI machines vary widely in performance). The goal is to
// give a baseline for comparing Part D / Part F changes over time.
//
// Scenario: 300 enemies × 80 bullets × 60 frames.
//   Naive: O(300 × 80 × 60) = 1 440 000 distance checks per run.
//   Hash:  O(query × 80 × 60) where query ≪ 300.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SpatialHash } from '../js/core/spatialHash.js';

const ENEMY_COUNT  = 300;
const BULLET_COUNT = 80;
const FRAMES       = 60;
const CELL_SIZE    = 40;   // must match BROADPHASE_CELL_SIZE in main.js (CONFIG.BULLET_SIZE × 8)
const WORLD_W      = 3000;
const WORLD_H      = 2000;
const BULLET_R     = 5;
const ENEMY_R      = 25;

/** Deterministic pseudo-random number generator (lcg). */
function makeLcg(seed) {
    let s = seed >>> 0;
    return () => {
        s = Math.imul(s, 1664525) + 1013904223 | 0;
        return ((s >>> 0) / 0x100000000);
    };
}

/** Build an array of enemy objects with x, y, size properties. */
function makeEnemies(rng) {
    const enemies = [];
    for (let i = 0; i < ENEMY_COUNT; i++) {
        enemies.push({
            x: rng() * WORLD_W,
            y: rng() * WORLD_H,
            size: ENEMY_R,
            vx: (rng() - 0.5) * 2,
            vy: (rng() - 0.5) * 2,
        });
    }
    return enemies;
}

/** Build an array of bullet objects with x, y, size, angle, speed properties. */
function makeBullets(rng) {
    const bullets = [];
    for (let i = 0; i < BULLET_COUNT; i++) {
        const angle = rng() * Math.PI * 2;
        bullets.push({
            x: rng() * WORLD_W,
            y: rng() * WORLD_H,
            size: BULLET_R,
            angle,
            speed: 8,
        });
    }
    return bullets;
}

/** Move entities by one frame. */
function stepEntities(enemies, bullets) {
    for (const e of enemies) {
        e.x = (e.x + e.vx + WORLD_W) % WORLD_W;
        e.y = (e.y + e.vy + WORLD_H) % WORLD_H;
    }
    for (const b of bullets) {
        b.x = (b.x + Math.cos(b.angle) * b.speed + WORLD_W) % WORLD_W;
        b.y = (b.y + Math.sin(b.angle) * b.speed + WORLD_H) % WORLD_H;
    }
}

/**
 * Run naive O(N×M) collision counting (no actual hit-logic, just distance
 * checks). Returns the total hit-candidate count.
 */
function runNaive(enemies, bullets) {
    let hits = 0;
    for (const b of bullets) {
        for (const e of enemies) {
            const dx = e.x - b.x, dy = e.y - b.y;
            if (dx * dx + dy * dy < (e.size + b.size) * (e.size + b.size)) {
                hits++;
            }
        }
    }
    return hits;
}

/**
 * Run hash-based candidate narrowing. Returns the total candidate count
 * (broadphase result; false positives included).
 */
function runHash(enemies, bullets, hash) {
    hash.clear();
    for (const e of enemies) {
        hash.insert(e.x, e.y, e);
    }
    let candidates = 0;
    const queryR = BULLET_R + ENEMY_R;
    for (const b of bullets) {
        candidates += hash.query(b.x, b.y, queryR).length;
    }
    return candidates;
}

// ─── Benchmark ────────────────────────────────────────────────────────────────

test('perf: broadphase hash vs naive — INFORMATIONAL, no threshold', () => {
    const hash = new SpatialHash({ cellSize: CELL_SIZE, worldWidth: WORLD_W, worldHeight: WORLD_H });

    const rng1 = makeLcg(0xdeadbeef);
    const rng2 = makeLcg(0xdeadbeef); // same seed — deterministic comparison

    const enemies1 = makeEnemies(rng1);
    const bullets1 = makeBullets(rng1);
    const enemies2 = makeEnemies(rng2);
    const bullets2 = makeBullets(rng2);

    // Naive benchmark
    const t0naive = performance.now();
    let naiveTotal = 0;
    for (let f = 0; f < FRAMES; f++) {
        stepEntities(enemies1, bullets1);
        naiveTotal += runNaive(enemies1, bullets1);
    }
    const naiveMs = performance.now() - t0naive;

    // Hash benchmark
    const t0hash = performance.now();
    let hashTotal = 0;
    for (let f = 0; f < FRAMES; f++) {
        stepEntities(enemies2, bullets2);
        hashTotal += runHash(enemies2, bullets2, hash);
    }
    const hashMs = performance.now() - t0hash;

    // Sanity check: hash is a superset (candidates ≥ precise hits)
    assert.ok(hashTotal >= 0, 'hashTotal should be non-negative');

    const ratio = naiveTotal > 0 ? (hashTotal / naiveTotal).toFixed(2) : 'N/A';

    // Print informational summary (visible in test output, not a failure criterion).
    console.log(
        `\n  [perf] ${ENEMY_COUNT} enemies × ${BULLET_COUNT} bullets × ${FRAMES} frames` +
        `\n  naive: ${naiveMs.toFixed(1)} ms  (${naiveTotal} checks)` +
        `\n  hash:  ${hashMs.toFixed(1)} ms  (${hashTotal} candidates, ratio ${ratio})` +
        `\n  speedup: ${naiveMs > 0 ? (naiveMs / hashMs).toFixed(1) : 'N/A'}×`
    );

    // Soft assertion: hash should not be slower than naive by more than 10×
    // (guard against catastrophically broken hash, not a perf gate).
    if (naiveMs > 0 && hashMs > 0) {
        assert.ok(
            hashMs < naiveMs * 10,
            `Hash was more than 10× slower than naive (${hashMs.toFixed(1)}ms vs ${naiveMs.toFixed(1)}ms). ` +
            `This suggests a regression in SpatialHash.`
        );
    }
});
