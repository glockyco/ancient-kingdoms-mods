# Design: restructure agent instruction delivery

## Context

See proposal.md for motivation. This section records only the delivery mechanics that constrain the
approach, because the existing routing table was written without them and is wrong as a result.

The runtime offers eleven ways to put an instruction in front of the agent. Their differences are
not stylistic; they decide whether an instruction arrives at all.

| Channel | Authored at | Arrives when | Idle cost | Can stop an action |
|---|---|---|---|---|
| Context file, at or above the session directory | `AGENTS.md` | session opens | whole body, every turn | no |
| Context file, below the session directory | `mods/AGENTS.md` and three more | never; a path is listed | none | no |
| Always-apply rule | `.agent/rules/<n>.md`, `alwaysApply: true` | every turn | whole body, every turn | no |
| Project sticky rule | `.omp/RULES.md` | every turn, re-attached near the turn | whole body | no |
| Append to system prompt | `.omp/APPEND_SYSTEM.md` | every turn | whole body | no |
| Rulebook rule | `.agent/rules/<n>.md`, `globs` + `description` | listed always, body when the agent asks | one line | no |
| Triggered rule | `.agent/rules/<n>.md`, `condition` or `astCondition` | when the agent's own output matches | none | yes, by `interruptMode` |
| Skill | `.agent/skills/<n>/SKILL.md` | listed always, body when the agent asks | about 100 tokens | no |
| Skill reference | `.agent/skills/<n>/references/*.md` | only after the body is read | none | no |
| Pre-tool hook | `.omp/hooks/pre/*.ts` | before every tool call | module load | yes, deterministically |
| Project task agent | `.omp/agents/*.md` | when a child agent starts | none | within the child |

Sources: `omp://context-files.md`, `omp://rulebook-matching-pipeline.md`, `omp://skills.md`,
`omp://hooks.md`, `omp://task-agent-discovery.md`, `omp://system-prompt-customization.md`.

The repository currently uses four of these, and all four share the property that they cannot arrive
at the moment of an action: one context file that loads at session open, four that do not load at
all, rules and skills the agent must elect to read, and references it cannot see until it has.

Two measurements bound the design. Instruction adherence falls as the always-loaded set grows, and
adherence to an instruction given in an earlier turn decays with turn count. Neither is fixed by
adding text to a channel that loads at session open.

## Goals / Non-Goals

**Goals**

- Place each instruction in the channel whose arrival moment matches the moment it is needed.
- Make a subproject constraint reachable from a session started anywhere in the repository.
- Reduce the always-loaded set rather than grow it, and end with a corpus no larger than the one this
  change started from.
- Replace a stated value about the code with a pointer to the symbol that owns it, so the instruction
  cannot go stale without something failing.
- Make an instruction's effectiveness observable, so a useless one can be deleted.

**Non-Goals**

- Rewriting the substance of any instruction. This change moves and reshapes; it does not revise
  domain facts.
- Introducing enforcement code. See the hook decision below.
- Changing product behaviour in the mods, the pipeline, or the website.

## Decisions

### Keeping is decided before placing

Placement presupposes that the instruction should exist, and the first version of this design never
asked. That omission is measurable: after three sections the unconditionally loaded surface had fallen
twenty percent and the whole corpus had risen twenty-six, because a routing table offers no move except
moving.

So each instruction is first tested by deleting it and asking what the agent does next.

| The agent would | Then the instruction is | Because |
|---|---|---|
| re-derive it correctly from the source, in seconds | deleted | it is a cache with no hit worth its upkeep |
| re-derive it only after a costly mistake | a pointer to the authority | the cost is one file read, paid once |
| never derive it, because it is not in the source | kept as written | method, an incident, or a decision is not recoverable by reading code |

The third row is the only one that earns a fact. It is also the only one that cannot rot, because it is
not a claim about the code.

### A value becomes a pointer, or it goes

A value copied out of the source is correct until the source changes, and then it is silently wrong.
The repository has two mechanisms that would catch that, and neither covers an instruction file.

| Written in the instruction surface | Symbol existence checked | Content change detected |
|---|---|---|
| a pointer, `server-scripts/Combat.cs:blockChance` | yes, the agent-docs check resolves every one | not needed; a pointer survives a content change |
| a value, `0.0001` | no | no, even when the file cites a symbol nearby |

The citation ledger hashes each cited span and forces review when the hash moves, which is why a value
in a source file is safe to state. It indexes source files only: of the twenty-one citations in the
instruction surface, none is in the ledger. So a value there has exactly two safe fates.

This change created a counter-example and keeps it as the first correction.
`.agent/rules/monster-curve-columns.md` restates a block chance formula including its coefficient and
cites no symbol at all.

### The trap outlives the value

A pointer fixes staleness and not misreading. The offhand slot table was read from the source and
generalised from one class prefab to all six, which no re-read instruction would have prevented,
because the source was read.

