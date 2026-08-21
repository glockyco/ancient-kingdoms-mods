## 1. Establish the baseline

- [ ] 1.1 Record the current published state so later steps can be compared against it: counts for `monsters`, `items`, `skills`, `zones`, `portals` in `compendium.db`, the row count of `search.db` `entities`, and the directory count under `website/static/images/`.
- [ ] 1.2 Record the leaks this change must close: `drassari_lance` present in `search.db` and `website/static/images/items/`; the 7 skills `earth_circle`, `earthen_spines`, `crippling_dust`, `summon_earth_elemental`, `chaotic_bolt`, `spear_strike`, `plague_infection` present in `skills`; `zones/old_valorath.html` prerendered; the map payload carrying `destinationZoneName: "Old Valorath"`.
- [ ] 1.3 Record the content that must survive, and re-check it after every later step: the five Northern Wastes quests, `key_to_old_valorath`, `the_fall_of_valorath`, `cursed_dagger` with its `curse_of_valorath` proc, `ancient_drassari_totem`, and Earth Elemental with its three released zones.

## 2. Configuration

- [ ] 2.1 Add the two zone mechanisms to `redactions.toml` with comments stating what each is for: position suppression listing `temple_of_valaark`, unreleased-zone exclusion listing `old_valorath`.
- [ ] 2.2 Add the manual identifier list and list `old_valorath_token`, with a comment recording that it has no reference edge and cannot be derived.
- [ ] 2.3 Extend `RedactionConfig` in `build-pipeline/src/compendium/redaction.py` to load all three, and remove `exclude_monster_zone_ids` together with its `[monsters.exclude]` section.
- [ ] 2.4 Update the summary printed by `load_redactions` to report each mechanism separately.

## 3. Reference discovery

- [ ] 3.1 Implement discovery of zone-reference columns by inspecting the schema, returning for each table the columns that reference a zone and the columns that reference a sub-zone.
- [ ] 3.2 Resolve sub-zone references to their parent zone through the sub-zone table, so a row naming only a sub-zone is attributed to the right zone.
- [ ] 3.3 Declare the JSON carriers that hold zone identifiers, covering both spaces: string identifiers as in `quests.objectives` and numeric identifiers as in `quests.finish_quest_locations`.
- [ ] 3.4 Declare the JSON carriers that hold entity identifiers, covering the 17 columns that embed them, so the cascade can both read and scrub them.
- [ ] 3.5 Assert in tests that discovery finds all 20 zone-referencing tables in the current schema, and that it reports the columns it selected.

## 4. Position suppression

- [ ] 4.1 Rewrite the coordinate pass in `build-pipeline/src/compendium/denormalizers/exclusions.py` to take its zones from configuration and its columns from discovery, deleting the hardcoded `EXCLUDED_ZONE_IDS` and `SPAWN_TABLES`.
- [ ] 4.2 Null geometry embedded in JSON values for suppressed zones, including positions inside `quests.objectives` and `quests.finish_quest_locations`.
- [ ] 4.3 Confirm Temple of Valaark keeps all 345 monster spawns with no coordinates, and that its entity counts are unchanged from task 1.1.

## 5. Unreleased-zone exclusion and cascade

- [ ] 5.1 Implement the row removal pass: delete every row that references an excluded zone through a discovered column, a resolved sub-zone, or a declared JSON carrier, and delete the zone row itself.
- [ ] 5.2 Implement the cascade as a loop that repeats until a pass removes nothing.
- [ ] 5.3 Implement reachability for monsters (spawns), items (every source kind plus JSON-embedded drop, reward, material, and container references), and skills (monster use, weapon proc, scroll, relic, potion and food buff, pet, class list).
- [ ] 5.4 Scrub references to removed entities out of JSON carriers on surviving rows, so no surviving value names a removed entity.
- [ ] 5.5 Apply the manual identifier list as cascade input, so manually excluded entities orphan their dependents like any other removal.
- [ ] 5.6 Place the pass in `run_all()` after spawn inference and before item source denormalization, and record in a comment why that position is required.
- [ ] 5.7 Report per pass what was removed and how many passes the cascade took.
- [ ] 5.8 Record provenance for every removal as the cascade runs: the mechanism that caused it, the reason, the pass number, and the already-removed entities it followed. Emit it from the loop rather than reconstructing it afterwards, because only the loop knows which removal orphaned what.
- [ ] 5.9 Confirm the outcome: `old_valorath` gone; the 4 monsters gone; `drassari_lance` gone; the 7 skills gone; `old_valorath_token` gone; Earth Elemental still present with its released-zone spawns; every item in task 1.3 still present.

