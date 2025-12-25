# Interactive Map - Developer Documentation

WebGL-powered interactive world map using deck.gl.

## Overview

The map displays all game entities (monsters, NPCs, portals, chests, altars, gathering nodes, crafting stations) on a full world map with layer toggles and entity popups.

**Architecture:**

- **Rendering**: deck.gl with OrthographicView for WebGL performance
- **Data**: Client-side SQLite queries (~16k entities)
- **SSR**: Disabled for /map route (deck.gl requires browser APIs)

## Key Files

```
src/
├── routes/map/
│   ├── +page.ts          # Disables SSR/prerender
│   └── +page.svelte      # Main map component
├── lib/
│   ├── map/
│   │   ├── config.ts     # World bounds, colors, view settings
│   │   ├── layers.ts     # Layer factory functions
│   │   └── CLAUDE.md     # This file
│   ├── queries/
│   │   └── map.ts        # SQL queries for all entity positions
│   ├── types/
│   │   └── map.ts        # Map entity type definitions
│   └── components/map/
│       ├── MapControls.svelte   # Layer toggles panel
│       ├── MapLegend.svelte     # Color legend bar
│       ├── MapTooltip.svelte    # Hover tooltip
│       └── EntityPopup.svelte   # Click detail panel
```

## Coordinate System

```
Game coordinates → deck.gl:
- Game X (horizontal) → deck.gl X (direct)
- Game Y (forward)    → deck.gl Y (negated: -position_y)
- Game Z (height)     → ignored for 2D map

World bounds (after negation):
- X: [-880, 900]
- Y: [-1300, 740]
- Center: [10, -280]
```

**Important:** The Y coordinate is negated in all queries to correct the vertical orientation. Without negation, the map appears vertically mirrored.

## Entity IDs vs Spawn IDs

Spawn tables (`monster_spawns`, `npc_spawns`, etc.) have their own `id` field, but for linking to detail pages we need the **entity ID** (`monster_id`, `npc_id`).

```sql
-- Use monster_id for links, not ms.id
SELECT ms.monster_id, ...
FROM monster_spawns ms
```

The `id` field in `MapEntity` should contain the entity ID (for URL generation), not the spawn ID.

## Layer Stack (bottom to top)

1. **Background** - Solid color (zinc-900) or TileLayer when tiles available
2. **Gathering** - Plants (lime), Minerals (gray), Sparks (pink)
3. **Crafting** - Alchemy tables and crafting stations (violet)
4. **Chests** - Treasure chests (yellow)
5. **Altars** - Forgotten/Avatar altars (orange)
6. **Portals** - Zone portals (green)
7. **Monsters** - Regular (red), Elites (purple), Bosses (cyan)
8. **NPCs** - All NPCs (blue)

## Adding a New Entity Layer

1. **Add type** in `src/lib/types/map.ts`:
   - Add to `EntityType` union
   - Create interface extending `MapEntity`
   - Add to `AnyMapEntity` union
   - Add toggle to `LayerVisibility`

2. **Add query** in `src/lib/queries/map.ts`:
   - Create query function returning typed array
   - Add to `loadAllMapEntities()` parallel queries
   - Add to `MapEntityData` interface

3. **Add layer** in `src/lib/map/layers.ts`:
   - Add color to `LAYER_COLORS` in config.ts
   - Add radius to `LAYER_RADII` in config.ts
   - Create ScatterplotLayer in `createLayers()`

4. **Add toggle** in `MapControls.svelte`:
   - Add to `layers` array with key, label, color

## Layer Colors (Tailwind)

