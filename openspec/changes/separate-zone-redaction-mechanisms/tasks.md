## 1. Establish the baseline

- [x] 1.1 Record the current published state so later steps can be compared against it: counts for `monsters`, `items`, `skills`, `zones`, `portals` in `compendium.db`, the row count of `search.db` `entities`, and the directory count under `website/static/images/`.
- [x] 1.2 Record the leaks this change must close: `drassari_lance` present in `search.db` and `website/static/images/items/`, the 7 skills `earth_circle`, `earthen_spines`, `crippling_dust`, `summon_earth_elemental`, `chaotic_bolt`, `spear_strike`, and `plague_infection` present in `skills`, the prerendered `zones/old_valorath.html`, and the map payload carrying `destinationZoneName: "Old Valorath"`.
- [x] 1.3 Record the content that must survive, and re-check it after every later step: the five Northern Wastes quests, `key_to_old_valorath`, `the_fall_of_valorath`, `cursed_dagger` with its `curse_of_valorath` proc, `ancient_drassari_totem`, and Earth Elemental with its three released zones.

## 2. Configuration

- [x] 2.1 Add the two zone mechanisms to `redactions.toml` with comments stating what each is for: position suppression listing `temple_of_valaark`, unreleased-zone exclusion listing `old_valorath`.
- [x] 2.2 Add the manual identifier list and list `old_valorath_token`, with a comment recording that it has no reference edge and cannot be derived.
- [x] 2.3 Extend `RedactionConfig` in `build-pipeline/src/compendium/redaction.py` to load all three, and remove `exclude_monster_zone_ids` together with its `[monsters.exclude]` section.
- [x] 2.4 Update the summary printed by `load_redactions` to report each mechanism separately.

## 3. Reference discovery

- [x] 3.1 Implement discovery of zone-reference columns by inspecting the schema, returning for each table the columns that reference a zone and the columns that reference a sub-zone.
- [x] 3.2 Resolve sub-zone references to their parent zone through the sub-zone table, so a row naming only a sub-zone is attributed to the right zone.
- [x] 3.3 Declare the JSON carriers that hold zone identifiers, covering both spaces: string identifiers as in `quests.objectives` and numeric identifiers as in `quests.finish_quest_locations`.
- [x] 3.4 Declare the JSON carriers that hold entity identifiers, covering the 17 columns that embed them, so the cascade can both read and scrub them.
- [x] 3.5 Assert in tests that discovery finds all 20 zone-referencing tables in the current schema, and that it reports the columns it selected.

## 4. Position suppression

- [x] 4.1 Rewrite the coordinate pass in `build-pipeline/src/compendium/denormalizers/exclusions.py` to take its zones from configuration and its columns from discovery, deleting the hardcoded `EXCLUDED_ZONE_IDS` and `SPAWN_TABLES`.
- [x] 4.2 Null geometry embedded in JSON values for suppressed zones, including positions inside `quests.objectives` and `quests.finish_quest_locations`.
- [x] 4.3 Confirm Temple of Valaark keeps all 345 monster spawns with no coordinates, and that its entity counts are unchanged from task 1.1.

## 5. Reference semantics

- [x] 5.1 Define one declaration per reference carrying `reaches` and `locus`, covering the discovered zone columns, the discovered entity reference columns, and the declared JSON carriers.
- [x] 5.2 Read direction from the declaration: a zone reference reaches backwards because a zone contains the row naming it, and an entity reference reaches forwards because an entity provides what it names.
- [x] 5.3 Declare the destination references `to_zone_id`, `teleport_zone_id`, and `travel_zone_id` as reaching nothing, so a boundary into redacted content does not make it reachable.
- [x] 5.4 Declare summoning as reaching: `skills.summoned_monster_id` and `summon_triggers.summoned_entity_id`. Two monsters, `cinderbone_skeleton` and `spectral_wolf`, have no spawn record and are reachable only this way.
- [x] 5.5 Replace the geometry governance map with the `locus` attribute, so position suppression stops keeping a second list over the same columns.
- [x] 5.6 Assert in tests that every discovered reference has exactly one declaration, so a schema addition fails the suite instead of being classified silently.

## 6. Unreleased-zone exclusion

