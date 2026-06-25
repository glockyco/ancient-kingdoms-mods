---
title: "Inventory, Housing, and Map Discoverability Implementation Plan"
type: plan
status: implemented
created: 2026-05-07
parent:
superseded_by:
archived: 2026-06-25
---

# Inventory, Housing, and Map Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:subagent-driven-development (recommended) or skill://superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/mechanics/inventory` into a descriptive storage reference, export house purchase data, add houses as map markers, and add links so visitors can find inventory and housing information from relevant pages.

**Architecture:** House purchase data belongs in the exported game data and the SQLite database, not hardcoded in the website. Source-level and obtainability summaries belong in the build pipeline as canonical denormalized data, not in individual pages. The map gets a first-class `house` entity layer using the same map entity pipeline as monsters, NPCs, chests, altars, and crafting stations. The inventory mechanics page consumes canonical database data for backpacks, house prices, chest prices, source levels, and map links while keeping gameplay text descriptive rather than prescriptive.

**Tech Stack:** MelonLoader C# exporter, Python build pipeline with SQLite, SvelteKit 5, TypeScript, deck.gl, better-sqlite3, sql.js-httpvfs.

---

## Progress Tracking

Update this table as implementation proceeds. Do not leave it stale if the implementation changes direction.

| Task | Status | Notes |
| --- | --- | --- |
| 1. Baseline verification | Complete | `pnpm run check` and `pnpm run lint` passed. Planned pytest command initially failed because `pytest` was not declared in `build-pipeline`; added the dev dependency and reran successfully with 4 passed, 3 existing Pydantic deprecation warnings. Plan file left uncommitted per prior user preference. |
| 2. Export house purchase data | Complete | Added `HouseData`, `HouseExporter`, and export registration after zone triggers. `dotnet build mods/DataExporter/DataExporter.csproj` passed with 0 warnings and 0 errors. |
| 3. Load houses into compendium database | Complete | Added `houses` and `houses_fts`, Pydantic model, loader, build wiring, FTS optimization entry, and loader test. Watched `test_houses_loader.py` fail on missing loader, then pass. |
| 3A. Consolidate item source levels | Complete | Added `item_source_entries`, `source_entries` denormalizer after recipe source levels, and focused tests for vendor, recipe, gather, and container-derived levels. Watched tests fail on missing module, then pass with 4 passed. |
| 3B. Share website source summary access | Complete | Added shared item source summary helper, exported existing DB singleton accessor for reuse, added `scribing` source type config, and switched class detail plus inventory server data to canonical `item_source_entries`. `pnpm run check`, `pnpm run lint`, and focused pipeline tests passed. |
| 4. Add house markers to map data model | Complete | Added `house` map types, house server query, layer config, filtering, selection indexing/resolution, URL visibility default `houses: false`, icon atlas support, and zone-focused data plumbing. `pnpm run check` passed. |
| 5. Render and search house markers on map | Complete | Added full-sidebar Houses toggle, tooltip, popup fields/link, map search category/results/icons, and `MapLink` support. Left compact sidebar quick toggles unchanged to avoid overcrowding. `pnpm run check` and `pnpm run lint` passed. |
| 6. Redesign inventory mechanics data model | Complete | Inventory server load now uses canonical source summaries and returns backpacks, house locations, and house chest structure slot/cost rows. Typecheck passed as part of later checks. |
| 7. Redesign inventory mechanics page | Complete | Replaced page with descriptive storage reference including overview, backpack obtainability, bank tabs, house locations, chest sections, and concise rule lists. Removed the shared-storage callout plus capacity and storage-cost summary tables after review because they duplicated details better presented elsewhere on the page. Changed the backpack table label back to “Source Level” per feedback. Semicolon scan only found TypeScript semicolons. `pnpm run check` and `pnpm run lint` passed. |
| 8. Add discoverability links | Complete | Added mechanics index, homepage Mechanics card, contextual backpack and house chest item links, cross-links from Death XP and Weapon On-Hit Procs, and a focused discoverability test. Watched the test fail before cross-links, then pass. `pnpm run check` and `pnpm run lint` passed. |
| 9. Final verification and review | Complete | Ran a fresh `dotnet run --project build-tool export --update`; `exported-data/houses.json` now contains 9 houses. Rebuilt `website/static/compendium.db` from current exports and verified 9 `houses` rows plus 9 matching `houses_fts` rows. Fixed the house schema after the real export showed `Housing.faction_house` stores display names such as “Elven Kingdom”, not normalized `factions.id`; `houses.faction_id` now preserves the exported game value without a foreign key. `pnpm run check`, `pnpm run lint`, focused pytest, focused Vitest, `pnpm run build`, and `dotnet build mods/DataExporter/DataExporter.csproj` passed during final verification. |

## Plan Maintenance Rules

- Keep this plan open while implementing.
- If a new finding contradicts this plan, update the relevant task before changing code.
- If the contradiction changes user-facing behavior, data meaning, schema shape, or scope, stop implementation and discuss it before continuing.
- Record concrete findings in the task notes. Examples: house prices are player-discounted at display time, a house lacks a valid zone, or a map selection category needs extra plumbing not listed here.
- Commit code and plan updates together when the plan update documents a finding from that commit.
- Do not add a Svelte test for `website/src/routes/mechanics/inventory/+page.svelte`. The user explicitly asked not to write tests for that file.

## Current Observed Facts

- `server-scripts/Housing.cs` exposes `idHouse`, `description_house`, `price_house`, `faction_house`, and `faction_needed` on house purchase triggers.
- `server-scripts/Housing.cs:47-48` sends a house purchase panel using `UINpcTrading.singleton.CalculatePurchaseItemPrice(price_house, player)`, so exported `price_house` is the base price before player-specific price modifiers.
- `server-scripts/UIHousing.cs:71-89` buys the house for the shown price and warns that houses are bound to the server.
- `server-scripts/HousingManager.cs:21-32` contains house resale prices, not purchase prices.
- `server-scripts/CustomStructureItem.cs:6-9` defines structure item `price`, and existing item export already populates `items.structure_price`.
- Current chest structure prices in `website/static/compendium.db`: Wooden Chest 5,000, Blue Chest 10,000, Red Chest 20,000, Stone Chest 50,000, Granite Chest 80,000, Sturdy Chest 85,000, Rustic Chest 90,000, Guardian Box 100,000.
- `server-scripts/StrucItemUi.cs:33-36` warns that chests of the same color share storage.
- `server-scripts/Database.cs:909-919` loads bank item storage by character.
- `server-scripts/Database.cs:936-946` loads house chest storage by account.
- `server-scripts/Database.cs:615-628` stores banked gold on the account.
- “Source-level consolidation” means replacing duplicated page-specific obtainability SQL with one canonical source summary. Today inventory and class detail compute item sources differently, especially vendor levels, recipe levels, gather/chest levels, and pack/random/merge/treasure-map levels. This plan includes consolidation so the inventory page and class detail page agree.

## File Structure

### Exporter

- Create `mods/DataExporter/Models/HouseData.cs`
  - Holds the JSON contract for `houses.json`.
- Create `mods/DataExporter/Exporters/HouseExporter.cs`
  - Finds live `Il2Cpp.Housing` scene objects.
  - Exports base house purchase prices and world positions.
- Modify `mods/DataExporter/DataExporter.cs`
  - Calls `HouseExporter.Export()` with other world-location exporters.

### Build pipeline

- Modify `build-pipeline/src/compendium/models.py`
  - Adds `HouseData` Pydantic model.
- Modify `build-pipeline/schema.sql`
  - Adds `houses` table, indexes, and `houses_fts` search table/triggers.
- Modify `build-pipeline/src/compendium/loaders/core.py`
  - Adds `load_houses()`.
- Modify `build-pipeline/src/compendium/loaders/__init__.py`
  - Exports `load_houses`.
- Modify `build-pipeline/src/compendium/commands/build.py`
  - Runs `load_houses` after zones and zone triggers.
- Create `build-pipeline/tests/test_houses_loader.py`
  - Verifies house data loads, joins to zones, and is searchable.

### Canonical source levels

