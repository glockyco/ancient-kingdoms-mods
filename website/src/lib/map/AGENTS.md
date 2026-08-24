# Interactive map

The map receives prerendered SQLite data and renders it with deck.gl in the browser.

## Coordinate contract

- Deck X is game X.
- Deck Y is negative game Z. Do not use game Y on the two-dimensional map.
- Negating Z keeps north at the top because screen Y increases downward.
- Convert coordinates once at the data boundary. Do not mix game and deck coordinates inside layers.

## Identity contract

Spawn-table `id` values identify spawn rows. Detail routes require entity ids such as `monster_id` or `npc_id`. `MapEntity.id` stores the entity id used for navigation, not the spawn id.

## Layer ownership

`marker-registry.ts` owns marker precedence and presentation metadata. Do not add another marker registry, compatibility map, or consumer-specific marker switch. The registration test must fail when a layer is omitted.

Render order is semantic: terrain and zones first, paths and ranges next, ordinary markers next, important markers above them, and relationship, selection, hover, and zone highlights last. Preserve relative ordering when inserting a layer.

Use `rule://interactive-map` for registry migration, deck.gl performance, and new-layer constraints.
