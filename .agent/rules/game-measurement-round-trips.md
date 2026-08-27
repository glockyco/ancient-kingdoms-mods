---
description: Measure live game behaviour inside one coroutine when reading or driving the running game through an ad-hoc eval.
condition: "hotrepl[\\s\\S]{0,400}?\\beval\\b"
scope: "tool"
interruptMode: "never"
---
Run the whole measurement inside the game. A state set in one call and read in the next has a turn of
game time between them, and the subject moves in it.

## Why

The subject dies, respawns in a town, loses its target, or walks out of range. A state has to be
re-asserted every frame, because the game undoes it.

## Use

One coroutine establishes the state, holds it, samples, and appends to a static list. Read the list
once when it finishes. The loop and its four assertions are under "Sample inside the game, not from the
shell" in `skill://hotrepl-runtime-inspection`.

## Exceptions

A single read of one value that nothing is changing.

## Incident

Four measurement points were driven a call at a time and returned nothing, because the subject was dead
for most of them. The same four inside one coroutine took one round trip.
