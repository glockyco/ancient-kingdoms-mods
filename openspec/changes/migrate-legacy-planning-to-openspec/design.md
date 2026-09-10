## Context

See `proposal.md` for motivation. `docs/plans/` currently contains thirteen dated records and one index.
The records mix overview, audit, specification, design, and task content. Some describe shipped work,
some contain unfinished work, and several contain claims that current source contradicts.

`documentation-lifecycle` already defines when stale, completed, and superseded documents are deleted
and which rationale can survive deletion. The missing rule is authority: it does not state that main
OpenSpec specifications own current behavior or that active OpenSpec changes own pending behavior work.

Two higher-priority OpenSpec changes are active. This migration has no runtime dependency on them.
The audit can proceed without moving their artifacts. The final authority cutover still waits until
both changes are archived, because it removes paths and guidance that active work can reference.

## Goals / Non-Goals

**Goals:**

- Give every legacy planning record a verified, lossless disposition.
- End with one authority for current requirements and one registry for active changes.
- Preserve only rationale that cannot be recovered from code, tests, specifications, or citations.
- Make every retained unfinished subject independently reviewable and implementable.
- Remove the legacy directory, index, pointers, and hooks only after replacements validate.

**Non-Goals:**

- Implement any feature discovered in a legacy plan.
- Remove the legacy index, directory, or authority pointers while the combat harness or gear planner change remains active.
- Copy old plans into OpenSpec unchanged.
- Keep a historical mirror of deleted legacy plans.
- Replace product, architecture, setup, or operational documentation whose purpose remains valid.

## Decisions

### Audit now; defer the final authority cutover

Evidence collection, reconciliation, replacement planning, and safe removal of independently stale
records can proceed while `add-combat-verification-harness` and `add-gear-and-rotation-planner` remain
active. These actions do not move or rename either active change.

The final index removal, repository-guidance cutover, and legacy-directory removal wait until both
changes are complete and archived. This is a context-stability boundary, not a technical dependency.

### One disposition ledger drives the migration

Implementation begins with a ledger containing one row per legacy file and these fields:

| Field | Purpose |
|---|---|
| Path | Proves every input was enumerated |
| Central premise | Distinguishes correction from deletion |
| Implementation evidence | Records what code and tests currently do |
| Current requirements | Names requirements missing from main specs |
| Unfinished wanted work | Names the scoped replacement change, if any |
| Durable rationale | Names its destination or states that none exists |
| Referrers | Names every live path that must change |
| Disposition | Keep during migration, delete, or blocked with a reason |

The ledger is part of this change while it is active. It is not a new permanent planning database. Its
final state is retained with the archived OpenSpec change as evidence that every input was handled.

### Audited disposition ledger

Audit baseline: Ancient Kingdoms 0.9.31.1 and the repository state at commit `c46548b1`.
Implementation evidence takes precedence over frontmatter and unchecked legacy tasks.

| Path | Central premise | Implementation evidence | Current requirements | Unfinished wanted work | Durable rationale | Referrers | Disposition |
|---|---|---|---|---|---|---|---|
| `INDEX.md` | Legacy navigation hub | OpenSpec now owns active changes | None | Final authority cutover | None | `AGENTS.md`, overview, hook | Keep until final cutover |
| `2026-07-31-ancient-kingdoms-overview.md` | Website backlog and product ordering | Several listed prerequisites shipped or changed | None | Remaining website subjects below | Priority rationale only | `AGENTS.md`, all child records | Correct now; delete at final cutover |
| `2026-06-13-compendiums-site-design.md` | Separate apex directory site | Owning repositories are unavailable here | Unknown until external verification | Apex site, redirects, sibling domains | Separate-worker boundary | Overview, index | Blocked on owning-repository audit |
| `2026-05-27-website-design-system-audit-consolidation.md` | Consolidate repeated website UI rules | `website/DESIGN.md`, shared tables, links, sections, and profession header exist | Current behavior belongs in website specifications | Measured drift, enforcement, remaining adoption | Evidence-first component threshold | Overview, index | Propose `consolidate-website-design-system`, then delete |
| `2026-05-28-compendium-data-contract-design.md` | Reduce entity-addition touchpoints | Entity and marker registries shipped; exporter and loader orchestration remain imperative | Shipped registries need capability ownership | Export catalog, pipeline catalog, run manifest, read-model migration | Runtime-boundary and anti-generalization decisions | Overview, index | Propose `simplify-entity-addition-workflow`, then delete |
| `2026-07-31-detail-page-title-suffixes.md` | Add contextual detail titles | Only `itemTitle` exists | None | Eight title generators and edge coverage | Title-length and suffix rules | Overview, index | Propose `add-detail-page-title-suffixes`, then delete |
| `2026-07-31-entity-image-surfacing.md` | Render exported item, NPC, and skill art | Four of five named surfaces render art; item detail loads but does not render its primary icon | Existing artwork contracts are code- and test-owned | Prominent item-detail icon | Table-driven dimensions and shared URL rule | Overview, artwork plan, OG plan, index | Propose `finish-entity-image-surfacing`, then delete |
| `2026-07-31-entity-structured-data.md` | Add detail-page JSON-LD | Site, organization, author, collection, and breadcrumb nodes exist; entity nodes do not | Existing JSON-LD behavior needs main-spec ownership | Entity nodes and later `SearchAction` | Conservative schema mapping | Overview, index | Propose `add-entity-structured-data`, then delete |
| `2026-07-31-per-entity-og-images.md` | Add item and monster share images | Every route still uses `/og-default.png` | Existing default-image behavior needs main-spec ownership | Version-one item and monster images | Hashed cache invalidation and fallback | Overview, index | Propose `add-per-entity-og-images`, then delete |
| `2026-08-10-entity-artwork-pipeline.md` | One artwork pipeline and path rule | WebP, reconciliation, shared paths, derived art, and most export families shipped | Shipped artwork invariants need main-spec ownership | Profession output, remaining consumers, global search surface | Encoding measurements and deliberate omissions | Overview, image plan, map plan, index | Propose `complete-entity-artwork-pipeline`, then delete |
| `2026-07-31-profession-content-coverage.md` | Snapshot profession coverage | Snapshot targets 0.9.26.0; current evidence is 0.9.31.1 | None | None independent of profession system | Citation and source-data warnings | Profession system, migration, index | Relocate warnings and delete |
| `2026-07-31-profession-page-migration.md` | Complete profession page migration | Correctness wave and three validation professions shipped; fishing and later stages remain | Shipped profession behavior needs main-spec ownership | Fishing, remaining professions, data repair, cross-page checks | Validation-set rationale | Profession system, overview, index | Propose `complete-profession-page-system`, then delete with system record |
| `2026-07-31-profession-page-system.md` | One profession content and visual system | Shared mechanics, header, sections, curve, and three validators shipped | Shipped system needs main-spec ownership | Remaining migration scope | Content-shape and density decisions | Profession migration, overview, index | Propose `complete-profession-page-system`, then delete with migration record |
| `2026-08-09-map-marker-and-search-registry.md` | Registry, global search, and wayfinding | Registry-driven map layers and unified map search shipped; global palette and wayfinding did not | Shipped registry and search contracts need main-spec ownership | Selection, popups, global search, wayfinding, portal UX, cleanup | Search and travel measurements | Overview, artwork plan, index | Propose `complete-map-search-and-wayfinding`, then delete |

