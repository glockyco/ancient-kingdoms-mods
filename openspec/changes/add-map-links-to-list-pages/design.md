## Context

`MapLink` already builds entity-selection URLs (`website/src/lib/components/MapLink.svelte:18-23`). Chest and trap lists guard links with two coordinate checks (`website/src/routes/chests/+page.svelte:213-218`, `website/src/routes/traps/+page.svelte:174-179`). Slayer and Mining already render compact links (`website/src/routes/professions/slayer/+page.svelte:249-253`, `website/src/routes/professions/mining/+page.svelte:391-394`). Seven requested list surfaces lack that action.

## Goals / Non-Goals

**Goals:** Give every requested mapped list row a direct action. Keep the map's selection resolver and URL contract authoritative.

**Non-Goals:** Change map markers, coordinates, search ranking, or existing compact links. Zone resource rows have no position in their loader (`website/src/routes/zones/[id]/+page.server.ts:225-244`) and are not part of the position-backed zone-row extension. Sub-zone triggers are a separate spatial type.

## Decisions

1. Use `MapLink` rather than duplicate URL assembly. It emits an entity URL, and the map restores that selection and fits available bounds (`website/src/routes/map/+page.svelte:795-805`, `website/src/lib/map/resolve-selection.ts:86-105`). Do not pass row coordinates as URL parameters. This keeps multi-spawn entities visible instead of jumping to an arbitrary spawn.
2. Add a consistent compact location action to seven missing surfaces: the five entity overviews plus Hunter and Herbalism. Chests, traps, Slayer, and Mining already have links. For physical entities, project or query coordinate availability with published list data before rendering. Both horizontal coordinates must exist; use the existing non-link dash for absent positions. Monster map resolution can display an altar-only monster without a direct spawn (`website/src/lib/map/resolve-selection.ts:179-218`), but that is not a mapped position; do not promise a map location for every monster.
3. Quest locations are indirect. The map's quest resolver uses NPC giver and turn-in relations (`website/src/lib/map/resolve-selection.ts:152-164,503-523`), while the overview stores only one giver (`website/src/routes/quests/+page.server.ts:11-44,84-97`). Derive link availability from the same relations and NPC coordinates rather than testing `quest_giver_id` alone. A quest with no mapped related NPC gets a dash. Do not invent a quest coordinate.
4. Extend the position-backed zone tables together: monsters, altars, NPCs, chests, and traps already carry coordinates (`website/src/routes/zones/[id]/+page.server.ts:95-97,185-187,260-261,288-289,311-313`). Add location cells and guard links with both horizontal coordinates. Preserve all existing row cells and sorting. Do not add a zone-level link in place of an unmapped entity.

## Risks / Trade-offs

- [A source row has coordinates but the published map filters it out] → Compare representative links with actual map selections and redacted-zone rows in the browser. Keep list availability aligned with the map's published data.
- [New columns crowd mobile tables] → Use compact links and existing horizontal overflow; check both desktop and narrow viewports.
- [A quest has a turn-in NPC but no giver] → Query both relationship fields before deciding that its map action is unavailable.

## Migration Plan

No stored data or external URL changes. Add list-data availability and UI actions together; rollback removes those projections and cells without changing the map.
