// i18n.js — tiny dependency-free localization layer (English + German).
//
// The game ships in two languages. This module is intentionally DOM-free and
// side-effect-free at import time so it can be unit-tested in plain Node and
// imported by the pure game-data modules without dragging in the browser.
//
// Two kinds of text are handled:
//   1. UI strings  — authored here as [en, de] pairs (or [enFn, deFn] when they
//      interpolate), looked up with t(key, params). Keeping both languages side
//      by side makes missing translations impossible to overlook.
//   2. Content strings — the names/descriptions that live on the data modules
//      (weapons, enemies, upgrades, …). English stays the canonical value baked
//      into those modules (so their unit tests and the default render are
//      unchanged); German is a thin overlay keyed by the same stable id/key and
//      read at render time via dName/dDesc/dTag/dRisk. Generated stat blurbs
//      (the `effect()` helpers) are post-translated with translateEffect so the
//      numbers stay single-sourced in the data module.

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
];

export const DEFAULT_LANG = 'en';

let lang = DEFAULT_LANG;
const listeners = new Set();

export function getLang() { return lang; }

export function isLang(id) { return LANGUAGES.some((l) => l.id === id); }

// Switch language. Returns the language actually in effect (unknown ids are
// coerced to the default) and notifies subscribers only on a real change.
export function setLang(next) {
  const id = isLang(next) ? next : DEFAULT_LANG;
  if (id === lang) return lang;
  lang = id;
  for (const cb of listeners) { try { cb(lang); } catch { /* ignore */ } }
  return lang;
}

export function onLangChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Best-effort pick of a starting language from a browser locale list.
export function detectLang(locales) {
  const list = Array.isArray(locales) ? locales : (locales ? [locales] : []);
  for (const loc of list) {
    if (typeof loc === 'string' && loc.toLowerCase().startsWith('de')) return 'de';
  }
  return DEFAULT_LANG;
}