- Modify `build-pipeline/schema.sql`
  - Adds denormalized `item_source_entries` table for canonical item source summaries.
- Create `build-pipeline/src/compendium/denormalizers/items/source_entries.py`
  - Populates `item_source_entries` after recipe source levels are known.
- Modify `build-pipeline/src/compendium/denormalizers/__init__.py`
  - Runs source entry denormalization after `crafting_source_level.run(conn)`.
- Create `build-pipeline/tests/test_item_source_entries.py`
  - Verifies vendor, recipe, gather, and container-derived levels.
- Create `website/src/lib/server/item-source-summary.ts`
  - Provides one batched website accessor for item source summaries.
- Modify `website/src/lib/queries/classes.server.ts`
  - Uses shared source summaries instead of its local source-level UNION.
- Modify `website/src/lib/constants/source-types.ts`
  - Adds `scribing` if canonical recipe source entries preserve recipe type.

### Map

- Modify `website/src/lib/types/map.ts`
  - Adds `house` entity type, `HouseMapEntity`, visibility toggles, map data arrays, and filtered data arrays.
- Modify `website/src/lib/queries/map.server.ts`
  - Adds `loadHousesServer()` and includes houses in `loadAllMapEntitiesServer()`.
- Modify `website/src/lib/map/config.ts`
  - Adds house color, radius, and icon sizing.
- Modify `website/src/lib/map/layers.ts`
  - Filters houses and renders the house layer.
- Modify `website/src/lib/map/selection.ts`
  - Indexes houses for selection/highlighting.
- Modify `website/src/lib/map/resolve-selection.ts`
  - Resolves `house` physical selections.
- Modify `website/src/lib/map/url-state.ts`
  - Adds `houses` to default layer visibility and URL round-trip support.
- Modify `website/src/lib/components/map/sidebar/MapSidebar.svelte`
  - Adds a quick toggle for houses if the quick toggle set remains useful.
- Modify `website/src/lib/components/map/sidebar/MapSidebarContent.svelte`
  - Adds a Houses toggle in the interactables section.
- Modify `website/src/lib/components/map/MapTooltip.svelte`
  - Shows house name and “House”.
- Modify `website/src/lib/components/map/EntityPopup.svelte`
  - Displays house price, faction requirement, zone, and a link to `/mechanics/inventory#house-chests`.
- Modify `website/src/lib/queries/map-search.ts`
  - Adds houses to map search.
- Modify `website/src/lib/components/map/MapSearch.svelte`
  - Adds house category label.
- Modify `website/src/lib/components/map/SearchResultItem.svelte`
  - Adds house icon and display handling.
- Modify `website/src/lib/components/MapLink.svelte`
  - Allows `entityType="house"`.

### Inventory mechanics page

- Modify `website/src/routes/mechanics/inventory/+page.server.ts`
  - Adds house and chest structure data to page data.
  - Removes any page-local source-level logic that duplicates build-pipeline canonical source-level rules after canonical source levels are available.
  - Uses shared canonical source summaries for backpack obtainability.
- Modify `website/src/routes/mechanics/inventory/+page.svelte`
  - Adds the storage overview, shared-storage callout, house prices/locations, and rewritten prose.
  - Removes semicolons from running text.
  - Uses links to house map markers, backpack item pages, source pages, and related mechanics pages.

### Discoverability

- Create `website/src/routes/mechanics/+page.svelte`
  - Mechanics index linking Inventory, Experience, and Combat.
- Modify `website/src/routes/+page.svelte`
  - Adds a Mechanics card or section.
- Modify `website/src/routes/items/[id]/+page.svelte`
  - Adds contextual links for backpacks and structure chest items.
- Modify `website/src/routes/mechanics/experience/+page.svelte`
  - Add a link from Death XP recovery text to `/mechanics/inventory#equipment-and-death`.
- Modify `website/src/routes/mechanics/combat/+page.svelte`
  - Add a link from Weapon On-Hit Procs durability text to `/mechanics/inventory#equipment-and-death`.

---

## Task 1: Baseline Verification

**Files:**
- Read: `website/src/routes/mechanics/inventory/+page.server.ts`
- Read: `website/src/routes/mechanics/inventory/+page.svelte`
- Read: `mods/DataExporter/DataExporter.cs`
- Read: `server-scripts/Housing.cs`
- Read: `server-scripts/UIHousing.cs`
- Read: `server-scripts/HousingManager.cs`
- Read: `server-scripts/StrucItemUi.cs`
- Read: `website/src/lib/map/CLAUDE.md`

- [ ] **Step 1: Record current repo state**

Run:

```bash
git status --short
```

Expected: Existing inventory page work may be modified or untracked. Do not discard user or prior-agent work.

- [ ] **Step 2: Verify current website health before changing behavior**

Run:

```bash
pnpm run check
pnpm run lint
```

Expected: Both pass, or failures are recorded here before continuing.

- [ ] **Step 3: Verify build pipeline test baseline**

Run:

```bash
cd build-pipeline && uv run pytest tests/test_item_cosmetic_fields.py tests/test_cli.py -q
```

Expected: Selected tests pass. If they fail for unrelated reasons, record the exact failure and stop before broad changes.

- [ ] **Step 4: Commit baseline-only plan state if needed**

Do not commit code in this step. If this plan file is meant to be tracked, commit it alone:

```bash
git add docs/superpowers/plans/2026-05-07-inventory-housing-map-redesign.md
git commit -m "docs: plan inventory housing map redesign"
```

If the user continues the prior preference of not committing plan files, skip this commit and record that decision in Progress Tracking.

---

## Task 2: Export House Purchase Data

**Files:**
- Create: `mods/DataExporter/Models/HouseData.cs`
- Create: `mods/DataExporter/Exporters/HouseExporter.cs`
- Modify: `mods/DataExporter/DataExporter.cs`

- [ ] **Step 1: Add the house export model**

Create `mods/DataExporter/Models/HouseData.cs`:

```csharp
namespace DataExporter.Models;

public class HouseData
{
    public string id { get; set; }
    public string name { get; set; }
    public string description { get; set; }
    public long base_price { get; set; }
    public string faction_id { get; set; }
    public double faction_required { get; set; }
    public string zone_id { get; set; }
    public string sub_zone_id { get; set; }
    public Position position { get; set; }
}
```

- [ ] **Step 2: Add the house exporter**

Create `mods/DataExporter/Exporters/HouseExporter.cs`:

```csharp
using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class HouseExporter : BaseExporter
{
    public HouseExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting houses...");

        var type = Il2CppType.Of<Il2Cpp.Housing>();
        var objects = Resources.FindObjectsOfTypeAll(type);
        Logger.Msg($"Found {objects.Length} house objects total");

        var houses = new List<HouseData>();

        foreach (var obj in objects)
        {
            var house = obj.TryCast<Il2Cpp.Housing>();
            if (house == null)
                continue;

            var isTemplate = house.gameObject == null || !house.gameObject.scene.IsValid();
            if (isTemplate)
                continue;

            var zoneInfo = GetZoneInfoFromPosition(house.transform.position);
            var name = string.IsNullOrEmpty(house.description_house)
                ? house.idHouse
                : house.description_house;

            houses.Add(new HouseData
            {
                id = SanitizeId(house.idHouse),
                name = name,
                description = house.description_house,
                base_price = house.price_house,
                faction_id = house.faction_house,
                faction_required = house.faction_needed,
                zone_id = zoneInfo.ZoneId,
                sub_zone_id = zoneInfo.SubZoneId,
                position = new Position(
                    house.transform.position.x,
                    house.transform.position.y,
                    house.transform.position.z
                )
            });
        }

        WriteJson(houses, "houses.json");
        Logger.Msg($"✓ Exported {houses.Count} houses");
    }
}
```

If compile fails because an Il2Cpp field name differs, inspect `server-scripts/Housing.cs` and the generated Il2Cpp type, then update this plan before changing the code.

- [ ] **Step 3: Wire exporter into full export**

In `mods/DataExporter/DataExporter.cs`, add after zone trigger export or near other world-location exporters:

```csharp
// Export houses (purchase locations)
var houseExporter = new HouseExporter(LoggerInstance, ExportPath);
houseExporter.Export();
```

