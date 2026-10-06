# 🌌 Cosmic Survivor

A fast, juicy **top-down space survivor-roguelite** with an **OG alien-invaders** heart and
**Vampire Survivors × Brotato × Binding of Isaac** build-craft. Pilot a lone starfighter
against endless invader swarms, auto-firing a growing **arsenal** while you weave through
bullet-hell chaos. Survive, level up, draft game-warping weapons and items, **evolve** them
into legendary forms, and ride the **Overdrive** meter to a screen-clearing rampage — then
bank **Stardust** to permanently **ascend**, unlock new **starfighters**, dial up optional
**Directives** and collect **Commendations** between runs.

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

### 🟡 Elite raiders
The longer you survive, the more the swarm sends **elites** — gold-ringed, beefed-up
versions of the mid-tier archetypes with far more health, a harder hit and a larger frame.
They start trickling in after the first minutes and ramp toward a steady minority of every
wave, so late runs stay dangerous instead of becoming a cakewalk. Put one down and it pays
out: elites drop a **richer burst of XP**.

### 🔆 Overdrive
Every kill stokes the **Overdrive meter**, and chaining kills on a hot combo fills it
faster. When it tops out, your ship enters a short **rampage**: dramatically faster
cooldowns and bonus damage across your whole arsenal. *Overdrive Reactor* builds the meter
quicker and extends the rampage.

---

## 🛠 The Hangar — permanent progression

Every run now feeds a persistent meta-layer, so you grow stronger even when you lose.

### ✦ Stardust
Finish a run and you bank **Stardust**, scaled by your score, survival time, kills, level
and bosses downed (the *Salvage Rig* upgrade multiplies the haul). Spend it in the
**Hangar**, reachable from the start and game-over screens.

### 🌟 Ascension
A tree of **12 permanent upgrades** bought with Stardust — more max HP, damage, move speed,
armor, regen, crit, attack speed, XP & pickup range, luck, Singularity charge, Stardust
gain, and the capstone **Phoenix Protocol**, which revives you once per run at half HP with
a clearing nova. Levels persist forever and layer on top of your ship and in-run drafts.

### 🚀 Starfighters
Pick from **6 ships**, each a distinct build identity with its own starter weapon, stat
profile and accent colour:

| Ship | Style | Starter | Identity |
| ---- | ----- | ------- | -------- |
| 🛸 **Vanguard** | Balanced all-rounder | Ion Blaster | No weaknesses (free) |
| 🗡️ **Striker** | Glass cannon | Scatter Array | +damage & crit, less HP |
| 🛡️ **Juggernaut** | Fortress | Pulse Nova | +HP/armor/knockback, slower |
| ⚡ **Tempest** | Blitz | Arc Coil | +speed & haste, fragile |
| 🔥 **Pyre** | Pyromancer | Missile Pod | Fire imbue + explosions |
| 🌀 **Oracle** | Voidcaller | Graviton Mortar | Void imbue + supercharged Singularity |

Ships beyond the Vanguard are unlocked permanently with Stardust.

### 🎲 Directives
Opt-in **challenge modifiers** toggled in the Hangar before a run. Each makes the run harder
in some dimension — tougher or faster enemies, denser swarms, a fragile hull, bulkier bosses,
slower leveling — and in return **multiplies the Stardust** you earn. Directives **stack**, so
their reward multipliers compound: a bigger gamble pays out more. Your selection is remembered
across runs and shown on the start screen and HUD.

### 🏅 Commendations
Permanent **milestone awards** earned by hitting thresholds in a single run (survive 10 minutes,
1,000 points of score, level 20, a 3-boss run, 60 reactions…) or across your whole career
(1,000 kills, 10 bosses, unlock every ship, finish with 4 Directives…). Each pays a one-time
**Stardust bounty** and pops a toast when unlocked. Track them all in the Hangar's **Codex** tab.

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
| Halo Launcher      | **Corona Burst**    | Split Barrel ×2 (+projectiles)   |
| Arc Whip           | **Rift Reaver**     | Vampiric Circuit (lifesteal)     |

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
(`index.html` and `sw.js` are always revalidated, so a new build ships immediately).

---

## 📱 PWA / offline

The game registers a service worker (`sw.js`) and ships a web manifest, so it's installable
and **playable offline** after the first load.

Updates can't get stuck on a stale cache: `tools/build.mjs` stamps the service worker with a
content hash of the build, so every deploy uses a brand-new cache and the old one is deleted
on activation. The worker serves navigations network-first and other assets
stale-while-revalidate, and open tabs reload once automatically when the new worker takes
control — so players always end up on the latest optimized version.

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
    storage.js        #   high scores, settings, Stardust & unlocks (localStorage)
  game/               # The game itself
    config.js         #   tuning constants + difficulty curves (pure)
    elements.js       #   Resonance elements & reactions (pure)
    weapons.js        #   weapon arsenal, evolutions & firing (pure)
    upgrades.js       #   level-up draft: weapons, evolves & items (pure)
    meta.js           #   permanent Ascension upgrades & Stardust (pure)
    ships.js          #   playable starfighter catalogue (pure)
    modifiers.js      #   Directives: opt-in challenge modifiers (pure)
    achievements.js   #   Commendations: milestone awards (pure)
    enemies.js        #   enemy/boss definitions & behaviors
    player.js         #   the ship: movement, arsenal firing, dash, overdrive
    world.js          #   simulation + rendering orchestrator
    background.js     #   parallax starfield & nebula
tools/                # Zero-dep dev server, build, and check scripts
tests/                # Unit tests for the pure game logic
```

The modules in `engine/utils.js` and the `game/` data modules (`config`, `elements`,
`weapons`, `upgrades`, `meta`, `ships`, `modifiers`, `achievements`, `enemies`) are
intentionally **DOM-free and pure**, which keeps the core game logic unit-testable in plain
Node.

---

## 🧪 Testing

- **Unit tests** (`npm test`) cover the deterministic logic: RNG determinism, difficulty
  scaling, XP curves, elemental reactions, the weapon arsenal (defs, leveling, evolutions),
  the level-up draft (weapons, evolves, items, reroll/banish gating), the meta-progression
  (Ascension costs, bonus aggregation, Stardust rewards), the starfighter catalogue, the
  Directives (difficulty/economy folding) and the Commendations (threshold checks).
- The rendering/input layers are verified by running the game in a real browser.

---

## 📜 License

No license file ships with this repository yet. If you'd like to reuse or distribute the
code, please check with the repository owner ([@Festas](https://github.com/Festas)) first.

Made with love among the stars. 🛸