What would have prevented it is the trap: that the array is serialised per prefab, so one class does
not speak for another. A trap survives a change to the value it guards, and it tells a reader what to
look for once the pointer sends them to the authority.

So a kept instruction about the code states the trap and points at the authority, and states the value
only when the value is the trap.

### Placement is decided by arrival moment, not by breadth

The current table routes by how broadly an instruction applies, which is why subproject content
went to a file that does not load. The replacement asks one question: at what moment must this be
in front of the agent?

| Moment | Channel |
|---|---|
| At session open, or the agent misorients | root `AGENTS.md` |
| Every turn, and it must never decay | a rule with `alwaysApply: true` |
| When the agent's own output shows it is about to err | a rule with `condition` |
| While editing a known set of paths | a rule with `globs` |
| When following a named multi-step procedure | a skill |
| Deep detail supporting one procedure | a reference beside that skill |
| Never, because a linter, test, or the code itself carries it | nowhere |

### A subproject constraint lives in a rule, not in a subproject context file

A context file below the session directory contributes a path, not content. Four of the
repository's five are in that position, and the constraints an agent must not miss are inside them.
Those constraints move to rules carrying that subproject's paths as `globs`, which are listed in
every session and addressable by name.

The subproject `AGENTS.md` files remain, holding orientation for a human reader: what the subproject
is, where its outputs go, which commands verify it. Nothing that an agent must not miss stays there.

This does mean a human and an agent read partly different files. That is the honest consequence of a
runtime that loads one and not the other, and it is preferable to the present arrangement where the
agent reads neither.

### A hard invariant uses an always-apply rule, not a project sticky file

The sticky channel looks like the right home for an invariant that must not decay, and on this
machine it is dead. Both the user file and the project file are synthesised under the single rule
name `RULES`, deduplication is by name, and the user file is appended first, so a user
`~/.omp/agent/RULES.md` shadows a project `.omp/RULES.md` entirely rather than concatenating with
it. A user file is present. A project sticky file would therefore never load, reproducing the exact
defect this change exists to remove.

A rule under `.agent/rules/` with `alwaysApply: true` carries a distinct name, cannot be shadowed by
a user file, and has its body injected every turn. That is the channel for an invariant. It is
expensive, so it is reserved for invariants whose violation is unrecoverable.

### An action trap is a triggered rule that names its incident

A trap is guidance whose subject is a mistake the agent makes while performing a specific action.
Written as prose in a context file it competes with everything else and arrives thousands of tokens
before the action. Written as a triggered rule it costs nothing until the agent's own output matches,
and then arrives beside the action.

Each triggered rule states, in its body, the incident that motivated it. A rule with no incident
behind it is a guess about a future mistake, and the repository has no evidence that guesses fire.

Candidate rules, each traceable to a recorded failure:

| Trap | Trigger matches | Incident |
|---|---|---|
| Measuring live game behaviour through one shell round trip per sample | a HotRepl `eval` invocation | four measurement points produced nothing because the subject died between calls |
| Reading a single-row query result as proof of absence | a one-row fetch against the compendium database | one row in `monsters` was read as proof that five spawn variants did not exist |
| Driving a repeating game action manually | the game's skill-use command | the engine re-issues a basic attack itself; sending it competed with the engine and measured the sender |
| Reading a denormalised monster scalar where curve columns exist | a monster scalar column reference | a published block chance omitted the defense term and understated the default target by a factor of 2.6 |
| Treating a successful build as proof of a runtime change | a mod build or deploy invocation | a Harmony patch and a probe were declared working from a green build |

The set is deliberately small. A trigger that fires on ordinary work becomes wallpaper, and the
research on always-loaded prose applies equally to a rule that fires constantly.

### A triggered rule follows the shape the runtime's own rules use

The 28 rules the runtime ships share a shape: an opening directive naming the practice and its
boundary, a `## Why` giving the reasons so the agent can generalise, an `## Avoid` and a `## Use`
carrying concrete before and after, and an `## Exceptions` list naming observable conditions under
which the default does not hold. Bodies run from five to sixty lines and use code, not prose, for
examples.

Repository rules today bundle several unrelated constraints into one body, state no exceptions under
a heading, give no rationale, and contain no code examples. New rules adopt the runtime's shape, and
one rule covers one triggerable concern.

On imperative force: the published skill guidance discourages heavy-handed capitalised absolutes and
asks for the reason instead, while the runtime's own rules do use a capitalised prohibition where the
prohibition is genuine. The resolution adopted here is that a rule states its directive plainly,
always gives the reason, and reserves an absolute for a case where no exception exists.

### A trigger is a reminder, not a lesson

The published guidance not to explain what the model already knows applies to a channel whose value is
information. A trigger's value is timing.

| Channel | Value comes from | So redundant content is |
|---|---|---|
| a skill, a reference | information | waste |
| a triggered rule | timing | acceptable, because the failure was not ignorance |

Every instruction that failed in the run behind this change was already known. One row is not evidence
about a table; a build is not a runtime. Knowing was never the gap, so a trigger may restate the
obvious and still work.

