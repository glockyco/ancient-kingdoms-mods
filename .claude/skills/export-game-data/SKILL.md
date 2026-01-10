---
name: export-game-data
description: Core principles for exporting authoritative game data
---

## Core Principle

**ONLY export authoritative data from game object fields.**

This is the foundational rule for all data export. Violations lead to incorrect data that's hard to debug and fix.

## What is Authoritative Data?

Data that comes directly from the game's data structures:
- Field values on game objects
- IL2CPP type information
- Explicit relationships in game data

## Rules

### DO Export

- Direct field values: `monster.level`, `item.name`
- IL2CPP type checks: `obj.TryCast<ItemMount>()` to detect type
- Explicit references: `quest.targetMonsterId`
- Calculated from authoritative data: bounding boxes from positions

### DO NOT Export

- Guesses based on naming: "ends with _boss so must be a boss"
- Heuristics: "high damage so probably elite"
- Inferences from context: "found near dungeon entrance so dungeon monster"
- Assumed relationships not in game data

## When Data is Missing

Use `"unknown"` or `null` for missing/unavailable data:

```csharp
zone_id = GetZoneIdFromByte(obj.idZone) ?? "unknown";
description = obj.description ?? null;  // Don't make one up
```

## Acceptable Derivations

Some derivations are necessary when authoritative fields don't exist:

### IL2CPP Type Checking

```csharp
// This IS authoritative - checking actual runtime type
if (obj.TryCast<Il2Cpp.ItemMount>() != null)
{
    data.is_mount = true;
}
```

### Spatial Algorithms

When no authoritative field exists for location:

```csharp
// Zone detection from position - document this
zone_id = GetZoneIdFromPosition(transform.position);
// Note: Uses collider containment, not authoritative field
```

### Calculations from Authoritative Data

```csharp
// Bounding box from actual positions - this is valid
var bounds = CalculateBoundsFromPositions(spawnPositions);
```

## Documentation Requirement

Any non-authoritative derivation MUST be documented:

```csharp
/// <summary>
/// Zone determined by spatial containment check, not from authoritative field.
/// Falls back to nearest zone if position is outside all zone boundaries.
/// </summary>
protected static string GetZoneIdFromPosition(Vector3 position)
```

## Key Files

- `docs/data-export-guide.md` - Official guide
- `mods/DataExporter/CLAUDE.md` - Exporter documentation
- `mods/DataExporter/Exporters/BaseExporter.cs` - Shared utilities

## Examples

### Good: Authoritative

```csharp
data.level = monster.level.current;  // Direct field
data.is_boss = monster.isBoss;       // Direct field
data.zone_id = GetZoneIdFromByte(monster.idZone);  // From authoritative byte
```

### Bad: Heuristic

```csharp
// DON'T DO THIS
data.is_boss = monster.name.Contains("Boss");  // Name-based guess
data.is_elite = monster.health > 10000;        // Arbitrary threshold
data.zone_id = "dungeon";  // Assumed from context
```

## Why This Matters

1. **Accuracy**: Game data is the source of truth
2. **Debuggability**: When data is wrong, you know where to look
3. **Maintainability**: Game updates won't break heuristics that never existed
4. **Trust**: Users can rely on the exported data being correct
