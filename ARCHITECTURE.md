# Architecture

How the parts of this repository fit together, for anyone changing its code. It states only what rarely changes. Setup and workflows are in [CONTRIBUTING.md](CONTRIBUTING.md), and step-by-step procedures are in [`.agent/skills`](.agent/skills/).

## Bird's-eye view

The compendium publishes what the installed build of Ancient Kingdoms contains. MelonLoader mods read the data out of the running game, a Python pipeline turns the exports into a SQLite database, images, and map tiles, and a SvelteKit site prerenders its pages from that database. Mechanics that the export cannot carry are hardcoded in the pipeline or the site and cite the decompiled server code they come from.

```text
game ──export──> exported-data/ ──compendium──> website/data/, website/static/ ──build──> site
game ──decompile──> server-scripts/ ──cited by──> hardcoded mechanics
```

## Code map

- **`mods/`** — MelonLoader mods (C#, `net6.0`), catalogued in [`mods/README.md`](mods/README.md). DataExporter and MapScreenshotter produce the exports. HotReplCommands, CombatVerification, and CharacterCapture register typed HotRepl commands that `build-tool` and agents drive. The rest are player and gameplay mods.
- **`build-tool/`** — a .NET CLI. `Commands/CommandCatalog.cs` lists its verbs. `Game/` finds the install in the CrossOver bottle, launches it through Wine, and owns the session locks, the scratch database, and the save backups. `HotRepl/` runs exports and verification over the HotRepl connection.
- **`build-pipeline/`** — the `compendium` CLI. `loaders/` read the exports into SQLite, `denormalizers/` derive the tables the site reads, `redactions/` removes withheld content, and `citations/` verifies `Source:` comments. `schema.sql` is the database schema, and `zone_shot_focal_points.json` frames the zone shots.
- **`website/`** — the SvelteKit site. Routes under `src/routes/` load their data at build time. `src/lib/entities/entity-manifest.json` declares each entity kind's routes, search kind, and sitemap membership. `src/lib/map/marker-registry.ts` declares every map marker layer. `src/lib/planner/` reproduces the game's combat formulas.
- **`verification/`** — combat fixtures and the observations that `build-tool verify` records in the game.
- **`tests/`** — C# tests for the mods and `build-tool`. They compile repository sources and need no game install.
- **`scripts/`** — the server-script snapshot script and the clean-checkout check.
- **`openspec/`** — required behavior (`specs/`) and planned changes (`changes/`).
- **`docs/game-bugs/`** — defect reports about the game itself, for its developer.

## Boundaries

- **Game to pipeline.** Only `exported-data/` crosses: JSON, source images, `visual_assets.json`, and the screenshots. The pipeline never reads the game install.
- **Evidence.** `server-scripts/` is decompiled from the dedicated server that ships with the game. It is evidence for hardcoded mechanics, never export input. The mods compile against `MelonLoader/Il2CppAssemblies/`, whose `Assembly-CSharp.dll` holds only interop wrappers, so game behavior is read in `server-scripts/`.
- **Pipeline to site.** The site reads `website/data/compendium.db` and the files under `website/static/` that the pipeline writes. Pages are prerendered from the database with better-sqlite3, except the home page, which renders in the Cloudflare Worker to compare the published version with the live game.
- **Build to browser.** In the browser, MiniSearch serves search and sql.js reads a compressed, content-hashed copy of the database. Only `website/src/lib/database-assets.ts` imports those archives.
- **Tooling to game.** `build-tool` and agents control the running game only through typed HotRepl commands. HotRepl serves one client, and a new client disconnects the current one.

## Invariants

- Exporters read authoritative runtime data and never infer a value from a name, a threshold, or proximity. The [export-game-data skill](.agent/skills/export-game-data/SKILL.md) holds the full data contract.
- Missing game data, files, or runtime objects fail the operation. A default is valid only where a field's contract defines absence. `FieldDefaultValueHookFix` is the one sanctioned exception: when its lookup fails, it logs an error and leaves Il2CppInterop's own lookup in place.
- A hardcoded mechanic cites the decompiled code it comes from, as `// Source: server-scripts/File.cs:Member — claim`, with `#` in Python and `<!-- -->` in Svelte markup. `compendium citations check` fails when the cited lines change. A pass proves only that they did not change.
- A verification tolerance is never widened to make a fixture pass.
- Redaction rules live in `redactions.toml` with their reasons. `compendium build` removes everything a rule reaches, every published output applies the rules, and `redactions.lock.json` records each removal.
- A session that creates or changes characters first redirects the game to the scratch database with `game.useScratchDatabase`. A refused redirect means quit and relaunch.
- Generated output changes only through its producer. In `exported-data/`, only `static_data.json` is maintained by hand, and class metadata lives in `mods/DataExporter/Curated/classes.json`, which every export copies over `exported-data/classes.json`. Some generated files are tracked: `website/src/lib/generated/`, `website/static/og-default.png`, the mechanics snapshots, and the BetterBestiary parity corpus.
- `citations.lock.json` and `redactions.lock.json` change only through `compendium citations fix`, `compendium citations sync`, and `compendium redactions sync`, because each entry records a check that ran.

## Cross-cutting concerns

- **Versions.** Three markers agree after a game update: the installed Steam build, the snapshot recorded in `server-scripts/SNAPSHOT.toml`, and the published `COMPENDIUM_VERSION` in `website/src/lib/constants/version.ts`. `compendium build` refuses an export from a different game version than the snapshot, and verification marks an observation from a different assembly as stale.
- **The player's save.** `build-tool export` enters the world as the character in the player's save whose name sorts first. `build-tool verify` and zone-shot capture run in the scratch database, and `verify` backs the save up first.
- **Combat engine.** `website/src/lib/planner/` reproduces the game's combat pipeline. Fixtures in `verification/fixtures/` describe characters and measurements, `build-tool verify` records them, and the website tests compare them with the engine.

## Game runtime facts

These hold for mod, exporter, and HotRepl code alike.

- Il2CppInterop exposes a game field as a property, so reflection by field name finds nothing.
- `GetComponents<T>()` returns every match wrapped as `T`. All six attribute components report `PlayerAttribute`, so tell them apart by the member that holds them.
- On a client of a remote server, a plain server field reads as zero, and a SyncVar write changes only the local copy. Branch on `NetworkServer.active` and say which source a figure comes from. The [client and server reference](.agent/skills/hotrepl-runtime-inspection/references/client-and-server.md) lists what a client can read and change.
- A refused engine call returns normally and changes nothing. Read the value, act, then read it again.
- Times defined on the server, such as respawn deadlines, use `NetworkTime.time` plus the network manager's `offsetNetworkTime`, the sum that the game's `getServerTimeCorrected()` returns.
