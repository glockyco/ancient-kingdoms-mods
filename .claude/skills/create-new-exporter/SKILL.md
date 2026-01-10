---
name: create-new-exporter
description: Create a DataExporter for exporting game data to JSON
---

## Overview

DataExporter mods extract data from the game's IL2CPP runtime and write JSON files for the build pipeline. Each exporter handles one data type.

## Steps

1. **Create model** in `mods/DataExporter/Models/MyData.cs`
2. **Create exporter** in `mods/DataExporter/Exporters/MyExporter.cs`
3. **Register** in `mods/DataExporter/DataExporter.cs` within `ExportAllData()`
4. **Build** (Windows): `dotnet run --project build-tool all`

## Model Template

```csharp
namespace DataExporter.Models;

public class MyData
{
    // Identity
    public string id { get; set; }
    public string name { get; set; }
    
    // Properties (use snake_case for JSON)
    public int level { get; set; }
    public string zone_id { get; set; }
    
    // Optional fields (nullable)
    public string? description { get; set; }
    
    // Lists
    public List<string> tags { get; set; } = new();
}
```

## Exporter Template

```csharp
using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class MyExporter : BaseExporter
{
    public MyExporter(MelonLogger.Instance logger, string exportPath) 
        : base(logger, exportPath) { }

    public override void Export()
    {
        Logger.Msg("Exporting my data...");
        
        var type = Il2CppType.Of<Il2Cpp.MyGameType>();
        var objects = Resources.FindObjectsOfTypeAll(type);
        
        Logger.Msg($"Found {objects.Length} objects");
        
        var dataList = new List<MyData>();
        
        foreach (var obj in objects)
        {
            var typed = obj.TryCast<Il2Cpp.MyGameType>();
            if (typed == null) continue;
            
            // Skip prefabs/templates - only export scene instances
            if (typed.gameObject == null || !typed.gameObject.scene.IsValid())
                continue;
            
            var data = new MyData
            {
                id = SanitizeId(typed.name),
                name = typed.name,
                level = typed.level,
                zone_id = GetZoneIdFromPosition(typed.transform.position),
            };
            
            dataList.Add(data);
        }
        
        WriteJson(dataList, "my_data.json");
    }
}
```

## Registration

In `DataExporter.cs`:

```csharp
private void ExportAllData()
{
    // ... existing exporters
    new MyExporter(LoggerInstance, _exportPath).Export();
}
```

## Key Base Class Methods

```csharp
// Sanitize name to URL-safe ID
protected static string SanitizeId(string input)

// Write data to JSON file
protected void WriteJson<T>(T data, string filename)

// Get zone from world position
protected static string GetZoneIdFromPosition(Vector3 position)
protected static ZoneInfo GetZoneInfoFromPosition(Vector3 position)  // Returns zone + sub-zone

// Get zone ID from byte field
protected static string GetZoneIdFromByte(byte zoneId)
```

## Data Export Principles

**CRITICAL**: Only export authoritative data from game object fields.

- NO guesses or heuristics
- NO name-based inferences
- Use `"unknown"` for missing/unavailable data
- Document any non-authoritative derivations

## Key Files

- `mods/DataExporter/Exporters/BaseExporter.cs` - Base class with utilities
- `mods/DataExporter/Exporters/MonsterExporter.cs` - Full example
- `mods/DataExporter/Exporters/ItemExporter.cs` - Complex example with specializations
- `mods/DataExporter/Models/` - All model definitions
- `docs/data-export-guide.md` - Core principles

## Gotchas

- `Resources.FindObjectsOfTypeAll()` returns prefabs AND scene instances
- Always filter with `gameObject.scene.IsValid()` for scene instances
- Use `TryCast<>()` for safe IL2CPP type conversions
- Zone detection uses spatial algorithms - document if using non-authoritative data
- Snake_case for JSON field names (C# properties)
