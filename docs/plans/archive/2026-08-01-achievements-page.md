---
title: Achievements Page
type: plan
status: implemented
created: 2026-08-01
parent: 2026-07-31-ancient-kingdoms-overview
superseded_by:
archived: 2026-08-01
---

Build a complete `/achievements` reference from Steam achievement metadata. The page groups related milestones, follows game progression where the order is known, and links each unambiguous target to its compendium page. Global completion percentages are not part of the page because they change independently of game data.

## File map

- Create `mods/DataExporter/Models/AchievementData.cs`: exported Steam achievement contract.
- Create `mods/DataExporter/Exporters/AchievementExporter.cs`: reads the achievement catalog through Steamworks and both icon hashes from Steam's local schema cache.
- Modify `mods/DataExporter/DataExporter.cs`: registers the achievement export after Steam initialization.
- Modify `mods/DataExporter/Exporters/ProfessionExporter.cs`: retains only the profession-to-achievement ID relationship and removes duplicated display metadata.
- Create `exported-data/achievements.json`: generated catalog for the current game version.
- Modify `build-pipeline/src/compendium/models.py`: adds the normalized achievement model and profession foreign key.
- Modify `build-pipeline/src/compendium/loaders/core.py`: loads achievements and validates profession references.
- Modify `build-pipeline/src/compendium/loaders/__init__.py`: exports the achievement loader.
- Modify `build-pipeline/src/compendium/commands/build.py`: runs the achievement loader before professions.
- Create `build-pipeline/tests/test_achievements_loader.py`: covers catalog loading, uniqueness, and profession references.
- Create `website/src/lib/data/achievements/relationships.ts`: source-cited links from achievements to professions, quests, monsters, items, and mechanics pages.
- Create `website/src/lib/components/AchievementLink.svelte`: one route and label contract for achievement references.
- Create `website/src/routes/achievements/achievements-page-data.server.ts`: joins achievement metadata with compendium relationships.
- Create `website/src/routes/achievements/achievements-page-data.test.ts`: covers the page data contract.
- Create `website/src/routes/achievements/+page.server.ts`: prerendered route loader.
- Create `website/src/routes/achievements/+page.svelte`: achievement index and reference page.
- Modify `website/src/routes/+page.svelte`: adds Achievements to the discoverable compendium families.
- Modify `website/src/routes/professions/**/+page.svelte`: replaces plain achievement names with `AchievementLink` while profession migration is incomplete.

## Tasks

### Task 1: Export the complete Steam achievement catalog

**Files:**
- Create: `mods/DataExporter/Models/AchievementData.cs`
- Create: `mods/DataExporter/Exporters/AchievementExporter.cs`
- Modify: `mods/DataExporter/DataExporter.cs`
- Modify: `mods/DataExporter/Exporters/ProfessionExporter.cs`
- Create: `exported-data/achievements.json`

- [x] Add an `AchievementData` record with achievement ID, display name, description, hidden status, display order, and icon paths for locked and unlocked states.
- [x] Read every achievement through Steamworks. Read both icon hashes from Steam's local schema cache, then download the authoritative Steam CDN images.
- [x] Fail the export when Steam is unavailable, an achievement ID is duplicated, visible metadata is empty, or the catalog does not contain the 38 achievements exposed for app `2241380`.
- [x] Replace the profession exporter display-name and description literals with achievement IDs only. The achievement export becomes the single source for Steam metadata.
- [x] Run `dotnet test tests/DataExporter.Tests/DataExporter.Tests.csproj` and `dotnet build mods/DataExporter/DataExporter.csproj`.
  Expected: the mod compiles and `achievements.json` contains 38 unique records with both icon variants.
- [x] Commit.
  Message: `feat(exporter): export Steam achievements`

### Task 2: Normalize achievements in the build pipeline

**Files:**
- Modify: `build-pipeline/src/compendium/models.py`
- Modify: `build-pipeline/src/compendium/loaders/core.py`
- Modify: `build-pipeline/src/compendium/loaders/__init__.py`
- Modify: `build-pipeline/src/compendium/commands/build.py`
- Create: `build-pipeline/tests/test_achievements_loader.py`