- [ ] **Step 4: Verify DataExporter compiles**

Run:

```bash
dotnet build mods/DataExporter/DataExporter.csproj
```

Expected: Build succeeds.

- [ ] **Step 5: Commit exporter change**

```bash
git add mods/DataExporter/Models/HouseData.cs mods/DataExporter/Exporters/HouseExporter.cs mods/DataExporter/DataExporter.cs
git commit -m "feat(data-export): export house purchase locations"
```

---

## Task 3: Load Houses Into the Compendium Database

**Files:**
- Modify: `build-pipeline/schema.sql`
- Modify: `build-pipeline/src/compendium/models.py`
- Modify: `build-pipeline/src/compendium/loaders/core.py`
- Modify: `build-pipeline/src/compendium/loaders/__init__.py`
- Modify: `build-pipeline/src/compendium/commands/build.py`
- Create: `build-pipeline/tests/test_houses_loader.py`

- [ ] **Step 1: Add `houses` schema**

Add before the map-location tables or near other world-location tables in `build-pipeline/schema.sql`:

```sql
-- =============================================================================
-- HOUSES (purchase locations)
-- =============================================================================

CREATE TABLE houses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    base_price INTEGER NOT NULL DEFAULT 0,
    faction_id TEXT REFERENCES factions(id),
    faction_required REAL DEFAULT 0,
    zone_id TEXT REFERENCES zones(id),
    zone_name TEXT,
    sub_zone_id TEXT REFERENCES zone_triggers(id),
    sub_zone_name TEXT,
    position_x REAL,
    position_y REAL,
    position_z REAL,
    keywords TEXT
);

CREATE INDEX idx_houses_zone ON houses(zone_id);
CREATE INDEX idx_houses_price ON houses(base_price);
```

Add FTS table and triggers in the FTS section:

```sql
CREATE VIRTUAL TABLE houses_fts USING fts5(
    name,
    keywords,
    content=houses,
    content_rowid=rowid,
    prefix='2,3'
);

CREATE TRIGGER houses_ai AFTER INSERT ON houses BEGIN
    INSERT INTO houses_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;

CREATE TRIGGER houses_ad AFTER DELETE ON houses BEGIN
    INSERT INTO houses_fts(houses_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
END;

CREATE TRIGGER houses_au AFTER UPDATE ON houses BEGIN
    INSERT INTO houses_fts(houses_fts, rowid, name, keywords) VALUES ('delete', old.rowid, old.name, old.keywords);
    INSERT INTO houses_fts(rowid, name, keywords) VALUES (new.rowid, new.name, new.keywords);
END;
```

- [ ] **Step 2: Add Pydantic model**

In `build-pipeline/src/compendium/models.py`, add near other world-location models:

```python
class HouseData(BaseModel):
    """House purchase location from houses.json"""

    id: str
    name: str
    description: str | None = None
    base_price: int = 0
    faction_id: str | None = None
    faction_required: float = 0.0
    zone_id: str
    sub_zone_id: str | None = None
    position: Position
```

- [ ] **Step 3: Add loader**

In `build-pipeline/src/compendium/loaders/core.py`, import `HouseData` and add:

```python
def load_houses(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load house purchase world locations into database."""
    console.print("Loading houses...")

    filepath = export_dir / "houses.json"
    if not filepath.exists():
        console.print("  [yellow]SKIP[/yellow] No houses.json found")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    houses = [HouseData(**item) for item in data]
    cursor = conn.cursor()

    for house in houses:
        zone_row = cursor.execute(
            "SELECT name FROM zones WHERE id = ?", (house.zone_id,)
        ).fetchone()
        sub_zone_row = (
            cursor.execute(
                "SELECT name FROM zone_triggers WHERE id = ?", (house.sub_zone_id,)
            ).fetchone()
            if house.sub_zone_id
            else None
        )
        keywords = "house housing property storage chest"

        cursor.execute(
            """
            INSERT INTO houses (
                id, name, description, base_price, faction_id, faction_required,
                zone_id, zone_name, sub_zone_id, sub_zone_name,
                position_x, position_y, position_z, keywords
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                house.id,
                house.name,
                house.description,
                house.base_price,
                house.faction_id,
                house.faction_required,
                house.zone_id,
                zone_row[0] if zone_row else None,
                house.sub_zone_id,
                sub_zone_row[0] if sub_zone_row else None,
                house.position.x,
                house.position.y,
                house.position.z,
                keywords,
            ),
        )

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(houses)} houses")
```

If `faction_id` values are display names rather than normalized `factions.id`, either normalize them in this loader or drop the foreign key. Update the plan before making that schema decision.

- [ ] **Step 4: Export loader from package**

Add `load_houses` to both the import list and `__all__` in `build-pipeline/src/compendium/loaders/__init__.py`.

- [ ] **Step 5: Add loader to build command**

In `build-pipeline/src/compendium/commands/build.py`, import `load_houses` and run it after zones and zone triggers exist:

```python
load_zone_triggers(conn, export_dir)
load_houses(conn, export_dir)  # After zones + zone_triggers
load_items(conn, export_dir)
```

If house faction FK requires factions only, this placement is safe because `load_static_data()` already ran.

- [ ] **Step 6: Add houses FTS optimization**

In `build-pipeline/src/compendium/commands/build.py`, add `houses_fts` to the `fts_tables` list:

```python
fts_tables = [
    "items_fts",
    "monsters_fts",
    "npcs_fts",
    "quests_fts",
    "zones_fts",
    "houses_fts",
]
```

If the list has changed by implementation time, preserve the existing entries and add `houses_fts` exactly once.


- [ ] **Step 7: Add loader test**

Create `build-pipeline/tests/test_houses_loader.py`:

```python
import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.loaders.core import load_houses


SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class HousesLoaderTests(unittest.TestCase):
    def test_load_houses_preserves_price_location_and_search_keywords(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            export_dir.mkdir(parents=True)
            (export_dir / "houses.json").write_text(
                json.dumps(
                    [
                        {
                            "id": "elven_lake_house",
                            "name": "Elven Lake House",
                            "description": "Elven Lake House",
                            "base_price": 90000,
                            "faction_id": None,
                            "faction_required": 0,
                            "zone_id": "elven_kingdom",
                            "sub_zone_id": "zone_trigger_lake",
                            "position": {"x": 10, "y": 20, "z": 0},
                        }
                    ]
                ),
                encoding="utf-8",
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            conn.execute(
                "INSERT INTO zones (id, zone_id, name) VALUES ('elven_kingdom', 1, 'Elven Kingdom')"
            )
            conn.execute(
                """
                INSERT INTO zone_triggers (id, name, zone_id)
                VALUES ('zone_trigger_lake', 'Lake', 1)
                """
            )
            try:
                load_houses(conn, export_dir)
                row = conn.execute(
                    """
                    SELECT id, name, base_price, zone_name, sub_zone_name, position_x, position_y
                    FROM houses
                    WHERE id = 'elven_lake_house'
                    """
                ).fetchone()
                fts_rows = conn.execute(
                    "SELECT rowid FROM houses_fts WHERE houses_fts MATCH 'housing'"
                ).fetchall()
            finally:
                conn.close()

        self.assertEqual(
            row,
            (
                "elven_lake_house",
                "Elven Lake House",
                90000,
                "Elven Kingdom",
                "Lake",
                10,
                20,
            ),
        )
        self.assertEqual(len(fts_rows), 1)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 8: Run focused pipeline tests**

Run:

```bash
cd build-pipeline && uv run pytest tests/test_houses_loader.py -q
```

Expected: PASS.

- [ ] **Step 9: Commit pipeline change**

```bash
git add build-pipeline/schema.sql build-pipeline/src/compendium/models.py build-pipeline/src/compendium/loaders/core.py build-pipeline/src/compendium/loaders/__init__.py build-pipeline/src/compendium/commands/build.py build-pipeline/tests/test_houses_loader.py
git commit -m "feat(pipeline): load house purchase data"
```

---

## Task 3A: Consolidate Item Source Levels

**Files:**
- Modify: `build-pipeline/schema.sql`
- Create: `build-pipeline/src/compendium/denormalizers/items/source_entries.py`
- Modify: `build-pipeline/src/compendium/denormalizers/__init__.py`
- Create: `build-pipeline/tests/test_item_source_entries.py`

- [ ] **Step 1: Add canonical source summary table**

Add to `build-pipeline/schema.sql` after the existing `item_sources_*` tables:

```sql
CREATE TABLE item_source_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL REFERENCES items(id),
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_level INTEGER,
    source_sort_name TEXT NOT NULL
);

