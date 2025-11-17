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

### Project Setup
- [ ] Initialize SvelteKit project with TypeScript
- [ ] Set up pnpm workspace
- [ ] Configure Tailwind CSS
- [ ] Configure ESLint + Prettier
- [ ] Set up Husky git hooks
- [ ] Install dependencies (sql.js-httpvfs, Leaflet, Lucide)

### Core Infrastructure
- [ ] Implement `lib/db.ts` (SQLite wrapper)
- [ ] Implement `lib/queries.ts` (common SQL queries)
- [ ] Copy generated `lib/types.ts` from build pipeline
- [ ] Implement `lib/stores.ts` (Svelte stores)
- [ ] Create `lib/components/SEO.svelte`

### Layout & Navigation
- [ ] Create `+layout.svelte` with navigation
- [ ] Implement global search component
- [ ] Create homepage (`+page.svelte`)

### Item Pages
- [ ] Create `items/+page.svelte` (browser with filters)
- [ ] Create `items/+page.ts` (load data)
- [ ] Create `items/[id]/+page.svelte` (detail page)
- [ ] Create `items/[id]/+page.ts` (SEO + data)
- [ ] Implement ItemCard component

### Monster Pages
- [ ] Create `monsters/+page.svelte` (browser with filters)
- [ ] Create `monsters/+page.ts` (load data)
- [ ] Create `monsters/[id]/+page.svelte` (detail page)
- [ ] Create `monsters/[id]/+page.ts` (SEO + data)
- [ ] Implement MonsterCard component

### NPC Pages
- [ ] Create `npcs/+page.svelte` (browser with filters)
- [ ] Create `npcs/[id]/+page.svelte` (detail page)

### Quest Pages
- [ ] Create `quests/+page.svelte` (browser with filters)
- [ ] Create `quests/[id]/+page.svelte` (detail page)

### Skill Pages
- [ ] Create `skills/+page.svelte` (browser with filters)
- [ ] Create `skills/[id]/+page.svelte` (detail page)

### Map Page
- [ ] Create `map/+page.svelte` (Leaflet integration)
- [ ] Implement custom tile layer
- [ ] Add monster/NPC/portal markers
- [ ] Implement marker clustering
- [ ] Add layer toggles
- [ ] Add level filter slider
- [ ] Implement click-to-details popup

### SEO & Performance
- [ ] Generate `sitemap.xml`
- [ ] Create `robots.txt`
- [ ] Add Open Graph meta tags
- [ ] Add JSON-LD structured data
- [ ] Optimize for Core Web Vitals

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
- [ ] Add Python linting job
- [ ] Add TypeScript linting job
- [ ] Add TypeScript typecheck job
- [ ] Add build job
- [ ] Test auto-deployment

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
