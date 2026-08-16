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

## 3. Replace scaffolding skills with tests

Do this before deleting the skills, so the invariant each one described is asserted before its
prose disappears. Model each test on `website/src/lib/map/marker-registry.test.ts`.

- [ ] 3.1 Add a build-pipeline test asserting every loader exported from
      `build-pipeline/src/compendium/loaders/__init__.py` is called in
      `build-pipeline/src/compendium/commands/build.py`. Both sides currently count 64. This
      replaces the registration steps in `create-new-loader`.
- [ ] 3.2 Add a build-pipeline test asserting every denormalizer package under
      `build-pipeline/src/compendium/denormalizers/` is invoked by `run_all`. Eleven packages
      exist. This replaces `create-new-denormalizer`.
- [ ] 3.3 Add a website test asserting every entity in
      `website/src/lib/entities/entity-manifest.json` that declares a `detailPrefix` has a
      corresponding route directory, and every entity with an overview declares a route. Twenty
      three entries exist. This replaces `create-entity-detail-page` and
      `create-entity-overview-page`.
- [ ] 3.4 Confirm `marker-registry.test.ts` already asserts that every map layer is registered.
      Extend it if it does not. This replaces `add-map-entity-layer`.
- [ ] 3.5 Confirm the DataExporter build or an existing analyzer fails when an exporter is not
      registered. Add the assertion if it does not exist. This replaces the registration half of
      `create-new-exporter`.
- [ ] 3.6 Determine which `svelte-5-patterns` rules `eslint-plugin-svelte` can enforce, and enable
      them. Anything it cannot enforce and that still passes the keep test becomes a rule scoped to
      `**/*.svelte`; the rest is dropped.
- [ ] 3.7 Verify each new test fails when the registration is removed. A test that has never failed
      is not known to work.

## 4. Reduce the skill set from 15 to 5

- [ ] 4.1 Delete the eight scaffolding skills now covered by tests, examples, or lint:
      `create-new-loader`, `create-new-denormalizer`, `create-new-exporter`,
      `create-entity-detail-page`, `create-entity-overview-page`, `add-map-entity-layer`,
      `create-new-mod`, `svelte-5-patterns`.
- [ ] 4.2 Delete `edit-claude-md` and `writing-skills`; their surviving content is the routing rule
      written into the root `AGENTS.md` in task 1.1.
- [ ] 4.3 Move the five survivors to `.agent/skills/` and delete `.claude/` **in the same commit**.
      `.claude/skills` is priority 80 and `.agent/skills` is 70, and dedup is first-wins by name,
      so leaving both in place makes the move a silent no-op.
- [ ] 4.4 Delete `.claude/settings.local.json`. It grants Claude Code Bash permissions that OMP does
      not read.
- [ ] 4.5 Fold `mods/DataExporter/CLAUDE.md:14-51` into `export-game-data`, reconciling with
      `docs/data-export-guide.md`, which covers the same ground. Keep only the policy and decisions,
      not the exporter pattern.
- [ ] 4.6 Fold the command catalogue and artifact contract from `mods/HotReplCommands/CLAUDE.md`
      into `hotrepl-runtime-inspection`.
- [ ] 4.7 Repair `bootstrap-worktree:37-38`, which cites `exported-data/README.md`, `classes.json`,
      and `static_data.json`, none of which exist.
- [ ] 4.8 Confirm each of the five survivors states both what it covers and when to use it. Trim
      `update-game-version`, currently 220 lines, to the steps that are genuinely not derivable.

## 5. Delete the old surface

- [ ] 5.1 Delete all 17 `CLAUDE.md` files.
- [ ] 5.2 Delete `docs/claude-md-guide.md`.
- [ ] 5.3 Confirm no `CLAUDE.md` and no `.claude/` remain outside `node_modules`.

## 6. Repair references

- [ ] 6.1 Rewrite live prose references to `CLAUDE.md`: `README.md`, `docs/project-map.md:48-50`,
      `knip.config.ts:33`, `docs/plans/2026-07-31-ancient-kingdoms-overview.md:107`,
      `docs/plans/2026-07-31-profession-content-coverage.md:351`, and
      `docs/plans/2026-08-09-map-marker-and-search-registry.md:41,1550,1571`.
- [ ] 6.2 Update the skill-internal references at `create-new-mod:15,112` and
      `export-game-data:90`, including the `.claude/skills` to `.agent/skills` path change.
- [ ] 6.3 Leave every file under `docs/plans/archive/**` untouched. Verify none were modified.

## 7. Enforce

- [ ] 7.1 Write `scripts/check-agent-docs.sh`. Check: no `CLAUDE.md` and no `.claude/`; every
      `AGENTS.md` under 200 lines; every skill has `name` and `description`; every rule has
      `description`; every description contains a usage trigger; every backticked repository path
      in an instruction file, rule, or skill resolves; every named skill or rule exists. Exclude
      `docs/plans/archive/**`. Report all violations in one run and exit non-zero.
- [ ] 7.2 Wire the script into `lefthook.yml` beside the existing plans job at `:69-75`.
- [ ] 7.3 Run the script and fix everything it reports.
- [ ] 7.4 Verify the script actually fails: temporarily add a `CLAUDE.md`, an over-long
      `AGENTS.md`, and a dead path reference; confirm each is caught; then remove them. A check
      that has never failed is not known to work.

## 8. Verify

- [ ] 8.1 Open a session at the repository root and confirm the root `AGENTS.md` is in the loaded
      context. Doc-reading is not evidence; observe the context.
- [ ] 8.2 Open a session in `website/` and confirm both files load, with the subproject file more
      prominent.
- [ ] 8.3 Open a session in `website/src/lib/map/` and confirm all three levels load.
- [ ] 8.4 Confirm exactly 5 skills are discovered, all from `.agent/skills/`. A count of 15 means
      `.claude/skills` still shadows them; a count of 20 means both trees are live.
- [ ] 8.5 Confirm the registration tests from section 3 run in CI and that the deleted scaffolding
      skills left no uncovered invariant behind.
- [ ] 8.6 Confirm the new rules appear in the session's rule listing and resolve via `rule://`.
- [ ] 8.7 Record the total line count across all `AGENTS.md` files against the 1,460 baseline.