CREATE INDEX idx_item_source_entries_item ON item_source_entries(item_id);
CREATE INDEX idx_item_source_entries_type ON item_source_entries(source_type);
CREATE INDEX idx_item_source_entries_level ON item_source_entries(source_level);
```

This table is denormalized display/query data. It does not replace the detailed normalized source tables used by item detail pages.

- [ ] **Step 2: Add source entry denormalizer**

Create `build-pipeline/src/compendium/denormalizers/items/source_entries.py`.

The denormalizer must:

- Clear `item_source_entries` at the start.
- Insert monster drops with `source_level = COALESCE(monsters.level_min, monsters.level)`.
- Insert quest sources with `source_level = quests.level_recommended`.
- Insert vendor sources with regular vendors at level `1` and adventurer vendors at level `40`.
- Insert altar sources with `source_level = MAX(item_sources_altar.min_effective_level, altars.min_level_required)`.
- Insert recipe sources with `source_level = item_sources_recipe.source_level` and `source_type = recipe_type`. Because this can emit `scribing`, add `scribing` to website source type config before using canonical entries in Svelte UI.
- Insert gather sources with `source_level = MIN(zones.level_median)` across known resource spawn zones.
- Insert chest sources with `source_level = zones.level_median` for the chest zone when known.
- Insert pack, random, merge, and treasure-map sources using the minimum known source level of the container or component item if that can be resolved from already inserted rows. If it cannot be resolved, keep `source_level = NULL`.

Include source comments for the vendor constants:

```python
# Source: server-scripts/UINpcTrading.cs:354-365 — vendor purchases have no player-level gate unless the item adds faction or adventuring requirements.
# Source: server-scripts/Npc.cs:45-47 — adventurer merchants are a distinct NPC role.
# Source: server-scripts/Npc.cs:1914-1916 — adventurer NPC interactions treat player level 40 as the low-level cutoff.
REGULAR_VENDOR_SOURCE_LEVEL = 1
ADVENTURER_VENDOR_SOURCE_LEVEL = 40
```

- [ ] **Step 3: Run after recipe source levels**

In `build-pipeline/src/compendium/denormalizers/__init__.py`, import the new module:

```python
from compendium.denormalizers.items import crafting_source_level, source_entries
```

Run it immediately after recipe source levels:

```python
# Crafting source levels (needs item sources + zone medians)
crafting_source_level.run(conn)

# Canonical item source summaries (needs recipe source levels)
source_entries.run(conn)
```

- [ ] **Step 4: Add focused denormalizer tests**

Create `build-pipeline/tests/test_item_source_entries.py` with tests for:

- Regular vendor item gets source level `1`.
- Adventurer vendor item gets source level `40`.
- Recipe source entry preserves `item_sources_recipe.source_level`.
- Gather source entry uses the minimum zone median for the resource.
- A pack/random/merge/treasure-map source gets the container item’s known minimum level when available.

Use small in-memory fixture rows. Do not require a full game export.

- [ ] **Step 5: Run focused tests**

Run:

```bash
cd build-pipeline && uv run pytest tests/test_item_source_entries.py -q
```

Expected: PASS.

- [ ] **Step 6: Commit source-level denormalization**

```bash
git add build-pipeline/schema.sql build-pipeline/src/compendium/denormalizers/items/source_entries.py build-pipeline/src/compendium/denormalizers/__init__.py build-pipeline/tests/test_item_source_entries.py
git commit -m "feat(pipeline): denormalize item source entries"
```

---

## Task 3B: Share Website Source Summary Access

**Files:**
- Create: `website/src/lib/server/item-source-summary.ts`
- Modify: `website/src/lib/queries/classes.server.ts`
- Modify: `website/src/routes/mechanics/inventory/+page.server.ts`

- Modify: `website/src/lib/constants/source-types.ts`
- [ ] **Step 1: Ensure source type config covers canonical rows**

In `website/src/lib/constants/source-types.ts`, add `\"scribing\"` to `ItemSourceType` and add a config entry:

```typescript
scribing: {
  icon: ScrollText,
  color: "text-purple-500",
  label: "Scribing",
  linkPrefix: "/recipes/",
},
```

If canonical source entries map scribing recipes to `recipe` instead, record that decision here and do not add a dead config entry.

- [ ] **Step 2: Create shared source summary helper**

Create `website/src/lib/server/item-source-summary.ts`:

```typescript
import type Database from "better-sqlite3";
import type { ItemSourceType } from "$lib/constants/source-types";

export interface ItemSourceSummary {
  item_id: string;
  type: ItemSourceType;
  id: string;
  name: string;
  source_level: number | null;
}

export function getItemSourceSummaries(
  db: Database.Database,
  itemIds: string[],
): ItemSourceSummary[] {
  if (itemIds.length === 0) return [];

  const placeholders = itemIds.map(() => "?").join(",");
  return db
    .prepare(
      `
      SELECT
        item_id,
        source_type as type,
        source_id as id,
        source_name as name,
        source_level
      FROM item_source_entries
      WHERE item_id IN (${placeholders})
      ORDER BY
        item_id ASC,
        source_level IS NULL ASC,
        source_level ASC,
        source_sort_name ASC
      `,
    )
    .all(...itemIds) as ItemSourceSummary[];
}

export function groupItemSourceSummaries(
  rows: ItemSourceSummary[],
): Map<string, ItemSourceSummary[]> {
  const grouped = new Map<string, ItemSourceSummary[]>();
  for (const row of rows) {
    const existing = grouped.get(row.item_id);
    if (existing) existing.push(row);
    else grouped.set(row.item_id, [row]);
  }
  return grouped;
}

export function getMinimumSourceLevel(
  sources: Pick<ItemSourceSummary, "source_level">[],
): number | null {
  const levels = sources
    .map((source) => source.source_level)
    .filter((level): level is number => level !== null);
  return levels.length > 0 ? Math.min(...levels) : null;
}
```

- [ ] **Step 3: Replace class detail source UNION**

In `website/src/lib/queries/classes.server.ts`, remove the local `RawSourceRow` UNION and grouping logic in `getClassItemsWithSources`. Use `getItemSourceSummaries`, `groupItemSourceSummaries`, and `getMinimumSourceLevel` instead.

The class detail page should keep the same returned shape:

```typescript
sources: ClassItemSource[];
min_source_level: number | null;
```

- [ ] **Step 4: Replace inventory page source UNION**

In `website/src/routes/mechanics/inventory/+page.server.ts`, remove local source-level helpers and use the same shared helper for backpack source rows. Keep backpack sorting as:

```typescript
backpack_slots ASC, quality ASC, min_source_level ASC NULLS LAST, name ASC
```

- [ ] **Step 5: Run checks**

Run:

```bash
pnpm run check
pnpm run lint
```

Expected: Both pass.

- [ ] **Step 6: Commit shared source summary access**

```bash
git add website/src/lib/constants/source-types.ts website/src/lib/server/item-source-summary.ts website/src/lib/queries/classes.server.ts website/src/routes/mechanics/inventory/+page.server.ts
git commit -m "refactor(site): share item source summaries"
```

---

## Task 4: Add House Markers to Map Data Model

**Files:**
- Modify: `website/src/lib/types/map.ts`
- Modify: `website/src/lib/queries/map.server.ts`
- Modify: `website/src/lib/map/config.ts`
- Modify: `website/src/lib/map/layers.ts`
- Modify: `website/src/lib/map/selection.ts`
- Modify: `website/src/lib/map/resolve-selection.ts`
- Modify: `website/src/lib/map/url-state.ts`

- [ ] **Step 1: Add map types**

In `website/src/lib/types/map.ts`, add `"house"` to `EntityType` and add:

```typescript
export interface HouseMapEntity extends MapEntity {
  type: "house";
  basePrice: number;
  factionId: string | null;
  factionRequired: number;
  subZoneId: string | null;
  subZoneName: string | null;
}
```

Add `HouseMapEntity` to `AnyMapEntity`. Add `houses: boolean` to `LayerVisibility`. Add `houses: HouseMapEntity[]` to `MapEntityData` and `FilteredMapData`.

- [ ] **Step 2: Load houses for map prerendering**

In `website/src/lib/queries/map.server.ts`, import `HouseMapEntity` and add:

```typescript
interface HouseRow {
  id: string;
  name: string;
  base_price: number;
  faction_id: string | null;
  faction_required: number;
  zone_id: string;
  zone_name: string;
  sub_zone_id: string | null;
  sub_zone_name: string | null;
  position_x: number | null;
  position_y: number | null;
}

function loadHousesServer(db: Database.Database): HouseMapEntity[] {
  const rows = db
    .prepare(
      `
      SELECT
        h.id,
        h.name,
        h.base_price,
        h.faction_id,
        h.faction_required,
        h.zone_id,
        COALESCE(h.zone_name, z.name) as zone_name,
        h.sub_zone_id,
        h.sub_zone_name,
        h.position_x,
        h.position_y
      FROM houses h
      LEFT JOIN zones z ON z.id = h.zone_id
      WHERE h.position_x IS NOT NULL
        AND h.position_y IS NOT NULL
      `,
    )
    .all() as HouseRow[];

  return rows.map((row) => ({
    id: row.id,
    type: "house",
    name: row.name,
    position:
      row.position_x !== null && row.position_y !== null
        ? [row.position_x, -row.position_y]
        : null,
    zoneId: row.zone_id,
    zoneName: row.zone_name,
    basePrice: row.base_price,
    factionId: row.faction_id,
    factionRequired: row.faction_required,
    subZoneId: row.sub_zone_id,
    subZoneName: row.sub_zone_name,
  }));
}
```

Add `const houses = loadHousesServer(db);` to `loadAllMapEntitiesServer()` and return `houses`.

- [ ] **Step 3: Add config constants**

In `website/src/lib/map/config.ts`, add:

```typescript
house: [245, 158, 11] as [number, number, number], // amber-500
```

Add radius and icon size:

```typescript
house: 6,
```

```typescript
house: { base: 22, min: 20, max: 48 },
```

- [ ] **Step 4: Filter houses once**

In `website/src/lib/map/layers.ts`, add:

```typescript
const renderableHouses = data.houses.filter((h) => h.position !== null);
```

Return `houses: renderableHouses` from `createFilteredData()`.

- [ ] **Step 5: Render house layer**

In `createLayers()`, add a house layer using the existing `createEntityLayer<T>()` helper pattern. It should use:

```typescript
id: "houses"
data: filtered.houses
visible: visibility.houses
color: LAYER_COLORS.house
radius: LAYER_RADII.house
```

Put it near other interactables, ideally above chests and below NPCs. Do not compute house data inside `createLayers()`.

- [ ] **Step 6: Add selection index and resolution**

In `website/src/lib/map/selection.ts`, add `houses: Map<string, AnyMapEntity[]>` to `EntityIndex`, index `data.houses`, and return it for category `"house"`.

In `website/src/lib/map/resolve-selection.ts`, add `"house"` to `HighlightCategory`, handle `case "house"`, and add a `resolveHouseSelection()` matching the structure of `resolveChestSelection()`.

- [ ] **Step 7: Add URL visibility default**

In `website/src/lib/map/url-state.ts`, add `houses: false` to `getDefaultLayerVisibility()`. Do not add houses to `DEFAULT_LAYERS` unless product review decides house markers should be visible by default.

- [ ] **Step 8: Run typecheck**

Run:

```bash
pnpm run check
```

Expected: No TypeScript or Svelte errors.

- [ ] **Step 9: Commit map model change**

```bash
git add website/src/lib/types/map.ts website/src/lib/queries/map.server.ts website/src/lib/map/config.ts website/src/lib/map/layers.ts website/src/lib/map/selection.ts website/src/lib/map/resolve-selection.ts website/src/lib/map/url-state.ts
git commit -m "feat(map): add house marker data model"
```

---

## Task 5: Render, Search, and Inspect House Markers

**Files:**
- Modify: `website/src/lib/components/map/sidebar/MapSidebar.svelte`
- Modify: `website/src/lib/components/map/sidebar/MapSidebarContent.svelte`
- Modify: `website/src/lib/components/map/MapTooltip.svelte`
- Modify: `website/src/lib/components/map/EntityPopup.svelte`
- Modify: `website/src/lib/queries/map-search.ts`
- Modify: `website/src/lib/components/map/MapSearch.svelte`
- Modify: `website/src/lib/components/map/SearchResultItem.svelte`
- Modify: `website/src/lib/components/MapLink.svelte`

- [ ] **Step 1: Add sidebar toggle**

In `MapSidebarContent.svelte`, import a house icon such as `Home` from lucide and add to `interactableLayers`:

```typescript
{ key: "houses", label: "Houses", color: LAYER_COLORS.house, icon: Home },
```

If `MapSidebar.svelte` quick toggles remain selective, add Houses only if it improves discoverability without overcrowding mobile controls. Otherwise leave it in the full sidebar only and record that decision.

- [ ] **Step 2: Add tooltip handling**

In `MapTooltip.svelte`, return `"House"` for `entity.type === "house"`.

- [ ] **Step 3: Add popup handling**

In `EntityPopup.svelte`, import `HouseMapEntity`, add `house` to `getEntityTypeName()`, and add a house-specific block:

```svelte
{#if entity.type === "house"}
  {@const house = entity as HouseMapEntity}
  <div class="flex justify-between border-t pt-2">
    <span class="text-muted-foreground">Base price</span>
    <span>{house.basePrice.toLocaleString()} gold</span>
  </div>
  {#if house.factionId}
    <div class="flex justify-between">
      <span class="text-muted-foreground">Faction</span>
      <span>{house.factionId}</span>
    </div>
  {/if}
  {#if house.factionRequired > 0}
    <div class="flex justify-between">
      <span class="text-muted-foreground">Faction required</span>
      <span>{house.factionRequired.toLocaleString()}</span>
    </div>
  {/if}
  <a href="/mechanics/inventory#house-chests" class="text-blue-600 hover:underline dark:text-blue-400">
    House chest storage rules
  </a>
{/if}
```

Do not add a details URL unless a dedicated house detail page exists.

- [ ] **Step 4: Add houses to map search**

In `map-search.ts`, add `"house"` to `MapSearchCategory`, `SEARCH_CATEGORY_ORDER`, and `resultsByCategory`. Add `searchHouses()`:

```typescript
interface HouseSearchRow {
  id: string;
  name: string;
  base_price: number;
  min_x: number | null;
  max_x: number | null;
  min_y: number | null;
  max_y: number | null;
  zone_id: string | null;
  zone_name: string | null;
}

async function searchHouses(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  const rows = await query<HouseSearchRow>(
    `
    SELECT
      h.id,
      h.name,
      h.base_price,
      h.position_x as min_x,
      h.position_x as max_x,
      h.position_y as min_y,
      h.position_y as max_y,
      h.zone_id,
      COALESCE(h.zone_name, z.name) as zone_name
    FROM houses_fts hf
    JOIN houses h ON hf.rowid = h.rowid
    LEFT JOIN zones z ON z.id = h.zone_id
    WHERE houses_fts MATCH ?
    ORDER BY rank
    LIMIT ?
    `,
    [ftsQuery, limit],
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: "house",
    subcategory: `${row.base_price.toLocaleString()} gold`,
    bounds:
      row.min_x !== null && row.min_y !== null
        ? {
            minX: row.min_x,
            maxX: row.max_x!,
            minY: -row.max_y!,
            maxY: -row.min_y,
          }
        : null,
    zoneId: row.zone_id ?? undefined,
    zoneName: row.zone_name ?? undefined,
  }));
}
```

Call `searchHouses(ftsQuery, limit)` in `searchMapEntities()`.

