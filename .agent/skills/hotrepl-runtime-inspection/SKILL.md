---
name: hotrepl-runtime-inspection
description: Inspect or control the running Ancient Kingdoms game through HotRepl. Use when reading live game state, measuring live behaviour such as a timing or a cadence, verifying what a client of a remote server receives, running a typed control command, or verifying REPL readiness.
---

# HotRepl runtime inspection

## Workflow

1. Deploy the host with `build-tool deploy-host`. See `build-tool/Commands/DeployHostCommand.cs:DeployHostCommand`.
2. Launch the game and wait for the bootstrap. See `build-tool/Commands/LaunchCommand.cs:LaunchCommand`.
3. Query the running game from another terminal with `hotrepl`.

```sh
dotnet run --project build-tool deploy-host --hotrepl-repo <HotRepl-repo>
dotnet run --project build-tool launch --wait
hotrepl info --json
hotrepl run world.summary '{}' --json
hotrepl run world.enter '{}' --json
```

## Redirect the database before the first call

The redirect command owns the database selection and refuses a late redirect. See
`mods/HotReplCommands/Commands/UseScratchDatabaseCommand.cs:UseScratchDatabaseCommand`.

Call `game.useScratchDatabase` as the first command of a session. Then read what you came for. The
result reports the path it opened and whether that path is a scratch one, so the redirect is
confirmed rather than assumed. The redirect also decides which characters a run can use, because the
roster comes from the local database.

## The roster is capped, and the selection screen caches it

The selection screen caps the roster in `server-scripts/UICharacterSelection.cs:SelectCharacterPreview`.

`fixture.createCharacter` can remove the exact `replaceCharacterName` from an earlier fixture attempt.
It returns `rosterSlotFreed` without creating the replacement because the selection screen keeps the list
it already read. Quit, relaunch, redirect the database again, then retry the creation.

A run that creates characters therefore has a budget. Give each fixture a name that says which run made
it. Pass only one of those owned names as `replaceCharacterName`. Never let the command choose a player
character to remove.

## Refusals are the guard, not an obstacle

`game.useScratchDatabase` refuses once the game has opened its own database, which happens when the
start screen appears. A slow start to a session reaches that point.

Treat the refusal as the guard working. Do not continue into anything that creates or changes a
character after it, because the target is then player data. Quit, relaunch, and redirect first.

## One endpoint for each instance

Two instances on one port do not both serve. The first keeps the endpoint, so every later command
answers from the older process while the newer window is the one on screen. Give a second instance a
different `HOTREPL_PORT`. `build-tool launch` passes it through via
`build-tool/Game/WineEnvironment.cs:ReplPortVariable`. The default endpoint is documented in
`node_modules/@hotrepl/cli/README.md`.

Before relaunching, check for an orphaned `ancientkingdoms.exe` process.

Quit with `game.quit` at the end of a session. A hard kill is safe for player data when the run
redirected the database. The player save keeps its content hash and leaves no write-ahead sidecar.

## References

Each entry states what goes wrong without it, because a reader who judges relevance from a topic
usually decides the topic does not apply.

- `.agent/skills/hotrepl-runtime-inspection/references/observing-behaviour.md`. Read this before any
  measurement. Without it a measurement runs one shell call at a time, the subject dies between calls,
  and the window returns nothing. It also covers the two events that refuse a listener and the
  coroutine failure that holds the only job slot. A screenshot settles an empty result that scalars
  cannot.
- `.agent/skills/hotrepl-runtime-inspection/references/commands.md`. Read this before driving the game
  by hand. Without it a typed command that already does the work is reimplemented as an `eval`, and
  its arguments and reported fields are guessed.
- `.agent/skills/hotrepl-runtime-inspection/references/client-and-server.md`. Read this before
  reporting any figure read from a client. Without it a plain server field reads as zero rather than
  failing, and the zero is published as a measurement.

