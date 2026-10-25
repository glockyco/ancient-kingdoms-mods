## Why

Halloween and the Winter Festival change what players can get, where they hunt and how fast they level, but the compendium hides most of it. Earlier changes kept seasonal presentation off pages on purpose, and the code still carries that policy as scattered `season === "none"` filters. So the map shows no markers for seasonal shop items, repair merchants list no seasonal stock, and drops and quest rewards that exist only in a season read as year-round. The new Seasonal Events page reads its own raw SQL, and its layout and copy fall short of the site's standard. The owner has reversed the exclusion policy: seasonal content is presented, labeled and linked wherever a player would look for it.

## What Changes

- The export records seasons as data. Monsters and NPCs carry a `season` instead of the unrelated `is_halloween` and `is_christmas_npc` booleans. Game config exports each season's Double XP buff skill and shop items. **BREAKING** for the export format and the database schema: the two boolean columns are removed in a clean cutover, and a fresh export session is required.
- The pipeline publishes a `seasons` table and derives which items can only be obtained through seasonal content. Zone level ranges and medians exclude seasonal spawns.
- The shared acquisition reader models a season as a typed `season_active` world condition on seasonal vendor offers, Halloween monster spawns and Winter Festival NPC placements. One shared projection answers "which seasons gate this method or item" for every consumer. All `season === "none"` filters and `mapMethodIsVisible` are deleted.
- The map shows seasonal providers with their season. Item popups gain seasonal shop and pack rows, monster and NPC popups and tooltips state the season, and repair-merchant popups list seasonal stock.
- Item, NPC, monster, quest, skill and zone pages and their meta descriptions state seasonal conditions. Repair merchants show their seasonal stock. Quest pages state the 8-hour repeat. Event buff skill pages say how the buff is granted. NPC pages show quests completed there, which also fixes the hidden turn-ins of 23 NPCs.
- Item, monster, NPC and quest lists label seasonal entries and can filter by season. Search finds seasonal entities by season name and offers seasonal filtered lists.
- The Seasonal Events page is rebuilt around player questions: dates, Double XP, where to hunt by level, what each currency buys and what each treat does. It reads the shared projection instead of raw SQL.
- The reader-facing copy rules gain requirements for stating seasonal conditions and for concrete, player-first wording.

## Capabilities

### New Capabilities

- `seasonal-content`: Season identity and dates, which entities and methods a season gates, the season's player-facing presentation across surfaces, zone statistics policy, and the Seasonal Events page.

### Modified Capabilities

- `item-acquisition`: Seasonal conditions are canonical method conditions and are presented rather than excluded. Replaces the restricted-page scenario that permitted exclusion.
- `game-requirements`: A season predicate preserves the game's UTC date windows, including the year-end wrap, and is never proven by a browser clock.
- `map-item-popup-sources`: Seasonal shop offers and pack contents become popup source lists. Seasonal providers are eligible focus geometry.
- `interactive-map-navigation`: Monster, NPC and quest popups state seasonal availability.
- `global-search`: Seasonal entities are found by season name, and the index contains one filtered list per season for monsters, NPCs, quests and items.
- `game-data-export`: Season definitions and actor seasons are exported from game data, independent of the season active during the export.
- `reader-facing-copy`: Seasonal conditions are stated wherever a gated entity appears, and copy leads with the player's outcome in concrete terms.

## Impact

- Exporter: `mods/DataExporter` monster, NPC and game-config exporters and models. A fresh export session with the game running.
- Pipeline: `build-pipeline/schema.sql`, `models.py`, loaders, `denormalizers/acquisition.py`, `denormalizers/zones/levels.py`, `denormalizers/search/keywords.py`, redaction references, tests.
- Website: `lib/acquisition` (conditions, assemble, projections, fingerprint), `lib/server` source, usage, summary, obtainability and meta-description readers, `lib/map` and `lib/queries/popup.ts`, `map.server.ts`, map components, item, NPC, monster, quest, skill and zone routes and lists, search documents and judged queries, `lib/data/seasonal-events.ts`, the Seasonal Events route, sitemap fingerprints.
- Overlaps active changes `complete-map-registry-ownership` (popup dispatch and decorations) and `consolidate-website-design-system` (text floor, primitives). This change keeps seasonal markers in their existing marker groups and follows the 14 px text floor.
