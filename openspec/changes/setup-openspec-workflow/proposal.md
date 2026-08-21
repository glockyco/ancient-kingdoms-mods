> **Superseded.** `centralize-openspec-workflow-adapters` in `glockyco/omp-agent-setup` moved the generated adapters into the personal plugin, so no repository tracks its own copy. That reverses this change's first two task groups, including the freshness check and its pinned dependency. The remaining discoverability work belongs to this repository's `AGENTS.md` migration, because the Task Triggers table this change would edit is removed by `migrate-agent-docs-to-agents-md`.

## Why

This repository uses OpenSpec — `openspec/changes/` holds four changes and `openspec/config.yaml` selects the `spec-driven` schema — but no agent adapters were ever generated here. No repository command or skill exposed the workflow, so every planning session had to drive the CLI by hand.

Generating them was not sufficient. `.gitignore` carried a blanket `.omp/` rule labelled "OMP agent session state (local only)", so the generated commands and skills landed inside an ignored path: invisible to Git and impossible to commit. Four sibling repositories track these files (`phd-thesis` 15, `erenshor-data-mining` 13, `HotRepl` 12, `nix-darwin` 12) and none ignores `.omp/` wholesale; `phd-thesis` ignores only `.omp/plugins/`.

Generated adapters also drift. `nix-darwin/flake.nix:282-301` guards against this with a check that regenerates the adapters and diffs them against the tracked files. That check only works because the adapters are committed.

## What Changes

- Track the generated OpenSpec adapters: 6 commands in `.omp/commands/` and 6 skills in `.omp/skills/`.
- Narrow the `.gitignore` rule from `.omp/` to `.omp/plugins/`, matching the sibling-repository convention.
- Add an adapter freshness check so a regenerated adapter set that differs from the tracked one fails the build rather than drifting silently.
- Add a task trigger in the repository guidance so an agent planning permanent work finds the OpenSpec workflow.

## Capabilities

### New Capabilities

- `agent-tooling-adapters`: The generated command and skill files that expose the OpenSpec workflow to coding agents in this repository, and the guarantees that they are tracked, current, and discoverable.

### Modified Capabilities

None.

## Impact

- **Version control:** `.gitignore`, and 12 previously ignored files under `.omp/`.
- **Checks:** `lefthook.yml`, `.github/workflows/ci.yml`.
- **Guidance:** the Task Triggers table in `CLAUDE.md`.
- **Tooling:** requires the `openspec` CLI, already on PATH at version 1.9.0.
- **Not changed:** `openspec/config.yaml`, the `spec-driven` schema, and the existing changes under `openspec/changes/`.
- **Coordination:** `migrate-agent-docs-to-agents-md` (in progress, 9/44 tasks) moves the guidance out of `CLAUDE.md`. Both changes add rows to the same table, so whichever lands second applies its row to the surviving file.
