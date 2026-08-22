## Why

"Excluded zone" currently means three different things in three places, and two zones with opposite requirements share the same list.

- `redactions.toml` `[monsters.exclude].zone_ids` deletes monster spawns and orphaned monsters.
- `build-pipeline/src/compendium/denormalizers/exclusions.py:19` hardcodes `["temple_of_valaark", "old_valorath"]` and nulls coordinates.
- `website/src/lib/constants/constants.ts:5` hardcodes the same pair and hides map layers and the zone-focus dropdown.

Temple of Valaark is **released**, and the game deliberately withholds positional information inside it. `UIMap.cs:138-153` closes the live map, substitutes a static illustration, and disables the player marker. `TravelItem.cs:17-21` refuses teleport items there. `Player.cs:5464-5468` returns the player to their bind point. So its entities must stay published and its geometry must not, because publishing coordinates would supply exactly what the game denies. Old Valorath is **unreleased** and has no such special case in the scripts, so everything actually related to it must go. One shared list cannot express both, and the released-zone policy is the one currently applied to the unreleased zone.

The consequences are measurable in the published output:

- 20 tables carry a zone reference, and the coordinate-suppression pass handles 11. The 9 unhandled ones — `houses`, `luck_tokens`, `scribing_tables`, `summon_triggers`, `quests` (4 columns), `items` (`travel_zone_id`, `luck_token_zone_id`), `item_zones_obtainable`, `item_zones_usable`, `zones` — are empty for Old Valorath today only because the zone is early in development.
- Removing 39 monster spawns and 4 orphaned monsters leaves their dependents published: `drassari_lance` with zero sources, and 7 skills (`earth_circle`, `earthen_spines`, `crippling_dust`, `summon_earth_elemental`, `chaotic_bolt`, `spear_strike`, `plague_infection`) with no monster, item, pet, or class that uses them.
- Deleting a database row does not unpublish the entity. `drassari_lance` is absent from `compendium.db` and still present in `website/static/images/items/drassari_lance/` and in `search.db`.
- The map draws no line into the zone, but the inbound portal marker names the destination. Its popup reads `Destination: Old Valorath` as a link, the map search returns the zone, the portal, and two items, and `zones/old_valorath.html` is prerendered and served.
- 17 columns embed entity identifiers inside JSON. Only `monsters.drops` is ever scrubbed, and only on the `ignore_journal` path. Two of them, `quests.finish_quest_locations` and `quests.objectives`, embed zone identifiers — one numeric, one string — alongside positions, so they can leak past both mechanisms.

## What Changes

- Split the single notion of exclusion into two independent, separately configured mechanisms, each accepting an arbitrary set of zones:
  - **position suppression** keeps every entity and removes geometry, for released zones in which the game withholds positional information from the player.
  - **unreleased-zone exclusion** removes everything actually related to the zone.
- Derive the affected columns from the database schema instead of hardcoded table lists, so a new entity type is covered when it appears.
- Resolve sub-zone references to their parent zone, and handle identifiers embedded in JSON in both the numeric and string zone-identifier spaces.
- Remove dependents by iterating to a fixpoint rather than a single pass, deciding reachability across every reference kind rather than monster drops alone.
- Extend removal to every publish surface: the compendium database, the search index, published images, and prerendered pages including the map payload.
- Keep boundary references intact but scrubbed: the inbound portal survives with its requirements, and its destination identity, name, and coordinates are cleared.
- Accept an explicit list of manually excluded identifiers for unreleased content that has no reference edges at all.
- Fail the build when any reference to excluded content survives.
- Record every redaction decision and its reason in a committed `redactions.lock.json`, verified by `compendium redactions check` and explained per entity by `compendium redactions explain`, following the existing `citations.lock.json` pattern.
- Route every configured removal through that one mechanism. `[quests.exclude]` names entities for removal, which `[entities.exclude]` already does for quests among other kinds, so the duplicate key and its hand-written cascade are removed. Hidden crafting keeps its own meaning, because it removes recipes and keeps the item, and it reports what it removed to the ledger.
- **BREAKING** for consumers of the published data: `old_valorath` and its dependents disappear from the database, the search index, the image set, and the prerendered pages.
- **BREAKING** for the configuration: `[quests.exclude].ids` is replaced by `[entities.exclude].ids`.

## Capabilities

### New Capabilities

- `compendium-redaction`: How configured redactions remove or suppress content in the published compendium, which references they follow, and which publish surfaces they cover.

### Modified Capabilities

None.

## Impact

- **Pipeline:** `build-pipeline/src/compendium/denormalizers/exclusions.py`, `denormalizers/__init__.py`, `redaction.py`, and the search and image publishing steps.
- **Configuration:** `redactions.toml` gains the two zone mechanisms and the manual identifier list. `[monsters.exclude].zone_ids` is replaced by the unreleased-zone mechanism.
- **New artifact and commands:** `redactions.lock.json` at the repository root, a `redactions` sub-app in `build-pipeline/src/compendium/cli.py`, a `check:redactions` script in the root `package.json`, and a `lefthook.yml` job.
- **Website:** `website/src/lib/constants/constants.ts` stops carrying an exclusion list, because excluded content is absent from the data rather than filtered at render time.
- **Published output:** `compendium.db`, `search.db`, `website/static/images/`, and prerendered pages.
- **Tests:** redaction tests covering both mechanisms, the fixpoint, the reference kinds, and the invariant.
- **Supersedes:** `redact-items-exclusive-to-excluded-monsters`, which specified one step of this cascade.
- **Not changed:** Content that only mentions the zone in prose. The five-quest Northern Wastes chain, `key_to_old_valorath`, `the_fall_of_valorath`, the `cursed_dagger` proc `curse_of_valorath`, and boss lore keep their published form, because none of them holds a reference edge to the zone.
