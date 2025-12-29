# DataExporter

Exports game data to JSON files for the build pipeline.

## Usage

Press **Shift+F9** in-game to export all data. Files are written to `exported-data/` (configurable in `Local.props`).

## Exported Data (22 exporters)

| Category | Files |
|----------|-------|
| Core | monsters, npcs, items, quests, skills |
| World | portals, zone_info, zone_triggers, gather_items |
| Crafting | crafting_recipes, crafting_stations, alchemy_recipes, alchemy_tables |
| Special | summon_triggers, luck_tokens, altars, treasure_locations, pets, professions |
| Objects | traps, doors, interactive_objects |

## Architecture

```
Exporters/           # One exporter per data type
├── BaseExporter.cs  # Shared JSON writing logic
├── MonsterExporter.cs
└── ...
Models/              # JSON-serializable POCOs
```

Data flow: `Resources.FindObjectsOfTypeAll<T>()` → Exporter → Model → JSON file

## Data Export Principles

When exporting game data, follow docs/data-export-guide.md.

Key rules:
- **ONLY** export authoritative data from game object fields
- NO guesses, heuristics, or name-based inferences
- Use `"unknown"` for missing/unavailable data

## Gotchas

**Scene filtering:** `Resources.FindObjectsOfTypeAll()` returns prefabs and assets too. Filter with:
```csharp
if (obj.gameObject == null || !obj.gameObject.scene.IsValid())
    continue; // Skip prefabs/assets
```

**Item specializations:** Use `TryCast<>()` to detect mount/food/book/scroll types and populate applicable fields.

**Zone detection:** Use authoritative `idZone` byte fields that map to `ZoneInfo.zones` dictionary.

## Adding New Exporters

1. Create model in `Models/MyData.cs`
2. Create exporter in `Exporters/MyExporter.cs` extending `BaseExporter`
3. Register in `DataExporter.cs` within `ExportAllData()`
