# Ancient Kingdoms Compendium & Mods

Tools and website for maintaining the Ancient Kingdoms Compendium: exporting game data, building the static site, and supporting companion MelonLoader mods.

## Links

- Compendium: <https://ancient-kingdoms-compendium.wowmuch1.workers.dev>
- Steam guide: <https://steamcommunity.com/sharedfiles/filedetails/?id=3616580411>
- Ko-fi: <https://ko-fi.com/wowmuch>

## What this repository does

This repository is organized around the compendium workflow:

1. Export data, images, and map screenshots from Ancient Kingdoms with MelonLoader mods.
2. Convert the exported JSON into a SQLite database and website-ready assets.
3. Serve the compendium as a static SvelteKit site deployed with Cloudflare Static Assets.
4. Maintain optional gameplay and development mods for local testing, map work, boss tracking, and data collection.

```text
Game (IL2CPP Unity)
  ↓ MelonLoader export mods
exported-data/*.json + exported-data/images/ + exported-data/screenshots/
  ↓ Python build pipeline
website/static/compendium.db + website/static/images/ + website/static/tiles/
  ↓ SvelteKit static site
Cloudflare Static Assets
```

The compendium is a fan-made wiki, interactive world map, and game database. It covers items, monsters, NPCs, zones, quests, altars, classes, skills, pets, professions, gathering resources, crafting recipes, chests, and the interactive world map.

## Repository layout

| Path | Purpose |
| --- | --- |
| `mods/` | C# MelonLoader mods, including player-facing utilities, export tooling, and `BossMod.Core` shared code. |
| `build-tool/` | .NET command runner for setup, mod builds, deployment, automated exports, and HotRepl workflows. |
| `build-pipeline/` | Python CLI that turns exported game data into SQLite, images, and map tiles for the website. |
| `website/` | SvelteKit static compendium site. |
| `exported-data/` | Local game export output. Most generated files are gitignored. |
| `website/static/` | Generated database, image, and tile assets used by the site. Generated compendium assets are gitignored. |
| `server-scripts*/` | Local decompiled server-script snapshots used to verify hardcoded mechanics. These are gitignored. |
| `tests/` | C# tests, including `BossMod.Core.Tests`. |
| `docs/` | Project notes, task plans, and contributor-oriented guides. |

## Compendium website

The website is a static SvelteKit app:

- SvelteKit 2, Svelte 5, TypeScript, and Tailwind 4.
- Static generation through `@sveltejs/adapter-static`.
- Client-side SQLite through `sql.js-fts5`, with the full database downloaded on the first client query.
- Interactive map rendering through deck.gl.
- UI components built around bits-ui-compatible patterns.
- Deployment through Wrangler and Cloudflare Static Assets.


## Mods

The mod catalog includes player-facing utilities, data exporters, and development inspection tools. Several mods change local game state, such as teleporting or forcing respawns, so use them only in environments where that is appropriate.

### Player-facing and interactive mods

| Mod | Summary |
| --- | --- |
| `BossMod` | ImGui-based boss assistant. Tracks monster snapshots, renders cast bars and boss ability windows, provides settings tabs, and persists state under MelonLoader user data. |
| `BossTracker` | Overlay panel for nearby bosses and elites, including alive/dead status, distance, direction, and respawn timers. Hold Right Shift and drag with left click to move the panel. |
| `MapEnhancer` | Automatically clears fog of war, enables Veteran Awareness, and improves minimap monster visibility. Living bosses are highlighted and dead bosses/elites remain visible as grey markers. |
| `MapTeleporter` | Alt-left-click on the open in-game map to teleport to that location. |
| `MonsterRespawner` | Hold Alt to show world-space markers for dead monsters on respawn timers. Left-click a marker while Alt is held to make the monster ready to respawn. |
| `ResourceRespawner` | Hold Alt to show world-space markers for gathered resources on cooldown, including plants, minerals, radiant sparks, chests, and other gatherables. Left-click while Alt is held to make the resource harvestable. |

### Data and development mods

| Mod | Summary |
| --- | --- |
| `DataExporter` | Shift-F9 exports game data to JSON and writes the visual asset manifest used by the build pipeline. |
| `AutoExporter` | Command-line driven automation for exports. `--export-data` runs `DataExporter`; `--export-screenshots` runs `MapScreenshotter`; the mod selects the first existing character and quits after export completion. |
| `MapScreenshotter` | Shift-F10 captures map screenshots for tile generation. The automated export path can also invoke it with `--export-screenshots`. |
| `HierarchyLogger` | F9 in the World scene dumps the Unity scene hierarchy and fog-related components to `hierarchy_dump.txt`. |

`build-tool` discovers mod projects under `mods/` recursively, so a mod can be built even if it is not listed in `AncientKingdomsMods.sln`.

## Requirements