- [ ] **Step 5: Add search UI labels and icons**

In `MapSearch.svelte`, add:

```typescript
house: "Houses",
```

In `SearchResultItem.svelte`, add a `Home` icon and `house: Home` to the category icon map.

- [ ] **Step 6: Allow MapLink to house markers**

In `MapLink.svelte`, add `"house"` to the local `EntityType` union.

- [ ] **Step 7: Verify map interaction manually**

Run the dev server:

```bash
pnpm run dev
```

Manual checks:

- `/map?layers=houses,tiles` shows house markers.
- Searching a known house name returns a House result.
- Clicking a house marker opens a popup with base price and zone.
- The popup link opens `/mechanics/inventory#house-chests`.
- Map URL `?entity=<house-id>&etype=house` restores house selection.

- [ ] **Step 8: Run checks**

Run:

```bash
pnpm run check
pnpm run lint
```

Expected: Both pass.

- [ ] **Step 9: Commit map UI change**

```bash
git add website/src/lib/components/map/sidebar/MapSidebar.svelte website/src/lib/components/map/sidebar/MapSidebarContent.svelte website/src/lib/components/map/MapTooltip.svelte website/src/lib/components/map/EntityPopup.svelte website/src/lib/queries/map-search.ts website/src/lib/components/map/MapSearch.svelte website/src/lib/components/map/SearchResultItem.svelte website/src/lib/components/MapLink.svelte
git commit -m "feat(map): render searchable house markers"
```

---

## Task 6: Redesign Inventory Mechanics Data Model

**Files:**
- Modify: `website/src/routes/mechanics/inventory/+page.server.ts`

- [ ] **Step 1: Define page data types**

Add exported interfaces for house rows and chest structure rows:

```typescript
export interface HouseStorageLocation {
  id: string;
  name: string;
  base_price: number;
  faction_id: string | null;
  faction_required: number;
  zone_id: string | null;
  zone_name: string | null;
}

export interface HouseChestStructure {
  id: string;
  name: string;
  structure_price: number;
  slot_start: number;
  slot_end: number;
}
```

Extend `InventoryMechanicsPageData`:

```typescript
interface InventoryMechanicsPageData {
  backpacks: BackpackListItem[];
  houses: HouseStorageLocation[];
  houseChests: HouseChestStructure[];
}
```

- [ ] **Step 2: Query house locations**

Add:

```typescript
function getHouseLocations(db: Database.Database): HouseStorageLocation[] {
  return db
    .prepare(
      `
      SELECT
        h.id,
        h.name,
        h.base_price,
        h.faction_id,
        h.faction_required,
        h.zone_id,
        COALESCE(h.zone_name, z.name) as zone_name
      FROM houses h
      LEFT JOIN zones z ON z.id = h.zone_id
      ORDER BY h.base_price ASC, h.name ASC
      `,
    )
    .all() as HouseStorageLocation[];
}
```

- [ ] **Step 3: Query chest structures with slot sections**

Add a fixed slot mapping derived from `PlayerChest.cs` and `UIChest.cs`:

```typescript
const HOUSE_CHEST_SLOT_RANGES = new Map<string, [number, number]>([
  ["wooden_chest", [0, 29]],
  ["red_chest", [30, 59]],
  ["blue_chest", [60, 89]],
  ["stone_chest", [90, 119]],
  ["granite_chest", [120, 149]],
  ["sturdy_chest", [150, 179]],
  ["rustic_chest", [180, 209]],
  ["guardian_box", [210, 239]],
]);
```

Add source comments above the mapping:

```typescript
// Source: server-scripts/PlayerChest.cs:28-68 — chest object names map to fixed 30-slot account chest sections.
// Source: server-scripts/UIChest.cs:44-82 — UI displays the same fixed chest sections.
```

Add:

```typescript
function getHouseChests(db: Database.Database): HouseChestStructure[] {
  const rows = db
    .prepare(
      `
      SELECT id, name, structure_price
      FROM items
      WHERE item_type = 'structure'
        AND id IN (${Array.from(HOUSE_CHEST_SLOT_RANGES.keys()).map(() => "?").join(",")})
      ORDER BY structure_price ASC, name ASC
      `,
    )
    .all(...HOUSE_CHEST_SLOT_RANGES.keys()) as Array<{
      id: string;
      name: string;
      structure_price: number;
    }>;

  return rows.map((row) => {
    const [slot_start, slot_end] = HOUSE_CHEST_SLOT_RANGES.get(row.id)!;
    return { ...row, slot_start, slot_end };
  });
}
```

- [ ] **Step 4: Return new data from load**

In `load`, compute:

```typescript
const houses = getHouseLocations(db);
const houseChests = getHouseChests(db);
```

Return:

```typescript
return { backpacks, houses, houseChests };
```

- [ ] **Step 5: Run page typecheck**

Run:

```bash
pnpm run check
```

Expected: Errors are expected until the Svelte page consumes the new shape. Record current errors and proceed directly to Task 7 in the same implementation session.

Do not commit a failing intermediate state unless the repository convention permits WIP commits. Prefer committing Tasks 6 and 7 together if Task 6 alone fails typecheck.

---

## Task 7: Redesign Inventory Mechanics Page

**Files:**
- Modify: `website/src/routes/mechanics/inventory/+page.svelte`

**Target ASCII draft for implementers:**

```text
Inventory Mechanics
===================

How storage works in Ancient Kingdoms, what is shared across characters, and
which upgrades add carried, bank, or house storage.

[Storage at a Glance]
+--------------------+-----------+------------------------------+------------------------------+
| Storage            | Scope     | Capacity                     | How to expand                 |
+--------------------+-----------+------------------------------+------------------------------+
| Carry inventory    | Character | 24 base + backpack storage   | Equip backpacks               |
| Backpack slots     | Character | 9 dedicated bag slots        | Fixed                         |
| Bank item storage  | Character | 300 slots, 30 per tab        | Unlock tabs with gold         |
| House chests       | Account   | 240 slots, 8 chest sections  | Buy a house, then buy chests  |
| Banked gold        | Account   | Separate gold vault          | Fixed                         |
| Equipment          | Character | 16 equipped slots            | Fixed                         |
| Keys               | Character | Separate key storage         | Fixed                         |
+--------------------+-----------+------------------------------+------------------------------+

[Shared Across Characters]
+--------------------------------------------------------------------------+
| Shared: house chest storage, banked gold                                 |
| Not shared: carried inventory, equipped gear, bank item tabs, keys       |
|                                                                          |
| House storage requires owning a house first. Chests of the same type     |
| share one section. A second Wooden Chest is another access point, not    |
| another 30 slots.                                                        |
+--------------------------------------------------------------------------+

[Capacity Summary]
+-------------------------------+---------+--------------------------------+
| Thing                         | Number  | Notes                          |
+-------------------------------+---------+--------------------------------+
| Base carried slots            | 24      | Always available               |
| Dedicated backpack slots      | 9       | Hold backpacks only            |
| Backpack extension cap        | 121     | Engine cap                     |
| Current best known bag total  | dynamic | Best 9 unique known bags       |
| Current practical carry max   | dynamic | 24 + current best known bags   |
| Engine carry max              | 145     | 24 + 121                       |
| Bank item slots               | 300     | 10 tabs of 30                  |
| House chest slots             | 240     | 8 account-wide sections        |
+-------------------------------+---------+--------------------------------+

[Storage Costs]
+-----------------------+-------------+-------------------------------+
| Upgrade               | Cost        | Result                        |
+-----------------------+-------------+-------------------------------+
| Bank tab 2            | 1,000       | 30 more character bank slots  |
| All bank tabs         | 1,016,000   | 300 character bank slots      |
| House                 | Varies      | Required for house chests     |
| Wooden Chest          | 5,000       | First 30 account chest slots  |
| All house chest types | 440,000     | 240 account chest slots       |
+-----------------------+-------------+-------------------------------+

Sections
--------
1. Storage Overview
2. Backpacks
3. Bank Tabs and Gold
4. House Chests and Shared Storage
5. Item Movement and Stacks
6. Loot Pickup
7. Equipment, Death, and Remains

Backpacks
---------
Rules:
- Backpack slots accept backpacks only.
- Duplicate backpack names cannot be equipped.
- Removing or downgrading a bag is blocked when items would be locked away.
- Equipped backpacks cannot move directly to bank or house storage.

Where to get bags
+----------------------+-------+----------------------+----------------------+
| Bag                  | Slots | Earliest known level | Known sources        |
+----------------------+-------+----------------------+----------------------+
| Adventurer Satchel   | 4     | dynamic              | linked sources       |
| Mystic Bag           | 14    | dynamic              | linked sources       |
+----------------------+-------+----------------------+----------------------+

Bank Tabs and Gold
------------------
Bank item storage is character-specific. Banked gold is account-wide.

+---------------+-----------+-------------+
| Unlocking tab | Gold cost | Total slots |
+---------------+-----------+-------------+
| 1             | Free      | 30          |
| 2             | 1,000     | 60          |
| ...           | ...       | ...         |
| 10            | 500,000   | 300         |
+---------------+-----------+-------------+

House Chests and Shared Storage
-------------------------------
You need to own a house before you can use house chests.

House locations
+----------------------+---------------+------------+-------------+------+
| House                | Zone          | Base price | Requirement | Map  |
+----------------------+---------------+------------+-------------+------+
| dynamic              | dynamic       | dynamic    | dynamic     | Map  |
+----------------------+---------------+------------+-------------+------+

Chest sections
+---------------+---------+----------+----------------+
| Chest         | Slots   | Cost     | Item           |
+---------------+---------+----------+----------------+
| Wooden Chest  | 0-29    | 5,000    | linked item    |
| Red Chest     | 30-59   | 20,000   | linked item    |
| Blue Chest    | 60-89   | 10,000   | linked item    |
| Stone Chest   | 90-119  | 50,000   | linked item    |
| Granite Chest | 120-149 | 80,000   | linked item    |
| Sturdy Chest  | 150-179 | 85,000   | linked item    |
| Rustic Chest  | 180-209 | 90,000   | linked item    |
| Guardian Box  | 210-239 | 100,000  | linked item    |
+---------------+---------+----------+----------------+

Remaining sections use compact rule lists, not long paragraphs:
- Item Movement and Stacks
- Loot Pickup
- Equipment, Death, and Remains
```


