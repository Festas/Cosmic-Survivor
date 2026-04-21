// Story Mode for Cosmic Survivor
// Defines 5 themed chapters with custom waves, fixed final boss, intro/outro flavour.
// Exposes window.StoryMode with launchChapter() and showStoryMenu().
// Designed to integrate with the existing main.js wave/spawn system without breaking it.

const STORAGE_KEY = 'cosmicSurvivor_storyProgress';

// Chapter definitions. enemyPool restricts which enemy types may spawn during the chapter.
// finalBoss is the boss spawned in the chapter's final wave.
// modifier is an optional name of a wave modifier (matches keys in WAVE_MODIFIERS in main.js).
export const CHAPTERS = [
    {
        id: 'ch1',
        index: 1,
        titleKey: 'story.ch1.title',
        introKey: 'story.ch1.intro',
        outroKey: 'story.ch1.outro',
        difficulty: 'easy',
        waves: 5,
        finalBoss: 'titan',          // matches BOSS_TYPES
        enemyPool: ['grunt', 'swarm', 'tank'],
        recommendedCharacter: 'balanced',
        unlockNext: 'ch2',
    },
    {
        id: 'ch2',
        index: 2,
        titleKey: 'story.ch2.title',
        introKey: 'story.ch2.intro',
        outroKey: 'story.ch2.outro',
        difficulty: 'normal',
        waves: 6,
        finalBoss: 'leviathan',
        enemyPool: ['grunt', 'swarm', 'tank', 'teleporter', 'parasite'],
        recommendedCharacter: 'medic',
        unlockNext: 'ch3',
    },
    {
        id: 'ch3',
        index: 3,
        titleKey: 'story.ch3.title',
        introKey: 'story.ch3.intro',
        outroKey: 'story.ch3.outro',
        difficulty: 'normal',
        waves: 7,
        finalBoss: 'voidlord',
        enemyPool: ['grunt', 'shooter', 'teleporter', 'freezer', 'splitter'],
        recommendedCharacter: 'sniper',
        unlockNext: 'ch4',
    },
    {
        id: 'ch4',
        index: 4,
        titleKey: 'story.ch4.title',
        introKey: 'story.ch4.intro',
        outroKey: 'story.ch4.outro',
        difficulty: 'hard',
        waves: 7,
        finalBoss: 'forgemaster',
        enemyPool: ['grunt', 'shooter', 'shielder', 'tank', 'bomber', 'berserker'],
        recommendedCharacter: 'tank',
        unlockNext: 'ch5',
    },
    {
        id: 'ch5',
        index: 5,
        titleKey: 'story.ch5.title',
        introKey: 'story.ch5.intro',
        outroKey: 'story.ch5.outro',
        difficulty: 'hard',
        waves: 8,
        finalBoss: 'origin',
        enemyPool: ['grunt', 'shooter', 'teleporter', 'freezer', 'shielder', 'berserker', 'necro'],
        recommendedCharacter: null,
        unlockNext: null,
    },
];

export class StoryMode {
    constructor() {
        this.progress = this._loadProgress();
        this.activeChapter = null;
    }

    _loadProgress() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const p = JSON.parse(raw);
                if (p && typeof p === 'object' && p.completed && typeof p.completed === 'object') {
                    return p;
                }
            }
        } catch {}
        return { completed: {}, lastPlayed: null };
    }

    _save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress)); } catch {}
    }

    isUnlocked(chapter) {
        if (!chapter) return false;
        if (chapter.index === 1) return true;
        // Unlocked if previous chapter completed
        const prev = CHAPTERS[chapter.index - 2];
        return prev && !!this.progress.completed[prev.id];
    }

    isCompleted(chapterId) {
        return !!this.progress.completed[chapterId];
    }

    markCompleted(chapterId) {
        this.progress.completed[chapterId] = { at: Date.now() };
        this.progress.lastPlayed = chapterId;
        this._save();
    }

    getChapter(id) {
        return CHAPTERS.find(c => c.id === id) || null;
    }

    getActiveChapter() {
        return this.activeChapter;
    }

    setActiveChapter(chapter) {
        this.activeChapter = chapter;
    }

    clearActiveChapter() {
        this.activeChapter = null;
    }

    /**
     * Returns whether a given wave number within the active chapter is the final/boss wave.
     */
    isFinalWave(wave) {
        return this.activeChapter && wave >= this.activeChapter.waves;
    }
}

// ===== UI helpers =====
const t = (k, f, v) => (window.t ? window.t(k, f, v) : (f || k));

