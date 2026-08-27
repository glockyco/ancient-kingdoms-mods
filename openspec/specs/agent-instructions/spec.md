# agent-instructions Specification

## Purpose
Defines how this repository stores, scopes, and validates the instructions that coding agents
read. It exists so that guidance is actually loaded by the runtime, stays small enough to be
followed, has exactly one home per fact, and fails a check when it decays. The single supported
runtime is OMP.

## Requirements

### Requirement: Instructions live in files the runtime discovers

Agent instruction files SHALL be named `AGENTS.md`. The repository SHALL contain an `AGENTS.md` at
the repository root, and MAY contain one in any subdirectory that owns distinct conventions.
Project skills SHALL live at `.agent/skills/<name>/SKILL.md` and project rules at
`.agent/rules/<name>.md`. The repository SHALL NOT contain any file named `CLAUDE.md`, and SHALL
NOT contain a `.claude/` directory.

Rationale: the runtime discovers standalone `AGENTS.md` by walking from the working directory to
the repository root, and files at every depth survive, so a hierarchy of subproject files works. A
root `CLAUDE.md` is never discovered, because the competing provider reads only
`<cwd>/.claude/CLAUDE.md` and does not walk ancestors.

#### Scenario: Session opens at the repository root

- **WHEN** an agent session starts at the repository root
- **THEN** the root `AGENTS.md` is present in the session's project context
- **AND** no instruction content is silently absent because of its filename

#### Scenario: Session opens deep in a subproject

- **WHEN** an agent session starts in a directory with `AGENTS.md` files at two ancestor levels
- **THEN** all of them are in context
- **AND** they are ordered farthest first, so the nearest file is the most prominent

#### Scenario: A CLAUDE.md or .claude directory is reintroduced

- **WHEN** any commit adds a file named `CLAUDE.md` or a `.claude/` directory
- **THEN** the agent-docs check fails and names the offending path

### Requirement: Instruction files stay within the size budget

Every `AGENTS.md` SHALL be under 200 lines. Content that would push a file over the budget SHALL be
moved to a rule or a skill, or deleted, and SHALL NOT be relocated into a second instruction file
that exists only to evade the limit.

A skill body SHALL be under 200 lines. That is stricter than the published ceiling of 500, because a
skill body stays in context for the rest of a session once it loads, while a reference loads only when
the body sends a reader to it. A skill `description` SHALL be within 1024 characters. A reference file
longer than 100 lines SHALL open with a contents list, because a reader that opens it part way must be
able to see its scope.

The budget applies to the sum of what loads unconditionally, not to each file alone. Adding a rule
with `alwaysApply: true` SHALL be treated as spending the same budget as adding lines to an
`AGENTS.md`.

Rationale: instruction adherence falls as the unconditionally loaded set grows, and adherence to an
instruction given in an earlier turn decays with turn count. A per-file limit does not bound either.

#### Scenario: A file exceeds the budget

- **WHEN** an `AGENTS.md` reaches 200 lines or more
- **THEN** the agent-docs check fails and reports the path and its line count

#### Scenario: A skill body exceeds its budget

- **WHEN** a `SKILL.md` reaches 200 lines or more
- **THEN** the agent-docs check fails and reports the path and its line count

#### Scenario: A long reference has no contents list

- **WHEN** a file under a skill's `references/` exceeds 100 lines and does not open with a contents
  list
- **THEN** the agent-docs check fails and names the file

#### Scenario: A change relocates instructions between channels

- **WHEN** a change moves content between instruction channels
- **THEN** each moved instruction is tested for whether it should exist before it is placed
- **AND** a total word count over unlike channels SHALL NOT be used as the success criterion, because a
  reference line and an always-loaded line differ in cost by orders of magnitude

### Requirement: Guidance is routed by when it applies

Content SHALL be routed only after it has passed the keep test below. Routing SHALL NOT be treated as
an alternative to deletion, because a routing table permits no move except moving, and relocation grows
the corpus while the loaded surface shrinks.

Content that is kept SHALL be placed according to the moment it must reach the agent, not according to
how broadly it applies:

- At session open, or the agent misorients — root `AGENTS.md`
- Every turn, where a violation is unrecoverable — a rule with `alwaysApply: true`
- When the agent's own output shows it is about to make a specific mistake — a rule carrying
  `condition` or `astCondition`
- While editing a known set of paths — a rule carrying `globs`
- When following a named multi-step procedure — a skill
- Deep detail supporting one procedure — a reference beside that skill
- Where a linter, a test, or the code itself already carries it — nowhere

The test for keeping any line is whether removing it would cause an agent to make a mistake. If it
would not, the line SHALL be removed.

