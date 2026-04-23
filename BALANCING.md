# Balance Pass — 2026-04

This document captures the rationale for the rebalance pass applied across
`main.js`. Numbers are concrete so future tuning is grounded in what
already exists.

> All changes are surgical — they touch the data tables (`CHARACTERS`,
> `BOSS_TYPES`, `PASSIVE_ABILITIES`, `TRANSFORMATIVE_ITEMS`, `CONFIG.DIFFICULTY`)
> and three numeric formulas in `Player.takeDamage` and `Enemy` constructor.
> No mechanics were removed.

---

## 1. Armor formula — make tanks actually tanky

**Before:** `finalDamage = amount × 100 / (100 + armor)`
- 6 armor (Tank) → **5.7%** reduction
- 10 armor (Juggernaut) → **9.1%** reduction
- 20 armor → 16.7% reduction

This is below the noise floor. "Armor" was a stat name without an effect.

**After:** `armorReduction = min(0.60, armor / (armor + 30))`
- 8 armor (new Tank) → **21%** reduction
- 14 armor (new Juggernaut) → **32%** reduction
- 20 armor → 40% reduction
- 30 armor → 50% reduction
- 60+ armor capped at **60%** so even max-stack builds can still die

Diminishing returns curve, hard cap, but the breakpoints feel like an actual
tradeoff now.

## 2. Late-wave enemy scaling — kill the runaway

The old curves used `wave^1.3` for HP and `wave^1.1 × 0.3` for damage on top
of a linear term. Past wave 25 this turned every encounter into one-shots
vs. HP sponges.

| Wave | HP (old) | HP (new) | DMG (old) | DMG (new) |
|----:|----:|----:|----:|----:|
| 5   | 38  | 41  | 11.7 | 9.9  |
| 10  | 65  | 68  | 19.9 | 16.6 |
| 20  | 120 | 124 | 36.7 | 30.5 |
| 30  | 181 | 182 | 52.7 | 40.4 |
| 50  | 342 | 300 | 86.0 | 64.0 |

Net effect: identical or slightly tougher up to wave 20, materially fairer
past wave 30. Boss block uses the same new formulas.

## 3. Boss rewards — actual jackpots

Old credit values made 5 trash mobs pay more than a boss. Doubled across
the board:

| Boss        | Credits old → new | XP old → new | Health-mult old → new |
|-------------|------------------:|-------------:|----------------------:|
| Destroyer   | 100 → **200**     | 50 → **80**  | 12 → 9               |
| Brood Mother| 120 → **240**     | 60 → **100** | 10 → 8               |
| Void Walker | 150 → **280**     | 70 → **120** | 8 → 7                |
| Necromancer | 180 → **320**     | 80 → **140** | 11 → 8               |
| Titan       | 200 → **400**     | 100 → **180**| 16 → 12              |
| Hivemind    | 220 → **380**     | 90 → **160** | 14 → 11              |
| Leviathan   | 280 → **480**     | 120 → **200**| 20 → 14              |

Boss HP multipliers come down to compensate for the now-steeper linear
component (`wave × 4` instead of `wave × 3`). End result: bosses cost
roughly the same effective time-to-kill at wave 10–20, less past wave 30.

## 4. Enemy speed — stop outrunning the player

`fast` (Stalker) at wave 30 used to hit speed `1.5 × (1 + log2(1 + 9)) ≈ 6.5`,
vs. base player speed `3`. Unwinnable kiting.

Reduced scaling exponent: `log2(1 + wave × 0.18)`.
Wave 30 Stalker now ≈ `1.5 × 3.68 = 5.5`. Still scary, no longer
mathematically uncatchable for non-dash characters.

## 5. Enemy count — render-budget sanity

Old `wave^1.2` produced 220+ enemies at wave 50. Trimmed to `wave^1.1`:

