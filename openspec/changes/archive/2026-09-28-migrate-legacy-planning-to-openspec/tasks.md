# Tasks: migrate legacy planning to OpenSpec

Evidence collection, reconciliation, replacement planning, and safe removal of independently stale
records proceed one record at a time. Do not remove the legacy index, directory, or authority pointers
until every dated record has a verified disposition. This change does not implement feature work
discovered during an audit.

## 1. Priority gate and inventory

- [x] 1.1 Confirm that no active change constrains the cutover. `rebuild-combat-model` superseded
      `add-combat-verification-harness` and `add-gear-and-rotation-planner`; it was archived on
      2026-09-18, and f10fc2b0 deleted both directories. At the initial gate, no other change was
      active; the validated replacement changes created here remain active without blocking cutover.
- [x] 1.2 Enumerate all 14 files under `docs/plans/`: 13 dated records and `INDEX.md`. Add one
      disposition-ledger row per file before changing a source record.
- [x] 1.3 Enumerate the initial live references to `docs/plans/`, its index, and each dated record.
      Record referrer counts and verify the search with a known positive case. The initial audit
      listed `AGENTS.md`, `lefthook.yml`, the `agent-instructions` spec, the agent-doc checker, and
      `README.md`. The final search and positive control are recorded under task 6.5.
      Positive control: the same search finds 11 archived changes that name `docs/plans`.
- [x] 1.4 Inventory commands, hooks, instructions, navigation, and generated metadata that treat the
      legacy directory or index as an expected path or authority: the lefthook `plans docs` job
      (`omp-plans index && omp-plans check`), the `docs/plans/archive` exclusion in
      `scripts/check_agent_docs.py`, the "Historical records are exempt" requirement in
      `agent-instructions`, and the `AGENTS.md` "Sources of truth" entries. No CI job, generated
      metadata, or website route reads the directory.
- [x] 1.5 Create the disposition ledger with the fields and four outcomes defined in `design.md`,
      and verify its input rows equal the file inventory.

## 2. Record audits

- [x] 2.1 Audit `2026-07-31-ancient-kingdoms-overview.md` against current code, main specs, product
      priorities, and active changes. Record every retained requirement, unfinished subject,
      rationale item, and referrer.
- [x] 2.2 Audit `2026-06-13-compendiums-site-design.md` against the deployed architecture, current
      design authority, main specs, and tests. Record its complete disposition evidence.
- [x] 2.3 Audit `2026-05-28-compendium-data-contract-design.md` against the pipeline schema,
      loaders, database, exporters, citations, and current data-contract specs. Record its complete
      disposition evidence.
- [x] 2.4 Audit `2026-05-27-website-design-system-audit-consolidation.md` against
      `website/DESIGN.md`, current components, routes, and checks. Record its complete disposition
      evidence.
- [x] 2.5 Audit `2026-07-31-detail-page-title-suffixes.md` against current metadata generators,
      route output, and tests. Record its complete disposition evidence.
- [x] 2.6 Audit `2026-07-31-entity-image-surfacing.md` against item, NPC, skill, monster, and other
      entity consumers. Record its complete disposition evidence.
- [x] 2.7 Audit `2026-07-31-entity-structured-data.md` against current structured-data output and
      coverage tests. Record its complete disposition evidence.
- [x] 2.8 Audit `2026-07-31-per-entity-og-images.md` against current Open Graph generation, image
      ownership, and route metadata. Record its complete disposition evidence.
- [x] 2.9 Audit `2026-08-10-entity-artwork-pipeline.md` against exporter, pipeline, reconciliation,
      format, path, and consumer behavior. Record its complete disposition evidence.
- [x] 2.10 Audit `2026-07-31-profession-content-coverage.md` against the current game build,
      exports, routes, and main specs. Treat version-bound findings as expired until remeasured.
- [x] 2.11 Audit `2026-07-31-profession-page-migration.md` against every profession route, shared
      component, test, and remaining divergence. Record its complete disposition evidence.
- [x] 2.12 Audit `2026-07-31-profession-page-system.md` against current profession behavior, design
      authority, and specifications. Record its complete disposition evidence.
- [x] 2.13 Audit `2026-08-09-map-marker-and-search-registry.md` against the registry, map, search,
      URL, layer, and remaining acceptance criteria. Record its complete disposition evidence.
- [x] 2.14 Review all ledger rows together, split independent unfinished subjects, and record the
      exact replacement capability or change owner for every retained item.
