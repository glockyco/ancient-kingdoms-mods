---
name: hotrepl-runtime-inspection
description: Inspect or control the running Ancient Kingdoms game through HotRepl. Use when reading live game state, measuring live behaviour such as a timing or a cadence, verifying what a client of a remote server receives, running a typed control command, or verifying REPL readiness.
---

# HotRepl runtime inspection

Use HotRepl to inspect or control Ancient Kingdoms while it runs. This is rare. Most work is served
by static exports, the build pipeline, or website code. Reach for HotRepl only when a live runtime
view is the only source of the answer.

## When to use

- Reading live IL2CPP or Unity state, such as monster counts, the scene graph, or a player position.
- Measuring behaviour the source only implies, such as how often a monster acts.
- Verifying behaviour that only a client of a remote server shows.
- Running a registered control command.
- Diagnosing why the game's exporter produces no data.

## When not to use

- Verifying exported JSON. Read the file or use `build-pipeline`.
- Verifying website pages. Use the website's own tooling.
- Adding a control command. That is mod work.

## Workflow

```sh
# 1. Deploy the HotRepl host into the game's Mods/.
dotnet run --project build-tool deploy-host --hotrepl-repo /path/to/HotRepl

# 2. Launch the game and wait for the MelonLoader bootstrap.
dotnet run --project build-tool launch --wait

# 3. Query from another terminal. `hotrepl` is @hotrepl/cli, a root pnpm devDependency, so a
#    checkout with `pnpm install` run already has ./node_modules/.bin/hotrepl.
hotrepl --url ws://127.0.0.1:18590 info --json
hotrepl --url ws://127.0.0.1:18590 run world.summary '{}' --json
hotrepl --url ws://127.0.0.1:18590 run world.enter '{}' --json
```

Each subcommand has its own `--help`, which this skill does not restate. Mutating commands run
without a handshake. Loopback plus single-client replacement is the trust boundary. Use
`build-tool export` for an orchestrated export instead of driving `compendium.export` by hand.

## Redirect the database before the first call

`Il2Cpp.Database` reaches whichever database the game has open. At the start screen the connection is
closed, so a read throws an IL2CPP stack trace, and `Il2Cpp.Database.Connect()` opens the game's own
database.

Call `game.useScratchDatabase` as the first command of a session. Then read what you came for. The
result reports the path it opened and whether that path is a scratch one, so the redirect is
confirmed rather than assumed. The redirect also decides which characters a run can use, because the
roster comes from the local database.

## The roster is capped, and the selection screen caches it

A database holds eight characters. A ninth cannot be created, and the refusal reads as the selection
screen not offering creation rather than as a full roster.

`Il2Cpp.Database.CharacterDelete(name)` frees a slot, but the selection screen keeps the list it already
read, so creation stays refused in that session. Delete, then relaunch, then create.

A run that creates characters therefore has a budget. Give each fixture a name that says which run made
it, and clear them when a session ends rather than accumulating across sessions.

## Refusals are the guard, not an obstacle

`game.useScratchDatabase` refuses once the game has opened its own database, which happens when the
start screen appears. A slow start to a session reaches that point.

Treat the refusal as the guard working. Do not continue into anything that creates or changes a
character after it, because the target is then player data. Quit, relaunch, and redirect first.

## One endpoint for each instance

`build-tool launch --wait` returns once the host is ready, and the game keeps running afterwards. A
session that ends without `game.quit` leaves the game running.

Two instances on one port do not both serve. The first keeps 18590, so every later command answers
from the older process while the newer window is the one on screen. Give a second instance its own
port with `HOTREPL_PORT`, which `build-tool launch` passes through.

```sh
ps aux | grep "[a]ncientkingdoms.exe"     # expect no output before the first launch
pkill -f ancientkingdoms.exe              # only when an orphan is confirmed
```

Quit with `game.quit` at the end of a session. A hard kill is safe for player data when the run
redirected the database. The player save keeps its content hash and leaves no write-ahead sidecar.

## Endpoint configuration

Use `--url` or set `HOTREPL_URL`. The CLI reads no profile file. Profile and token concepts in older
notes are stale.

## References

Each entry states what goes wrong without it, because a reader who judges relevance from a topic
usually decides the topic does not apply.

- `.agent/skills/hotrepl-runtime-inspection/references/observing-behaviour.md`. Read this before any
  measurement. Without it a measurement is driven one shell call at a time, the subject dies or walks
  away between calls, and the window returns nothing with no indication why. It also carries the two
  events that cannot be subscribed to, the coroutine failure that holds the only job slot until the
  game restarts, and why a screenshot settles an empty result that scalars cannot.
- `.agent/skills/hotrepl-runtime-inspection/references/commands.md`. Read this before driving the game
  by hand. Without it a typed command that already does the work is reimplemented as an `eval`, and
  its arguments and reported fields are guessed.
- `.agent/skills/hotrepl-runtime-inspection/references/client-and-server.md`. Read this before
  reporting any figure read from a client. Without it a plain server field reads as zero rather than
  failing, and the zero is published as a measurement.

## Boundary

`build-tool` owns deploy, launch, export orchestration, and Steam updates. `hotrepl` owns connection,
handshake metadata, eval, typed-command `run` and `describe`, artifact access, and journal queries.
Compose them. Do not wrap one with the other.