- [x] 6.1 Build the reference graph from the declarations, with a node per row that can be reached and an edge per reaching reference.
- [x] 6.2 Compute reachability from every zone, and reachability from the zones that remain over a graph without the manually named entities and the `ignore_journal` items.
- [x] 6.3 Remove the difference between the two, together with the excluded zones and the named entities. Confirm no loop and no pass counter is needed.
- [x] 6.4 Confirm content reachable from nothing is in neither result and is never removed, using `gold`, a furniture item, and one published `draconium_*` item as the cases.
- [x] 6.5 Delete the rows of removed nodes, and clear references to them from rows that survive.
- [x] 6.6 Scrub references to removed entities out of JSON carriers on surviving rows, so no surviving value names a removed entity.
- [x] 6.7 Place the pass in `run_all()` after spawn inference and before item source denormalization, and record in a comment why that position is required.
- [x] 6.8 Record provenance from the closure: the mechanism, the reason, the distance from the zone it was reached through, and the referrers whose removal orphaned it. Take all of it from the walk rather than recomputing it.
- [x] 6.9 Report what was removed, grouped by mechanism and by kind.
- [x] 6.10 Confirm the outcome: `old_valorath`, the 4 monsters, `drassari_lance`, the 7 skills, and `old_valorath_token` are all absent, Earth Elemental is still present with its released-zone spawns, and every item in task 1.3 is still present.
- [x] 6.11 Confirm `shadows_over_old_valorath` survives on its givers `maeri_sunstripe` and `shavara_swiftclaw`, both of which spawn only in Northern Wastes.

## 7. Boundary scrubbing

- [x] 7.1 Clear destination identity, destination sub-zone, destination name, and destination coordinates on portals leading into an excluded zone, keeping the row and its requirements.
- [x] 7.2 Rebuild every string derived from a removed destination so none discloses it. The `portals` table stores no name, so this covers `portals.keywords`, which ends with the destination name, and the map payload fields `name` and `destinationSubZoneName`, which currently read `"Portal to Old Valorath"` and `"Upper Old Valorath"`.
- [x] 7.3 Confirm the inbound Northern Wastes portal is still published with its level, item level, and key requirements, and names no destination.

## 8. Publish surfaces

- [x] 8.1 Exclude removed entities from the search index build so `search.db` gains no entry for them, and confirm no entry remains for the zone, the portal destination, the removed items, or the removed skills.
- [x] 8.2 Stop publishing image files for removed entities, and remove stale directories from `website/static/images/` on rebuild so a previously published icon does not survive. The manifest that drives publishing is the `visual_assets` table, which holds a row per image with the entity id and its public path, so removing an entity SHALL remove its rows there.
- [x] 8.3 Confirm no page is prerendered for an excluded zone, that no connected-zone link points at one, and that the map payload carries no destination into one. The payload still contains the portal's own key, which keeps the zone name for the same reason `key_to_old_valorath` does.

## 9. Invariant check

- [x] 9.1 Implement a check that scans published values of any shape for identifiers of excluded zones and removed entities, and fails the build reporting table, column, and row. Match identifiers with `instr` rather than `LIKE`, because `_` is a single-character wildcard and `LIKE '%divine_essence%'` matches the prose "divine essence" in `gathering_resources.description`. Match on a whole identifier, because `key_to_old_valorath` and `shadows_over_old_valorath` both contain `old_valorath` and both survive.
- [x] 9.1a Run the check at the end of denormalization rather than straight after the cascade. No denormalizer reads the export, but they copy references between tables, and `item_sources_monster` is built from `monsters.drops` after the cascade has run.
- [x] 9.2a Extend the check across the published image set, scanning `website/static/images` after `reconcile` deletes the files it removes.
- [x] 9.2b Extend the check across `search.db` and the prerendered output. Both are built after `compendium build` exits, so the check needs the removed identifiers from the ledger in group 10.
- [x] 9.3 Support recording an explicit, justified exemption, so an intentional match does not require weakening the check.
- [x] 9.3a Declare `summon_triggers.summoned_entity_id` once per target kind, reading `summoned_entity_type` to select the rows each declaration covers. No exemption is needed: the value resolves, and it names an NPC rather than a monster.
- [x] 9.4a Record that the JSON scrub is correct but unexercised: no surviving row in today's export names a removed entity inside a JSON value. Reachability cannot produce that case, because a dropped item is reachable. Only a manual exclusion or `ignore_journal` can, and `tests/test_embedded_scrub.py` covers it.
- [x] 9.4 Prove the check fires: temporarily skip one cascade step, confirm the build fails and names the surviving reference, then restore it.

## 10. Redaction ledger and reporting

