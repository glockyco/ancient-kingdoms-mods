---
name: hotrepl-runtime-inspection
description: Use when inspecting live Ancient Kingdoms game state, running a control command against the running game, or verifying REPL readiness via HotRepl.
---

# HotRepl Runtime Inspection

Use HotRepl to inspect or control Ancient Kingdoms while it is running. This is rare: most workflows are served by static exports, the build pipeline, or website code. Reach for HotRepl only when you genuinely need a live runtime view.

## When to use

- Verifying live IL2CPP/Unity state (monster counts, scene graph, player position).
- Running a leased mutating control command against the game when one exists.
- Diagnosing why the game's exporter is not producing expected data.

## When NOT to use

- Verifying exported JSON files — use `build-pipeline` or read the file directly.
- Verifying website pages — use the website's own tooling.
- Adding game-specific control commands — that is mod work, separate from this skill.

## Workflow

```sh
# 1. Make sure the HotRepl host is deployed into the game's Mods/.
dotnet run --project build-tool deploy-host

# 2. Launch the game and wait for MelonLoader bootstrap.
dotnet run --project build-tool launch --wait

# 3. From another terminal, query HotRepl using the profile written by setup.
hotrepl --profile ancient-kingdoms doctor --json
hotrepl --profile ancient-kingdoms wait --json

# 4. For leased mutating commands, when registered:
hotrepl --profile ancient-kingdoms control run <registered-command> '{}' \
  --lease --wait --jsonl
```

`hotrepl` has its own `--help` for each subcommand; this skill does not restate it.

## Profile setup

`dotnet run --project build-tool setup` offers to upsert an `ancient-kingdoms` profile into your HotRepl profile file. Decline if you prefer to author it manually; the rest of `build-tool` does not require the profile.

Tokens never enter this repository. The profile references a token source (env var, token file, BepInEx config) under your control.

## Available game-specific control commands

The `HotReplCommands` mod registers four typed commands (MelonLoader mod in `mods/HotReplCommands/`):

| Command | Kind | Description |
|---------|------|-------------|
| `compendium.preflight` | sync | Checks mod visibility, directory existence, scene, and player readiness. |
| `world.summary` | sync | Returns active scene, network state, character count, and local-player status. |
| `compendium.export` | job | Runs world entry if needed, calls DataExporter and optionally MapScreenshotter, returns artifact refs. Args: `{"screenshots": bool}`. |
| `game.quit` | sync | Calls `Application.Quit()` and returns `{"quitting": true}`. |

Run `hotrepl doctor` or `hotrepl --profile ancient-kingdoms control list` against a live game to confirm registration.

## Boundary

`build-tool` owns deploy, launch, export orchestration, and Steam updates. `hotrepl` owns discovery, profiles, auth, readiness, and control execution. Compose them; do not wrap one with the other.
