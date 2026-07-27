# Exported Game Data

This directory contains the JSON data, sprite and image output, and `visual_assets.json` manifest produced by the export tooling. Image files are stored under `images/` alongside the JSON files.

The canonical automated export path is:

```bash
dotnet run --project build-tool export
```

This launches the game and drives the `compendium.export` HotRepl job. As a manual fallback, press **Shift+F9** in-game.
