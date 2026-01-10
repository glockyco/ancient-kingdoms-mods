---
name: svelte-5-patterns
description: Svelte 5 patterns and conventions used in this project
---

## Overview

This project uses Svelte 5 with runes. Key differences from Svelte 4:
- `$state`, `$derived`, `$effect` replace reactive statements
- `$props()` replaces `export let`
- Snippets replace slots for render functions

## Runes

### State

```svelte
<script lang="ts">
  // Reactive state
  let count = $state(0);
  
  // Object state
  let user = $state({ name: "John", age: 30 });
  
  // Array state
  let items = $state<string[]>([]);
</script>
```

### Derived

```svelte
<script lang="ts">
  let count = $state(0);
  
  // Simple derived
  let doubled = $derived(count * 2);
  
  // Complex derived with function
  let filtered = $derived.by(() => {
    return items.filter(item => item.active);
  });
</script>
```

### Effects

```svelte
<script lang="ts">
  let count = $state(0);
  
  // Run when dependencies change
  $effect(() => {
    console.log(`Count is now ${count}`);
  });
  
  // Cleanup pattern
  $effect(() => {
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  });
</script>
```

### Props

```svelte
<script lang="ts">
  // Destructure props
  let { name, age = 0, onUpdate } = $props<{
    name: string;
    age?: number;
    onUpdate?: (value: number) => void;
  }>();
  
  // Or with interface
  interface Props {
    data: EntityData;
    class?: string;
  }
  let { data, class: className } = $props<Props>();
</script>
```

## Snippets (Replace Slots)

### Define Snippet

```svelte
{#snippet renderItem(item: Item)}
  <div class="item">
    <span>{item.name}</span>
  </div>
{/snippet}
```

### Use in Component

```svelte
<DataTable {columns} {data}>
  {#snippet renderCell(cell)}
    {#if cell.column.id === "name"}
      <a href="/{cell.row.original.id}">{cell.getValue()}</a>
    {:else}
      <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
    {/if}
  {/snippet}
</DataTable>
```

### Pass Snippets as Props

```svelte
<!-- Parent -->
{#snippet customHeader()}
  <h1>Custom Title</h1>
{/snippet}

<MyComponent header={customHeader} />

<!-- Child -->
<script lang="ts">
  import type { Snippet } from "svelte";
  let { header }: { header?: Snippet } = $props();
</script>

{#if header}
  {@render header()}
{/if}
```

## Key Patterns in This Project

### DataTable Columns

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
    filterFn: (row, _columnId, filterValue) => {
      // Custom filter logic
    },
  },
];
```

### Server Load Data

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

### Browser Guards

```svelte
<script lang="ts">
  import { browser } from "$app/environment";
  
  $effect(() => {
    if (!browser) return;
    // Browser-only code
  });
</script>
```

## Gotchas

- Never use `$:` reactive statements (Svelte 4 syntax)
- Never use `export let` for props (use `$props()`)
- Don't use `$derived` inside functions that run frequently
- Use `$derived.by()` for complex computations
- Snippets are typed with `Snippet<[ParamTypes]>`
- `$effect` runs after DOM updates, not before
