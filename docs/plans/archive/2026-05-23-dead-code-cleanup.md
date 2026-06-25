---
title: "Dead Code & Documentation Cleanup"
type: plan
status: implemented
created: 2026-05-23
parent:
superseded_by:
archived: 2026-06-25
---

# Dead Code & Documentation Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Remove every identified dead file, stub, and symbol; annotate disabled code with TODO markers; wire in vulture and knip so dead code is caught automatically going forward.

**Architecture:** All changes are purely subtractive or additive-config — no behaviour changes. Tasks are grouped by subproject and ordered cheapest-to-verify first. Each task ends with a commit. Knip and vulture are wired into the existing root lint/check aggregators so `pnpm check` covers everything after this plan lands.

**Tech Stack:** git, Python (vulture), TypeScript/Node (knip), pnpm workspace root scripts

---

## Background — what the tools found

### Tools used

| Language | Tool | Confidence approach |
|---|---|---|
| Python | **vulture** (`uv run vulture src/ --min-confidence 80`) | 80 % threshold; Pydantic model fields are false positives at < 80% — confirmed and ignored |
| TypeScript | **knip** (`pnpm dlx knip`) | Component-library barrel re-exports are known false positives — addressed in config |

---

## Task 1: Delete three dead tracked files (the original plan)

**Files:**
- Delete: `scripts/extract-assets.py`
- Delete: `tools/analyze_borders.py`, `tools/stitch_screenshots.py`, `tools/pyproject.toml`, `tools/uv.lock`
- Delete: `docs/seo-work-audit-2026-05-15.md`

- [x] **Step 1: Confirm no references exist to any of the three targets**

```bash
git grep -r "extract-assets\|tools/\|seo-work-audit" -- \
  '*.md' '*.py' '*.cs' '*.toml' '*.sh' '*.ts' '*.svelte'
```

Expected: no output (or only matches inside the files being deleted).

- [x] **Step 2: Delete**

```bash
git rm scripts/extract-assets.py
git rm -r tools/
git rm docs/seo-work-audit-2026-05-15.md
```

- [x] **Step 3: Commit**

```bash
git commit -m "chore: remove dead scripts and audit doc

scripts/extract-assets.py automated AssetRipper-based Unity asset
extraction. The visual pipeline it served was superseded when
DataExporter gained runtime image export (visual_assets.json).

tools/ contained stitch_screenshots.py and analyze_borders.py,
one-off scripts from the screenshot-mapping era. compendium tiles
replaced this work.

docs/seo-work-audit-2026-05-15.md was a review of commits
71d2a5d–d4c44e2. P1 (JSON-LD injection) was fixed; P3 was
intentionally accepted. Not referenced from any CLAUDE.md."
```

---

## Task 2: Remove dead files from the website

Knip initially flagged seven files; one (`scripts/snapshot-mechanics.mjs`) is a false
positive — it is the mechanics regression-test tool documented in `website/CLAUDE.md`
and invoked via `node scripts/snapshot-mechanics.mjs`. The remaining **six** are
confirmed dead by exhaustive `git grep` across all `.ts`, `.svelte`, `.js`, and `.mjs`
files in the `website/` tree.

**Files:**
- Delete: `website/src/lib/config.ts` — exports `PAGINATION = { PAGE_SIZE: 50 }` which is never imported; every overview page instead has its own local `const PAGE_SIZE = 20`
- Delete: `website/src/lib/index.ts` — auto-generated SvelteKit placeholder comment, no exports
- Delete: `website/src/lib/queries/altars.ts` — client-side sql.js query helpers; altar routes use their own `better-sqlite3` server-side queries
- Delete: `website/src/lib/seo/indexnow-key.ts` — `INDEXNOW_KEY` is hardcoded directly in `scripts/indexnow-ping.mjs`, this module is never imported
- Delete: `website/src/lib/server/item-zones.ts` — 6 zone-item query functions; never imported; items page uses the lighter `getItemZones()` from `$lib/queries/items.server.ts` instead
- Delete: `website/src/lib/types/item-zones.ts` — type companion to the dead server module; routes use `ItemZoneInfo` from `$lib/types/items.ts`

- [x] **Step 1: Confirm no importers exist**

```bash
cd website
git grep -rn \
  "lib/config[^/]\\|lib/index[^/]\\|queries/altars\\|seo/indexnow-key\\|server/item-zones\\|types/item-zones" \
  -- '*.ts' '*.svelte' '*.js' '*.mjs'
```

