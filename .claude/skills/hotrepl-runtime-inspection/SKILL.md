---
name: hotrepl-runtime-inspection
description: Use when inspecting live Ancient Kingdoms game state, running a control command against the running game, or verifying REPL readiness via HotRepl.
---

# HotRepl Runtime Inspection

Use HotRepl to inspect or control Ancient Kingdoms while it is running. This is rare: most workflows are served by static exports, the build pipeline, or website code. Reach for HotRepl only when you genuinely need a live runtime view.

## When to use

- Verifying live IL2CPP/Unity state (monster counts, scene graph, player position).
- Running a registered control command against the game when one exists.
- Diagnosing why the game's exporter is not producing expected data.

## When NOT to use

- Verifying exported JSON files — use `build-pipeline` or read the file directly.
- Verifying website pages — use the website's own tooling.
- Adding game-specific control commands — that is mod work, separate from this skill.

## Workflow

```sh
# 1. Make sure the HotRepl host is deployed into the game's Mods/.
dotnet run --project build-tool deploy-host --hotrepl-repo /path/to/HotRepl

# 2. Launch the game and wait for MelonLoader bootstrap.
dotnet run --project build-tool launch --wait

# 3. From another terminal, query HotRepl. Connect by URL; the current
#    HotRepl CLI has no profile/auth/lease/control-list surface.
hotrepl --url ws://127.0.0.1:18590 info --json
hotrepl --url ws://127.0.0.1:18590 run world.summary '{}' --json
hotrepl --url ws://127.0.0.1:18590 run compendium.preflight '{}' --json
hotrepl --url ws://127.0.0.1:18590 describe compendium.export --json
```

`hotrepl` has its own `--help` for each subcommand; this skill does not restate it. Mutating
commands run directly: HotRepl v2 has no auth/lease handshake, loopback plus single-client
replacement is the trust boundary. Use `build-tool export` for the orchestrated `compendium.export`
job when the goal is producing exports, not poking the live runtime.

## Endpoint configuration

Use `--url` or set `HOTREPL_URL`. The current HotRepl CLI does not read profile files. Profile and
token concepts in older notes are stale.

## Available game-specific control commands

The `HotReplCommands` mod registers four typed commands (MelonLoader mod in `mods/HotReplCommands/`):

| Command                | Kind | Description                                                                                                                           |
| ---------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `compendium.preflight` | sync | Checks mod visibility, directory existence, scene, and player readiness.                                                              |
| `world.summary`        | sync | Returns active scene, network state, character count, and local-player status.                                                        |
| `compendium.export`    | job  | Runs world entry if needed, calls DataExporter and optionally MapScreenshotter, returns artifact refs. Args: `{"screenshots": bool}`. |
| `game.quit`            | sync | Calls `Application.Quit()` and returns `{"quitting": true}`.                                                                          |

Run `hotrepl --url ws://127.0.0.1:18590 info --json` and inspect handshake metadata, or call
`hotrepl --url ws://127.0.0.1:18590 describe <name> --json` for individual command descriptors.

## Boundary

`build-tool` owns deploy, launch, export orchestration, and Steam updates. `hotrepl` owns
connection, handshake metadata, eval, typed-command `run` and `describe`, artifact access, and
journal queries. Compose them; do not wrap one with the other.