- [ ] **Step 1: Add imports and derived totals**

Import `MapLink` if using compact map links:

```typescript
import MapLink from "$lib/components/MapLink.svelte";
```

Compute totals in script:

```typescript
const BANK_TAB_COSTS = [0, 1000, 5000, 10000, 25000, 50000, 75000, 100000, 250000, 500000];
const BANK_TOTAL_COST = BANK_TAB_COSTS.reduce((sum, cost) => sum + cost, 0);
const HOUSE_CHEST_TOTAL_COST = $derived(
  data.houseChests.reduce((sum, chest) => sum + chest.structure_price, 0),
);
const BEST_CURRENT_BACKPACK_SLOTS = $derived(
  data.backpacks
    .map((backpack) => backpack.backpack_slots)
    .sort((a, b) => b - a)
    .slice(0, 9)
    .reduce((sum, slots) => sum + slots, 0),
);
```

If Svelte rejects `$derived` in this form, use the existing project pattern for derived values and update this plan.

- [ ] **Step 2: Replace the introductory block with a descriptive overview**

The top of the page should answer:

- What storage exists?
- What is shared?
- How much space is available?
- What costs gold?

Use this content structure:

```svelte
<Card.Root id="overview" class="bg-muted/30">
  <Card.Header>
    <Card.Title>Storage at a Glance</Card.Title>
    <Card.Description>
      Where items and gold are stored, and whether that storage belongs to one character or the account.
    </Card.Description>
  </Card.Header>
  <Card.Content class="space-y-5">
    <!-- overview table here -->
  </Card.Content>
</Card.Root>
```

Use these rows:

| Storage | Scope | Capacity | How to expand |
| --- | --- | --- | --- |
| Carry inventory | Character | 24 base + backpack storage | Equip backpacks |
| Backpack slots | Character | 9 dedicated bag slots | Fixed |
| Bank item storage | Character | 300 slots, 30 per tab | Unlock bank tabs with gold |
| House chests | Account | 240 slots, 8 chest sections | Buy a house, then buy chests |
| Banked gold | Account | Separate gold vault | Fixed |
| Equipment | Character | 16 equipped slots | Fixed |
| Keys | Character | Separate key storage | Fixed |

- [ ] **Step 3: Add shared-storage callout**

Add a callout near the overview:

```text
Shared across characters: house chest storage and banked gold.
Character-specific: carried inventory, equipped gear, bank item slots, and keys.
```

Use source comments:

```svelte
<!-- Source: server-scripts/Database.cs:909-919 — bank item rows load by character. -->
<!-- Source: server-scripts/Database.cs:936-946 — house chest rows load by account. -->
<!-- Source: server-scripts/Database.cs:615-628 — banked gold is stored on the account. -->
```

- [ ] **Step 4: Add capacity summary**

Add table:

| Thing | Number | Notes |
| --- | ---: | --- |
| Base carried slots | 24 | Always available |
| Dedicated backpack slots | 9 | Hold backpacks only |
| Backpack extension cap | 121 | Engine cap |
| Current best known bag total | `{BEST_CURRENT_BACKPACK_SLOTS}` | Best 9 unique known bags |
| Current practical carry max | `{24 + BEST_CURRENT_BACKPACK_SLOTS}` | Base slots plus current best bags |
| Engine carry max | 145 | 24 + 121 |
| Bank item slots | 300 | 10 tabs of 30 |
| House chest slots | 240 | 8 account-wide sections |

Use source comments for constants from `PlayerInventory.cs`, `PlayerBank.cs`, `PlayerChest.cs`, and `NetworkManagerMMO.cs`.

- [ ] **Step 5: Add storage cost summary**

Add table:

| Upgrade | Cost | Result |
| --- | ---: | --- |
| Bank tab 2 | 1,000 | 30 more character bank slots |
| All bank tabs | `{BANK_TOTAL_COST}` | 300 character bank slots |
| House | Varies by property | Required for house chests |
| Wooden Chest | 5,000 | First 30 account chest slots |
| All house chest types | `{HOUSE_CHEST_TOTAL_COST}` | 240 account chest slots |

Keep it descriptive. Do not add “what to buy first” guidance.

- [ ] **Step 6: Update Backpacks section**

Keep the bag table but rename `Source lvl` to `Earliest known level`. Add a brief explanatory note:

```text
Earliest known level is an obtainability hint. It is not always a character level requirement.
```

Keep bag item links and source links.

- [ ] **Step 7: Update Bank section**

Change the description to:

```text
Character-specific item storage and account-wide banked gold.
```

Add tab 1 as free in the table if the table is meant to show total progression. Otherwise keep “unlocking tab” rows 2-10 and put “New characters start with tab 1 unlocked” above it.

Remove semicolons from running text.

- [ ] **Step 8: Update House Chests section**

Rename section title to:

```text
House Chests and Shared Storage
```

Add requirement text:

```text
You need to own a house before you can use house chests. Each chest type opens one fixed account-wide storage section. A second chest of the same type gives another access point to that section, not another 30 slots.
```

Use source comments:

```svelte
<!-- Source: server-scripts/Housing.cs:33-49 — entering an unowned house area opens the house purchase flow. -->
<!-- Source: server-scripts/ChestHouse.cs:81-84 and 173-176 — only the owning account can open house chest UI. -->
<!-- Source: server-scripts/StrucItemUi.cs:33-36 — purchase warning says same-color chests share storage. -->
```

Add house locations table:

| House | Zone | Base price | Requirement | Map |
| --- | --- | ---: | --- | --- |

Use `MapLink`:

```svelte
<MapLink entityId={house.id} entityType="house" compact />
```

Add chest structure table:

| Chest | Slots | Cost | Item |
| --- | --- | ---: | --- |

Use `/items/{chest.id}` for chest structure item links.

- [ ] **Step 9: Tighten movement, loot, and death sections**

Keep these sections, but shorten prose and remove all semicolons from visible running text. Prefer bullets over paragraphs for rules.

