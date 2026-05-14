# Worktree Bootstrap Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one canonical worktree bootstrap workflow that future human and agent sessions can run before website validation.

**Architecture:** Put executable behavior in `scripts/bootstrap-worktree.sh` and put agent decision-making in a focused project skill, `.claude/skills/bootstrap-worktree/SKILL.md`. The script links trusted local export inputs from a source checkout into the current worktree without replacing tracked files, installs dependencies per worktree, regenerates branch-local website outputs, and verifies prerequisites. Root and website `CLAUDE.md` files stay short and only route agents to the skill/script.

**Tech Stack:** Bash, git worktrees, pnpm workspace, uv Python pipeline, SvelteKit/Vite, Superpowers project skills.

---

## Audit findings incorporated

Domain-expert review found three plan blockers and one design adjustment:

1. **Do not symlink `exported-data/` wholesale.** Fresh worktrees already contain tracked files inside `exported-data/` (`README.md`, `classes.json`, `static_data.json`), so replacing the whole directory would fail and would be unsafe. The revised script keeps the worktree directory and symlinks only missing source-export entries inside it.
2. **Do not regenerate `website/static/og-default.png` during bootstrap.** It is tracked and intentionally committed; regenerating it during setup can dirty a clean worktree.
3. **Do not lint shell/Markdown through website ESLint.** Use `bash -n` plus script smoke tests for the shell script, and keep `pnpm check`/`pnpm lint` scoped to website code.
4. **Make the skill manual-only.** The workflow runs installs, symlink creation, and data generation. The skill should be available when explicitly loaded, not silently auto-invoked by the model.

---

## External research summary

- pnpm’s current worktree guidance says each worktree should have its own `node_modules`, while dependencies are shared through pnpm’s content-addressable store. Source: https://pnpm.io/next/git-worktrees
- pnpm global virtual store can make many worktrees cheaper, but it is an optional optimization, not a substitute for per-worktree setup. Source: https://pnpm.io/next/global-virtual-store
- Claude Code worktree docs state that fresh worktrees do not include untracked/gitignored files and must initialize their development environment. Source: https://code.claude.com/docs/en/worktrees
- Codex local environment docs make the same point: worktrees can miss dependencies and gitignored files, so setup scripts should bootstrap them. Source: https://developers.openai.com/codex/app/local-environments
- Skill best practices favor short, focused project skills for recurring non-obvious workflows, with executable details in scripts/supporting files. Source: https://code.claude.com/docs/en/skills

---

## Design decisions

- Canonical path: `scripts/bootstrap-worktree.sh <trusted-source-checkout>`.
- Trusted source checkout is a local checkout that already has current `config.toml` and generated export inputs.
- Link source inputs, not website outputs:
  - Link missing entries inside `exported-data/` from the trusted checkout.
  - Link `config.toml` if the current worktree does not already have one.
  - Link `Local.props` if the trusted checkout has one and the current worktree does not already have one.
- Preserve tracked worktree files under `exported-data/` (`README.md`, `classes.json`, `static_data.json`) and any user-owned existing file. Existing files are never overwritten.
- Regenerate branch-local website outputs:
  - `website/static/compendium.db`
  - `website/static/images/`
  - `website/static/tiles/`
  - `website/src/lib/generated/home-counts.ts`
- Do not regenerate `website/static/og-default.png` during bootstrap; it is a tracked asset and prebuild handles it when intentionally needed.
- Install dependencies per worktree with `pnpm install`; do not symlink `node_modules`.
- Always generate tiles during bootstrap. Current tile output is small enough that a second mode is not worth the maintenance burden.
- Always link `Local.props` when it exists in the trusted checkout. It is tiny, gitignored, and removing this mode keeps bootstrap canonical.
- Missing generated artifacts before bootstrap are setup failures, not code failures. After bootstrap succeeds, remaining validation failures are code/data-generation failures.

---

## File map

- Create: `scripts/bootstrap-worktree.sh`
  - Canonical executable bootstrap for fresh worktrees.
  - Validates source checkout, links input artifacts, installs dependencies, regenerates local website outputs, checks prerequisites.
- Create: `.claude/skills/bootstrap-worktree/SKILL.md`
  - Project-specific manual skill for when to run bootstrap, how to choose source checkout, and how to classify failures.
- Modify: `CLAUDE.md`
  - Add short trigger/routing note to use the skill before worktree validation.
- Modify: `website/CLAUDE.md`
  - Add short website-specific prerequisite note pointing to the skill/script.
- Modify: `README.md`
  - Add concise human-facing “Fresh worktree setup” section with the canonical command.
- Modify: `docs/project-map.md`
  - Correct stale pipeline output path and mention generated website support files.

