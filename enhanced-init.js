// Enhanced Game Entry Point - Cosmic Survivor
// This file integrates all the new game enhancement systems

import { MetaProgressionSystem } from './js/systems/metaProgression.js';
import { SynergySystem } from './js/systems/synergySystem.js';
import { CosmicEventsSystem } from './js/systems/cosmicEvents.js';
import { MusicSystem } from './js/systems/musicSystem.js';
import { VisualEffectsSystem } from './js/systems/visualEffects.js';
import { SettingsSystem } from './js/systems/settingsSystem.js';
import { PowerupSystem } from './js/systems/powerupSystem.js';
// New systems for the rework: i18n, story mode, multiplayer extras, daily challenge
import './js/systems/i18n.js';
import './js/systems/storyMode.js';
import './js/systems/multiplayerExtras.js';
import './js/systems/dailyChallenge.js';

// ===== Rework systems (Phases 1, 2, 4, 5, 6, 7) =====
// These modules are intentionally additive: main.js looks for them on
// `window.rework` and falls back to its existing behavior if absent. This
// keeps the legacy game working at every commit during the migration.
import { ObjectPool } from './js/core/objectPool.js';
import { gameBus } from './js/core/eventBus.js';
import { rngFromSeed, XoshiroRng } from './js/core/rng.js';
import { SpatialHash } from './js/core/spatialHash.js';
import { FixedClock } from './js/core/fixedClock.js';
import { juice } from './js/render/juice.js';
import { stanceSystem, Stance } from './js/systems/stanceSystem.js';
import { weatherSystem, WEATHER_PROFILES } from './js/systems/weatherSystem.js';
import { ENEMY_BEHAVIORS, applyShieldBuddyAbsorption, ensureShieldIds } from './js/systems/enemyBehaviors.js';
import { applyCoopAura, notifyCoopBuff, COOP_AURA_RADIUS } from './js/systems/coopAura.js';
import { registerPool, listPools } from './js/core/poolRegistry.js';
import { installDebugOverlay } from './js/core/debugOverlay.js';

// ===== Part D/E/F URL-flag parsing =====
// All flags are read at module-load time (before init()) so window.rework is
// fully configured before the first gameLoop tick.
const _params = (() => {
    try { return new URLSearchParams(globalThis.location?.search ?? ''); }
    catch { return new URLSearchParams(); }
})();

// Part D: ?broadphase=naive falls back to the legacy O(N×M) scan.
// Default is the new hash path (performance-only change, covered by the
// determinism regression test).
const _broadphaseNaive = _params.get('broadphase') === 'naive';

// Part F: ?worker=1 promotes broadphase off-thread (default OFF).
// Auto-disabled on Safari (postMessage overhead historically not worth it).
const _workerWanted = _params.get('worker') === '1';
// Safari UA sniff — document in comments; can be overridden by ?worker=1 if
// Apple ever improves their Worker postMessage throughput.
const _isSafari = typeof navigator !== 'undefined' &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent ?? '');
const _workerEnabled = _workerWanted && !_isSafari &&
    typeof Worker !== 'undefined';

// Part D broadphase kind: 'naive' | 'hash' | 'worker'
const _broadphaseKind = _broadphaseNaive ? 'naive' : (_workerEnabled ? 'worker' : 'hash');

// Part E: ?fixedstep=1 enables the FixedClock dual-path (default OFF, legacy
// variable-dt loop is the default).
const _fixedStepEnabled = _params.get('fixedstep') === '1';

// Part E: ?interp=0 disables render interpolation (useful for debugging parity
// with the legacy path on a stable 60 fps machine).
const _interpEnabled = _params.get('interp') !== '0';

// Part D: broadphase cell size must match BROADPHASE_CELL_SIZE in main.js.
// Both are CONFIG.BULLET_SIZE * 8 = 40 px.
const _BROADPHASE_CELL_SIZE = 40;

// Part D: main-thread spatial hash (always built as synchronous fallback).
const _bpHash = new SpatialHash({
    cellSize: _BROADPHASE_CELL_SIZE,
    worldWidth: 3000,
    worldHeight: 2000,
});

// Part E: FixedClock instance (shared with main.js via window.rework.clock).
const _fixedClock = new FixedClock({ stepSeconds: 1 / 60, maxFrameSeconds: 0.25 });

