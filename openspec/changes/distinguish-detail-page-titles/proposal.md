## Why

In the measured prerender, 402 pages share a title with another page. The earlier item suffixes were removed because some labels described the wrong equipment, so adding them back unchanged would replace one defect with another.

Armor-set reference entries also expose internal names such as `Cinderchant Armor Bonus Set` instead of their set names. Normalize those display names in the pipeline so headings, navigation, search and titles identify the same set.

## What Changes

- Give every indexable page a unique, truthful title, with useful family context before a stable identity fallback.
- Keep the entity name first when possible and keep the ` - Ancient Kingdoms` brand suffix.
- After verifying the game-facing name through source and an in-game HotRepl check, name armor-set reference items from their player-facing set name in one pipeline location. Preserve their stable IDs and `Armor Set` type.
- Check every prerendered indexable title for collisions, misleading labels, and excessive avoidable length.
- Keep description-content improvements outside this title change. Existing descriptions may inherit the normalized entity name, but their structure and content policy do not change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `page-metadata`: Require truthful, unique titles across all indexable pages, one player-facing identity for armor-set entries, and a measured build gate that includes their renamed pages.

## Impact

Title generation and callers in `website/src/lib/server/meta-description.ts`, detail route loaders and Svelte pages, shared pet rendering, item display-name denormalization in the pipeline, generated search/list consumers, and prerender verification change. The collision gate checks output, including renamed armor-set entries, not just individual generator functions. Armor-set names are not replaced independently in each website consumer.