// --------------------------------------------------------------- UI strings
// Each entry: [english, german]. A value may be a (params) => string function
// when it interpolates; otherwise {placeholder} tokens are filled by t().
const STR = {
  // ---- Start screen ----
  'start.tagline': [
    'Hold the line against the alien swarm. Stack weapons. Evolve. Overdrive.',
    'Halte die Stellung gegen den Alien-Schwarm. Sammle Waffen. Entwickle sie. Overdrive.',
  ],
  'start.feature.arsenal.t': ['🔫 Arsenal', '🔫 Arsenal'],
  'start.feature.arsenal.d': [
    'Auto-fire up to 6 weapons at once — then evolve them into legendary forms.',
    'Feuere automatisch bis zu 6 Waffen gleichzeitig — und entwickle sie zu legendären Formen.',
  ],
  'start.feature.overdrive.t': ['🔆 Overdrive', '🔆 Overdrive'],
  'start.feature.overdrive.d': [
    'Chain kills to fill the meter and unleash a damage & fire-rate rampage.',
    'Verkette Abschüsse, um die Leiste zu füllen und einen Schadens- & Feuerraten-Rausch zu entfesseln.',
  ],
  'start.feature.resonance.t': ['✴️ Resonance', '✴️ Resonanz'],
  'start.feature.resonance.d': [
    'Imbue Fire · Cryo · Shock · Void for screen-clearing reactions.',
    'Verzaubere mit Feuer · Kryo · Schock · Leere für bildschirmfüllende Reaktionen.',
  ],
  'start.launch': ['▶ LAUNCH', '▶ START'],
  'start.station': ['🛰 STATION', '🛰 STATION'],
  'start.hangar': ['🛠 HANGAR', '🛠 HANGAR'],
  'start.prevShip': ['Previous ship', 'Vorheriges Schiff'],
  'start.nextShip': ['Next ship', 'Nächstes Schiff'],
  'start.stardustTitle': [
    'Stardust — earn it in runs, spend it in the Hangar',
    'Sternenstaub — in Läufen verdienen, im Hangar ausgeben',
  ],
  'start.nebulaTitle': [
    'Open your Orbital Station — produces Nebula even while away',
    'Öffne deine Orbitalstation — produziert Nebel auch in deiner Abwesenheit',
  ],
  'hint.move': ['Move', 'Bewegen'],
  'hint.dash': ['Dash', 'Sprint'],
  'hint.singularity': ['Singularity', 'Singularität'],
  'hint.pause': ['Pause', 'Pause'],
  'hint.autofire': ['Auto-fire at the nearest enemy', 'Feuert automatisch auf den nächsten Gegner'],
  'opt.music': ['Music', 'Musik'],
  'opt.sfx': ['Sound', 'Sound'],
  'opt.shake': ['Screen shake', 'Bildschirmwackeln'],
  'opt.language': ['Language', 'Sprache'],
  'word.stardust': ['Stardust', 'Sternenstaub'],
  'word.nebula': ['Nebula', 'Nebel'],
  'start.directivesTitle': [
    'Active challenge Directives — more risk, more Stardust',
    'Aktive Herausforderungs-Direktiven — mehr Risiko, mehr Sternenstaub',
  ],

  // ---- HUD ----
  'hud.wave': ['WAVE', 'WELLE'],
  'hud.enemies': ['ENEMIES', 'GEGNER'],
  'hud.phoenix': ['PHOENIX', 'PHÖNIX'],
  'hud.directives': ['DIRECTIVES', 'DIREKTIVEN'],
  'hud.boss': ['BOSS', 'BOSS'],
  'hud.overdrive': ['OVERDRIVE', 'OVERDRIVE'],
  'hud.overdriveOn': ['OVERDRIVE!', 'OVERDRIVE!'],
  'hud.best': [(p) => `BEST ${p.n}`, (p) => `BEST ${p.n}`],
  'hud.lv': [(p) => `LV ${p.n}`, (p) => `LV ${p.n}`],
  'hud.combo': [(p) => `COMBO x${p.n}`, (p) => `COMBO x${p.n}`],
  'touch.move': ['MOVE', 'ZIEHEN'],
  'touch.dash': ['Dash', 'Sprint'],
  'touch.singularity': ['Singularity', 'Singularität'],
  'touch.pause': ['Pause', 'Pause'],

  // ---- Canvas call-outs (world.js) ----
  'world.wave': [(p) => `WAVE ${p.n}`, (p) => `WELLE ${p.n}`],
  'world.waveTheme': [(p) => `WAVE ${p.n} · ${p.theme}`, (p) => `WELLE ${p.n} · ${p.theme}`],
  'world.warning': [(p) => `WARNING — WAVE ${p.n}`, (p) => `WARNUNG — WELLE ${p.n}`],
  'world.bossWave': [(p) => `${p.name} — WAVE ${p.n}`, (p) => `${p.name} — WELLE ${p.n}`],
  'world.singularity': ['SINGULARITY', 'SINGULARITÄT'],
  'world.magnet': ['MAGNET', 'MAGNET'],
  'world.nova': ['NOVA', 'NOVA'],
  'world.eliteInbound': ['ELITE INBOUND', 'ELITE IM ANFLUG'],
  'world.bossDown': ['BOSS DOWN!', 'BOSS BESIEGT!'],
  'world.phoenixRevive': ['PHOENIX REVIVE', 'PHÖNIX-WIEDERKEHR'],

  // ---- Hangar ----
  'hangar.title': ['🛠 HANGAR', '🛠 HANGAR'],
  'hangar.done': ['✔ DONE', '✔ FERTIG'],
  'rec.runs': ['Runs', 'Läufe'],
  'rec.best': ['Best', 'Bestwert'],
  'rec.survived': ['Survived', 'Überlebt'],
  'rec.kills': ['Kills', 'Abschüsse'],
  'rec.lifetime': ['Lifetime ✦', 'Gesamt ✦'],
  'tab.ships': ['STARFIGHTERS', 'JÄGER'],
  'tab.meta': ['ASCENSION', 'AUFSTIEG'],
  'tab.directives': ['DIRECTIVES', 'DIREKTIVEN'],
  'tab.codex': ['CODEX', 'KODEX'],
  'ship.starter': [(p) => `Starter: ${p.weapon}`, (p) => `Startwaffe: ${p.weapon}`],
  'ship.select': ['SELECT', 'WÄHLEN'],
  'ship.selected': ['✓ SELECTED', '✓ GEWÄHLT'],
  'ship.unlock': [(p) => `✦ ${p.cost} UNLOCK`, (p) => `✦ ${p.cost} FREISCHALTEN`],
  'common.max': ['MAX', 'MAX'],
  'common.lv': [(p) => `Lv ${p.n}`, (p) => `St. ${p.n}`],

  // ---- Directives ----
  'dir.summary': [
    (p) => `<b>${p.n}</b> active · Stardust reward <b>×${p.mult}</b>`,
    (p) => `<b>${p.n}</b> aktiv · Sternenstaub-Belohnung <b>×${p.mult}</b>`,
  ],
  'dir.hint': [
    'Toggle Directives to make runs harder — and multiply the Stardust you earn.',
    'Schalte Direktiven ein, um Läufe schwerer zu machen — und deinen Sternenstaub zu vervielfachen.',
  ],
  'dir.active': ['ACTIVE', 'AKTIV'],
  'dir.enable': ['ENABLE', 'AKTIVIEREN'],
  'dir.label': ['DIRECTIVES', 'DIREKTIVEN'],

  // ---- Codex ----
  'codex.progress': [
    (p) => `<b>${p.owned}</b> / ${p.total} commendations earned`,
    (p) => `<b>${p.owned}</b> / ${p.total} Auszeichnungen verdient`,
  ],

  // ---- Level up ----
  'levelup.title': ['LEVEL\u00a0UP', 'STUFEN\u00adAUFSTIEG'],
  'levelup.sub': ['Choose an augment', 'Wähle eine Verbesserung'],
  'levelup.reroll': ['🎲 Reroll', '🎲 Neu'],
  'levelup.banish': ['🚫 Banish', '🚫 Verbannen'],
  'levelup.hint': [
    'Press <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> to pick · <kbd>R</kbd> reroll · <kbd>B</kbd> banish',
    'Drücke <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> zum Wählen · <kbd>R</kbd> neu · <kbd>B</kbd> verbannen',
  ],
  'kind.weaponNew': ['NEW WEAPON', 'NEUE WAFFE'],
  'kind.weaponUp': ['UPGRADE', 'VERBESSERN'],
  'kind.evolve': ['EVOLVE', 'ENTWICKELN'],
  'kind.item': ['ITEM', 'GEGENSTAND'],
  'card.evolvePrefix': [(p) => `EVOLVE · ${p.name}`, (p) => `ENTWICKELN · ${p.name}`],
  'card.tagEvolution': ['Evolution', 'Entwicklung'],
  'card.tagNewWeapon': ['New Weapon', 'Neue Waffe'],
  'card.tagItem': ['Item', 'Gegenstand'],
  'card.tagWeaponLv': [(p) => `Weapon · Lv ${p.n}`, (p) => `Waffe · St. ${p.n}`],
  'card.weaponUpDesc': [
    (p) => `Lv ${p.from} → ${p.to}: +${p.dmg}% damage, faster fire`,
    (p) => `St. ${p.from} → ${p.to}: +${p.dmg}% Schaden, schnelleres Feuer`,
  ],
  'rarity.common': ['Common', 'Gewöhnlich'],
  'rarity.rare': ['Rare', 'Selten'],
  'rarity.epic': ['Epic', 'Episch'],
  'rarity.legendary': ['Legendary', 'Legendär'],

  // ---- Pause ----
  'pause.title': ['PAUSED', 'PAUSIERT'],
  'pause.resume': ['Resume', 'Fortsetzen'],
  'pause.quit': ['Abandon Run', 'Lauf abbrechen'],

  // ---- Game over ----
  'go.title': ['SYSTEM\u00a0FAILURE', 'SYSTEM\u00adAUSFALL'],
  'go.newbest': ['★ NEW BEST ★', '★ NEUER REKORD ★'],
  'go.retry': ['↻ RETRY', '↻ NOCHMAL'],
  'go.hangar': ['🛠 HANGAR', '🛠 HANGAR'],
  'go.stardust': [
    (p) => `✦ +${p.earned} Stardust  ·  ${p.total} total`,
    (p) => `✦ +${p.earned} Sternenstaub  ·  ${p.total} gesamt`,
  ],
  'go.nebula': [
    (p) => `⬡ +${p.earned} Nebula  ·  ${p.banked} banked`,
    (p) => `⬡ +${p.earned} Nebel  ·  ${p.banked} gebunkert`,
  ],

  // ---- Stat rows (pause + game over) ----
  'stat.Score': ['Score', 'Punkte'],
  'stat.Time': ['Time', 'Zeit'],
  'stat.Level': ['Level', 'Stufe'],
  'stat.Kills': ['Kills', 'Abschüsse'],
  'stat.Best': ['Best', 'Bestwert'],
  'stat.Bosses': ['Bosses', 'Bosse'],

  // ---- Toasts ----
  'toast.commendation': [
    (p) => `Commendation · ✦ +${p.reward}`,
    (p) => `Auszeichnung · ✦ +${p.reward}`,
  ],
  'toast.welcomeBack.t': ['Welcome back', 'Willkommen zurück'],
  'toast.welcomeBack.d': [
    (p) => `Station mined +${p.n} Nebula${p.capped ? ' (max)' : ''}`,
    (p) => `Station schürfte +${p.n} Nebel${p.capped ? ' (max)' : ''}`,
  ],
  'toast.collapsed.t': ['Station Collapsed', 'Station kollabiert'],
  'toast.collapsed.d': [
    (p) => `+${p.n} Singularity ${plural(p.n, 'Core', 'Cores')}`,
    (p) => `+${p.n} ${plural(p.n, 'Singularitätskern', 'Singularitätskerne')}`,
  ],
  'surge.collect': [(p) => `Collect ${p.name}`, (p) => `${p.name} einsammeln`],
  'surge.rewardNebula': [(p) => `+${p.n} Nebula`, (p) => `+${p.n} Nebel`],
  'surge.rewardCore': [
    (p) => `+${p.n} Singularity ${plural(p.n, 'Core', 'Cores')}`,
    (p) => `+${p.n} ${plural(p.n, 'Singularitätskern', 'Singularitätskerne')}`,
  ],
  'surge.rewardFrenzy': [
    (p) => `×${p.mult} for ${p.dur}s`,
    (p) => `×${p.mult} für ${p.dur}s`,
  ],

  // ---- Orbital Station ----
  'st.title': ['🛰 ORBITAL STATION', '🛰 ORBITALSTATION'],
  'st.nebula': ['⬡ Nebula', '⬡ Nebel'],
  'st.cores': ['🌀 Cores', '🌀 Kerne'],
  'st.done': ['✔ DONE', '✔ FERTIG'],
  'st.tab.mine': ['⬡ MINE', '⬡ SCHÜRFEN'],
  'st.tab.gen': ['⚙ GENERATORS', '⚙ GENERATOREN'],
  'st.tab.cores': ['🌀 CORES', '🌀 KERNE'],
  'st.tab.ascend': ['✦ COLLAPSE', '✦ KOLLAPS'],
  'st.mineLabel': ['MINE', 'SCHÜRFEN'],
  'st.mineAria': ['Mine Nebula', 'Nebel schürfen'],
  'st.tapGain': [(p) => `+${p.n} ⬡`, (p) => `+${p.n} ⬡`],
  'st.rate': [(p) => `${p.n}/s`, (p) => `${p.n}/s`],
  'st.perTap': [(p) => `${p.n} ⬡ per tap`, (p) => `${p.n} ⬡ pro Tipp`],
  'st.addPower': [(p) => `+${p.n} power`, (p) => `+${p.n} Stärke`],
  'st.manualMining': ['MANUAL MINING', 'MANUELLES SCHÜRFEN'],
  'st.tapBeam': ['tap the beam above', 'tippe oben auf den Strahl'],
  'st.mineNote': [
    (p) => `Your Station mines <b>Nebula</b> in real time — even while the tab is closed. <b>Tap the beam</b> to mine by hand, then automate it under <b>Generators</b>. Watch for drifting <b>Nebula Surges</b> — tap one for a windfall or a frenzy. Run progress adds <b>+${p.pct}%</b> production.`,
    (p) => `Deine Station schürft <b>Nebel</b> in Echtzeit — auch bei geschlossenem Tab. <b>Tippe auf den Strahl</b>, um von Hand zu schürfen, und automatisiere es unter <b>Generatoren</b>. Achte auf driftende <b>Nebel-Schübe</b> — tippe einen für einen Geldsegen oder Rausch an. Lauf-Fortschritt gibt <b>+${p.pct}%</b> Produktion.`,
  ],
  'st.genHead': ['GENERATORS', 'GENERATOREN'],
  'st.genSub': [(p) => `every ${p.step} → +${p.pct}%`, (p) => `alle ${p.step} → +${p.pct}%`],
  'st.rateEach': [(p) => `${p.n} ⬡/s each`, (p) => `${p.n} ⬡/s je`],
  'st.rateContrib': [(p) => `${p.n} ⬡/s`, (p) => `${p.n} ⬡/s`],
  'st.milestoneReached': [(p) => `<b>×${p.mult}</b> milestone · `, (p) => `<b>×${p.mult}</b> Meilenstein · `],
  'st.milestoneTo': [(p) => `${p.n} to ×${p.next}`, (p) => `${p.n} bis ×${p.next}`],
  'st.qtyMax': ['MAX', 'MAX'],
  'st.buyMax': [(p) => `MAX ${p.n}`, (p) => `MAX ${p.n}`],
  'st.coresNote': [
    'Spend <b>🌀 Singularity Cores</b> (earned by Collapsing under COLLAPSE) on permanent buffs that apply to <b>every run</b>.',
    'Gib <b>🌀 Singularitätskerne</b> (durch Kollaps unter KOLLAPS verdient) für dauerhafte Boni aus, die für <b>jeden Lauf</b> gelten.',
  ],
  'st.coreUpgrades': ['CORE UPGRADES', 'KERN-UPGRADES'],
  'st.everyRun': ['applied on every run', 'gilt für jeden Lauf'],
  'st.nowEffect': [(p) => ` · now <b>${p.effect}</b>`, (p) => ` · jetzt <b>${p.effect}</b>`],
  'st.collapseTitle': ['🌀 Collapse Station', '🌀 Station kollabieren'],
  'st.collapseMint': [
    (p) => `Mint <b>${p.gain}</b> ${plural(p.gain, 'Core', 'Cores')} · resets generators &amp; Nebula${p.seed ? ` · keeps <b>${p.seed}</b> Nebula` : ''}`,
    (p) => `Präge <b>${p.gain}</b> ${plural(p.gain, 'Kern', 'Kerne')} · setzt Generatoren &amp; Nebel zurück${p.seed ? ` · behält <b>${p.seed}</b> Nebel` : ''}`,
  ],
  'st.collapseNeed': [
    (p) => `Reach ${p.n} lifetime Nebula for your first Core`,
    (p) => `Erreiche ${p.n} Gesamt-Nebel für deinen ersten Kern`,
  ],
  'st.collapseBtn': ['COLLAPSE', 'KOLLAPS'],
  'st.collapseNote': [
    'Singularity perks are bought with <b>🌀 Cores</b> and <b>survive every Collapse</b> — they permanently upgrade the Station itself.',
    'Singularitäts-Vorteile werden mit <b>🌀 Kernen</b> gekauft und <b>überdauern jeden Kollaps</b> — sie verbessern die Station selbst dauerhaft.',
  ],
  'st.perksHead': ['SINGULARITY PERKS', 'SINGULARITÄTS-VORTEILE'],
  'st.perksSub': ['permanent · survive Collapse', 'dauerhaft · überdauern Kollaps'],
  'buff.chip': [
    (p) => `${p.name} ×${p.mult}`,
    (p) => `${p.name} ×${p.mult}`,
  ],
  'buff.time': [(p) => `${p.n}s`, (p) => `${p.n}s`],
};

