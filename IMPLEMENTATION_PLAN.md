# Ancient Kingdoms Compendium - Implementation Plan

> See [ARCHITECTURE.md](ARCHITECTURE.md) for full architecture details.

## Phase 1: Data Extraction Mods

### DataExporter Mod
- [x] Create `mods/DataExporter/` project structure
- [x] Set up project references and MelonLoader config
- [x] Implement JSON serialization models
- [x] Implement MonsterExporter (positions + drops + combat flags + all missing fields)
- [x] Implement NpcExporter (positions + roles + inventory + loot drops + all missing fields)
- [x] Implement ItemExporter (ScriptableItem templates)
- [x] Implement QuestExporter (ScriptableQuest templates)
- [x] Implement SkillExporter (ScriptableSkill templates)
- [x] Implement PortalExporter (connections + requirements)
- [x] Implement ZoneTriggerExporter (zone triggers with bounds)
- [x] Implement ZoneInfoExporter (zone metadata)
- [x] Implement GatherItemExporter (gather points + all missing fields)
- [x] Implement CraftingRecipeExporter (recipes + materials)
- [x] Add Shift+F9 keybind to trigger export
- [x] Test export with game data (verified all new fields work correctly)

### MapScreenshotter Mod
- [x] Create `mods/MapScreenshotter/` project structure
- [x] Implement dedicated orthographic camera system (separate from main camera)
- [x] Implement zone activation (fullZones + staticEnviroment GameObjects)
- [x] Implement entity hiding (monsters, NPCs, gather items)
- [x] Implement unified world capture with optimized bounds (X[-880,900] Y[-740,1300])
- [x] Implement grid-based RenderTexture capture (1024x1024 per 200-unit tile)
- [x] Export metadata.json with world coordinates and camera settings
- [x] Add Shift+F10 keybind to trigger screenshots
- [x] Resolve rendering issues (black screenshots, zone activation, texture size)
- [ ] **REFACTOR**: Migrate temporary tools/ scripts into build_pipeline/ structure

## Phase 2: Build Pipeline (Python)

**Note:** Temporary prototype exists in `tools/` directory:
- ✅ `tools/stitch_screenshots.py` - Simple grid-based stitching (working)
- ✅ `tools/pyproject.toml` - Basic uv setup with Pillow (working)

These need migration into the proper `build-pipeline/` structure below.

### Project Setup
- [x] Create `build-pipeline/` directory structure
- [x] Migrate tools/pyproject.toml → build-pipeline/pyproject.toml with full dependencies (uv, Typer, Rich, Pydantic, Pillow, UnityPy)
- [x] Create `config.toml.example` template
- [x] Create `.python-version` file

### CLI Framework
- [x] Implement `compendium/cli.py` with Typer
- [x] Implement `compendium/config.py` (load TOML config)
- [x] Implement `compendium/models.py` (Pydantic validation models)
- [x] Add `--config` option for custom config files

### Python Code Quality
- [ ] Set up Ruff for linting and formatting
- [ ] Configure Ruff in `pyproject.toml`
- [ ] Set up mypy for type checking
- [ ] Configure mypy in `pyproject.toml`
- [ ] Add Ruff and mypy to pre-commit hooks (via Husky in website directory)

### Core Commands
- [x] Implement `compendium build` (JSON → SQLite)
- [x] Create `schema.sql` with full database schema
- [ ] Implement `compendium tiles` (screenshots → tile pyramid)
  - [ ] Migrate tools/stitch_screenshots.py logic
  - [ ] Add tile pyramid generation (zoom levels 0-6)
  - [ ] Use Pillow for image processing
- [ ] Implement `compendium icons` (UnityPy extraction)
- [ ] Implement `compendium types` (SQLite → TypeScript types)
- [ ] Implement `compendium deploy` (copy to website)
- [ ] Implement `compendium validate` (JSON validation only)
- [x] Implement `compendium stats` (database statistics)
- [ ] Implement `compendium all` (run everything)

### Testing
- [ ] Test with sample exported data
- [ ] Verify SQLite database structure
- [ ] Verify TypeScript types generation
- [ ] Test tile generation with screenshots

## Phase 3: Website (SvelteKit)

**Design Principles:**
- Consistency > Novelty - Same patterns everywhere
- Data Clarity > Aesthetics - Information first, pretty second
- Speed > Features - Fast loading beats fancy animations
- Mobile = Desktop - One responsive design, not separate versions

**Target: Gamer-friendly aesthetic (cool/fancy) with functional focus**

