## Why

The redaction ledger records one row per removed entity, and most of those rows are derivations rather than decisions. Of 185 removals, 39 are decisions taken by a human through configuration and 146 are cascades the closure computed. Those 146 rows collapse to 30 distinct chains, and 110 of them are placement rows in `monster_spawns`, `traps`, `portals` and `npc_spawns`.

Placement identifiers carry the Unity instance identifier of the object the exporter read, which is stable for one game build and different in the next. A patch that edits a zone therefore renumbers every placement in it. Old Valorath is in active development, so the churn arrives every patch: commit `6a3ddebf` accepted 842 changed lines for 0.9.30.0, and `cc7c7976` accepted 255 more for 0.9.31.0. Both commit subjects say the drift was accepted, because 900 opaque identifiers cannot be reviewed.

The ledger exists so that a change in what is redacted arrives as a reviewable diff. A diff nobody can read does not serve that purpose, and a reviewer who learns to accept it wholesale will accept a real change with it.

A second defect follows from the same conflation. The surviving-reference check derives the identifiers it scans from the recorded ledger rather than from the current data. Between a data change and a ledger sync it therefore scans for the previous patch's identifiers, so it reports a clean result without having checked the removals the current data produces. During the 0.9.31.0 update it passed while two unreleased armour set bonuses were published, because neither was in the recorded set.

## What Changes

- Record each decision as its own entry, and record the derivations grouped by the mechanism, the reason, the table, and the chain they followed, with the number of rows in each group.
- Answer a question about one entity by recomputing the current removals, rather than by reading a recorded per-entity chain.
- Derive the identifiers the surviving-reference check scans from the current removals rather than from the recorded ledger.
- **BREAKING** for the ledger file: the shape of the recorded removals changes, so the first sync after this change rewrites it.

## Capabilities

### Modified Capabilities

- `compendium-redaction`: the ledger records a decision per entity and a group per derivation, and the surviving-reference check reads the removals the current data produces.

## Impact

- **Changed:** the ledger writer, reader, comparison, explanation and verification in `build-pipeline/src/compendium/redactions/`, and `redactions.lock.json`.
- **Review:** a patch that renumbers placements produces no ledger diff. A patch that changes how many rows a decision removes produces one line per affected group.
- **Reviewer loses:** the identifier of an individually named cascaded entity, such as an item left with no source. `compendium redactions explain` still names it, from the current data.
- **Unchanged:** which content is removed, every published surface, and the configuration format.
