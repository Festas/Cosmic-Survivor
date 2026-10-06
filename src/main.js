// main.js — bootstrap, main loop and UI wiring for Cosmic Survivor.

import { AudioEngine } from './engine/audio.js';
import { Input } from './engine/input.js';
import { Store } from './engine/storage.js';
import { rng } from './engine/utils.js';
import { World } from './game/world.js';
import { RARITY } from './game/upgrades.js';
import { weaponDef } from './game/weapons.js';
import { SHIPS, shipById, DEFAULT_SHIP_ID } from './game/ships.js';
import { META_UPGRADES, metaCost } from './game/meta.js';
import { DIRECTIVES, DIRECTIVE_BY_ID, directiveStardustMultiplier } from './game/modifiers.js';
import { ACHIEVEMENTS, evaluateAchievements } from './game/achievements.js';
import { formatNumber, formatTime } from './engine/utils.js';

const $ = (id) => document.getElementById(id);

const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha: false });

const audio = new AudioEngine();
const input = new Input(canvas);
const store = Store;

let world = new World({ viewW: window.innerWidth, viewH: window.innerHeight, audio, store, rng });
let started = false;
let paused = false;
let lastMultTier = 1;
let lastLoadoutSig = '';
let banishMode = false;

// ------------------------------------------------------------- canvas size
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  world.viewW = w;
  world.viewH = h;
  world.camera.resize(w, h);
}
window.addEventListener('resize', resize);

// ------------------------------------------------------------- settings
function applySettingsToUI() {
  const s = store.getSettings();
  for (const id of ['opt-music', 'opt-music2']) if ($(id)) $(id).checked = s.music;
  for (const id of ['opt-sfx', 'opt-sfx2']) if ($(id)) $(id).checked = !s.muted;
  for (const id of ['opt-shake', 'opt-shake2']) if ($(id)) $(id).checked = s.shake;
}
function wireSetting(ids, key, fn) {
  for (const id of ids) {
    const el = $(id);
    if (!el) continue;
    el.addEventListener('change', () => {
      fn(el.checked);
      applySettingsToUI();
    });
  }
}
wireSetting(['opt-music', 'opt-music2'], 'music', (v) => { store.setSetting('music', v); audio.setMusic(v); });
wireSetting(['opt-sfx', 'opt-sfx2'], 'muted', (v) => { store.setSetting('muted', !v); audio.setMuted(!v); });
wireSetting(['opt-shake', 'opt-shake2'], 'shake', (v) => { store.setSetting('shake', v); });

// ------------------------------------------------------------- hangar / ships
// Ships the player actually owns (free ships are always available).
function ownedShips() {
  return SHIPS.filter((s) => s.unlockCost === 0 || store.isShipUnlocked(s.id));
}

let pickIndex = 0;

// Start-screen quick picker: cycle through owned ships and remember the choice.
function updateShipPick() {
  const owned = ownedShips();
  const selId = store.getSelectedShip();
  let idx = owned.findIndex((s) => s.id === selId);
  if (idx < 0) idx = 0;
  pickIndex = ((pickIndex % owned.length) + owned.length) % owned.length;
  // keep pickIndex in sync with the stored selection on first paint
  if (owned[pickIndex].id !== selId && owned[idx]) pickIndex = idx;
  const ship = owned[pickIndex] || shipById(DEFAULT_SHIP_ID);
  store.selectShip(ship.id);
  $('ship-pick-icon').textContent = ship.icon;
  $('ship-pick-icon').style.color = ship.color;
  $('ship-pick-name').textContent = ship.name;
  $('ship-pick-tag').textContent = ship.tag;
  const multi = owned.length > 1;
  $('ship-prev').classList.toggle('hidden', !multi);
  $('ship-next').classList.toggle('hidden', !multi);
}

function cycleShip(dir) {
  const owned = ownedShips();
  pickIndex = ((pickIndex + dir) % owned.length + owned.length) % owned.length;
  store.selectShip(owned[pickIndex].id);
  updateShipPick();
  audio.play('ui');
}

// Refresh the start screen's Stardust balance + ship summary.
function refreshStart() {
  $('start-stardust').textContent = formatNumber(store.stardust);
  updateShipPick();
  updateStartDirectives();
}

// ---- Hangar overlay ----
let hangarTab = 'ships';
const HANGAR_TABS = ['ships', 'meta', 'directives', 'codex'];

