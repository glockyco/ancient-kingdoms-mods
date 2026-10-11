## Why

The README serves two readers who want different things. Players arrive from search to look at the mods, and contributors and agents arrive to set up and run workflows. It holds both in 2,900 words, longer than every reference README studied for this change, and it has grown into a grab-bag twice because nothing says where a new fact goes other than the most visible file. Splitting the documentation by reader, and enforcing what a machine can check, keeps each document short enough to stay true.

## What Changes

- `README.md` becomes a front page: what the project is, what the site offers, the published player mods with their downloads, how the pipeline works in one diagram, and links onward. It stays under 1,000 words.
- New `CONTRIBUTING.md` holds requirements, setup, workflows, checks, and troubleshooting for the maintainer and agents. It does not invite outside contributions. GitHub shows it as a tab beside the README.
- New `ARCHITECTURE.md` holds the code map, the invariants the code and specs enforce, the boundaries between its parts, the cross-cutting concepts, and the game runtime facts. It states only what rarely changes.
- New `mods/README.md` catalogues every mod, and each mod project gets a `README.md` with what it does, how it is used, its settings, its limits, and what it requires.
- New skill `project-documentation` tells an agent where a new fact belongs and how to edit documentation without losing or duplicating facts.
- New `compendium docs check`, run by `pnpm check:docs`, the pre-commit hook, and CI. It fails when a documentation link, anchor, repository path, `build-tool` verb, `pnpm` script, or `compendium` command does not resolve, when a mod project lacks a README, when the front page exceeds its budget or stops linking the two guides, or when its download list differs from `website/mod-downloads.json`.
- Every live reference to a moved README section is repointed.

## Capabilities

### New Capabilities

- `documentation-structure`: Which document owns which kind of fact, the limits on the front page, the documentation every mod carries, and the references the documentation check resolves.

### Modified Capabilities

None. `documentation-lifecycle` still governs when a document is corrected or deleted, and this change does not alter its requirements.

## Impact

- **Documentation:** `README.md` is rewritten. `CONTRIBUTING.md`, `ARCHITECTURE.md`, `mods/README.md`, 14 `mods/<Mod>/README.md` files, and `.agent/skills/project-documentation/SKILL.md` are added.
- **Code:** a `docs` command group in `build-pipeline/src/compendium/`, with tests. The CLI callback stops requiring `config.toml` for that group, because the check reads only tracked files and must run in CI.
- **Automation:** `package.json` gains `check:docs` and runs it from `check`. `lefthook.yml` gains a documentation job, and the build-pipeline CI job gains a documentation step.
- **References:** `knip.config.ts`, `Local.props.example`, the HotRepl skill's observing-behaviour reference, and two open OpenSpec changes name README sections that move.
- **Unaffected:** the site, the mods' behaviour, the build, and the exported data. Archived OpenSpec changes are history and keep the names they recorded.
