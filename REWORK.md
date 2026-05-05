# Cosmic Survivor — Engine & Architecture Rework

This document is the architecture-decision record (ADR) for the multi-phase
rework. It explains **what shipped in this PR**, **why we chose a vertical
slice over a Big Bang rewrite**, and **how to continue the migration in
follow-up PRs**.

---

## 1. Background

The legacy codebase pairs a 6 500-line `main.js` (classic script) with a
growing constellation of ES-module systems under `js/systems/`. It ships a
playable, content-rich game (14 enemies, 7 bosses, multiplayer, story mode,
daily challenges, i18n, PWA), but the brief calls for an even bigger
overhaul: TypeScript + WebGL renderer + workers + native packaging.

Doing all of that at once would:

- freeze gameplay work for weeks,
- break every existing import and translation key,
- balloon the diff far past anything reviewable in a single PR.

So this PR lands a **vertical slice of every phase** — a cohesive set of
*additive* modules that touch every numbered phase of the rework brief while
leaving the existing systems running. Nothing in this PR is destructive: the
legacy paths still work, and every new module is feature-detected.

---

## 2. Phases & what shipped

### Phase 0/1 — Core engine refactor & optimisation
- **`js/core/objectPool.js`** — generic typed object pool with growth cap and
  `null`-on-exhaustion contract so a runaway spawn cannot OOM the tab.
- **`js/core/eventBus.js`** — minimal pub/sub (`gameBus` singleton) used by
  the new gameplay systems for cross-cutting signals.
- **`js/core/rng.js`** — `xoshiro128**` PRNG (string-seeded) with `save/load`
  state, the prerequisite for deterministic challenges and rollback netcode.
- **`js/core/spatialHash.js`** — uniform-grid broadphase. Reused scratch
  buffers; bounded results.
- **`js/core/fixedClock.js`** — fixed-timestep accumulator (drop-in for the
  next sim/render split).
- **`js/core/workers/broadphase.worker.js`** — Web Worker scaffold that owns
  a `SpatialHash` and answers proximity queries off-main-thread.
- **`jsconfig.json`** turns on `checkJs` for `js/core/**`, `js/render/**` and
  the new gameplay systems so JSDoc types are enforced going forward.

### Phase 2 — Visual overhaul ("juice")
- **`js/render/juice.js`** — three small, framework-agnostic systems:
  - `TraumaShake` (Squirrel Eiserloh model, squared trauma → quadratic feel),
  - `HitStop` (sim-only pause for crit/heavy-damage frames),
  - `HitFlash` (screen-space colour pulse for damage / level-ups).
- Integrated **transparently** into the legacy `screenShake()` helper so
  every existing callsite layers on top of the new trauma model.
- New `hitStop()` helper called at:
  - critical bullet hits (`Bullet.update`),
  - heavy player damage (`Player.takeDamage`).
- Hit-flash overlay drawn over the world, under the HUD.
- Stance ring around the player (charging arc → solid pulsing ring on
  Focus).

### Phase 3 — UI / HUD
- **`drawStanceWeatherHUD()`** — top-center pill row showing the current
  stance and active weather. Reuses the existing canvas HUD style.
- Existing minimap, XP bar, DPS meter, combo counter, etc. are untouched.

### Phase 4 — Gameplay mechanics
- **`js/systems/stanceSystem.js`** — Moving vs Focus stances:
  - Standing still for ~0.5 s engages **Focus** (+20 % damage,
    +5 % crit chance, –15 % damage taken, +10 % attack-cooldown penalty).
  - Moving keeps **Moving** stance with doubled pickup-magnetism.
  - Twelve-frame grace window prevents knockback / tap-to-aim from
    breaking Focus instantly.
- **`js/systems/weatherSystem.js`** — per-wave weather rolled from a
  weighted table (`clear`, `rain`, `fog`, `storm`, `eclipse`):
  - Multiplies player damage / defense / elemental damage.
  - Adjusts enemy aggro range.
  - `storm` periodically lightning-strikes a random enemy.
  - Visual overlay (rain streaks, colour wash, lightning bolts).
  - Eclipse is reserved for boss waves.

