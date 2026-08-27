---
description: This rule covers website data boundaries and Svelte rendering constraints while editing website source and static assets.
globs:
  - "website/src/**"
  - "website/static/**"
---
# Website boundaries

## Data and asset boundaries

- The browser reads the compressed, content-hashed SQLite assets produced from `data/`.
- Only `src/lib/database-assets.ts` imports database archives. A second import can emit a duplicate hashed bundle.
- `static/` is for stable public assets such as mods, tiles, icons, and selected images. Do not publish the database there.
- SQL access lives in `src/lib/queries/` and returns typed rows. Type assertions belong only at I/O boundaries.
- `citations.lock.json` is at the repository root. Run citation commands from `build-pipeline/` as documented in the root scripts. Do not edit the ledger.

## Svelte and rendering

- Use Svelte 5 runes. ESLint owns legacy-syntax rejection.
- Detail pages must render all rows in prerendered HTML. Overview pages may paginate to control output size.
- Keep the no-JavaScript path functional. Do not hide required content behind hydration.
- Browser guards belong around browser-only APIs such as deck.gl.
- Visible mechanics prose must not use semicolons. Preserve title-case `Title`, lower-case `subtitle`, and the existing snapshot normalization.
- Every hardcoded game value needs a `Source:` citation to `server-scripts/`, preferably by symbol. A green hash proves unchanged bytes, not a correct claim.