Expected: matches only within the six files themselves. Any match in a different file means an importer was missed — investigate before deleting.

- [x] **Step 2: Delete**

```bash
cd website
git rm src/lib/config.ts \
       src/lib/index.ts \
       src/lib/queries/altars.ts \
       src/lib/seo/indexnow-key.ts \
       src/lib/server/item-zones.ts \
       src/lib/types/item-zones.ts
```

- [x] **Step 3: Verify TypeScript check still passes**

```bash
cd website
pnpm check
```

Expected: no errors.

- [x] **Step 4: Commit**

```bash
cd website
git add -u
git commit -m "chore(website): remove six dead files

Six files had zero importers confirmed by exhaustive grep:
- src/lib/config.ts: PAGINATION (PAGE_SIZE: 50) never imported;
  overview pages each hardcode PAGE_SIZE: 20 locally
- src/lib/index.ts: empty SvelteKit placeholder comment
- src/lib/queries/altars.ts: client-side sql.js altar queries;
  altar routes use their own server-side better-sqlite3 queries
- src/lib/seo/indexnow-key.ts: INDEXNOW_KEY hardcoded directly
  in scripts/indexnow-ping.mjs, module never imported
- src/lib/server/item-zones.ts: zone-item query API with no
  callers; items page uses getItemZones() from items.server.ts
- src/lib/types/item-zones.ts: type companion to item-zones.ts

Note: scripts/snapshot-mechanics.mjs was initially flagged by
knip but is NOT dead — it is the mechanics regression-test tool
documented in CLAUDE.md under 'Mechanics Snapshots'."
```

---

## Task 3: Remove dead symbols from build-pipeline

**Files:**
- Modify: `build-pipeline/src/compendium/cli.py`
- Modify: `build-pipeline/src/compendium/config.py`
- Modify: `build-pipeline/src/compendium/models.py`
- Modify: `build-pipeline/src/compendium/types/denormalized.py`
- Modify: `build-pipeline/src/compendium/denormalizers/items/zones.py`

### 3a — Remove stub CLI commands

`icons`, `types`, `deploy`, `validate`, `all` are `@app.command()` functions that print
"not yet implemented". They surface to users via `compendium --help` and create a false
impression that the pipeline is more capable than it is.

- [x] **Step 1: Verify the five functions have no callers**

```bash
cd build-pipeline
uv run python -c "
import ast, pathlib
src = pathlib.Path('src/compendium/cli.py').read_text()
tree = ast.parse(src)
for node in ast.walk(tree):
    if isinstance(node, ast.FunctionDef):
        print(node.name, [ast.unparse(d) for d in node.decorator_list])
"
```

Expected: `icons`, `types`, `deploy`, `validate`, `all` each have only `app.command()` as decorator — no other callers in the output.

- [x] **Step 2: Remove the five stub commands from `cli.py`**

Open `src/compendium/cli.py`. Delete the following five blocks in their entirety (decorator + function body):

```python
# DELETE this block:
@app.command()
def icons(ctx: typer.Context):
    """Visual assets are loaded and copied by the build command."""
    console.print("[yellow]visual assets are handled by `compendium build`[/yellow]")


# DELETE this block:
@app.command()
def types(ctx: typer.Context):
    """Generate TypeScript types from SQLite schema."""
    console.print("[yellow]types command not yet implemented[/yellow]")


# DELETE this block:
@app.command()
def deploy(ctx: typer.Context):
    """Deploy artifacts to website."""
    console.print("[yellow]deploy command not yet implemented[/yellow]")


# DELETE this block:
@app.command()
def validate(ctx: typer.Context):
    """Validate JSON exports."""
    console.print("[yellow]validate command not yet implemented[/yellow]")


# DELETE this block:
@app.command()
def all(ctx: typer.Context):
    """Run complete pipeline (validate → build → tiles → icons → types → deploy → stats)."""
    console.print("[bold]Running complete build pipeline...[/bold]")
    console.print("[yellow]all command not yet implemented[/yellow]")
```

- [x] **Step 3: Verify the help output only lists the real commands**

```bash
cd build-pipeline
uv run compendium --help
```

Expected output contains only: `build`, `tiles`, `stats`.

### 3b — Remove `resolve_path` from `config.py`

- [x] **Step 4: Confirm no callers**