### Project Setup
- [ ] Initialize SvelteKit project with TypeScript
- [ ] Install @sveltejs/adapter-static for Cloudflare Pages
- [ ] Set up pnpm workspace
- [ ] Configure Tailwind CSS
- [ ] Install and configure shadcn-svelte (component library)
- [ ] Set up light/dark theme system (mode-watcher or similar)
- [ ] Configure ESLint + Prettier (with Svelte plugins)
- [ ] Set up Husky + lint-staged for pre-commit hooks:
  - [ ] Prettier (format staged files)
  - [ ] ESLint (lint and auto-fix staged files)
  - [ ] TypeScript check (`tsc --noEmit`)
  - [ ] svelte-check (Svelte validation)
- [ ] Install dependencies:
  - [ ] sql.js-httpvfs (client-side SQLite)
  - [ ] Leaflet (map)
  - [ ] Lucide Svelte (icons)
- [ ] Configure svelte.config.js for static build
- [ ] Set up proper paths.base for deployment

### Design System
- [ ] Define color palette (gamer aesthetic + RPG quality colors)
  - [ ] Item quality colors (common/uncommon/rare/epic/legendary)
  - [ ] Monster type colors (boss=cyan, elite=purple, regular=red)
  - [ ] Semantic colors (success/warning/error/info)
  - [ ] Dark mode variants
- [ ] Set up base shadcn-svelte components:
  - [ ] Button, Card, Badge
  - [ ] Table, Dialog, Dropdown
  - [ ] Input, Select, Checkbox
  - [ ] Skeleton (loading states)
  - [ ] Tooltip
- [ ] Create custom base components:
  - [ ] EntityCard (consistent card for all entity types)
  - [ ] EntityHeader (page header with icon + meta)
  - [ ] StatDisplay (consistent stat formatting)
  - [ ] QualityBadge (color-coded quality)
  - [ ] TypeBadge (entity type indicators)
  - [ ] IconPlaceholder (square placeholder, ready for real icons)

### Core Infrastructure
- [ ] Implement `lib/db.ts` (SQLite wrapper with sql.js-httpvfs)
- [ ] Implement `lib/queries.ts` (common SQL queries)
  - [ ] Entity fetching (by id, list, search)
  - [ ] Relationship queries (drops, vendors, quests, recipes)
  - [ ] FTS5 search queries
- [ ] Copy generated `lib/types.ts` from build pipeline (when available)
- [ ] Implement `lib/stores.ts` (Svelte stores for search, filters, theme)
- [ ] Create `lib/utils/coords.ts` (world coordinate transformations for map)
- [ ] Create `lib/components/SEO.svelte` (meta tags, Open Graph)

### Layout & Navigation
- [ ] Create `+layout.svelte` with:
  - [ ] Top navigation bar (responsive)
  - [ ] Theme toggle (light/dark)
  - [ ] Global search input
  - [ ] Mobile menu
- [ ] Create homepage (`+page.svelte`)
  - [ ] Hero section with search
  - [ ] Quick navigation cards (Items, Monsters, NPCs, Map)
  - [ ] Recent updates or featured content

### Core Feature: Interactive Map
- [ ] Create `map/+page.svelte` (Leaflet integration)
- [ ] Set up Leaflet with CRS.Simple for game coordinates
- [ ] Implement placeholder tile layer (solid color or simple grid)
- [ ] Load entity coordinates from database
- [ ] Add monster markers (color-coded by type)
- [ ] Add NPC markers
- [ ] Add portal markers
- [ ] Implement layer toggles (show/hide by entity type)
- [ ] Add marker click → popup with entity info + detail link
- [ ] Make map bounds match config.toml settings
- [ ] Add zoom controls and attribution
- [ ] Make responsive (mobile-friendly)
- [ ] (Future: Level filter slider)
- [ ] (Future: Real tile integration when available)

### Browse Pages (Items, Monsters, NPCs)
- [ ] Create shared `lib/components/EntityBrowser.svelte` (reusable list/grid)
- [ ] Create shared `lib/components/FilterPanel.svelte` (sidebar filters)
- [ ] Implement Items browser:
  - [ ] `items/+page.svelte` (list with filters)
  - [ ] `items/+page.ts` (load data from SQLite)
  - [ ] Filters: quality, type, level range, class, slot, weapon category
  - [ ] Sort: name, level, quality
  - [ ] Search within results
- [ ] Implement Monsters browser:
  - [ ] `monsters/+page.svelte` (list with filters)
  - [ ] `monsters/+page.ts` (load data)
  - [ ] Filters: zone, level range, type (boss/elite/regular)
  - [ ] Sort: name, level, zone
