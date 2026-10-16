---
name: hotrepl-runtime-inspection
description: Inspect or control the running Ancient Kingdoms game through HotRepl. Use when reading live game state, measuring live behaviour such as a timing or a cadence, verifying what a client of a remote server receives, running a typed control command, or verifying REPL readiness.
---

# HotRepl runtime inspection

## Workflow

1. Deploy the host with `build-tool deploy-host`. See `build-tool/Commands/DeployHostCommand.cs:DeployHostCommand`.
2. Launch the game and wait for the bootstrap. See `build-tool/Commands/LaunchCommand.cs:LaunchCommand`.
3. Query the running game from another terminal with `pnpm exec hotrepl`.

HotRepl accepts one WebSocket client. A new client disconnects the existing client, including one that only requests a handshake.
Do not run `pnpm exec hotrepl info` or another client while `build-tool export` owns the connection.
Use a TCP connection without a WebSocket handshake to check whether the endpoint is occupied.

```sh
dotnet run --project build-tool deploy-host --hotrepl-repo <HotRepl-repo>
dotnet run --project build-tool launch --wait
pnpm exec hotrepl info --json
pnpm exec hotrepl run game.useScratchDatabase '{}' --json
pnpm exec hotrepl run world.summary '{}' --json
pnpm exec hotrepl run world.enter '{}' --json
```

## Redirect before database access

The redirect command owns the database selection and refuses a late redirect. See
`mods/HotReplCommands/Commands/UseScratchDatabaseCommand.cs:UseScratchDatabaseCommand`.

Call `game.useScratchDatabase` before a command that can open or write the database.
A read-only `world.summary` call can confirm the launch identity before the redirect.
The redirect result reports the opened path and whether it is a scratch path.
It also determines the available characters because the roster comes from the selected database.

Confirm the reported path before continuing.

## The roster is capped, and the selection screen caches it

The selection screen caps the roster in `server-scripts/UICharacterSelection.cs:SelectCharacterPreview`.

`character.create` can remove the exact `replaceCharacterName` from an earlier run.
It returns `rosterSlotFreed` without creating the replacement because the selection screen keeps the list
it already read. Quit, relaunch, redirect the database again, then retry the creation.

A run that creates characters therefore has a budget. Give each created character a name that says
which run made it. Pass only one of those owned names as `replaceCharacterName`. Never let the command
choose a player character to remove.

## Refusals are the guard, not an obstacle

`game.useScratchDatabase` refuses once the game has opened its own database, which happens when the
start screen appears. A slow start to a session reaches that point.

Treat the refusal as the guard working. Do not continue into anything that creates or changes a
character after it, because the target is then player data. Quit, relaunch, and redirect first.

## Capture zone shots

`compendium build` needs a shot of every published zone, framed by
`build-pipeline/zone_shot_focal_points.json`. Capture them in a scratch session. With the mods
deployed and the game closed:

```sh
dotnet run --project build-tool launch --wait
pnpm exec hotrepl run game.useScratchDatabase '{}' --json   # must report isScratch=true
# Only when the scratch roster lacks HomeArt:
pnpm exec hotrepl run character.create '{"characterName":"HomeArt","class":"warrior","race":"human"}' --json
pnpm exec hotrepl run world.enter '{"character":"HomeArt"}' --json
pnpm exec hotrepl run capture.zoneShots '{}' --json
pnpm exec hotrepl run game.quit '{}' --json
```

Before launching, create `ancientkingdoms_Data/verification-scratch/` in the game folder if it is
missing. `game.useScratchDatabase` refuses a missing directory or a linked path. It opens
`game.dat` inside that directory, which need not already exist. If a redirect is refused, quit,
prepare the directory, then relaunch and redirect before the player database opens.
`references/commands.md` gives the focal-point format and the capture's options.

## One endpoint for each instance

Two instances on one port do not both serve. The first keeps the endpoint, so every later command
answers from the older process while the newer window is the one on screen. Give a second instance a
different `HOTREPL_PORT`. `build-tool launch` passes it to the game, and every `build-tool` command
connects its own client to the same port (`build-tool/Configuration/LocalConfigLoader.cs:ResolveHotReplEndpoint`).
For the CLI, set `HOTREPL_URL` to match. The default endpoint is documented in
`node_modules/@hotrepl/cli/README.md`.

Other programs on the machine may already serve HotRepl on that port, such as another project's game
or a sim worker. Wine lets a second process bind the same port, so a client then reaches either one,
and two clients displace each other. Check the port with `lsof -nP -iTCP:<port> -sTCP:LISTEN` before
launching, and use a free one.

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

