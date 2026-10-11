# Ancient Kingdoms Compendium & Mods

Tools and website for maintaining the Ancient Kingdoms Compendium: exporting game data, building the compendium site, and supporting companion MelonLoader mods.

## Links

- Compendium: <https://ancient-kingdoms.compendiums.org>
- Steam guide: <https://steamcommunity.com/sharedfiles/filedetails/?id=3616580411>
- Ko-fi: <https://ko-fi.com/wowmuch>
- HotRepl: <https://github.com/glockyco/HotRepl>

## What this repository does

1. Export data, images, and map screenshots from Ancient Kingdoms with MelonLoader mods.
2. Convert the exported JSON into a SQLite database and website-ready assets.
3. Serve the compendium, a fan-made wiki, interactive world map, and game database, from Cloudflare.
4. Maintain optional gameplay and development mods for local testing, map work, boss tracking, and data collection.

```text
Game (IL2CPP Unity)
  ↓ MelonLoader export mods
exported-data/*.json + exported-data/images/ + exported-data/screenshots/
  ↓ Python build pipeline
website/data/compendium.db + website/static/images/ + website/static/tiles/
  ↓ SvelteKit, mostly prerendered
Cloudflare Worker + Static Assets
```

## Repository layout

| Path              | Purpose                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `mods/`           | C# MelonLoader mods for player-facing utilities, data export, map capture, and development inspection. |
| `build-tool/`     | .NET command runner for setup, mod builds, deployment, automated exports, and HotRepl workflows.       |
| `build-pipeline/` | Python CLI that turns exported game data into SQLite, images, and map tiles for the website.           |
| `website/`        | SvelteKit compendium site.                                                                             |
| `exported-data/`  | Local game export output. Most generated files are gitignored.                                         |
| `website/data/`   | Generated database the site reads. Gitignored.                                                         |
| `website/static/` | Published image and tile assets. Generated compendium assets are gitignored.                           |
| `server-scripts`  | Gitignored symlink to the current decompiled server scripts under `.decompiled/`.                      |
| `.decompiled/`    | Gitignored game-build snapshots created by `scripts/update-server-scripts.sh`.                         |
| `tests/`          | C# test projects.                                                                                      |
| `docs/`           | Reports of defects in the game itself, written for its developer.                                      |
| `openspec/`       | Current behavior specifications and active changes.                                                    |
| `verification/`   | Combat fixtures and recorded game observations.                                                        |
| `scripts/`        | Repository checks and server-script snapshot updates.                                                  |

## Compendium website

SvelteKit 2, Svelte 5, TypeScript, and Tailwind 4 on Cloudflare through `@sveltejs/adapter-cloudflare`. Pages are prerendered from the SQLite database with `better-sqlite3`. The home page renders in the Worker so it can show the live game version. In the browser, `sql.js-fts5` serves search and the deck.gl map.

Conventions the code does not show on its own:

- SQL lives in `src/lib/queries/`. Only `src/lib/database-assets.ts` imports the database archives, and its header explains why.
- Detail pages render all rows in the prerendered HTML. Overview pages may paginate. Pages work without JavaScript.
- Mechanics pages have text snapshots. After an intended visible change, run `pnpm build` and `node scripts/snapshot-mechanics.mjs --update` in `website/`, review the changed text, and commit the snapshots with the change. Visible mechanics text has one statement per line and no semicolons.
- The game is 2D. The map uses game X and negated game Y, converted once in `src/lib/queries/map.server.ts`.
- `src/lib/map/marker-registry.ts` owns every marker layer's precedence and presentation. Layers render in this order: terrain and zones, paths and ranges, ordinary markers, important markers, then selection and hover highlights.

## Mods

Several mods change local game state, such as teleporting or forcing respawns. Use them only where that is appropriate.

### Player-facing and interactive mods

