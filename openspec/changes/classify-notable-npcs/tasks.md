## 1. Preserve the classification

- [x] 1.1 Add `is_notable` to the DataExporter NPC model and populate it from the direct runtime field; verify the DataExporter tests and build pass.
- [x] 1.2 Run the real game-data export and confirm `npcs.json` marks each game-classified NPC without name or role inference.
- [x] 1.3 Add the field to the pipeline model and SQLite schema, rebuild the compendium database, and query the stored King Darin value.

## 2. Correct reputation behavior

- [x] 2.1 Extend the shared NPC kill-reputation calculation with the 60-times positive multiplier and verify ordinary, notable, and negative cases in focused tests.
- [x] 2.2 Pass the classification through NPC detail and faction queries; verify King Darin displays `+5,400` and `−300` on the applicable prerendered pages.
- [x] 2.3 Revise the Killing NPCs mechanics section and source citations; verify its mechanics snapshot against the built page.

## 3. Present the classification

- [ ] 3.1 Add Notable classification data, badges, and filtering to NPC list and detail pages; verify it remains separate from Quest Giver and other service roles.
- [ ] 3.2 Add Notable NPC search keywords and result presentation; rebuild search data and verify a `notable` search returns the classified NPCs.

## 4. Distinguish Notable NPCs on the map

- [ ] 4.1 Add the Notable field and visibility state to the map data contract and server loader; verify the serialized map data preserves King Darin's existing identity and coordinates.
- [ ] 4.2 Register the Notable NPC marker presentation and precedence in the existing registry; verify registry and layer tests produce one marker per spawn.
- [ ] 4.3 Show the classification and service roles in map tooltips and popups; verify marker visibility, search selection, and the NPC detail map link in the browser.

## 5. Validate and publish the change

- [ ] 5.1 Run the affected DataExporter, pipeline, reputation, search, and map tests; then run the website check, lint, and production build.
- [ ] 5.2 Run `openspec validate classify-notable-npcs --strict`, inspect the task-owned diff, and commit coherent verified units without staging unrelated local changes.
