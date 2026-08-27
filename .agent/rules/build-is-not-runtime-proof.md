---
description: Exercise a runtime change in the running game after deploying a mod, before reporting it as working.
condition: "build-tool\\s+deploy"
scope: "tool"
interruptMode: "never"
---
A deploy that copies is not a change that works. Launch the game, drive the path that changed, and read
the result.

## Why

A Harmony patch, a registered command and an interop call each compile, then fail at runtime. They fail
silently: a missing generic instantiation, a refused engine call and a dead coroutine all return
nothing rather than an error. Read `MelonLoader/Latest.log` when a runtime step reports nothing.

## Use

For a patch, confirm it reports as applied. For a command, confirm it is registered. For a reading,
confirm the value is what the game holds.

## Exceptions

Code the runtime cannot reach, such as a test double. Say which.

## Incident

A patch and two probes were reported working from a green build. The patch had moved namespace. One
probe held the only job slot after dying inside its coroutine. One listener could not attach, because
its generic instantiation does not exist ahead of time.
