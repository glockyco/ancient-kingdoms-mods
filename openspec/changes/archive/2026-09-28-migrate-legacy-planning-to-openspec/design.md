## Context

See `proposal.md` for motivation. At the 2026-09-28 audit baseline, `docs/plans/` held twelve
dated records and one index; task 5.10 had deleted a thirteenth record. The records mixed overview,
audit, specification, design, and task content. Some described shipped work, some unfinished work,
and several claims contradicted the source at that baseline.

`documentation-lifecycle` already defines when stale, completed, and superseded documents are deleted
and which rationale can survive deletion. The missing rule is authority: it does not state that main
OpenSpec specifications own current behavior or that active OpenSpec changes own pending behavior work.

No pending change constrains the migration's cutover. The two combat changes that once constrained it
were superseded by `rebuild-combat-model`, archived on 2026-09-18. Commit f10fc2b0 deleted their
directories. The replacement changes created by this migration remain active until implemented.

## Goals / Non-Goals

**Goals:**

- Give every legacy planning record a verified, lossless disposition.
- End with one authority for current requirements and one registry for active changes.
- Preserve only rationale that cannot be recovered from code, tests, specifications, or citations.
- Make every retained unfinished subject independently reviewable and implementable.
- Remove the legacy directory, index, pointers, and hooks only after replacements validate.

**Non-Goals:**

- Implement any feature discovered in a legacy plan.
- Copy old plans into OpenSpec unchanged.
- Keep a historical mirror of deleted legacy plans.
- Replace product, architecture, setup, or operational documentation whose purpose remains valid.

## Decisions

### Audit record by record; cut over after every disposition

Evidence collection, reconciliation, replacement planning, and safe removal of independently stale
records proceed one record at a time, while other changes are active.

The final index removal, repository-guidance cutover, and legacy-directory removal run after every
ledger row has a verified, non-blocked disposition. The combat-change wait was a context-stability
boundary, not a technical dependency. The active replacement changes own separate feature work and
do not block removal of the legacy planning hub.

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

Audit baseline: Ancient Kingdoms 0.9.34.0, commit `44145d9c`, and the working tree on 2026-09-28.
Implementation evidence takes precedence over frontmatter and unchecked legacy tasks.

