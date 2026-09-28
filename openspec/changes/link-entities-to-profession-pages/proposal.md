## Why

Gathering resources link to Fishing when appropriate, but their Herbalism, Mining, and Radiant Seeker relationships are missing. Crafted item pages show producing recipes without a route to the profession that uses each recipe.

## What Changes

- Link plant, mineral, and Radiant Spark resource pages to their profession pages beside the existing Fishing link.
- Link crafted item pages to Alchemy, Scroll Mastery, or Cooking from the producing recipe type and station. Do not label ordinary crafting as a profession.
- Preserve the existing recipe, map, and inline entity navigation.

## Capabilities

### New Capabilities

- `entity-profession-links`: Contextual navigation from gathering resources and crafted items to applicable profession pages.

### Modified Capabilities

None.

## Impact

`website/src/routes/gather-items/[id]/`, `website/src/routes/items/[id]/`, and their recipe-source query data. Browser and database-backed checks cover each recipe category, multi-recipe outputs, and items without a profession.
