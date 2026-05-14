---
name: bootstrap-worktree
description: Use when starting work in a fresh git worktree, when website validation fails from missing generated artifacts, or when preparing a worktree for Ancient Kingdoms development.
disable-model-invocation: true
---

# Bootstrap Worktree

Fresh git worktrees contain tracked files only. This repo also needs local,
gitignored export inputs and generated website artifacts before validation is
meaningful.

## Canonical command

Run from the worktree root:

```bash
scripts/bootstrap-worktree.sh <trusted-source-checkout>
```

`<trusted-source-checkout>` must be another local checkout that has current
`config.toml` and `exported-data/` contents.

The script always generates map tiles so there is only one bootstrap mode.

The script links `Local.props` when the trusted checkout has one, so there is
only one bootstrap mode for website and mod/build-tool worktrees.

## What the script links

Inputs linked from the trusted checkout:

- `config.toml`, if missing in the worktree
- missing entries under `exported-data/`
- `Local.props`, when present in the trusted checkout

The script preserves tracked worktree files already present under
`exported-data/`, such as `README.md`, `classes.json`, and `static_data.json`.

## What the script regenerates locally

Outputs regenerated inside the current worktree:

- `website/static/compendium.db`
- `website/static/images/`
- `website/static/tiles/`
- `website/src/lib/generated/home-counts.ts`

Do not symlink `node_modules`, `website/static/*` outputs, or
`website/src/lib/generated/` from another worktree. Those outputs must match the
current branch's code.

## Failure classification

Before bootstrap succeeds, these are setup failures, not code failures:

- missing `node_modules`
- `vitest: command not found`
- missing `$lib/generated/home-counts`
- missing `website/static/compendium.db`
- prerender 404s for `website/static/images/...`
- missing `website/static/tiles/`

After bootstrap succeeds, remaining validation failures are code or data
integration failures and should be debugged normally.
