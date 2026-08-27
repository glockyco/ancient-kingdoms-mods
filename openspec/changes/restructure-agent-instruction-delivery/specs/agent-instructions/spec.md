# Agent instructions

## MODIFIED Requirements

### Requirement: Guidance is routed by when it applies

Content SHALL be placed according to the moment it must reach the agent, not according to how
broadly it applies:

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

### Requirement: Instruction files stay within the size budget

Every `AGENTS.md` SHALL be under 200 lines. Content that would push a file over the budget SHALL be
moved to a rule or a skill, or deleted, and SHALL NOT be relocated into a second instruction file
that exists only to evade the limit.

A skill body SHALL be under 500 lines. A skill `description` SHALL be within 1024 characters. A
reference file longer than 100 lines SHALL open with a contents list, because a reader that opens it
part way must be able to see its scope.

The budget applies to the sum of what loads unconditionally, not to each file alone. Adding a rule
with `alwaysApply: true` SHALL be treated as spending the same budget as adding lines to an
`AGENTS.md`.

Rationale: instruction adherence falls as the unconditionally loaded set grows, and adherence to an
instruction given in an earlier turn decays with turn count. A per-file limit does not bound either.

#### Scenario: A file exceeds the budget

- **WHEN** an `AGENTS.md` reaches 200 lines or more
- **THEN** the agent-docs check fails and reports the path and its line count

#### Scenario: A skill body exceeds its budget

- **WHEN** a `SKILL.md` reaches 500 lines or more
- **THEN** the agent-docs check fails and reports the path and its line count

#### Scenario: A long reference has no contents list

- **WHEN** a file under a skill's `references/` exceeds 100 lines and does not open with a contents
  list
- **THEN** the agent-docs check fails and names the file

## ADDED Requirements

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