window.rework = {
    ObjectPool,
    gameBus,
    rng: { fromSeed: rngFromSeed, Xoshiro: XoshiroRng },
    SpatialHash,
    FixedClock,
    juice,
    stance: stanceSystem,
    Stance,
    weather: weatherSystem,
    WEATHER_PROFILES,
    enemyBehaviors: ENEMY_BEHAVIORS,
    applyShieldBuddyAbsorption,
    ensureShieldIds,
    coop: { applyAura: applyCoopAura, notify: notifyCoopBuff, radius: COOP_AURA_RADIUS },
    registerPool,
    listPools,

    // Part D — broadphase telemetry (read by main.js and debugOverlay.js)
    broadphase: {
        kind: _broadphaseKind,       // 'naive' | 'hash' | 'worker'
        _hash: _bpHash,              // main-thread SpatialHash (always available)
        _maxEnemyRadius: 0,          // set by main.js each sim step
        _enemyIndexMap: [],          // index → enemy object (for worker id lookup)
        lastQueryCount: 0,           // total candidate count across all bullets this step
        lastBuildMs: 0,              // time to build the hash
        lastQueryMs: 0,              // total time spent in hash.query() calls
        // Part F worker telemetry (populated when kind === 'worker')
        _worker: null,
        _workerReady: false,
        _workerTick: -1,             // tick number of last received batchResult
        _workerResults: {},          // { [bulletId]: Int32Array } from last batchResult
        _currentTick: 0,             // tick number of last rebuild sent to worker
        _nextBulletId: 0,            // monotonic id assigned to Bullet instances
        roundtripMs: 0,
        pendingQueries: 0,
        staleResults: 0,
    },

    // Part E — clock telemetry (read by main.js and debugOverlay.js)
    clock: {
        mode: _fixedStepEnabled ? 'fixed' : 'legacy',
        fixedStepEnabled: _fixedStepEnabled,
        interpEnabled: _interpEnabled,
        simHz: 60,
        _fixedClock,                 // FixedClock instance driven by main.js gameLoop
        lastAlpha: 0,
        simTicksThisFrame: 0,
        droppedFrames: 0,
    },
};

installDebugOverlay();

// ===== Part F — Worker initialisation =====
// Only runs when ?worker=1 and Worker is available (not Safari, not SSR/Node).
if (_broadphaseKind === 'worker') {
    const _worker = new Worker(
        new URL('./js/core/workers/broadphase.worker.js', import.meta.url),
        { type: 'module' }
    );
    window.rework.broadphase._worker = _worker;

    _worker.postMessage({
        type: 'init',
        cellSize: _BROADPHASE_CELL_SIZE,
        worldWidth: 3000,
        worldHeight: 2000,
    });

    _worker.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg) return;
        const bp = window.rework.broadphase;
        switch (msg.type) {
            case 'ready':
                bp._workerReady = true;
                break;
            case 'rebuilt':
                bp.lastBuildMs = msg.buildMs;
                break;
            case 'batchResult': {
                bp._workerTick = msg.tick;
                bp._workerResults = msg.bulletQueries || {};
                bp.pendingQueries = 0;
                break;
            }
        }
    };
}

// Flag to indicate enhanced mode
window.ENHANCED_MODE = true;

// Initialize all systems
window.enhancedSystems = {
    metaProgression: null,
    synergy: null,
    cosmicEvents: null,
    music: null,
    visualEffects: null,
    settings: null,
    powerup: null
};

// Initialize systems when DOM is ready
function initEnhancedSystems() {
    const canvas = document.getElementById('gameCanvas');
    
    // Initialize all systems
    window.enhancedSystems.metaProgression = new MetaProgressionSystem();
    window.enhancedSystems.synergy = new SynergySystem();
    window.enhancedSystems.cosmicEvents = new CosmicEventsSystem();
    window.enhancedSystems.music = new MusicSystem();
    window.enhancedSystems.visualEffects = new VisualEffectsSystem(canvas);
    window.enhancedSystems.settings = new SettingsSystem();
    window.enhancedSystems.powerup = new PowerupSystem();
    
    console.log('Enhanced systems initialized:', window.enhancedSystems);
    
    // Initialize music system
    window.enhancedSystems.music.init();
    
    // Apply settings
    applySettings();
    
    // Translate any static markup that uses data-i18n
    if (window.translateDOM) window.translateDOM(document);
    
    // Create UI elements for new features
    createEnhancedUI();
}

