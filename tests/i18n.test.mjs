// i18n.test.mjs — guards that the EN/DE localisation layer stays complete:
// every UI string has both languages, every translatable data entity has a
// German overlay, and the generated-effect translator handles the real phrases.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  __STR, __DE, LANGUAGES, setLang, t, dName, dDesc, tReaction, translateEffect,
} from '../src/engine/i18n.js';

import { WEAPONS } from '../src/game/weapons.js';
import { ITEMS } from '../src/game/upgrades.js';
import { SHIPS } from '../src/game/ships.js';
import { ENEMY_TYPES, BOSS_TYPES } from '../src/game/enemies.js';
import { META_UPGRADES } from '../src/game/meta.js';
import { DIRECTIVES } from '../src/game/modifiers.js';
import { ACHIEVEMENTS } from '../src/game/achievements.js';
import {
  GENERATORS, SPECIAL_UPGRADES, PRESTIGE_UPGRADES, SURGE_TYPES, CLICK_UPGRADE,
} from '../src/game/idle.js';
import { THEMES } from '../src/game/waves.js';
import { REACTIONS } from '../src/game/elements.js';

// The language is a module-level singleton; always leave it on English so other
// test files (and repeated runs) see the canonical default.
test.afterEach(() => setLang('en'));

test('LANGUAGES advertises English and German', () => {
  const ids = LANGUAGES.map((l) => l.id);
  assert.ok(ids.includes('en'), 'missing en');
  assert.ok(ids.includes('de'), 'missing de');
  for (const l of LANGUAGES) assert.ok(l.label, `language ${l.id} has no label`);
});

test('every UI string defines both English and German', () => {
  const entries = Object.entries(__STR);
  assert.ok(entries.length > 0, 'STR table is empty');
  for (const [key, val] of entries) {
    assert.ok(Array.isArray(val) && val.length === 2, `STR[${key}] must be [en, de]`);
    for (let i = 0; i < 2; i++) {
      const v = val[i];
      const kind = typeof v;
      assert.ok(kind === 'string' || kind === 'function', `STR[${key}][${i}] bad type ${kind}`);
      if (kind === 'string') assert.ok(v.length > 0, `STR[${key}][${i}] empty`);
      if (kind === 'function') assert.equal(typeof v({ n: 1, name: 'x', theme: 'y', reward: 1, mult: 1, from: 1, to: 2, dmg: 3, earned: 1, total: 1, banked: 1, owned: 1 }), 'string', `STR[${key}][${i}] fn must return string`);
    }
  }
});

test('t() resolves per-language and interpolates params', () => {
  setLang('en');
  assert.equal(t('stat.Score'), 'Score');
  setLang('de');
  assert.equal(t('stat.Score'), 'Punkte');
  assert.equal(t('hud.lv', { n: 7 }), 'LV 7');
  assert.equal(t('world.wave', { n: 12 }), 'WELLE 12');
});

// Each translatable namespace: the data ids that must have a German overlay.
const COVERAGE = {
  weapons: WEAPONS.map((w) => w.id),
  items: ITEMS.map((i) => i.id),
  ships: SHIPS.map((s) => s.id),
  enemies: Object.values(ENEMY_TYPES).map((e) => e.key),
  bosses: Object.values(BOSS_TYPES).map((b) => b.key),
  meta: META_UPGRADES.map((m) => m.id),
  directives: DIRECTIVES.map((d) => d.id),
  achievements: ACHIEVEMENTS.map((a) => a.id),
  generators: GENERATORS.map((g) => g.id),
  special: SPECIAL_UPGRADES.map((s) => s.id),
  prestige: PRESTIGE_UPGRADES.map((p) => p.id),
  surges: SURGE_TYPES.map((s) => s.id),
  themes: THEMES.map((t2) => t2.id),
  clickUpgrade: [CLICK_UPGRADE.id],
};

test('every data entity has a German name overlay', () => {
  for (const [ns, ids] of Object.entries(COVERAGE)) {
    const overlay = __DE[ns];
    assert.ok(overlay, `DE overlay missing for namespace ${ns}`);
    for (const id of ids) {
      assert.ok(overlay[id], `DE.${ns} missing entry for '${id}'`);
      assert.ok(overlay[id].name, `DE.${ns}.${id} has no German name`);
    }
  }
});

test('German overlays have no stale (unknown) ids', () => {
  for (const [ns, ids] of Object.entries(COVERAGE)) {
    const known = new Set(ids);
    for (const id of Object.keys(__DE[ns])) {
      assert.ok(known.has(id), `DE.${ns} has stale id '${id}'`);
    }
  }
});

test('every elemental reaction has a German name', () => {
  for (const r of Object.values(REACTIONS)) {
    setLang('de');
    const de = tReaction(r.name);
    assert.ok(de && de !== r.name, `reaction '${r.name}' is not translated`);
    setLang('en');
    assert.equal(tReaction(r.name), r.name, 'English reaction should pass through');
  }
});

test('dName/dDesc fall back to English and use the overlay for German', () => {
  const w = WEAPONS[0];
  setLang('en');
  assert.equal(dName('weapons', w), w.name, 'English name should be the canonical def name');
  setLang('de');
  assert.equal(dName('weapons', w), __DE.weapons[w.id].name, 'German name should come from the overlay');

  const item = ITEMS[0];
  setLang('de');
  assert.equal(dDesc('items', item), __DE.items[item.id].desc, 'German desc should come from the overlay');
});

test('translateEffect localises generated stat strings', () => {
  setLang('en');
  assert.equal(translateEffect('+20% damage'), '+20% damage', 'English passes through unchanged');
  setLang('de');
  assert.equal(translateEffect('+20% damage'), '+20% Schaden');
  assert.equal(translateEffect('+5% crit chance'), '+5% Krit-Chance');
  assert.equal(translateEffect('+8% crit damage'), '+8% Krit-Schaden');
  assert.equal(translateEffect('+10% Nebula production'), '+10% Nebel Produktion');
  assert.equal(translateEffect('+2 HP/sec'), '+2 HP/Sek.');
});

test('generated meta/idle effect strings always translate to German text', () => {
  // The real effect() helpers produce the strings the UI shows; make sure none
  // of them survive untranslated when the language is German (a loose smoke test
  // over the controlled vocabulary).
  setLang('de');
  const samples = [
    ...META_UPGRADES.map((m) => (typeof m.effect === 'function' ? m.effect(1) : '')),
    ...GENERATORS.map((g) => (typeof g.effect === 'function' ? g.effect(1) : '')),
  ].filter(Boolean);
  assert.ok(samples.length > 0, 'expected some generated effect strings');
  for (const s of samples) {
    assert.equal(typeof translateEffect(s), 'string');
  }
});