---

### Task 1: Add the bootstrap script contract and help path

**Files:**
- Create: `scripts/bootstrap-worktree.sh`

- [ ] **Step 1: Create the script with CLI parsing and help**

Create `scripts/bootstrap-worktree.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/bootstrap-worktree.sh [options] <trusted-source-checkout>

Bootstrap a fresh Ancient Kingdoms git worktree using local generated export
inputs from a trusted checkout.

Options:
  -h, --help          Show this help text.


The script links input artifacts into the current worktree:
  config.toml, when absent
  missing entries under exported-data/
  Local.props, when present in the trusted checkout

It regenerates worktree-local outputs:
  website/static/compendium.db
  website/static/images/
  website/static/tiles/
  website/src/lib/generated/home-counts.ts
USAGE
}

source_checkout=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [[ -n "$source_checkout" ]]; then
        echo "Unexpected extra argument: $1" >&2
        usage >&2
        exit 2
      fi
      source_checkout="$1"
      shift
      ;;
  esac
done

if [[ -z "$source_checkout" ]]; then
  echo "Missing trusted source checkout path." >&2
  usage >&2
  exit 2
fi

printf 'Bootstrap contract parsed. Source: %s\n' "$source_checkout"
```

- [ ] **Step 2: Make the script executable**

Run:

```bash
chmod +x scripts/bootstrap-worktree.sh
```

- [ ] **Step 3: Verify help output**

Run:

```bash
scripts/bootstrap-worktree.sh --help
```

Expected: exit 0 and output beginning with:

```text
Usage: scripts/bootstrap-worktree.sh [options] <trusted-source-checkout>
```

- [ ] **Step 4: Verify missing source argument fails**

Run:

```bash
scripts/bootstrap-worktree.sh
```

Expected: exit 2 and stderr contains:

```text
Missing trusted source checkout path.
```

- [ ] **Step 5: Commit**

```bash
git add scripts/bootstrap-worktree.sh
git commit -m "chore: add worktree bootstrap script shell"
```

---

### Task 2: Implement safe source validation and input linking

**Files:**
- Modify: `scripts/bootstrap-worktree.sh`

- [ ] **Step 1: Replace the temporary final `printf` lines with validation helpers**

Replace the final three `printf` lines with:

```bash
repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "Run this script from inside an Ancient Kingdoms git worktree." >&2
  exit 1
}
repo_root=$(cd "$repo_root" && pwd -P)

source_checkout=$(cd "$source_checkout" && pwd -P) || {
  echo "Trusted source checkout does not exist: $source_checkout" >&2
  exit 1
}

if [[ "$source_checkout" == "$repo_root" ]]; then
  echo "Trusted source checkout must be a different checkout than the worktree being bootstrapped." >&2
  exit 1
fi

require_path() {
  local path="$1"
  local description="$2"
  if [[ ! -e "$path" ]]; then
    echo "Missing ${description}: ${path}" >&2
    exit 1
  fi
}

link_if_missing() {
  local source="$1"
  local dest="$2"
  local label="$3"

  if [[ -L "$dest" ]]; then
    local current
    current=$(readlink "$dest")
    if [[ "$current" == "$source" ]]; then
      printf 'Already linked %s: %s -> %s\n' "$label" "$dest" "$source"
      return
    fi
    echo "Refusing to replace existing symlink for ${label}: ${dest} -> ${current}" >&2
    exit 1
  fi

  if [[ -e "$dest" ]]; then
    printf 'Using existing %s: %s\n' "$label" "$dest"
    return
  fi

  ln -s "$source" "$dest"
  printf 'Linked %s: %s -> %s\n' "$label" "$dest" "$source"
}

link_exported_data_entries() {
  local source_dir="$1"
  local dest_dir="$2"

  mkdir -p "$dest_dir"

  shopt -s nullglob
  local source_path
  for source_path in "$source_dir"/*; do
    local name
    name=$(basename "$source_path")
    link_if_missing "$source_path" "$dest_dir/$name" "exported-data/$name"
  done
  shopt -u nullglob
}

require_path "$source_checkout/config.toml" "source config.toml"
require_path "$source_checkout/exported-data" "source exported-data directory"
require_path "$source_checkout/exported-data/visual_assets.json" "source visual asset manifest"
require_path "$source_checkout/exported-data/images" "source exported runtime images"
require_path "$source_checkout/exported-data/screenshots/metadata.json" "source screenshot metadata"

cd "$repo_root"
link_if_missing "$source_checkout/config.toml" "$repo_root/config.toml" "config.toml"
link_exported_data_entries "$source_checkout/exported-data" "$repo_root/exported-data"

if [[ -e "$source_checkout/Local.props" ]]; then
  link_if_missing "$source_checkout/Local.props" "$repo_root/Local.props" "Local.props"
fi
```