// Simple English/German-agnostic pluralizer used inside interpolation fns.
function plural(n, one, many) { return Math.abs(n) === 1 ? one : many; }

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? String(params[k]) : m));
}

// Translate a UI key. Unknown keys return the key itself (visible but harmless).
export function t(key, params) {
  const pair = STR[key];
  if (!pair) return key;
  const v = (lang === 'de' ? pair[1] : pair[0]) ?? pair[0];
  return typeof v === 'function' ? v(params || {}) : interpolate(v, params);
}

// --------------------------------------------------- content overlays (de)
// Only German overrides live here; English is read straight off the data def.
// Keyed by the module's stable id (enemies/reactions use `key`).
const EMPTY = Object.freeze({});

const DE = {
  ships: {
    vanguard: { name: 'Vorhut', tag: 'Ausgewogen · verlässlicher Allrounder', desc: 'Ein zuverlässiger Jäger ohne Schwächen. Zielsuchender Ionen-Blaster.' },
    striker: { name: 'Stürmer', tag: 'Glaskanone · Krit & Burst', desc: 'Trifft wie eine Railgun, bricht aber unter Feuer ein. Startet mit dem Streufeld.' },
    juggernaut: { name: 'Juggernaut', tag: 'Festung · einstecken & stoßen', desc: 'Ein schwerer Brecher, der Schwärme wegsteckt und sie wegschleudert. Puls-Nova-Kern.' },
    tempest: { name: 'Tempest', tag: 'Blitz · Hast & Mobilität', desc: 'Blitzschneller Rumpf zum Ausweichen. Verkettet Lichtbogen-Blitze.' },
    pyre: { name: 'Pyre', tag: 'Pyromant · Brand & Explosion', desc: 'Entzündet alles und detoniert beim Tod. Startet mit dem Raketenwerfer.' },
    oracle: { name: 'Orakel', tag: 'Leerenrufer · Schwerkraft & Reaktionen', desc: 'Verbiegt die Raumzeit. Leere-verzauberte Schüsse und eine aufgeladene Singularität. Gravitonmörser.' },
    frostbite: { name: 'Frostbiss', tag: 'Kryomant · Kälte & Kontrolle', desc: 'Ein Frost-Brecher, der den Schwarm gefrieren lässt. Eröffnet mit dem Hagelsturm.' },
  },
  weapons: {
    ion: { name: 'Ionen-Blaster', desc: 'Zielt automatisch auf den nächsten Angreifer. Höhere Stufen fügen Läufe hinzu.' },
    photon: { name: 'Photonensturm', desc: 'Eine unablässige, zielsuchende Plasmaspirale, die niemals aufhört zu kreisen.' },
    spread: { name: 'Streufeld', desc: 'Eine kurze Schrotgarbe. Zerfetzt alles, was zu nahe kommt.' },
    flak: { name: 'Flakkanone', desc: 'Schrotkugeln detonieren beim Aufprall und überziehen den Schwarm mit Explosionen.' },
    arc: { name: 'Lichtbogenspule', desc: 'Entlädt einen Blitz, der zwischen nahen Gegnern überspringt.' },
    tesla: { name: 'Tesla-Netz', desc: 'Ein Gewitter verzweigter Blitze, das den ganzen Bildschirm betäubt und schockt.' },
    missile: { name: 'Raketenwerfer', desc: 'Verschießt einen zielsuchenden Sprengkopf, der in einer Feuerexplosion detoniert.' },
    swarm: { name: 'Schwarmsalve', desc: 'Feuert eine Salve zielsuchender Sprengköpfe, die das Feld in Feuer hüllen.' },
    pulse: { name: 'Puls-Nova', desc: 'Stößt eine Schockwelle um dich aus, die alles in der Nähe trifft und wegschiebt.' },
    nova: { name: 'Nova-Kollaps', desc: 'Zieht Angreifer heran und entlädt sich dann in einer verheerenden Schockwelle.' },
    rail: { name: 'Schienenlanze', desc: 'Feuert eine durchdringende Hochgeschwindigkeits-Lanze geradewegs durch eine Linie.' },
    lance: { name: 'Leerenlanze', desc: 'Ein unaufhaltsamer Leerenspeer, der alles durchbohrt und den Raum verzerrt.' },
    mortar: { name: 'Gravitonmörser', desc: 'Wirft eine Gravitonladung in die dichteste Gruppe: zieht sie zusammen und sprengt sie.' },
    cluster: { name: 'Splitterschwarm', desc: 'Eine Gravitonbombe, die Bomblets über die gesamte Formation verstreut.' },
    halo: { name: 'Halo-Werfer', desc: 'Umgibt das Schiff mit einem radialen Geschosskranz und räumt jeden Winkel frei.' },
    corona: { name: 'Korona-Entladung', desc: 'Eine sengende Doppelkorona durchdringenden Plasmas bricht in alle Richtungen aus.' },
    lash: { name: 'Lichtbogenpeitsche', desc: 'Peitscht einen knisternden Bogen über die Front und schleudert Gegner weg.' },
    reaver: { name: 'Riss-Räuber', desc: 'Eine wirbelnde Risssense, die rundum mäht und die Essenz der Gegner raubt.' },
    hail: { name: 'Hagelsturm', desc: 'Versprüht einen breiten Hagel gefrorener Splitter, die den Schwarm durchlöchern und unterkühlen.' },
    blizzard: { name: 'Absoluter Nullpunkt', desc: 'Ein tosender Blizzard: ein radialer Splittersturm, umhüllt von einer blitzgefrierenden Nova.' },
    venom: { name: 'Giftspucker', desc: 'Spuckt einen schnellen Kegel ätzender Geschosse. Zersetzt alles, was in den Sprühnebel gerät.' },
    plague: { name: 'Seuchenkanone', desc: 'Schleudert eine schwere Säuregranate, die beim Aufprall in einer korrosiven Wolke zerbirst.' },
    mines: { name: 'Suchminen', desc: 'Legt langsam treibende Näherungsminen, die zünden, wenn der Schwarm herankommt.' },
    minefield: { name: 'Minenfeld', desc: 'Übersät die Arena mit zielsuchenden Minen, die zu überlappenden Explosionen verketten.' },
    prism: { name: 'Prismastrahl', desc: 'Spaltet eine Salve durchdringender Lichtlanzen, die geradewegs durch eine Linie harken.' },
    trinity: { name: 'Trinitätsstrahl', desc: 'Ein strahlender Dreizack unaufhaltsamer Prismen, der alles durchbohrt, was er berührt.' },
  },
  items: {
    damage: { name: 'Überladene Geschosse', desc: '+20% Waffenschaden' },
    haste: { name: 'Schnellspulen', desc: '+13% Angriffstempo' },
    projectiles: { name: 'Geteilter Lauf', desc: '+1 Projektil für Burst-Waffen' },
    crit: { name: 'Präzisionsoptik', desc: '+8% Krit-Chance' },
    critdmg: { name: 'Tödliche Absicht', desc: '+60% Krit-Schaden' },
    pierce: { name: 'Railgun-Kern', desc: '+1 Durchschlag & +12% Projektiltempo' },
    area: { name: 'Resonanzlinse', desc: '+18% Explosions- & Feldradius' },
    homing: { name: 'Zielerfassungs-Array', desc: '+22% Reichweite & gelenkte Schüsse' },
    bigbullets: { name: 'Schwere Geschosse', desc: '+35% Geschossgröße & +12% Rückstoß' },
    velocity: { name: 'Übertakteter Kondensator', desc: '+16% Projektiltempo & +16% Reichweite' },
    imbue_fire: { name: 'Plasmageschosse', desc: 'Schüsse entzünden Gegner (Brand)' },
    imbue_cryo: { name: 'Kryogeschosse', desc: 'Schüsse wirken Kryo (verlangsamen/einfrieren)' },
    imbue_shock: { name: 'Teslageschosse', desc: 'Schüsse schocken Gegner (Ketten)' },
    imbue_void: { name: 'Leerengeschosse', desc: 'Schüsse wirken Leere (Schwerkraft) & stärken die Singularität' },
    imbue_toxin: { name: 'Korrosionsgeschosse', desc: 'Schüsse zersetzen Gegner (schwerer Säure-Schaden)' },
    resonance: { name: 'Resonanzkaskade', desc: '+40% Elementar- & Reaktionsschaden' },
    sing_charge: { name: 'Dunkle-Materie-Kondensator', desc: '+30% Singularitäts-Laderate' },
    sing_power: { name: 'Ereignishorizont', desc: '+35% Singularitätsgröße & -schaden' },
    dash_cd: { name: 'Phasenspulen', desc: '−20% Sprint-Abklingzeit' },
    dash_blade: { name: 'Rissklingen', desc: '+70% Sprintspur-Schaden & -radius' },
    overdrive: { name: 'Overdrive-Reaktor', desc: '+35% Overdrive-Aufbau & -Stärke' },
    drone: { name: 'Orbitaldrohne', desc: 'Erhalte eine umkreisende Drohne, die automatisch feuert' },
    drone_power: { name: 'Drohnen-Uplink', desc: '+45% Drohnenschaden' },
    explosive: { name: 'Instabile Nutzlast', desc: 'Abschüsse können explodieren' },
    crit_capstone: { name: 'Henkersklinge', desc: '+10% Krit-Chance & +75% Krit-Schaden' },
    overdrive_rush: { name: 'Kinetischer Reaktor', desc: '+28% Overdrive-Aufbau & +6% Bewegungstempo' },
    maxhp: { name: 'Verstärkter Rumpf', desc: '+25 max. HP (und heilt)' },
    armor: { name: 'Ablative Panzerung', desc: '+3 Panzerung (feste Schadensreduktion)' },
    regen: { name: 'Naniten-Reparatur', desc: '+1,2 HP/Sek. Regeneration' },
    lifesteal: { name: 'Vampirschaltung', desc: 'Heile 3% des verursachten Schadens' },
    dodge: { name: 'Phasenverschiebung', desc: '+8% Ausweichchance' },
    speed: { name: 'Ionen-Triebwerke', desc: '+12% Bewegungstempo' },
    magnet: { name: 'Gravitonmagnet', desc: '+45% Aufsammelradius & +12% EP' },
    luck: { name: 'Glückskern', desc: '+20% Chance auf seltenere Karten' },
    catalyst: { name: 'Korrosionskatalysator', desc: '+30% Elementar- & Reaktionsschaden & +11% Angriffstempo' },
    xpgain: { name: 'Synapsen-Verstärker', desc: '+30% EP-Gewinn' },
    overcharge_area: { name: 'Graviton-Überladung', desc: '+20% Explosionsradius, +15% Reichweite & +20% Rückstoß' },
    juggernaut: { name: 'Juggernaut-Panzerung', desc: '+40 max. HP & +2 Panzerung' },
    bloodrush: { name: 'Blutrausch', desc: '+2% Lebensraub & +8% Angriffstempo' },
    evasion: { name: 'Trugbild-Antrieb', desc: '+6% Ausweichen & +9% Bewegungstempo' },
    unstable: { name: 'Instabiler Kern', desc: '+45% Waffenschaden & +12% Angriffstempo' },
    swarm_drone: { name: 'Schwarm-Protokoll', desc: '+1 Drohne & +20% Drohnenschaden' },
  },
  enemies: {
    drone: { name: 'Drohne' },
    swarm: { name: 'Schwärmling' },
    spitter: { name: 'Speier' },
    dasher: { name: 'Pirscher' },
    splitter: { name: 'Teiler' },
    brute: { name: 'Schläger' },
    squid: { name: 'Tintenfisch' },
    crab: { name: 'Krabbe' },
    ufo: { name: 'Untertasse' },
    octopus: { name: 'Krake' },
    seeder: { name: 'Säer' },
    sentinel: { name: 'Wächter' },
    orbiter: { name: 'Umkreiser' },
    bomber: { name: 'Bomber' },
    weaver: { name: 'Weber' },
    frostling: { name: 'Frostling' },
    sparkling: { name: 'Funkling' },
    mortar: { name: 'Mörser' },
    bulwark: { name: 'Bollwerk' },
  },
  bosses: {
    devourer: { name: 'Der Verschlinger' },
    warden: { name: 'Der Wärter' },
    hivequeen: { name: 'Die Schwarmkönigin' },
    siegemarshal: { name: 'Der Belagerungsmarschall' },
    singularis: { name: 'Der Singularis' },
    mothership: { name: 'Das Mutterschiff' },
    phantom: { name: 'Das Phantom' },
    cryoleviathan: { name: 'Der Kryo-Leviathan' },
    stormherald: { name: 'Der Sturmherold' },
    nemesis: { name: 'Die Nemesis' },
  },
  meta: {
    vitality: { name: 'Verstärkter Rumpf', desc: '+20 max. HP pro Stufe' },
    power: { name: 'Waffenkalibrierung', desc: '+6% Waffenschaden pro Stufe' },
    thrusters: { name: 'Ionen-Triebwerke', desc: '+5% Bewegungstempo pro Stufe' },
    plating: { name: 'Ablative Panzerung', desc: '+1 Panzerung pro Stufe' },
    nanites: { name: 'Naniten-Gewebe', desc: '+0,5 HP/Sek. Regeneration pro Stufe' },
    targeting: { name: 'Zielerfassungs-Matrix', desc: '+3% Krit-Chance pro Stufe' },
    overclock: { name: 'Übertaktete Spulen', desc: '+3% Angriffstempo pro Stufe' },
    harvester: { name: 'Gravitonsammler', desc: '+8% EP & +12% Aufsammelradius pro Stufe' },
    fortune: { name: 'Glücksstern', desc: '+0,08 Glück (seltenere Karten) pro Stufe' },
    singularity_core: { name: 'Singularitätskern', desc: '+10% Singularitäts-Laderate pro Stufe' },
    salvage: { name: 'Bergungsanlage', desc: '+12% verdienter Sternenstaub pro Stufe' },
    evasion: { name: 'Ausweich-Servos', desc: '+3% Ausweichchance pro Stufe' },
    siphon: { name: 'Siphon-Reaktor', desc: '+1% Lebensraub pro Stufe' },
    phoenix: { name: 'Phönix-Protokoll', desc: 'Belebe einmal pro Lauf wieder und stelle die halbe HP her' },
  },
  directives: {
    elite: { name: 'Elite-Flotte', desc: 'Gegner haben +50% HP.', risk: 'Zähere Gegner' },
    blitz: { name: 'Blitz-Schwarm', desc: 'Gegner bewegen sich 25% schneller.', risk: 'Schnellere Gegner' },
    frenzy: { name: 'Raserei', desc: 'Gegner erscheinen weit häufiger.', risk: 'Dichtere Schwärme' },
    glass: { name: 'Glas-Protokoll', desc: 'Du erleidest +50% Schaden.', risk: 'Fragiler Rumpf' },
    titans: { name: 'Titanen-Bosse', desc: 'Bosse haben +80% HP.', risk: 'Wuchtigere Bosse' },
    lean: { name: 'Magere Zeiten', desc: 'EP-Gewinn um 20% reduziert.', risk: 'Langsameres Aufsteigen' },
    nightmare: { name: 'Albtraum', desc: 'Gegner erhalten +30% HP und +15% Tempo.', risk: 'Rundum schwerer' },
    overwhelm: { name: 'Überwältigung', desc: 'Weit mehr Gegner füllen zugleich die Arena.', risk: 'Dichtere Bildschirme' },
    juggernauts: { name: 'Juggernauts', desc: 'Gegner erhalten +60% HP, sind aber 15% langsamer.', risk: 'Zähe Gegner' },
  },
  achievements: {
    first_launch: { name: 'Erster Start', desc: 'Beende deinen ersten Lauf.' },
    centurion: { name: 'Zenturio', desc: 'Besiege 100 Gegner in einem einzigen Lauf.' },
    survive_5: { name: 'Halte die Stellung', desc: 'Überlebe 5 Minuten in einem Lauf.' },
    survive_10: { name: 'Letztes Gefecht', desc: 'Überlebe 10 Minuten in einem Lauf.' },
    survive_15: { name: 'Ewig', desc: 'Überlebe 15 Minuten in einem Lauf.' },
    slayer_1k: { name: 'Schlächter', desc: 'Besiege 1.000 Gegner über alle Läufe.' },
    slayer_10k: { name: 'Ausrotter', desc: 'Besiege 10.000 Gegner über alle Läufe.' },
    first_boss: { name: 'Riesentöter', desc: 'Zerstöre deinen ersten Boss.' },
    boss_hunter: { name: 'Bossjäger', desc: 'Zerstöre 10 Bosse über alle Läufe.' },
    triple_threat: { name: 'Dreifache Bedrohung', desc: 'Zerstöre 3 Bosse in einem einzigen Lauf.' },
    alchemist: { name: 'Alchemist', desc: 'Löse 60 Elementarreaktionen in einem Lauf aus.' },
    ascendant: { name: 'Aufsteigend', desc: 'Erreiche Charakterstufe 20 in einem einzigen Lauf.' },
    scorer_50k: { name: 'Punktejäger', desc: 'Erziele 50.000 Punkte in einem einzigen Lauf.' },
    scorer_100k: { name: 'Legende', desc: 'Erziele 100.000 Punkte in einem einzigen Lauf.' },
    fleet_admiral: { name: 'Flottenadmiral', desc: 'Schalte jeden Jäger frei.' },
    daredevil: { name: 'Draufgänger', desc: 'Beende einen Lauf mit 2+ aktiven Direktiven.' },
    defiant: { name: 'Trotzig', desc: 'Beende einen Lauf mit 4+ aktiven Direktiven.' },
    survive_20: { name: 'Unzerbrechlich', desc: 'Überlebe 20 Minuten in einem Lauf.' },
    ascendant_30: { name: 'Transzendent', desc: 'Erreiche Charakterstufe 30 in einem einzigen Lauf.' },
    scorer_250k: { name: 'Mythisch', desc: 'Erziele 250.000 Punkte in einem einzigen Lauf.' },
    chain_reactor: { name: 'Kettenreaktor', desc: 'Löse 120 Elementarreaktionen in einem Lauf aus.' },
    boss_rush: { name: 'Boss-Ansturm', desc: 'Zerstöre 5 Bosse in einem einzigen Lauf.' },
    slayer_50k: { name: 'Vernichter', desc: 'Besiege 50.000 Gegner über alle Läufe.' },
  },
  generators: {
    probe: { name: 'Erkundungssonde', desc: 'Eine einsame Drohne, die verirrte Partikel nippt.' },
    collector: { name: 'Staubsammler', desc: 'Durchkämmt das Trümmerfeld nach Nebel.' },
    refinery: { name: 'Ionen-Raffinerie', desc: 'Veredelt Rohstaub zu dichtem Nebel.' },
    harvester: { name: 'Gravitonsammler', desc: 'Verbiegt die Schwerkraft, um Nebel einzutrichtern.' },
    dyson: { name: 'Dyson-Knoten', desc: 'Zapft einen sterbenden Stern für rohen Ertrag an.' },
    singtap: { name: 'Singularitätszapfer', desc: 'Siphoniert ein Mikro-Schwarzes-Loch. Obszöner Ertrag.' },
    warpforge: { name: 'Warp-Schmiede', desc: 'Faltet die Raumzeit, um Nebel en gros zu prägen.' },
    quasar: { name: 'Quasar-Triebwerk', desc: 'Nutzt einen Galaxienkern. Die Realität ächzt.' },
    pulsar: { name: 'Pulsar-Array', desc: 'Ein Leuchtturm aus Neutronenpulsen pumpt Nebel.' },
    antimatter: { name: 'Antimaterie-Silo', desc: 'Vernichtet gespeicherte Antimaterie für atemberaubenden Ertrag.' },
    wormhole: { name: 'Wurmloch-Nexus', desc: 'Importiert rohen Nebel aus einem Parallelhimmel.' },
    galaxyforge: { name: 'Galaxienschmiede', desc: 'Lässt junge Galaxien als Raffinerielinie anlaufen.' },
    darkstar: { name: 'Dunkelstern-Triebwerk', desc: 'Verbrennt einen verhüllten Stern, den kein Teleskop sieht.' },
    cosmicloom: { name: 'Kosmischer Webstuhl', desc: 'Webt das kosmische Netz selbst zu dichtem Nebel.' },
    realityengine: { name: 'Realitäts-Triebwerk', desc: 'Verändert physikalische Konstanten zur Überproduktion.' },
    infinityspire: { name: 'Unendlichkeitsturm', desc: 'Ein Turm am Rand von allem. Endloser Ausstoß.' },
  },
  special: {
    siege_overdrive: { name: 'Belagerungs-Overdrive', desc: '+8% Waffenschaden pro Stufe' },
    aegis_core: { name: 'Ägis-Kern', desc: '+30 max. HP pro Stufe' },
    void_prospector: { name: 'Leeren-Prospektor', desc: '+10% verdienter Sternenstaub pro Stufe' },
    warp_drive: { name: 'Warp-Antrieb', desc: '+4% Bewegungstempo pro Stufe' },
    flux_lens: { name: 'Flux-Linse', desc: '+8% EP-Gewinn pro Stufe' },
    targeting_uplink: { name: 'Ziel-Uplink', desc: '+4% Krit-Chance pro Stufe' },
    chrono_capacitor: { name: 'Chrono-Kondensator', desc: '+4% Angriffstempo pro Stufe' },
    magnetic_lattice: { name: 'Magnetgitter', desc: '+14% Aufsammelradius pro Stufe' },
    kinetic_amplifier: { name: 'Kinetik-Verstärker', desc: '+15% Krit-Schaden pro Stufe' },
    phase_shift: { name: 'Phasenverschiebung', desc: '+3% Ausweichchance pro Stufe' },
    vampiric_core: { name: 'Vampirkern', desc: '+2% Lebensraub pro Stufe' },
    blast_capacitor: { name: 'Explosions-Kondensator', desc: '+8% Wirkungsbereich pro Stufe' },
    piercing_rounds: { name: 'Durchschlaggeschosse', desc: '+1 Projektil-Durchschlag pro Stufe' },
    guardian_protocol: { name: 'Wächter-Protokoll', desc: '+3 Panzerung pro Stufe' },
    nanite_regeneration: { name: 'Naniten-Regeneration', desc: '+1 HP/Sek. Regeneration pro Stufe' },
    fortune_matrix: { name: 'Glücks-Matrix', desc: '+6% Glück pro Stufe' },
    event_horizon: { name: 'Ereignishorizont', desc: '+12% Singularitäts-Laderate pro Stufe' },
    phoenix_core: { name: 'Phönix-Kern', desc: '+1 Wiederbelebung pro Stufe' },
  },
  prestige: {
    resonant_core: { name: 'Resonanzkern', desc: '+12% Nebelproduktion pro Stufe' },
    hardened_beam: { name: 'Gehärteter Strahl', desc: '+35% Handschürf-Ertrag pro Stufe' },
    mass_production: { name: 'Massenproduktion', desc: '−4% Generatorkosten pro Stufe' },
    milestone_mastery: { name: 'Meilenstein-Meisterschaft', desc: '+15% auf jeden Generator-Meilenstein pro Stufe' },
    temporal_buffer: { name: 'Temporaler Puffer', desc: '+2h Offline-Nachholung pro Stufe' },
    dense_singularity: { name: 'Dichte Singularität', desc: '+20% Kerne pro Kollaps pro Stufe' },
    collapse_memory: { name: 'Kollaps-Gedächtnis', desc: 'Behalte +6% des Gesamt-Nebels durch den Kollaps pro Stufe' },
    lucky_resonance: { name: 'Glücksresonanz', desc: '+25% Schub-Häufigkeit & +20% Auszahlung pro Stufe' },
    quantum_resonance: { name: 'Quantenresonanz', desc: '+18% Nebelproduktion pro Stufe' },
    overcharged_beam: { name: 'Überladener Strahl', desc: '+40% Handschürf-Ertrag pro Stufe' },
    bulk_fabricator: { name: 'Massen-Fabrikator', desc: '−5% Generatorkosten pro Stufe' },
    milestone_overdrive: { name: 'Meilenstein-Overdrive', desc: '+20% auf jeden Generator-Meilenstein pro Stufe' },
    chronal_reservoir: { name: 'Chrono-Reservoir', desc: '+3h Offline-Nachholung pro Stufe' },
    temporal_lens: { name: 'Temporale Linse', desc: '+25% Schub-Rauschdauer pro Stufe' },
    dormant_reactor: { name: 'Schlummernder Reaktor', desc: '+15% Offline-Produktion pro Stufe' },
    flux_siphon: { name: 'Flux-Siphon', desc: '+20% Nebel-Schub am Laufende pro Stufe' },
  },
  surges: {
    lucky: { name: 'Glücks-Nebel' },
    frenzy: { name: 'Produktionsrausch' },
    click_frenzy: { name: 'Tipp-Rausch' },
    bloom: { name: 'Resonanzblüte' },
    windfall: { name: 'Stellarer Geldsegen' },
    overflow: { name: 'Nebel-Überlauf' },
    supernova: { name: 'Supernova-Rausch' },
    overclock: { name: 'Übertaktungs-Schub' },
    core_cache: { name: 'Kern-Depot' },
    core_vault: { name: 'Kern-Tresor' },
  },
  clickUpgrade: {
    mininglaser: { name: 'Schürflaser', desc: 'Überlade den Schürfstrahl — mehr Nebel aus jedem Handtipp.' },
  },
  themes: {
    crimson: { name: 'Purpurne Vorhut' },
    azure: { name: 'Azurblaue Wächter' },
    verdant: { name: 'Grünender Schwarm' },
    amber: { name: 'Bernstein-Legion' },
    void: { name: 'Leeren-Chor' },
    saucer: { name: 'Untertassen-Armada' },
    spectral: { name: 'Spektraler Schwarm' },
    glacier: { name: 'Gletscherschlund' },
    plasma: { name: 'Plasmasturm' },
    dread: { name: 'Grauen-Nemesis' },
  },
  // Reactions are keyed by their canonical English name (world.js renders r.name).
  reactions: {
    Shatter: 'Zersplittern',
    Overload: 'Überladung',
    Superconduct: 'Supraleitung',
    Collapse: 'Kollaps',
    'Black Ice': 'Schwarzeis',
    'Ion Storm': 'Ionensturm',
    Combust: 'Verbrennung',
    Frostbite: 'Erfrierung',
    Electrolysis: 'Elektrolyse',
    Dissolve: 'Zersetzung',
  },
};

