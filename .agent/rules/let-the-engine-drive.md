---
description: Issue a repeating game action once and let the engine re-issue it, when using a skill-use command to drive the game.
condition: "\\bCmdUse\\("
scope: "tool"
interruptMode: "never"
---
Issue the action once. A basic attack re-issues itself, so a second send competes with the engine's loop
instead of measuring it.

## Why

The interval that comes back is the sender's. An empty window means an unarmed loop or a subject that
cannot reach its target, not a subject that cannot act.

## Use

Check the subject's state, its distance to the target, and the loop flag together.
`server-scripts/PlayerSkills.cs:CmdUse` owns the call. The cast-range limit that stops the loop while
the subject still looks ready is under "Let the game drive a repeated action" in
`skill://hotrepl-runtime-inspection`.

## Exceptions

A skill that does not follow up with the default attack. Read
`server-scripts/ScriptableSkill.cs:followupDefaultAttack` rather than assuming.

## Incident

A driver sent the attack command every 100 ms for 40 seconds against a loop the engine was already
running. The intervals that came back described the driver.