function buildChapterCard(story, chapter) {
    const unlocked = story.isUnlocked(chapter);
    const completed = story.isCompleted(chapter.id);
    const card = document.createElement('div');
    card.className = `story-chapter-card ${unlocked ? '' : 'locked'} ${completed ? 'completed' : ''}`;
    card.innerHTML = `
        <div class="story-chapter-index">${t('story.chapter', 'Chapter {n}', { n: chapter.index })}</div>
        <h3 class="story-chapter-title">${t(chapter.titleKey)}</h3>
        <p class="story-chapter-desc">${t(chapter.introKey)}</p>
        <div class="story-chapter-meta">
            <span>🌊 ${chapter.waves}</span>
            <span>⚙️ ${t('difficulty.' + chapter.difficulty, chapter.difficulty)}</span>
            ${completed ? `<span class="story-chapter-status">${t('story.complete', '✅ Completed')}</span>` : ''}
            ${!unlocked ? `<span class="story-chapter-status locked">${t('story.locked', '🔒 Locked')}</span>` : ''}
        </div>
        <button class="btn-primary story-chapter-start" ${unlocked ? '' : 'disabled'}>${t('story.start', 'Start Chapter')}</button>
    `;
    if (unlocked) {
        card.querySelector('.story-chapter-start').addEventListener('click', () => {
            launchChapterFlow(story, chapter);
        });
    }
    return card;
}

export function showStoryMenu(story) {
    const existing = document.getElementById('story-menu-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'story-menu-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content story-menu-content">
            <h2>${t('story.title', '📖 Story Mode')}</h2>
            <p class="intro-text">${t('story.intro')}</p>
            <div class="story-chapter-list" id="story-chapter-list"></div>
            <button class="btn-secondary story-menu-close">${t('common.back', 'Back')}</button>
        </div>
    `;
    document.body.appendChild(modal);

    const list = modal.querySelector('#story-chapter-list');
    CHAPTERS.forEach(ch => list.appendChild(buildChapterCard(story, ch)));

    const close = () => {
        modal.remove();
        const startModal = document.getElementById('start-modal');
        if (startModal) startModal.classList.remove('hidden');
    };
    modal.querySelector('.story-menu-close').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    // Hide start modal while story is open
    const startModal = document.getElementById('start-modal');
    if (startModal) startModal.classList.add('hidden');
    modal.classList.remove('hidden');
}

/**
 * Show a cinematic intro/outro overlay. Calls onContinue when dismissed.
 */
export function showCinematic(titleKey, bodyKey, onContinue, opts = {}) {
    const isVictory = !!opts.victory;
    const overlay = document.createElement('div');
    overlay.className = 'story-cinematic';
    overlay.innerHTML = `
        <div class="story-cinematic-content ${isVictory ? 'victory' : ''}">
            ${isVictory ? `<div class="story-cinematic-banner">${t('story.victory', '🌟 CHAPTER COMPLETE 🌟')}</div>` : ''}
            <h1 class="story-cinematic-title">${t(titleKey)}</h1>
            <p class="story-cinematic-body">${t(bodyKey)}</p>
            <div class="story-cinematic-actions">
                <button class="btn-primary story-cinematic-continue">${t('story.continueBtn', 'Continue')}</button>
                ${opts.skip ? `<button class="btn-secondary story-cinematic-skip">${t('story.skipBtn', 'Skip ▶')}</button>` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const dismiss = () => {
        overlay.classList.add('fading');
        setTimeout(() => overlay.remove(), 250);
        if (typeof onContinue === 'function') onContinue();
    };
    overlay.querySelector('.story-cinematic-continue').addEventListener('click', dismiss);
    const skipBtn = overlay.querySelector('.story-cinematic-skip');
    if (skipBtn) skipBtn.addEventListener('click', dismiss);
}

function launchChapterFlow(story, chapter) {
    // Close menu, show intro cinematic, then begin.
    const menu = document.getElementById('story-menu-modal');
    if (menu) menu.remove();

    showCinematic(chapter.titleKey, chapter.introKey, () => {
        // Hand control to main.js
        if (typeof window.startStoryChapter === 'function') {
            story.setActiveChapter(chapter);
            window.startStoryChapter(chapter);
        } else {
            console.warn('[StoryMode] window.startStoryChapter is not defined');
        }
    });
}

export function showChapterVictory(story, chapter, onContinue) {
    showCinematic(chapter.titleKey, chapter.outroKey, () => {
        if (typeof onContinue === 'function') onContinue();
    }, { victory: true });
}

// Init & expose globally for non-module main.js
const _story = new StoryMode();
if (typeof window !== 'undefined') {
    window.StoryMode = {
        instance: _story,
        chapters: CHAPTERS,
        showMenu: () => showStoryMenu(_story),
        showCinematic,
        showChapterVictory: (chapter, cb) => showChapterVictory(_story, chapter, cb),
        getActiveChapter: () => _story.getActiveChapter(),
        setActiveChapter: (c) => _story.setActiveChapter(c),
        clearActiveChapter: () => _story.clearActiveChapter(),
        markCompleted: (id) => _story.markCompleted(id),
        isUnlocked: (c) => _story.isUnlocked(c),
        isCompleted: (id) => _story.isCompleted(id),
        getChapter: (id) => _story.getChapter(id),
    };
}

export default _story;
