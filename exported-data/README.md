# Exported game data

DataExporter writes each export into a session of its own:

- A run writes into `staging/<id>/`, checks every file, and writes `manifest.json` with each file's size, record count and SHA-256 digest.
- Only then does it move the directory to `sessions/<id>/` and point `active-session.json` at it. A failed run changes neither, and its staging directory stays for diagnosis.
- After a successful run, the export keeps the new session and the one it replaced, and deletes older sessions and staging directories.

The pipeline reads only the session that `active-session.json` names, after checking every file against its manifest. `openspec/specs/game-data-export/spec.md` and `openspec/specs/compendium-build/spec.md` hold the rules.

`screenshots/` holds the map screenshots and zone shots. Separate jobs capture them, so they sit outside sessions.

Nothing here is maintained by hand. Class metadata and static faction data live in `build-pipeline/curated/`.

The export path is `dotnet run --project build-tool export`, which launches the game and drives the `compendium.export` HotRepl job. Shift+F9 in the game runs the same export.
