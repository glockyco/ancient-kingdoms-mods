# Ancient Kingdoms

This repository owns MelonLoader mods, the Python export-to-SQLite pipeline, and the SvelteKit compendium website.

## Sources of truth

- Current behavior: `openspec/specs/`.
- Active changes and tasks: `openspec/changes/`.
- Project roadmap and historical planning index: `docs/plans/INDEX.md`.
- Product priorities: `docs/plans/2026-07-31-ancient-kingdoms-overview.md`.
- Setup, architecture, and commands: `README.md`.

Use OpenSpec for permanent behavior changes. Read all artifacts for the selected change before implementation. Validate completed changes with `openspec validate <change> --strict`.

## Instruction ownership

Keep an instruction only when its removal can cause a mistake, and place it by the moment it must
reach the agent. `rule://instruction-placement` carries the placement table and fires when an
instruction file is edited.

Before writing or materially revising technical prose anywhere in the repository, use
`skill://simplified-technical-english`.

## Engineering rules

- Read existing implementations before adding another instance of a pattern.
- Fail when required game data, files, or runtime objects are absent. Do not hide defects with silent defaults.
- A field-specific exporter default is permitted only when its contract defines absence as a valid domain value. `FieldDefaultValueHookFix` is the narrow runtime exception: when the requested field has no `FieldInfo`, return the original value and log the unsupported hook instead of crashing the game.
- During debugging, log the lookup result, relevant values before mutation, and the final result. Remove diagnostic noise after the defect is understood.
- Comments explain non-obvious invariants. Do not record edit history or use temporal narration.
- Prefer official tool defaults and existing repository conventions. Add custom configuration only for a verified repository constraint.
- Repository development occurs in the primary checkout. Temporary worktrees created inside a verification script are test fixtures, not a development workflow.

## Verification

Run checks that cover the changed subsystem and observable contract. Use the release or repository-wide gate only for cross-subsystem changes and releases.

- Mods: relevant `dotnet test` project, then `dotnet run --project build-tool build`.
- Pipeline: relevant tests under `build-pipeline/tests/` through the pinned `uv` environment.
- Website: relevant tests, `pnpm check`, and `pnpm lint`; run `pnpm build` for prerender, asset, or release behavior.
- Agent guidance: `scripts/check-agent-docs.sh`.

Commit through `skill://commit-policy`. Never push without explicit approval.
