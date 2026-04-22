// Weapon Evolution System
//
// Drives Vampire-Survivors-style "synergy" evolutions: when a player has
// maxed a base weapon and also owns the matching passive item, the next
// level-up screen offers an evolved weapon that replaces the base.
//
// The system is intentionally data-driven: it reads recipes from
// EVOLUTION_RECIPES in js/config.js and weapon classes from
// js/weapons/weaponSystem.js. Adding a new evolution requires no changes
// here — just register a recipe and a class.
import { EVOLUTION_RECIPES, PASSIVE_ITEMS } from '../config.js';
import { WEAPON_TYPES, createWeapon } from '../weapons/weaponSystem.js';

export class WeaponEvolutionSystem {
    constructor(recipes = EVOLUTION_RECIPES) {
        this.recipes = recipes;
    }

    /**
     * Returns true if the player currently meets every condition of `recipe`:
     *   - owns the base weapon at max level
     *   - owns the required passive item
     *   - has not already evolved this recipe (i.e. the evolved weapon
     *     isn't already in their inventory)
     */
    isRecipeAvailable(player, recipe) {
        if (!player || !recipe) return false;
        const weapons = player.weapons || [];
        const passives = player.passives || [];

        const baseWeapon = weapons.find(w => w && w.type === recipe.baseWeapon);
        if (!baseWeapon || !baseWeapon.isMaxLevel || !baseWeapon.isMaxLevel()) {
            return false;
        }
        if (!passives.includes(recipe.requiredItem)) {
            return false;
        }
        if (weapons.some(w => w && w.type === recipe.evolvedWeapon)) {
            return false;
        }
        return true;
    }

    /**
     * Returns every recipe currently available to the player. Useful when
     * the level-up UI wants to show all eligible evolutions, not just one.
     */
    getAvailableRecipes(player) {
        return Object.values(this.recipes).filter(r => this.isRecipeAvailable(player, r));
    }

    /**
     * Convenience: pick the first available recipe (or null). Most level-up
     * screens only need to surface a single evolution at a time.
     */
    findEvolutionFor(player) {
        const available = this.getAvailableRecipes(player);
        return available.length > 0 ? available[0] : null;
    }

    /**
     * Replace the base weapon with its evolved counterpart in
     * `player.weapons`. No-op if the recipe is not currently available
     * (guards against double-evolving from a stale UI choice).
     *
     * Returns the new evolved Weapon instance, or null if nothing changed.
     */
    evolveWeapon(player, recipe) {
        if (!this.isRecipeAvailable(player, recipe)) {
            return null;
        }

        const weapons = player.weapons;
        const baseIndex = weapons.findIndex(w => w && w.type === recipe.baseWeapon);
        if (baseIndex === -1) return null;

        const evolvedWeapon = createWeapon(recipe.evolvedWeapon);
        weapons[baseIndex] = evolvedWeapon;
        return evolvedWeapon;
    }

    /**
     * Build a level-up choice descriptor for the first available evolution,
     * matching the shape used by the rest of the level-up UI:
     *   { id, name, desc, type: 'evolution', apply(player) }
     *
     * The level-up screen can mix this into its candidate list. Returning
     * null means "no evolution to offer right now".
     */
    buildLevelUpChoice(player) {
        const recipe = this.findEvolutionFor(player);
        if (!recipe) return null;

        const evolvedConfig = WEAPON_TYPES[recipe.evolvedWeapon];
        const passive = PASSIVE_ITEMS[recipe.requiredItem];
        const baseConfig = WEAPON_TYPES[recipe.baseWeapon];
        const passiveLabel = passive ? passive.name : recipe.requiredItem;
        const baseLabel = baseConfig ? baseConfig.name : recipe.baseWeapon;

        return {
            id: `evolution_${recipe.id}`,
            name: `🌟 ${evolvedConfig.name}`,
            desc: `EVOLUTION! ${baseLabel} + ${passiveLabel} → ${evolvedConfig.name}. ${evolvedConfig.description}`,
            type: 'evolution',
            recipeId: recipe.id,
            apply: (p) => this.evolveWeapon(p, recipe),
        };
    }
}
