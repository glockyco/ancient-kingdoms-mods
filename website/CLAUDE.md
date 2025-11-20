# Website - Developer Documentation

Ancient Kingdoms Compendium website - a static site for browsing game data.

## Overview

This is a SvelteKit static site that provides a searchable, filterable compendium of Ancient Kingdoms game data. The site runs entirely client-side with no backend server required.

**Architecture:**

- **Frontend**: SvelteKit 2 with TypeScript and Svelte 5
- **Styling**: Tailwind CSS + shadcn-svelte components
- **Database**: Client-side SQLite via sql.js-httpvfs (15MB database loaded in browser)
- **Map**: Leaflet with custom tiles and markers
- **Deployment**: Cloudflare Pages (static hosting)

**Key Principle**: Data clarity > aesthetics. Gamer-friendly design with functional focus.

## Project Structure

```
website/
├── src/
│   ├── lib/
│   │   ├── components/        # Reusable Svelte components
│   │   │   ├── ui/           # shadcn-svelte base components
│   │   │   ├── EntityCard.svelte
│   │   │   ├── EntityHeader.svelte
│   │   │   ├── FilterPanel.svelte
│   │   │   └── LoadingOverlay.svelte  # Navigation loading indicator
│   │   ├── types/            # Shared TypeScript types
│   │   │   └── items.ts      # Item page data types
│   │   ├── db.ts             # SQLite wrapper (sql.js-httpvfs)
│   │   ├── queries.ts        # SQL queries
│   │   ├── types.ts          # TypeScript types (generated from DB schema)
│   │   ├── stores.ts         # Svelte stores
│   │   └── utils/
│   │       └── coords.ts     # Map coordinate transformations
│   ├── routes/               # File-based routing
│   │   ├── +layout.svelte    # Root layout
│   │   ├── +layout.ts        # Prerender config
│   │   ├── +page.svelte      # Homepage
│   │   ├── items/
│   │   │   ├── +page.svelte  # Items browser
│   │   │   ├── +page.ts      # Load data
│   │   │   └── [id]/         # Item detail pages
│   │   ├── monsters/         # Monsters browser + detail
│   │   ├── npcs/             # NPCs browser + detail
│   │   └── map/              # Interactive map
│   │       └── +page.svelte
│   ├── app.html              # HTML template
│   └── app.d.ts              # TypeScript declarations
├── static/
│   ├── compendium.db         # SQLite database (deployed here)
│   ├── tiles/                # Map tiles (when available)
│   ├── icons/                # Game icons (when available)
│   └── robots.txt
├── build/                    # Static build output (gitignored)
├── svelte.config.js          # SvelteKit configuration
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies and scripts
```

## Development Workflow

### Setup

```bash
cd website
pnpm install
```

### Running Locally

```bash
# Development server (with HMR)
pnpm dev

# Type checking
pnpm check

# Linting (when configured)
pnpm lint

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Testing Before Commit

**Always test before committing:**

1. Run `pnpm check` - Verify no TypeScript/Svelte errors
2. Run `pnpm build` - Ensure static build succeeds
3. Test in browser - Verify functionality works
4. Check for console errors

**Pre-commit hooks automatically run:**

- ESLint with auto-fix
- Prettier with auto-format
- `pnpm check` for type checking (TypeScript + Svelte validation)

If hooks fail, fix the issues and stage the fixes before committing again.

### TypeScript and Type Safety

**Strict mode is ALWAYS enabled** (`"strict": true` in tsconfig.json). This provides maximum compile-time guarantees.

**Type assertion guidelines:**

- **ONLY use type assertions at I/O boundaries** where TypeScript fundamentally cannot provide guarantees:
  - Database queries (better-sqlite3 returns `unknown`)
  - JSON parsing (`JSON.parse` returns `any`)
  - External API responses
- **NEVER use type assertions in:**
  - Component code
  - Business logic
  - Data transformations
  - Internal function calls

**Proper type patterns:**

```typescript
// ✅ GOOD: Explicit return types on load functions
export const load: PageServerLoad = (): ItemsPageData => {
  const items = db.prepare("SELECT * FROM items").all() as Item[]; // OK - I/O boundary
  return { items }; // Type-checked against ItemsPageData
};

// ✅ GOOD: Shared type definitions (no duplication)
// Define once in src/lib/types/
export interface ItemsPageData {
  items: Item[];
  totalCount: number;
  // ...
}

// ❌ BAD: Type assertions in components
const { item } = data as { item: Item }; // Should use proper typing instead

// ❌ BAD: Duplicate interface definitions
// Don't define ItemsPageData in both +page.ts and +page.server.ts
```

**Configuration constants:**

- Extract magic numbers to `src/lib/config.ts`
- Use `as const` for readonly configuration
- Single source of truth for settings

```typescript
export const PAGINATION = {
  PAGE_SIZE: 50,
} as const;
```

## Key Architectural Decisions

### Static Site Generation (SSG)

**Why:** Cloudflare Pages deployment, no server costs, fast CDN delivery

**Implementation:**

- Use `@sveltejs/adapter-static`
- Set `export const prerender = true` in `+layout.ts`
- All routes must be prerenderable (no dynamic server-side rendering)

### Client-Side SQLite

**Why:** No backend needed, full SQL query power in browser, works offline

**Implementation:**

- `sql.js-httpvfs` - SQLite compiled to WASM with HTTP range request support
- Database loaded lazily (only fetch needed chunks)
- FTS5 full-text search indexes for fast searching

**Trade-off:** 15MB initial download, but enables rich queries without API

### Component Patterns

**EntityCard** - Consistent card for all entity types (items, monsters, NPCs)

```svelte
<EntityCard
  icon={item.icon}
  name={item.name}
  type="item"
  quality="epic"
  level={45}
  href="/items/{item.id}"