Required visible facts to preserve:

- Inventory actions work while idle, moving, or casting.
- New items try base carried slots first, then unlocked backpack slots.
- Matching stacks merge up to the target stack limit.
- Shift-drag splits half a stack into an empty target slot.
- Non-destroyable items cannot be deleted.
- Loot pickup requires 2.4-unit range.
- Gold goes directly to carried gold.
- Nearby party members split gold pickups.
- Keys go to key storage.
- Quest-only gather drops can update quest progress without using a slot.
- Loot containers expire after 120 seconds.
- Valuable eligible group loot uses group roll flow.
- Equipped gear uses 16 slots.
- Equipment starts with 10 durability.
- Death reduces equipped item durability by 1.
- Player remains last 900 seconds.

- [ ] **Step 10: Search for visible semicolon prose**

Run:

```bash
python - <<'PY'
from pathlib import Path
p=Path('website/src/routes/mechanics/inventory/+page.svelte')
for i,line in enumerate(p.read_text().splitlines(),1):
    if ';' in line and not line.strip().startswith(('import ', 'const ', 'let ', 'return ', 'function ', '</script>', '<script')):
        print(i, line)
PY
```

Expected: Any remaining semicolons are in TypeScript, HTML entities, or invisible source comments. No semicolons remain in visible running prose.

- [ ] **Step 11: Run checks**

Run:

```bash
pnpm run check
pnpm run lint
```

Expected: Both pass.

- [ ] **Step 12: Commit inventory page redesign**

```bash
git add website/src/routes/mechanics/inventory/+page.server.ts website/src/routes/mechanics/inventory/+page.svelte
git commit -m "feat(inventory): add storage overview and housing costs"
```

---

## Task 8: Add Discoverability Links

**Files:**
- Create: `website/src/routes/mechanics/+page.svelte`
- Modify: `website/src/routes/+page.svelte`
- Modify: `website/src/routes/items/[id]/+page.svelte`
- Modify: `website/src/routes/mechanics/experience/+page.svelte`
- Modify: `website/src/routes/mechanics/combat/+page.svelte`

- [ ] **Step 1: Create mechanics index page**

Create `website/src/routes/mechanics/+page.svelte` with cards for:

- Inventory: `/mechanics/inventory`
- Experience: `/mechanics/experience`
- Combat: `/mechanics/combat`

Use existing `Seo`, `Breadcrumb`, and `Card` patterns from current mechanics pages.

- [ ] **Step 2: Link homepage to mechanics index**

Add a Mechanics card or compact section to `website/src/routes/+page.svelte`. Keep it discoverable without displacing primary database sections.

Recommended card text:

```text
Mechanics
Storage, combat, XP, and other rules explained from game data
```

- [ ] **Step 3: Add contextual links on item pages**

In `website/src/routes/items/[id]/+page.svelte`:

- If `data.item.item_type === "backpack"`, link to `/mechanics/inventory#backpacks`.
- If `data.item.item_type === "structure"` and the id is one of the house chest ids, link to `/mechanics/inventory#house-chests`.
- For structure chest items, add a `MapLink` only if the item page has enough context to point to the house marker. Because chest structure items are not themselves house locations, do not link them directly to a house marker.

- [ ] **Step 4: Add cross-links between mechanics pages**

In `website/src/routes/mechanics/experience/+page.svelte`, link the Death XP section's corpse/remains recovery text to `/mechanics/inventory#equipment-and-death`.

In `website/src/routes/mechanics/combat/+page.svelte`, link the Weapon On-Hit Procs durability text to `/mechanics/inventory#equipment-and-death`.

Do not add links just to increase link count.

- [ ] **Step 5: Run checks**

Run:

```bash
pnpm run check
pnpm run lint
```

Expected: Both pass.

- [ ] **Step 6: Commit discoverability changes**

```bash
git add website/src/routes/mechanics/+page.svelte website/src/routes/+page.svelte website/src/routes/items/[id]/+page.svelte website/src/routes/mechanics/experience/+page.svelte website/src/routes/mechanics/combat/+page.svelte
git commit -m "feat(site): improve mechanics discoverability"
```


---

## Task 9: Final Verification and Review

**Files:**
- Review all modified files from prior tasks.

- [ ] **Step 1: Rebuild or provide fixture data**

If a fresh game export is available, run the normal export and build pipeline. If not, add a temporary local `houses.json` only for verification and do not commit it unless it belongs in fixtures.

Preferred verification:

```bash
cd build-pipeline && uv run compendium build
```

Expected: `website/static/compendium.db` contains `houses` rows.

- [ ] **Step 2: Query database facts**

Run read queries through the SQLite read tool or equivalent approved tool:

```sql
SELECT COUNT(*) FROM houses;
SELECT id, name, base_price, zone_name FROM houses ORDER BY base_price, name;
SELECT COUNT(*) FROM houses_fts WHERE houses_fts MATCH 'house';
SELECT COUNT(*) FROM item_source_entries;
SELECT item_id, source_type, source_name, source_level FROM item_source_entries WHERE item_id IN ('mystic_bag', 'sapphire_skyring') ORDER BY item_id, source_level;
```

Expected: Houses exist, prices are populated, house search returns rows, and canonical item source entries exist with non-null levels where source levels are known.

- [ ] **Step 3: Website verification**

Run:

```bash
pnpm run check
pnpm run lint
pnpm run build
```

Expected: All pass.

- [ ] **Step 4: Browser QA**

With dev server running:

```bash
pnpm run dev
```

Manual checks:

- `/mechanics` links to Inventory, Experience, and Combat.
- `/mechanics/inventory` starts with storage overview and shared-storage facts.
- `/mechanics/inventory` shows house prices and locations when house data exists.
- `/mechanics/inventory` has no visible semicolon-heavy running prose.
- `/map?layers=houses,tiles` shows houses.
- House map popup shows base price and mechanics link.
- Map search finds house names.
- Backpack item page links to inventory mechanics.
- House chest item pages link to inventory mechanics.

- [ ] **Step 5: Review source-level consolidation status**

Confirm inventory and class detail no longer maintain separate item-source UNION queries for source-level display. Both should use `website/src/lib/server/item-source-summary.ts`, which reads canonical `item_source_entries` rows from the database.

- [ ] **Step 6: Final commit if needed**

If verification fixes required changes:

```bash
git add <changed-files>
git commit -m "fix: stabilize inventory housing map integration"
```

- [ ] **Step 7: Final status capture**

Run:

```bash
git status --short
```

Expected: Clean except intentionally untracked local artifacts or plan files.

---

## Atomic Commit Sequence

1. `docs: plan inventory housing map redesign`
   - Plan only, if plan files are being committed.
2. `feat(data-export): export house purchase locations`
   - C# DataExporter model, exporter, and registration.
3. `feat(pipeline): load house purchase data`
   - House schema, Python model, loader, build command wiring, and loader tests.
4. `feat(pipeline): denormalize item source entries`
   - Canonical item source summaries and source-level tests.
5. `refactor(site): share item source summaries`
   - Shared website accessor used by class detail and inventory mechanics.
6. `feat(map): add house marker data model`
   - Type-level and data-layer map plumbing.
7. `feat(map): render searchable house markers`
   - Sidebar toggle, layer rendering, tooltip, popup, map search, selection UI.
8. `feat(inventory): add storage overview and housing costs`
   - Inventory server data and page redesign.
9. `feat(site): improve mechanics discoverability`
   - Mechanics index, homepage card, and contextual item/mechanics links.
10. `fix: stabilize inventory housing map integration`
   - Only if final verification finds integration fixes.

## Settled Implementation Decisions

- House marker layer should not be visible by default. Keep default map layers minimal.
- House purchase prices should be labeled “Base price” because game display applies player-specific purchase modifiers.
- House resale values from `HousingManager.sellPricesHouses` should not be shown on this page.
- `/mechanics/inventory` should not include “what to buy first” guidance. Mechanics pages should be descriptive, not prescriptive.
- Source-level consolidation is included in this plan. It means canonicalizing item obtainability source summaries in the build pipeline and sharing one website accessor so inventory and class detail do not drift.