- [x] 2.15 Update this change's tasks with one named creation-and-validation task per replacement
      OpenSpec change identified by task 2.14 before deleting any source record.
- [x] 2.16 Re-audit every open ledger row against Ancient Kingdoms 0.9.34.0, commit 44145d9c,
      and the 2026-09-28 working tree. `design.md` names all replacement changes. The recipe query
      reads `item_usages_recipe` (`website/src/lib/server/obtainability.ts:460`), the missing-icon
      lookup distinguishes missing assets (`website/src/lib/server/item-icon-paths.ts`), and
      gather-page coefficient drift was fixed outside this change. The title and item-image owner
      decisions are recorded in their rows.

## 3. Reconcile current behavior

- [x] 3.1 Confirm five documentation-only `specify-*` changes from current implementation:
      `page-metadata` (`Seo.svelte`, `jsonld.ts`, sitemap scripts), `entity-registries`
      (`entities/registry.ts`), `entity-artwork` (exporter, `visual_assets`, search results),
      `map-marker-registry` (`marker-registry.ts`, map search), and `profession-pages`
      (shared header, curve, three routes).
- [x] 3.2 Validate each change strictly, sync its declared delta paths, and archive each at
      `openspec/changes/archive/2026-09-28-specify-*`. Five new main capabilities and artwork
      additions to `compendium-build`, `game-data-export`, and `global-search` are present.
      `openspec validate --all --strict` passed after every sync and archive. The metadata sync
      required carrying its item-page scenario into `add-per-entity-og-images`.
- [x] 3.3 Move permitted decisions to their owners: sprite and encoding choices to the artwork
      design, title mappings to `distinguish-detail-page-titles`, JSON-LD omissions to
      `add-entity-structured-data`, card budgets to `add-per-entity-og-images`, profession density
      and validation to `complete-profession-page-system`, and map scope to the map specs and designs.
      The separate Worker boundary remains in its own repository.
- [x] 3.4 Verify active destinations state present decisions without relying on deleted paths:
      `complete-map-registry-ownership`, `add-map-links-to-list-pages`, `add-site-error-page`,
      `consolidate-server-read-models`, and the exporter/loader changes own their boundaries.
      Archived records retain their original text and do not govern current decisions.
- [x] 3.5 Reconcile the current-behavior and rationale ledger columns only after the five main
      specs exist and all strict validation passes. Replacement implementation tasks stay unchecked.

## 4. Preserve unfinished wanted work

- [x] 4.1 Create a separate active change for each retained subject. The ledger names sixteen
      replacement changes across design, export, pipeline, metadata, artwork, profession, map, and
      small overview items. `add-site-error-page`, `add-security-headers`, and
      `add-map-zoom-controls` are independent active changes, not migrated plan requirements.
- [x] 4.2 Confirm each replacement has its workflow-required proposal, design, tasks, and spec
      deltas. `consolidate-server-read-models` declares `skip_specs: true` for its
      behavior-preserving refactor. The owner decisions about titles and item images appear
      in their replacement designs and ledger rows.
- [x] 4.3 Run `openspec validate --all --strict`: 45 active changes and main specs passed.
      Cross-check the ledger subjects against proposals, deltas, and unchecked task lists.
      Assign profession SQL to `complete-profession-page-system`, profession JSON-LD to
      `add-entity-structured-data`, and compact Hunter/Herbalism actions to
      `add-map-links-to-list-pages`.
- [x] 4.4 Record each replacement and exact retained item in the ledger. `openspec list --json`
      reports zero completed implementation tasks for the active replacement changes.
- [x] 4.5 Reject the prominent item icon and obsolete FTS optimization; defer routing edges
      behind `add-map-wayfinding` task 1 and runtime-dependent profession and helm art behind
      `complete-entity-artwork-pipeline` tasks 1.1–1.3.
- [x] 4.6 `consolidate-website-design-system`: readability, contrast, tokens, primitives,
      and drift enforcement have proposal, `website-design-system` delta, design, tasks, and
      strict validation.
- [x] 4.7 `harden-export-sessions`: catalog, whole-run staging/promotion, manifest, and
      separate curated inputs have proposal, delta, design, tasks, and strict validation.
- [x] 4.8 `distinguish-detail-page-titles`: owner requested a redesigned suffix system on
      2026-09-28. Its design rejects the incorrect light-weapon and slot mappings;
      page-metadata delta and tasks cover the 398 canonical title collisions. Validated strictly.
