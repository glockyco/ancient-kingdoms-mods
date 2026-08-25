## Why

The redaction ledger records one row per removed entity, keyed by that entity's identifier. For a placement row the exporter builds that identifier from the Unity instance identifier of the object it read, which is stable for one game build and different in the next. A patch that edits a zone therefore renumbers every placement in it, and Old Valorath is in active development.

The churn that follows is not review. Commit `6a3ddebf` accepted 842 changed lines for 0.9.30.0 and `cc7c7976` accepted 255 for 0.9.31.0, and both commit subjects say the drift was accepted, because hundreds of opaque identifiers cannot be read.

Almost none of it was a real change. Between those two patches the Old Valorath spawn population gained exactly one row, `corrupted_valaark`, and every other monster's spawn count was identical: 35 plague rats before and after, 14 cursed drassar, 12 warlocks, 11 earth elementals, 10 warriors, 7 soulreavers, 7 sentinels. Ninety-eight of ninety-nine keys changed because one object was added to the scene.

A ledger exists so that a change in what is redacted arrives as a reviewable diff. One added spawn should read as one added line.

A second defect shares the cause. The surviving-reference check derives the identifiers it scans from the recorded ledger rather than from the current data, so between a data change and a ledger sync it scans for the previous patch's identifiers and reports a clean result for removals it never checked. During the 0.9.31.0 update it passed while two unreleased armour set bonuses were published, because neither was in the recorded set.

## What Changes

- Key a removed placement by where it stands rather than by the runtime object it came from: its zone and its position, rounded. An entity whose own identifier is already reproducible keeps it.
- Keep one entry per removed entity, with its mechanism, its reason and the chain it followed. A patch that renumbers placements then produces no diff, and a placement that appears, moves or goes produces one line that names it.
- Leave the identifiers the exporter produces and the compendium database publishes unchanged. Only the ledger adopts the positional key.
- Derive the identifiers the surviving-reference check scans from the current removals rather than from the recorded ledger.
- **BREAKING** for the ledger file: 110 of its 185 keys change shape, so the first sync after this change rewrites it.

## Capabilities

### Modified Capabilities

- `compendium-redaction`: a removed row is recorded under an identity that survives a game build, and the surviving-reference check reads the removals the current data produces.

## Impact

- **Changed:** the ledger writer, reader, comparison, explanation and verification in `build-pipeline/src/compendium/redactions/`, and `redactions.lock.json`.
- **Review:** applied to the 0.9.31.0 update, the ledger diff would have been the one added spawn instead of 196 changed lines.
- **Coverage:** 110 entries take a positional key, in `monster_spawns`, `traps`, `portals` and `npc_spawns`. The other 75, in `items`, `skills`, `monsters`, `quests`, `npcs`, `zone_triggers` and `zones`, keep the identifier they already have.
- **Disclosure:** none. Position suppression keeps its entities, so no row of a suppressed zone is ever recorded as removed. Every positioned row in the ledger today belongs to Old Valorath, which is excluded whole.
- **Unchanged:** which content is removed, every published surface, the identifiers the database publishes, and the configuration format.
