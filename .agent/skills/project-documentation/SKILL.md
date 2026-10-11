---
name: project-documentation
description: Decide where a fact belongs and keep the documentation true. Use when adding, moving, or editing README.md, CONTRIBUTING.md, ARCHITECTURE.md, a mod's README, a skill, or a docs/ report, or when a task asks to document, record, or explain something.
---

# Project documentation

Each reader has one document, and each fact has one home. Other documents link to the home instead of repeating the fact. The `documentation-structure` spec states the rules, and `pnpm check:docs` enforces the parts a machine can verify.

## Where a fact goes

| The fact | Its home |
| --- | --- |
| What the project is, what the site offers, the published player mods, the shape of the pipeline | `README.md`, the front page. It stays under 1,000 words. |
| How to set up, run a workflow, check, or recover from a failure | `CONTRIBUTING.md` |
| How the parts fit, an invariant the code relies on, a boundary, a cross-cutting concept, a game runtime fact | `ARCHITECTURE.md`. Only what rarely changes. |
| What a mod does, its controls, settings, limits, and requirements | `mods/<Mod>/README.md`, plus one line in `mods/README.md` |
| A step-by-step procedure for recurring work | A skill under `.agent/skills/` |
| Required behaviour | `openspec/specs/`, through an OpenSpec change |
| Why code is written the way it is | A comment beside the code |
| Why a change was made | The commit message |
| A redaction rule and its reason | `redactions.toml` |
| A defect in the game itself | `docs/game-bugs/`, through the game-defect-reports skill |
| How to recover from a failure the tool can detect | The tool's error message |

## Writing

- Verify every claim against the code or an observation before writing it. Do not introduce a principle, a framing, or a count that the code and specs do not establish.
- Search for the fact first. When it already has a home, link to it.
- Describe current behaviour only. Leave out history.
- Prefer fixing an error message to adding a troubleshooting entry, and fix a defect rather than documenting it as usage.
- Use the shortest true sentence and one term for one thing.

## Moving or deleting

- Before deleting a document or a section, move any reason the code cannot express to its home, as the `documentation-lifecycle` spec requires.
- Repoint every reference to what moved, then search for the old name to confirm none remains.

## Checking

Run `pnpm check:docs`. It reports links, anchors, repository paths, `build-tool` verbs, `pnpm` scripts, and `compendium` commands that do not resolve, mod projects without a README, a front page over budget or without its guide links, and downloads that differ from `website/mod-downloads.json`. It cannot tell whether a sentence is true or in the right document; that part is yours.