```bash
cd build-pipeline
git grep -rn "resolve_path" -- '*.py'
```

Expected: only the definition line in `config.py`.

- [x] **Step 5: Delete `resolve_path` from `config.py`**

Remove the function and its docstring (approximately lines 35–55). The surrounding module should remain intact.

- [x] **Step 6: Verify mypy still passes**

```bash
cd build-pipeline
uv run mypy .
```

Expected: no errors introduced.

### 3c — Remove `ZoneBounds` from `models.py`

- [x] **Step 7: Confirm no importers**

```bash
cd build-pipeline
git grep -rn "ZoneBounds" -- '*.py'
```

Expected: only the class definition in `models.py`.

- [x] **Step 8: Delete the `ZoneBounds` class from `models.py`**

Remove the class and its docstring.

### 3d — Remove `MonsterDropInfo` from `types/denormalized.py`

- [x] **Step 9: Confirm no importers**

```bash
cd build-pipeline
git grep -rn "MonsterDropInfo" -- '*.py'
```

Expected: only the class definition in `types/denormalized.py`.

- [x] **Step 10: Delete the `MonsterDropInfo` class from `types/denormalized.py`**

Remove the class and its docstring.

### 3e — Annotate disabled zone denormalizer functions

Five complete SQL implementations exist in `denormalizers/items/zones.py` but are never
called from `run()`: `_populate_treasure_map_zones`, `_populate_recipe_source_zones`,
`_populate_recipe_usage_zones`, `_populate_quest_usage_zones`, `_populate_currency_zones`.

Do **not** delete these — they represent planned item-zone filtering coverage. Add a
`# TODO` comment above each one so the intent is visible and vulture stops flagging them.

- [x] **Step 11: Add TODO comments above each disabled function**

In `src/compendium/denormalizers/items/zones.py`, prepend the following comment to each
of the five functions:

```python
# TODO: not wired into run() — enable when item-zone filtering is needed
def _populate_treasure_map_zones(conn: sqlite3.Connection) -> None:
```

```python
# TODO: not wired into run() — enable when item-zone filtering is needed
def _populate_recipe_source_zones(conn: sqlite3.Connection) -> None:
```

```python
# TODO: not wired into run() — enable when item-zone filtering is needed
def _populate_recipe_usage_zones(conn: sqlite3.Connection) -> None:
```

```python
# TODO: not wired into run() — enable when item-zone filtering is needed
def _populate_quest_usage_zones(conn: sqlite3.Connection) -> None:
```

```python
# TODO: not wired into run() — enable when item-zone filtering is needed
def _populate_currency_zones(conn: sqlite3.Connection) -> None:
```

### 3f — Commit all build-pipeline changes

- [x] **Step 12: Run ruff and mypy across the pipeline**

```bash
cd build-pipeline
uv run ruff check .
uv run mypy .
```

Expected: clean (no new errors).

- [x] **Step 13: Commit**

```bash
cd build-pipeline
git add -u
git commit -m "chore(build-pipeline): remove dead symbols and annotate disabled code

Remove stub CLI commands (icons, types, deploy, validate, all) that
printed 'not yet implemented' and polluted compendium --help output.

Remove dead symbols confirmed by vulture --min-confidence 80:
- config.resolve_path (no callers)
- models.ZoneBounds (no importers)
- types/denormalized.MonsterDropInfo (no importers)

Add TODO comments to five _populate_*_zones functions that are fully
implemented but not yet wired into run(). Annotating rather than
deleting preserves planned item-zone filtering coverage."
```

---

## Task 4: Wire in vulture for ongoing Python dead-code detection

**Files:**
- Modify: `build-pipeline/pyproject.toml`
- Modify: `package.json` (root)

Vulture is already installed in the build-pipeline venv from earlier in this session. This
task makes it a declared dev dependency and wires it into the existing check pipeline.

### 4a — Add vulture to `build-pipeline/pyproject.toml`

- [x] **Step 1: Add vulture to dev dependencies and configure it**

In `build-pipeline/pyproject.toml`, add `vulture` to the `[dependency-groups] dev` list
and append a `[tool.vulture]` section:

```toml
[dependency-groups]
dev = [
    "mypy>=1.18.2",
    "pytest>=9.0.3",
    "ruff>=0.14.5",
    "vulture>=2.14",
]

[tool.vulture]
min_confidence = 80
paths = ["src/"]
# Pydantic model field annotations are accessed dynamically; exclude them.
ignore_decorators = ["validator", "field_validator", "model_validator"]
```