- [x] Add an `achievements` table keyed by the Steam achievement ID. Store names, descriptions, hidden status, display order, and local icon paths.
- [x] Replace the three profession achievement columns with `achievement_id`. Load achievements before professions and reject an unknown profession achievement ID.
- [x] Add loader tests for 38 unique achievements, required visible metadata, stable display order, icon paths, and all 13 profession references.
- [x] Run `uv run pytest tests/test_achievements_loader.py`.
  Expected: the focused loader contract passes.
- [x] Run `uv run compendium build`.
  Expected: the database contains 38 achievements and every profession joins to one achievement.
- [x] Commit.
  Message: `feat(pipeline): load normalized achievements`

### Task 3: Build the compendium achievements page

**Files:**
- Create: `website/src/lib/data/achievements/relationships.ts`
- Create: `website/src/lib/components/AchievementLink.svelte`
- Create: `website/src/routes/achievements/achievements-page-data.server.ts`
- Create: `website/src/routes/achievements/achievements-page-data.test.ts`
- Create: `website/src/routes/achievements/+page.server.ts`
- Create: `website/src/routes/achievements/+page.svelte`
- Modify: `website/src/routes/+page.svelte`

- [x] Add source-cited relationships only where the unlock target is unambiguous in current server scripts. Supported targets are profession, quest, monster, item, altar, and mechanics pages. Omit a link when the source does not identify one target.
- [x] Build a prerendered page-data module that groups all achievements by progression, quests, combat, professions, exploration, and items. Keep linked quest milestones together, follow the named quest chain, use current Steam completion rates as progression evidence for bosses, and order professions by the compendium taxonomy.
- [x] Render every achievement with its unlocked icon, Steam name, Steam description, stable `id` anchor, and related compendium links. Mark hidden achievements without revealing metadata that Steam does not expose.
- [x] Constrain every achievement icon frame to the square Steam artwork. Do not let the frame stretch to the height of adjacent copy.
- [x] Add compact category navigation and text filtering as progressive enhancement. All 38 records and links must remain present without JavaScript.
- [x] Add SEO metadata and `CollectionPage` structured data. Add the page to the home-page compendium families.
- [x] Add data tests that assert 38 records, six groups, stable IDs, profession links, representative boss and quest links, and no relationship for an unresolved target.
- [x] Run `pnpm vitest run src/routes/achievements/achievements-page-data.test.ts`.
  Expected: the route contract passes and includes all 38 achievements.
- [x] Commit.
  Message: `feat(website): add achievements page`

### Task 4: Link achievements from existing compendium pages

**Files:**
- Modify: `website/src/routes/professions/**/+page.svelte`
- Modify: profession page loaders affected by the normalized `achievement_id` join

- [x] Replace each plain profession achievement label with `AchievementLink`, linked to `/achievements#<achievement-id>`.
- [x] Use explicit copy such as `Achievement: Beacon of Radiance` or `At 100%, you unlock the Beacon of Radiance achievement.` The trophy icon cannot carry the meaning alone.
- [x] Update every profession loader to join `achievements` by `achievement_id`. Remove all references to the deleted profession display-name and description columns.
- [x] Run `pnpm check` and `pnpm check:citations`.
  Expected: all profession routes compile, every achievement link resolves, and every mechanics citation is current.
- [x] Commit.
  Message: `refactor(website): link profession achievements`

### Task 5: Verify the complete feature

**Files:**
- Modify generated indexes or manifests produced by existing build commands only

- [x] Run `pnpm check && pnpm lint && pnpm test && pnpm build` in `website/`.
  Expected: all checks pass and `/achievements` prerenders.
- [x] Run `pnpm check:citations` from the repository root.
  Expected: all source-cited achievement relationships pass.
- [x] Inspect `/achievements` at 1440×900 and 390×844 with JavaScript enabled and disabled.
  Expected: 38 achievements remain readable, category navigation works, and no horizontal overflow occurs.
- [x] Check every `/achievements#<achievement-id>` link from profession pages.
  Expected: each link reaches the matching achievement.
- [x] Run `omp-plans complete 2026-08-01-achievements-page` after all checks pass.
- [x] Commit.
  Message: `chore(website): finish achievements page`
