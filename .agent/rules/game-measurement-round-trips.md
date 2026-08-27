---
description: Measure live game behaviour inside one coroutine when reading or driving the running game through an ad-hoc eval.
condition: "hotrepl[\\s\\S]{0,400}?\\beval\\b"
scope: "tool"
interruptMode: "never"
---
Run the whole measurement inside the game. A shell round trip costs seconds, and an agent turn costs
tens of seconds, so a state established in one call and read in the next has a turn of game time
between them.

## Why

- The subject moves. It dies, respawns in a town, loses its target, or walks out of range.
- Two samples taken a turn apart describe two different situations, and the difference between them
  is attributed to whatever was being measured.
- A state has to be asserted every frame, not once, because the game undoes it.

## Avoid

One call to set up, another to read. The reading belongs to a situation that has already ended.

## Use

One coroutine that establishes the state, holds it, samples, and appends to a static list. Read the
list once when it finishes.

```csharp
for (int f = 0; f < 180; f++)
{
    p.combat.Networkinvincible = true;              // assert every frame
    if (p.state == "DEAD") p.CmdRespawn();          // health alone does not clear death
    if (Vector2.Distance(p.transform.position, dest) > 3f)
    {
        p.movement.Reset();                          // a respawn leaves a walk destination
        p.movement.Warp(dest);
    }
    yield return null;
}
```

## Exceptions

A single read of one value that nothing is changing. Reading a stat, a count, or a scene name needs
no coroutine.

## Incident

Four measurement points were measured a call at a time and returned nothing, because the subject was
dead for most of them. The same four inside one coroutine took one round trip.
`skill://hotrepl-runtime-inspection` and its measurement reference carry the full procedure.