- [x] 10.1 Write `redactions.lock.json` at the repository root from the recorded provenance: a snapshot header carrying the game version, an entry per removed entity giving mechanism, reason, pass, and the entities it followed, and a per-zone summary for position suppression. Model the file and its handling on `citations.lock.json`.
- [x] 10.2 Sort the ledger deterministically so an unchanged build produces a byte-identical file and a real change produces a readable diff.
- [x] 10.3 Add a `redactions` sub-app to `build-pipeline/src/compendium/cli.py` following the shape of the existing `citations` sub-app.
- [x] 10.4 Implement `redactions check`: recompute the redaction decisions, compare against the committed ledger, and exit non-zero listing entities that appeared or disappeared.
- [x] 10.5 Implement `redactions sync`: rewrite the ledger as a deliberate, reviewed step, never as a side effect of `build`.
- [x] 10.6 Implement `redactions explain <entity-id>`: print the reason chain for one entity, so "why is this missing from the site" is answerable without reading the pipeline.
- [x] 10.7 Add a `check:redactions` script to the root `package.json` next to `check:citations`, and register it in `lefthook.yml` with a glob covering `redactions.toml`, the redaction sources, and `redactions.lock.json`.
- [x] 10.7a Give the recomputation its own static directory. `load_visual_assets` and `load_achievements` copy image files into the directory they receive, so `redactions check` republished the icons that redaction had deleted.
- [x] 10.8 Commit the generated ledger and confirm it records the expected entries, including `item:drassari_lance` reached through the two Drassar monsters and `item:old_valorath_token` as a manual exclusion.

## 11. Website cleanup

- [x] 11.1 Remove `EXCLUDED_ZONE_IDS` from `website/src/lib/constants/constants.ts` and its uses in `map.server.ts` and `layers.ts`, after confirming excluded content is absent from the data. The zone focus query now asks for a zone the map can focus on, which is one holding bounds, because an unreleased zone has no row and a suppressed zone has no geometry. The sub-zone filter is deleted outright: `loadZoneTriggersServer` already drops a trigger without bounds.
- [x] 11.2 Confirm in a browser that the map renders Temple of Valaark as before, that Northern Wastes shows the gated portal with no destination, and that searching the map for "Valorath" returns only content that legitimately survives. Verified: the map renders with no page error and no console error, 24 of 25 zones are focusable with Temple of Valaark absent as before, its 345 monster spawns stay published with no coordinates, 114 portals draw a destination line and the gated one is among the 4 that do not, and the search returns only `key_to_old_valorath`, `the_fall_of_valorath`, and `shadows_over_old_valorath`.

## 12. Consolidate every mechanism into the model

- [ ] 12.1 Move the two quest identifiers from `[quests.exclude].ids` to `[entities.exclude].ids`, and confirm the closure removes both. The manual seed already searches the quests table.
- [ ] 12.2 Delete `_apply_quest_exclusions` and the `exclude_quest_ids` field. Confirm no reference to a removed quest survives, and note that `npcs.quests_offered` is rebuilt by a later denormalizer rather than scrubbed.
- [ ] 12.3 Prove the ledger now records both quests with a mechanism and a reason, and that `redactions explain the_lost_warden` answers.
- [ ] 12.4 Report what hidden crafting removed to the ledger, per item, in the way position suppression reports per zone.
- [ ] 12.5 Extend the verification subject to cover every mechanism, so an identifier removed outside the closure is scanned for. Prove it by planting a surviving reference to an excluded quest.
- [ ] 12.6 Move position suppression into the redaction package as `geometry.py`, and hidden crafting as `sources.py`. The module named `exclusions` implements suppression today, which is the name of the other mechanism.
- [ ] 12.7 Rename `compendium/redaction.py` to `redactions/config.py`, so the configuration no longer sits one letter from the package it configures.
- [ ] 12.8 Update `redactions.toml` comments and `build-pipeline/CLAUDE.md` for the removed key and the moved modules.

## 13. Tests

- [ ] 13.1 Restore the shared-source case that `test_monster_redactions.py` held before it was deleted: an entity that spawns in both an excluded zone and a published zone keeps its published spawns and stays published. Nothing covers this today, and it is the behaviour that keeps Earth Elemental on the site.
- [ ] 13.2 Add a test that proves removal follows references beyond one step, and one that proves content reachable from nothing is untouched.
- [ ] 13.3 Add a reachability test per reference kind, including the case that a skill used only as a weapon proc survives when no monster uses it, and the case that a monster with no spawn record survives on its summoner.
- [ ] 13.4 Add a test that prose naming an excluded zone does not cause removal.
- [x] 13.5 Add a test that the invariant check fails on a planted surviving reference.

## 14. Close out

- [ ] 14.1 Run `cd build-pipeline && uv run pytest`, `uv run mypy .`, and `uv run ruff check`.
- [ ] 14.2 Rebuild end to end with `uv run compendium build` and the website build, and compare against the task 1.1 baseline, explaining every count that moved.
- [ ] 14.3 Run `pnpm check:redactions` and confirm the committed ledger matches the rebuild.
- [ ] 14.4 Update `build-pipeline/CLAUDE.md`, whose Redaction System section lists only the three old keys and does not mention the ledger.