| Mod                 | Summary                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `BetterBestiary`    | Reveals Bestiary details, lore, stats, loot, and skills without changing discovery or kill progress. Alt-left-click a monster to open its page. |
| `BossSkillTracker`  | In-combat HUD of boss, elite, and fabled monster ability cooldowns.                                                                             |
| `BossTracker`       | Panel of nearby bosses, elites, and fabled monsters with status, distance, direction, and respawn timers. Right Shift and drag to move it.      |
| `MapEnhancer`       | Clears fog of war, enables Veteran Awareness, highlights living bosses, and keeps dead bosses and elites on the minimap as grey markers.        |
| `MapTeleporter`     | Alt-left-click the open in-game map to teleport there.                                                                                          |
| `MonsterRespawner`  | Hold Alt to mark dead monsters. Left-click a marker to make the monster ready to respawn.                                                       |
| `ResourceRespawner` | Hold Alt to mark gathered resources and chests on cooldown. Left-click a marker to make the resource harvestable.                               |

### Data and development mods

| Mod                        | Summary                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CharacterCapture`         | Writes the local player's planner build to `UserData/CharacterCapture/character-capture.json` and reads combat meter totals.                                       |
| `CombatVerification`       | HotRepl commands for the combat verification harness. Not for normal play.                                                                                         |
| `DataExporter`             | Shift-F9 exports game data to JSON and writes the visual asset manifest the build pipeline reads.                                                                  |
| `FieldDefaultValueHookFix` | Patches an Il2CppInterop byte-signature scan that otherwise crashes the game on world entry.                                                                       |
| `HotReplCommands`          | Typed HotRepl commands that `build-tool export` and `build-tool verify` drive: preflight, world summary and entry, export, scratch database, zone shots, and quit. |
| `MapScreenshotter`         | Shift-F10 captures map screenshots for tile generation. `build-tool export --screenshots` triggers it.                                                             |
| `HierarchyLogger`          | F9 in the World scene dumps the scene hierarchy and fog-related components to `hierarchy_dump.txt`.                                                                |

`build-tool` discovers mod projects under `mods/` recursively, so a mod builds even if it is not listed in `AncientKingdomsMods.sln`.

### BetterBestiary skill summaries

`mods/BetterBestiary/Skills/SkillEffectFormatter.cs` ports the website's `formatSkillEffect`, which stays the source of truth. A parity test holds the two string-identical over every exported skill. After re-exporting the data or changing `formatSkillEffect`, regenerate the corpus and port the change until the test passes:

```bash
pnpm --filter website gen:skill-effect-parity
dotnet test tests/BetterBestiary.Tests
```

### Runtime notes

- Game behavior comes from `server-scripts/`, not from the near-empty `Assembly-CSharp.dll` stub.
- Il2CppInterop exposes a game field as a property, so reflection by field name finds nothing. Read the property first.
- `GetComponents<T>()` returns every match wrapped as `T`. All six attribute components report `PlayerAttribute`, so tell them apart by the member that holds them.
- A plain server field reads as zero on a client of a remote server. A mod that reads one branches on `NetworkServer.active` and says which source its figures come from.
- A refused engine call returns normally and changes nothing. Read the value, act, then read it again.
- Times defined on the server, such as respawn deadlines, use the synchronized server time: the network manager's offset added to Mirror's network time.
- A mod marked `[HarmonyDontPatchAll]` calls `HarmonyInstance.PatchAll()` once during initialization.

## Requirements

- Ancient Kingdoms installed by the Steam client inside a CrossOver bottle. `build-tool setup` finds it by reading the Steam application manifest for app id 2241380, and `build-tool update` asks that same client to bring it current.
- MelonLoader 0.7.3 installed for Ancient Kingdoms, with generated IL2CPP assemblies available under the game install.
- .NET SDK capable of running the `net10.0` build tool. The mods themselves target `net6.0` for MelonLoader.
- Python 3.12 or newer and `uv` for the build pipeline.
- pnpm 10.34.5 for the root workspace and website, as pinned by `packageManager` in `package.json`.
- macOS with CrossOver. The tooling launches the game through the CrossOver wine binary and drives Steam through CrossOver's launcher beside it, so `Local.props` requires `WINE_PATH` and `WINE_PREFIX`. `build-tool setup` detects both.

## First-time setup

`flake.nix` provides Node, pnpm, Python, uv, the .NET 10 SDK, and sqlite at the versions this repo expects. Enter it with `nix develop`, or with [direnv](https://direnv.net) and [nix-direnv](https://github.com/nix-community/nix-direnv) run `direnv allow` once. Everything below assumes that shell. The game, CrossOver, MelonLoader, and the generated IL2CPP assemblies stay machine-local.

```bash
pnpm install
dotnet run --project build-tool setup
```

Setup writes `Local.props` with the game install, export directory, and Wine paths, and creates `config.toml` with build-pipeline paths and tile settings when it is absent.

## Common workflows

### Build and deploy mods

```bash
# Build every discovered mod project under mods/
dotnet run --project build-tool build

