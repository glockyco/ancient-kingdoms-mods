## 1. Write the instruction files

- [ ] 1.1 Write root `AGENTS.md`: data-flow summary, the universal rules that survived the audit
      (logging, comments, fail-fast, modern standards), and pointers to `docs/plans/INDEX.md` and
      `docs/project-map.md`. Do NOT restate `README.md:20-27`, `:34-41`, `:139-151`, `:174-187`,
      or `:252+`. Do NOT include a Task Triggers table. Under 200 lines.
- [ ] 1.2 Write `mods/AGENTS.md` from `mods/CLAUDE.md` always-on content, hoisting the shared
      per-mod facts exactly once: the server-time expression
      `NetworkManagerMMO.offsetNetworkTime + NetworkTime.time` (duplicated at
      `MonsterRespawner:32`, `ResourceRespawner:38`, `ResourceRespawner:69`, `BossTracker:22`), the
      `TextMesh` plus `BoxCollider` marker pattern (`MonsterRespawner:20-22`,
      `ResourceRespawner:25-27`), and the shared scene/cache note (`BossTracker:16-17`,
      `MapEnhancer:21-22`). Under 200 lines.
- [ ] 1.3 Write `build-pipeline/AGENTS.md`. Resolve the output-path contradiction: `:21` says
      `website/static/`, `:15` and `website/CLAUDE.md:90-91` say `website/data/`. Verify against
      `build-pipeline/src/compendium/commands/build.py` and state the verified path once.
- [ ] 1.4 Write `website/AGENTS.md` from the 220-line original. Drop the route inventory at `:54`
      rather than repairing it; it already omits four real routes and will rot again. Fix the
      `citations.lock.json` reference at `:158-160` to name the repository-root path.
- [ ] 1.5 Write `website/src/lib/map/AGENTS.md`, keeping only the coordinate and entity model plus
      layer ordering.
- [ ] 1.6 Resolve the fail-fast contradiction: root `CLAUDE.md:52-55` forbids silent fallbacks
      while `mods/FieldDefaultValueHookFix/CLAUDE.md:24` prescribes one. Decide which is correct,
      then state the rule and its one sanctioned exception in `mods/AGENTS.md`.

## 2. Extract path-scoped rules

- [ ] 2.1 Create `.agent/rules/`. Every rule carries `description` and, when path-specific,
      `globs`.
- [ ] 2.2 Move the website mechanics prose rules (`website/CLAUDE.md:123-133`, `:181-191`) into a
      rule scoped to the mechanics routes, or into a linter if one can enforce them.
- [ ] 2.3 Move the map registry-migration and deck.gl performance guidance
      (`website/src/lib/map/CLAUDE.md:124-239`) into a rule scoped to `website/src/lib/map/**`, or
      into the `add-map-entity-layer` skill where it is procedural.
- [ ] 2.4 Move the per-mod path-specific gotchas that survive the keep test into rules scoped to
      each mod directory. Anything that merely describes what the mod does is dropped, not moved.

## 3. Relocate and consolidate the skills

- [ ] 3.1 Move all 15 skills from `.claude/skills/` to `.agent/skills/` and delete `.claude/`
      **in the same commit**. `.claude/skills` is priority 80 and `.agent/skills` is 70, and dedup
      is first-wins by name, so leaving both in place makes the move a silent no-op.
- [ ] 3.2 Delete `.claude/settings.local.json`. It grants Claude Code Bash permissions that OMP
      does not read.
- [ ] 3.3 Merge `edit-claude-md` and `writing-skills` into a new `authoring-agent-docs` skill
      stating the 200-line budget, the OMP discovery rules, and the routing test from the spec.
      Delete both source directories.
- [ ] 3.4 Fold `mods/DataExporter/CLAUDE.md:14-51` into `export-game-data`, reconciling with
      `docs/data-export-guide.md`, which covers the same ground.
- [ ] 3.5 Fold the command catalogue and artifact contract from `mods/HotReplCommands/CLAUDE.md`
      into `hotrepl-runtime-inspection`.
- [ ] 3.6 Rewrite the seven vague descriptions so each states what the skill does and when to use
      it: `add-map-entity-layer`, `create-entity-detail-page`, `create-entity-overview-page`,
      `create-new-denormalizer`, `create-new-exporter`, `create-new-loader`, `svelte-5-patterns`.
- [ ] 3.7 Repair stale skill references: `create-new-mod:13,113-114` cites `BossTracker` sources
      that do not exist; `bootstrap-worktree:37-38` cites `exported-data/README.md`,
      `classes.json`, and `static_data.json`, none of which exist.
- [ ] 3.8 Remove skill content duplicating an instruction file:
      `create-new-denormalizer:12-16,95-98` against `build-pipeline/CLAUDE.md:71-79`, and
      `create-new-loader:12-16,112-116` against `build-pipeline/CLAUDE.md:89-95`.

## 4. Delete the old surface

- [ ] 4.1 Delete all 17 `CLAUDE.md` files.
- [ ] 4.2 Delete `docs/claude-md-guide.md`.
- [ ] 4.3 Confirm no `CLAUDE.md` and no `.claude/` remain outside `node_modules`.

## 5. Repair references

- [ ] 5.1 Rewrite live prose references to `CLAUDE.md`: `README.md`, `docs/project-map.md:48-50`,
      `knip.config.ts:33`, `docs/plans/2026-07-31-ancient-kingdoms-overview.md:107`,
      `docs/plans/2026-07-31-profession-content-coverage.md:351`, and
      `docs/plans/2026-08-09-map-marker-and-search-registry.md:41,1550,1571`.
- [ ] 5.2 Update the skill-internal references at `create-new-mod:15,112` and
      `export-game-data:90`, including the `.claude/skills` to `.agent/skills` path change.
- [ ] 5.3 Leave every file under `docs/plans/archive/**` untouched. Verify none were modified.

## 6. Enforce

- [ ] 6.1 Write `scripts/check-agent-docs.sh`. Check: no `CLAUDE.md` and no `.claude/`; every
      `AGENTS.md` under 200 lines; every skill has `name` and `description`; every rule has
      `description`; every description contains a usage trigger; every backticked repository path
      in an instruction file, rule, or skill resolves; every named skill or rule exists. Exclude
      `docs/plans/archive/**`. Report all violations in one run and exit non-zero.
- [ ] 6.2 Wire the script into `lefthook.yml` beside the existing plans job at `:69-75`.
- [ ] 6.3 Run the script and fix everything it reports.
- [ ] 6.4 Verify the script actually fails: temporarily add a `CLAUDE.md`, an over-long
      `AGENTS.md`, and a dead path reference; confirm each is caught; then remove them. A check
      that has never failed is not known to work.

## 7. Verify

- [ ] 7.1 Open a session at the repository root and confirm the root `AGENTS.md` is in the loaded
      context. Doc-reading is not evidence; observe the context.
- [ ] 7.2 Open a session in `website/` and confirm both files load, with the subproject file more
      prominent.
- [ ] 7.3 Open a session in `website/src/lib/map/` and confirm all three levels load.
- [ ] 7.4 Confirm all 14 skills are discovered from `.agent/skills/` after the move, and that the
      count is 14 rather than 15 or 29.
- [ ] 7.5 Confirm the new rules appear in the session's rule listing and resolve via `rule://`.
- [ ] 7.6 Record the total line count across all `AGENTS.md` files against the 1,460 baseline.
