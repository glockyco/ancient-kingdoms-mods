# Migrate agent instructions to AGENTS.md

## Why

**The repository's agent instructions do not load.** OMP is the runtime. It discovers context
files from `.omp/AGENTS.md`, from `<cwd>/.claude/CLAUDE.md`, from `.agent[s]/AGENTS.md`, and from
standalone `AGENTS.md`. This repository has none of those. It has 17 `CLAUDE.md` files totalling
1,460 lines at the repository root and in subdirectories, and OMP reads none of them.

Verified: no `.omp/` directory exists, `.claude/` holds only `settings.local.json` and `skills/`,
and there is no `AGENTS.md` anywhere. The `claude` provider reads `<cwd>/.claude/CLAUDE.md` with
no ancestor walk-up, so a root `CLAUDE.md` is never a candidate. Empirically, a session opened at
the repository root receives a skills list but no `<repo-rules>` block.

So the repository has been maintaining, reviewing, and growing 1,460 lines of instructions that
have no effect. That explains the second finding.

**The content has decayed.** From the audit:

- `CLAUDE.md:16` routes commits to a skill named `commit`. No such skill exists. It is
  `commit-policy`.
- `build-pipeline/CLAUDE.md:21` says the build writes to `website/static/`, while `:15` and
  `website/CLAUDE.md:90-91` say `website/data/`.
- `website/CLAUDE.md:54` presents a complete route inventory that omits `achievements`,
  `factions`, `traps`, and `mechanics/reputation`.
- `website/CLAUDE.md:158-160` cites `citations.lock.json` with no location. That file does not
  exist under `website/`; the real one is at the repository root.
- `CLAUDE.md:52-55` forbids silent fallbacks; `mods/FieldDefaultValueHookFix/CLAUDE.md:24`
  prescribes one. They contradict.
- `mods/MonsterRespawner/CLAUDE.md:32-33` and `:42` contradict each other on whether the respawn
  write uses the server clock or `Time.timeAsDouble`.

**The governing policy is itself wrong and duplicated.** `docs/claude-md-guide.md` and
`.claude/skills/edit-claude-md/SKILL.md` are near-identical copies of one policy, both capping
root files at 150 lines and subproject files at 100. The published guidance is a single target of
under 200 lines, plus a mechanism neither copy mentions: move procedures and path-scoped guidance
out of the always-loaded file. Two files exceed even the official limit: `website/CLAUDE.md` (220)
and `website/src/lib/map/CLAUDE.md` (239).

**Nothing enforces any of it.** `lefthook.yml:69-75` validates `docs/plans/**`. No hook, CI job,
or script checks agent instructions, which is why every defect above survived.

**The layout is named after a tool this project does not run.** `.claude/` holds the 15 working
skills and a `settings.local.json` whose only content is Claude Code Bash permissions, which OMP
ignores. OMP's own canonical location for committed, project-scoped skills and rules is `.agent/`.

## What Changes

Target: **OMP only.** No compatibility shims for other agents.

- **Consolidate 17 `CLAUDE.md` into 5 `AGENTS.md`.** Root, `mods/`, `build-pipeline/`, `website/`,
  and `website/src/lib/map/`. Roughly 450 lines total, down from 1,460, every file under 200.
- **Delete all 13 `mods/*/CLAUDE.md`.** They describe what each mod does, which is rediscoverable
  from small C# sources, and they hold the worst duplication in the repository: the server-time
  expression `NetworkManagerMMO.offsetNetworkTime + NetworkTime.time` appears in four of them, and
  marker boilerplate is near-verbatim between `MonsterRespawner` and `ResourceRespawner`. Shared
  non-obvious facts hoist into `mods/AGENTS.md` once.
- **Fold two survivors into their skills.** `mods/DataExporter/CLAUDE.md` duplicates
  `docs/data-export-guide.md` and the `export-game-data` skill; `mods/HotReplCommands/CLAUDE.md`
  duplicates `hotrepl-runtime-inspection`. Each skill becomes the single source.
- **Adopt path-scoped rules.** OMP loads `.agent/rules/*.md` by walking from the working directory
  to the repository root, lists each by name and description, and serves the body on demand via
  `rule://`. Guidance that applies only when touching certain files becomes a rule with `globs`
  instead of bloating an always-loaded `AGENTS.md`. This is the mechanism that keeps the five
  files small.
- **Move skills to `.agent/skills/` and delete `.claude/` entirely.** `.claude/settings.local.json`
  configures a tool that is not used. **BREAKING** for anyone who relied on those permissions.
- **Delete the Task Triggers table.** OMP surfaces every skill by name and description and selects
  by task. A hand-maintained router duplicating that mechanism is exactly how `CLAUDE.md:16` rotted
  into pointing at a skill that does not exist.
- **Stop restating the README.** Root `CLAUDE.md` repeats the README's architecture diagram
  (`README.md:20-27`), subproject table (`:34-41`), and command blocks (`:139-151`, `:174-187`,
  `:252+`).
- **Collapse the doc policy into one skill.** Delete `docs/claude-md-guide.md`; replace
  `edit-claude-md` and `writing-skills` with `authoring-agent-docs`, stating the real limit, the
  OMP discovery rules, and the routing test.
- **Fix the seven vague skill descriptions.** OMP selects skills by matching the description, so a
  description without a trigger makes its skill unreachable in practice.
- **Repair stale skill references.** `create-new-mod` cites `BossTracker` sources that do not
  exist; `bootstrap-worktree` cites `exported-data/` files that do not exist.
- **Add enforcement.** `scripts/check-agent-docs.sh`, wired into `lefthook.yml`, fails on an
  oversized instruction file, a reappearing `CLAUDE.md`, a skill or rule missing required
  frontmatter, and a dead path reference.

Historical records under `docs/plans/archive/` are left untouched.

## Capabilities

### New Capabilities

- `agent-instructions`: How this repository stores, scopes, and validates instructions for coding
  agents. Covers which files the runtime discovers, the size and content rules that keep them
  loadable, the routing test that assigns guidance to an `AGENTS.md`, a rule, or a skill, and the
  automated check that enforces all of it.

### Modified Capabilities

None. No existing spec covers agent instructions.

## Impact

- **Deleted:** 17 `CLAUDE.md`, `docs/claude-md-guide.md`, `.claude/` (including
  `settings.local.json`).
- **Created:** 5 `AGENTS.md`, `.agent/rules/`, `.agent/skills/` (15 moved skills),
  `scripts/check-agent-docs.sh`.
- **Skills:** `edit-claude-md` and `writing-skills` merge into `authoring-agent-docs`; 7
  descriptions rewritten; 4 skills absorb folded content or reference fixes. Count goes 15 to 14.
- **Automation:** `lefthook.yml` gains an agent-docs check.
- **Prose references:** live mentions of `CLAUDE.md` in `README.md`, `docs/project-map.md`,
  `knip.config.ts:33`, and three active plans. Archived plans excluded.
- **Risk:** nothing in CI, the build, or the deploy reads these files, so the blast radius is
  limited to interactive agent quality.
- **Out of scope:** a sticky `.omp/RULES.md`, which would require un-ignoring `.omp/`
  (`.gitignore:67`); and the 105 drifted mechanics snapshots, which predate this change.