| Path | Central premise | Implementation evidence | Current requirements | Unfinished wanted work | Durable rationale | Referrers | Disposition |
|---|---|---|---|---|---|---|---|
| `INDEX.md` | Legacy navigation hub | OpenSpec owns active changes | None | OpenSpec is the only planning authority | None | `AGENTS.md` and `README.md` already point to OpenSpec; the legacy hook is removed; every dated record is deleted | Deleted at final cutover |
| `2026-07-31-ancient-kingdoms-overview.md` | Website backlog and product ordering | Execution steps 1–4 describe the deleted planner and harness; global search shipped; compact map links cover 4 of 11 surfaces; map popups omit pack and random sources; recipe materials read `item_usages_recipe`; profession links remain incomplete | None | `add-map-links-to-list-pages`: seven missing list surfaces; `show-pack-and-random-sources-in-map-popups`: both source families; `link-entities-to-profession-pages`: gather/crafted links. Recipe-material lookup was fixed outside this change | Mini-map omission → `complete-map-registry-ownership/design.md`; priority order is not retained | `AGENTS.md` navigation already points to OpenSpec; child records and `INDEX.md` are deleted in this migration | Deleted; each retained subject has its named owner |
| `2026-06-13-compendiums-site-design.md` | Separate apex directory site | `https://compendiums.org/` publishes the directory; its links to Ancient Kingdoms, Ardenfall, Erenshor (`erenshor.compendiums.org`), and Afallon respond. The obsolete `erenshor-maps.compendiums.org` hostname does not resolve | None in this repository | None here; optional `www` redirection belongs to the apex repository | Separate-Worker boundary → apex repository configuration | Overview deleted; `INDEX.md` is removed at cutover | Deleted; this repository does not own the shipped apex site |
| `2026-05-27-website-design-system-audit-consolidation.md` | Consolidate repeated website UI rules | `website/DESIGN.md` remains the design authority; tiny text, low-contrast state colors, literal palettes, and hand-rolled primitives remain | None: new testable rules belong to the replacement's `website-design-system` delta | `consolidate-website-design-system`: readability, contrast, token and primitive adoption, enforcement | Evidence-first reuse threshold and rejected shells → replacement design | Overview deleted; `INDEX.md` removed at cutover | Deleted; website design authority and validated replacement retain the decisions |
| `2026-05-28-compendium-data-contract-design.md` | Reduce entity-addition touchpoints | Entity and marker registries shipped; exporter and loader orchestration remain imperative; the build reads the decompiled snapshot | `openspec/specs/entity-registries/spec.md` (archived `specify-entity-registries`) | `harden-export-sessions`: session and curated-input composition; `simplify-pipeline-loader-registration`: loader catalog; `consolidate-server-read-models`: altar read model and reachability; `decouple-build-from-decompiled-snapshot`: normal build input; `prune-unread-database-data`: unread data | Runtime boundaries and no master registry → `consolidate-server-read-models/design.md`; strict simple-loader rule → `simplify-pipeline-loader-registration/design.md`; FTS optimization rejected because search no longer uses FTS | Overview deleted; `INDEX.md` removed at cutover | Deleted; current contract and five independently validated changes own its retained subjects |
| `2026-07-31-detail-page-title-suffixes.md` | Add contextual detail titles | Commit 6583ff92 removed the item suffix; no detail family has a contextual title; 398 canonical pages share a title | `openspec/specs/page-metadata/spec.md` (archived `specify-page-metadata`) | `distinguish-detail-page-titles`: redesign suffixes; owner rejected incorrect mappings on 2026-09-28 | Rejected slot and weapon mappings, length budget → `distinguish-detail-page-titles/design.md` | Overview deleted; `INDEX.md` removed at cutover | Deleted; validated title redesign owns all remaining collisions |
| `2026-07-31-entity-image-surfacing.md` | Render exported item, NPC, and skill art | Four surfaces render art; `ItemTooltip.svelte` displays the item-detail icon; missing-asset lookups are fixed outside this change | `openspec/specs/compendium-build/spec.md` and `game-data-export/spec.md` (archived `specify-entity-artwork`) | None: owner rejected a prominent second icon on 2026-09-28; palette search art already shipped | Sprite authenticity, dimensions, and shared URL rule → archived `specify-entity-artwork/design.md` and main specs | Overview deleted; `INDEX.md` removed at cutover | Deleted; current artwork contract and explicit owner rejection dispose of remaining proposal |
| `2026-07-31-entity-structured-data.md` | Add detail-page JSON-LD | Site, organization, author, collection, and breadcrumb nodes exist; entity nodes do not | `openspec/specs/page-metadata/spec.md` (archived `specify-page-metadata`) | `add-entity-structured-data`: page/entity nodes for every indexed detail family, including professions | Conservative schema mapping and no `SearchAction` → `add-entity-structured-data/design.md` | Overview deleted; profession migration is deleted with its system record; `INDEX.md` removed at cutover | Deleted; validated structured-data change owns unfinished graph |
| `2026-07-31-per-entity-og-images.md` | Add item and monster share images | Every route uses `/og-default.png` | `openspec/specs/page-metadata/spec.md` (archived `specify-page-metadata`) | `add-per-entity-og-images`: item and monster cards, honest fallbacks, cache identity, deterministic generation | Paid-plan asset count (100,000; 16,250 used), final-byte hashing, and fallback choice → `add-per-entity-og-images/design.md` | Overview deleted; `INDEX.md` removed at cutover | Deleted; validated card change owns unfinished work |
| `2026-08-10-entity-artwork-pipeline.md` | One artwork pipeline and path rule | WebP, reconciliation, shared paths, derived art, and search artwork shipped | `openspec/specs/game-data-export/spec.md`, `compendium-build/spec.md`, and `global-search/spec.md` (archived `specify-entity-artwork`) | `complete-entity-artwork-pipeline`: profession sprite probe, named helm probe, zone thumbnail and treasure-map image consumers | Encoding measurements and deliberate omissions → archived `specify-entity-artwork/design.md`; current availability → main specs | `INDEX.md` removed at cutover | Deleted; validated artwork change owns remaining conditional consumers |
| `2026-07-31-profession-content-coverage.md` | Snapshot profession coverage | Deleted under task 5.10 | None | None | Relocated before deletion | None | Deleted |
| `2026-07-31-profession-page-migration.md` | Complete profession page migration | Three routes migrated; Slayer static HTML holds 20 of 143 targets; Fishing unmigrated; gather-page coefficient drift fixed outside this change | `openspec/specs/profession-pages/spec.md` (archived `specify-profession-pages`) | `complete-profession-page-system`: Slayer static inventory, Fishing and nine routes, typed SQL in `lib/queries/professions.ts` (task 1.6); `consolidate-server-read-models` owns altar SQL only | Validation-set rationale → `complete-profession-page-system/design.md` | Profession system deleted in the same subject; overview deleted; `INDEX.md` removed at cutover | Deleted with the system record; validated profession change owns remaining routes |
| `2026-07-31-profession-page-system.md` | One profession content and visual system | Shared header, curve, sections, and cited mechanics shipped on three routes | `openspec/specs/profession-pages/spec.md` (archived `specify-profession-pages`) | `complete-profession-page-system`: presentation, data, SEO and guide links; `link-entities-to-profession-pages`: entity links; `add-map-links-to-list-pages`: compact Hunter/Herbalism actions; `add-entity-structured-data`: profession graph | Content shape and density → `complete-profession-page-system/design.md` | Profession migration deleted in the same subject; overview deleted; `INDEX.md` removed at cutover | Deleted with migration record; validated changes split remaining work by capability |
| `2026-08-09-map-marker-and-search-registry.md` | Registry, global search, and wayfinding | Registry-driven layers shipped; `selection` and `decorations` have no consumer; global palette shipped and was archived | `openspec/specs/map-marker-registry/spec.md`, `map-search/spec.md`, and `global-search/spec.md` (archived `specify-map-marker-registry` and `specify-entity-artwork`) | `complete-map-registry-ownership`: physical selection, popups, decorations, zone focus; `add-map-wayfinding`: routing and arc presentation behind its gate | Search scope and measurements → map main specs and `add-map-wayfinding/design.md`; marker ownership → `complete-map-registry-ownership/design.md` | Overview deleted; `INDEX.md` removed at cutover | Deleted; two validated changes split registry and routing work |