- [ ] **Step 2: Verify shell syntax**

Run:

```bash
bash -n scripts/bootstrap-worktree.sh
```

Expected: exit 0.

- [ ] **Step 3: Verify invalid source fails clearly**

Run:

```bash
scripts/bootstrap-worktree.sh /tmp/does-not-exist
```

Expected: non-zero exit and stderr contains:

```text
Trusted source checkout does not exist:
```

- [ ] **Step 4: Verify self-source is rejected**

Run from the primary checkout:

```bash
scripts/bootstrap-worktree.sh "$PWD"
```

Expected: non-zero exit and stderr contains:

```text
Trusted source checkout must be a different checkout
```

- [ ] **Step 5: Commit**

```bash
git add scripts/bootstrap-worktree.sh
git commit -m "chore: validate worktree bootstrap inputs"
```

---

### Task 3: Add dependency install and artifact generation

**Files:**
- Modify: `scripts/bootstrap-worktree.sh`

- [ ] **Step 1: Add command runner and generation steps**

Append this block after the linking block:

```bash
run() {
  printf '\n$'
  printf ' %q' "$@"
  printf '\n'
  "$@"
}

run pnpm install --no-frozen-lockfile
run bash -lc 'cd build-pipeline && uv run compendium build'
run bash -lc 'cd build-pipeline && uv run compendium tiles'

run bash -lc 'cd website && pnpm exec svelte-kit sync'
run bash -lc 'cd website && node scripts/generate-home-counts.mjs'
```

- [ ] **Step 2: Verify shell syntax**

Run:

```bash
bash -n scripts/bootstrap-worktree.sh
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/bootstrap-worktree.sh
git commit -m "chore: generate worktree website artifacts"
```

---

### Task 4: Add final prerequisite verification

**Files:**
- Modify: `scripts/bootstrap-worktree.sh`

- [ ] **Step 1: Add output verification**

Append this block after generation:

```bash
require_path "$repo_root/website/node_modules" "website dependencies"
require_path "$repo_root/website/static/compendium.db" "generated website database"
require_path "$repo_root/website/static/images" "generated website images"
require_path "$repo_root/website/src/lib/generated/home-counts.ts" "generated home counts module"
require_path "$repo_root/website/static/tiles" "generated map tiles"

cat <<'DONE'

Worktree bootstrap complete.

You can now run website validation:
  cd website
  pnpm check
  pnpm lint
  pnpm build
DONE
```

- [ ] **Step 2: Verify help still works without side effects**

Run:

```bash
scripts/bootstrap-worktree.sh --help
```

Expected: exit 0. No files are modified.

- [ ] **Step 3: Verify shell syntax**

Run:

```bash
bash -n scripts/bootstrap-worktree.sh
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add scripts/bootstrap-worktree.sh
git commit -m "chore: verify worktree bootstrap outputs"
```

---

### Task 5: Add project skill for agents

**Files:**
- Create: `.claude/skills/bootstrap-worktree/SKILL.md`

- [ ] **Step 1: Create skill directory and file**

Create `.claude/skills/bootstrap-worktree/SKILL.md`:

```markdown
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
```

- [ ] **Step 2: Validate skill structure manually**

Check:

```text
.claude/skills/bootstrap-worktree/SKILL.md
```

Expected:

- Directory name is `bootstrap-worktree`.
- Frontmatter `name` is `bootstrap-worktree`.
- Description starts with `Use when`.
- Frontmatter includes `disable-model-invocation: true` because bootstrap has side effects.
- Content is specific to this repo.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/bootstrap-worktree/SKILL.md
git commit -m "chore: add worktree bootstrap skill"
```

---

### Task 6: Route root and website guidance to the skill

**Files:**
- Modify: `CLAUDE.md`
- Modify: `website/CLAUDE.md`

- [ ] **Step 1: Update root `CLAUDE.md` task triggers**

Add a row to the Task Triggers table in `CLAUDE.md`:

```markdown
| Starting work in a git worktree or seeing missing generated website artifacts | Load skill: bootstrap-worktree |
```

- [ ] **Step 2: Add root worktree rule**

Add this subsection under `## Universal Guidelines` in `CLAUDE.md`:

```markdown
### Worktrees

Fresh git worktrees must be bootstrapped before website validation. Use the
`bootstrap-worktree` skill and run `scripts/bootstrap-worktree.sh <trusted-source-checkout>`.
Before bootstrap succeeds, missing dependencies or generated website artifacts
are setup failures, not code failures.
```

- [ ] **Step 3: Update website command prerequisites**