- [x] 4.9 Owner rejected a second prominent item icon on 2026-09-28. Item detail renders
      `visualAsset` in `ItemTooltip.svelte`; no `finish-entity-image-surfacing` change exists.
      The missing-icon availability defect was fixed outside this migration.
- [x] 4.10 `add-entity-structured-data`: page/entity JSON-LD, conservative schema mapping,
      profession graph ownership, and no `SearchAction` are in its delta and tasks. Validated strictly.
- [x] 4.11 `add-per-entity-og-images`: item/monster cards, accurate alt text, hash, safety,
      and measured budget are in its delta and tasks. Validated strictly.
- [x] 4.12 `complete-entity-artwork-pipeline`: profession and helm source probes, zone thumbnails,
      treasure-map art, redaction, and publication checks are in its delta and tasks.
      Validated strictly; no duplicate item-detail or search-artwork implementation task.
- [x] 4.13 `complete-profession-page-system`: Slayer static completeness, Fishing gate, nine
      routes, source counts, typed profession SQL, payoff SEO, and guide links are in its
      delta and tasks. Validated strictly.
- [x] 4.14 `complete-map-registry-ownership`: physical selection, popup families, actual
      decoration consumers, and zone-focus removal are in its delta and tasks.
      Validated strictly; no live mini-map is promised.
- [x] 4.15 `simplify-pipeline-loader-registration`: ordered catalog, simple/custom boundary,
      prerequisites, and ownership checks are in its delta and tasks. Validated strictly.
- [x] 4.16 `consolidate-server-read-models`: altar server queries, projections, and reachability
      checks are in its design and tasks. Validated strictly with `skip_specs: true`.
- [x] 4.17 `add-global-entity-search` is archived at
      `openspec/changes/archive/2026-09-27-add-global-entity-search/`; its checked tasks
      record strict validation. Search artwork shipped in f0770154 and is now specified in
      `openspec/specs/global-search/spec.md` through archived `specify-entity-artwork`.
- [x] 4.18 `add-map-wayfinding`: routing gate, source-backed providers, cost/availability,
      itinerary, and arcs have delta, design, tasks, and strict validation.
- [x] 4.19 Item detail has one existing artwork renderer (`ItemTooltip.svelte`); search artwork
      has one existing palette renderer (`SearchPalette.svelte`) and a current main-spec contract.
      `complete-entity-artwork-pipeline` excludes both, and no second implementation task remains.
- [x] 4.20 `add-map-links-to-list-pages`: five overviews and Hunter/Herbalism compact actions,
      plus zone rows, have delta, design, tasks, and strict validation.
- [x] 4.21 `show-pack-and-random-sources-in-map-popups`: pack/random source queries and
      popup sections have delta, design, tasks, and strict validation.
- [x] 4.22 `link-entities-to-profession-pages`: gathering and crafted-item relationships
      have delta, design, tasks, and strict validation; guide-to-guide links stay in the
      profession-system change.
- [x] 4.23 Three readers now use `item_usages_recipe`: `obtainability.ts:460`,
      `popup.ts:1448`, and `recipes/+page.server.ts:91`. Material order is not
      contractual by the 2026-09-28 owner decision; this was fixed outside the migration.

## 5. Delete migrated records

- [x] 5.1 Dispose of `2026-07-31-ancient-kingdoms-overview.md` after every retained item and direct
      referrer has a verified owner.
- [x] 5.2 Dispose of `2026-06-13-compendiums-site-design.md` after every retained item and direct
      referrer has a verified owner.
- [x] 5.3 Dispose of `2026-05-28-compendium-data-contract-design.md` after every retained item and
      direct referrer has a verified owner.
- [x] 5.4 Dispose of `2026-05-27-website-design-system-audit-consolidation.md` after every retained
      item and direct referrer has a verified owner.
- [x] 5.5 Dispose of `2026-07-31-detail-page-title-suffixes.md` after every retained item and direct
      referrer has a verified owner.
- [x] 5.6 Dispose of `2026-07-31-entity-image-surfacing.md` after every retained item and direct
      referrer has a verified owner.
- [x] 5.7 Dispose of `2026-07-31-entity-structured-data.md` after every retained item and direct
      referrer has a verified owner.
