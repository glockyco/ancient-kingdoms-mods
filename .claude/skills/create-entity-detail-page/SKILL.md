---
name: create-entity-detail-page
description: Create a detail page for a game entity in the SvelteKit website
---

## Overview

Detail pages show comprehensive information about a single entity (monster, item, NPC, etc.). They use dynamic routes with `[id]` parameters and static site generation.

## Steps

1. **Create TypeScript types** in `website/src/lib/types/{entity}.ts`
   - Define interface for detail data
   - Define interfaces for related data (drops, spawns, etc.)

2. **Create `+page.server.ts`** in `website/src/routes/{entity}/[id]/`
   - Add `export const prerender = true`
   - Implement `entries: EntryGenerator` for static path generation
   - Implement `load: PageServerLoad` function

3. **Create `+page.svelte`** in same directory
   - Use `let { data } = $props()` for data access
   - Create sections for different data aspects
   - Use DataTable for lists of related entities

4. **Add meta description** (optional but recommended)
   - Create function in `website/src/lib/server/meta-description.ts`
   - Generate SEO-friendly description

## Key Patterns

### EntryGenerator for Static Paths

```typescript
export const entries: EntryGenerator = () => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });
  const entities = db.prepare("SELECT id FROM entities").all() as Array<{ id: string }>;
  db.close();
  return entities.map((e) => ({ id: e.id }));
};
```

### Load Function with Error Handling

```typescript
export const load: PageServerLoad = ({ params }): EntityDetailData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });
  
  const entity = db.prepare("SELECT * FROM entities WHERE id = ?").get(params.id);
  
  if (!entity) {
    db.close();
    throw error(404, `Entity not found: ${params.id}`);
  }
  
  // Parse JSON fields
  const jsonField = entity.json_column 
    ? JSON.parse(entity.json_column as string) 
    : [];
  
  db.close();
  return { entity, jsonField };
};
```

### Svelte Component Structure

```svelte
<script lang="ts">
  let { data } = $props();
</script>

<Breadcrumb items={[...]} />

<div class="space-y-8">
  <header>
    <h1>{data.entity.name}</h1>
  </header>
  
  <section>
    <h2>Stats</h2>
    <!-- Stats display -->
  </section>
  
  {#if data.relatedItems.length > 0}
    <section>
      <h2>Related Items</h2>
      <DataTable ... />
    </section>
  {/if}
</div>
```

## Key Files

- `website/src/routes/monsters/[id]/+page.server.ts` - Complex example
- `website/src/routes/monsters/[id]/+page.svelte` - Full detail page example
- `website/src/lib/types/monsters.ts` - Type definitions example
- `website/src/lib/db.ts` - Database utilities

## Gotchas

- Always close database connection with `db.close()` before throwing errors
- Parse JSON fields from database: `JSON.parse(row.field as string)`
- Use `Boolean()` wrapper for SQLite boolean fields (stored as 0/1)
- Type assertions only at DB query boundaries
- Remember `prerender = true` for static generation
