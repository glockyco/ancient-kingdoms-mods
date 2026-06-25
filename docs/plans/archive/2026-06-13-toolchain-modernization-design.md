---
title: "Toolchain Modernization — Spec & Tracking"
type: spec
status: implemented
created: 2026-06-13
parent:
superseded_by:
archived: 2026-06-25
---

# Toolchain Modernization — Spec & Tracking

**Status:** complete (tracking doc; not committed; no separate plan file by request)
**Date:** 2026-06-13
**Branch:** `main` (in-place, per user)

**Goal:** Bring the `website` JS toolchain and `build-pipeline` Python deps to latest — **all majors** (TypeScript 6, ESLint 10, Lucide 1, Vite 8) — migrate husky→lefthook, add minimal GitHub Actions CI, and tighten build/lint hygiene.

**Approach:** Sequenced clusters. Each risky major lands in **its own commit behind a verification gate**, so any breakage is bisectable to a single upgrade. (Rejected: big-bang bump-all — conflates failures.)

**Tech stack:** pnpm 10.22 workspace (`website` JS + `build-pipeline` Python/uv); SvelteKit 2 + Svelte 5 + Vite + Tailwind 4; ESLint flat + prettier; Vitest; adapter-cloudflare; ruff/mypy/pytest/vulture.

## Conventions

- **Commits:** Conventional Commits, one per cluster after its gate passes. Targeted `git add <paths>` only — NEVER `git add -A` (untracked `docs/`, `.omp/` must stay out).
- **Bump command:** `pnpm -F website add -D <pkg>@latest` (deps via `add`, not `-D`) — updates caret range + root lockfile together.
- **Keep caret ranges** (lockfile pins exact); package-manager pinned separately.

## Verification gate (run after every cluster)

```
pnpm -F website check     # svelte-check (type + svelte diagnostics)
pnpm -F website lint      # eslint flat
pnpm -F website test      # vitest
pnpm -F website build     # full SvelteKit build incl. prerender — real integration test
```
Python clusters additionally: `cd build-pipeline && uv run ruff check . && uv run mypy . && uv run pytest`

---

## Step 0 — Clean baseline

- [x] Removed orphaned `website/pnpm-lock.yaml`; root lockfile authoritative. — `c7ea1539`

## Phase A — Dependency clusters

### Cluster 1 — safe minors/patches (+ Vite8/TS6 prereqs)
Targets: `@sveltejs/kit`@2.65, `svelte`@5.56, `svelte-check`@4.6, `@deck.gl/*`@9.3.4, `vitest`@4.1.8, `postcss`, `tailwindcss`@4.3.1, `tailwind-merge`, `tailwind-variants`, `typescript-eslint`@8.61, `eslint-plugin-svelte`@3.19, `@eslint/compat`@2.1, `@internationalized/date`, `prettier`@3.8, `knip`@6.16 (root), `@cloudflare/workers-types`.
- [x] Bumped → gate → committed. — `a72f0b52` (also fixed 30 `state_referenced_locally` warnings; added `@types/node`)

### Cluster 2 — Vite 8
Targets: `vite`@8, `@sveltejs/vite-plugin-svelte`@7. Verify dev + build + adapter-cloudflare output + vitest. Note: Vite 8 dev ~7× RAM vs 7.
- [x] Bumped → gate → committed; no config changes needed. — `3d136970`

### Cluster 3 — ESLint 10
Targets: `eslint`@10, `@eslint/js`@10, `globals`@17. Flat config already in use; adjust only if a plugin peer complains. (typescript-eslint 8.61 + eslint-plugin-svelte 3.19 already support eslint 10.)
- [x] Bumped → gate → committed. — `9823bc8d` (prettier flat import; `no-useless-assignment` fixes; MapSidebar `$bindable` refactor)

### Cluster 4 — TypeScript 6
Targets: `typescript`@6. Watch-item: TS6 disables `@types` auto-scanning (you use `@types/better-sqlite3`, `@types/sql.js`, workers-types). `strict`/`skipLibCheck` already set → those flips are no-ops. Run svelte-check; fix type errors / add explicit `types` if needed.
- [x] Bumped → gate → committed; zero config/code changes (check 0/0). — `94e76388`