Guidance that must not be missed SHALL NOT be placed in an `AGENTS.md` on the grounds that a rule is
read on demand. A rule carrying a trigger condition is injected without being asked for, at the
moment its trigger matches, and a context file below the session directory is never injected at all.

An instruction SHALL NOT be placed in a channel whose arrival moment is later than the moment the
instruction is needed.

Rationale: the previous routing sent subproject guidance to a file the runtime does not load, and
asserted that unmissable guidance belongs in a context file because rules load on demand. A trigger
rule loads unconditionally when it matches, and costs nothing until then.

#### Scenario: Author adds guidance about a mistake made at a specific action

- **WHEN** guidance describes a mistake an agent makes while performing a recognisable action
- **THEN** it is written as a rule carrying a trigger condition
- **AND** it is not added to an `AGENTS.md`

#### Scenario: Author adds path-specific guidance

- **WHEN** guidance applies only while editing files matching a pattern
- **THEN** it is written as a rule with `globs` rather than added to an `AGENTS.md`

#### Scenario: Author adds a multi-step procedure

- **WHEN** guidance describes a sequence of steps for one kind of task
- **THEN** it is written as a skill

#### Scenario: Author adds a formatting rule

- **WHEN** guidance restates a rule the configured linter or formatter already enforces
- **THEN** it is omitted from every instruction file

#### Scenario: Author proposes a project sticky rules file

- **WHEN** an invariant is proposed for a project sticky rules file
- **THEN** it is written as a rule with `alwaysApply: true` instead, because a user sticky file
  shadows a project one by name rather than combining with it

### Requirement: Documentation does not restate the codebase

Guidance SHALL NOT describe a code pattern that the repository already demonstrates. Where a
contributor or agent can learn the pattern by reading existing instances, the guidance SHALL point
at those instances rather than reproduce them.

A mechanical invariant, such as a registration that must accompany a new file, SHALL be enforced
by a test rather than described in prose. Prose only helps a reader who loads it, and it drifts
from the code silently; a test fails at the moment of the mistake.

Rationale: a skill that reproduced the loader pattern reached 156 lines against 32 working
examples, and a skill that reproduced the mod pattern rotted into citing source files that no
longer exist.

#### Scenario: Author proposes a scaffolding guide

- **WHEN** proposed guidance explains how to write a new instance of an existing pattern
- **THEN** it is not added
- **AND** any cross-file registration it would have described is asserted by a test instead

#### Scenario: A required registration is omitted

- **WHEN** a new instance of a registered pattern is added without its registration
- **THEN** a test fails and identifies the missing registration

### Requirement: Guidance describes the supported workflow

Agent guidance SHALL describe only workflows that the repository uses. When a workflow is retired,
its skills, commands, and live instructions SHALL be removed together.

#### Scenario: A repository workflow is retired

- **WHEN** repository work no longer uses a documented workflow
- **THEN** no discovered skill or live instruction recommends that workflow
- **AND** no public setup command remains solely to support it

### Requirement: Each fact has exactly one home

A given instruction SHALL appear in exactly one place. An `AGENTS.md` SHALL NOT restate content
that already exists in `README.md`, in another `AGENTS.md`, in a rule, or in a skill. Where a fact
is needed in a second location, that location SHALL link to the owner rather than copy it.

#### Scenario: Guidance already covered by a skill

- **WHEN** a procedure is documented in a skill
- **THEN** no `AGENTS.md` repeats that procedure
- **AND** any `AGENTS.md` that needs it names the skill instead

#### Scenario: Two instruction files disagree

- **WHEN** two instruction files give conflicting guidance on the same subject
- **THEN** this is a defect, because the runtime concatenates instruction files rather than letting
  the nearer one override the farther one, and an agent may follow either

### Requirement: Skills and rules declare a name and a selection trigger

Every skill SHALL provide `name` and `description` frontmatter. Every rule SHALL provide
`description`, and SHALL provide `globs` when it is path-specific. A `description` SHALL state both
what the item covers and when it applies, because the runtime lists items by description and
selects on that text alone. A description stating only what the item covers SHALL be treated as
incomplete.

#### Scenario: A skill omits its trigger

- **WHEN** a skill's `description` does not say when to use the skill
- **THEN** the agent-docs check fails and names the skill

#### Scenario: A rule omits its description

- **WHEN** a rule file has no `description`
- **THEN** the agent-docs check fails, because an undescribed, non-always-apply rule is not listed
  to the model and is not addressable

#### Scenario: An item is discoverable

