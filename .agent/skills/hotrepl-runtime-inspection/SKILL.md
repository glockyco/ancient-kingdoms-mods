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
#    The `hotrepl` binary is `@hotrepl/cli`, a root pnpm devDependency
#    (`pnpm add -D -w @hotrepl/cli`), so a checkout with `pnpm install` run
#    already has it at ./node_modules/.bin/hotrepl.
hotrepl --url ws://127.0.0.1:18590 info --json
hotrepl --url ws://127.0.0.1:18590 run world.summary '{}' --json
hotrepl --url ws://127.0.0.1:18590 run compendium.preflight '{}' --json
hotrepl --url ws://127.0.0.1:18590 run world.enter '{}' --json
hotrepl --url ws://127.0.0.1:18590 describe compendium.export --json
```

`hotrepl` has its own `--help` for each subcommand; this skill does not restate it. Mutating
commands run directly: HotRepl v2 has no auth/lease handshake, loopback plus single-client
replacement is the trust boundary. Use `build-tool export` for the orchestrated `compendium.export`
job when the goal is producing exports, not poking the live runtime.

## Redirect before the first database call

`Il2Cpp.Database` reaches whichever database the game has open. At the start screen the connection is
closed, so a read throws an IL2CPP stack trace, and `Il2Cpp.Database.Connect()` would open the game's
own. Either way, reading an asset first and redirecting later is the order that puts player data in
reach.

Call `game.useScratchDatabase` as the first command of a session, then read what you came for. Its
result reports the path it opened and whether that path is a scratch one, so the redirect is confirmed
rather than assumed.

## One instance at a time

`build-tool launch --wait` returns once the runtime host is ready, and the game keeps running after
it returns. A session that ends without `game.quit` therefore leaves the game running.

A second instance does not take the endpoint. The first one keeps port 18590, so every later command
answers from the older process while the newer window is the one on screen. Readings then describe a
game that is not the one under test, and the mistake looks like a defect in the code being verified.

Before a launch, confirm that no instance is running. Quit with `game.quit` at the end of a session.

```sh
ps aux | grep "[a]ncientkingdoms.exe"     # expect no output before launching
pkill -f ancientkingdoms.exe              # only when an orphan is confirmed
```

A hard kill is safe for player data when the run redirected the database. The player save keeps its
content hash and no write-ahead sidecar is left behind.

## Endpoint configuration

Use `--url` or set `HOTREPL_URL`. The current HotRepl CLI does not read profile files. Profile and
token concepts in older notes are stale.

## Available game-specific control commands

The `HotReplCommands` mod registers six typed commands (MelonLoader mod in `mods/HotReplCommands/`):

| Command                | Kind | Description                                                                                                                           |
| ----------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `compendium.preflight` | sync | Checks mod visibility, directory existence, scene, and player readiness.                                                              |
| `world.summary`        | sync | Returns active scene, network state, character count, and local-player status.                                                        |
| `world.enter`          | job  | Drives the game to a spawned local player, without exporting. Reports the character it entered as. Args: `{"character": string?}`; omitted selects the lowest name in ordinal order. |
| `compendium.export`    | job  | Runs world entry if needed, calls DataExporter and optionally MapScreenshotter, returns artifact refs. Args: `{"screenshots": bool}`. |
| `game.quit`            | sync | Calls `Application.Quit()` and returns `{"quitting": true}`.                                                                           |
| `game.useScratchDatabase` | sync | Points the database at a scratch file beside the game's own, so a run that creates or changes characters cannot reach player data. Refuses once the connection is open, so call it first, before any `Il2Cpp.Database` call and before entering the world. |

The `CombatVerification` mod registers four typed commands (MelonLoader mod in `mods/CombatVerification/`):

| Command                     | Kind | Description                                                                                                                                                                 |
| --------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fixture.validate`          | sync | Checks a fixture against rules read from the running game. Needs a spawned player, because the class prefabs are unreadable before one exists. Reads only.                    |
| `fixture.createCharacter`   | job  | Creates one character by driving the character creator. Needs character selection open, so call it before world entry. Refuses when the roster holds eight characters. Args: `{"characterName": string, "class": string, "race": string}`. Reports the stored class, race and level. |
| `probe.statSheet`           | sync | Reads the complete combat state of the player and each companion: every attribute, every stat the combat component computes, resource maxima and multipliers, each occupied slot with what it contributes, and each armour set with its piece count and declared bonuses. Reads only, so two readings with no action between them agree. Args: `{}`. |
| `fixture.buildCharacter`    | job  | Brings the spawned player to a fixture's declared level, veteran points, attributes, skill levels, equipment and companions. Empties a slot the fixture does not declare, because a created character wears starter equipment. Runs once on a newly created character, and world entry serves one character per session. Args: `{"character": <the character section of a fixture>, "companions": [...]}`. Reports each step. |

Run `hotrepl --url ws://127.0.0.1:18590 info --json` and inspect handshake metadata, or call
`hotrepl --url ws://127.0.0.1:18590 describe <name> --json` for individual command descriptors.

## Boundary

`build-tool` owns deploy, launch, export orchestration, and Steam updates. `hotrepl` owns
connection, handshake metadata, eval, typed-command `run` and `describe`, artifact access, and
journal queries. Compose them; do not wrap one with the other.
