---
description: The pipeline rule covers owned-output boundaries and build invariants while editing pipeline files or redactions.
globs:
  - "build-pipeline/**"
  - "redactions.toml"
---
# Pipeline invariants

## Owned output boundaries

`compendium tiles` replaces `website/static/tiles/` only after screenshot coverage validation passes.

Do not put the database in `website/static/`.

## Invariants

- Load tables in foreign-key order.
- Every exported loader must be called by the build command. Registration tests enforce this.
- Every denormalizer package must be called by `run_all`. Registration tests enforce this.
- `redactions.toml` is required. An absent or empty redaction configuration must not publish everything.
- Entity redaction follows declared references to a fixpoint. Attribute redaction keeps the entity and removes only the selected data.
- `redactions.lock.json` and `citations.lock.json` are generated ledgers. Use their `check`, `explain`, `fix`, `suggest`, or `sync` commands. Do not edit them by hand.
- A changed server-script citation requires review of the claim before re-anchoring.
- A curated value that restates a game rule has a check. `compendium classes check-races` compares the class and race pairing in `exported-data/classes.json` against the character creator. It reads the gitignored snapshot, so it stays out of `compendium build`.
- Data models validate external JSON at the boundary. Avoid assertions after data enters typed internal code.
