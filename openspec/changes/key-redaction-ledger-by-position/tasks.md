## 1. Key a removed placement by where it stands

- [x] 1.1 Derive a removed row's recorded identity: keep its own identifier when it has no trailing runtime number, and otherwise replace that number with the zone and the position rounded to whole units
- [x] 1.2 Read the position from the columns already declared as the row's own geometry, rather than from a new list of tables
- [x] 1.3 Read the row before deletion, so the position is still available when the ledger is written
- [x] 1.4 Order the entries deterministically, so an unchanged build rewrites an identical file
- [x] 1.5 Fail with a clear message on a ledger written in the previous key space, rather than reporting every placement as appeared and disappeared

## 2. Keep the other commands coherent

- [x] 2.1 Report an appeared or disappeared entry against the new keys, so a renumbering reports nothing
- [x] 2.2 Answer `redactions explain <entity>` for a placement, accepting the entity name or a published identifier and naming the placements recorded for it
- [x] 2.3 Derive the identifiers the surviving-reference check scans from the current removals, in the form the published data carries them, instead of from the recorded ledger

## 3. Verify the rule

- [x] 3.1 Add a pipeline test that a removed placement is recorded under its zone and rounded position, with the entity still named in the key
- [x] 3.2 Add a pipeline test that changing a removed placement's runtime identifier alone leaves the ledger unchanged
- [x] 3.3 Add a pipeline test that moving a removed placement beyond the rounding changes its entry, and that a nudge below the rounding does not
- [x] 3.4 Add a pipeline test that a row whose identifier has no trailing runtime number keeps that identifier
- [x] 3.5 Add a pipeline test that the surviving-reference check fails when the data removes an entity the recorded ledger does not name and a published value holds its identifier

## 4. Verify the update

- [x] 4.1 Run the pipeline tests, `uv run mypy .`, `uv run ruff check .`, and `uv run vulture src/ --min-confidence 80`
- [x] 4.2 Rebuild, sync the ledger with the current game version, and confirm 110 entries carry a positional key and 75 keep their own identifier
- [x] 4.3 Confirm the recorded removals still cover the same entities as before, by comparing the published entity counts
- [x] 4.4 Confirm no recorded key names a zone under position suppression
- [x] 4.5 Re-export the same game build, rebuild, and confirm the ledger does not change, which tests the rounding against the export's float noise
- [x] 4.6 Run `uv run compendium redactions verify` after a website build
- [x] 4.7 Run `uv run compendium redactions explain` for a decision, for a cascaded item, and for a placement
