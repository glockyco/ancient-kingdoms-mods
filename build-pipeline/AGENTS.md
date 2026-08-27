# Build pipeline

The Python CLI validates JSON exports, loads SQLite, applies redactions, produces public images, and builds map tiles.

Path-specific constraints are in `rule://pipeline-invariants`.

## Owned outputs

`compendium build` writes the database to `website/data/compendium.db`. It copies selected public images to `website/static/images/`.

`website/data/` contains build inputs and is gitignored. `website/static/` contains public stable assets.

## Verification

Run the focused tests for the changed loader, denormalizer, redaction, citation, image, or tile path. Run a real `uv run compendium build` when output behavior changes. Inspect the produced database or artifact rather than treating unit tests as publication proof.
