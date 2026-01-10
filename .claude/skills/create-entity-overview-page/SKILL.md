---
name: create-entity-overview-page
description: Create a list/overview page for game entities in the SvelteKit website
---

## Overview

Overview pages display filterable, sortable tables of all entities of a type. They use DataTable with faceted filters and range filters.

## Steps

1. **Create TypeScript types** in `website/src/lib/types/{entity}.ts`
   - Define list view interface (subset of fields for table)
   - Define filter-related interfaces if needed

2. **Create `+page.server.ts`** in `website/src/routes/{entity}/`
   - Add `export const prerender = true`
   - Query all entities with fields needed for display/filtering
   - Return typed data

3. **Create `+page.svelte`** in same directory
   - Define column definitions
   - Set up filters (faceted, range)
   - Create render snippets for custom cell rendering

## Key Patterns

### Server Load Function

```typescript
export const prerender = true;

export const load: PageServerLoad = (): EntityPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });
  
  const entities = db.prepare(`
    SELECT id, name, level, type, ...
    FROM entities
    ORDER BY level DESC, name ASC
  `).all() as EntityListView[];
  
  db.close();
  return { entities };
};
```

### Column Definitions

```typescript
const columns: ColumnDef<EntityRow>[] = [
  {
    id: "icon",
    header: "",
    size: 50,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    enableHiding: false,
    minSize: 200,
  },
  {
    accessorKey: "level",
    header: "Level",
    size: 100,
    filterFn: (row, _columnId, filterValue: [number | null, number | null]) => {
      const value = row.getValue("level") as number;
      if (!filterValue) return true;
      const [min, max] = filterValue;
      if (min !== null && value < min) return false;
      if (max !== null && value > max) return false;
      return true;
    },
  },
];
```

### Toolbar with Filters

```svelte
{#snippet toolbar(table: TanstackTable<EntityRow>)}
  <DataTableFacetedFilter
    column={table.getColumn("type")}
    title="Type"
    options={typeOptions}
  />
  <DataTableRangeFilter
    column={table.getColumn("level")}
    title="Level"
    min={1}
    max={50}
  />
{/snippet}
```

### Custom Cell Rendering

```svelte
{#snippet renderCell(cell: Cell<EntityRow, unknown>)}
  {#if cell.column.id === "icon"}
    <EntityIcon type={cell.row.original.type} />
  {:else if cell.column.id === "name"}
    <a href="/entities/{cell.row.original.id}" class="hover:underline">
      {cell.row.original.name}
    </a>
  {:else}
    <FlexRender ... />
  {/if}
{/snippet}
```

## Key Files

- `website/src/routes/monsters/+page.server.ts` - Server data loading
- `website/src/routes/monsters/+page.svelte` - Full table implementation
- `website/src/lib/components/ui/data-table/` - DataTable components
- `website/src/lib/types/monsters.ts` - Type definitions

## Gotchas

- Use `$derived` for computed filter options (not reactive statements)
- DataTable expects `PAGE_SIZE` constant for pagination
- Faceted filter options need `value` and `label` properties
- Range filters use `[min, max]` tuple as filter value
- Add virtual columns for complex filtering (e.g., `classification`)
