# Design

## Context

- `Tracker.Refresh` ran `ScanClones` once a second. It called `Object.FindObjectsOfType(Monster)` and read the name of every active monster, to find live instances of the nine tracked monsters without a placement: eight altar bosses and one placeholder spawn. They are new objects each time the game spawns them (`server-scripts/Monster.cs:2970-2979` for the placeholder).
- Measured on 2026-11-03 on a host in The Lone-Lands, game 0.10.2.3 under CrossOver, with a frame profiler that times every player-loop phase and Pocket Compendium's methods (`.local/research/2026-11-03-pocket-compendium-stutter/`):
  - `FindObjectsOfType` alone took 44 ms and returned 470 active monsters. The unsorted `FindObjectsByType` took 22 ms. Casting, names and health of all 470 took under 3 ms together.
  - Walking for 25 s with every feature on gave 1.2 frames per second over twice the median, p99 65 ms. 25 of the 30 frames over 33 ms ran the search. With the search skipped, and with every feature off, the same walk gave 0.0 and 0.08 such frames per second and p99 25 ms.
- The game runs `Monster.Start` once for each monster object, on a host when its server code instantiates one and on a client when Mirror spawns one. A postfix on it saw an altar boss that HotRepl spawned with `NetworkServer.Spawn` in the next frame.
- Other per-frame costs measured in the same runs, none of which recurs as a long frame: Pocket Compendium's own update about 0.35 ms a frame, the canvas update 0.2 ms more than without the mod, a first marker or arrow view about 9 ms once per monster, a client's save of its world memory 0.3 ms every 10 s, and the tracking session's start 0.43 s at world entry. A walk of 5.5 minutes kept the mod's objects and the managed heap constant.

## Goals / Non-Goals

**Goals:**

- No recurring long frame from tracking.
- The same altar and placeholder state as before: a living spawn is up, a destroyed one leaves the altar or placeholder state.

**Non-Goals:**

- The one-time costs above, the session start at world entry and the first view of a monster, and the steady per-frame cost. None of them recurs while the player walks.

## Decisions

### Learn of spawns from the game's monster start

A Harmony postfix on `Monster.Start` passes each started monster to the tracker, which keeps it under its tracked monster when the name belongs to one without a placement. Each refresh drops the spawns the game destroyed and reads the last living one in the scene, otherwise the first one in the scene, as the search picked before.

Alternatives:

- Searching less often. The stall stays, only less often.
- Mirror's spawned objects. A host's `NetworkServer.spawned` holds every networked object of the world, about 7,700 in the census of the simulator's profile, and reading a component of each costs more than the stall.
- A physics overlap around each altar and placeholder source. A spawn walks away from where it appeared.

### Search once when a session starts

A spawn that the game started before the session, such as a living altar boss on a server the player joins, or one alive while the player switched every tracking feature off and on, gets no start. `Tracker.StartSession` searches the scene once, inactive objects included, because a spawn in a zone that sleeps at that moment must count once the zone wakes.

## Risks / Trade-offs

- [The postfix fails] → It logs one error, which reaches the problem report, and stops noticing spawns. Altar and placeholder monsters then show their altar or placeholder state until the next world.
- [IL2CPP inlines `Monster.Start` into a caller] → Unity calls `Start` through its own invocation, which the patch reaches. The in-game check covers a spawn through `NetworkServer.Spawn`.
