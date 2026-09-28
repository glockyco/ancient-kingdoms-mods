## Context

The gathering loader passes `is_plant`, `is_mineral`, `is_fishing_spot`, and `is_radiant_spark` to the page (`website/src/routes/gather-items/[id]/+page.server.ts:122-133`). Its header currently renders only Fishing (`+page.svelte:533-552`). Item details already load `sources.recipes` (`website/src/routes/items/[id]/+page.server.ts:105-107`), and each recipe source has `recipe_type` and `station_type` (`website/src/lib/server/item-sources.ts:178-208`; `website/src/lib/types/item-sources.ts:124-131`). Item pages already link Fishing equipment and fish (`website/src/routes/items/[id]/+page.svelte:390-410`).

## Goals / Non-Goals

**Goals:** Use existing source classifications, retain normal recipe navigation, and show only professions supported by actual recipe sources.

**Non-Goals:** A fictional general Crafting profession, a global relationship registry, changes to ingredient-to-recipe navigation, or changing the profession pages themselves.

## Decisions

### Render contextual links beside existing badges

Follow the resource's Fishing conditional and the item's Fishing link. Choose each resource profession directly from its flags; flags may overlap, so do not make the mapping exclusive without evidence. Keep links in static markup. Four typed link components already establish the inline contextual-link style (`ItemLink`, `MechanicsLink`, `FactionLink`, `MapLink`); do not invent a new global component for three badges.

### Derive crafted-item professions from producing recipes, not item type

`getRecipeSources` already returns recipe type and station. Use `alchemy` → Alchemy, `scribing` → Scroll Mastery, and `crafting` with `station_type === 'cooking'` → Cooking. Deduplicate professions if more than one recipe creates the item. An item named like a food does not establish how it was made. Plain crafting has no named profession route among the thirteen (`website/src/routes/professions/+page.svelte:97-165`), so no general Crafting badge appears. This absence is deliberate, not a fallback to an arbitrary profession. Non-cooking station classification remains a separate source-data repair in `complete-profession-page-system`.

### Preserve existing relationships

The item page's producing-recipe actions remain at `website/src/routes/items/[id]/+page.svelte:1317-1322,1979-1983`. Gathering resources retain their map action at `website/src/routes/gather-items/[id]/+page.svelte:536-537`. Item-to-producing-recipe and zone-to-monster/NPC navigation already exists; ingredient-to-recipe is reachable via the ingredient's item page. Do not add unrelated direct links or a new navigation style.

## Risks / Trade-offs

- [Some items have multiple recipe sources] → Deduplicate only the profession destination, not the recipe-source list.
- [Station type is `unknown` for non-cooking exports today] → Link Cooking only for a confirmed cooking station; do not infer it from the item label.
- [Flags can coexist] → Show each applicable resource profession and verify the resulting header wraps at mobile width.

## Migration Plan

Add badges from the existing data, exercise one resource per flag and one output per recipe type, then check item and resource headers at 1440×900 and 390×844. Verify an ordinary crafting-only item displays no invented badge. No persistent data migration is needed.
