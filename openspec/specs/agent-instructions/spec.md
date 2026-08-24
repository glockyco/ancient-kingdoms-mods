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

Rationale: instruction files load into every session and consume context budget. Beyond roughly 200
lines, adherence drops.

#### Scenario: A file exceeds the budget

- **WHEN** an `AGENTS.md` reaches 200 lines or more
- **THEN** the agent-docs check fails and reports the path and its line count

### Requirement: Guidance is routed by when it applies

Content SHALL be placed according to how often it applies:

- Always, across the repository — root `AGENTS.md`
- Always, within one subproject — that subproject's `AGENTS.md`
- Only when touching particular files — a rule under `.agent/rules/` carrying `globs`
- A multi-step procedure for one kind of task — a skill under `.agent/skills/`
- A rule a linter or formatter can enforce — that tool's configuration, not prose
- A description of what code does, rediscoverable by reading it — omitted entirely

The test for keeping any line is whether removing it would cause an agent to make a mistake. If it
would not, the line SHALL be removed.

Guidance that must never be missed SHALL stay in an `AGENTS.md`, because rules and skills are
listed to the model and read on demand rather than injected unconditionally.

#### Scenario: Author adds path-specific guidance

- **WHEN** guidance applies only while editing files matching a pattern
- **THEN** it is written as a rule with `globs` rather than added to an `AGENTS.md`

#### Scenario: Author adds a multi-step procedure

- **WHEN** guidance describes a sequence of steps for one kind of task
- **THEN** it is written as a skill

#### Scenario: Author adds a formatting rule

- **WHEN** guidance restates a rule the configured linter or formatter already enforces
- **THEN** it is omitted from every instruction file

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
