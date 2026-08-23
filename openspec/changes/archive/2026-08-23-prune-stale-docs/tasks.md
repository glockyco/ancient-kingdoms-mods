## 1. Delete

- [x] 1.1 Delete `docs/project-map.md`.
- [x] 1.2 Delete `docs/github-guide.md`.
- [x] 1.3 Delete `docs/claude-md-guide.md`. Its policy survives in
      `.claude/skills/edit-claude-md/SKILL.md` until the migration change replaces that skill, so
      nothing is lost in the interim.
- [x] 1.4 Delete `docs/plans/2026-06-20-agent-modding-toolbox-findings.md`.
- [x] 1.5 Delete `docs/plans/2026-07-31-global-entity-search.md`.

## 2. Repair referrers

- [x] 2.1 Remove the "Exploring codebase structure" row from the `CLAUDE.md` task-trigger table.
      It pointed at the project map and has no replacement: an agent navigates with `glob` and
      `read`, which cannot go stale.
- [x] 2.2 Remove the "Editing any CLAUDE.md" row from the same table, repointing it at the
      `edit-claude-md` skill rather than the deleted guide.
- [x] 2.3 Remove the two deleted plans from `docs/plans/INDEX.md` and confirm the remaining
      entries still match the files on disk.
- [x] 2.4 Remove the three lines naming deleted documents from the pointer list in
      `docs/plans/2026-07-31-ancient-kingdoms-overview.md:97-108`.
- [x] 2.5 Update the tasks in `openspec/changes/migrate-agent-docs-to-agents-md/` that name
      `docs/claude-md-guide.md` or `docs/project-map.md`, since both are now gone.
- [x] 2.6 Confirm no file outside `docs/plans/archive/` names any deleted path. Archived plans keep
      their original text.

## 3. Verify

- [x] 3.1 Grep the repository for each deleted filename and confirm the only matches are inside
      `docs/plans/archive/` and this change's own documents.
- [x] 3.2 Confirm `docs/` still contains exactly the two top-level guides that were kept, plus
      `plans/`.
- [x] 3.3 Run `pnpm check:citations` and the website and pipeline test suites, to confirm no
      tooling read the deleted files.

## 4. Prune the plan archive

- [x] 4.1 Audit all 26 documents in `docs/plans/archive/` against the completed-plan requirement.
      Verdicts: 25 delete, 1 holding rationale worth relocating.
- [x] 4.2 Relocate the rationale that survives the audit, before deleting anything:
      the measured popup timings into `website/src/lib/map/interaction.ts`; the `houses.faction_id`
      and `houses.base_price` constraints into `build-pipeline/schema.sql`; the deliberate JSON-LD
      omissions into `website/src/lib/seo/jsonld.ts`; the bare-URL hashing reason into
      `website/scripts/build-sitemap-manifest.mjs`; the per-entry symlink reason into
      `scripts/bootstrap-worktree.sh`; the native-CTA choice into `SupportButton.svelte`.
- [x] 4.3 Verify every relocated game-source claim against `server-scripts/` before writing it.
- [x] 4.4 Delete `docs/plans/archive/` and remove the archive count line from `docs/plans/INDEX.md`.
- [x] 4.5 Confirm no live document referenced any archived plan.