# Copy built DLLs to the configured game Mods directory
dotnet run --project build-tool deploy
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

The automated exporter selects the first existing character, so the game needs at least one.

### Capture zone shots

Zone shots come from the running game, framed by `build-pipeline/zone_shot_focal_points.json`. With the game closed:

```bash
dotnet run --project build-tool build
dotnet run --project build-tool deploy
dotnet run --project build-tool launch --wait
hotrepl run game.useScratchDatabase '{}' --json   # must report isScratch=true
# Only when the scratch roster has no fixture character:
hotrepl run fixture.createCharacter '{"characterName":"HomeArt","class":"warrior","race":"human"}' --json
hotrepl run world.enter '{"character":"HomeArt"}' --json
hotrepl run capture.zoneShots '{}' --json
hotrepl run game.quit '{}' --json
```

Redirect to the scratch database before anything else, and never enter the world with a player character. If the redirect refuses, quit and relaunch. The focal-point format and the command's options are in `.agent/skills/hotrepl-runtime-inspection/references/commands.md`.

### Build compendium data

```bash
cd build-pipeline

# JSON exports → website/data/compendium.db and website/static/images/
uv run compendium build

# exported-data/screenshots/ → website/static/tiles/
uv run compendium tiles

# Print database statistics
uv run compendium stats

# Check the curated class and race pairing against the game's character creator
uv run compendium classes check-races

# Verify source citations against the decompiled game snapshot
uv run compendium citations check

# Verify recorded redaction decisions against current data
uv run compendium redactions check
```

The database stays outside `website/static/`, because `static/` is published verbatim. `compendium tiles` needs the screenshot metadata from `build-tool export --screenshots`.

### Run and deploy the website

From the repository root:

```bash
pnpm dev
pnpm check
pnpm lint
pnpm build
```

Deploy from `website/`:

```bash
cd website
pnpm cf-deploy        # production; builds first and stops on a failed build
pnpm cf-deploy:demo   # the same build on a separate demo Worker on workers.dev
```

`website/mod-downloads.json` selects the mods the site offers for download. Website builds produce them through `build-tool publish-mods`, each at a stable `/mods/<project>.dll` path with a manifest at `/mods/manifest.json`.

### HotRepl runtime inspection

```bash
dotnet run --project build-tool deploy-host --hotrepl-repo /path/to/HotRepl
dotnet run --project build-tool launch --wait
hotrepl --url ws://127.0.0.1:18590 info --json
hotrepl --url ws://127.0.0.1:18590 run world.summary '{}' --json
```

`pnpm install` provides the CLI at `./node_modules/.bin/hotrepl`. The typed commands are listed in `.agent/skills/hotrepl-runtime-inspection/references/commands.md`. Only one client holds the connection, and a new client disconnects the active one, so never attach during an export or a verification run.

### Combat fixture validation

Close other Ancient Kingdoms instances, then:

```bash
dotnet run --project build-tool verify
dotnet run --project build-tool verify --fixture A-class-warrior
```

`verify` measures each committed fixture in its own game session against a fresh scratch database and writes `verification/observations/<name>.json`. The website tests compare the observations with the engine. The first command below prints one verdict per fixture. The second is the strict gate that a claim about the whole domain needs: a current passing observation for every fixture, and coverage of every handler, damage school, class, and companion archetype.

```bash
pnpm --filter website test src/lib/planner/verification/verification.db.test.ts
pnpm --filter website test:combat-verification
```

- `pass`: every compared quantity meets its criterion.
- `fail`: a quantity is outside its criterion. Inspect the fixture, the observation, the game code, and the engine before changing either side. Never widen a tolerance to make a fixture pass.
- `inconclusive`: nothing failed, but a random quantity has fewer samples than the fixture's minimum. Record more windows.
- `stale`: the observation came from a different game assembly than the current planner data. Record it again on the current build.
- `missing`: the fixture has no observation yet.

Stale and missing fixtures do not block a game update.

## Development checks

Run the checks that cover the changed area, and all of them for cross-subsystem changes and releases:

```bash
# Website, from the repository root
pnpm --filter website test
pnpm check
pnpm lint
pnpm build

# Build pipeline
cd build-pipeline
uv run pytest
uv run ruff check .
uv run mypy .
uv run vulture src/ --min-confidence 80
cd ..

# Mods and build tool
dotnet test tests/BetterBestiary.Tests
dotnet test tests/BossSkillTracker.Tests
dotnet test tests/CombatVerification.Tests
dotnet test tests/BuildTool.Tests
dotnet test tests/DataExporter.Tests
dotnet test tests/HotReplCommands.Tests
dotnet run --project build-tool build

# Repository checks
pnpm check:citations
pnpm check:redactions
pnpm check:clean
```

`pnpm check:citations` requires the `server-scripts` symlink. `lefthook.yml` runs the checks for the staged paths before each commit and checks Conventional Commit syntax.

## Rules for changes

- Develop in the primary checkout. `Local.props`, `config.toml`, the `server-scripts` symlink, and `website/data/` exist only there.
- Fail when required game data, files, or runtime objects are missing. A default is valid only where the field's contract defines absence. `FieldDefaultValueHookFix` is the one sanctioned exception, and its source explains why. Do not add a second.
- Exporters read authoritative runtime data: direct fields and explicit references, with `TryCast<T>()` where the subtype matters. Never infer a value from a name, a threshold, or proximity. Absence follows each field's contract: `null` for a missing reference, `""` for missing text, and a declared default only where the contract defines one. Document a derived value, such as zone containment, at its exporter. JSON property names are snake_case, and manifest paths are relative to `exported-data/`.
- Change generated output through its producer, then regenerate. Exports, the database, published images and tiles, and `server-scripts` are gitignored. The tracked exceptions are hand-maintained: `exported-data/static_data.json` and `mods/DataExporter/Curated/classes.json`, whose copy in `exported-data/` the exporter overwrites.
- Change `citations.lock.json` and `redactions.lock.json` only through `compendium citations` and `compendium redactions`. Each entry records a verification, so a hand edit claims one that never happened. Review the claim behind a changed citation before re-anchoring it.
- Keep this README to orientation, workflows, these rules, and troubleshooting. Put procedures and tool references in `.agent/skills/`, required behavior and export formats in `openspec/specs/`, and redaction decisions in `redactions.toml`.

## Game mechanics accuracy

Use exported game data instead of hand-maintained values whenever possible. Mechanics that cannot be derived from exports are hardcoded in website or pipeline code and cite the server-script snapshot they came from:

```ts
// Source: server-scripts/FileName.cs:123-145 — brief explanation
```

```svelte
<!-- Source: server-scripts/FileName.cs:123-145 — brief explanation -->
```

After each game update, re-export the data and re-check source-cited mechanics against the current snapshot before publishing. `scripts/update-server-scripts.sh <version>` creates the gitignored `server-scripts` symlink into `.decompiled/<build>`. `compendium build` reads `server-scripts/SNAPSHOT.toml`, so it needs that symlink.

## Troubleshooting

### `Local.props` is missing

Run `dotnet run --project build-tool setup`.

### Mod build cannot find game assemblies

Confirm Ancient Kingdoms has been launched with MelonLoader at least once and that `Local.props` points to the correct game install. The mod projects reference MelonLoader and IL2CPP assemblies under the configured game directory.

### Deploy fails because a DLL is locked

Close Ancient Kingdoms, then run deploy again.

### Website cannot load the database

Run `uv run compendium build` in `build-pipeline/`.

### Tile generation cannot find metadata or fails boss-position validation

The screenshot set is missing, incomplete, or blank around known boss terrain. Fix the loaded mod set or game state, run `dotnet run --project build-tool export --screenshots`, then rerun `uv run compendium tiles`.

### A mod change does nothing in the game

A Harmony patch that no longer applies, an unregistered command, and a dead coroutine all fail without an error. Read `MelonLoader/Latest.log`, and confirm the change in the running game before reporting it as working.

### Automated export says no characters are available

Create at least one character in Ancient Kingdoms, then rerun the export command.

## Support

If the compendium is useful to you, Ko-fi is the easiest way to show support: <https://ko-fi.com/wowmuch>

## License

MIT. See [LICENSE](LICENSE).
