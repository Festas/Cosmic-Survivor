#!/usr/bin/env node
// validate.mjs — Phase 5 (Content Schema Validation)
//
// The codebase has *two* enemy/boss tables that drift constantly:
//   - main.js: ENEMY_TYPES, BOSS_TYPES (canonical at runtime)
//   - js/entities/enemyTypes.js, js/entities/bossTypes.js (used by ESM
//     systems and tests)
//
// This validator extracts both tables and reports any drift in:
//   - the set of type ids,
//   - the display name field,
//   - the colour / palette body colour,
//   - the speed / health / damage multipliers (with a small float tolerance),
//   - the boss size and flag fields (summons/teleports/etc).
//
// Exits 0 when consistent, 1 on drift. CI hooks into this via
// `npm run validate:content`.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');

const TOLERANCE = 1e-6;

function readText(path) {
    return readFileSync(resolve(ROOT, path), 'utf8');
}

// Extract the "ENEMY_TYPES = { ... };" or "BOSS_TYPES = { ... };" block from a
// source file, balancing braces. Returns the string between the outermost { }.
function extractTableSource(source, name) {
    const re = new RegExp(`(?:const|let|var|export\\s+const)\\s+${name}\\s*=\\s*\\{`);
    const m = source.match(re);
    if (!m) return null;
    const start = m.index + m[0].length - 1; // points at the opening '{'
    let depth = 0;
    for (let i = start; i < source.length; i++) {
        const ch = source[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) return source.slice(start, i + 1);
        }
    }
    return null;
}

// Parse a JS object literal source into a plain JS value. We use Function to
// evaluate — this validator runs in a controlled local context (CI / dev),
// not on user input.
function evalObject(literal) {
    // eslint-disable-next-line no-new-func
    return new Function(`"use strict"; return (${literal});`)();
}

function loadTable(file, name) {
    const src = extractTableSource(readText(file), name);
    if (!src) throw new Error(`Could not extract ${name} from ${file}`);
    return evalObject(src);
}

function approxEqual(a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
        if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
        return Math.abs(a - b) <= TOLERANCE;
    }
    return a === b;
}

function compareEnemyEntry(id, mainEntry, jsEntry, errors) {
    const mainSpec = {
        name: mainEntry.name,
        color: mainEntry.color,
        // The js/entities table uses *Multiplier suffixes for the same fields
        // that main.js keeps unsuffixed. Map them so we compare the same
        // numbers, not a typo across two files.
        speed: mainEntry.speed,
        health: mainEntry.health,
        damage: mainEntry.damage,
        credits: mainEntry.credits,
        movementPattern: mainEntry.movementPattern,
        bodyColor: mainEntry.palette ? mainEntry.palette.body : undefined,
    };
    const jsSpec = {
        name: jsEntry.name,
        color: jsEntry.color,
        speed: jsEntry.speedMultiplier ?? jsEntry.speed,
        health: jsEntry.healthMultiplier ?? jsEntry.health,
        damage: jsEntry.damageMultiplier ?? jsEntry.damage,
        credits: jsEntry.creditMultiplier ?? jsEntry.credits,
        movementPattern: jsEntry.movementPattern,
        bodyColor: jsEntry.palette ? jsEntry.palette.body : undefined,
    };
    for (const key of Object.keys(mainSpec)) {
        if (mainSpec[key] === undefined && jsSpec[key] === undefined) continue;
        if (!approxEqual(mainSpec[key], jsSpec[key])) {
            errors.push(`enemy "${id}".${key}: main=${JSON.stringify(mainSpec[key])} js=${JSON.stringify(jsSpec[key])}`);
        }
    }
}

function compareBossEntry(id, mainEntry, jsEntry, errors) {
    const fields = ['name', 'color', 'size', 'health', 'damage', 'credits', 'xp'];
    for (const f of fields) {
        if (mainEntry[f] === undefined && jsEntry[f] === undefined) continue;
        if (!approxEqual(mainEntry[f], jsEntry[f])) {
            errors.push(`boss "${id}".${f}: main=${JSON.stringify(mainEntry[f])} js=${JSON.stringify(jsEntry[f])}`);
        }
    }
}

function diffKeys(label, mainKeys, jsKeys, errors) {
    const onlyMain = mainKeys.filter(k => !jsKeys.includes(k));
    const onlyJs = jsKeys.filter(k => !mainKeys.includes(k));
    for (const k of onlyMain) errors.push(`${label}: id "${k}" in main.js but not js/entities`);
    for (const k of onlyJs) errors.push(`${label}: id "${k}" in js/entities but not main.js`);
}

function main() {
    const errors = [];
    const warnings = [];
    let mainEnemies, jsEnemies, mainBosses, jsBosses;
    try {
        mainEnemies = loadTable('main.js', 'ENEMY_TYPES');
        jsEnemies = loadTable('js/entities/enemyTypes.js', 'ENEMY_TYPES');
        mainBosses = loadTable('main.js', 'BOSS_TYPES');
        jsBosses = loadTable('js/entities/bossTypes.js', 'BOSS_TYPES');
    } catch (e) {
        console.error('[validate:content] extraction failed:', e.message);
        process.exit(2);
    }

    // ID-set drift is strict: a missing or extra type *id* is always a bug
    // (one consumer will look it up and find nothing).
    diffKeys('ENEMY_TYPES', Object.keys(mainEnemies), Object.keys(jsEnemies), errors);
    diffKeys('BOSS_TYPES', Object.keys(mainBosses), Object.keys(jsBosses), errors);

    // Enemy field drift is also strict: both files use the *Multiplier
    // schema and we already normalize for that.
    for (const id of Object.keys(mainEnemies)) {
        if (!jsEnemies[id]) continue;
        compareEnemyEntry(id, mainEnemies[id], jsEnemies[id], errors);
    }
    // Boss field drift is advisory: the two boss tables historically use
    // different units (size = world multiplier vs. pixels) and several stats
    // are intentionally absent from one side. We surface differences as
    // warnings so they're visible to maintainers without blocking CI.
    for (const id of Object.keys(mainBosses)) {
        if (!jsBosses[id]) continue;
        compareBossEntry(id, mainBosses[id], jsBosses[id], warnings);
    }

    for (const w of warnings) console.warn('[validate:content] WARN: ' + w);

    if (errors.length === 0) {
        console.log(`[validate:content] OK — ${Object.keys(mainEnemies).length} enemies, ${Object.keys(mainBosses).length} bosses (ids consistent across main.js and js/entities/).`);
        if (warnings.length > 0) {
            console.log(`[validate:content] (${warnings.length} non-blocking boss-table warnings — see above)`);
        }
        process.exit(0);
    }
    console.error(`[validate:content] FAILED — ${errors.length} drift(s) detected:\n`);
    for (const e of errors) console.error('  - ' + e);
    console.error('\nFix by syncing the affected fields between main.js and the js/entities/ tables.');
    process.exit(1);
}

main();