### Audit behavior before trusting a checkbox or status label

A legacy frontmatter status, checkbox, title, or prose claim records intent. The audit checks code,
tests, generated output, runtime observations where needed, and current main specs before assigning a
disposition. A plan marked draft can describe shipped work. A plan marked active can describe a problem
that no longer exists.

Each record gets one of four outcomes:

1. **Delete:** no unique valid content remains.
2. **Codify then delete:** shipped behavior is missing from main specs or durable rationale lacks an
   owner.
3. **Propose then delete:** unfinished work remains wanted and receives a scoped OpenSpec change.
4. **Blocked:** evidence or a product decision is missing. Finish all other records, but do not remove
   the legacy hub until the blocker is resolved.

### Replacement work is split by deliverable subject

The migration change owns the inventory, authority cutover, and deletion. It does not become a backlog
container. When a legacy record contains still-wanted work, each independent deliverable receives a
separate OpenSpec change. That replacement must have all workflow-required planning artifacts before
the old record is deleted.

Shipped behavior that lacks a main specification also moves through a scoped documentation-only
OpenSpec change. This keeps capability ownership explicit and lets strict validation catch malformed
deltas. The migration records the replacement change name in its ledger.

### Rationale moves to the decision owner

The existing four permitted rationale classes remain the filter. A source limitation moves beside the
exporter or into the capability design that depends on it. A measurement behind a constant moves beside
the constant or into its source-cited evidence. A rejected alternative or deliberate omission moves to
the design or specification that owns that choice.

Progress narration, task history, screenshots of old status, and duplicated behavior descriptions are
deleted. Git history is sufficient recovery for prose that has no current owner.

### Records migrate in small verified units

Each dated record is one audit unit. The unit verifies implementation evidence, creates any replacement
OpenSpec change, relocates permitted rationale, repairs direct referrers, deletes the source record, and
passes the affected checks before commit. Closely coupled records may share one commit only when neither
has an independent valid state.

The index remains until all dated records are gone because it is part of the legacy system being
removed, not a temporary OpenSpec registry. It is deleted in the final cutover with repository guidance
and any planning-tool integration that expects it.

### The final gate proves absence and authority

The cutover checks four facts:

1. Every original ledger row has a non-blocked final disposition.
2. `docs/plans/` and `docs/plans/INDEX.md` are absent.
3. No live instruction, document, command, hook, or task expects those paths.
4. Every replacement specification and change validates strictly.

A text search alone is not proof of replacement completeness. It proves reference cleanup only after
the ledger proves content disposition.

## Risks / Trade-offs

- A legacy record can contain a requirement not implemented anywhere. Deleting it would lose wanted
  work. → Require a product decision or complete replacement change before deletion.
- Copying prose can preserve contradictions under a new path. → Derive requirements from current
  behavior and evidence, not from wording alone.
- One large replacement change can hide unrelated backlog work. → Split by independently deliverable
  subject and keep the migration change administrative.
- A broad edit can make review impossible. → Commit one verified record or tightly coupled subject at a
  time, then perform the final authority cutover separately.
- The migration can expand without bound when audits discover implementation defects. → Record a game
  or repository defect through its owning workflow. Do not fix unrelated behavior inside this change.
- Removing hooks too early can hide incomplete migration work. → Remove legacy integration only in the
  final cutover after absence and reference checks pass.
