# Cosmic Survivor — Engine & Architecture Rework

This document is the architecture-decision record (ADR) for the multi-phase
rework. It captures the currently shipped architecture, why the work was done
as vertical slices instead of a Big Bang rewrite, and the resulting long-term
boundaries.

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

The rework landed as **vertical slices of every phase** — cohesive, additive
modules that touched each numbered phase while keeping legacy paths running.
The final state keeps those compatibility guarantees: legacy paths still work,
and new modules are feature-detected.

---

## 2. Phases & what shipped

### Phase 0/1 — Core engine refactor & optimisation
- **`js/core/objectPool.ts`** — generic typed object pool with growth cap and
  `null`-on-exhaustion contract so a runaway spawn cannot OOM the tab.
- **`js/core/eventBus.ts`** — minimal pub/sub (`gameBus` singleton) used by
  the new gameplay systems for cross-cutting signals.
- **`js/core/rng.ts`** — `xoshiro128**` PRNG (string-seeded) with `save/load`
  state, the prerequisite for deterministic challenges and rollback netcode.
- **`js/core/spatialHash.ts`** — uniform-grid broadphase. Reused scratch
  buffers; bounded results.
- **`js/core/fixedClock.ts`** — fixed-timestep accumulator (drop-in for the
  next sim/render split).
- **`js/core/workers/broadphase.worker.ts`** — Web Worker scaffold that owns
  a `SpatialHash` and answers proximity queries off-main-thread.
- **`tsconfig.json`** enforces strict type-checking for `js/core/**`,
  `js/render/**`, `js/entities/**`, and `js/systems/**`.

### Phase 2 — Visual overhaul ("juice")
- **`js/render/juice.ts`** — three small, framework-agnostic systems:
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
- **`js/systems/stanceSystem.ts`** — Moving vs Focus stances:
  - Standing still for ~0.5 s engages **Focus** (+20 % damage,
    +5 % crit chance, –15 % damage taken, +10 % attack-cooldown penalty).
  - Moving keeps **Moving** stance with doubled pickup-magnetism.
  - Twelve-frame grace window prevents knockback / tap-to-aim from
    breaking Focus instantly.
- **`js/systems/weatherSystem.ts`** — per-wave weather rolled from a
  weighted table (`clear`, `rain`, `fog`, `storm`, `eclipse`):
  - Multiplies player damage / defense / elemental damage.
  - Adjusts enemy aggro range.
  - `storm` periodically lightning-strikes a random enemy.
  - Visual overlay (rain streaks, colour wash, lightning bolts).
  - Eclipse is reserved for boss waves.

### Phase 5 — Content & enemies
- **`js/systems/enemyBehaviors.ts`** — opt-in advanced behaviors:
  - `flank` — approach perpendicular to the player rather than head-on.
  - `shieldBuddy` + `applyShieldBuddyAbsorption` — sticks to an ally and
    eats half their incoming damage.
- **`tools/content-validator/validate.mjs`** — extracts `ENEMY_TYPES` and
  `BOSS_TYPES` from both `main.js` and `js/entities/*.ts` (with `.js` fallback support), fails the build on
  *id-set drift* (a new enemy added in only one file), reports field drift
  as advisory warnings. Wired as `npm run validate:content`.

### Phase 6 — Multiplayer / co-op
- **`js/systems/coopAura.ts`** — passing a player projectile within ~80 px
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

All planned rework steps are now shipped:

1. **ObjectPool integration** ✅ (PR #40) — allocation-heavy gameplay paths moved to pooled objects.
2. **SpatialHash broadphase** ✅ (PR #41) — collision broadphase moved to `js/core/spatialHash.ts`.
3. **FixedClock dual-path** ✅ (PR #41) — deterministic fixed-step path added alongside legacy timing.
4. **Off-thread broadphase worker** ✅ (PR #41) — worker scaffold in `js/core/workers/broadphase.worker.ts`.
5. **WebGL renderer (PixiJS) default** ✅ (PR #43, PR #44) — WebGL is default; use `?renderer=canvas2d` as escape hatch.
6. **TypeScript-first modular tree** ✅ (PR #45) — `js/core/**`, `js/render/**`, `js/entities/**`, `js/systems/**` are `.ts`; `main.js`, `server/`, and `tools/` stay JavaScript.
7. **Renderer interface boundary** ✅ (PR #43) — shared `Renderer` interface and backend boundary shipped.
8. **Tauri native shell** ✅ (PR-L / PR #46) — Tauri v2 desktop packaging (`npm run tauri:dev`, `npm run tauri:build`) plus release workflow.

---

## 5. How to verify locally

```bash
npm install
npm test                  # 96/96 pass
npm run validate:content  # OK + advisory boss warnings
npm run build             # vite build succeeds
npm run dev:all           # vite + multiplayer server
npm run tauri:dev         # native desktop window with hot reload (requires rustup)
npm run tauri:build       # installer in src-tauri/target/release/bundle/
```

In the browser: stand still in any wave to charge the **Focus** ring around
the player (top-center pill switches from `🏃 MOVING` to `🎯 FOCUS`). Wait
for wave 3+ to see weather pills appear (`🌧️ Rain`, `🌫️ Fog`, `⛈️ Storm`).
Take damage to see the new red hit-flash. Land a critical hit to feel the
hit-stop. In multiplayer, fire bullets that pass through an ally's lavender
ring — they'll punch harder.

Runtime URL flags:

| Flag | Meaning |
| --- | --- |
| `?renderer=canvas2d` | Force Canvas2D backend instead of default WebGL renderer |
| `?broadphase=hash` | Force SpatialHash broadphase path |
| `?fixedstep=1` | Force fixed-timestep simulation path |

Flags compose (for example: `?renderer=canvas2d&broadphase=hash&fixedstep=1`).

---

## 9. Entity peeling — §9 parallel track

Entities extracted from `main.js` and moved to `js/entities/`:

| Entity | File | Status |
| --- | --- | --- |
| Player | `js/entities/Player.ts` | ✅ Done (PR #43) |
| Bullet + EnemyBullet | `js/entities/Bullet.ts` | ✅ Done (PR #43) |
| Enemy | `js/entities/Enemy.ts` | ✅ Shipped (PR-J) |
| Pickup + XPOrb + Powerup | `js/entities/Pickup.ts` | ✅ Shipped (PR-J) |
| spawnWave (Wave logic) | `js/systems/waveSystem.ts` | ✅ Shipped (PR-J) |
| Camera | `js/core/camera.ts` | ✅ Shipped (PR-J) |
| Input handlers | `js/core/input.ts` | ✅ Shipped (PR-J) |
| Particle, HUD | — | 🔜 Next slices |

Each extracted class:
- Exports the class as a named export
- Assigns `window.ClassName` at module-load time for `main.js` compatibility
- Has a `reset()` method for `ObjectPool` compatibility (PR #40)
- Reads all globals via `window.*` to avoid circular imports

---

## 10. Tauri native shell — capability hygiene

Tauri v2 uses a capability-based permission model. `src-tauri/capabilities/default.json`
grants **only** `core:default` to the main window by design.

Any future feature that needs OS-level access must explicitly add the required
permission to that file, following the principle of least privilege:

| Feature | Permission |
|---|---|
| File save / load dialogs | `dialog:open`, `dialog:save` |
| System tray | `tray-icon:*` |
| Auto-updater | `updater:*` |
| Desktop notifications | `notification:default` |

Do not add permissions speculatively. Open-ended permissions such as
`fs:allow-read-recursive` or `shell:execute` must not be added without a
concrete, reviewed feature rationale.
