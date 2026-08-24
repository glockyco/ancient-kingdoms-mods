## 1. Write the instruction files

- [x] 1.1 Write root `AGENTS.md`: data-flow summary, the universal rules that survived the audit
      (logging, comments, fail-fast, modern standards), and pointers to `docs/plans/INDEX.md` and
      the product roadmap. Do NOT restate `README.md:20-27`, `:34-41`, `:139-151`, `:174-187`,
      or `:252+`. Do NOT include a Task Triggers table. Under 200 lines.
- [x] 1.2 Write `mods/AGENTS.md` from `mods/CLAUDE.md` always-on content, hoisting the shared
      per-mod facts exactly once: the server-time expression
      `NetworkManagerMMO.offsetNetworkTime + NetworkTime.time` (duplicated at
      `MonsterRespawner:32`, `ResourceRespawner:38`, `ResourceRespawner:69`, `BossTracker:22`), the
      `TextMesh` plus `BoxCollider` marker pattern (`MonsterRespawner:20-22`,
      `ResourceRespawner:25-27`), and the shared scene/cache note (`BossTracker:16-17`,
      `MapEnhancer:21-22`). Under 200 lines.
- [x] 1.3 Write `build-pipeline/AGENTS.md`. Resolve the output-path contradiction: `:21` says
      `website/static/`, `:15` and `website/CLAUDE.md:90-91` say `website/data/`. Verify against
      `build-pipeline/src/compendium/commands/build.py` and state the verified path once.
- [x] 1.4 Write `website/AGENTS.md` from the 220-line original. Drop the route inventory at `:54`
      rather than repairing it; it already omits four real routes and will rot again. Fix the
      `citations.lock.json` reference at `:158-160` to name the repository-root path.
- [x] 1.5 Write `website/src/lib/map/AGENTS.md`, keeping only the coordinate and entity model plus
      layer ordering.
- [x] 1.6 Resolve the fail-fast contradiction: root `CLAUDE.md:52-55` forbids silent fallbacks
      while `mods/FieldDefaultValueHookFix/CLAUDE.md:24` prescribes one. Decide which is correct,
      then state the rule and its one sanctioned exception in `mods/AGENTS.md`.

## 2. Extract path-scoped rules

- [x] 2.1 Create `.agent/rules/`. Every rule carries `description` and, when path-specific,
      `globs`.
- [x] 2.2 Move the website mechanics prose rules (`website/CLAUDE.md:123-133`, `:181-191`) into a
      rule scoped to the mechanics routes, or into a linter if one can enforce them.
- [x] 2.3 Move the map registry-migration and deck.gl performance guidance
      (`website/src/lib/map/CLAUDE.md:124-239`) into a rule scoped to `website/src/lib/map/**`, or
      into the `add-map-entity-layer` skill where it is procedural.
- [x] 2.4 Move the per-mod path-specific gotchas that survive the keep test into rules scoped to
      each mod directory. Anything that merely describes what the mod does is dropped, not moved.

## 3. Replace scaffolding skills with tests

Do this before deleting the skills, so the invariant each one described is asserted before its
prose disappears. Model each test on `website/src/lib/map/marker-registry.test.ts`.

- [x] 3.1 Add a build-pipeline test asserting every loader exported from
      `build-pipeline/src/compendium/loaders/__init__.py` is called in
      `build-pipeline/src/compendium/commands/build.py`. Both sides currently count 64. This
      replaces the registration steps in `create-new-loader`.
- [x] 3.2 Add a build-pipeline test asserting every denormalizer package under
      `build-pipeline/src/compendium/denormalizers/` is invoked by `run_all`. Eleven packages
      exist. This replaces `create-new-denormalizer`.
- [x] 3.3 Add a website test asserting every entity in
      `website/src/lib/entities/entity-manifest.json` that declares a `detailPrefix` has a
      corresponding route directory, and every entity with an overview declares a route. Twenty
      three entries exist. This replaces `create-entity-detail-page` and
      `create-entity-overview-page`.
- [x] 3.4 Confirm `marker-registry.test.ts` already asserts that every map layer is registered.
      Extend it if it does not. This replaces `add-map-entity-layer`.
- [x] 3.5 Confirm the DataExporter build or an existing analyzer fails when an exporter is not
      registered. Add the assertion if it does not exist. This replaces the registration half of
      `create-new-exporter`.
- [x] 3.6 Determine which `svelte-5-patterns` rules `eslint-plugin-svelte` can enforce, and enable
      them. Anything it cannot enforce and that still passes the keep test becomes a rule scoped to
      `**/*.svelte`; the rest is dropped.
- [x] 3.7 Verify each new test fails when the registration is removed. A test that has never failed
      is not known to work.

## 4. Reduce the skill set from 15 to 4

- [x] 4.1 Delete the seven scaffolding skills now covered by tests or examples:
      `create-new-loader`, `create-new-denormalizer`, `create-new-exporter`,
      `create-entity-detail-page`, `create-entity-overview-page`, `create-new-mod`,
      `svelte-5-patterns`.
