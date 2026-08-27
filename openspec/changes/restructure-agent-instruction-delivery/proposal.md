# Restructure agent instruction delivery

## Why

Instruction content exists and does not arrive. In one working day the agent made 116 file changes
under `mods/` while `mods/AGENTS.md` was never in its context, because a context file below the
session directory contributes a pointer rather than content. It rediscovered by trial and error a
fact that file states verbatim, and it violated another of that file's rules repeatedly. Separately,
a measurement procedure written in a skill reference went unread for a whole day of measuring,
because a reference is invisible until the agent chooses to read the skill body.

The capability that governs this already states a routing table, and two of its claims are false.
It sends subproject guidance to a file that does not load, and it asserts that guidance which must
never be missed belongs in an `AGENTS.md` because rules are read on demand. The runtime offers a
rule form that is injected next to the action that needs it, at zero cost until then, and the table
has no row for it. The repository has written none of those rules; the runtime ships 28 of them, and
exactly one instruction changed the agent's behaviour mid-action all day: one of those 28.

The response to each failure has been to write more prose. Today that added 466 lines to channels
that only load when the agent elects to read them, which is the failure being repaired.

## What Changes

- **BREAKING** The routing table in `agent-instructions` is replaced. Placement is decided by the
  moment an instruction must arrive, not by how broadly it applies. Two existing rows are wrong and
  are removed.
- A subproject constraint that an agent must not miss moves out of that subproject's `AGENTS.md`
  into a rule with `globs`, so it is listed and addressable from a session started anywhere in the
  repository. Subproject `AGENTS.md` files keep only orientation for a human reader.
- Guidance about a mistake an agent makes at a specific action is authored as a triggered rule,
  carrying `condition` or `astCondition` so it arrives beside the action. Each such rule names the
  incident that motivated it.
- A triggered rule that never fires is deleted, on the same principle the repository already applies
  to a mechanism that produces nothing.
- The always-loaded surface shrinks. Imperatives that only matter at one action leave `AGENTS.md`
  for triggered rules; the size budget is restated against the researched limits rather than one
  round number.
- Skill and reference authoring adopts the published limits: a description that states what and
  when within its character cap, a body bounded in lines and tokens, references one level deep, and
  a contents list once a reference grows past a hundred lines.
- A skill body that lists references states what a reader loses by not opening each one, replacing
  the current invitation to load them only if the task seems to need it.
- A research subagent returns its report intact. Today two of five research reports were destroyed
  by an output shape that discarded their tables, and the repository can own the agent definition
  that fixes it.
- The automated check gains the new invariants, so each is enforced at commit time rather than
  described.

Deliberately not changed: no runtime hook is introduced. A hook can veto a tool call, and the two
candidate invariants that would justify one already fail closed inside the tools themselves, so a
hook would add an untested code surface without adding protection. The design records hooks as the
escalation path and the condition that would trigger it.

## Capabilities

### New Capabilities

None. The change corrects and extends an existing capability.

### Modified Capabilities

- `agent-instructions`: the routing table is replaced, the claim that unmissable guidance belongs in
  an `AGENTS.md` is withdrawn, the size budget is restated, and requirements are added for triggered
  rules, for subproject constraints, for reference discoverability, for removing rules that never
  fire, and for subagent report integrity.

## Impact

- `AGENTS.md` at the repository root loses its action-specific imperatives and keeps orientation.
- `mods/AGENTS.md`, `website/AGENTS.md`, `build-pipeline/AGENTS.md`, and
  `website/src/lib/map/AGENTS.md` lose the constraints an agent must not miss; those become rules.
- `.agent/rules/` gains triggered rules and receives the relocated subproject constraints.
- `.agent/skills/*/SKILL.md` reference lists are rewritten to state the cost of not loading.
- `scripts/check-agent-docs.sh` gains checks for the new invariants.
- `.omp/agents/` is introduced for repository-owned research agent definitions.
- No product code, exporter, pipeline, or website behaviour changes.