| Entity   | Color                | Tailwind   |
| -------- | -------------------- | ---------- |
| Monster  | `rgb(239, 68, 68)`   | red-500    |
| Elite    | `rgb(168, 85, 247)`  | purple-500 |
| Boss     | `rgb(6, 182, 212)`   | cyan-500   |
| NPC      | `rgb(59, 130, 246)`  | blue-500   |
| Portal   | `rgb(34, 197, 94)`   | green-500  |
| Chest    | `rgb(234, 179, 8)`   | yellow-500 |
| Altar    | `rgb(249, 115, 22)`  | orange-500 |
| Plant    | `rgb(132, 204, 22)`  | lime-500   |
| Mineral  | `rgb(156, 163, 175)` | gray-400   |
| Spark    | `rgb(236, 72, 153)`  | pink-500   |
| Crafting | `rgb(139, 92, 246)`  | violet-500 |

## deck.gl Integration

**Dynamic import pattern** (prevents SSR issues):

```typescript
onMount(async () => {
  const [deckCore, deckLayers] = await Promise.all([
    import("@deck.gl/core"),
    import("@deck.gl/layers"),
  ]);

  const { Deck, OrthographicView } = deckCore;
  const { ScatterplotLayer, PolygonLayer } = deckLayers;

  // Initialize deck instance...
});
```

**View configuration:**

```typescript
new OrthographicView({
  flipY: true,  // Y increases downward (standard map convention)
})

initialViewState: {
  target: [10, 280, 0],  // Center of world
  zoom: 0,
  minZoom: -2,
  maxZoom: 6,
}
```

## Entity Counts (estimated)

- Monsters: ~10,000
- Gathering: ~5,000
- NPCs: ~500
- Chests: ~300
- Portals: ~200
- Crafting: ~100
- Altars: ~50
- **Total: ~16,000 points**

deck.gl handles millions of points efficiently, but **layer recreation is expensive**.

## Performance Design

**Problem**: Toggling visibility or selecting entities caused multi-second freezes because every state change triggered full layer recreation.

**Solution**: Pre-filter once, create all layers always, use deck.gl's optimization features.

1. **Pre-filter data on load** (`FilteredMapData` type):
   - Split monsters into regular/elite/boss arrays once
   - Split gathering into plant/mineral/spark arrays once
   - Filter portals with destinations once
   - Calculate parent zone bounds once

2. **Create all layers always** with `visible` prop:
   - Don't conditionally create layers based on visibility
   - Set `visible: visibility.monsters` on each layer
   - deck.gl skips rendering invisible layers efficiently

3. **Use `updateTriggers`** for dynamic properties:
   - Tells deck.gl which accessor changed
   - Avoids full data re-upload to GPU

   ```typescript
   updateTriggers: {
     getColor: selectedPortalId,  // re-evaluate getColor when this changes
   }
   ```

4. **Use `DataFilterExtension`** for level filtering:
   - GPU-based filtering, no JS array recreation
   - Pass all data, filter on GPU with `filterRange`

   ```typescript
   extensions: [new DataFilterExtension({ filterSize: 1 })],
   getFilterValue: d => d.level,
   filterRange: [levelFilter.min, levelFilter.max],
   ```

5. **Pre-compute derived data with `$derived`** (Svelte 5):
   - Never compute data inside `createLayers()` - it runs on every state change
   - Use `$derived` in the page component for data that depends on specific state
   - Svelte caches the result; only recomputes when dependencies change

   ```typescript
   // selection.ts - pure function
   export function computeSelectionData(data, type, id): AnyMapEntity[];

   // +page.svelte - cached via $derived
   let selectionData = $derived(
     computeSelectionData(entityData, selectedEntityType, selectedEntityId),
   );
   ```

   - Pass pre-computed arrays to `createLayers()` as parameters
   - Use `EMPTY_SELECTION` constant for stable empty array references

**Key insight**: deck.gl is fast at rendering; the bottleneck is JS computation inside `createLayers()`.

## Future Enhancements

- [ ] TileLayer for terrain imagery (requires `compendium tiles` implementation)
- [ ] Search functionality with FTS5 and fly-to
- [x] URL state for sharing map positions
- [x] Zone boundary polygons from zone_triggers
- [x] Patrol path visualization for monsters and NPCs