function applySettings() {
    const settings = window.enhancedSystems.settings;
    const music = window.enhancedSystems.music;
    
    // Apply music volume
    if (music && settings) {
        music.setVolume(settings.getMusicVolume());
    }
}

function createEnhancedUI() {
    // Create Starship Upgrades Modal
    createStarshipModal();
    
    // Create Synergy Panel
    createSynergyPanel();
    
    // Create Event Banner
    createEventBanner();
    
    // Create Settings Modal
    createSettingsModal();
    
    // Create Powerup Display
    createPowerupDisplay();
    
    // Update Main Menu with crystal count
    updateMainMenuWithCrystals();
    
    // Add keyboard shortcuts
    setupKeyboardShortcuts();
}

function createStarshipModal() {
    const modal = document.createElement('div');
    modal.id = 'starship-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
        <div class="modal-content starship-content">
            <h2>🚀 Starship Upgrades 🚀</h2>
            <div class="crystal-display">
                <span class="crystal-icon">💎</span>
                <span id="crystal-count">0</span> Cosmic Crystals
            </div>
            <div id="starship-upgrades" class="upgrade-grid"></div>
            <button class="btn-secondary close-modal">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Close button
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

function createSynergyPanel() {
    const panel = document.createElement('div');
    panel.id = 'synergy-panel';
    panel.className = 'synergy-panel';
    panel.innerHTML = `
        <div class="synergy-header">
            <h3>⚡ Synergies</h3>
            <button class="synergy-toggle">−</button>
        </div>
        <div id="synergy-list" class="synergy-list"></div>
    `;
    
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.appendChild(panel);
    }
    
    // Toggle functionality
    panel.querySelector('.synergy-toggle').addEventListener('click', (e) => {
        const list = panel.querySelector('.synergy-list');
        const toggle = e.target;
        list.classList.toggle('collapsed');
        toggle.textContent = list.classList.contains('collapsed') ? '+' : '−';
    });
}

function createEventBanner() {
    const banner = document.createElement('div');
    banner.id = 'event-banner';
    banner.className = 'event-banner hidden';
    banner.innerHTML = `
        <div class="event-icon"></div>
        <div class="event-info">
            <div class="event-name"></div>
            <div class="event-timer-bar">
                <div class="event-timer-fill"></div>
            </div>
        </div>
    `;
    
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.appendChild(banner);
    }
}

function createSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'settings-modal';
    modal.className = 'modal hidden';
    document.body.appendChild(modal);

    const renderModal = () => {
        const tt = (k, f) => (window.t ? window.t(k, f) : f);
        modal.innerHTML = `
            <div class="modal-content settings-content">
                <h2>${tt('settings.title', '⚙️ Settings')}</h2>

                <div class="setting-group">
                    <label>${tt('settings.language', '🌐 Language')}</label>
                    <select id="ui-language">
                        <option value="en">${tt('settings.langEn', 'English')}</option>
                        <option value="de">${tt('settings.langDe', 'Deutsch')}</option>
                    </select>
                </div>

                <div class="setting-group">
                    <label>${tt('settings.soundVol', '🔊 Sound Volume')}</label>
                    <input type="range" id="sound-volume" min="0" max="100" value="50">
                    <span id="sound-volume-value">50%</span>
                </div>

                <div class="setting-group">
                    <label>${tt('settings.musicVol', '🎵 Music Volume')}</label>
                    <input type="range" id="music-volume" min="0" max="100" value="30">
                    <span id="music-volume-value">30%</span>
                </div>

                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="screen-shake" checked>
                        ${tt('settings.screenShake', '📳 Screen Shake')}
                    </label>
                </div>

                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="reduced-motion">
                        ${tt('settings.reducedMotion', '♿ Reduced Motion')}
                    </label>
                </div>

                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="damage-numbers" checked>
                        ${tt('settings.damageNumbers', '💢 Show Damage Numbers')}
                    </label>
                </div>

                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="show-fps">
                        ${tt('settings.showFps', '📊 Show FPS')}
                    </label>
                </div>

                <div class="setting-group">
                    <label>${tt('settings.colorblind', '🎨 Colorblind Mode')}</label>
                    <select id="colorblind-mode">
                        <option value="none">${tt('settings.colorblindNone', 'None')}</option>
                        <option value="protanopia">${tt('settings.colorblindProt', 'Protanopia (Red-Blind)')}</option>
                        <option value="deuteranopia">${tt('settings.colorblindDeut', 'Deuteranopia (Green-Blind)')}</option>
                        <option value="tritanopia">${tt('settings.colorblindTrit', 'Tritanopia (Blue-Blind)')}</option>
                    </select>
                </div>

                <div class="setting-group">
                    <label>${tt('settings.uiScale', '📏 UI Scale')}</label>
                    <input type="range" id="ui-scale" min="50" max="200" value="100">
                    <span id="ui-scale-value">100%</span>
                </div>

                <button class="btn-primary save-settings">${tt('settings.saveClose', 'Save & Close')}</button>
            </div>
        `;

        // Load current settings into UI
        loadSettingsUI();

        // Language change is applied immediately and the modal re-renders so labels switch.
        const langSel = modal.querySelector('#ui-language');
        if (langSel && window.i18n) {
            langSel.value = window.i18n.getLanguage();
            langSel.addEventListener('change', () => {
                window.i18n.setLanguage(langSel.value);
                renderModal();
            });
        }

        // Save button
        modal.querySelector('.save-settings').addEventListener('click', () => {
            saveSettingsFromUI();
            modal.classList.add('hidden');
        });
    };

    renderModal();

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Re-render labels when language changes from elsewhere
    if (window.i18n) {
        window.i18n.onChange(() => {
            if (!modal.classList.contains('hidden')) renderModal();
        });
    }
}