- **WHEN** a task matches an item's stated trigger
- **THEN** the item is selectable without the user naming it explicitly
- **AND** no hand-maintained routing table is required to reach it

### Requirement: Every reference resolves

Every repository-relative path, command, and skill or rule name mentioned in an instruction file,
rule, or skill SHALL resolve to something that exists.

#### Scenario: A referenced path is deleted

- **WHEN** an instruction file, rule, or skill names a path that does not exist
- **THEN** the agent-docs check fails and reports the citing file and the missing target

#### Scenario: A referenced skill is renamed

- **WHEN** an instruction file names a skill that is not present
- **THEN** the agent-docs check fails and reports both names

### Requirement: The rules are enforced automatically

The repository SHALL provide a check that validates every requirement above, and SHALL run it on
commit. The check SHALL exit non-zero and identify each offending file.

Rationale: every defect this capability addresses reached the default branch because nothing
verified these files.

#### Scenario: A commit degrades the instructions

- **WHEN** a commit adds an oversized file, a `CLAUDE.md`, an item without a trigger, or a dead
  reference
- **THEN** the commit-time check fails before the commit completes

#### Scenario: A contributor runs the check directly

- **WHEN** a contributor runs the check by hand
- **THEN** it reports every violation in one run rather than stopping at the first

### Requirement: Historical records are exempt

Documents that record what was true at a past date, including everything under
`docs/plans/archive/`, SHALL NOT be rewritten to match current conventions, and SHALL be excluded
from the check.

#### Scenario: An archived plan names a deleted path

- **WHEN** an archived plan references a path that no longer exists
- **THEN** the check ignores it
- **AND** the text is left as written, because editing it would misrepresent the historical record

### Requirement: A subproject constraint an agent must not miss lives in a rule

A constraint that changes what an agent does SHALL NOT be stored only in a subproject `AGENTS.md`.
The runtime injects a context file only when it sits at or above the session directory; a file below
it contributes its path and not its content.

Such a constraint SHALL be carried by a rule whose `globs` name that subproject's paths, so that it
is listed in every session and addressable by name regardless of where the session started.

A subproject `AGENTS.md` SHALL hold orientation for a human reader: what the subproject is, where
its outputs go, and which commands verify it. It SHALL name the rule that carries its constraints.

Rationale: four of the repository's five context files sit below the repository root. During one
working day with 116 file changes under `mods/`, the constraints in `mods/AGENTS.md` were never in
the agent's context; one was rediscovered by experiment and another was violated repeatedly.

#### Scenario: A subproject gains a constraint

- **WHEN** a constraint that changes agent behaviour applies to one subproject
- **THEN** it is written as a rule carrying that subproject's paths as `globs`

#### Scenario: A subproject context file carries a behavioural constraint

- **WHEN** an `AGENTS.md` below the repository root states a constraint rather than orientation
- **THEN** the agent-docs check fails and names the file and the constraint

#### Scenario: A session starts at the repository root

- **WHEN** an agent works on files in a subproject from a session started at the repository root
- **THEN** that subproject's constraints are reachable by name without the agent knowing the
  subproject's context file exists

### Requirement: A triggered rule names the incident that motivated it

A rule carrying a trigger condition SHALL state, in its body, the recorded failure that motivated
it. A rule whose subject is a mistake nobody has made SHALL NOT be added.

A triggered rule SHALL cover one triggerable concern. Several unrelated constraints SHALL NOT share
one rule body, because the trigger that fires for one would deliver the others as noise.

A triggered rule body SHALL state its directive, the reason the directive exists, and the conditions
under which it does not apply. Where an exception exists it SHALL name an observable condition
rather than leaving the judgement unstated.

A triggered rule body SHALL be a reminder rather than an argument. Its value is the moment it arrives,
not the information it carries, so extended reasoning SHALL live in the skill or reference the rule
names and the body SHALL state the directive, the exception, and where the reasoning lives.

A triggered rule SHALL be assumed to fire on a mention of its trigger as well as on an intent to act,
and on a compliant action as well as a mistaken one. Its length SHALL be chosen on that basis.

Rationale: the runtime ships 28 triggered rules and the repository had written none. Across a full
working day exactly one instruction changed the agent's behaviour at the moment of action, and it
was one of those 28.

#### Scenario: An author proposes a trigger for a hypothetical mistake

- **WHEN** a proposed triggered rule cites no incident
- **THEN** it is not added

#### Scenario: A triggered rule bundles several concerns

- **WHEN** one rule body carries constraints that respond to different triggers
- **THEN** it is split into one rule per concern

#### Scenario: A trigger fires during ordinary work