### Cluster 5 — Lucide 1
Targets: `@lucide/svelte`@1, `lucide`@1. Two surfaces: (a) 68+ components using `@lucide/svelte/icons/<kebab>` subpaths — build flags renamed/removed; (b) `src/lib/map/icons.ts` uses vanilla `lucide` `IconNode` API — verify v1 shape. Build + eyeball map atlas.
- [x] Bumped → build/verify → committed; zero code changes (vanilla `IconNode` shape unchanged). — `144c44ab`

### Cluster 6 — remaining majors
Targets: `lint-staged`@17 (root), `prettier-plugin-svelte`@4.
- [x] `prettier-plugin-svelte`@4 only (lint-staged removed in Cluster 8) → committed; added `.prettierignore`, reformatted 24 files. — `e2e0115f`

### Cluster 7 — Python build-pipeline
`cd build-pipeline && uv lock --upgrade`; bump dev-tool floors (ruff/mypy/pytest/vulture) in `pyproject.toml`. Python gate.
- [x] `uv lock --upgrade` (mypy 1→2 major) → gate → committed. — `e06d8a78` (contract-test fix) + `3d41abf0` (upgrade)

## Phase B — tooling & hygiene

### Cluster 8 — husky → lefthook
Create root `lefthook.yml`: pre-commit globs scope JS checks to `website/**` (prettier + eslint --fix + svelte-check) and Python to `build-pipeline/**` (ruff format/check + mypy); commit-msg runs commitlint. Remove `.husky/`, both `.lintstagedrc.json`, the `husky` dep + root `prepare` script; add `lefthook` dep + its install step. Verify hooks fire on a test commit.
- [x] Migrated husky→lefthook → verify → committed. — `1e45b217` (removed `min_version`; check+test on pre-commit per user)

### Cluster 9 — GitHub Actions CI
**Decision (user):** lightweight CI — `website/static/compendium.db` is an untracked 16.5 MB build-pipeline artifact (its source data is also uncommitted), so anything DB-dependent can't run on a clean checkout. **Dropped from CI (stay local via lefthook): `build`, the 5 DB vitest suites, AND `check`** — `svelte-check` needs `src/lib/generated/home-counts.ts`, which is gitignored and generated from the DB. `lint` stays: the ESLint config is not type-aware and ignores the generated dir.
`.github/workflows/ci.yml` (push/PR, `permissions: contents: read`, concurrency cancel): **lockfile-guard** (no nested `pnpm-lock.yaml`) · **website** `pnpm install --frozen-lockfile` (drift gate) + lint · **build-pipeline** setup-uv + `uv sync --frozen` + ruff format/lint + mypy + vulture + pytest. Node 24; actions pinned to current majors — checkout@v6, setup-node@v6, pnpm/action-setup@v6, **setup-uv@v8.2.0** (no `v8` major-alias tag exists; v1–v7 have them, v8 ships full versions only).
- [x] Added (`45a79306`) → first run red → fixed (`de235988`: setup-uv pin + drop `check`) → **CI green on push** (run 27461550128, all 3 jobs pass).

### Cluster 10 — config hygiene
Added corepack integrity hash to root `packageManager` (generated via corepack); moved `engine-strict` → root `.npmrc` + added root `engines.node` (`^20.19.0 || ^22.13.0 || >=24`, ESLint 10's range); added `.github/dependabot.yml` (npm + github-actions + uv, minor/patch grouped); folded in lefthook prettier/eslint glob fix (added `.mjs`/`.cjs`).
- [x] Applied → `pnpm install --frozen-lockfile` verifies engine-strict + lockfile → committed. — `d61f1e7a`

## Final verification
- [x] Full gate green — website check 0/0, lint clean, prettier clean, 146 tests pass, build OK (vite 8); Python ruff/mypy/vulture + 20 pytest pass; single root lockfile; tree clean of tracked changes.

## Out of scope
Runtime/feature changes; worker-split topology (settled); oxlint/biome (ruled out). Optional, omitted unless requested: pnpm `minimum-release-age`.