function createPowerupDisplay() {
    const display = document.createElement('div');
    display.id = 'powerup-display';
    display.className = 'powerup-display';
    
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.appendChild(display);
    }
}

function updateMainMenuWithCrystals() {
    const startModal = document.getElementById('start-modal');
    if (startModal) {
        const crystalDisplay = document.createElement('div');
        crystalDisplay.className = 'crystal-display-main';
        crystalDisplay.innerHTML = `
            <div class="crystal-info">
                <span class="crystal-icon">💎</span>
                <span id="main-crystal-count">0</span> Cosmic Crystals
            </div>
            <button id="starship-btn" class="btn-secondary">🚀 Starship Upgrades</button>
        `;
        
        const modalContent = startModal.querySelector('.modal-content');
        if (modalContent) {
            const firstButton = modalContent.querySelector('button');
            if (firstButton) {
                firstButton.parentNode.insertBefore(crystalDisplay, firstButton);
            }
        }
        
        // Starship button handler
        document.getElementById('starship-btn')?.addEventListener('click', () => {
            showStarshipModal();
        });
    }
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // R key for quick restart (only on game over)
        if (e.key === 'r' || e.key === 'R') {
            const gameOverModal = document.getElementById('game-over-modal');
            if (gameOverModal && !gameOverModal.classList.contains('hidden')) {
                const restartBtn = document.getElementById('restart-btn');
                if (restartBtn) {
                    restartBtn.click();
                }
            }
        }
    });
    
    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) {
                settingsModal.classList.remove('hidden');
            }
        });
    }
}

// Helper functions to show/update UI

function showStarshipModal() {
    const modal = document.getElementById('starship-modal');
    const metaProg = window.enhancedSystems.metaProgression;
    
    if (!modal || !metaProg) return;
    
    // Update crystal count
    const crystalCount = modal.querySelector('#crystal-count');
    if (crystalCount) {
        crystalCount.textContent = metaProg.crystals;
    }
    
    // Render upgrades
    renderStarshipUpgrades();
    
    modal.classList.remove('hidden');
}