### Phase 5 — Content & enemies
- **`js/systems/enemyBehaviors.js`** — opt-in advanced behaviors:
  - `flank` — approach perpendicular to the player rather than head-on.
  - `shieldBuddy` + `applyShieldBuddyAbsorption` — sticks to an ally and
    eats half their incoming damage.
- **`tools/content-validator/validate.mjs`** — extracts `ENEMY_TYPES` and
  `BOSS_TYPES` from both `main.js` and `js/entities/*.js`, fails the build on
  *id-set drift* (a new enemy added in only one file), reports field drift
  as advisory warnings. Wired as `npm run validate:content`.

### Phase 6 — Multiplayer / co-op
- **`js/systems/coopAura.js`** — passing a player projectile within ~80 px
  of an ally adds +20 % damage and +1 pierce, idempotently per-ally per
  bullet. The donor ally is ringed in dashed lavender.
- New `coop_buff` event whitelisted in `server/messageHandler.js`'s
  `GAME_EVENT_LIMITS` (64-byte cap) so VFX broadcasts don't get silently
  dropped.

### Cross-cutting
- **`tests/core.test.mjs`** — 33 `node --test` smoke tests covering every
  new module (pool reuse / exhaustion, deterministic RNG, spatial hash
  candidates, fixed clock cadence + spiral-of-death clamp, trauma decay,
  hit-stop windows, hit-flash decay, stance grace window, weather
  determinism + storm lightning, flank vector, shielder absorption, coop
  aura idempotency). `npm test` runs them all in ~130 ms.
- `npm run validate:content` & `npm test` are two new package scripts.

---

## 3. Why the slice is shaped this way

| Principle | How it shows up |
| --- | --- |
| **Additive only** | Every new module is feature-detected via `window.rework`. If the ESM bundle fails to load, the legacy game keeps working. |
| **Hot-path safe** | Pool / hash use scratch buffers and fixed-result caps so they cannot allocate or unbounded-loop in the frame loop. |
| **Deterministic** | RNG, weather, fixed clock and stance are all deterministic given the same input — the building blocks for daily-challenge replay and rollback. |
| **Test-covered** | Every new gameplay rule has at least one assertion so future refactors break loudly. |

---

## 4. Migration roadmap

This PR is **step 1 of N**. Recommended follow-ups, in order, each shippable
as a small PR:

1. **Replace ad-hoc enemy/bullet allocations with `ObjectPool`** —
   `damage-text` particles first (highest churn), then enemy bullets, then
   particle effects. Pools are wired but not yet plumbed into `main.js`'s
   `createParticles` / `createTextParticle` helpers.
2. **Move broadphase to `js/core/spatialHash.js`** — start with the bullet
   vs enemy loop in `Bullet.update` (currently O(N×M)).
3. **Adopt `FixedClock`** — split simulation from render. Initially run sim
   at 60 Hz and render at rAF rate, retaining the legacy variable-dt code
   path behind a `?fixedstep=0` URL flag.
4. **Promote `js/core/workers/broadphase.worker.js`** — once main thread is
   pool-aware, hand collision broadphase off-thread.
5. **TypeScript-first new modules** — keep adding under `js/core/**` and
   `js/render/**` where `checkJs` already enforces JSDoc types; once enough
   surface is annotated, switch the `tsconfig` to a real TS compile that
   emits to `js/core/**/*.js`.
6. **Renderer migration** — once `main.js` no longer touches `ctx`
   directly outside `js/render/**`, swap the 2D backend for PixiJS or
   regl-based WebGL behind a `Renderer` interface.
7. **Native shell** — wrap the existing PWA in Tauri once renderer + sim
   are stable. No code change needed; only a build pipeline addition.

---

## 5. How to verify locally

```bash
npm install
npm test                  # 33/33 pass
npm run validate:content  # OK + advisory boss warnings
npm run build             # vite build succeeds
npm run dev:all           # vite + multiplayer server
```

In the browser: stand still in any wave to charge the **Focus** ring around
the player (top-center pill switches from `🏃 MOVING` to `🎯 FOCUS`). Wait
for wave 3+ to see weather pills appear (`🌧️ Rain`, `🌫️ Fog`, `⛈️ Storm`).
Take damage to see the new red hit-flash. Land a critical hit to feel the
hit-stop. In multiplayer, fire bullets that pass through an ally's lavender
ring — they'll punch harder.