The consequence is length. A reminder that arrives at the right moment needs the directive and the
place the reasoning lives, not the argument. The rules written in section 1 run to forty and fifty
lines because they were written in the shape of the runtime's own code-pattern rules, where the body
carries a replacement the reader applies directly. A method reminder has no such replacement to carry,
and that difference is where most of the corpus growth went.

### A rule that never fires is removed

The repository already requires that a mechanism producing nothing be repaired or removed. An
instruction is such a mechanism. The runtime raises a `ttsr_triggered` event when a rule fires,
which makes firing observable rather than assumed.

The obligation this change accepts is modest and honest: at each review of these files, a rule with
no recorded firing and no incident since its introduction is deleted rather than reworded. This
change does not build a counter; it records the requirement and the event that would feed one.

### No hook is introduced

A pre-tool hook is the only channel that stops an action deterministically rather than advising
against it. Two invariants would justify one: never create or modify a character while the database
redirect has been refused, because the target is then player data; and never deploy while the game
holds its mod assemblies.

Both already fail closed without a hook. The redirect command refuses once the game has opened its
own database, and that refusal is what protected player data when the agent reached that state. The
deploy step reports a locked assembly rather than silently corrupting one. A hook would add a
TypeScript surface with no tests, duplicating a guard that the tools already provide.

Hooks remain the escalation path. The condition for revisiting is a recorded incident in which an
advisory rule fired, was read, and was overridden anyway, or one in which the underlying tool did
not fail closed.

### Skills adopt the published limits

The Agent Skills specification and Anthropic's authoring guidance give numbers, and the repository's
current budget is one round figure applied to a different kind of file.

- A skill `description` is capped at 1024 characters, states both what the skill covers and when it
  applies, and is written in the third person, because it is the only text the runtime uses to
  select the skill.
- A skill body stays under 500 lines and roughly 5000 tokens; past that it splits.
- References sit one level deep beside the skill, because a nested reference is read partially.
- A reference longer than 100 lines carries a contents list. The guidance is inconsistent here, with
  the published best practices saying 100 lines and the skill-creator saying 300; the lower figure is
  adopted because it costs a few lines and the failure it prevents is a partial read.

Sources: `https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices`,
`https://agentskills.io/specification`,
`https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md`.

### A reference list states what not reading costs

The reference list that failed said to load one when the task needs it, and gave each file a
description of its subject. An agent judging whether the task needs it will usually decide it does
not, because the description names a topic rather than a consequence.

Each entry instead states what a reader who skips it gets wrong. The measurement reference is not
"how to measure live behaviour"; it is the file without which a measurement costs ten round trips
and returns nothing. That is a claim an agent can act on.

### A research subagent returns its report intact

Two of the five research reports produced for this change were destroyed in transit: the agents
wrote tables, and the delivered output carried only a summary and a file list, because a structured
output shape discarded the body. The evidence survived only in the agents' transcripts and in
messages they sent while working.

A project task-agent definition under `.omp/agents/` is repository-owned and delivered to the child
at launch. A definition for repository research states that the report is written to a file and the
path returned, so the report survives whatever shape the channel imposes.

### The undocumented settings are not relied upon

The runtime's settings document names a `ttsr.*` configuration group and does not enumerate its keys
or defaults. This change therefore does not depend on any default for rule disabling or interrupt
mode. Every rule states the behaviour it wants in its own frontmatter.

## Risks / Trade-offs

- **A trigger is a regex against text that changes.** A rule keyed to an API name stops firing
  silently when the API is renamed. This is not the same exposure as a stale value, and the difference
  decides the remedy: a pointer is resolved by the existing check, a value is checked by nothing, and a
  trigger regex is checked by nothing either. A trigger that stops matching fails safe, because the
  result is a missing reminder rather than a false claim. A value that stops being true fails unsafe.
  So this change converts values into pointers and accepts the trigger exposure, rather than treating
  the two as one problem.
- **A trigger cannot tell a mention from an intent.** Three rules fired on a shell argument that merely
  quoted their trigger strings, and two fired on a database query that already complied with them. The
  cost of a false positive is a body of text delivered for nothing, which is why the shape decision
  above bounds that body.
- **Human and agent read different files.** Splitting subproject constraints into rules leaves the
  subproject `AGENTS.md` thinner than a new human contributor might want. Mitigation: that file
  names the rule that carries the constraints.
- **Triggered rules are still advisory.** They arrive at the right moment and can be overridden. The
  gain over prose is arrival, not compulsion. Only a hook compels, and no hook is introduced.
- **A small set of triggers covers a small set of mistakes.** Most future mistakes will not have a
  rule. That is intended: the alternative is a large set that fires on ordinary work and is ignored.
- **Reducing always-loaded prose could remove something load-bearing.** Every line removed from a
  context file lands in a rule or is deleted with a stated reason, and the check enforces that no
  instruction file names a missing target.
