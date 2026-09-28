## Why

Mining, Radiant Seeker, and Slayer have migrated, but Slayer hides 123 of 143 targets in static HTML. Fishing still uses dense card stacks, and the other nine routes use older layouts. The exported count and reward data also block trustworthy completion and inventory views.

## What Changes

- Restore every Slayer target to static HTML while keeping the hydrated table compact.
- Reduce Fishing's framing without losing its timing, probability, and recipe facts. Review it with Mining, Radiant Seeker, and Slayer before migrating the remaining nine routes.
- Migrate Adventuring, Alchemy, Cooking, Exploring, Herbalism, Hunter, Lore Keeping, Scroll Mastery, and Treasure Hunter.
- Repair profession denominators, missing gathering rewards, and crafting-station classification at their sources. Remove the Exploring count override.
- Finish related-profession navigation, index payoffs, SEO, responsive behavior, no-JavaScript access, and cited mechanics checks.
- Repair the dense Combat and Inventory mechanics pages only where their shared presentation needs the same patterns. Leave unrelated entity detail links to `link-entities-to-profession-pages`.

## Capabilities

### New Capabilities

- `profession-pages`: The remaining profession content, completeness, accessibility, and cross-page behavior beyond the shipped requirements in `specify-profession-pages`.

### Modified Capabilities

None.

## Impact

The thirteen profession routes and index, `DataTable`, profession metadata/export and pipeline, map entity navigation, SEO, and the related mechanics pages. Validation includes page-data checks, generated HTML, and browser review at 1440×900 and 390×844.
