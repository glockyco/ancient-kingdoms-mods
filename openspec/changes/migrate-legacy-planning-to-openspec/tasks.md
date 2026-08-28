# Tasks: migrate legacy planning to OpenSpec

Do not start section 2 until both active prerequisite changes are archived. This change migrates
planning authority and records. It does not implement feature work discovered during an audit.

## 1. Priority gate and inventory

- [ ] 1.1 Confirm `add-combat-verification-harness` and `add-gear-and-rotation-planner` are complete
      and archived. Stop without changing legacy records if either remains active.
- [ ] 1.2 Enumerate every file under `docs/plans/`, record the count and paths, and add one ledger
      row per file before changing any source record.
- [ ] 1.3 Enumerate every live reference to `docs/plans/`, its index, and each dated record. Record
      referrer counts and verify the search with a known positive case.
- [ ] 1.4 Inventory commands, hooks, instructions, navigation, and generated metadata that treat the
      legacy directory or index as an expected path or authority.
- [ ] 1.5 Create the disposition ledger with the fields and four outcomes defined in `design.md`,
      and verify its input rows equal the file inventory.

## 2. Record audits

- [ ] 2.1 Audit `2026-07-31-ancient-kingdoms-overview.md` against current code, main specs, product
      priorities, and active changes. Record every retained requirement, unfinished subject,
      rationale item, and referrer.
- [ ] 2.2 Audit `2026-06-13-compendiums-site-design.md` against the deployed architecture, current
      design authority, main specs, and tests. Record its complete disposition evidence.
- [ ] 2.3 Audit `2026-05-28-compendium-data-contract-design.md` against the pipeline schema,
      loaders, database, exporters, citations, and current data-contract specs. Record its complete
      disposition evidence.
- [ ] 2.4 Audit `2026-05-27-website-design-system-audit-consolidation.md` against
      `website/DESIGN.md`, current components, routes, and checks. Record its complete disposition
      evidence.
- [ ] 2.5 Audit `2026-07-31-detail-page-title-suffixes.md` against current metadata generators,
      route output, and tests. Record its complete disposition evidence.
- [ ] 2.6 Audit `2026-07-31-entity-image-surfacing.md` against item, NPC, skill, monster, and other
      entity consumers. Record its complete disposition evidence.
- [ ] 2.7 Audit `2026-07-31-entity-structured-data.md` against current structured-data output and
      coverage tests. Record its complete disposition evidence.
- [ ] 2.8 Audit `2026-07-31-per-entity-og-images.md` against current Open Graph generation, image
      ownership, and route metadata. Record its complete disposition evidence.
- [ ] 2.9 Audit `2026-08-10-entity-artwork-pipeline.md` against exporter, pipeline, reconciliation,
      format, path, and consumer behavior. Record its complete disposition evidence.
- [ ] 2.10 Audit `2026-07-31-profession-content-coverage.md` against the current game build,
      exports, routes, and main specs. Treat version-bound findings as expired until remeasured.
- [ ] 2.11 Audit `2026-07-31-profession-page-migration.md` against every profession route, shared
      component, test, and remaining divergence. Record its complete disposition evidence.
- [ ] 2.12 Audit `2026-07-31-profession-page-system.md` against current profession behavior, design
      authority, and specifications. Record its complete disposition evidence.
- [ ] 2.13 Audit `2026-08-09-map-marker-and-search-registry.md` against the registry, map, search,
      URL, layer, and remaining acceptance criteria. Record its complete disposition evidence.
- [ ] 2.14 Review all ledger rows together, split independent unfinished subjects, and record the
      exact replacement capability or change owner for every retained item.
- [ ] 2.15 Update this change's tasks with one named creation-and-validation task per replacement
      OpenSpec change identified by task 2.14 before deleting any source record.

## 3. Reconcile current behavior

- [ ] 3.1 For each shipped requirement missing from a main spec, create a scoped documentation-only
      OpenSpec change that names the affected capability and derives the contract from
      implementation evidence.
- [ ] 3.2 Validate each documentation-only change strictly, sync its delta to the main
      specification, and archive it before recording that requirement as migrated.
- [ ] 3.3 For each permitted rationale item, move it to the code, citation, specification, design
      authority, or operational document that owns the decision.
- [ ] 3.4 Verify every rationale destination states the current decision without edit history or
      legacy-plan narration.
- [ ] 3.5 Mark each current-behavior and rationale ledger entry complete only after its destination
      exists and its affected checks pass.

## 4. Preserve unfinished wanted work