| Wave | Old | New |
|---:|---:|---:|
| 10 | 44  | 41  |
| 20 | 84  | 73  |
| 30 | 128 | 110 |
| 50 | 218 | 179 |

Same swarm feel, no slideshow.

## 6. Difficulty multipliers — less double-punishment

Now that `wave^1.3` is gone, the multiplicative `nightmare` 2.0× HP / 1.6×
DMG was overkill on top of the formula nerfs. Smoothed:

|              | enemyHP | enemyDMG | enemySpeed | credits | XP   |
|--------------|--------:|---------:|-----------:|--------:|-----:|
| Easy (unchanged) | 0.7  | 0.6 | 0.85 | 1.3  | 1.2  |
| Normal           | 1.0  | 1.0 | 1.0  | 1.0  | 1.0  |
| Hard old → new   | 1.4 → **1.3** | 1.3 → **1.25** | 1.1 → **1.08** | 0.85 → **0.9** | 0.9 → **0.95** |
| Nightmare o → n  | 2.0 → **1.7** | 1.6 → **1.45** | 1.2 → **1.18** | 0.7 → **0.75** | 0.8 → **0.85** |

Net: Hard/Nightmare roughly preserve their pre-rebalance challenge level
but no longer become unwinnable past wave 25.

## 7. Character roster — narrow the gap

Buffs to under-performers, light trims to outliers:

| Character   | Change                                              |
|-------------|-----------------------------------------------------|
| Balanced    | fireRate 30 → 32 (small trim — starts with 2 weapons) |
| Tank        | dmg 9 → 11, armor 6 → **8** (now ~21% reduction)    |
| Sniper      | fireRate 48 → **44** (slight DPS bump)              |
| Berserker   | dmg 16 → **14** (was overshooting glass-cannon role)|
| Engineer    | dmg 9 → 10, armor 7 → 8                              |
| Medic       | dmg 8 → 9, fireRate 34 → 32, regen 0.4 → **0.8**/s  |
| Summoner    | dmg 8 → 9, fireRate 42 → **38**                     |
| Juggernaut  | dmg 12 → 13, armor 10 → **14** (~32% reduction)     |
| Speedster, Vampire, Gunslinger, Assassin | unchanged — already in band |

DPS expectations after rebalance (no items):
- Speedster ~26.7 / Assassin ~32 (effective ~50 with crits) / Berserker ~30
- Sniper ~30 / Balanced ~37.5 (2-weapon) / Vampire ~19
- Tank ~17 / Engineer ~17 / Medic ~17 / Summoner ~14 (+drones)
- Juggernaut ~17

Gap between best and worst single-target DPS dropped from ~4× to ~2.4×,
with the laggards compensating via tankiness, sustain, or summons.

## 8. Passives — match the new formulas

| Passive       | Old → New                                       |
|---------------|--------------------------------------------------|
| Fortify       | +2 armor → **+3 armor** (matches new curve)     |
| Iron Skin     | +4 armor → **+5 armor**                         |
| Regeneration  | +0.3 HP/s → **+0.6 HP/s** (was a trap pick)     |

Glass Cannon, Quick Hands, Nimble, Vampirism, Eagle Eye, Thick Skin,
Bullet Storm, Scavenger, Adrenaline, Thorns — left alone (already in band).

## 9. What was deliberately NOT changed

- XP curve (`XP_BASE 10`, `XP_SCALING 1.15`) — already smooth.
- Powerup drop chances (15% normal, 80% boss) — felt right.
- Wave duration (60s) and clear countdown (5s).
- Weapon stat tables — weapons interact with so many items/evolutions
  that touching them risks invalidating the evolution build paths.
- Enemy type stat ratios (`ENEMY_TYPES`) — relative balance between mob
  archetypes is unchanged; only the wave scaling underneath them moved.
- Multiplayer scaling (`coopSettings.enemyScalePerPlayer`) — unchanged;
  4-player lobbies still get the multiplicative spawn count they had.