- [x] 4.1a Delete `add-map-entity-layer` once task 2.3 has landed its rule. Held back because its
      registration is covered by `marker-registry.test.ts` but its procedural content has nowhere
      to go until that rule exists, and it is the only skill that currently loads for map work.
- [x] 4.2 Delete `edit-claude-md` and `writing-skills`; their surviving content is the routing rule
      written into the root `AGENTS.md` in task 1.1.
- [x] 4.3 Delete `bootstrap-worktree`, `scripts/bootstrap-worktree.sh`, and live instructions that
      recommend repository worktrees. Keep the temporary worktree in `check-clean-checkout.sh` as
      an internal test-isolation mechanism. Move the four survivors to `.agent/skills/` and delete
      `.claude/` **in the same commit**. `.claude/skills` is priority 80 and `.agent/skills` is 70,
      and dedup is first-wins by name, so leaving both in place makes the move a silent no-op.
- [x] 4.4 Delete `.claude/settings.local.json`. It grants Claude Code Bash permissions that OMP does
      not read.
- [x] 4.5 Fold `mods/DataExporter/CLAUDE.md:14-51` into `export-game-data`, reconciling with
      `docs/data-export-guide.md`, which covers the same ground. Keep only the policy and decisions,
      not the exporter pattern.
- [x] 4.6 Fold the command catalogue and artifact contract from `mods/HotReplCommands/CLAUDE.md`
      into `hotrepl-runtime-inspection`.
- [x] 4.7 Confirm no live guidance, flake application, or command references
      `bootstrap-worktree` or `scripts/bootstrap-worktree.sh`.
- [x] 4.8 Confirm each of the four survivors states both what it covers and when to use it. Trim
      `update-game-version`, currently 220 lines, to the steps that are genuinely not derivable.

## 5. Delete the old surface

- [x] 5.1 Delete all 17 `CLAUDE.md` files.
- [x] 5.2 Delete `docs/claude-md-guide.md`. Done ahead of this change by prune-stale-docs.
- [x] 5.3 Confirm no `CLAUDE.md` and no `.claude/` remain outside `node_modules`.

## 6. Repair references

- [x] 6.1 Rewrite live prose references to `CLAUDE.md`: `README.md`,
      `knip.config.ts:33`, `docs/plans/2026-07-31-ancient-kingdoms-overview.md:107`,
      `docs/plans/2026-07-31-profession-content-coverage.md:351`, and
      `docs/plans/2026-08-09-map-marker-and-search-registry.md:41,1550,1571`.
- [x] 6.2 Update the skill-internal references at `create-new-mod:15,112` and
      `export-game-data:90`, including the `.claude/skills` to `.agent/skills` path change.
- [x] 6.3 Leave every file under `docs/plans/archive/**` untouched. Verify none were modified.

## 7. Enforce

- [x] 7.1 Write `scripts/check-agent-docs.sh`. Check: no `CLAUDE.md` and no `.claude/`; every
      `AGENTS.md` under 200 lines; every skill has `name` and `description`; every rule has
      description`; every description contains a usage trigger; every backticked source path
      resolves; declared generated output paths name their executable owner; every named skill or
      rule exists. Exclude
      `docs/plans/archive/**`. Report all violations in one run and exit non-zero.
- [x] 7.2 Extend the script to validate `server-scripts/<File>.cs:<lines>` citations appearing in
      instruction files, rules, and skills. `citations.lock.json` tracks only citations made from
      source files, so a Markdown citation is currently unverified: `website/CLAUDE.md` cited
      `Combat.cs:480-487` as proof of a damage-type mapping, that region is an invulnerability
      gate, and no check ever looked. At minimum assert the file and line range exist.
- [x] 7.3 Wire the script into `lefthook.yml` beside the existing plans job at `:69-75`.
- [x] 7.4 Run the script and fix everything it reports.
- [x] 7.5 Verify the script actually fails: temporarily add a `CLAUDE.md`, an over-long
      `AGENTS.md`, and a dead path reference; confirm each is caught; then remove them. A check
      that has never failed is not known to work.

## 8. Verify

- [x] 8.1 Open a session at the repository root and confirm the root `AGENTS.md` is in the loaded
      context. Doc-reading is not evidence; observe the context.
- [x] 8.2 Open a session in `website/` and confirm both files load, with the subproject file more
      prominent.
- [x] 8.3 Open a session in `website/src/lib/map/` and confirm all three levels load.
- [x] 8.4 Confirm exactly 4 repository skills are discovered, all from `.agent/skills/`. A larger
      count means the retired `.claude/skills` tree still shadows or duplicates them.
- [x] 8.5 Confirm the registration tests from section 3 run in CI and that the deleted scaffolding
      skills left no uncovered invariant behind.
- [x] 8.6 Confirm the new rules appear in the session's rule listing and resolve via `rule://`.
- [x] 8.7 Record the total line count across all `AGENTS.md` files against the 1,460 baseline: the
      five files contain 151 lines.
