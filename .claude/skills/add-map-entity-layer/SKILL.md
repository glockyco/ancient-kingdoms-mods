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
  newEntities: boolean;
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
      ns.position_y,
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
  new_entity: { base: 24, min: 20, max: 48 },  // Icon size if using IconLayer
};

export const ENTITY_BORDER_COLORS = {
  // ...existing
  new_entity: "border-l-emerald-500",
};
```

Also add an icon entry to `ENTITY_ICONS` in `website/src/lib/map/icons.ts`, using the new layer color key.

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

The map uses a `createEntityLayer<T>()` helper pattern. It requires an `iconType`, and `createLayers()` declares named layers before returning them:

```typescript
// In createLayers(), alongside existing layer definitions
const newEntitiesLayer = createEntityLayer<NewEntityMapData>({
  id: "new-entities",
  data: filtered.newEntities,
  visible: visibility.newEntities,
  iconType: "new_entity",
  color: LAYER_COLORS.new_entity,
  radius: LAYER_RADII.new_entity,
  extensions: [zoneFilterExt],
  getFilterValue: (d) => isInZone(d.zoneId),
  filterRange: [1, 1],
  updateTriggers: {
    getFilterValue: focusedZoneId,
  },
});

// Add `newEntitiesLayer` to createLayers()'s returned array.
```

Also add `new_entity` to the `getIconTypeKey()` switch in `website/src/lib/map/layers.ts`.

### 8. Register visibility, selection, and popup handling

A new entity type must be registered at each explicit map switch or registry:

- `website/src/lib/map/url-state.ts`: add the new visibility key to `getDefaultLayerVisibility()` and `urlStateToLayerVisibility()`. Add it to `DEFAULT_LAYERS` only when it should be enabled by default.
- `website/src/lib/components/map/sidebar/MapSidebarContent.svelte`: add a `LayerOption` to the appropriate sidebar layer array and include it in that section's keys.
- `website/src/lib/components/map/sidebar/MapSidebar.svelte`: add a `QuickToggle` if the layer should be available while the sidebar is collapsed.
- `website/src/lib/map/selection.ts`: add an `EntityIndex` map, populate it in `createEntityIndex()`, and add the type to `getIndexForType()`. Add it to `getIndexForCategory()` when grouped highlights can target it.
- `website/src/lib/map/resolve-selection.ts`: add the type to `HighlightCategory` when needed for grouped highlights, dispatch it from `resolvePhysicalSelection()`, and add its resolver.
- `website/src/lib/components/map/EntityPopup.svelte`: add the entity URL and display-name/type switch cases, plus a popup section for entity-specific fields.
- `website/src/lib/components/map/MapTooltip.svelte`: add display-name, type, and status handling for the new type.
- `website/src/routes/map/+page.svelte`: check `getSelectionId()`, hover category state, popup handling, and URL restoration for any type-specific selection behavior.

## Coordinate System

The SQL queries select raw `position_x` and `position_y`. Negate the second coordinate when mapping rows to map positions, as `map.server.ts` does with `[r.position_x, -r.position_y]`.

```typescript
position:
  r.position_x !== null && r.position_y !== null
    ? [r.position_x, -r.position_y]
    : null,
```

Without negation, the map appears vertically mirrored. The game uses Y-up, deck.gl uses Y-down.

## Key Files

- `website/src/lib/map/CLAUDE.md` - Full documentation
- `website/src/lib/types/map.ts` - Type definitions
- `website/src/lib/queries/map.server.ts` - Server-side queries
- `website/src/lib/map/config.ts` - Colors, radii, icon sizes, and tooltip border colors
- `website/src/lib/map/icons.ts` - Icon atlas entries
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
- **Y negation**: Select raw coordinates in SQL, then negate the second coordinate when mapping rows to map positions
