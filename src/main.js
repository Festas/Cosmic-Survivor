// main.js — bootstrap, main loop and UI wiring for Cosmic Survivor.

import { AudioEngine } from './engine/audio.js';
import { Input } from './engine/input.js';
import { Store } from './engine/storage.js';
import { rng } from './engine/utils.js';
import { World } from './game/world.js';
import { RARITY } from './game/upgrades.js';
import {
  t, dName, dDesc, dTag, dRisk, tReaction, translateEffect,
  getLang, setLang, onLangChange, detectLang, LANGUAGES,
} from './engine/i18n.js';
import { weaponDef } from './game/weapons.js';
import { SHIPS, shipById, DEFAULT_SHIP_ID } from './game/ships.js';
import { META_UPGRADES, metaCost } from './game/meta.js';
import {
  GENERATORS, generatorCost, generatorBulkCost, maxAffordable, baseRate, totalRate,
  prestigeGain, prestigeMultiplier, mainBoostMultiplier, PRESTIGE_BASE,
  SPECIAL_UPGRADES, specialCost, canBuySpecial, offlineGain,
  generatorMilestoneMultiplier, generatorMilestoneProgress, MILESTONE_STEP, MILESTONE_BONUS,
  clickYield, clickUpgradeCost, CLICK_UPGRADE,
  PRESTIGE_UPGRADES, prestigeUpgradeCost, canBuyPrestige, computePerks,
  prestigeCoreGain, collapseSeedNebula, offlineCapSeconds,
  pickSurgeType, rollSurge, SURGE_MIN_INTERVAL, SURGE_MAX_INTERVAL, SURGE_LIFETIME,
} from './game/idle.js';
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
  fitOverlays();
}
window.addEventListener('resize', resize);

// ---- Overlay auto-fit ------------------------------------------------------
// Keep every menu/overlay fully on-screen without scrolling. The Hangar is the
// one intentional exception (it has its own internal scroll), so it is not in
// this list. Each eligible panel is measured at its natural size and scaled down
// just enough to fit the viewport, then kept centred. It never upscales, so a
// panel that already fits stays crisp at 1:1.
const FIT_OVERLAYS = ['start', 'levelup', 'pause', 'gameover'];
function fitOverlay(id) {
  const overlay = $(id);
  if (!overlay || overlay.classList.contains('hidden')) return;
  const panel = overlay.querySelector('.panel');
  if (!panel) return;
  // offsetWidth/Height are the untransformed layout sizes, so an already-applied
  // scale never feeds back into the measurement.
  const w = panel.offsetWidth;
  const h = panel.offsetHeight;
  if (!w || !h) return;
  const s = Math.min(1, (overlay.clientWidth * 0.98) / w, (overlay.clientHeight * 0.98) / h);
  panel.style.transform = `translate(-50%, -50%) scale(${s})`;
}
function fitOverlays() { for (const id of FIT_OVERLAYS) fitOverlay(id); }

// Re-fit whenever a panel's content changes (level-up cards, game-over
// commendations, directive summaries) or it is shown/hidden. A ResizeObserver on
// each panel catches all of these — toggling display:none -> natural size fires
// it — and setting a CSS transform does not change the observed box, so there is
// no feedback loop.
if (typeof ResizeObserver === 'function') {
  const ro = new ResizeObserver(() => fitOverlays());
  for (const id of FIT_OVERLAYS) {
    const panel = $(id) && $(id).querySelector('.panel');
    if (panel) ro.observe(panel);
  }
}
window.addEventListener('orientationchange', fitOverlays);

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
  $('ship-pick-name').textContent = dName('ships', ship);
  $('ship-pick-tag').textContent = dTag('ships', ship);
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
  updateStartNebula();
  updateShipPick();
  updateStartDirectives();
}

// ---- Hangar overlay ----
let hangarTab = 'ships';
const HANGAR_TABS = ['ships', 'meta', 'directives', 'codex'];