- [x] 5.8 Dispose of `2026-07-31-per-entity-og-images.md` after every retained item and direct
      referrer has a verified owner.
- [x] 5.9 Dispose of `2026-08-10-entity-artwork-pipeline.md` after every retained item and direct
      referrer has a verified owner.
- [x] 5.10 Dispose of `2026-07-31-profession-content-coverage.md` after every retained item and
      direct referrer has a verified owner.
- [x] 5.11 Dispose of `2026-07-31-profession-page-migration.md` after every retained item and direct
      referrer has a verified owner.
- [x] 5.12 Dispose of `2026-07-31-profession-page-system.md` after every retained item and direct
      referrer has a verified owner.
- [x] 5.13 Dispose of `2026-08-09-map-marker-and-search-registry.md` after every retained item and
      direct referrer has a verified owner.
- [x] 5.14 Each deleted file's ledger row names its destinations and resolved referrers.
      The design's deletion-subject table records separate staging subjects, except for the
      mutually dependent profession pair. The integration owner commits these units.

## 6. Authority cutover

- [x] 6.1 All fourteen ledger rows have a final `Deleted` disposition. Each retained requirement or
      unfinished item names a main spec, archived documentation change, or validated active change.
- [x] 6.2 `AGENTS.md:5-11` names main specs and active changes as sources of truth; `README.md:47-48`
      identifies `docs/` as contributor and evidence material and `openspec/` as the behavior and
      change authority. Neither points to the removed index.
- [x] 6.3 Removed the `plans docs` pre-commit job from `lefthook.yml`. The agent-doc checker has no
      legacy-directory exclusion, and no command, generated metadata, or other live guidance reads it.
      The obsolete main-spec wording is replaced by task 6.9's delta sync.
- [x] 6.4 Deleted `INDEX.md` after all thirteen dated records. `docs/plans/` had no entries and
      `rmdir docs/plans` removed the empty directory.
- [x] 6.5 A search of guidance, hooks, scripts, docs, website, pipeline, mods, tests, build tool,
      main specs, and active changes found no unexpected reference. Only this migration's audit
      evidence and the main `agent-instructions` requirement awaiting 6.9 sync name the old path.
      The same `docs/plans/` query found references in archived changes (positive control).
- [x] 6.6 `openspec validate --all --strict` passed 45/45 main specs and active changes, including
      sixteen replacements and this migration. Repeat after the two delta syncs and archive.
- [x] 6.7 `scripts/check-agent-docs.sh` passed (4 context files, 5 skills, 3 references, 14 rules);
      `python3 scripts/check_agent_docs_test.py` passed 27/27 cases. Relocation changed OpenSpec
      prose and a hook, not source, citations, routes, or generated output, so no other focused check
      applies.
- [x] 6.8 `docs/` contains contributor guides, game defect reports, and combat evidence but no
      `plans/`. `openspec list --json` reports 19 active changes beside this migration; the legacy
      index and hook are gone, leaving no second active-change registry.
- [x] 6.9 Synced the `agent-instructions` MODIFIED requirement and five `documentation-lifecycle`
      ADDED requirements. All six main-spec blocks match their delta blocks exactly.
      `openspec validate --specs` passed 25/25; `openspec validate --all --strict` passed 45/45.
      Archive the complete change at `archive/2026-09-28-migrate-legacy-planning-to-openspec/`.

## 7. Requirement coverage

- [x] 7.1 The thirteen dated rows and index have one disposition each. Tasks 1.2–1.5 record the
      original inventory and referrers; 2.1–2.15 reconcile each record and assign retained items.
- [x] 7.2 Tasks 3.1–3.5 reconciled shipped behavior into five documentation-only changes and main
      specs. Their archived designs and the active replacement designs carry durable rationale;
      obsolete checklist prose was not copied.
- [x] 7.3 Tasks 4.1–4.23 split sixteen still-wanted replacement subjects, distinguish the three
      unrelated active changes, and leave every implementation task unchecked. `openspec validate
      --all --strict` passed 45/45.
- [x] 7.4 Tasks 5.1–5.14 deleted thirteen dated files and the index rather than moving them to
      another archive. The ledger and deletion-subject table record all dispositions and grouping.
- [x] 7.5 Tasks 6.1–6.8 prove no legacy directory, expected path, index, hook, or parallel registry
      remains. Task 6.9 synced both deltas and passed strict validation. Moving this complete
      change to the checked vacant archive target completes the authority cutover.