function renderStarshipUpgrades() {
    const container = document.getElementById('starship-upgrades');
    const metaProg = window.enhancedSystems.metaProgression;
    
    if (!container || !metaProg) return;
    
    const upgrades = [
        { id: 'hullReinforcement', name: '🛡️ Hull Reinforcement', desc: '+5 Max Health per level' },
        { id: 'engineBoost', name: '⚡ Engine Boost', desc: '+0.1 Speed per level' },
        { id: 'weaponCalibration', name: '🔫 Weapon Calibration', desc: '+2 Damage per level' },
        { id: 'shieldGenerator', name: '🌟 Shield Generator', desc: '+1 Armor per level' },
        { id: 'luckyCharm', name: '🍀 Lucky Charm', desc: '+1% Crit Chance per level' },
        { id: 'creditMagnet', name: '🧲 Credit Magnet', desc: '+10 Pickup Range per level' },
        { id: 'rapidFireModule', name: '🚀 Rapid Fire Module', desc: '-1 Fire Rate per level' },
        { id: 'lifeSupport', name: '💊 Life Support', desc: '+0.5% Life Steal per level' },
    ];
    
    container.innerHTML = upgrades.map(upgrade => {
        const currentLevel = metaProg.starshipUpgrades[upgrade.id] || 0;
        const maxLevel = metaProg.getMaxLevel(upgrade.id);
        const cost = metaProg.getUpgradeCost(upgrade.id);
        const canAfford = metaProg.crystals >= cost;
        const isMaxed = currentLevel >= maxLevel;
        
        return `
            <div class="upgrade-item ${isMaxed ? 'maxed' : ''} ${!canAfford && !isMaxed ? 'locked' : ''}">
                <div class="upgrade-header">
                    <span class="upgrade-name">${upgrade.name}</span>
                    <span class="upgrade-level">${currentLevel}/${maxLevel}</span>
                </div>
                <div class="upgrade-desc">${upgrade.desc}</div>
                <button class="upgrade-btn" 
                        data-upgrade="${upgrade.id}" 
                        ${isMaxed || !canAfford ? 'disabled' : ''}>
                    ${isMaxed ? 'MAX' : `Upgrade (${cost} 💎)`}
                </button>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    container.querySelectorAll('.upgrade-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const upgradeId = btn.getAttribute('data-upgrade');
            if (metaProg.purchaseUpgrade(upgradeId)) {
                renderStarshipUpgrades();
                updateCrystalDisplays();
            }
        });
    });
}

function updateCrystalDisplays() {
    const metaProg = window.enhancedSystems.metaProgression;
    if (!metaProg) return;
    
    const crystals = metaProg.crystals;
    
    // Update all crystal displays
    document.querySelectorAll('#crystal-count, #main-crystal-count').forEach(el => {
        if (el) el.textContent = crystals;
    });
}

function loadSettingsUI() {
    const settings = window.enhancedSystems.settings;
    if (!settings) return;
    
    document.getElementById('sound-volume').value = settings.getSoundVolume() * 100;
    document.getElementById('sound-volume-value').textContent = Math.round(settings.getSoundVolume() * 100) + '%';
    
    document.getElementById('music-volume').value = settings.getMusicVolume() * 100;
    document.getElementById('music-volume-value').textContent = Math.round(settings.getMusicVolume() * 100) + '%';
    
    document.getElementById('screen-shake').checked = settings.isScreenShakeEnabled();
    document.getElementById('reduced-motion').checked = settings.isReducedMotionEnabled();
    document.getElementById('damage-numbers').checked = settings.shouldShowDamageNumbers();
    document.getElementById('show-fps').checked = settings.shouldShowFPS();
    document.getElementById('colorblind-mode').value = settings.getColorblindMode();
    document.getElementById('ui-scale').value = settings.getUIScale() * 100;
    document.getElementById('ui-scale-value').textContent = Math.round(settings.getUIScale() * 100) + '%';
    
    // Add value update listeners
    document.getElementById('sound-volume').addEventListener('input', (e) => {
        document.getElementById('sound-volume-value').textContent = e.target.value + '%';
    });
    
    document.getElementById('music-volume').addEventListener('input', (e) => {
        document.getElementById('music-volume-value').textContent = e.target.value + '%';
    });
    
    document.getElementById('ui-scale').addEventListener('input', (e) => {
        document.getElementById('ui-scale-value').textContent = e.target.value + '%';
    });
}

function saveSettingsFromUI() {
    const settings = window.enhancedSystems.settings;
    if (!settings) return;
    
    settings.setSoundVolume(parseFloat(document.getElementById('sound-volume').value) / 100);
    settings.setMusicVolume(parseFloat(document.getElementById('music-volume').value) / 100);
    settings.setScreenShake(document.getElementById('screen-shake').checked);
    settings.setReducedMotion(document.getElementById('reduced-motion').checked);
    settings.setShowDamageNumbers(document.getElementById('damage-numbers').checked);
    settings.setShowFPS(document.getElementById('show-fps').checked);
    settings.setColorblindMode(document.getElementById('colorblind-mode').value);
    settings.setUIScale(parseFloat(document.getElementById('ui-scale').value) / 100);
    
    applySettings();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancedSystems);
} else {
    initEnhancedSystems();
}

// Export for use in main game
export { 
    initEnhancedSystems, 
    showStarshipModal, 
    updateCrystalDisplays,
    renderStarshipUpgrades 
};