function openHangar(tab) {
  // Optionally jump straight to a specific tab.
  if (tab && HANGAR_TABS.includes(tab)) hangarTab = tab;
  renderHangar();
  // The Hangar can be opened from the start screen *or* the game-over screen.
  // Game-over sits later in the DOM than the Hangar, so if it stayed visible it
  // would paint on top and swallow every click (the old "stuck on death" bug).
  // Hide it (and the HUD) so the Hangar is always the top, interactive overlay.
  $('gameover').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('hangar').classList.remove('hidden');
}
function closeHangar() {
  // Always return to the main menu: the Hangar is only reachable while not
  // actively playing (start screen or after death), so "Done" should land on a
  // clean, fully-interactive start screen regardless of where we came from.
  $('hangar').classList.add('hidden');
  $('gameover').classList.add('hidden');
  $('hud').classList.add('hidden');
  started = false;
  $('start').classList.remove('hidden');
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
    if (selected) action = `<div class="ship-badge">${t('ship.selected')}</div>`;
    else if (unlocked) action = `<button class="btn btn-sm ship-select">${t('ship.select')}</button>`;
    else {
      const afford = store.stardust >= ship.unlockCost;
      action = `<button class="btn btn-sm ship-unlock"${afford ? '' : ' disabled'}>${t('ship.unlock', { cost: formatNumber(ship.unlockCost) })}</button>`;
    }
    card.innerHTML = `
      <div class="ship-card-head"><span class="ship-ico">${ship.icon}</span><span class="ship-name">${dName('ships', ship)}</span></div>
      <div class="ship-tag">${dTag('ships', ship)}</div>
      <div class="ship-desc">${dDesc('ships', ship)}</div>
      <div class="ship-weapon">${t('ship.starter', { weapon: `<b>${def ? dName('weapons', def) : ship.weapon}</b>` })}</div>
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
      ? `<div class="meta-max">${t('common.max')}</div>`
      : `<button class="btn btn-sm meta-buy"${afford ? '' : ' disabled'}>✦ ${formatNumber(cost)}</button>`;
    row.innerHTML = `
      <div class="meta-ico">${def.icon}</div>
      <div class="meta-main">
        <div class="meta-name">${dName('meta', def)} <span class="meta-lvl">${level}/${def.max}</span></div>
        <div class="meta-desc">${dDesc('meta', def)}</div>
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

// ---- Orbital Station: a standalone Cookie-Clicker-style idle layer ----------
// A dedicated overlay (NOT a Hangar tab). It mines Nebula in real time; a manual
// "big cookie" tap bootstraps the economy from zero, generators automate it, the
// Mining Laser upgrades the tap, and Collapse prestiges it for Singularity Cores.
// The layer is split into tabs so the big MINE button no longer crowds out the
// upgrade lists: MINE (tap + laser), GENERATORS (automation), CORES (run buffs)
// and COLLAPSE (the Singularity perk tree). Random "Nebula Surges" (golden-cookie-
// style RNG) drift across the overlay for a burst of Nebula or a timed frenzy.
let stationBuyQty = 1; // 1 | 10 | 'max'
let stationRefreshT = 0; // throttle for live store re-renders while open
let tapSoundT = 0;       // last tap-sound timestamp (ms) for throttling

let stationTab = 'mine'; // mine | gen | cores | ascend
const STATION_TABS = ['mine', 'gen', 'cores', 'ascend'];

// Transient Surge frenzies (not persisted — they only run for their short window).
// Each: { id, name, icon, kind:'prod'|'click', mult, until } where until is in
// seconds on the performance.now() clock.
let activeBuffs = [];
let surgeTimer = 0;        // seconds until the next Surge orb spawns
let surgeExpireT = 0;      // seconds the live orb has left before it fades
let activeSurgeEl = null;  // the live Surge orb element (null when none is out)

function stationOpen() { return !$('station').classList.contains('hidden'); }

function openStation() {
  audio.play('ui');
  setStationTab(stationTab);
  renderStation();
  updateStationLive();
  scheduleSurge(); // start the RNG Surge cycle fresh each visit
  // Make the Station the sole top, interactive overlay (same reasoning as the
  // Hangar): hide the other menus/HUD so nothing paints over it or steals clicks.
  $('gameover').classList.add('hidden');
  $('hangar').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('start').classList.add('hidden');
  $('station').classList.remove('hidden');
}
function closeStation() {
  despawnSurge(); // don't leave an orb floating for next time
  $('station').classList.add('hidden');
  started = false;
  $('start').classList.remove('hidden');
  refreshStart();
}

// Switch the visible Station tab (mirrors the Hangar tab pattern) and render it.
function setStationTab(tab) {
  if (!STATION_TABS.includes(tab)) tab = 'mine';
  stationTab = tab;
  for (const t of STATION_TABS) {
    $('st-tab-' + t)?.classList.toggle('active', t === tab);
    $('st-body-' + t)?.classList.toggle('hidden', t !== tab);
  }
  renderStationTab();
}

function stationRateMult() {
  const idle = store.getIdle();
  const fx = computePerks(idle.prestige);
  return prestigeMultiplier(idle.lifetimeCores) * mainBoostMultiplier(store.getRunProfile())
    * fx.prodMul * buffProdMult();
}

// Product of all active production-frenzy Surge multipliers (1 when none).
function buffProdMult() {
  const now = performance.now() / 1000;
  let m = 1;
  for (const b of activeBuffs) if (b.kind === 'prod' && b.until > now) m *= b.mult;
  return m;
}
// Product of all active click-frenzy Surge multipliers (1 when none).
function buffClickMult() {
  const now = performance.now() / 1000;
  let m = 1;
  for (const b of activeBuffs) if (b.kind === 'click' && b.until > now) m *= b.mult;
  return m;
}

// Cheap per-frame refresh of the always-visible header + tap gain. No innerHTML
// rebuild, so it is safe to call every frame while the Station is open.
function updateStationLive() {
  if (!stationOpen()) return;
  const idle = store.getIdle();
  const profile = store.getRunProfile();
  const rate = totalRate(idle, profile) * buffProdMult();
  const neb = $('station-nebula'); if (neb) neb.textContent = formatNumber(idle.nebula);
  const rt = $('station-rate'); if (rt) rt.textContent = `${rate >= 100 ? formatNumber(rate) : rate.toFixed(1)}/s`;
  const cr = $('station-cores'); if (cr) cr.textContent = formatNumber(idle.cores);
  const cm = $('station-core-mult'); if (cm) cm.textContent = `×${prestigeMultiplier(idle.lifetimeCores).toFixed(2)}`;
  const tg = $('station-tap-gain');
  if (tg) {
    const per = Math.max(1, Math.round(clickYield(idle, profile) * buffClickMult()));
    tg.textContent = `+${formatNumber(per)} ⬡`;
  }
}

// Manual mining tap — the Cookie-Clicker "big cookie". Mints Nebula, floats a
// "+N", and gives light (throttled) audio/visual feedback. A Click-Frenzy Surge
// temporarily multiplies the yield.
function stationTap(ev) {
  if (ev && ev.button != null && ev.button !== 0) return; // left / touch only
  const got = store.tapNebula(buffClickMult());
  spawnTapFx(got, ev);
  updateStationLive();
  const btn = $('station-tap');
  if (btn) { btn.classList.remove('punch'); void btn.offsetWidth; btn.classList.add('punch'); }
  const now = performance.now();
  if (now - tapSoundT > 55) { tapSoundT = now; audio.play('pickup'); }
  // Refresh the visible tab promptly so newly-affordable buy buttons light up.
  renderStationTab();
}

// Floating "+N" that drifts up from the tap point (or the button centre).
function spawnTapFx(amount, ev) {
  const fx = $('station-tapfx');
  if (!fx) return;
  const pop = document.createElement('span');
  pop.className = 'tap-pop';
  pop.textContent = `+${formatNumber(amount)}`;
  const rect = fx.getBoundingClientRect();
  let x = rect.width / 2;
  let y = rect.height / 2;
  if (ev && typeof ev.clientX === 'number' && rect.width) {
    x = ev.clientX - rect.left;
    y = ev.clientY - rect.top;
  }
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  fx.appendChild(pop);
  setTimeout(() => pop.remove(), 760);
}

// Quantity selector (×1 / ×10 / MAX) shared by the generator tab.
function stationQtyButtonsHtml() {
  return [1, 10, 'max'].map((q) =>
    `<button class="btn btn-sm st-qty${stationBuyQty === q ? ' active' : ''}" data-qty="${q}">${q === 'max' ? t('st.qtyMax') : '×' + q}</button>`).join('');
}

// Render just the currently-visible tab (cheap enough to call on every purchase
// and a few times per second for live affordability).
function renderStationTab() {
  if (stationTab === 'mine') renderStationMine();
  else if (stationTab === 'gen') renderStationGenerators();
  else if (stationTab === 'cores') renderStationCores();
  else if (stationTab === 'ascend') renderStationAscend();
}

// Full refresh on open / after a Collapse: the buff banner, the active tab, and
// the live header all at once.
function renderStation() {
  renderStationBuffs();
  renderStationTab();
  updateStationLive();
}

// --- Active Surge frenzies banner (above the tabs) -------------------------
function renderStationBuffs() {
  const wrap = $('station-buffs');
  if (!wrap) return;
  const now = performance.now() / 1000;
  const live = activeBuffs.filter((b) => b.until > now);
  if (!live.length) { wrap.innerHTML = ''; wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  wrap.innerHTML = live.map((b) => {
    const left = Math.max(0, Math.ceil(b.until - now));
    return `<div class="buff-chip buff-${b.kind}"><span class="buff-ico">${b.icon}</span><span class="buff-txt">${dName('surges', b)} ×${b.mult}</span><span class="buff-time">${left}s</span></div>`;
  }).join('');
}

// --- MINE tab: the tap "big cookie" (persistent) + the Mining Laser upgrade --
function renderStationMine() {
  const host = $('station-laser');
  if (!host) return;
  const idle = store.getIdle();
  const profile = store.getRunProfile();
  const boostPct = Math.round((mainBoostMultiplier(profile) - 1) * 100);
  const clickLvl = idle.clickLevel || 0;
  const clickCost = clickUpgradeCost(clickLvl);
  const clickAfford = idle.nebula >= clickCost;
  const perTap = Math.max(1, Math.round(clickYield(idle, profile) * buffClickMult()));
  host.innerHTML = `
    <div class="station-sec"><span class="st-sec-head">${t('st.manualMining')} <span class="st-sec-sub">${t('st.tapBeam')}</span></span></div>
    <div class="gen-list">
      <div class="gen-row${clickLvl > 0 ? ' owned' : ''}">
        <div class="gen-ico">${CLICK_UPGRADE.icon}</div>
        <div class="gen-main">
          <div class="gen-name">${dName('clickUpgrade', CLICK_UPGRADE)} <span class="gen-owned">${t('common.lv', { n: formatNumber(clickLvl) })}</span></div>
          <div class="gen-desc">${dDesc('clickUpgrade', CLICK_UPGRADE)}</div>
          <div class="gen-rate">${t('st.perTap', { n: formatNumber(perTap) })}</div>
        </div>
        <button class="btn btn-sm click-buy"${clickAfford ? '' : ' disabled'}>
          <span class="gb-q">${t('st.addPower', { n: formatNumber(CLICK_UPGRADE.power) })}</span>
          <span class="gb-c">⬡ ${formatNumber(clickCost)}</span>
        </button>
      </div>
    </div>
    <div class="station-note">${t('st.mineNote', { pct: boostPct })}</div>`;
  host.querySelector('.click-buy')?.addEventListener('click', () => {
    if (store.buyClickUpgrade()) { audio.play('pickup'); renderStationMine(); updateStationLive(); }
  });
}

// --- GENERATORS tab: automation lines with milestone bonuses ---------------
function renderStationGenerators() {
  const wrap = $('st-body-gen');
  if (!wrap) return;
  const idle = store.getIdle();
  const fx = computePerks(idle.prestige);
  const mult = stationRateMult();
  let html = `<div class="station-sec"><span class="st-sec-head">${t('st.genHead')} <span class="st-sec-sub">${t('st.genSub', { step: MILESTONE_STEP, pct: Math.round(fx.milestoneBonus * 100) })}</span></span><span class="st-qtyrow">${stationQtyButtonsHtml()}</span></div><div class="gen-list">`;
  for (const def of GENERATORS) {
    const owned = idle.generators[def.id] || 0;
    const qty = stationBuyQty === 'max' ? Math.max(1, maxAffordable(def, owned, idle.nebula, fx.costMul)) : stationBuyQty;
    const cost = generatorBulkCost(def, owned, qty, fx.costMul);
    const afford = idle.nebula >= cost && (stationBuyQty !== 'max' || maxAffordable(def, owned, idle.nebula, fx.costMul) > 0);
    const gmul = generatorMilestoneMultiplier(owned, fx.milestoneBonus);
    const contrib = def.rate * owned * gmul * mult;
    const ms = generatorMilestoneProgress(owned, fx.milestoneBonus);
    const mile = owned > 0
      ? `<div class="gen-mile">${ms.reached > 0 ? t('st.milestoneReached', { mult: gmul % 1 ? gmul.toFixed(1) : gmul }) : ''}${t('st.milestoneTo', { n: formatNumber(ms.remaining), next: ms.nextMultiplier % 1 ? ms.nextMultiplier.toFixed(1) : ms.nextMultiplier })}</div>`
      : '';
    html += `
      <div class="gen-row${owned > 0 ? ' owned' : ''}">
        <div class="gen-ico">${def.icon}</div>
        <div class="gen-main">
          <div class="gen-name">${dName('generators', def)} <span class="gen-owned">×${formatNumber(owned)}</span></div>
          <div class="gen-desc">${dDesc('generators', def)}</div>
          <div class="gen-rate">${owned > 0 ? t('st.rateContrib', { n: contrib >= 100 ? formatNumber(contrib) : contrib.toFixed(1) }) : t('st.rateEach', { n: def.rate })}</div>
          ${mile}
        </div>
        <button class="btn btn-sm gen-buy" data-id="${def.id}"${afford ? '' : ' disabled'}>
          <span class="gb-q">${stationBuyQty === 'max' ? t('st.buyMax', { n: formatNumber(qty) }) : '×' + qty}</span>
          <span class="gb-c">⬡ ${formatNumber(cost)}</span>
        </button>
      </div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
  wrap.querySelectorAll('.st-qty').forEach((b) => b.addEventListener('click', () => {
    const q = b.dataset.qty;
    stationBuyQty = q === 'max' ? 'max' : +q;
    audio.play('ui');
    renderStationGenerators();
  }));
  wrap.querySelectorAll('.gen-buy').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.id;
    const def = GENERATORS.find((g) => g.id === id);
    const owned = store.getIdle().generators[id] || 0;
    const costMul = computePerks(store.getIdle().prestige).costMul;
    const qty = stationBuyQty === 'max' ? maxAffordable(def, owned, store.getIdle().nebula, costMul) : stationBuyQty;
    if (store.buyGenerator(id, qty) > 0) { audio.play('pickup'); renderStationGenerators(); updateStationLive(); }
  }));
}

// --- CORES tab: Singularity-Core run buffs (spent on every run) -------------
function renderStationCores() {
  const wrap = $('st-body-cores');
  if (!wrap) return;
  const idle = store.getIdle();
  let html = `<div class="station-note">${t('st.coresNote')}</div><div class="station-sec"><span class="st-sec-head">${t('st.coreUpgrades')} <span class="st-sec-sub">${t('st.everyRun')}</span></span></div><div class="special-list">`;
  for (const def of SPECIAL_UPGRADES) {
    const level = idle.special[def.id] || 0;
    const maxed = level >= def.max;
    const cost = specialCost(def, level);
    const afford = canBuySpecial(def, idle.special, idle.cores);
    const pips = Array.from({ length: def.max }, (_, i) => `<span class="pip${i < level ? ' on' : ''}"></span>`).join('');
    const btn = maxed
      ? `<div class="meta-max">${t('common.max')}</div>`
      : `<button class="btn btn-sm special-buy" data-id="${def.id}"${afford ? '' : ' disabled'}>🌀 ${formatNumber(cost)}</button>`;
    html += `
      <div class="special-row${maxed ? ' maxed' : ''}">
        <div class="meta-ico">${def.icon}</div>
        <div class="meta-main">
          <div class="meta-name">${dName('special', def)} <span class="meta-lvl">${level}/${def.max}</span></div>
          <div class="meta-desc">${dDesc('special', def)}${def.effect && level > 0 ? t('st.nowEffect', { effect: translateEffect(def.effect(level)) }) : ''}</div>
          <div class="meta-pips">${pips}</div>
        </div>
        <div class="meta-action">${btn}</div>
      </div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
  wrap.querySelectorAll('.special-buy').forEach((b) => b.addEventListener('click', () => {
    if (store.buySpecial(b.dataset.id)) { audio.play('pickup'); renderStationCores(); updateStationLive(); }
  }));
}

// --- COLLAPSE tab: the Collapse control + the permanent Singularity perk tree -
function renderStationAscend() {
  const wrap = $('st-body-ascend');
  if (!wrap) return;
  const idle = store.getIdle();
  const gain = prestigeCoreGain(idle.lifetimeNebula, idle.prestige);
  const baseGain = prestigeGain(idle.lifetimeNebula);
  // Lifetime Nebula needed for the next Core = PRESTIGE_BASE·(baseGain+1)³.
  const nextCoreAt = PRESTIGE_BASE * Math.pow(baseGain + 1, 3);
  const prestigePct = Math.max(0, Math.min(100, (idle.lifetimeNebula / nextCoreAt) * 100));
  const seed = collapseSeedNebula(idle.lifetimeNebula, idle.prestige);
  let html = `
    <div class="prestige-row">
      <div class="prestige-info">
        <div class="prestige-title">${t('st.collapseTitle')}</div>
        <div class="prestige-sub">${gain > 0
          ? t('st.collapseMint', { gain: formatNumber(gain), seed: seed > 0 ? formatNumber(seed) : 0 })
          : t('st.collapseNeed', { n: formatNumber(nextCoreAt) })}</div>
        <div class="prestige-bar"><span style="width:${prestigePct}%"></span></div>
      </div>
      <button class="btn prestige-btn"${gain > 0 ? '' : ' disabled'}>${t('st.collapseBtn')}</button>
    </div>
    <div class="station-note">${t('st.collapseNote')}</div>
    <div class="station-sec"><span class="st-sec-head">${t('st.perksHead')} <span class="st-sec-sub">${t('st.perksSub')}</span></span></div>
    <div class="perk-list">`;
  for (const def of PRESTIGE_UPGRADES) {
    const level = idle.prestige[def.id] || 0;
    const maxed = level >= def.max;
    const cost = prestigeUpgradeCost(def, level);
    const afford = canBuyPrestige(def, idle.prestige, idle.cores);
    const pips = Array.from({ length: def.max }, (_, i) => `<span class="pip${i < level ? ' on' : ''}"></span>`).join('');
    const btn = maxed
      ? `<div class="meta-max">${t('common.max')}</div>`
      : `<button class="btn btn-sm perk-buy" data-id="${def.id}"${afford ? '' : ' disabled'}>🌀 ${formatNumber(cost)}</button>`;
    html += `
      <div class="special-row${maxed ? ' maxed' : ''}">
        <div class="meta-ico">${def.icon}</div>
        <div class="meta-main">
          <div class="meta-name">${dName('prestige', def)} <span class="meta-lvl">${level}/${def.max}</span></div>
          <div class="meta-desc">${dDesc('prestige', def)}${def.effect && level > 0 ? t('st.nowEffect', { effect: translateEffect(def.effect(level)) }) : ''}</div>
          <div class="meta-pips">${pips}</div>
        </div>
        <div class="meta-action">${btn}</div>
      </div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
  wrap.querySelector('.prestige-btn')?.addEventListener('click', () => {
    const got = store.prestigeIdle();
    if (got > 0) {
      audio.play('gameover');
      showToast(`<span class="t-ico">🌀</span><div class="t-body"><b>${t('toast.collapsed.t')}</b><span>${t('toast.collapsed.d', { n: formatNumber(got) })}</span></div>`);
      renderStation();
    }
  });
  wrap.querySelectorAll('.perk-buy').forEach((b) => b.addEventListener('click', () => {
    if (store.buyPrestige(b.dataset.id)) { audio.play('pickup'); renderStationAscend(); updateStationLive(); }
  }));
}

// ---- Nebula Surges: golden-cookie-style RNG that drifts across the overlay --
// The pure roll→reward mapping lives in idle.js (rollSurge); here we only handle
// the DOM orb, its timing and applying the reward. Surges spawn only while the
// Station is open (you click the orb), but the frenzies they grant keep ticking
// afterwards until they expire.
function scheduleSurge() {
  const perks = computePerks(store.getIdle().prestige);
  const span = SURGE_MAX_INTERVAL - SURGE_MIN_INTERVAL;
  const base = SURGE_MIN_INTERVAL + rng() * span;
  surgeTimer = base / Math.max(1, perks.surgeChanceMul); // Lucky Resonance shortens it
}

function spawnSurge() {
  const host = $('station-surge');
  if (!host || activeSurgeEl) return;
  const roll = rng();
  const type = pickSurgeType(roll);
  const orb = document.createElement('button');
  orb.type = 'button';
  orb.className = `surge-orb surge-${type.kind}`;
  orb.dataset.roll = String(roll);
  orb.title = dName('surges', type);
  orb.setAttribute('aria-label', t('surge.collect', { name: dName('surges', type) }));
  orb.textContent = type.icon;
  orb.style.left = `${10 + rng() * 78}%`;
  orb.style.top = `${16 + rng() * 60}%`;
  orb.style.animationDuration = `${SURGE_LIFETIME}s, 2.4s`;
  orb.addEventListener('pointerdown', (e) => { e.preventDefault(); collectSurge(e); });
  host.appendChild(orb);
  activeSurgeEl = orb;
  surgeExpireT = SURGE_LIFETIME;
  audio.play('levelup'); // a chime so a drifting Surge gets noticed
}

function despawnSurge() {
  if (activeSurgeEl) { activeSurgeEl.remove(); activeSurgeEl = null; }
  surgeExpireT = 0;
}

function collectSurge(ev) {
  if (!activeSurgeEl) return;
  const roll = +activeSurgeEl.dataset.roll || 0;
  const idle = store.getIdle();
  const reward = rollSurge(roll, {
    rate: totalRate(idle, store.getRunProfile()),
    nebula: idle.nebula,
    perks: computePerks(idle.prestige),
  });
  despawnSurge();
  applySurgeReward(reward, ev);
  scheduleSurge();
}

function applySurgeReward(reward, ev) {
  audio.play('pickup');
  if (reward.kind === 'nebula') {
    store.addNebula(reward.nebula);
    if (ev && stationTab === 'mine') spawnTapFx(reward.nebula, ev);
    showToast(`<span class="t-ico">${reward.icon}</span><div class="t-body"><b>${dName('surges', reward)}</b><span>${t('surge.rewardNebula', { n: formatNumber(reward.nebula) })}</span></div>`);
  } else if (reward.kind === 'core') {
    const idle = store.getIdle();
    idle.cores += reward.cores;
    idle.lifetimeCores += reward.cores;
    store.save();
    showToast(`<span class="t-ico">${reward.icon}</span><div class="t-body"><b>${dName('surges', reward)}</b><span>${t('surge.rewardCore', { n: formatNumber(reward.cores) })}</span></div>`);
  } else { // 'prod' | 'click' timed frenzy
    const until = performance.now() / 1000 + reward.duration;
    activeBuffs = activeBuffs.filter((b) => b.id !== reward.id); // refresh, don't stack the same one
    activeBuffs.push({ id: reward.id, name: reward.name, icon: reward.icon, kind: reward.kind, mult: reward.mult, until });
    showToast(`<span class="t-ico">${reward.icon}</span><div class="t-body"><b>${dName('surges', reward)}</b><span>${t('surge.rewardFrenzy', { mult: reward.mult, dur: reward.duration })}</span></div>`);
    renderStationBuffs();
  }
  updateStationLive();
  renderStationTab();
}

// Per-frame Surge + buff bookkeeping. Surges only advance while the overlay is
// open; buffs expire on the real clock regardless.
function tickSurges(dt) {
  if (stationOpen()) {
    if (activeSurgeEl) {
      surgeExpireT -= dt;
      if (surgeExpireT <= 0) { despawnSurge(); scheduleSurge(); }
    } else {
      surgeTimer -= dt;
      if (surgeTimer <= 0) spawnSurge();
    }
  }
  if (activeBuffs.length) {
    const now = performance.now() / 1000;
    const before = activeBuffs.length;
    activeBuffs = activeBuffs.filter((b) => b.until > now);
    if (activeBuffs.length !== before && stationOpen()) { renderStationBuffs(); updateStationLive(); }
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
    ? t('dir.summary', { n: active.size, mult: mult.toFixed(2) })
    : t('dir.hint');
  wrap.appendChild(note);

  for (const d of DIRECTIVES) {
    const on = active.has(d.id);
    const pct = Math.round((d.stardustMul - 1) * 100);
    const card = document.createElement('div');
    card.className = 'directive-card' + (on ? ' active' : '');
    card.innerHTML = `
      <div class="dir-head">
        <span class="dir-ico">${d.icon}</span>
        <span class="dir-name">${dName('directives', d)}</span>
        <span class="dir-reward">✦ +${pct}%</span>
      </div>
      <div class="dir-desc">${dDesc('directives', d)}</div>
      <div class="dir-foot">
        <span class="dir-risk">${dRisk('directives', d)}</span>
        <span class="dir-toggle">${on ? t('dir.active') : t('dir.enable')}</span>
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
  head.innerHTML = t('codex.progress', { owned: owned.size, total: ACHIEVEMENTS.length });
  wrap.appendChild(head);

  for (const a of ACHIEVEMENTS) {
    const got = owned.has(a.id);
    const cell = document.createElement('div');
    cell.className = 'codex-cell' + (got ? ' earned' : ' locked');
    cell.innerHTML = `
      <div class="cx-ico">${got ? a.icon : '🔒'}</div>
      <div class="cx-main">
        <div class="cx-name">${dName('achievements', a)}</div>
        <div class="cx-desc">${dDesc('achievements', a)}</div>
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
    return d ? `<span class="sd-ico" title="${dName('directives', d)}">${d.icon}</span>` : '';
  }).join('');
  const mult = directiveStardustMultiplier(ids);
  node.innerHTML = `<span class="sd-label">${t('dir.label')}</span>${icons}<span class="sd-mult">✦ ×${mult.toFixed(2)}</span>`;
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
    idleSpecial: store.getIdle().special,
    idleNebulaMul: computePerks(store.getIdle().prestige).nebulaRunMul,
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

  // Nebula burst for the Orbital Station (idle layer) — shown only when earned so
  // the game-over panel stays clean for brand-new players.
  const goNeb = $('go-nebula');
  if (goNeb) {
    const neb = summary.nebula || 0;
    goNeb.textContent = `⬡ +${formatNumber(neb)} Nebula  ·  ${formatNumber(summary.nebulaTotal || store.getIdle().nebula)} banked`;
    goNeb.classList.toggle('hidden', neb <= 0);
  }

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
let touchEnabled = false;
let touchBound = false;
const touchEls = {};
const JOY_TRAVEL = 42; // px the knob travels from centre at full tilt

function maybeShowTouch() {
  const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!touch) return;
  touchEnabled = true;
  if (!touchBound) {
    touchBound = true;
    touchEls.wrap = $('touch-controls');
    touchEls.ring = $('joy-ring');
    touchEls.knob = $('joy-knob');
    touchEls.hint = $('joy-hint');
    input.bindButton($('btn-dash'), $('btn-sing'));
    // Mobile pause: toggles the pause overlay. preventDefault suppresses the
    // ghost click so a single tap doesn't toggle twice.
    const pauseBtn = $('btn-pause');
    if (pauseBtn) {
      const onPause = (e) => { e.preventDefault(); togglePause(); };
      pauseBtn.addEventListener('touchstart', onPause, { passive: false });
      pauseBtn.addEventListener('mousedown', onPause);
    }
  }
}

// Single source of truth for the mobile HUD: only visible while actively
// playing, and the joystick ring/knob snap to wherever the thumb is held.
function updateTouch() {
  if (!touchEnabled) return;
  const show = started && !paused && world.state === 'playing';
  const wrap = touchEls.wrap;
  if (wrap) wrap.classList.toggle('hidden', !show);
  if (!show) return;

  const joy = input.joy;
  const ring = touchEls.ring;
  const knob = touchEls.knob;
  const hint = touchEls.hint;
  if (joy.active) {
    if (ring) {
      ring.classList.add('active');
      ring.style.left = joy.baseX + 'px';
      ring.style.top = joy.baseY + 'px';
    }
    if (knob) knob.style.transform = `translate(${joy.dx * JOY_TRAVEL}px, ${joy.dy * JOY_TRAVEL}px)`;
    if (hint) hint.classList.add('off');
  } else {
    if (ring) ring.classList.remove('active');
    if (hint) hint.classList.remove('off');
  }
}

// ------------------------------------------------------------- HUD update
const el = {
  wave: $('wave'), enemies: $('enemies'), timer: $('timer'),
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
  el.wave.textContent = h.wave;
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

// ------------------------------------------------------------- idle layer
// The Orbital Station mines Nebula in real time, on top of whatever else is on
// screen (menus or an active run). We accumulate fractional Nebula each frame and
// commit whole units to the Store, persisting to localStorage only periodically
// to avoid hammering it every frame.
let idleAccum = 0;   // fractional Nebula not yet committed to the Store
let idleSaveT = 0;   // seconds since the idle state was last persisted

function tickIdle(dt) {
  const idle = store.getIdle();
  const rate = totalRate(idle, store.getRunProfile()) * buffProdMult();
  idleAccum += rate * dt;
  if (idleAccum >= 1) {
    const whole = Math.floor(idleAccum);
    idleAccum -= whole;
    idle.nebula += whole;
    idle.lifetimeNebula += whole;
  }
  // Persist (and stamp lastTick for offline catch-up) at most every 5s.
  idleSaveT += dt;
  if (idleSaveT >= 5) {
    idleSaveT = 0;
    idle.lastTick = Date.now();
    store.save();
  }
  // Advance RNG Surges + expire transient frenzies (works whether open or not).
  tickSurges(dt);
  // Keep the open Station overlay live: smooth header/tap gain every frame, and
  // a throttled rebuild of the visible tab so affordability (buy buttons) and the
  // buff countdowns refresh a few ×/s.
  if (stationOpen()) {
    updateStationLive();
    stationRefreshT += dt;
    if (stationRefreshT >= 0.2) { stationRefreshT = 0; renderStationTab(); renderStationBuffs(); }
  }
  // Keep the start-screen Nebula pill ticking too.
  if (!started && !$('start').classList.contains('hidden')) updateStartNebula();
}

// Grant offline/elapsed Nebula earned since the last recorded tick, then re-stamp.
// `announce` shows a "welcome back" toast (page load); quick tab-switch returns
// award silently so a glance away doesn't spam toasts. The offline window widens
// with the Temporal Buffer Singularity perk.
function catchUpOffline(announce = true) {
  const idle = store.getIdle();
  const nowMs = Date.now();
  if (idle.lastTick > 0) {
    const seconds = (nowMs - idle.lastTick) / 1000;
    const perks = computePerks(idle.prestige);
    // The Dormant Reactor perk lifts offline/AFK production specifically.
    const rate = totalRate(idle, store.getRunProfile()) * (perks.offlineRateMul || 1);
    const cap = offlineCapSeconds(idle.prestige);
    const gain = Math.floor(offlineGain(rate, seconds, cap));
    if (gain > 0) {
      store.addNebula(gain);
      // Only shout about it for a meaningful absence (≥60s) on page load.
      if (announce && seconds >= 60) {
        const capped = seconds > cap;
        showToast(`<span class="t-ico">⬡</span><div class="t-body"><b>Welcome back</b><span>Station mined +${formatNumber(gain)} Nebula${capped ? ' (max)' : ''}</span></div>`);
      }
    }
  }
  store.setIdleTick(nowMs);
}

// Refresh just the start-screen Nebula pill (balance + live rate).
function updateStartNebula() {
  const el = $('start-nebula');
  if (!el) return;
  const idle = store.getIdle();
  el.textContent = formatNumber(idle.nebula);
  const rateEl = $('start-nebula-rate');
  if (rateEl) {
    const rate = totalRate(idle, store.getRunProfile());
    rateEl.textContent = rate > 0 ? `+${rate >= 100 ? formatNumber(rate) : rate.toFixed(1)}/s` : '';
  }
  const pill = $('start-nebula-pill');
  if (pill) pill.classList.toggle('hidden', idle.nebula <= 0 && baseRate(idle.generators) <= 0);
}

// ------------------------------------------------------------- main loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const cmd = input.poll();

  // The idle Station runs alongside everything — menus and active runs alike.
  tickIdle(dt);

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

  updateTouch();

  requestAnimationFrame(frame);
}

// ------------------------------------------------------------- buttons
$('play-btn').addEventListener('click', startRun);
$('retry-btn').addEventListener('click', startRun);
$('resume-btn').addEventListener('click', () => togglePause(false));
$('reroll-btn').addEventListener('click', () => { world.rerollChoices(); });
$('banish-btn').addEventListener('click', toggleBanishMode);

// Hangar + ship picker
$('hangar-btn').addEventListener('click', () => openHangar());
$('go-hangar-btn').addEventListener('click', () => openHangar());
$('hangar-close').addEventListener('click', closeHangar);

// Orbital Station — its own standalone overlay (opened from the start screen),
// not a Hangar tab. The 🛰 STATION button and the Nebula pill both open it.
$('station-btn').addEventListener('click', openStation);
$('station-close').addEventListener('click', closeStation);
// Station tab bar (MINE / GENERATORS / CORES / ASCEND).
for (const t of STATION_TABS) {
  $('st-tab-' + t)?.addEventListener('click', () => { audio.play('ui'); setStationTab(t); });
}
const stationTapBtn = $('station-tap');
if (stationTapBtn) {
  // pointerdown gives an instant, mobile-friendly tap (no 300ms click delay);
  // preventDefault stops text selection and synthetic mouse events.
  stationTapBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); stationTap(e); });
  stationTapBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stationTap(); }
  });
}

// The start-screen Nebula pill doubles as a shortcut into the Orbital Station.
const startNebulaPill = $('start-nebula-pill');
if (startNebulaPill) {
  startNebulaPill.addEventListener('click', openStation);
  startNebulaPill.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openStation(); }
  });
}
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

// Persist the idle clock when leaving, and settle elapsed production on return —
// requestAnimationFrame is throttled/paused while hidden, so a backgrounded tab
// earns its Nebula through this catch-up rather than live ticks.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    store.setIdleTick(Date.now());
    if (started && world.state === 'playing') togglePause(true);
  } else {
    catchUpOffline(false); // silent: award the gap, no toast for a quick glance away
    if (stationOpen()) renderStation();
    if (!started && !$('start').classList.contains('hidden')) updateStartNebula();
  }
});

applySettingsToUI();
catchUpOffline();
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