## 6. Boundary scrubbing

- [ ] 6.1 Clear destination identity, destination sub-zone, destination name, and destination coordinates on portals leading into an excluded zone, keeping the row and its requirements.
- [ ] 6.2 Regenerate any display name derived from a removed destination so it no longer discloses it, covering `portals.name`, which currently reads `"Portal to Old Valorath"`.
- [ ] 6.3 Confirm the inbound Northern Wastes portal is still published with its level, item level, and key requirements, and names no destination.

## 7. Publish surfaces

- [ ] 7.1 Exclude removed entities from the search index build so `search.db` gains no entry for them, and confirm no entry remains for the zone, the portal destination, the removed items, or the removed skills.
- [ ] 7.2 Stop publishing image files for removed entities, and remove stale directories from `website/static/images/` on rebuild so a previously published icon does not survive.
- [ ] 7.3 Confirm no page is prerendered for an excluded zone, that no connected-zone link points at one, and that the map payload contains no excluded zone identifier or name.

## 8. Invariant check

- [ ] 8.1 Implement a post-cascade check that scans published values of any shape for identifiers of excluded zones and removed entities, and fails the build reporting table, column, and row.
- [ ] 8.2 Extend the check across `search.db`, the published image set, and the prerendered output.
- [ ] 8.3 Support recording an explicit, justified exemption, so an intentional match does not require weakening the check.
- [ ] 8.4 Prove the check fires: temporarily skip one cascade step, confirm the build fails and names the surviving reference, then restore it.

## 9. Redaction ledger and reporting

- [ ] 9.1 Write `redactions.lock.json` at the repository root from the recorded provenance: a snapshot header carrying the game version, an entry per removed entity giving mechanism, reason, pass, and the entities it followed, and a per-zone summary for position suppression. Model the file and its handling on `citations.lock.json`.
- [ ] 9.2 Sort the ledger deterministically so an unchanged build produces a byte-identical file and a real change produces a readable diff.
- [ ] 9.3 Add a `redactions` sub-app to `build-pipeline/src/compendium/cli.py` following the shape of the existing `citations` sub-app.
- [ ] 9.4 Implement `redactions check`: recompute the redaction decisions, compare against the committed ledger, and exit non-zero listing entities that appeared or disappeared.
- [ ] 9.5 Implement `redactions sync`: rewrite the ledger as a deliberate, reviewed step, never as a side effect of `build`.
- [ ] 9.6 Implement `redactions explain <entity-id>`: print the reason chain for one entity, so "why is this missing from the site" is answerable without reading the pipeline.
- [ ] 9.7 Add a `check:redactions` script to the root `package.json` next to `check:citations`, and register it in `lefthook.yml` with a glob covering `redactions.toml`, the redaction sources, and `redactions.lock.json`.
- [ ] 9.8 Commit the generated ledger and confirm it records the expected entries, including `item:drassari_lance` reached through the two Drassar monsters and `item:old_valorath_token` as a manual exclusion.

## 10. Website cleanup

- [ ] 10.1 Remove `EXCLUDED_ZONE_IDS` from `website/src/lib/constants/constants.ts` and its uses in `map.server.ts` and `layers.ts`, after confirming excluded content is absent from the data.
- [ ] 10.2 Confirm in a browser that the map renders Temple of Valaark as before, that Northern Wastes shows the gated portal with no destination, and that searching the map for "Valorath" returns only content that legitimately survives.

## 11. Tests

- [ ] 11.1 Rewrite `build-pipeline/tests/test_monster_redactions.py` for the two mechanisms, keeping the existing shared-source case that proves an entity with a surviving source is not removed.
- [ ] 11.2 Add a cascade test that proves depth beyond one step and that the loop terminates.
- [ ] 11.3 Add a reachability test per reference kind, including the case that a skill used only as a weapon proc survives when no monster uses it.
- [ ] 11.4 Add a test that prose naming an excluded zone does not cause removal.
- [ ] 11.5 Add a test that the invariant check fails on a planted surviving reference.

## 12. Close out

- [ ] 12.1 Run `cd build-pipeline && uv run pytest`, `uv run mypy .`, and `uv run ruff check`.
- [ ] 12.2 Rebuild end to end with `uv run compendium build` and the website build, and compare against the task 1.1 baseline, explaining every count that moved.
- [ ] 12.3 Run `pnpm check:redactions` and confirm the committed ledger matches the rebuild.
- [ ] 12.4 Update `build-pipeline/CLAUDE.md`, whose Redaction System section lists only the three old keys and does not mention the ledger.
