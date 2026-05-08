// Ambient declarations for Cosmic Survivor TypeScript migration (PR-K).
// Pragmatic typing: many fields are `any` to keep tsc happy with minimal churn.
// FIXME(types): tighten these as individual systems are refactored.

export {};

declare global {
  interface Window {
    // Constants / config
    ARENA_CONSTANTS?: any;
    BOSS_TYPES?: any;
    ENEMY_TYPES?: any;
    WEAPON_TYPES?: any;
    CONFIG?: any;
    MP_EMOTES?: any;
    MP_REVIVE_DOWNED_MS?: number;
    MP_REVIVE_RANGE?: number;

    // Entity classes (assigned by entity modules at load time)
    Player?: any;
    Bullet?: any;
    EnemyBullet?: any;
    Enemy?: any;
    Pickup?: any;
    XPOrb?: any;
    Powerup?: any;
    Camera?: any;

    // Systems
    Sound?: any;
    DailyChallenge?: any;
    StoryMode?: any;
    MultiplayerClient?: any;
    MultiplayerExtras?: any;

    // Game state
    game?: any;
    rework?: any;
    inputState?: any;
    waveSystem?: any;

    // Helpers and event hooks
    i18n?: any;
    t?: (...args: any[]) => string;
    translateDOM?: (...args: any[]) => void;
    showNotification?: (...args: any[]) => void;
    createExplosion?: (...args: any[]) => void;
    createParticles?: (...args: any[]) => void;
    createTextParticle?: (...args: any[]) => void;
    hitStop?: (...args: any[]) => void;
    screenShake?: (...args: any[]) => void;
    hasPowerup?: (...args: any[]) => any;
    getPowerupMultiplier?: (...args: any[]) => number;
    getAverageDPS?: (...args: any[]) => number;
    handlePlayerDeath?: (...args: any[]) => void;
    spawnWave?: (...args: any[]) => void;
    checkWaveClear?: (...args: any[]) => void;
    startStoryChapter?: (...args: any[]) => void;

    webkitAudioContext?: typeof AudioContext;
  }
}