function openHangar() {
  renderHangar();
  $('hangar').classList.remove('hidden');
}
function closeHangar() {
  $('hangar').classList.add('hidden');
  refreshStart();
}

function setHangarTab(tab) {
  hangarTab = tab;
  for (const t of HANGAR_TABS) {
    const btn = $('tab-' + t);
    const body = $('hangar-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (body) body.classList.toggle('hidden', t !== tab);
  }
}

function renderHangar() {
  $('hangar-stardust').textContent = formatNumber(store.stardust);
  renderPilotRecord();
  renderShips();
  renderMeta();
  renderDirectives();
  renderCodex();
  setHangarTab(hangarTab);
}

// Lifetime "pilot record" — surfaces the persisted career stats so progression
// feels tangible across runs (data from storage.js).
function renderPilotRecord() {
  const d = store.get();
  $('rec-runs').textContent = formatNumber(d.runs || 0);
  $('rec-best').textContent = formatNumber(d.highScore || 0);
  $('rec-time').textContent = formatTime(d.bestTime || 0);
  $('rec-kills').textContent = formatNumber(d.totalKills || 0);
  $('rec-ls').textContent = formatNumber(d.lifetimeStardust || 0);
}

function renderShips() {
  const wrap = $('hangar-ships');
  const selId = store.getSelectedShip();
  wrap.innerHTML = '';
  for (const ship of SHIPS) {
    const unlocked = ship.unlockCost === 0 || store.isShipUnlocked(ship.id);
    const selected = selId === ship.id;
    const def = weaponDef(ship.weapon);
    const card = document.createElement('div');
    card.className = 'ship-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
    card.style.setProperty('--accent', ship.color);
    let action;
    if (selected) action = '<div class="ship-badge">✓ SELECTED</div>';
    else if (unlocked) action = '<button class="btn btn-sm ship-select">SELECT</button>';
    else {
      const afford = store.stardust >= ship.unlockCost;
      action = `<button class="btn btn-sm ship-unlock"${afford ? '' : ' disabled'}>✦ ${formatNumber(ship.unlockCost)} UNLOCK</button>`;
    }
    card.innerHTML = `
      <div class="ship-card-head"><span class="ship-ico">${ship.icon}</span><span class="ship-name">${ship.name}</span></div>
      <div class="ship-tag">${ship.tag}</div>
      <div class="ship-desc">${ship.desc}</div>
      <div class="ship-weapon">Starter: <b>${def ? def.name : ship.weapon}</b></div>
      <div class="ship-action">${action}</div>`;
    const selectBtn = card.querySelector('.ship-select');
    const unlockBtn = card.querySelector('.ship-unlock');
    if (selectBtn) selectBtn.addEventListener('click', () => { store.selectShip(ship.id); audio.play('ui'); renderHangar(); });
    if (unlockBtn) unlockBtn.addEventListener('click', () => {
      if (store.unlockShip(ship.id, ship.unlockCost)) { store.selectShip(ship.id); audio.play('levelup'); renderHangar(); }
    });
    wrap.appendChild(card);
  }
}

function renderMeta() {
  const wrap = $('hangar-meta');
  wrap.innerHTML = '';
  for (const def of META_UPGRADES) {
    const level = store.getMetaLevel(def.id);
    const maxed = level >= def.max;
    const cost = metaCost(def, level);
    const afford = store.stardust >= cost;
    const row = document.createElement('div');
    row.className = 'meta-row' + (maxed ? ' maxed' : '');
    const pips = Array.from({ length: def.max }, (_, i) => `<span class="pip${i < level ? ' on' : ''}"></span>`).join('');
    const btn = maxed
      ? '<div class="meta-max">MAX</div>'
      : `<button class="btn btn-sm meta-buy"${afford ? '' : ' disabled'}>✦ ${formatNumber(cost)}</button>`;
    row.innerHTML = `
      <div class="meta-ico">${def.icon}</div>
      <div class="meta-main">
        <div class="meta-name">${def.name} <span class="meta-lvl">${level}/${def.max}</span></div>
        <div class="meta-desc">${def.desc}</div>
        <div class="meta-pips">${pips}</div>
      </div>
      <div class="meta-action">${btn}</div>`;
    const buyBtn = row.querySelector('.meta-buy');
    if (buyBtn) buyBtn.addEventListener('click', () => {
      if (store.buyMeta(def.id, cost, def.max)) { audio.play('pickup'); renderHangar(); }
    });
    wrap.appendChild(row);
  }
}

// ---- Directives: opt-in challenge modifiers (more risk → more Stardust) ----
function renderDirectives() {
  const wrap = $('hangar-directives');
  if (!wrap) return;
  const active = new Set(store.getDirectives());
  wrap.innerHTML = '';

  const note = document.createElement('div');
  note.className = 'directive-note';
  const mult = directiveStardustMultiplier(store.getDirectives());
  note.innerHTML = active.size
    ? `<b>${active.size}</b> active · Stardust reward <b>×${mult.toFixed(2)}</b>`
    : 'Toggle Directives to make runs harder — and multiply the Stardust you earn.';
  wrap.appendChild(note);

  for (const d of DIRECTIVES) {
    const on = active.has(d.id);
    const pct = Math.round((d.stardustMul - 1) * 100);
    const card = document.createElement('div');
    card.className = 'directive-card' + (on ? ' active' : '');
    card.innerHTML = `
      <div class="dir-head">
        <span class="dir-ico">${d.icon}</span>
        <span class="dir-name">${d.name}</span>
        <span class="dir-reward">✦ +${pct}%</span>
      </div>
      <div class="dir-desc">${d.desc}</div>
      <div class="dir-foot">
        <span class="dir-risk">${d.risk}</span>
        <span class="dir-toggle">${on ? 'ACTIVE' : 'ENABLE'}</span>
      </div>`;
    card.addEventListener('click', () => {
      store.toggleDirective(d.id);
      audio.play('ui');
      renderDirectives();
    });
    wrap.appendChild(card);
  }
  updateStartDirectives();
}

// ---- Codex: the commendation gallery (milestone awards) ----
function renderCodex() {
  const wrap = $('hangar-codex');
  if (!wrap) return;
  const owned = new Set(store.getAchievements());
  wrap.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'codex-progress';
  head.innerHTML = `<b>${owned.size}</b> / ${ACHIEVEMENTS.length} commendations earned`;
  wrap.appendChild(head);

  for (const a of ACHIEVEMENTS) {
    const got = owned.has(a.id);
    const cell = document.createElement('div');
    cell.className = 'codex-cell' + (got ? ' earned' : ' locked');
    cell.innerHTML = `
      <div class="cx-ico">${got ? a.icon : '🔒'}</div>
      <div class="cx-main">
        <div class="cx-name">${a.name}</div>
        <div class="cx-desc">${a.desc}</div>
      </div>
      <div class="cx-reward">✦ ${a.reward}</div>`;
    wrap.appendChild(cell);
  }
}

// Start-screen summary of the directives that will apply to the next run.
function updateStartDirectives() {
  const node = $('start-directives');
  if (!node) return;
  const ids = store.getDirectives();
  if (!ids.length) { node.classList.add('hidden'); node.innerHTML = ''; return; }
  const icons = ids.map((id) => {
    const d = DIRECTIVE_BY_ID[id];
    return d ? `<span class="sd-ico" title="${d.name}">${d.icon}</span>` : '';
  }).join('');
  const mult = directiveStardustMultiplier(ids);
  node.innerHTML = `<span class="sd-label">DIRECTIVES</span>${icons}<span class="sd-mult">✦ ×${mult.toFixed(2)}</span>`;
  node.classList.remove('hidden');
}

// ------------------------------------------------------------- run control
function startRun() {
  audio.unlock();
  const s = store.getSettings();
  audio.setMuted(s.muted);
  audio.setMusic(s.music);
  rng.reseed((Math.random() * 2 ** 32) >>> 0);
  world.reset({
    shipId: store.getSelectedShip(),
    metaLevels: store.getMeta(),
    directives: store.getDirectives().slice(),
  });
  bindWorld();
  resize();
  started = true;
  paused = false;
  lastMultTier = 1;
  $('start').classList.add('hidden');
  $('gameover').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('levelup').classList.add('hidden');
  $('hud').classList.remove('hidden');
  maybeShowTouch();
}

function bindWorld() {
  world.onLevelUp = (choices) => showLevelUp(choices);
  world.onGameOver = (summary) => showGameOver(summary);
}

function togglePause(force) {
  if (!started || world.state !== 'playing') return;
  paused = force !== undefined ? force : !paused;
  $('pause').classList.toggle('hidden', !paused);
  if (paused) {
    $('pause-stats').innerHTML = statRows({
      Score: formatNumber(world.score), Time: formatTime(world.elapsed),
      Level: world.level, Kills: world.kills,
    });
    applySettingsToUI();
  }
}

// ------------------------------------------------------------- level up UI
const KIND_LABEL = {
  'weapon-new': 'NEW WEAPON', 'weapon-up': 'UPGRADE', 'evolve': 'EVOLVE', 'item': 'ITEM',
};

function showLevelUp(choices) {
  banishMode = false;
  const wrap = $('cards');
  wrap.classList.remove('banish-mode');
  wrap.innerHTML = '';
  choices.forEach((up, i) => {
    const r = RARITY[up.rarity] || RARITY.common;
    const card = document.createElement('div');
    card.className = 'card' + (up.kind === 'evolve' ? ' evolve' : '');
    card.style.setProperty('--rarity', r.color);
    card.innerHTML = `
      <div class="kind">${KIND_LABEL[up.kind] || ''}</div>
      <div class="icon">${up.icon}</div>
      <div class="name">${up.name}</div>
      <div class="desc">${up.desc}</div>
      <div class="rarity">${up.tag || r.label} · ${i + 1}</div>`;
    card.addEventListener('click', () => {
      if (banishMode) doBanish(up);
      else pickUpgrade(up);
    });
    wrap.appendChild(card);
  });
  updateDraftTools();
  $('levelup').classList.remove('hidden');
}

function updateDraftTools() {
  const rn = world.rerollsLeft || 0;
  const bn = world.banishLeft || 0;
  $('reroll-n').textContent = rn;
  $('banish-n').textContent = bn;
  $('reroll-btn').disabled = rn <= 0;
  $('banish-btn').disabled = bn <= 0;
  $('banish-btn').classList.toggle('active', banishMode);
}

function pickUpgrade(up) {
  if (world.state !== 'levelup') return;
  world.applyUpgrade(up);
  banishMode = false;
  $('levelup').classList.add('hidden');
}

function doBanish(card) {
  // world.banishChoice re-draws a fresh set and fires onLevelUp -> showLevelUp,
  // which re-renders the cards and resets banish mode.
  world.banishChoice(card);
}

function toggleBanishMode() {
  if ((world.banishLeft || 0) <= 0) return;
  banishMode = !banishMode;
  $('cards').classList.toggle('banish-mode', banishMode);
  updateDraftTools();
}

// ------------------------------------------------------------- game over UI
function showGameOver(summary) {
  $('hud').classList.add('hidden');
  // Evaluate commendations first: career totals were already persisted by
  // world.endRun (recordRun), so the merged context is up to date. Any bounty
  // Stardust is added before we read the running total below.
  const newCommends = awardCommendations(summary);

  $('go-score').textContent = formatNumber(summary.score);
  $('go-newbest').classList.toggle('hidden', !summary.newBest);
  const earned = summary.stardust || 0;
  const total = store.stardust;
  const goSd = $('go-stardust');
  goSd.textContent = `✦ +${formatNumber(earned)} Stardust  ·  ${formatNumber(total)} total`;
  goSd.classList.toggle('none', earned <= 0);

  const gc = $('go-commends');
  if (gc) {
    if (newCommends.length) {
      gc.innerHTML = newCommends.map((a) =>
        `<div class="commend"><span class="c-ico">${a.icon}</span><span class="c-name">${a.name}</span><span class="c-rew">✦ +${a.reward}</span></div>`).join('');
      gc.classList.remove('hidden');
    } else {
      gc.innerHTML = '';
      gc.classList.add('hidden');
    }
  }

  const rows = {
    Time: formatTime(summary.time),
    Level: summary.level,
    Kills: summary.kills,
    Best: formatNumber(summary.highScore),
  };
  if (summary.bossKills > 0) rows.Bosses = summary.bossKills;
  $('go-stats').innerHTML = statRows(rows);
  $('gameover').classList.remove('hidden');
}

// Merge the just-finished run summary with persisted career totals into the flat
// context the commendation checks read (see achievements.js).
function buildAchievementCtx(summary) {
  const d = store.get();
  return {
    // single-run metrics
    score: summary.score, time: summary.time, level: summary.level,
    kills: summary.kills, bossKills: summary.bossKills || 0,
    reactions: summary.reactions || 0, directives: summary.directives || 0,
    // lifetime / career metrics
    runs: d.runs || 0, totalKills: d.totalKills || 0,
    bossKillsTotal: d.bossKillsTotal || 0,
    shipsUnlocked: ownedShips().length, shipsTotal: SHIPS.length,
  };
}

// Unlock any newly earned commendations, pay their one-time Stardust bounty, and
// surface them via toasts. Returns the freshly unlocked definitions (for the
// game-over panel).
function awardCommendations(summary) {
  const fresh = evaluateAchievements(store.getAchievements(), buildAchievementCtx(summary));
  if (!fresh.length) return [];
  let bounty = 0;
  for (const a of fresh) if (store.unlockAchievement(a.id)) bounty += a.reward || 0;
  if (bounty > 0) { store.addStardust(bounty); audio.play('levelup'); }
  for (const a of fresh) {
    showToast(`<span class="t-ico">${a.icon}</span><div class="t-body"><b>${a.name}</b><span>Commendation · ✦ +${a.reward}</span></div>`);
  }
  return fresh;
}

// Transient top-of-screen notification (auto-dismisses via CSS animation).
function showToast(html) {
  const wrap = $('toast');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = html;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function statRows(obj) {
  return Object.entries(obj).map(([k, v]) => `<div>${k} <b>${v}</b></div>`).join('');
}

// ------------------------------------------------------------- touch
function maybeShowTouch() {
  const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (touch) {
    $('touch-controls').classList.remove('hidden');
    input.bindButton($('btn-dash'), $('btn-sing'));
  }
}

// ------------------------------------------------------------- HUD update
const el = {
  threat: $('threat'), enemies: $('enemies'), timer: $('timer'),
  score: $('score'), mult: $('multiplier'), hiscore: $('hiscore'),
  healthFill: $('health-fill'), healthText: $('health-text'),
  xpFill: $('xp-fill'), levelText: $('level-text'),
  singArc: $('sing-arc'), dashArc: $('dash-arc'),
  abilitySing: $('ability-sing'), abilityDash: $('ability-dash'),
  bossBar: $('boss-bar'), bossName: $('boss-name'), bossFill: $('boss-fill'),
  comboPop: $('combo-pop'),
  odBar: $('overdrive-bar'), odFill: $('od-fill'), odText: $('od-text'),
  loadout: $('loadout'),
  reviveChip: $('revive-chip'), reviveN: $('revive-n'),
  directiveChip: $('directive-chip'), directiveN: $('directive-n'),
};
const ARC_LEN = 119.4;

function updateHud() {
  const h = world.getHud();
  el.threat.textContent = h.threat;
  el.enemies.textContent = h.enemies;
  const revives = h.revives || 0;
  el.reviveChip.classList.toggle('hidden', revives <= 0);
  if (revives > 0) el.reviveN.textContent = revives;
  const dirs = world.directives ? world.directives.length : 0;
  el.directiveChip.classList.toggle('hidden', dirs <= 0);
  if (dirs > 0) el.directiveN.textContent = dirs;
  el.timer.textContent = formatTime(h.time);
  el.score.textContent = formatNumber(h.score);
  el.mult.textContent = 'x' + h.multiplier.toFixed(1);
  el.hiscore.textContent = 'BEST ' + formatNumber(store.get().highScore);

  const hpFrac = Math.max(0, h.hp / h.maxHp);
  el.healthFill.style.width = (hpFrac * 100) + '%';
  el.healthText.textContent = `${h.hp} / ${h.maxHp}`;
  el.xpFill.style.width = Math.min(100, (h.xp / h.xpToNext) * 100) + '%';
  el.levelText.textContent = 'LV ' + h.level;

  el.singArc.style.strokeDashoffset = ARC_LEN * (1 - Math.min(1, h.singCharge / h.singMax));
  el.abilitySing.classList.toggle('ready', h.singReady);
  const dashFrac = 1 - Math.min(1, h.dashCd / h.dashMax);
  el.dashArc.style.strokeDashoffset = ARC_LEN * (1 - dashFrac);
  el.abilityDash.classList.toggle('ready', h.dashCd <= 0);

  // Overdrive meter
  const p = world.player;
  const odActive = p.overdriveTime > 0;
  const odFrac = odActive ? 1 : Math.min(1, p.overdrive / 100);
  el.odFill.style.width = (odFrac * 100) + '%';
  el.odBar.classList.toggle('ready', p.overdrive >= 100 && !odActive);
  el.odBar.classList.toggle('active', odActive);
  el.odText.textContent = odActive ? 'OVERDRIVE!' : 'OVERDRIVE';

  // Weapon loadout strip (rebuild only when the loadout actually changes)
  const sig = p.weapons.map((w) => w.id + w.level).join(',');
  if (sig !== lastLoadoutSig) {
    lastLoadoutSig = sig;
    el.loadout.innerHTML = p.weapons.map((w) => {
      const def = weaponDef(w);
      const evolved = def && def.evolved ? ' evolved' : '';
      const name = def ? def.name : w.id;
      const icon = def ? def.icon : '❓';
      return `<div class="w${evolved}" title="${name}">${icon}<b>${w.level}</b></div>`;
    }).join('');
  }

  if (h.boss) {
    el.bossBar.classList.remove('hidden');
    el.bossName.textContent = h.boss.type.name.toUpperCase();
    el.bossFill.style.width = Math.max(0, (h.boss.hp / h.boss.maxHp) * 100) + '%';
  } else {
    el.bossBar.classList.add('hidden');
  }

  // combo popup on tier change
  const tier = Math.floor(h.multiplier * 10) / 10;
  if (tier > lastMultTier && h.multiplier > 1) {
    el.comboPop.textContent = 'COMBO x' + h.multiplier.toFixed(1);
    el.comboPop.classList.remove('show');
    void el.comboPop.offsetWidth;
    el.comboPop.classList.add('show');
  }
  lastMultTier = tier;
}

// ------------------------------------------------------------- main loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const cmd = input.poll();

  if (started) {
    if (cmd.pause) togglePause();
    if (!paused) {
      // keyboard draft selection — mirror card clicks so number keys honour
      // banish mode too (otherwise 1/2/3 would pick a card you meant to banish).
      if (world.state === 'levelup' && cmd.choose >= 0 && world.pendingChoices) {
        const c = world.pendingChoices[cmd.choose];
        if (c) { if (banishMode) doBanish(c); else pickUpgrade(c); }
      }
      world.update(dt, cmd);
    }
    world.render(ctx);
    updateHud();
  } else {
    // idle attract render behind the start menu
    world.camera.follow(world.player.x, world.player.y, dt);
    world.background.update(dt);
    world.render(ctx);
  }

  requestAnimationFrame(frame);
}

// ------------------------------------------------------------- buttons
$('play-btn').addEventListener('click', startRun);
$('retry-btn').addEventListener('click', startRun);
$('resume-btn').addEventListener('click', () => togglePause(false));
$('reroll-btn').addEventListener('click', () => { world.rerollChoices(); });
$('banish-btn').addEventListener('click', toggleBanishMode);

// Hangar + ship picker
$('hangar-btn').addEventListener('click', openHangar);
$('go-hangar-btn').addEventListener('click', openHangar);
$('hangar-close').addEventListener('click', closeHangar);
$('tab-ships').addEventListener('click', () => setHangarTab('ships'));
$('tab-meta').addEventListener('click', () => setHangarTab('meta'));
$('tab-directives').addEventListener('click', () => setHangarTab('directives'));
$('tab-codex').addEventListener('click', () => setHangarTab('codex'));
$('ship-prev').addEventListener('click', () => cycleShip(-1));
$('ship-next').addEventListener('click', () => cycleShip(1));

// level-up keyboard shortcuts (reroll / banish). Numeric picks are handled in the
// main loop via the input poller.
window.addEventListener('keydown', (e) => {
  if (!started || world.state !== 'levelup') return;
  const k = e.key.toLowerCase();
  if (k === 'r') { world.rerollChoices(); e.preventDefault(); }
  else if (k === 'b') { toggleBanishMode(); e.preventDefault(); }
});
$('quit-btn').addEventListener('click', () => {
  togglePause(false);
  started = false;
  $('hud').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('start').classList.remove('hidden');
});

// pause when the tab loses focus mid-run
document.addEventListener('visibilitychange', () => {
  if (document.hidden && started && world.state === 'playing') togglePause(true);
});

applySettingsToUI();
refreshStart();
resize();
requestAnimationFrame(frame);

// expose for debugging / tests
window.__game = { world: () => world, start: startRun };

// register the service worker for offline play (ignored on file://)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    // When a freshly deployed service worker takes control, reload once so the
    // running game swaps to the new code instead of the stale cached version.
    // Only returning visitors already have a controller, so first loads are spared
    // a needless reload.
    if (navigator.serviceWorker.controller) {
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    }
  });
}
