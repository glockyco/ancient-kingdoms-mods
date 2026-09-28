# Exported Game Data

This directory holds runtime JSON exports, PNG source images under `images/`, and `visual_assets.json`.
Only `README.md` and `static_data.json` are tracked inputs here. Maintain `static_data.json` by hand
for the pipeline; it has no exporter. Edit class metadata in `mods/DataExporter/Curated/classes.json`,
not in the ignored `exported-data/classes.json` copy that every export overwrites.

The canonical automated export path is:

```bash
dotnet run --project build-tool export
```

This launches the game and drives the `compendium.export` HotRepl job. As a manual fallback, press **Shift+F9** in-game.

The export overwrites its JSON outputs, including `classes.json`, `classes_combat.json`, and
`visual_assets.json`, and may replace files under `images/`. It does not overwrite `static_data.json`.