- [ ] Implement NPCs browser:
  - [ ] `npcs/+page.svelte` (list with filters)
  - [ ] `npcs/+page.ts` (load data)
  - [ ] Filters: zone, type (vendor/quest_giver/other)
  - [ ] Sort: name, zone

### Detail Pages
- [ ] Create shared `lib/components/EntityDetail.svelte` template
- [ ] Create shared `lib/components/RelationshipSection.svelte`
- [ ] Implement Item detail page:
  - [ ] `items/[id]/+page.svelte`
  - [ ] `items/[id]/+page.ts` (SEO + data)
  - [ ] Show: stats, requirements, description
  - [ ] Show relationships: dropped by, sold by, quest reward, crafting recipe, used in recipes
  - [ ] Show location on mini-map preview
  - [ ] Add "View on Map" link
- [ ] Implement Monster detail page:
  - [ ] `monsters/[id]/+page.svelte`
  - [ ] `monsters/[id]/+page.ts` (SEO + data)
  - [ ] Show: level, type, zone, position, respawn time
  - [ ] Show drop table (with drop rates if available)
  - [ ] Show location on mini-map preview
  - [ ] Add "View on Map" link
- [ ] Implement NPC detail page:
  - [ ] `npcs/[id]/+page.svelte`
  - [ ] `npcs/[id]/+page.ts` (SEO + data)
  - [ ] Show: zone, position, type
  - [ ] Show vendor inventory (if vendor)
  - [ ] Show quests offered (if quest giver)
  - [ ] Show location on mini-map preview
  - [ ] Add "View on Map" link

### Global Search
- [ ] Implement search component in layout
- [ ] Use FTS5 full-text search from SQLite
- [ ] Search across: items, monsters, NPCs, quests, skills
- [ ] Show results grouped by entity type
- [ ] Add keyboard shortcuts (Ctrl+K or Cmd+K)
- [ ] Debounced search input
- [ ] Show search suggestions/autocomplete
- [ ] Navigate to result on selection

### Polish & UX
- [ ] Add loading skeletons for all pages
- [ ] Add error states (404, database load errors)
- [ ] Add empty states ("No results found")
- [ ] Add hover tooltips (quick info on entity names)
- [ ] Add breadcrumbs for navigation
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Add transitions (subtle, fast)
- [ ] Optimize images/icons (lazy loading)
- [ ] Add "Copy link" buttons where relevant

### SEO & Meta
- [ ] Generate `sitemap.xml`
- [ ] Create `robots.txt`
- [ ] Add Open Graph meta tags (all pages)
- [ ] Add Twitter Card meta tags
- [ ] Add JSON-LD structured data (items, monsters, etc.)
- [ ] Optimize page titles and descriptions
- [ ] Add canonical URLs

### Future Enhancements (Post-MVP)
- [ ] Quest pages (browser + detail)
- [ ] Skill pages (browser + detail)
- [ ] Crafting recipe pages
- [ ] Gather items pages
- [ ] Build planner tool
- [ ] Item comparison tool
- [ ] Quest chain visualization
- [ ] User annotations/notes
- [ ] PWA support (offline mode)

## Phase 4: Deployment

### Initial Deployment
- [ ] Deploy compendium.db to `website/static/`
- [ ] Deploy tiles to `website/static/tiles/`
- [ ] Deploy icons to `website/static/icons/`
- [ ] Build static site (`pnpm build`)
- [ ] Set up Cloudflare Pages
- [ ] Connect GitHub repository
- [ ] Configure build settings

### CI/CD
- [ ] Create `.github/workflows/ci.yml`
- [ ] Add Python linting job (Ruff)
- [ ] Add Python type checking job (mypy)
- [ ] Add TypeScript linting job (ESLint)
- [ ] Add TypeScript typecheck job (tsc + svelte-check)
- [ ] Add Prettier format check
- [ ] Add website build job (`pnpm build`)
- [ ] Test auto-deployment on Cloudflare Pages

## Phase 5: Documentation & Polish

- [ ] Update README.md with usage instructions
- [ ] Add mod-specific CLAUDE.md files
- [ ] Test complete workflow (Shift+F9 → Shift+F10 → compendium all → deploy)
- [ ] Create video/GIF demo
- [ ] Write user guide for website

## Future Enhancements (Post-V1)

- [ ] UI/UX planning session for website improvements
- [ ] Build planner feature
- [ ] Item comparison tool
- [ ] Quest chain visualization
- [ ] Dark mode
- [ ] PWA support (offline mode)
