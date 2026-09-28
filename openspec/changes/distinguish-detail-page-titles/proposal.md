## Why

In the measured prerender, 402 pages share a title with another page. The earlier item suffixes were removed because some labels described the wrong equipment, so adding them back unchanged would replace one defect with another.

## What Changes

- Give every indexable page a unique, truthful title, with useful family context before a stable identity fallback.
- Keep the entity name first when possible and keep the ` - Ancient Kingdoms` brand suffix.
- Check every prerendered indexable title for collisions, misleading labels, and excessive avoidable length.
- Keep description-content improvements outside this title change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `page-metadata`: Require truthful, unique titles across all indexable pages and a measured build gate.

## Impact

Title generation and callers in `website/src/lib/server/meta-description.ts`, detail route loaders and Svelte pages, shared pet rendering, and prerender verification change. The collision gate checks output, not just individual generator functions.