- **WHEN** a rule's trigger matches text that appears in work unrelated to the rule's subject
- **THEN** the trigger is narrowed, because a rule that fires constantly is ignored

### Requirement: An instruction that never fires is removed

An instruction is a mechanism, and the repository's standing rule for a mechanism that produces
nothing applies to it. A triggered rule that has never fired, and whose motivating incident has not
recurred, SHALL be deleted rather than reworded.

A review of the instruction files SHALL consider deletion before rewording. Adding text in response
to an instruction that was present and not followed SHALL be treated as a placement defect rather
than a wording defect.

Rationale: after each failure across one working day the response was to write more prose, adding
466 lines to channels that load only when the agent elects to read them, which is the failure being
repaired.

#### Scenario: An instruction was present and not followed

- **WHEN** an instruction existed in context and the agent acted against it
- **THEN** the remedy considered first is moving it to a channel that arrives at the action
- **AND** rewording it in place is not treated as a remedy on its own

#### Scenario: A rule has never fired

- **WHEN** a triggered rule has no recorded firing and its motivating incident has not recurred
- **THEN** it is deleted

### Requirement: An instruction the agent would re-derive is not written

Before an instruction is placed it SHALL be tested by deletion. The test asks what the agent does with
the instruction absent:

- Re-derives it correctly from the repository or the decompiled source, in seconds — the instruction
  SHALL NOT be written.
- Re-derives it only after a costly mistake — the instruction SHALL be a pointer to the authority, not
  a copy of what the authority says.
- Never derives it, because it is not recoverable by reading code — the instruction SHALL be kept.

The third case covers method, a recorded incident, and a decision with its reason. Those are the only
instructions that earn a full statement, and they are also the only ones that cannot go stale, because
they are not claims about the code.

Rationale: relocation without deletion grew the corpus by twenty-six percent while the loaded surface
fell twenty percent, because the routing table offered no other move.

#### Scenario: Guidance restates something the source states

- **WHEN** proposed guidance states a fact the agent would read correctly from the source
- **THEN** it is not added, and any trap in reading that source is added instead

#### Scenario: A fact is expensive to locate

- **WHEN** a fact is in the source but an agent would not think to look for it
- **THEN** a pointer to the owning symbol is written rather than the fact

### Requirement: A stated value carries its authority or is not stated

An instruction file SHALL NOT state a numeric constant, a formula, or a field value taken from the game
or the codebase without a pointer to the symbol that owns it. Where the value itself is not the point,
the instruction SHALL state the pointer and the trap and omit the value.

Rationale: a pointer of the form `server-scripts/<file>.cs:<symbol>` is resolved by the automated check
and cannot be invalidated by a change to what it points at. A value can be invalidated and nothing
detects it: the citation ledger hashes cited spans in source files, and no citation in the instruction
surface is in that ledger. A value there is unprotected even when a symbol is cited nearby.

#### Scenario: A rule states a coefficient

- **WHEN** a rule body states a numeric constant from the game
- **THEN** the check fails unless the file also points at the symbol that owns it

#### Scenario: The value is the trap

- **WHEN** the point of the instruction is that a value is surprising
- **THEN** the value may be stated, with the pointer beside it

### Requirement: A reference list states what not reading it costs

Where a skill body lists its reference files, each entry SHALL state what a reader who does not open
it gets wrong. An entry SHALL NOT describe only the file's subject, and the list SHALL NOT invite
the reader to open a file only if the task appears to need it.

Rationale: a measurement reference described itself by its subject and was left unread through a
full day of measurement, while the mistakes it documents were made and then rediscovered.

#### Scenario: A skill gains a reference

- **WHEN** a reference file is added beside a skill
- **THEN** the skill body's entry for it states the consequence of not reading it

#### Scenario: A reference entry names only a topic

- **WHEN** a reference entry describes the file's subject without stating what it prevents
- **THEN** the agent-docs check fails and names the entry

### Requirement: A research subagent's report survives delivery

A repository-owned task agent definition SHALL exist for research work, and SHALL require that the
report is written to a file whose path is returned, rather than returned as the agent's own output.

Rationale: two of the five research reports produced for this change were delivered as a summary and
a file list with their tables discarded, because a structured output shape replaced the body. The
content survived only in transcripts and in messages the agents sent while still running.

#### Scenario: A research subagent produces a table

- **WHEN** a dispatched research agent is asked for a structured report
- **THEN** the report reaches the caller with its structure intact

#### Scenario: A research agent is dispatched without a definition

- **WHEN** research is dispatched with no repository-owned agent definition
- **THEN** the caller states in the task text that the report is written to a file and the path
  returned
