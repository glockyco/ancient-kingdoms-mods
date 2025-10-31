# DataExporter Mod

Exports Ancient Kingdoms game data to JSON files for external use (wikis, tools, databases).

## Usage

Press `Shift+F9` in-game to trigger a complete data export. Files are written to the configured export path (default: `exported-data/` in project root).

## Exported Data

The mod exports the following game data:

- **monsters.json** - Monster spawns (name, level, stats, drops, zones, respawn times, positions)
- **npcs.json** - NPCs (name, location, roles: merchant/quest giver/banker, items sold, quests offered)
- **items.json** - Items (stats, requirements, prices, quality, mount speed, food buffs, book stat gains, monster scroll spawns)
- **quests.json** - Quests (requirements, rewards, quest chains, location objectives)
- **skills.json** - Skills (costs, cooldowns, requirements, prerequisites)
- **buffs.json** - Buffs/debuffs (duration, category, effect flags)
- **portals.json** - Portal locations and destinations
- **zone_info.json** - Zone metadata (level requirements, weather, descriptions)
- **zone_triggers.json** - Zone boundaries and environmental settings
- **gather_items.json** - Gathering nodes (type flags, tool requirements, random drops, positions)
- **crafting_recipes.json** - Crafting recipes (materials, results, station types)

## Architecture

### Data Flow

```
ScriptableObject (game data)
    ↓
Resources.FindObjectsOfTypeAll<T>()
    ↓
Exporter (transforms to model)
    ↓
Model (JSON-serializable POCO)
    ↓
JSON file (written to disk)
```

### Components

**DataExporter.cs** - Main mod class
- Registers `Shift+F9` hotkey
- Orchestrates all exporters
- Handles logging and error reporting

**Exporters/** - Individual data exporters
- `BaseExporter.cs` - Shared JSON writing logic
- `MonsterExporter.cs` - Monster spawn data
- `NpcExporter.cs` - NPC data
- `ItemExporter.cs` - Item definitions including mount/food/book/scroll specializations
- `QuestExporter.cs` - Quest data including location objectives
- `SkillExporter.cs` - Skill definitions
- `BuffExporter.cs` - Buff/debuff effects
- `PortalExporter.cs` - Portal locations with automatic destination zone detection
- `ZoneInfoExporter.cs` - Zone metadata from ZoneInfo.zones
- `ZoneTriggerExporter.cs` - Zone boundary triggers
- `GatherItemExporter.cs` - Gathering nodes with type flags and tool requirements
- `CraftingRecipeExporter.cs` - Crafting recipes

**Models/** - Data transfer objects
- Plain C# classes with JSON-serializable properties
- One model per exported data type

## Data Export Principles

### Authoritative Data Only

**ONLY export data that comes from authoritative game object fields.** No guesses, heuristics, or name-based inferences.

**Use `"unknown"` for missing data** instead of making assumptions.

### Acceptable Derivations

1. **IL2CPP Type Checking** - Using `TryCast` or `GetIl2CppType()` to determine subclass types
   ```csharp
   var equipItem = item.TryCast<Il2Cpp.EquipmentItem>();
   if (equipItem != null) { /* Use equipment-specific fields */ }
   ```

2. **Spatial Algorithms** - When no authoritative field exists (e.g., portal destination zones)
   ```csharp
   // Find nearest zone trigger to portal destination
   var nearestTrigger = FindNearest(portal.destination.position, zoneTriggers);
   ```

3. **Calculations** - Derived from authoritative data (e.g., bounding boxes from positions)

### Scene Filtering

`Resources.FindObjectsOfTypeAll()` returns ALL objects including prefabs and ScriptableObject assets. Filter for scene objects only:

```csharp
if (obj.gameObject == null || !obj.gameObject.scene.IsValid())
{
    continue; // Skip prefabs/assets
}
```

Do NOT filter by `activeInHierarchy` - disabled scene objects should be included.

### Item Specializations

ItemData uses flat structure with nullable fields for type-specific data:

```csharp
// Mount items
public float? mount_speed { get; set; }

// Food items
public string food_buff_id { get; set; }
public string food_type { get; set; }
public int? food_buff_level { get; set; }

// Book items (stat tomes)
public int? book_strength_gain { get; set; }
// ... other stats

// Monster scroll items
public List<SpawnedMonster> spawned_monsters { get; set; }
```

Detect type via `TryCast<>()` and populate applicable fields only.

### Zone Detection

All zone mappings use authoritative `idZone` byte fields that map to `ZoneInfo.zones` dictionary:

```csharp
private string GetZoneId(int idZone)
{
    if (Il2Cpp.ZoneInfo.zones != null && Il2Cpp.ZoneInfo.zones.ContainsKey((byte)idZone))
    {
        var zone = Il2Cpp.ZoneInfo.zones[(byte)idZone];
        if (zone != null && !string.IsNullOrEmpty(zone.name))
        {
            return zone.name.ToLowerInvariant().Replace(" ", "_");
        }
    }
    return "unknown";
}
```

### Skills vs Buffs

BuffSkill inherits from ScriptableSkill (via BonusSkill), so buffs appear in both exports:
- **skills.json** - All skills including buffs with general skill data
- **buffs.json** - Only buff skills with buff-specific data (duration, debuff flags)

Consumers can join by ID. Separate exports avoid bloating ItemData with 15+ buff-specific fields.

### What We Don't Export

- **Skill class associations** - Skills are organized by class in Unity project folders (`Resources/skills/cleric/`, etc.), but this is editor-time organization. At runtime, `Resources.FindObjectsOfTypeAll` doesn't preserve folder paths, and ScriptableSkill has no class field.

- **Crafting station types** - Only `isCookingOven` boolean is authoritative. Skill indices exist but aren't connected to CraftingStation/CraftingItems classes (IL2CPP stubs).

## Configuration

Export path is configured in `Local.props`:

```xml
<DATA_EXPORT_PATH>E:\Projects\ancient-kingdoms-data-mining\exported-data</DATA_EXPORT_PATH>
```

The path is injected at build time via MSBuild target that generates `ExportConfig.g.cs`.

## IL2CPP Interop

Ancient Kingdoms uses IL2CPP, requiring special handling:

```csharp
// Find all objects of a type
var type = Il2CppType.Of<Il2Cpp.Monster>();
var objects = Resources.FindObjectsOfTypeAll(type);

// Cast to specific type
var monster = obj.TryCast<Il2Cpp.Monster>();

// Check subclass type
var typeName = quest.GetIl2CppType().Name;
```

## Adding New Exporters

1. Create model in `Models/` directory:
   ```csharp
   public class MyData
   {
       public string id { get; set; }
       public string name { get; set; }
   }
   ```

2. Create exporter in `Exporters/` directory:
   ```csharp
   public class MyExporter : BaseExporter
   {
       public override void Export()
       {
           var type = Il2CppType.Of<Il2Cpp.MyType>();
           var objects = Resources.FindObjectsOfTypeAll(type);
           // ... transform and export
           WriteJson(dataList, "my_data.json");
       }
   }
   ```

3. Register in `DataExporter.cs`:
   ```csharp
   var myExporter = new MyExporter(LoggerInstance, ExportPath);
   myExporter.Export();
   ```

## Known Limitations

- **Portal destination zones** use nearest zone trigger algorithm (100% accurate in testing, but spatial heuristic)
- **Crafting station types** can only distinguish cooking ovens via `isCookingOven` boolean; other station types (alchemy, smithing) return "unknown"
