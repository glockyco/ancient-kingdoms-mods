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

Load one of these when the task needs it.

- `.agent/skills/hotrepl-runtime-inspection/references/commands.md`: the typed control commands the
  repository's mods register, with their arguments and what each reports.
- `.agent/skills/hotrepl-runtime-inspection/references/client-and-server.md`: which process holds
  server authority, which state reaches a client, what a client write does, and how to run a host and
  a client together.
- `.agent/skills/hotrepl-runtime-inspection/references/observing-behaviour.md`: how to measure live
  behaviour without the agent's own latency, and how to hold a subject in the state under
  measurement.

## Boundary

`build-tool` owns deploy, launch, export orchestration, and Steam updates. `hotrepl` owns connection,
handshake metadata, eval, typed-command `run` and `describe`, artifact access, and journal queries.
Compose them. Do not wrap one with the other.
