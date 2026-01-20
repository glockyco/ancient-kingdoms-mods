---
name: svelte-5-patterns
description: Svelte 5 patterns and conventions used in this project
---

# Svelte 5 Project Patterns

This project uses Svelte 5 with runes. These are project-specific patterns.

## Server Data Access

```svelte
<script lang="ts">
  // Page data from +page.server.ts
  let { data } = $props();
  
  // Derived from data
  let processedItems = $derived(
    data.items.map(item => ({ ...item, computed: item.value * 2 }))
  );
</script>
```

## DataTable Columns

```typescript
const columns: ColumnDef<EntityRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    enableHiding: false,
  },
  {
    accessorKey: "level",
    header: "Level",
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

## Virtual Columns for Filtering

Add computed columns that don't display but enable filtering:

```typescript
// Add virtual field to data
const dataWithVirtual = $derived(
  data.items.map((item) => ({
    ...item,
    zone_ids: itemZoneMap.get(item.id) || [],
  }))
);

// Hidden filter column
{
  id: "zone_ids",
  accessorKey: "zone_ids",
  enableHiding: false,
  filterFn: (row, columnId, filterValue: string[]) => {
    const zoneIds = row.getValue(columnId) as string[];
    if (!filterValue?.length) return true;
    return zoneIds.some((z) => filterValue.includes(z));
  },
}
```

## Browser Guards

```svelte
<script lang="ts">
  import { browser } from "$app/environment";
  
  $effect(() => {
    if (!browser) return;
    // Browser-only code (localStorage, window, etc.)
  });
</script>
```

## Snippets for Custom Cell Rendering

```svelte
{#snippet renderCell(cell: Cell<EntityRow, unknown>)}
  {#if cell.column.id === "name"}
    <a href="/entities/{cell.row.original.id}" class="hover:underline">
      {cell.row.original.name}
    </a>
  {:else}
    <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
  {/if}
{/snippet}
```

## Gotchas

- Use `$derived.by()` for complex computations with multiple statements
- DataTable expects `PAGE_SIZE` constant for pagination
- Faceted filter options need `value` and `label` properties
- Range filters use `[min, max]` tuple as filter value