- [x] **Step 2: Sync to lock the version**

```bash
cd build-pipeline
uv sync
```

Expected: vulture pinned in `uv.lock`, no errors.

- [x] **Step 3: Run vulture to confirm zero findings after Task 3**

```bash
cd build-pipeline
uv run vulture src/ --min-confidence 80
```

Expected: no output (exit 0). If any new findings appear, investigate before committing.

### 4b — Wire vulture into the root `check:py` script

- [x] **Step 4: Update root `package.json`**

The current `check:py` script is:

```json
"check:py": "cd build-pipeline && uv run mypy ."
```

Change it to:

```json
"check:py": "cd build-pipeline && uv run mypy . && uv run vulture src/ --min-confidence 80"
```

- [x] **Step 5: Verify `pnpm check:py` is clean**

```bash
pnpm check:py
```

Expected: mypy passes, vulture exits 0.

- [x] **Step 6: Commit**

```bash
git add build-pipeline/pyproject.toml build-pipeline/uv.lock package.json
git commit -m "chore(build-pipeline): add vulture dead-code linting

vulture --min-confidence 80 is now part of pnpm check:py.
Pydantic dynamic field access is handled via ignore_decorators.
The five disabled _populate_*_zones functions are annotated with
TODO comments which vulture recognises as intentional."
```

---

## Task 5: Wire in knip for ongoing TypeScript dead-code detection

**Files:**
- Create: `knip.config.ts` (workspace root)
- Modify: `package.json` (root)

Knip's canonical guidance for pnpm workspaces: run from the repo root with a `workspaces`
config block. Entry/project options at the root level are silently ignored — the relevant
settings go under `workspaces["."]` (root scripts) and `workspaces["website"]`.

- [x] **Step 1: Install knip at the workspace root**

```bash
pnpm add -D knip --workspace-root
```

Expected: knip added to root `package.json` devDependencies and locked in root
`pnpm-lock.yaml`.

- [x] **Step 2: Create `knip.config.ts` at the repo root**

```typescript
import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    // Root workspace: build scripts only
    ".": {
      entry: ["scripts/*.sh", "scripts/*.py"],
      project: ["scripts/**"],
    },
    // Website workspace: SvelteKit + Vite project
    website: {
      entry: [
        "src/routes/**/+{page,layout,error,server}.{ts,svelte}",
        "src/routes/**/+{page,layout,error}.server.ts",
        "src/service-worker.ts",
        "src/app.{ts,html,css,d.ts}",
        "scripts/*.{mjs,ts}",
        "vite.config.ts",
        "svelte.config.js",
        "wrangler.toml",
        "wrangler.redirect.toml",
      ],
      project: ["src/**/*.{ts,svelte}", "scripts/**/*.{mjs,ts}"],
      // Component library barrel re-exports (bits-ui/shadcn-style index.ts files)
      // are re-exported but Knip can't trace Svelte component imports through them.
      // Silence the noise; actual unused components will still surface as unused files.
      ignoreDependencies: [],
      ignore: [
        "src/lib/components/ui/**",
        "src/lib/components/map/sidebar/index.ts",
        "src/lib/components/monster-table/index.ts",
      ],
    },
  },
};

export default config;
```

- [x] **Step 3: Run knip and review remaining output**

```bash
pnpm knip
```

Review the output. The component-library barrels are suppressed by the `ignore` list above.
Any remaining "Unused files" findings are real candidates. If new unexpected findings appear,
either fix them or add a targeted `ignore` entry with an inline comment explaining why.

- [x] **Step 4: Add `check:knip` to the root `package.json` scripts**

```json
"check:knip": "knip",
"check": "pnpm check:ts && pnpm check:py && pnpm check:knip",
```

- [x] **Step 5: Verify the full check suite passes**

```bash
pnpm check
```

Expected: `check:ts`, `check:py`, and `check:knip` all exit 0.

- [x] **Step 6: Commit**

```bash
git add knip.config.ts package.json pnpm-lock.yaml
git commit -m "chore: add knip dead-code linting for TypeScript/website

knip runs from the workspace root (Knip's canonical approach for
pnpm workspaces). The config targets the website workspace with
SvelteKit entry points and suppresses component-library barrel
re-exports which produce known false positives.

pnpm check:knip is now part of pnpm check."
```