/>
```

**EntityHeader** - Page header with icon + metadata

```svelte
<EntityHeader
  icon={monster.icon}
  name={monster.name}
  type="monster"
  level={monster.level}
  zone={monster.zone}
/>
```

**FilterPanel** - Reusable sidebar filters

```svelte
<FilterPanel
  filters={[
    { type: 'select', label: 'Quality', options: [...] },
    { type: 'range', label: 'Level', min: 1, max: 60 }
  ]}
  on:change={handleFilterChange}
/>
```

### Design System

**Color Palette:**

- Item quality: Standard RPG colors (gray/white/green/blue/purple/orange)
- Monster types: Boss=cyan, Elite=purple, Regular=red
- Dark mode + light mode support

**Typography:**

- System font stack for performance
- Clear hierarchy (H1/H2/H3)

**Components:**

- shadcn-svelte for base components (buttons, cards, dialogs, etc.)
- Custom components built on top for domain-specific needs

### Map Integration

**Leaflet with CRS.Simple:**

- Game coordinates mapped to pixel coordinates
- Placeholder tiles initially (solid color/grid)
- Real tiles swapped in when available from `compendium tiles`

**Markers:**

- Color-coded by type (monsters, NPCs, portals)
- Layer toggles (show/hide by type)
- Click marker → popup with entity info + detail link

**Bounds from config:**

- X: [-880, 900]
- Y: [-740, 1300]
- Matches MapScreenshotter export bounds

## Code Style

**Follow main repository guidelines:**

- No historical/temporal comments
- Clean, straightforward code
- Consistency > novelty
- Mobile-first responsive design

**Svelte-specific:**

- Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Prefer composition over inheritance
- Keep components small and focused
- Use TypeScript for all files

## Database Queries

**Pattern: Keep queries in `lib/queries.ts`**

```typescript
// Good
export async function getItemById(db: Database, id: string) {
  return db.query(`SELECT * FROM items WHERE id = ?`, [id]);
}

// Bad - inline SQL in components
const item = await db.query(`SELECT * FROM items WHERE id = ?`, [id]);
```

**Use FTS5 for search:**

```typescript
export async function searchEntities(db: Database, query: string) {
  return db.query(
    `
    SELECT * FROM items_fts
    WHERE items_fts MATCH ?
    ORDER BY rank
    LIMIT 50
  `,
    [query],
  );
}
```

## Deployment

**Cloudflare Pages:**

1. Build command: `pnpm build`
2. Output directory: `build`
3. Node version: 20
4. Environment: Production

**Before deploying:**

- Run full build locally
- Test with `pnpm preview`
- Verify database is in `static/`
- Check all routes work
- Test on mobile viewport

## Performance Considerations

**Client-side navigation:**

- Loading indicator is handled globally in `+layout.svelte` - automatically shows for all navigations
- The `LoadingOverlay` component subscribes to `$navigating` store internally
- Cache expensive query results (e.g., item types that don't change)
- Minimize database queries - reduce from 3 to 2 where possible

**Global UI components:**

For UI elements that should appear site-wide (loading indicators, navigation, footers), add them to `src/routes/+layout.svelte`:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import LoadingOverlay from "$lib/components/LoadingOverlay.svelte";
  let { children } = $props();
</script>

<LoadingOverlay />
{@render children()}
```

This is better than adding to individual pages because:
- Single source of truth (DRY principle)
- Automatically applies to all routes
- No imports needed on individual pages

```typescript
// Caching pattern for static data
let cachedItemTypes: string[] | null = null;

export const load = async () => {
  if (!cachedItemTypes) {
    cachedItemTypes = await getItemTypes();
  }
  return { types: cachedItemTypes };
};
```

**Lazy loading:**

- Use dynamic imports for heavy components
- Lazy load map library
- Defer non-critical CSS

**Virtual scrolling:**

- Use for long lists (>100 items)
- Render only visible rows

**Image optimization:**

- WebP icons (64x64)
- Lazy load images below the fold
- Use placeholder while loading

## Troubleshooting

**Build fails with "routes are dynamic":**

- Ensure `export const prerender = true` in `+layout.ts`
- Check no dynamic API routes without prerender

**SQLite database not loading:**

- Verify `compendium.db` is in `static/`
- Check browser console for fetch errors
- Ensure CORS headers allow range requests

**Map tiles not showing:**

- Check tile URL format in Leaflet config
- Verify bounds match game coordinates
- Use browser network tab to debug tile requests

**TypeScript errors:**

- Run `pnpm check` to see all errors
- Regenerate types with `compendium types` if schema changed
- Check `tsconfig.json` paths are correct
