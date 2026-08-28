# Planning Index

## active

- **Compendiums.org Site Design** [spec] `2026-06-13-compendiums-site-design` ← 2026-07-31-ancient-kingdoms-overview
- **Ancient Kingdoms Mods — Project Overview** [overview] `2026-07-31-ancient-kingdoms-overview`
- **Profession Page Content Coverage** [audit] `2026-07-31-profession-content-coverage` ← 2026-07-31-ancient-kingdoms-overview
- **Profession Page Migration** [plan] `2026-07-31-profession-page-migration` (—) ← 2026-07-31-ancient-kingdoms-overview
- **Profession Page System** [spec] `2026-07-31-profession-page-system` ← 2026-07-31-ancient-kingdoms-overview
- **Map Marker Registry, Wayfinding, and First-Class Search** [spec] `2026-08-09-map-marker-and-search-registry` ← 2026-07-31-ancient-kingdoms-overview

## active OpenSpec changes

- **Combat Verification Harness** `openspec/changes/add-combat-verification-harness`
- **Gear and Rotation Planner** `openspec/changes/add-gear-and-rotation-planner`

## draft

- **Entity Addition Architecture Design** [spec] `2026-05-28-compendium-data-contract-design` ← 2026-07-31-ancient-kingdoms-overview
- **Detail-Page Title Suffixes** [spec] `2026-07-31-detail-page-title-suffixes` ← 2026-07-31-ancient-kingdoms-overview
- **Entity Structured Data** [spec] `2026-07-31-entity-structured-data` ← 2026-07-31-ancient-kingdoms-overview
- **Per-Entity Open Graph Images** [spec] `2026-07-31-per-entity-og-images` ← 2026-07-31-ancient-kingdoms-overview

## revalidation required

These records contradict current source or shipped surfaces. Audit their remaining acceptance criteria,
relocate durable rationale, and then correct or delete them under `documentation-lifecycle`.

- **Ancient Kingdoms Mods — Project Overview**: recalculate the priority queue because P1.1 still says
  exported entity images have no consumers.
- **Profession Page Content Coverage**: rerun the audit against the current game build. Its findings are
  for 0.9.26.0.
- **Website Design System Audit & Consolidation Plan**: relocate unique rationale and remove references
  to absent `docs/superpowers/**` artifacts.
- **Entity Image Surfacing**: recheck the remaining surfaces because item, NPC, and skill image consumers
  now exist.
- **Entity Artwork: One Pipeline, One Path Rule, One Format**: audit remaining criteria because the
  shared path rule, WebP pipeline, reconciliation, achievements, classes, and professions are
  implemented.

