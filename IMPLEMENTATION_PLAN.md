# Ancient Kingdoms Compendium - Implementation Plan

> See [ARCHITECTURE.md](ARCHITECTURE.md) for full architecture details.

## Phase 1: Data Extraction Mods

### DataExporter Mod
- [ ] Create `mods/DataExporter/` project structure
- [ ] Set up project references and MelonLoader config
- [ ] Implement JSON serialization models
- [ ] Implement MonsterExporter (positions + drops)
- [ ] Implement NpcExporter (positions + roles + inventory)
- [ ] Implement ItemExporter (ScriptableItem templates)
- [ ] Implement QuestExporter (ScriptableQuest templates)
- [ ] Implement SkillExporter (ScriptableSkill templates)
- [ ] Implement PortalExporter (connections + requirements)
- [ ] Implement ZoneExporter (bounds calculation)
- [ ] Add Shift+F9 keybind to trigger export
- [ ] Test export with game data

### MapScreenshotter Mod
- [ ] Create `mods/MapScreenshotter/` project structure
- [ ] Implement camera positioning system
- [ ] Implement entity hiding/freezing
- [ ] Implement grid-based screenshot capture
- [ ] Export metadata.json with coordinates
- [ ] Add Shift+F10 keybind to trigger screenshots
- [ ] Test screenshot coverage

## Phase 2: Build Pipeline (Python)

### Project Setup
- [ ] Create `build_pipeline/` directory structure
- [ ] Create `pyproject.toml` with dependencies (uv, Typer, Rich, Pydantic, Pillow, tomli, UnityPy)
- [ ] Create `config.toml.example` template
- [ ] Create `.python-version` file

### CLI Framework
- [ ] Implement `compendium/cli.py` with Typer
- [ ] Implement `compendium/config.py` (load TOML config)
- [ ] Implement `compendium/models.py` (Pydantic validation models)
- [ ] Add `--config` option for custom config files

### Core Commands
- [ ] Implement `compendium build` (JSON → SQLite)
- [ ] Create `schema.sql` with full database schema
- [ ] Implement `compendium tiles` (screenshots → tile pyramid)
- [ ] Implement `compendium icons` (UnityPy extraction)
- [ ] Implement `compendium types` (SQLite → TypeScript types)
- [ ] Implement `compendium deploy` (copy to website)
- [ ] Implement `compendium validate` (JSON validation only)
- [ ] Implement `compendium stats` (database statistics)
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
