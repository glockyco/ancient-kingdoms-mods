---
description: Issue a repeating game action once and let the engine re-issue it, when using a skill-use command to drive the game.
condition: "\\bCmdUse\\("
scope: "tool"
interruptMode: "never"
---
Issue the action once. A basic attack re-issues itself, so the engine keeps acting at the cadence it
enforces, and sending the command repeatedly competes with that loop instead of measuring it.

## Why

- A skill that follows up with the default attack arms the engine's own loop.
- Repeated sends interleave with the loop, so the observed interval belongs to the sender.
- The loop stops for reasons that leave the subject looking ready: no attackable target, or a target
  beyond cast range, which for a melee skill is about one unit.

## Avoid

```csharp
for (int i = 0; i < 400; i++)
{
    ps.CmdUse(1, dir);                    // competes with the engine's own re-issue
    yield return new WaitForSeconds(0.1f);
}
```

## Use

```csharp
ps.CmdUse(1, dir);                        // arms the loop; the engine drives it
```

Then read. An empty window means an unarmed loop or a subject that cannot reach its target, not a
subject that cannot act. Check the subject's state, its distance to the target, and the loop flag
together.

## Exceptions

A skill that does not follow up with the default attack has to be issued each time. Check the
skill's own follow-up flag rather than assuming.

## Incident

A driver sent the attack command every 100 ms for 40 seconds against a loop the engine was already
running, and the intervals that came back described the driver.
