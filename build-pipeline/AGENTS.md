# Build pipeline

The Python CLI validates JSON exports, loads SQLite, applies redactions, produces public images, and builds map tiles.

## Owned outputs

`compendium build` writes the database to `website/data/compendium.db`. It copies selected public images to `website/static/images/`. `compendium tiles` replaces `website/static/tiles/` only after screenshot coverage validation passes.

`website/data/` contains build inputs and is gitignored. `website/static/` contains public stable assets. Do not put the database in `website/static/`.

## Invariants

- Load tables in foreign-key order.
- Every exported loader must be called by the build command. Registration tests enforce this.
- Every denormalizer package must be called by `run_all`. Registration tests enforce this.
- `redactions.toml` is required. An absent or empty redaction configuration must not publish everything.
- Entity redaction follows declared references to a fixpoint. Attribute redaction keeps the entity and removes only the selected data.
- `redactions.lock.json` and `citations.lock.json` are generated ledgers. Use their `check`, `explain`, `fix`, `suggest`, or `sync` commands. Do not edit them by hand.
- A changed server-script citation requires review of the claim before re-anchoring.
- Data models validate external JSON at the boundary. Avoid assertions after data enters typed internal code.

## Verification

Run the focused tests for the changed loader, denormalizer, redaction, citation, image, or tile path. Run a real `uv run compendium build` when output behavior changes. Inspect the produced database or artifact rather than treating unit tests as publication proof.
