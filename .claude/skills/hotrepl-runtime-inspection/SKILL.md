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
hotrepl --profile ancient-kingdoms wait --commands compendium.preflight

# 4. For leased mutating commands, when registered:
hotrepl --profile ancient-kingdoms control run compendium.preflight '{}' \
  --lease --wait --jsonl
```

`hotrepl` has its own `--help` for each subcommand; this skill does not restate it.

## Profile setup

`dotnet run --project build-tool setup` offers to upsert an `ancient-kingdoms` profile into your HotRepl profile file. Decline if you prefer to author it manually; the rest of `build-tool` does not require the profile.

Tokens never enter this repository. The profile references a token source (env var, token file, BepInEx config) under your control.

## Available game-specific control commands

As of this skill's writing, none. The DataExporter mod may register commands such as `compendium.preflight` and `compendium.export` in follow-up specs. Run `hotrepl doctor` against a live game to see what is actually registered.

## Boundary

`build-tool` owns deploy, launch, export orchestration, and Steam updates. `hotrepl` owns discovery, profiles, auth, readiness, and control execution. Compose them; do not wrap one with the other.