// Return the German overlay object for a content id (or {} to fall back to EN).
export function tData(ns, id) {
  if (lang === 'en') return EMPTY;
  const byNs = DE[ns];
  return (byNs && byNs[id]) || EMPTY;
}

// Localized field accessors: German overlay first, English def as the fallback.
export function dName(ns, def) {
  if (!def) return '';
  const o = tData(ns, def.id != null ? def.id : def.key);
  return o.name || def.name;
}
export function dDesc(ns, def) {
  if (!def) return '';
  const o = tData(ns, def.id != null ? def.id : def.key);
  return o.desc || def.desc;
}
export function dTag(ns, def) {
  if (!def) return '';
  const o = tData(ns, def.id != null ? def.id : def.key);
  return o.tag || def.tag || '';
}
export function dRisk(ns, def) {
  if (!def) return '';
  const o = tData(ns, def.id != null ? def.id : def.key);
  return o.risk || def.risk || '';
}

// Reaction names are keyed by the English name itself.
export function tReaction(name) {
  if (lang === 'en') return name;
  return (DE.reactions && DE.reactions[name]) || name;
}

// --------------------------------------------------- generated stat blurbs
// The data modules' effect() helpers produce short English stat strings like
// "+40% damage". Rather than duplicate the numeric logic per language, we keep
// English single-sourced and translate the (small, controlled) vocabulary here.
// Ordered longest-phrase-first so multi-word terms win before their parts.
const EFFECT_PHRASES = [
  ['crit damage', 'Krit-Schaden'],
  ['crit chance', 'Krit-Chance'],
  ['charge rate', 'Laderate'],
  ['Singularity charge', 'Singularitäts-Ladung'],
  ['move speed', 'Bewegungstempo'],
  ['attack speed', 'Angriffstempo'],
  ['pickup range', 'Aufsammelreichweite'],
  ['max HP', 'max. HP'],
  ['HP/sec', 'HP/Sek.'],
  ['HP/s regen', 'HP/Sek. Regeneration'],
  ['generator cost', 'Generatorkosten'],
  ['milestone power', 'Meilenstein-Stärke'],
  ['tap yield', 'Tipp-Ertrag'],
  ['offline output', 'Offline-Ausstoß'],
  ['run Nebula', 'Lauf-Nebel'],
  ['frenzy duration', 'Rausch-Dauer'],
  ['Cores on Collapse', 'Kerne beim Kollaps'],
  ['of Nebula', 'des Nebels'],
  ['1 revive per run', '1 Wiederbelebung pro Lauf'],
  ['revives', 'Wiederbelebungen'],
  ['revive', 'Wiederbelebung'],
  ['production', 'Produktion'],
  ['payout', 'Auszahlung'],
  ['Surges', 'Schübe'],
  ['offline', 'Offline'],
  ['total', 'gesamt'],
  ['keep', 'behalte'],
  ['damage', 'Schaden'],
  ['armor', 'Panzerung'],
  ['crit', 'Krit'],
  ['dodge', 'Ausweichen'],
  ['lifesteal', 'Lebensraub'],
  ['luck', 'Glück'],
  ['pierce', 'Durchschlag'],
  ['area', 'Wirkungsbereich'],
  ['Stardust', 'Sternenstaub'],
  ['Nebula', 'Nebel'],
  ['XP', 'EP'],
];

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Translate a generated stat/effect string. English passes through unchanged.
export function translateEffect(str) {
  if (lang === 'en' || !str) return str;
  let out = str;
  for (const [en, de] of EFFECT_PHRASES) {
    out = out.replace(new RegExp(escapeRe(en), 'g'), de);
  }
  return out;
}

// Exposed for tests: the raw string/overlay tables.
export const __STR = STR;
export const __DE = DE;