Add this paragraph after the command block in `website/CLAUDE.md`:

```markdown
In fresh git worktrees, load the root `bootstrap-worktree` skill before these
commands. Website validation assumes the bootstrap script has installed
dependencies and produced generated website artifacts.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md website/CLAUDE.md
git commit -m "docs: route agents through worktree bootstrap"
```

---

### Task 7: Update human-facing docs and project map

**Files:**
- Modify: `README.md`
- Modify: `docs/project-map.md`

- [ ] **Step 1: Add README fresh worktree setup**

Add this subsection after `First-time setup` in `README.md`:

```markdown
### Fresh worktree setup

Git worktrees contain tracked files only. Before running website checks or
builds in a fresh worktree, bootstrap it from a trusted checkout that already
has current local export inputs:

```bash
scripts/bootstrap-worktree.sh <trusted-source-checkout>
```

The script links missing source-export inputs from the trusted checkout, links
`Local.props` when present, then regenerates worktree-local website outputs. It
does not symlink `node_modules` or generated website outputs from another
worktree.
```

- [ ] **Step 2: Fix project map data flow**

Replace the current data flow block in `docs/project-map.md` with:

```markdown
```
Game (IL2CPP Unity)
  ↓ MelonLoader Mods
exported-data/*.json + exported-data/images/ + exported-data/screenshots/
  ↓ Python Build Pipeline
website/static/compendium.db + website/static/images/ + website/static/tiles/
  ↓ Website generated support files
website/src/lib/generated/
  ↓ SvelteKit Static Site
Cloudflare Static Assets
```
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/project-map.md
git commit -m "docs: document fresh worktree setup"
```

---

### Task 8: Verify the final workflow

**Files:**
- Test only; no planned file edits.

- [ ] **Step 1: Run script help**

Run:

```bash
scripts/bootstrap-worktree.sh --help
```

Expected: exit 0 and usage text appears.

- [ ] **Step 2: Run shell syntax check**

Run:

```bash
bash -n scripts/bootstrap-worktree.sh
```

Expected: exit 0.

- [ ] **Step 3: Run focused shell error checks**

Run:

```bash
scripts/bootstrap-worktree.sh /tmp/does-not-exist
```

Expected: non-zero exit and `Trusted source checkout does not exist`.

- [ ] **Step 4: Run a real bootstrap smoke check in a temporary worktree**

Only do this if the trusted source checkout has current exported data and there is no existing `/tmp/ak-bootstrap-smoke` path.

Run from the primary checkout:

```bash
git worktree add /tmp/ak-bootstrap-smoke HEAD
cd /tmp/ak-bootstrap-smoke
scripts/bootstrap-worktree.sh <trusted-source-checkout>
cd website
pnpm check
```

Expected:

```text
svelte-check found 0 errors and 0 warnings
```

- [ ] **Step 5: Remove the smoke worktree**

Because `/tmp/ak-bootstrap-smoke` was created only for this smoke test and contains generated ignored artifacts, remove it explicitly after checking that the path is the expected throwaway path:

```bash
cd <primary-checkout>
git worktree remove -f /tmp/ak-bootstrap-smoke
```

Expected: worktree removed.

- [ ] **Step 6: Run final supported validation**

Run:

```bash
bash -n scripts/bootstrap-worktree.sh
cd website
pnpm check
pnpm lint
```

Expected:

- `bash -n`: exit 0.
- `pnpm check`: 0 errors, 0 warnings.
- `pnpm lint`: exit 0.

- [ ] **Step 7: Final commit if verification changed tracked files**

Generated ignored artifacts must remain uncommitted.

```bash
git status --short
git add scripts/bootstrap-worktree.sh .claude/skills/bootstrap-worktree/SKILL.md CLAUDE.md website/CLAUDE.md README.md docs/project-map.md
git commit -m "chore: add canonical worktree bootstrap"
```

---

## Self-review

- Spec coverage: The plan implements a single canonical setup path, links trusted source inputs without replacing tracked exports, regenerates branch-local outputs, adds a project skill, updates agent and human docs, and fixes stale project-map output paths.
- Audit coverage: The revised plan fixes wholesale `exported-data/` symlinking, removes `og-default.png` bootstrap generation, replaces unsupported ESLint validation with `bash -n`, and marks the skill manual-only for side-effect safety.
- Placeholder scan: No `TODO`, `TBD`, or unspecified implementation steps remain. The only conditional step is smoke verification safety, with explicit commands and refusal criteria.
- Type/signature consistency: The script name is consistently `scripts/bootstrap-worktree.sh`; skill name and directory are consistently `bootstrap-worktree`; generated artifacts are consistently listed in the script and skill, while general docs point to the canonical script/skill to avoid drift.
