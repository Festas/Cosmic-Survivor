# 🌌 Cosmic Survivor

A fast, juicy **top-down space survivor-roguelite** with an **OG alien-invaders** heart and
**Vampire Survivors × Brotato × Binding of Isaac** build-craft. Pilot a lone starfighter
against endless invader swarms, auto-firing a growing **arsenal** while you weave through
bullet-hell chaos. Survive, level up, draft game-warping weapons and items, **evolve** them
into legendary forms, and ride the **Overdrive** meter to a screen-clearing rampage.

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

### 🔆 Overdrive
Every kill stokes the **Overdrive meter**, and chaining kills on a hot combo fills it
faster. When it tops out, your ship enters a short **rampage**: dramatically faster
cooldowns and bonus damage across your whole arsenal. *Overdrive Reactor* builds the meter
quicker and extends the rampage.

---

## 🔫 Arsenal, evolutions & items

Instead of a single gun, you build a **loadout of up to 6 auto-firing weapons** (Vampire
Survivors style). Each weapon levels up independently, and when a weapon is **maxed** and you
own the passive it craves, it **evolves** into a legendary form:

| Base weapon        | Evolves into        | Requires                         |
| ------------------ | ------------------- | -------------------------------- |
| Ion Blaster        | **Photon Storm**    | Targeting Array (homing)         |
| Scatter Array      | **Flak Cannon**     | high crit chance                 |
| Arc Coil           | **Tesla Web**       | Tesla Rounds (shock imbue)       |
| Missile Pod        | **Swarm Barrage**   | Volatile Payload (explosive)     |
| Pulse Nova         | **Nova Collapse**   | large blast radius               |
| Rail Lance         | **Void Lance**      | Void Rounds or heavy pierce      |
| Graviton Mortar    | **Cluster Swarm**   | Volatile Payload (explosive)     |

**Passive items** are shared stat augments — damage, crit, haste, pierce, elemental imbues,
drones, lifesteal, armor and more — that buff *every* weapon and ability at once, so builds
snowball through synergy. Items come in four rarities (**Common → Rare → Epic → Legendary**)
with stack caps, and some are gated behind what you already own.

Each **level-up** offers a mix of draft cards — a brand-new weapon, a weapon upgrade, a rare
**EVOLVE**, or a passive item — weighted by rarity (boost your odds with *Lucky Core*). Don't
like the hand? **Reroll** it, or **Banish** a card to remove it from the run for good.

---

## 🎮 Controls

| Action           | Keyboard                | Touch                     |
| ---------------- | ----------------------- | ------------------------- |
| Move             | `WASD` / Arrow keys     | Left-side virtual joystick |
| Dash             | `Space` / `K`           | Dash button               |
| Deploy Singularity | `Shift` / `E` / `J`   | Singularity button        |
| Pause            | `Esc` / `P`             | —                         |
| Pick upgrade     | `1` `2` `3` or click    | Tap a card                |
| Reroll draft     | `R` (on level-up)       | Reroll button             |
| Banish card      | `B` (on level-up)       | Banish button             |
| Restart          | `R` (on game over)      | Retry button              |

Your arsenal **auto-fires at the nearest enemy** — focus on positioning, dodging, building
synergies, and when to spend your Singularity and Overdrive.

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
    weapons.js        #   weapon arsenal, evolutions & firing (pure)
    upgrades.js       #   level-up draft: weapons, evolves & items (pure)
    enemies.js        #   enemy/boss definitions & behaviors
    player.js         #   the ship: movement, arsenal firing, dash, overdrive
    world.js          #   simulation + rendering orchestrator
    background.js     #   parallax starfield & nebula
tools/                # Zero-dep dev server, build, and check scripts
tests/                # Unit tests for the pure game logic
```

The modules in `engine/utils.js` and the `game/` data modules (`config`, `elements`,
`weapons`, `upgrades`, `enemies`) are intentionally **DOM-free and pure**, which keeps the
core game logic unit-testable in plain Node.

---

## 🧪 Testing

- **Unit tests** (`npm test`) cover the deterministic logic: RNG determinism, difficulty
  scaling, XP curves, elemental reactions, the weapon arsenal (defs, leveling, evolutions),
  and the level-up draft (weapons, evolves, items, reroll/banish gating).
- The rendering/input layers are verified by running the game in a real browser.

---

## 📜 License

No license file ships with this repository yet. If you'd like to reuse or distribute the
code, please check with the repository owner ([@Festas](https://github.com/Festas)) first.

Made with love among the stars. 🛸
