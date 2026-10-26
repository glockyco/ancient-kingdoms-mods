# documentation-structure Specification

## Purpose

Defines which document owns which kind of fact, so that each reader finds one document written for them, and which properties of the documentation a check enforces on every commit and CI run.

## Requirements

### Requirement: Each kind of fact has one home

Each fact SHALL live in the document that owns its kind, and any other document that needs it SHALL link to that home instead of restating it. The front page owns what the project is and offers. `CONTRIBUTING.md` owns setup, workflows, checks, and troubleshooting. The architecture document owns structure, invariants, and cross-cutting concepts. Each mod's README owns that mod. Skills own procedures, and OpenSpec owns required behavior.

#### Scenario: A workflow is added

- **WHEN** a new way to run part of the pipeline is documented
- **THEN** the steps go into `CONTRIBUTING.md`
- **AND** the front page gains at most a link

#### Scenario: An invariant is found

- **WHEN** a change establishes a rule that every future change must keep, such as a boundary between two parts
- **THEN** the rule goes into the architecture document

#### Scenario: A mod gains a setting

- **WHEN** a mod adds a setting or an input
- **THEN** that mod's README describes it
- **AND** no other document repeats the description

#### Scenario: A fact already has a home

- **WHEN** a document needs a fact that another document owns
- **THEN** it links to the owning document

### Requirement: The front page stays an overview

`README.md` SHALL stay under 1,000 words of visible prose, counted outside code blocks, comments, and link targets. It SHALL link to `CONTRIBUTING.md` and to `ARCHITECTURE.md`.

Rationale: the most visible file attracts every new fact. A limit sends a fact to its home before the front page becomes a manual.

#### Scenario: The front page grows past its budget

- **WHEN** an edit takes the front page to 1,000 words or more
- **THEN** the documentation check fails and reports the count and the budget

#### Scenario: A guide link is removed

- **WHEN** the front page no longer links to `CONTRIBUTING.md` or to the architecture document
- **THEN** the documentation check fails and names the missing link

### Requirement: The front page lists the published mods

The front page SHALL link to the download of every mod that the site publishes, and SHALL link to no other mod download. The site's published set is the one that `website/mod-downloads.json` selects.

Rationale: the downloads are the one thing most search visitors come for, and the published set changes in a file the front page cannot see.

#### Scenario: A mod is added to the downloads

- **WHEN** `website/mod-downloads.json` gains a mod that the front page does not link
- **THEN** the documentation check fails and names the mod

#### Scenario: A mod is withdrawn from the downloads

- **WHEN** the front page links to the download of a mod that `website/mod-downloads.json` no longer selects
- **THEN** the documentation check fails and names the link

### Requirement: Every mod documents itself

Each mod project under `mods/` SHALL have a `README.md` that states what the mod does, how it is used, its settings, its limits, and what it requires. `mods/README.md` SHALL link to every mod's README.

Rationale: visitors browse the mod folders directly, so a mod's own folder is where its use and limits are read.

#### Scenario: A mod project is added

- **WHEN** a directory under `mods/` contains a project file but no `README.md`
- **THEN** the documentation check fails and names the directory

#### Scenario: The catalogue misses a mod

- **WHEN** `mods/README.md` does not link to a mod's README
- **THEN** the documentation check fails and names the mod

#### Scenario: A reader opens a mod's README

- **WHEN** someone reads a mod's README
- **THEN** it tells them what the mod does, how to use it, which settings it has, what it cannot do, and what it needs installed

### Requirement: Documentation references resolve

Every relative link and heading anchor, every repository path written as code, and every `build-tool` verb, `pnpm` script, and `compendium` command named in the project documentation SHALL resolve against the current checkout. Project documentation is every tracked Markdown file outside `openspec/`. A path that Git ignores resolves, because it names local state.

Rationale: a stale reference is the most common way a document here goes wrong, and it is the part of a document a machine can verify.

#### Scenario: A link names a moved file

- **WHEN** a document links to a file or directory that no longer exists
- **THEN** the documentation check fails and reports the document, the line, and the target

#### Scenario: A link names a removed heading

- **WHEN** a link's anchor matches no heading in its target document
- **THEN** the documentation check fails and reports the anchor

#### Scenario: A command is retired

- **WHEN** a document names a `build-tool` verb, a `pnpm` script, or a `compendium` command that no longer exists
- **THEN** the documentation check fails and reports the command

#### Scenario: A document names local state

- **WHEN** a document names a path that Git ignores, such as `Local.props` or `website/data/compendium.db`
- **THEN** the documentation check accepts it

#### Scenario: A document uses a placeholder

- **WHEN** a path contains a placeholder such as `<Mod>` or a wildcard
- **THEN** the documentation check does not resolve it

#### Scenario: An OpenSpec change names a past or future path

- **WHEN** an OpenSpec change, active or archived, names a path that does not exist
- **THEN** the documentation check does not report it

### Requirement: The documentation check runs on every commit and in CI

The repository SHALL run the documentation check when a commit stages project documentation or an input the check reads, and on every CI run. A failure SHALL name the file, the line where one applies, and the problem, and SHALL name the skill that explains where each fact belongs.

Rationale: guidance alone did not stop the README from growing. A check that runs where documents change catches drift before it reaches the default branch.

#### Scenario: A commit breaks a reference

- **WHEN** a commit stages a document with a link that does not resolve
- **THEN** the pre-commit hook fails and names the file, the line, and the target

#### Scenario: An input changes under a document

- **WHEN** a commit renames a `pnpm` script that a document names
- **THEN** the pre-commit hook runs the documentation check and fails

#### Scenario: CI runs

- **WHEN** CI runs on a push or a pull request
- **THEN** it runs the documentation check on a checkout without local configuration