### Deletion subjects for commit staging

Each row is an independently reviewable deletion subject. The profession pair is one subject because
each record directly names the other as its system or migration owner. This session does not commit;
the integration owner stages only the paths for each subject.

| Task | Deleted record | Proposed subject |
|---|---|---|
| 5.1 | Ancient Kingdoms overview | `docs(planning): retire migrated website backlog overview` |
| 5.2 | Apex directory-site design | `docs(planning): retire external apex-site design` |
| 5.3 | Compendium data-contract design | `docs(planning): retire migrated data-contract plan` |
| 5.4 | Website design-system audit | `docs(planning): retire migrated design-system audit` |
| 5.5 | Detail-page title suffixes | `docs(planning): retire replaced title-suffix plan` |
| 5.6 | Entity image surfacing | `docs(planning): retire rejected item-icon plan` |
| 5.7 | Entity structured data | `docs(planning): retire migrated entity-graph plan` |
| 5.8 | Per-entity social images | `docs(planning): retire migrated share-card plan` |
| 5.9 | Entity artwork pipeline | `docs(planning): retire migrated artwork-pipeline plan` |
| 5.10 | Profession coverage snapshot | Already deleted as a separate subject |
| 5.11–5.12 | Profession page migration and system | `docs(planning): retire coupled profession plans` |
| 5.13 | Map marker and search registry | `docs(planning): retire migrated map-registry plan` |
| 6.2–6.4 | Legacy index, guidance, and hook | `docs(planning): complete OpenSpec authority cutover` |

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
