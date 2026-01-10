---
name: add-map-entity-layer
description: Add a new entity type layer to the interactive map
---

## Overview

The interactive map uses deck.gl to render game entities. Adding a new entity type requires updates across types, queries, layer config, and UI components.

## Steps

### 1. Add Types (`website/src/lib/types/map.ts`)

```typescript
// Add to EntityType union
export type EntityType = "monster" | "npc" | ... | "new_entity";

// Create interface extending MapEntity
export interface NewEntityMapData extends MapEntity {
  type: "new_entity";
  entity_id: string;  // ID for linking to detail page
  name: string;
  // Add entity-specific fields
}

// Add to AnyMapEntity union
export type AnyMapEntity = MonsterMapEntity | NpcMapEntity | ... | NewEntityMapData;

// Add toggle to LayerVisibility
export interface LayerVisibility {
  monsters: boolean;
  npcs: boolean;
  // ...
  new_entities: boolean;
}
```

### 2. Add Query (`website/src/lib/queries/map.server.ts`)

```typescript
export function loadNewEntitiesServer(db: Database.Database): NewEntityMapData[] {
  return db.prepare(`
    SELECT
      ns.id,
      'new_entity' as type,
      n.id as entity_id,
      n.name,
      ns.position_x,
      -ns.position_y as position_y,  -- CRITICAL: Negate Y!
      ns.zone_id
    FROM new_entity_spawns ns
    JOIN new_entities n ON n.id = ns.entity_id
    WHERE ns.position_x IS NOT NULL
  `).all() as NewEntityMapData[];
}
```

### 3. Add to `loadAllMapEntities()`

```typescript
export function loadAllMapEntities(db: Database.Database): MapEntityData {
  const [monsters, npcs, ..., newEntities] = [
    loadMonstersServer(db),
    loadNpcsServer(db),
    // ...
    loadNewEntitiesServer(db),
  ];

  return {
    monsters,
    npcs,
    // ...
    newEntities,
  };
}
```

### 4. Update `MapEntityData` Interface

In `website/src/lib/types/map.ts`:

```typescript
export interface MapEntityData {
  monsters: MonsterMapEntity[];
  npcs: NpcMapEntity[];
  // ...
  newEntities: NewEntityMapData[];
}
```

### 5. Add Layer Config (`website/src/lib/map/config.ts`)

```typescript
export const LAYER_COLORS = {
  // ...existing
  new_entity: [100, 200, 150] as [number, number, number],  // RGB
};

export const LAYER_RADII = {
  // ...existing
  new_entity: 4,  // Scatterplot radius
};

export const ICON_SIZES = {
  // ...existing
  new_entity: 24,  // Icon size if using IconLayer
};
```

### 6. Update `createFilteredData()` (`website/src/lib/map/layers.ts`)

```typescript
export function createFilteredData(data: MapEntityData): FilteredMapData {
  // ...existing filters
  const renderableNewEntities = data.newEntities.filter(
    (e) => e.position !== null
  );
  
  return {
    // ...existing
    newEntities: renderableNewEntities,
  };
}
```

### 7. Add Layer in `createLayers()`

The map uses a `createEntityLayer<T>()` helper pattern. Add your layer:

```typescript
// In createLayers() function
layers.push(
  createEntityLayer<NewEntityMapData>({
    id: "new-entities",
    data: filteredData.newEntities,
    visible: visibility.new_entities,
    color: LAYER_COLORS.new_entity,
    radius: LAYER_RADII.new_entity,
    // ... other props
  })
);
```

### 8. Add Toggle to Map Page

In `website/src/routes/map/+page.svelte`, add to the layer visibility state and toggle UI.

## Coordinate System

**CRITICAL**: The Y coordinate must be negated in ALL queries!

```sql
-ns.position_y as position_y
```

Without negation, the map appears vertically mirrored. The game uses Y-up, deck.gl uses Y-down.

## Key Files

- `website/src/lib/map/CLAUDE.md` - Full documentation
- `website/src/lib/types/map.ts` - Type definitions
- `website/src/lib/queries/map.server.ts` - Server-side queries
- `website/src/lib/map/config.ts` - Colors, radii, icon sizes
- `website/src/lib/map/layers.ts` - Layer creation
- `website/src/routes/map/+page.svelte` - Map page with toggles

## Performance Notes

- Pre-filter data in `createFilteredData()`, not in `createLayers()`
- Use `visible` prop instead of conditional layer creation
- Use `updateTriggers` for dynamic properties that change
- Never compute data inside `createLayers()` - it runs on every state change
- Use `$derived` in page component, pass pre-computed arrays to `createLayers()`

## Gotchas

- **Entity ID vs Spawn ID**: Use entity ID (`entity_id`) for links, not spawn table `id`
- **Layer order**: Later layers render on top
- **Position filtering**: Only render entities with non-null positions
- **Y negation**: Always negate Y in SQL queries