- Ancient Kingdoms installed locally. The setup tool detects common Steam and CrossOver Steam paths, and `export --update` uses steamcmd.
- MelonLoader installed for Ancient Kingdoms, with generated IL2CPP assemblies available under the game install.
- .NET SDK capable of running the `net10.0` build tool. The mods themselves target `net6.0` for MelonLoader.
- Python 3.12 or newer and `uv` for the build pipeline.
- pnpm 10.22.0 for the root workspace and website.
- On macOS, CrossOver or another Wine setup is needed to launch the Windows game for automated export workflows. `build-tool setup` can detect common CrossOver paths.

## First-time setup

Install JavaScript dependencies:

```bash
pnpm install
```

Generate local configuration:

```bash
dotnet run --project build-tool setup
```

Setup creates or updates local, gitignored configuration:

- `Local.props` for the Ancient Kingdoms install path, export path, and optional Wine/CrossOver paths.
- `config.toml` for build-pipeline paths and tile settings.

All build-tool commands except `setup` require `Local.props`.

## Common workflows

### Build and deploy mods

```bash
# Build every discovered mod project under mods/
dotnet run --project build-tool build

# Copy built DLLs to the configured game Mods directory
dotnet run --project build-tool deploy

# Build, then deploy
dotnet run --project build-tool all
```

Close Ancient Kingdoms before deploying. DLLs can be locked while the game is running.

### Export game data

```bash
# Launch the game, run the data export, stream MelonLoader/Latest.log, then quit
dotnet run --project build-tool export

# Also capture map screenshots for tile generation
dotnet run --project build-tool export --screenshots

# Update the Steam install before exporting
dotnet run --project build-tool export --update
```

The automated exporter requires at least one existing character because it selects the first character before entering the world and running exports.

### Build compendium data

```bash
cd build-pipeline

# JSON exports → website/static/compendium.db and website/static/images/
uv run compendium build

# exported-data/screenshots/ → website/static/tiles/
uv run compendium tiles

# Print database statistics
uv run compendium stats
```

Tile generation requires screenshot metadata from `MapScreenshotter` or `build-tool export --screenshots`.

### Run the website locally

From the repository root:

```bash
pnpm dev
```

Useful root scripts:

```bash
pnpm check
pnpm lint
pnpm build
```

Deploy from the website workspace:

```bash
cd website
pnpm cf-deploy
```

The website expects generated assets in `website/static/`. In particular, `website/static/compendium.db` is gitignored and must be created by the build pipeline before local browsing or production builds that depend on the database.

### HotRepl runtime inspection

```bash
dotnet run --project build-tool hotrepl-deploy
dotnet run --project build-tool hotrepl-launch --wait --timeout-seconds 30
dotnet run --project build-tool hotrepl-smoke
```

Use world-only smoke checks only after loading a character into the world:

```bash
dotnet run --project build-tool hotrepl-smoke --world
```

## Development checks

Run the checks for the area you changed:

```bash
# Website
cd website
pnpm check
pnpm lint
pnpm build

# Build pipeline
cd build-pipeline
uv run ruff check .
uv run mypy .

# Mods
dotnet run --project build-tool build
```

Pre-commit hooks run `lint-staged`. Website TypeScript/Svelte changes are formatted, linted, and checked. Python changes in `build-pipeline/` are formatted with Ruff, fixed with Ruff, and checked with mypy.

## Game mechanics accuracy

Use exported game data instead of hand-maintained values whenever possible. Some mechanics cannot be derived from exports and are hardcoded in website or pipeline code. Hardcoded mechanics should cite the local server-script snapshot they came from:

```ts
// Source: server-scripts/FileName.cs:123-145 — brief explanation
```

```svelte
<!-- Source: server-scripts/FileName.cs:123-145 — brief explanation -->
```

After each game update, re-export data and re-check source-cited mechanics against the relevant `server-scripts*/` snapshot before publishing changes.

## Troubleshooting

### `Local.props` is missing

Run setup:

```bash
dotnet run --project build-tool setup
```

### Mod build cannot find game assemblies

Confirm Ancient Kingdoms has been launched with MelonLoader at least once and that `Local.props` points to the correct game install. The mod projects reference MelonLoader and IL2CPP assemblies under the configured game directory.

### Deploy fails because a DLL is locked

Close Ancient Kingdoms, then run deploy again.

### Website cannot load the database

Run the build pipeline:

```bash
cd build-pipeline
uv run compendium build
```

### Tile generation cannot find metadata

Capture map screenshots first:

```bash
dotnet run --project build-tool export --screenshots
```

Then rerun:

```bash
cd build-pipeline
uv run compendium tiles
```

### Automated export says no characters are available

Create at least one character in Ancient Kingdoms, then rerun the export command.

## Support

If the compendium is useful to you, Ko-fi is the easiest way to show support:

<https://ko-fi.com/wowmuch>

