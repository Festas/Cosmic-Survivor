// main.js — bootstrap, main loop and UI wiring for Cosmic Survivor.

import { AudioEngine } from './engine/audio.js';
import { Input } from './engine/input.js';
import { Store } from './engine/storage.js';
import { rng } from './engine/utils.js';
import { World } from './game/world.js';
import { RARITY } from './game/upgrades.js';
import { weaponDef } from './game/weapons.js';
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

// ------------------------------------------------------------- run control
function startRun() {
  audio.unlock();
  const s = store.getSettings();
  audio.setMuted(s.muted);
  audio.setMusic(s.music);
  rng.reseed((Math.random() * 2 ** 32) >>> 0);
  world.reset();
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
  $('go-score').textContent = formatNumber(summary.score);
  $('go-newbest').classList.toggle('hidden', !summary.newBest);
  $('go-stats').innerHTML = statRows({
    Time: formatTime(summary.time),
    Level: summary.level,
    Kills: summary.kills,
    Best: formatNumber(summary.highScore),
  });
  $('gameover').classList.remove('hidden');
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
};
const ARC_LEN = 119.4;

function updateHud() {
  const h = world.getHud();
  el.threat.textContent = h.threat;
  el.enemies.textContent = h.enemies;
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
      // keyboard draft selection
      if (world.state === 'levelup' && cmd.choose >= 0 && world.pendingChoices) {
        const c = world.pendingChoices[cmd.choose];
        if (c) pickUpgrade(c);
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
resize();
requestAnimationFrame(frame);

// expose for debugging / tests
window.__game = { world: () => world, start: startRun };

// register the service worker for offline play (ignored on file://)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
