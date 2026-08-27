---
description: Exercise a runtime change in the running game after deploying a mod, before reporting it as working.
condition: "build-tool\\s+deploy"
scope: "tool"
interruptMode: "never"
---
A deploy that copies is not a change that works. Launch the game and exercise the path that changed
before reporting anything about it.

## Why

- A Harmony patch, a registered command, and an interop call all compile and then fail to apply,
  register, or resolve at runtime.
- A missing generic instantiation, a refused engine call and an unhandled coroutine each present as
  a silent nothing rather than an error.
- The log records what the build cannot: read `MelonLoader/Latest.log` when a runtime step reports
  nothing.

## Use

Launch, drive the changed path, and read the result. For a patch, confirm it reports as applied. For
a command, confirm it is registered. For a reading, confirm the value is what the game holds.

## Exceptions

A change that only alters code the runtime cannot reach, such as a test double or a comment. State
which, rather than leaving the reason unsaid.

## Incident

A patch and two probes were reported as working from a green build. One patch had moved namespace,
one probe held the only job slot after dying inside its coroutine, and one listener could not attach
at all because the generic instantiation does not exist ahead of time.