- [ ] 4.1 Create one scoped OpenSpec change for each independent unfinished subject that the ledger
      retains. Do not combine unrelated deliverables.
- [ ] 4.2 Generate every workflow-required artifact for each replacement change and resolve any
      product decision that changes its scope or acceptance criteria.
- [ ] 4.3 Validate every replacement change strictly and confirm its requirements and tasks cover
      all retained work from the source record.
- [ ] 4.4 Record the replacement change name and exact retained items in the ledger. Leave feature
      implementation unchecked and unstarted.
- [ ] 4.5 Reject or defer uncertain work explicitly. Do not treat missing evidence as permission to
      delete a wanted requirement.

## 5. Delete migrated records

- [ ] 5.1 Dispose of `2026-07-31-ancient-kingdoms-overview.md` after every retained item and direct
      referrer has a verified owner.
- [ ] 5.2 Dispose of `2026-06-13-compendiums-site-design.md` after every retained item and direct
      referrer has a verified owner.
- [ ] 5.3 Dispose of `2026-05-28-compendium-data-contract-design.md` after every retained item and
      direct referrer has a verified owner.
- [ ] 5.4 Dispose of `2026-05-27-website-design-system-audit-consolidation.md` after every retained
      item and direct referrer has a verified owner.
- [ ] 5.5 Dispose of `2026-07-31-detail-page-title-suffixes.md` after every retained item and direct
      referrer has a verified owner.
- [ ] 5.6 Dispose of `2026-07-31-entity-image-surfacing.md` after every retained item and direct
      referrer has a verified owner.
- [ ] 5.7 Dispose of `2026-07-31-entity-structured-data.md` after every retained item and direct
      referrer has a verified owner.
- [ ] 5.8 Dispose of `2026-07-31-per-entity-og-images.md` after every retained item and direct
      referrer has a verified owner.
- [ ] 5.9 Dispose of `2026-08-10-entity-artwork-pipeline.md` after every retained item and direct
      referrer has a verified owner.
- [ ] 5.10 Dispose of `2026-07-31-profession-content-coverage.md` after every retained item and
      direct referrer has a verified owner.
- [ ] 5.11 Dispose of `2026-07-31-profession-page-migration.md` after every retained item and direct
      referrer has a verified owner.
- [ ] 5.12 Dispose of `2026-07-31-profession-page-system.md` after every retained item and direct
      referrer has a verified owner.
- [ ] 5.13 Dispose of `2026-08-09-map-marker-and-search-registry.md` after every retained item and
      direct referrer has a verified owner.
- [ ] 5.14 Verify each deletion in a separate subject-level checkpoint unless coupled records have
      no independently valid state.

## 6. Authority cutover

- [ ] 6.1 Confirm every dated-record ledger row has a non-blocked final disposition and every
      retained item names a validated destination.
- [ ] 6.2 Update repository guidance and navigation so main OpenSpec specs own current behavior and
      active OpenSpec changes own pending behavior work.
- [ ] 6.3 Remove or repoint every command, hook, instruction, and generated-metadata path that
      expects `docs/plans/` or its index.
- [ ] 6.4 Delete `docs/plans/INDEX.md` after all dated records are gone and remove the empty
      `docs/plans/` directory.
- [ ] 6.5 Search all live files for the directory, index, and deleted record paths. Require zero
      unexpected references and verify the search with archived or synthetic positive controls.
- [ ] 6.6 Run strict validation for every replacement change and all main specs affected by the
      migration.
- [ ] 6.7 Run the agent-documentation checker and every focused documentation, citation, route,
      pipeline, or website check required by relocated content.
- [ ] 6.8 Verify the final file inventory contains no legacy planning hub or second active-change
      registry.
- [ ] 6.9 Sync this change's `documentation-lifecycle` delta, validate it strictly, and archive the
      completed migration change.

## 7. Requirement coverage

- [ ] 7.1 Verify tasks 1.2 through 1.5 and 2.1 through 2.15 cover the explicit-disposition
      requirement for every original record.
- [ ] 7.2 Verify tasks 3.1 through 3.5 cover current behavior and durable rationale without copying
      obsolete prose.
- [ ] 7.3 Verify tasks 4.1 through 4.5 produce complete, independently scoped changes for all
      still-wanted work without implementing it.
- [ ] 7.4 Verify tasks 5.1 through 5.14 delete migrated records instead of creating a second
      historical archive.
- [ ] 7.5 Verify tasks 6.1 through 6.9 prove reference-clean removal and the final OpenSpec
      authority cutover.
