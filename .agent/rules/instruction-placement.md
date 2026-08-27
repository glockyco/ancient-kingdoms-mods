---
description: Place an instruction by the moment it must arrive when adding or editing a context file, a rule, or a skill.
globs:
  - "AGENTS.md"
  - "**/AGENTS.md"
  - ".agent/**"
---
# Instruction placement

Keep an instruction only when its removal can cause a mistake. Placement is then decided by the moment
it must reach the agent, not by how broadly it applies.

| The instruction must arrive | It belongs in |
| --- | --- |
| At session open, or the agent misorients | the root `AGENTS.md` |
| Every turn, because a violation is unrecoverable | a rule carrying `alwaysApply` |
| When the agent's own output shows it is about to err | a rule carrying `condition` |
| While editing a known set of paths | a rule carrying `globs` |
| While following a named multi-step procedure | a skill |
| As deep detail behind one procedure | a reference beside that skill |
| Never, because a test, a linter, or the code carries it | nowhere |

## Why

- Only a context file at or above the session directory has its content injected. A file below it
  contributes its path alone, which is why a subproject constraint belongs in a rule whose `globs`
  name that subproject, and why a subproject `AGENTS.md` holds orientation and names its rule.
- A rule carrying `condition` costs nothing until the agent's own output matches it, then arrives
  beside the action. Guidance about a mistake made at one action belongs there.
- A skill body stays in context once it loads, so detail belongs in a reference.
- Adherence falls as the unconditionally loaded set grows, and adherence to an instruction from an
  earlier turn decays with turn count. Adding prose to a file that loads at session open is the
  weakest available response to a failure.

## Avoid

- A rule carrying both `globs` and `condition`. The path gate suppresses every trigger that names no
  file, so a rule about a shell command never fires.
- A triggered rule whose subject is a mistake nobody has made. State the incident in the body; a rule
  with no incident behind it is a guess.
- One rule covering several concerns. The trigger that fires for one delivers the rest as noise.
- A task-routing table. Skills and rules are discovered from their descriptions.

## Use

Each reference entry in a skill body states what a reader who skips it gets wrong, rather than naming
the file's subject. An entry that names a topic is read as optional.

Every `AGENTS.md` stays under 200 lines and every `SKILL.md` under 200, which is stricter than the
published ceiling for a skill body and is the repository's own budget.

## Exceptions

Orientation that a human contributor needs, and that no rule would carry, stays in the subproject
`AGENTS.md` even though the agent will not receive it.

## Incident

The previous routing sent subproject guidance to a file that does not load. A full working day of
edits under `mods/` ran with that subproject's constraints absent: one was rediscovered by experiment
and another was violated repeatedly.
