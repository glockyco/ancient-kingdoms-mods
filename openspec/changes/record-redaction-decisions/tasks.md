## 1. Record decisions and groups

- [ ] 1.1 Give the ledger a group record holding the mechanism, the reason, the table, the followed chain, and the number of rows
- [ ] 1.2 Write each configured removal as its own entry, and write every derivation into the group its mechanism, reason, table and chain select
- [ ] 1.3 Order the groups and their chains deterministically, so an unchanged build rewrites an identical file
- [ ] 1.4 Read the new shape, and fail with a clear message on a file written in the old shape rather than treating its entries as decisions

## 2. Compare and explain from the new shape

- [ ] 2.1 Report a decision that appeared or disappeared, and a group whose count changed, naming the chain in each case
- [ ] 2.2 Answer `redactions explain <entity>` from the removals the current data produces, for a decision and for a derivation alike
- [ ] 2.3 Keep the printed chain readable to a seed, so the answer still reaches the decision that started it

## 3. Scan the current removals

- [ ] 3.1 Derive the identifiers the surviving-reference check scans from the current removals instead of the recorded ledger
- [ ] 3.2 Add a pipeline test that the check fails when the data removes an entity the recorded ledger does not name and a published value holds its identifier

## 4. Verify

- [ ] 4.1 Add a pipeline test that a decision is recorded as its own entry, and that derivations are recorded as groups with counts and no covered identifiers
- [ ] 4.2 Add a pipeline test that renumbering the identifiers of removed placement rows leaves the ledger unchanged
- [ ] 4.3 Add a pipeline test that a changed count is reported, and that an unchanged build produces an identical file
- [ ] 4.4 Run the pipeline tests, `uv run mypy .`, `uv run ruff check .`, and `uv run vulture src/ --min-confidence 80`
- [ ] 4.5 Rebuild, sync the ledger with the current game version, and confirm it records 39 decisions and the groups the current data produces
- [ ] 4.6 Confirm the recorded removals still cover the same entities as before the change, by comparing the published entity counts
- [ ] 4.7 Run `uv run compendium redactions verify` after a website build
- [ ] 4.8 Run `uv run compendium redactions explain` for a decision, for a cascaded item, and for a placement row
