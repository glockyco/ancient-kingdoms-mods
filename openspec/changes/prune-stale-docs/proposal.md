# Prune stale documents

## Why

A document exists to be read and acted on. Five under `docs/` fail that test, and one of them
actively misleads.

**`docs/project-map.md`** is the navigation map, reached from `CLAUDE.md:22` under "Exploring
codebase structure". It tells a reader the database lives in `website/static`
(`docs/project-map.md:41`), which stopped being true when `build.py:63-76` moved it to
`website/data`. It lists a `build/` directory that does not exist (`:42`). It omits `build-tool/`,
`tests/`, `scripts/`, `openspec/`, `.github/`, all three `server-scripts*/` snapshots,
`website/data/`, and `website/scripts/`. A wrong map is worse than no map, and a hand-maintained
inventory of a moving tree will be wrong again next month.

**`docs/plans/2026-06-20-agent-modding-toolbox-findings.md`** is a research note whose survey of
"AK today" is now false. It says AK discovers types through ad-hoc `.omp/*.csx` probes
(`:62`); no `.csx` file exists anywhere and `.gitignore:67` ignores `.omp/` entirely. It says
scaffolding is "covered by AK skills (1 `create-new-mod`)" (`:39`, `:61`); that skill was deleted
because the build discovers mods by glob. Its primary source, cited throughout Section 6, is the
repository `~/Projects/HotRepl`, which is not present on this machine. Its Section 7 opens four
scoping questions "decided with the user"; two months later none is answered, no design followed,
and nothing references it except two index listings.

**`docs/plans/2026-07-31-global-entity-search.md`** declares its own obsolescence:
`superseded_by: 2026-08-09-map-marker-and-search-registry` in its frontmatter. The successor
exists, and the architecture it describes shipped as `website/src/lib/map/marker-registry.ts` with
`marker-registry.test.ts` covering it.

**`docs/claude-md-guide.md`** is a near-verbatim copy of `.claude/skills/edit-claude-md/SKILL.md`,
matching section for section, and both state a line limit that contradicts published guidance.

**`docs/github-guide.md`** is fifteen lines of generic orientation with no referrer anywhere in
the repository.

Being a note, a draft, an audit, or a research finding is not a reason to keep a document whose
claims are false. That exemption is what let the project map drift for a month and the toolbox
survey outlive its own subject.

## What Changes

- **Delete five documents**, 473 lines: `docs/project-map.md`, `docs/github-guide.md`,
  `docs/claude-md-guide.md`, `docs/plans/2026-06-20-agent-modding-toolbox-findings.md`, and
  `docs/plans/2026-07-31-global-entity-search.md`.
- **Repair every referrer.** Two rows leave the `CLAUDE.md` task-trigger table, two entries leave
  `docs/plans/INDEX.md`, and the pointer list in
  `docs/plans/2026-07-31-ancient-kingdoms-overview.md:97-108` loses three lines. The migration
  change's tasks that name the deleted files are updated.
- **Record the standard** as a `documentation-lifecycle` capability, so the next stale document is
  a check failure rather than a judgement call.

Explicitly kept, both verified current:

- `docs/data-export-guide.md` — its policy overlaps the `export-game-data` skill, but its runtime
  visual-export rules and BetterBestiary parity procedure (`:15-46`) exist nowhere else. Folding it
  into that skill is already task 4.5 of the migration change.
- `docs/visual-audit-runtime-findings.md` — its claims still match the implementation in
  `MonsterExporter.cs:243-269`, `NpcExporter.cs:285-301`, and `build.py:88`.

Also kept, and deliberately not swept: the eight remaining active and draft plans. Several are
unstarted, but unstarted is not stale. `2026-05-27-website-design-system-audit-consolidation.md`
has every checkbox open, and `2026-07-31-detail-page-title-suffixes.md`,
`2026-07-31-entity-structured-data.md`, and `2026-07-31-per-entity-og-images.md` describe work
that genuinely has not happened, verified against `site.ts:13,31-32`, `jsonld.ts`, and
`meta-description.ts:169-170`. They describe a future that is still wanted, not a past that has
moved on.

## Capabilities

### New Capabilities

- `documentation-lifecycle`: When a document under `docs/` earns its place and when it is removed.
  Covers the accuracy obligation, the rule that document type grants no exemption, and what
  happens to a document whose successor exists.

### Modified Capabilities

None.

## Impact

- **Deleted:** 31 files, 18,084 lines.
- **Edited:** `CLAUDE.md`, `docs/plans/INDEX.md`,
  `docs/plans/2026-07-31-ancient-kingdoms-overview.md`, and the migration change's `tasks.md`.
- **Risk:** low. Nothing in CI, the build, or the deploy reads these files. `omp-plans` is not
  installed on this machine, so the `lefthook.yml:68-75` plans job skips and `INDEX.md` is edited
  by hand.
- **The plan archive is removed too:** 26 documents and 17,611 lines. Audited individually against
  the completed-plan requirement; 25 held nothing the code does not already carry. Six passages of
  genuine rationale were relocated into the files that own those decisions before deletion.
