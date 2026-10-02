# 🌌 Cosmic Survivor

A fast, juicy **top-down space survivor-roguelite**. Pilot a lone starfighter against
endless swarms of the Devourer's brood, auto-firing while you weave through bullet-hell
chaos. Survive, level up, and draft game-warping upgrades — then do it all again, better.

Built from scratch as a **zero-dependency** project: vanilla JavaScript ES modules,
HTML5 Canvas 2D, and fully procedural WebAudio. No frameworks, no build step, no bundler.
Just serve the folder and play.

---

## ✨ Signature mechanics

Three mechanics make Cosmic Survivor feel different from the usual survivor game — and they
combo with each other:

### 🌀 Singularity
Charge it by killing. When ready, deploy a **black hole** at the densest enemy cluster. It
drags enemies (and their bullets) inward, burns them with void energy, then **implodes** in
a massive shockwave. Build around it with *Dark Matter Capacitor* (faster charge) and
*Event Horizon* (bigger, deadlier collapse).

### 💨 Phase Dash
Blink through danger on a short cooldown. The dash grants **i-frames**, briefly triggers
**bullet-time** so you can read the battlefield, and carves a damaging rift trail through
anything you pass. *Rift Blades* turn your escape tool into an offensive weapon.

### ✴️ Elemental Resonance
Imbue your shots with **Fire, Cryo, Shock, or Void**. Applying a second element to an
already-afflicted enemy triggers a **Resonance reaction**:

| Combo            | Reaction       | Effect                                  |
| ---------------- | -------------- | --------------------------------------- |
| Cryo + Fire      | **Shatter**    | Icy burst + big knockback               |
| Fire + Shock     | **Overload**   | High-damage explosion                   |
| Cryo + Shock     | **Superconduct** | Chaining slow field                   |
| Fire + Void      | **Collapse**   | Gravity burst that pulls enemies in     |
| Cryo + Void      | **Black Ice**  | Freezing gravity well                   |
| Shock + Void     | **Ion Storm**  | Long-range chain lightning + pull       |

Stack *Resonance Cascade* to make every reaction hit even harder.

---

## 🎮 Controls

| Action           | Keyboard                | Touch                     |
| ---------------- | ----------------------- | ------------------------- |
| Move             | `WASD` / Arrow keys     | Left-side virtual joystick |
| Dash             | `Space` / `K`           | Dash button               |
| Deploy Singularity | `Shift` / `E` / `J`   | Singularity button        |
| Pause            | `Esc` / `P`             | —                         |
| Pick upgrade     | `1` `2` `3` or click    | Tap a card                |
| Restart          | `R` (on game over)      | Retry button              |

Your weapon **auto-fires at the nearest enemy** — focus on positioning, dodging, and when
to spend your Singularity.

---

## 🚀 Run it locally

Requires **Node.js 18+** (only used for the tiny static dev server — the game itself ships
no dependencies).

```bash
npm run dev
# → open http://localhost:3000
```

That's it. Because the game uses native ES modules, it must be served over HTTP (opening
`index.html` from `file://` won't work).

### Other scripts

```bash
npm run check   # syntax-check every module (node --check)
npm test        # run the unit test suite (node --test)
npm run build   # copy the static site into dist/
```

---

## 🐳 Deploy (static Docker image)

The included `Dockerfile` builds the static site and serves it with nginx:

```bash
docker build -t cosmic-survivor .
docker run --rm -p 8080:80 cosmic-survivor
# → open http://localhost:8080
```

`nginx.conf` sets correct MIME types for ES modules, gzip, and sensible cache headers
(the service worker is always revalidated so updates ship instantly).

---

## 📱 PWA / offline

The game registers a service worker (`sw.js`) and ships a web manifest, so it's installable
and **playable offline** after the first load.

---

## 🗂️ Project structure

```
index.html            # Canvas, HUD, menus, overlays
styles.css            # Neon-space UI styling
manifest.webmanifest  # PWA manifest
sw.js                 # Offline service worker
src/
  main.js             # Bootstrap: canvas, game loop, UI wiring
  engine/             # Reusable, game-agnostic systems
    utils.js          #   math, seeded RNG, formatting (pure)
    input.js          #   keyboard + touch
    audio.js          #   procedural WebAudio SFX + music
    particles.js      #   pooled particle system
    camera.js         #   follow + screen-shake
    storage.js        #   high scores & settings (localStorage)
  game/               # The game itself
    config.js         #   tuning constants + difficulty curves (pure)
    elements.js       #   Resonance elements & reactions (pure)
    upgrades.js       #   upgrade pool & draft logic (pure)
    enemies.js        #   enemy/boss definitions & behaviors
    player.js         #   the ship: movement, firing, dash, singularity
    world.js          #   simulation + rendering orchestrator
    background.js     #   parallax starfield & nebula
tools/                # Zero-dep dev server, build, and check scripts
tests/                # Unit tests for the pure game logic
```

The modules in `engine/utils.js` and the `game/` data modules (`config`, `elements`,
`upgrades`, `enemies`) are intentionally **DOM-free and pure**, which keeps the core game
logic unit-testable in plain Node.

---

## 🧪 Testing

- **Unit tests** (`npm test`) cover the deterministic logic: RNG determinism, difficulty
  scaling, XP curves, elemental reactions, and the upgrade draft.
- The rendering/input layers are verified by running the game in a real browser.

---

## 📜 License

No license file ships with this repository yet. If you'd like to reuse or distribute the
code, please check with the repository owner ([@Festas](https://github.com/Festas)) first.

Made with love among the stars. 🛸
