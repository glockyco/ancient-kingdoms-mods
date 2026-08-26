---
name: game-defect-reports
description: Reproduce, record, and prepare a report for a defect in the Ancient Kingdoms game itself. Use when game behaviour contradicts its own code or interface, when a runtime measurement disagrees with the decompiled source, when a stat or save value changes without a player action, when recording a defect for the developer, or when deciding whether a surprising observation is a game defect or a repository defect.
---

# Game defect reports

Record a defect in the game so the developer can act on it without access to this repository.

Reports live in `docs/game-bugs/`. One file holds one defect. `docs/game-bugs/README.md` indexes them.

## Boundary

Decide who owns the defect before you write anything.

| Observation | Owner | Action |
|---|---|---|
| The game contradicts its own code or interface | The game | Write a report in `docs/game-bugs/` |
| Published data disagrees with the game | This repository | Fix the exporter or the curated source |
| A tool misreads correct game behaviour | This repository | Fix the tool |

A repository defect never becomes a game report. When one observation exposes both, write the report and fix the repository defect in separate commits.

## Reproduce before you record

Treat a reading of the decompiled source as a hypothesis. A report needs an observation.

1. Read the source and state what you expect to see.
2. Point the game at a scratch database, so no run can reach player data. Use `game.useScratchDatabase` before the world opens. See `skill://hotrepl-runtime-inspection`.
3. Drive the game through its own commands. Prefer a `Cmd` handler over a field write, because a field write can produce a state the game cannot reach.
4. Record the value before the action, the action, and the value after it.
5. Repeat the sequence. A defect that appears once is an observation. A defect that repeats is evidence.
6. Confirm that the player save is unchanged. Compare its content hash against the hash from before the run.

State plainly which parts you observed and which parts you derived from source. Never present a derivation as a measurement.

## Instrumentation is not part of the defect

A reproduction often needs a state the player reaches by play, such as gold or a character level. Reaching that state through a command is instrumentation. Name it in the report and keep it out of the defect description.

A defect claim must not depend on a value that only a tool can set. When the claim needs such a value, the state is not reachable and the report is wrong.

## Screenshots

A screenshot shows an interface defect that numbers cannot. Capture one for every defect a player can see.

```sh
# The game writes to a Windows path. Create the directory on the host first.
H="./node_modules/.bin/hotrepl --url ws://127.0.0.1:18590"
SHOT='C:/Program Files (x86)/Steam/steamapps/common/Ancient Kingdoms/ui-shots'
$H eval "UnityEngine.ScreenCapture.CaptureScreenshot(\"$SHOT/name.png\"); \"requested\""
# The capture completes at the end of a frame. Wait before reading the file.
```

Capture the state before the action and the state after it. Capture a correct case beside the defect when the game handles a similar case correctly, because the contrast shows the intended behaviour.

Screenshots are about 2.5 MB each. Convert an image to WebP before you commit it, and commit only the images a report cites.

```sh
nix shell nixpkgs#libwebp --command cwebp -q 82 -resize 1400 0 in.png -o docs/game-bugs/evidence/out.webp
```

## Report contents

Use these sections. Keep the summary to one sentence.

- **Summary**: what the game does that it should not.
- **Build**: the version, the Steam build identifier, and the assembly hash. Read them from `server-scripts/SNAPSHOT.toml`.
- **Impact**: what a player loses or sees. State the size of the effect.
- **Steps to reproduce**: numbered player actions. A developer must be able to follow them without this repository and without mods.
- **Observed**: the measurements, as a table when there is more than one.
- **Expected**: the behaviour the game's own code or interface implies.
- **Cause**: the source lines that produce the behaviour, with file and line. Quote the decisive line.
- **Evidence**: screenshots and the commands that produced the readings.
- **Notes**: instrumentation used, and anything the report did not test.

## Mods and credibility

The measurements come from a modded, macOS CrossOver installation. A developer can dismiss a report for either reason, so remove both objections.

- Cite the source lines. The developer can then confirm the defect by reading, without reproducing it.
- Give steps a player can follow with no mods installed.
- Say that the mods only read state and drive the game's own commands, and that the defect is in game logic rather than in the platform.
- Do not report a defect that only appears under Wine until you have separated the platform from the game.

## Do not exploit a defect

A defect found is recorded, not relied on.

When a model or an exporter meets a defect, represent the intended behaviour and say so in the affected document. A published figure that depends on a defect becomes wrong when the developer fixes it.
