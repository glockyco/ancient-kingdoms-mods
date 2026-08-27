---
description: Measure live game behaviour inside one coroutine when reading or driving the running game through an ad-hoc eval.
condition: "hotrepl[\\s\\S]{0,400}?\\beval\\b"
scope: "tool"
interruptMode: "never"
---
Run the whole measurement inside the game. A shell round trip costs seconds and an agent turn costs
tens of seconds, so a state established in one call and read in the next has a turn of game time
between them, and the subject moves in it: it dies, respawns in a town, loses its target, or walks out
of range.

One coroutine establishes the state, holds it, samples, and appends to a static list. Read the list
once when it finishes. A state has to be re-asserted every frame, because the game undoes it.

The loop, with the four assertions it needs, is under "Sample inside the game, not from the shell" in
`skill://hotrepl-runtime-inspection`.

## Exceptions

A single read of one value that nothing is changing. Reading a stat, a count, or a scene name needs
no coroutine.

## Incident

Four measurement points were measured a call at a time and returned nothing, because the subject was
dead for most of them. The same four inside one coroutine took one round trip.
