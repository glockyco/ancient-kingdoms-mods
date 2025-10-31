# Ancient Kingdoms Compendium - Architecture

## Overview

An interactive game compendium website with searchable databases and map integration, powered by runtime data extraction and static site deployment.

```
┌─────────────────────────────────────────────────────────────────┐
│                        GAME (Runtime)                           │
│  ┌──────────────────┐         ┌──────────────────────────────┐ │
│  │ DataExporter Mod │────────>│ Automated Screenshot Tool    │ │
│  │ (MelonLoader)    │         │ (for map tiles)              │ │
│  └──────────────────┘         └──────────────────────────────┘ │
└─────────┬───────────────────────────────┬─────────────────────┘
          │                               │
          │ JSON Files                    │ PNG Screenshots
          │ (normalized data)             │ (world coordinates)
          ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BUILD PIPELINE                             │
│  ┌──────────────────┐         ┌──────────────────────────────┐ │
│  │ json_to_sqlite   │         │ Map Tile Generator           │ │
│  │ (Python)         │         │ (stitch + tile screenshots)  │ │
│  └──────────────────┘         └──────────────────────────────┘ │
└─────────┬───────────────────────────────┬─────────────────────┘
          │                               │
          │ compendium.db                 │ tiles/{z}/{x}/{y}.png
          │ (SQLite)                      │ (map pyramid)
          ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STATIC WEBSITE (SvelteKit)                    │
│                                                                 │
│  ┌────────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  Search    │  │  Items   │  │ Monsters │  │ Interactive │  │
│  │  (FTS5)    │  │  Browser │  │  Browser │  │     Map     │  │
│  └────────────┘  └──────────┘  └──────────┘  └─────────────┘  │
│                                                                 │
│  Database: sql.js-httpvfs (range requests for SQLite)          │
│  Maps: Leaflet.js (custom tiles from screenshots)              │
└─────────────────────────────────────────────────────────────────┘
          │
          │ Deploy (static files)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE PAGES                             │
│  - compendium.db (lazy-loaded via HTTP range requests)          │
│  - Map tiles (cached on CDN)                                    │
│  - Static HTML/JS/CSS                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Data Extraction Mod

### Project Structure

```
mods/DataExporter/
├── DataExporter.cs              # Main mod entry point
├── DataExporter.csproj          # Project file
├── Exporters/
│   ├── MonsterExporter.cs       # Exports monster data
│   ├── NpcExporter.cs           # Exports NPC data
│   ├── ItemExporter.cs          # Exports item database
│   ├── QuestExporter.cs         # Exports quest database
│   ├── SkillExporter.cs         # Exports skill trees
│   ├── PortalExporter.cs        # Exports portal connections
│   └── ZoneExporter.cs          # Exports zone metadata
├── Models/
│   ├── MonsterData.cs           # JSON serialization models
│   ├── NpcData.cs
│   ├── ItemData.cs
│   └── ... (other data models)
└── CLAUDE.md                    # Mod documentation
```

### Keybind

- **Shift+F9**: Export all data to `E:\ancient-kingdoms-export\`

### Data Exported (JSON Format)

#### 1. Monsters (`monsters.json`)
**Source:** `Resources.FindObjectsOfTypeAll<Il2Cpp.Monster>()`

```json
{
  "id": "fire_elemental_volcanic_001",
  "name": "Fire Elemental",
  "zone_id": "volcanic_depths",
  "position": {"x": 123.4, "y": 45.6, "z": 78.9},
  "level": 45,
  "health": 12000,
  "type": "Elemental",
  "class": "Fire",
  "is_boss": false,
  "is_elite": true,
  "is_hunt": false,
  "respawn_time": 300,
  "gold_min": 50,
  "gold_max": 150,
  "exp_multiplier": 1.2,
  "drops": [
    {"item_id": "flameburst_sword", "rate": 0.15},
    {"item_id": "fire_essence", "rate": 0.45}
  ]
}
```

**Key Fields:**
- `position`: World coordinates (for map placement)
- `zone_id`: Which zone this monster belongs to
- `drops`: Inline drop table (denormalized for convenience)

#### 2. NPCs (`npcs.json`)
**Source:** `Resources.FindObjectsOfTypeAll<Il2Cpp.Npc>()`

```json
{
  "id": "blacksmith_kara",
  "name": "Kara the Blacksmith",
  "zone_id": "stonewatch_city",
  "position": {"x": 100.0, "y": 20.0, "z": 300.0},
  "faction": "Stonewatch",
  "race": "Human",
  "roles": {
    "is_merchant": true,
    "is_quest_giver": true,
    "can_repair_equipment": true,
    "is_bank": false
  },
  "quests_offered": ["quest_blacksmith_1", "quest_iron_shortage"],
  "items_sold": [
    {"item_id": "iron_sword", "price": 500},
    {"item_id": "steel_helmet", "price": 800}
  ]
}
```

#### 3. Items (`items.json`)
**Source:** `Resources.FindObjectsOfTypeAll<Il2Cpp.ScriptableItem>()`

```json
{
  "id": "flameburst_sword",
  "name": "Flameburst Sword",
  "type": "weapon",
  "weapon_category": "sword",
  "slot": "main_hand",
  "quality": "rare",
  "level_required": 45,
  "class_required": ["Warrior", "Ranger"],
  "stats": {
    "damage": 85,
    "strength": 12,
    "constitution": 8,
    "fire_resist": 15
  },
  "buy_price": 5000,
  "sell_price": 1250,
  "tradable": true,
  "is_quest_item": false,
  "icon_path": "items/weapons/flameburst_sword",
  "tooltip": "A blade wreathed in eternal flame..."
}
```

**Note:** All stat fields from `EquipmentItem` exported, even if 0 (filters handle this on web side)

#### 4. Quests (`quests.json`)
**Source:** `Resources.FindObjectsOfTypeAll<Il2Cpp.ScriptableQuest>()`

```json
{
  "id": "quest_blacksmith_1",
  "name": "The Smith's Request",
  "level_required": 40,
  "level_recommended": 45,
  "start_npc_id": "blacksmith_kara",
  "end_npc_id": "blacksmith_kara",
  "predecessor_id": null,
  "type": "kill",
  "is_main_quest": false,
  "is_epic_quest": false,
  "objectives": [
    {
      "type": "kill",
      "target_monster_id": "fire_elemental",
      "amount": 10,
      "zone_id": "volcanic_depths",
      "position": {"x": 120.0, "y": 40.0, "z": 75.0}
    }
  ],
  "rewards": {
    "gold": 1000,
    "exp": 5000,
    "items": [
      {"item_id": "steel_helmet", "class_specific": null}
    ]
  },
  "tooltip": "Kara needs fire essence to forge weapons...",
  "tooltip_complete": "You've gathered the materials Kara needed."
}
```

#### 5. Skills (`skills.json`)
**Source:** `Resources.FindObjectsOfTypeAll<Il2Cpp.ScriptableSkill>()`

```json
{
  "id": "skill_fireball",
  "name": "Fireball",
  "class": "Wizard",
  "tier": 2,
  "max_level": 5,
  "level_required": 10,
  "prerequisite_skill_id": "skill_fire_bolt",
  "prerequisite_level": 3,
  "mana_cost": 30,
  "cooldown": 3.0,
  "cast_time": 1.5,
  "cast_range": 25.0,
  "tooltip": "Launches a ball of fire that explodes on impact...",
  "icon_path": "skills/wizard/fireball"
}
```

#### 6. Portals (`portals.json`)
**Source:** `Resources.FindObjectsOfTypeAll<Il2Cpp.Portal>()`

```json
{
  "id": "portal_stonewatch_to_volcanic",
  "from_zone_id": "stonewatch_city",
  "to_zone_id": "volcanic_depths",
  "position": {"x": 150.0, "y": 30.0, "z": 200.0},
  "destination": {"x": 10.0, "y": 5.0, "z": 15.0},
  "required_item_id": "volcanic_key",
  "level_required": 40,
  "is_closed": false
}
```

#### 7. Zones (`zones.json`)
**Source:** Derived from monster/NPC `zone_id` fields + hierarchy analysis

```json
{
  "id": "volcanic_depths",
  "name": "Volcanic Depths",
  "level_min": 40,
  "level_max": 50,
  "bounds": {
    "min_x": 0.0,
    "max_x": 500.0,
    "min_z": 0.0,
    "max_z": 500.0
  }
}
```

**Note:** Bounds calculated by finding min/max positions of all entities in zone

### Deduplication Strategy

- **Monsters:** Deduplicate by `zone_id|name` (simple and effective)
- **NPCs:** Deduplicate by `zone_id|name` (simple and effective)
- **Items/Quests/Skills:** Templates from ScriptableObjects (inherently unique, no deduplication needed)

---

## Part 2: Map Tile Generation

### Challenge: Creating Accurate World Map

Since all zones exist on a single "World" scene with real coordinates, we can create a **true-to-scale world map** from automated screenshots.

### Screenshot Automation Tool

**New Mod:** `MapScreenshotter` (separate from DataExporter)

**Functionality:**
1. Loads "World" scene
2. Disables UI/HUD
3. **Teleports/freezes player to origin and disables all entities** (clean map)
4. Positions orthographic camera at fixed height looking down
5. Takes grid of overlapping screenshots covering entire world
6. Exports with world coordinate metadata

**Note:** Monster/NPC positions are captured via DataExporter (Shift+F9), not shown in screenshots. Screenshots are just the terrain/environment.

**Keybind:** Shift+F10

**Output Format:**
```
E:\ancient-kingdoms-export\screenshots\
├── metadata.json              # Camera config + world bounds
├── screenshot_x000_z000.png   # Top-left corner
├── screenshot_x000_z100.png
├── screenshot_x100_z000.png
└── ...
```

**metadata.json:**
```json
{
  "camera_height": 200.0,
  "orthographic_size": 50.0,
  "world_bounds": {
    "min_x": -500.0,
    "max_x": 2000.0,
    "min_z": -300.0,
    "max_z": 1500.0
  },
  "screenshots": [
    {
      "file": "screenshot_x000_z000.png",
      "world_position": {"x": 0.0, "z": 0.0},
      "coverage": {"width": 100.0, "height": 100.0}
    }
  ]
}
```

### Tile Generation Pipeline

**Python Script:** `build_pipeline/generate_tiles.py`

**Process:**
1. Stitch screenshots into single large image (using world coordinates from metadata)
2. Generate zoom pyramid (standard web map tiles)
3. Output to `tiles/{z}/{x}/{y}.png` format (Leaflet-compatible)

**Zoom Levels:**
- Configurable in `config.toml` (default: Z0-Z6)
- Z0: Entire world in 1 tile (256x256px)
- Z1: World in 2x2 tiles
- Z2: World in 4x4 tiles
- ...up to Z6 for detailed zoom
- **Note:** Cloudflare Pages free tier has ~25GB storage limit, but we should target 100-200MB max for map tiles

**Why Tile Pyramid?**
- Progressive loading (load only visible tiles)
- Zoom in/out smoothly
- CDN-friendly (cache individual tiles)

**Disk Space Estimation:**
```
Z0: 1 tile       = ~50KB
Z1: 4 tiles      = ~200KB
Z2: 16 tiles     = ~800KB
Z3: 64 tiles     = ~3MB
Z4: 256 tiles    = ~12MB
Z5: 1024 tiles   = ~50MB
Z6: 4096 tiles   = ~200MB (stay under this)
Total: ~266MB for all zoom levels
```

We'll monitor actual sizes and adjust `max_zoom` in config accordingly.

---

## Part 3: Build Pipeline

### Directory Structure

```
build_pipeline/
├── src/
│   └── compendium/
│       ├── __init__.py
│       ├── cli.py             # Main CLI entry point (Typer)
│       ├── config.py          # Configuration management
│       ├── models.py          # Pydantic models for validation
│       ├── build.py           # JSON → SQLite conversion
│       ├── tiles.py           # Screenshots → tile pyramid
│       ├── deploy.py          # Copy files to website
│       ├── icons.py           # Icon extraction from Unity
│       └── types_gen.py       # Generate TypeScript types from schema
├── schema.sql                  # Database schema definition
├── config.toml                 # Configuration file (paths, options)
├── pyproject.toml              # Python project config (uv)
└── .python-version             # Python version pinning (e.g., "3.12")
```

**Modern Python Tooling:**
- **uv**: Fast Python package manager (replaces pip/venv)
- **Typer**: Modern CLI framework using type hints
- **Rich**: Beautiful terminal output (colors, progress bars, tables)
- **Pydantic**: Data validation and type safety for JSON
- **ruff**: Fast linter and formatter (replaces flake8/black)
- **Pillow**: Image processing for tile generation
- **tomli**: TOML config file parsing
- **UnityPy**: Extract assets from Unity (for icons)

### Configuration

**config.toml:**
```toml
[paths]
# Where the game exports data (F9 in-game)
export_dir = "E:/ancient-kingdoms-export"

# Where the website source code lives
website_dir = "../website"

# Game directory (for UnityPy icon extraction)
game_dir = "E:/SteamLibrary/steamapps/common/Ancient Kingdoms"

[build]
# SQLite database filename
db_name = "compendium.db"

# Include debug info in database
debug_mode = false

# Validate all JSON against Pydantic models
strict_validation = true

[tiles]
# Tile pyramid zoom levels (0 = world in 1 tile)
min_zoom = 0
max_zoom = 6

# Tile size in pixels
tile_size = 256

# Image quality (1-100)
jpeg_quality = 85

[icons]
# Extract icons directly from game files using UnityPy
extract_icons = true

# Icon output size
icon_size = 64

# Image format (webp recommended for smaller size)
icon_format = "webp"  # webp, png
```

**Optional config file parameter:**
```bash
# Use default config.toml in build_pipeline/
uv run compendium build

# Use custom config (for testing different setups)
uv run compendium --config test-config.toml build
```

### CLI Tool

**Usage via `uv run`:**
```bash
# All-in-one: build + tiles + icons + types + deploy
uv run compendium all

# Individual commands:
uv run compendium build      # Build database from exported JSON
uv run compendium tiles      # Generate map tiles from screenshots
uv run compendium icons      # Extract icons from game files using UnityPy
uv run compendium types      # Generate TypeScript types from SQLite schema
uv run compendium deploy     # Deploy database + tiles + icons to website

# Utility commands:
uv run compendium validate   # Validate exported JSON without building
uv run compendium stats      # Show database statistics and file sizes

# Optional config file:
uv run compendium --config test-config.toml all

# Help:
uv run compendium --help
```

**Note:** We use `uv run` instead of installing as a standalone command for simplicity.

**Implementation:** Uses Typer for CLI framework, Rich for beautiful output (progress bars, colored logs, tables)

### Data Validation

**Pydantic Models** ensure type safety and validation:

```python
# compendium/models.py
from pydantic import BaseModel, Field

class Position(BaseModel):
    x: float
    y: float
    z: float

class ItemDrop(BaseModel):
    item_id: str
    rate: float = Field(ge=0.0, le=1.0)  # Must be 0-1

class Monster(BaseModel):
    id: str
    name: str
    zone_id: str
    position: Position
    level: int = Field(gt=0, le=200)
    health: int = Field(gt=0)
    is_boss: bool = False
    is_elite: bool = False
    drops: list[ItemDrop]
    # ... more fields
```

**Benefits:**
- ✅ Catches invalid data at import time
- ✅ Auto-generates documentation
- ✅ Type hints for IDE autocomplete
- ✅ Can export JSON Schema for validation in C# mod

### TypeScript Type Generation

Automatically generate TypeScript types from SQLite schema:

```bash
compendium types
```

**Output:** `website/src/lib/types.ts`
```typescript
// Auto-generated from SQLite schema - DO NOT EDIT

export interface Monster {
  id: string;
  name: string;
  zone_id: string;
  position_x: number;
  position_y: number;
  position_z: number;
  level: number;
  health: number;
  type: string;
  is_boss: boolean;
  is_elite: boolean;
  // ...
}

export interface Item {
  id: string;
  name: string;
  type: string;
  quality: string;
  level_required: number;
  // ...
}

// ... more types
```

**Benefits:**
- 🔒 Type safety between database and frontend
- 🔄 Single source of truth (SQLite schema)
- 🚫 No manual type synchronization
- ✨ IDE autocomplete everywhere

### Database Schema

```sql
-- Core Entities
CREATE TABLE zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level_min INTEGER,
  level_max INTEGER,
  bounds_min_x REAL,
  bounds_max_x REAL,
  bounds_min_z REAL,
  bounds_max_z REAL
);

CREATE TABLE monsters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  zone_id TEXT REFERENCES zones(id),
  position_x REAL,
  position_y REAL,
  position_z REAL,
  level INTEGER,
  health INTEGER,
  type TEXT,
  class TEXT,
  is_boss BOOLEAN,
  is_elite BOOLEAN,
  is_hunt BOOLEAN,
  respawn_time INTEGER,
  gold_min INTEGER,
  gold_max INTEGER,
  exp_multiplier REAL
);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  weapon_category TEXT,
  slot TEXT,
  quality TEXT,
  level_required INTEGER,
  class_required TEXT,        -- JSON array

  -- Stats (nullable, only populated for equipment)
  damage INTEGER,
  magic_damage INTEGER,
  defense INTEGER,
  magic_resist INTEGER,
  strength INTEGER,
  dexterity INTEGER,
  constitution INTEGER,
  intelligence INTEGER,
  wisdom INTEGER,
  charisma INTEGER,
  health_bonus INTEGER,
  mana_bonus INTEGER,
  critical_chance REAL,
  block_chance REAL,
  haste REAL,
  -- ... (all other stat fields)

  -- Economy
  buy_price INTEGER,
  sell_price INTEGER,
  tradable BOOLEAN,

  -- Flags
  is_quest_item BOOLEAN,
  has_gather_quest BOOLEAN,

  -- UI
  icon_path TEXT,
  tooltip TEXT
);

CREATE TABLE npcs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  zone_id TEXT REFERENCES zones(id),
  position_x REAL,
  position_y REAL,
  position_z REAL,
  faction TEXT,
  race TEXT,

  -- Roles (stored as JSON for flexibility)
  roles TEXT                    -- JSON object: {"is_merchant": true, ...}
);

CREATE TABLE quests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level_required INTEGER,
  level_recommended INTEGER,
  start_npc_id TEXT REFERENCES npcs(id),
  end_npc_id TEXT REFERENCES npcs(id),
  predecessor_id TEXT REFERENCES quests(id),
  type TEXT,
  is_main_quest BOOLEAN,
  is_epic_quest BOOLEAN,
  reward_gold INTEGER,
  reward_exp INTEGER,
  tooltip TEXT,
  tooltip_complete TEXT
);

CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  class TEXT,
  tier INTEGER,
  max_level INTEGER,
  level_required INTEGER,
  prerequisite_skill_id TEXT REFERENCES skills(id),
  prerequisite_level INTEGER,
  mana_cost INTEGER,
  energy_cost INTEGER,
  cooldown REAL,
  cast_time REAL,
  cast_range REAL,
  tooltip TEXT,
  icon_path TEXT
);

CREATE TABLE portals (
  id TEXT PRIMARY KEY,
  from_zone_id TEXT REFERENCES zones(id),
  to_zone_id TEXT REFERENCES zones(id),
  position_x REAL,
  position_y REAL,
  position_z REAL,
  destination_x REAL,
  destination_y REAL,
  destination_z REAL,
  required_item_id TEXT REFERENCES items(id),
  level_required INTEGER,
  is_closed BOOLEAN
);

-- Relationship Tables
CREATE TABLE monster_drops (
  monster_id TEXT REFERENCES monsters(id),
  item_id TEXT REFERENCES items(id),
  drop_rate REAL,
  PRIMARY KEY (monster_id, item_id)
);

CREATE TABLE npc_quests (
  npc_id TEXT REFERENCES npcs(id),
  quest_id TEXT REFERENCES quests(id),
  PRIMARY KEY (npc_id, quest_id)
);

CREATE TABLE npc_sells (
  npc_id TEXT REFERENCES npcs(id),
  item_id TEXT REFERENCES items(id),
  price INTEGER,
  PRIMARY KEY (npc_id, item_id)
);

CREATE TABLE quest_objectives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quest_id TEXT REFERENCES quests(id),
  type TEXT,
  target_id TEXT,            -- monster_id or item_id
  amount INTEGER,
  zone_id TEXT,
  position_x REAL,
  position_y REAL,
  position_z REAL
);

CREATE TABLE quest_rewards (
  quest_id TEXT REFERENCES quests(id),
  item_id TEXT REFERENCES items(id),
  class_specific TEXT,
  PRIMARY KEY (quest_id, item_id, COALESCE(class_specific, ''))
);

-- Indexes for Common Queries
CREATE INDEX idx_monsters_zone ON monsters(zone_id);
CREATE INDEX idx_monsters_level ON monsters(level);
CREATE INDEX idx_monsters_boss ON monsters(is_boss) WHERE is_boss = 1;
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_quality ON items(quality);
CREATE INDEX idx_items_level ON items(level_required);
CREATE INDEX idx_monster_drops_item ON monster_drops(item_id);
CREATE INDEX idx_npc_sells_item ON npc_sells(item_id);
CREATE INDEX idx_npcs_zone ON npcs(zone_id);
CREATE INDEX idx_quests_level ON quests(level_required);

-- Full-Text Search
CREATE VIRTUAL TABLE items_fts USING fts5(name, tooltip, content=items);
CREATE VIRTUAL TABLE monsters_fts USING fts5(name, content=monsters);
CREATE VIRTUAL TABLE npcs_fts USING fts5(name, content=npcs);
CREATE VIRTUAL TABLE quests_fts USING fts5(name, tooltip, content=quests);
```

**Design Notes:**
- `class_required` stored as JSON string (e.g., `'["Warrior", "Ranger"]'`)
- `roles` in NPCs stored as JSON for flexibility
- Positions always stored as separate x/y/z columns for efficient range queries
- FTS5 tables enable fuzzy search across names/tooltips

---

## Part 4: Website

### Tech Stack

**Framework:** SvelteKit (static site generation)
- Fast, lightweight, excellent DX
- Built-in SSG for SEO
- Component-based architecture
- TypeScript by default

**Package Manager:** pnpm
- Faster than npm/yarn
- Efficient disk space usage
- Strict dependency resolution

**Database:** sql.js-httpvfs
- Loads SQLite in browser via WASM
- HTTP range requests (doesn't download entire DB upfront)
- Read-only, perfect for static hosting

**Maps:** Leaflet.js
- Industry standard for web maps
- Custom tile layer support
- Extensive plugin ecosystem
- TypeScript definitions available

**Styling:** Tailwind CSS
- Utility-first CSS
- Rapid prototyping
- Consistent design system

**Icons:** Lucide Svelte
- Open-source, MIT licensed
- SVG-based
- Native Svelte components

**Code Quality:**
- TypeScript for type safety
- Prettier for formatting
- ESLint for linting

**Hosting:** Cloudflare Pages
- Free tier generous
- Global CDN
- Automatic deployments from Git

### Site Structure

```
website/
├── src/
│   ├── lib/
│   │   ├── db.ts                   # SQLite wrapper
│   │   ├── queries.ts              # Common SQL queries
│   │   ├── types.ts                # Auto-generated from schema
│   │   ├── stores.ts               # Svelte stores (bookmarks, etc.)
│   │   └── components/
│   │       ├── Search.svelte       # Global search bar
│   │       ├── ItemCard.svelte     # Item display card
│   │       ├── MonsterCard.svelte
│   │       ├── Map.svelte          # Leaflet map component
│   │       └── SEO.svelte          # Meta tags component
│   ├── routes/
│   │   ├── +layout.svelte          # Global layout
│   │   ├── +page.svelte            # Homepage
│   │   ├── items/
│   │   │   ├── +page.svelte        # Item browser
│   │   │   ├── +page.ts            # Load function
│   │   │   └── [id]/
│   │   │       ├── +page.svelte    # Individual item page
│   │   │       └── +page.ts        # SEO + load data
│   │   ├── monsters/
│   │   │   ├── +page.svelte        # Monster browser
│   │   │   └── [id]/
│   │   │       ├── +page.svelte    # Individual monster page
│   │   │       └── +page.ts        # SEO + load data
│   │   ├── npcs/
│   │   │   └── ...
│   │   ├── quests/
│   │   │   └── ...
│   │   ├── skills/
│   │   │   └── ...
│   │   └── map/
│   │       ├── +page.svelte        # Interactive world map
│   │       └── +page.ts            # Load function
│   ├── app.html                    # Base HTML template
│   └── service-worker.ts           # PWA service worker (optional)
├── static/
│   ├── compendium.db               # SQLite database
│   ├── tiles/                      # Map tiles
│   │   └── {z}/{x}/{y}.png
│   ├── icons/                      # Game icons (extracted via compendium icons)
│   │   ├── items/
│   │   ├── skills/
│   │   └── monsters/
│   ├── robots.txt                  # SEO
│   └── favicon.ico
├── package.json
├── pnpm-lock.yaml
├── svelte.config.js
├── tsconfig.json
├── tailwind.config.ts
└── vite.config.ts

# Note: Lucide Svelte used for UI icons (buttons, etc.). Game icons extracted separately for items/skills/monsters.
```

### Key Features

#### 1. Global Search
- Search bar in header
- Autocomplete suggestions
- Uses FTS5 for fuzzy matching
- Results grouped by type (Items, Monsters, NPCs, Quests)

#### 2. Item Browser
**Filters:**
- Type (weapon, armor, potion, etc.)
- Slot (main_hand, chest, head, etc.)
- Quality (common, rare, epic)
- Level range
- Class (show usable for selected class)
- Has stats (hide cosmetic items)

**Sorting:**
- Name (A-Z)
- Level (ascending/descending)
- Quality (rarity)
- Price
- Damage/Defense/etc. (stat-specific)

**View:**
- Grid of cards with icon, name, level, quality
- Hover for tooltip preview
- Click for detailed page

#### 3. Individual Item Page
**Sections:**
- **Header:** Icon, name, quality badge, level requirement
- **Stats:** Table of all non-zero stats
- **Acquisition:** Tabs for different sources
  - **Drops:** Table of monsters (name, zone, rate, map link)
  - **Vendors:** List of NPCs (name, location, price, map link)
  - **Quests:** List of quests that reward this item
- **Used In:** Quests that require this item (if any)

#### 4. Monster Browser
**Filters:**
- Zone
- Level range
- Type (boss, elite, normal)
- Monster type (Humanoid, Beast, Undead, etc.)

**Sorting:**
- Name
- Level
- Health

#### 5. Individual Monster Page
**Sections:**
- **Header:** Name, level, health, elite/boss badge
- **Location:** Zone name with "Show on Map" button
- **Stats:** Health, respawn time, exp multiplier
- **Loot Table:** Sortable table (item, rate, sell price)
  - Click item → go to item page
  - Highlight high-value drops

#### 6. Interactive World Map
**Features:**
- Leaflet map with custom tiles
- Layer toggles (checkboxes):
  - Monsters (color-coded by level)
  - NPCs (with role icons)
  - Bosses (distinct icon)
  - Portals
  - Quest objectives
- Cluster markers when zoomed out
- Click marker → popup with entity preview + link to detail page
- URL state: `/map?zone=volcanic_depths&entity=fire_elemental_001`

**Controls:**
- Search box (jump to entity on map)
- Zone dropdown (pan to zone)
- Level filter slider (hide entities outside range)

#### 7. Quest Browser
**Filters:**
- Level range
- Type (kill, gather, location)
- Main quest / Epic quest flags
- Zone

**Quest Chain Visualization:**
- Tree view showing prerequisites
- Click quest → highlight chain

#### 8. Skill Tree Viewer
**Features:**
- Visual tree layout (nodes + edges)
- Filter by class
- Hover for tooltip
- Click for details (costs, cooldown, effects)

### Example Queries (User Journey)

**"I'm level 45, what weapon should I get?"**
1. Navigate to Items page
2. Filter: Type=Weapon, Level≤45, Class=Warrior (if applicable)
3. Sort by: Damage (descending)
4. Click top result (e.g., "Flameburst Sword")
5. See: Drops from Fire Elemental (15% rate) in Volcanic Depths
6. Click "Show on Map" → map opens with Fire Elemental locations marked

**"Where do I find the Blacksmith in Stonewatch?"**
1. Use global search: "Blacksmith"
2. Click "Kara the Blacksmith" in results
3. See NPC page with map location
4. Click "Show on Map" → map pans to Kara's location

**"What quests are available at my level?"**
1. Navigate to Quests page
2. Set level filter: 40-45
3. Browse list, see prerequisites
4. Click quest → see objectives on map

### SEO & Discoverability

**Static Site Generation** for SEO-friendly pages:
```typescript
// +page.ts for item pages
export async function load({ params }) {
  const item = await db.getItem(params.id);

  return {
    item,
    // SEO metadata
    meta: {
      title: `${item.name} - Ancient Kingdoms Compendium`,
      description: `Level ${item.level_required} ${item.type}. ${item.tooltip}`,
      // Note: Icons TBD - may use Lucide icons initially, game textures later
      canonical: `/items/${item.id}`
    }
  };
}
```

**Features:**
- ✅ Pre-rendered pages for all items/monsters/NPCs/quests
- ✅ Open Graph tags (nice previews on social media)
- ✅ JSON-LD structured data (Google search enhancements)
- ✅ `sitemap.xml` auto-generated from database
- ✅ `robots.txt` configured
- ✅ Semantic HTML for accessibility

**Result:** Google "Ancient Kingdoms Flameburst Sword" → your site shows up!

### Performance & UX

**Core Web Vitals Optimization:**
- ⚡ Vite code splitting (only load what's needed)
- 🖼️ WebP images with fallback (smaller icons)
- 📦 SQLite range requests (don't download whole DB)
- 🗺️ Progressive map tile loading
- 💾 LocalStorage for bookmarks (no backend needed)
- 🔄 URL state management (shareable filter links)

**Progressive Web App (Optional V2):**
- 📱 Add to home screen
- 🔌 Offline support via service worker
- 🔔 Update notifications when new data available

### Accessibility

- ♿ ARIA labels on interactive elements
- ⌨️ Keyboard navigation support
- 🎨 WCAG 2.1 AA color contrast
- 🔍 Screen reader friendly
- 📱 Touch-friendly tap targets (44px minimum)

---

## Development Workflow

### Initial Setup

**Build Pipeline (Python):**
```bash
cd build_pipeline
uv sync                         # Install dependencies
cp config.toml.example config.toml  # Copy config template
# Edit config.toml with your paths
```

**Website (SvelteKit):**
```bash
cd website
pnpm install               # Install dependencies
```

**Git Hooks (Husky):**
```bash
cd website
pnpm exec husky init  # Initialize Husky
```

This creates `.husky/` directory with git hooks.

**Husky Configuration** (`.husky/pre-commit`):
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Format and lint
cd website && pnpm lint-staged
```

**lint-staged** (`package.json`):
```json
{
  "lint-staged": {
    "*.{ts,js,svelte}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

For Python (in `build_pipeline/`), add separate git hook:
**`.husky/pre-commit`** (extended):
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Lint Python
cd build_pipeline && uv run ruff check --fix && uv run ruff format

# Lint TypeScript
cd website && pnpm lint-staged
```

### Data Extraction & Build

**Complete workflow (recommended):**
```bash
# 1. In-game: Press Shift+F9 (export data) + Shift+F10 (take screenshots)

# 2. Build everything + deploy to website
cd build_pipeline
compendium all
```

**Step-by-step (if needed):**
```bash
# Build database from JSON
compendium build

# Generate map tiles from screenshots
compendium tiles

# Copy to website static folder
compendium deploy
```

**Example CLI Output:**
```
$ compendium all

🏗️  Building Compendium Database
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% 0:00:02

✅ Database built successfully!

┏━━━━━━━━━━━━┳━━━━━━━┓
┃ Table      ┃ Rows  ┃
┡━━━━━━━━━━━━╇━━━━━━━┩
│ monsters   │ 1,247 │
│ items      │ 3,891 │
│ npcs       │ 412   │
│ quests     │ 523   │
│ skills     │ 187   │
└────────────┴───────┘

🗺️  Generating Map Tiles
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% 0:00:15

✅ Generated 2,048 tiles (zoom levels 0-6)

📦 Deploying to Website
Copying compendium.db → website/static/
Copying tiles/ → website/static/tiles/

✨ Done! Ready to run: cd website && pnpm dev
```

### Development Server

```bash
cd website
pnpm dev                   # Start dev server at http://localhost:5173
```

### After Game Updates

```bash
# 1. In-game: Press Shift+F9 (re-export data)
# 2. (Optional) Press Shift+F10 if map changed

# 3. Rebuild + deploy
cd build_pipeline
compendium all

# 4. Git commit + push → auto-deploy to Cloudflare Pages
```

**Time:** <5 minutes per update (vs hours for AssetRipper)

### CI/CD Pipeline

**GitHub Actions** (`.github/workflows/ci.yml`):
```yaml
name: CI

on: [push, pull_request]

jobs:
  lint-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: cd build_pipeline && uv sync
      - run: cd build_pipeline && uv run ruff check
      - run: cd build_pipeline && uv run ruff format --check

  lint-typescript:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: cd website && pnpm install
      - run: cd website && pnpm lint
      - run: cd website && pnpm format:check

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: cd website && pnpm install
      - run: cd website && pnpm check  # svelte-check

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: cd website && pnpm install
      - run: cd website && pnpm build
```

**Cloudflare Pages Deployment** (automatic):
- Connected to GitHub repository
- Auto-deploys on push to `main`
- Preview deployments for PRs
- Build command: `cd website && pnpm build`
- Output directory: `website/build`

**Branch Strategy:**
- `main`: Production (auto-deploys to Cloudflare)
- `dev`: Development branch
- Feature branches for new features

---

## Technology Choices - Rationale

**Why uv (Python)?**
- 10-100x faster than pip
- Single tool for dependencies + virtual environments
- Built-in workspace support
- Lock file for reproducible builds
- Modern, actively developed

**Why Typer + Rich (CLI)?**
- Typer: Type hints → automatic CLI (no manual argparse)
- Rich: Beautiful terminal output (progress bars, tables, colors)
- Excellent developer experience
- Self-documenting via type hints
- Industry standard for modern Python CLIs

**Why pnpm (Node)?**
- 2-3x faster than npm
- Saves disk space (content-addressable store)
- Strict dependency resolution (no phantom deps)
- Workspaces support for monorepos
- Industry standard in modern projects

**Why TypeScript?**
- Type safety prevents bugs
- Better IDE autocomplete
- Self-documenting code
- SvelteKit has first-class support
- Industry standard for serious projects

**Why SvelteKit?**
- Lighter than React/Vue
- Excellent static generation
- Built-in routing
- Great DX
- TypeScript by default

**Why SQLite in Browser?**
- No backend needed
- Complex queries (joins, FTS, aggregates)
- Efficient: range requests load only needed data
- Single file deployment

**Why Leaflet?**
- Open-source, widely used
- Custom tile support
- Excellent docs, plugins
- Lightweight
- TypeScript definitions available

**Why Custom Screenshots vs Game Minimap?**
- Minimaps often stylized/abstract
- Screenshots = pixel-perfect accuracy
- Full control over camera angle
- Can highlight entities, remove clutter

**Why Static Site?**
- Zero hosting cost (Cloudflare free tier)
- Global CDN (fast everywhere)
- No scaling concerns
- No backend to maintain
- Can add backend later if needed (comments, etc.)

---

## Future Enhancements (Out of Scope for V1)

- **Build Planner:** Save gear sets, calculate stats
- **DPS Calculator:** Simulate combat scenarios
- **Loot Simulator:** Roll drops based on rates (fun tool)
- **User Accounts:** Save favorites, builds (requires backend)
- **Comments:** Community tips on items/quests (requires backend)
- **Crowdsourced Data:** User-submitted drop rates (requires backend)
- **Mobile App:** React Native wrapper with offline support
- **Dark Mode:** Theme toggle

---

## Open Questions

1. **Icon Extraction:** ✅ SOLVED
   - Use UnityPy to extract sprites directly from game files (no AssetRipper needed!)
   - Reads from game's `.assets` and `.bundle` files
   - Converts to WebP for smaller size
   - `compendium icons` command handles this
   - One-time extraction, updated only when new items added

2. **Map Screenshot Resolution:**
   - Test empirically in mod
   - Make configurable via `config.toml` (camera height, tile size)
   - Start with zoom levels 0-6, adjust if needed

3. **Performance:**
   - Leaflet can handle 1000+ markers with clustering (Leaflet.markercluster)
   - Use `compendium stats` to check entity counts
   - If >5000 entities per zone, implement server-side filtering

4. **Coordinate System:** ✅ SOLVED
   - Game uses Unity coordinates (Y-up, left-handed)
   - Map uses X/Y (2D)
   - Transform: map_x = game_x, map_y = game_z (ignore Y/height)

5. **Database Size:**
   - Initial estimate: ~5-10MB (compressed with gzip)
   - sql.js-httpvfs loads via range requests (lazy loading)
   - Monitor with `compendium stats --size`

6. **Sample Data for Development:**
   - Create `compendium sample` command
   - Generates fake data for local development
   - No need to run game to develop website

---

## Success Metrics

**V1 Goals:**
- ✅ Complete item/monster/NPC database
- ✅ Working search functionality
- ✅ Accurate world map with entity markers
- ✅ <3 second page load time
- ✅ Mobile-responsive design
- ✅ Update workflow <5 minutes after game patch

**Long-term:**
- SEO-optimized (Google index for "Ancient Kingdoms [item name]")
- Community adoption (players bookmark/share)
- Comprehensive coverage (100% of game content)

---

## Architecture Improvements Summary

This architecture includes several modern best practices beyond the basic requirements:

### Developer Experience (DX)
- ✅ **Single CLI command** (`compendium`) instead of multiple scripts
- ✅ **Configuration file** (config.toml) - no hardcoded paths
- ✅ **Type generation** - SQLite schema → TypeScript types automatically
- ✅ **Data validation** - Pydantic models catch errors early
- ✅ **Pre-commit hooks** - Auto-format/lint on commit
- ✅ **CI/CD pipeline** - GitHub Actions for automated testing
- ✅ **Sample data generation** - Develop website without game export
- ✅ **Beautiful CLI output** - Rich progress bars and tables

### User Experience (UX)
- ✅ **SEO optimization** - Pre-rendered pages, Open Graph, sitemaps
- ✅ **Performance** - Code splitting, WebP images, lazy loading
- ✅ **Accessibility** - WCAG 2.1 AA, keyboard navigation, ARIA labels
- ✅ **Shareable URLs** - Filter state in URL parameters
- ✅ **Responsive design** - Mobile-friendly throughout
- ✅ **Offline bookmarks** - LocalStorage (no backend needed)

### Code Quality
- ✅ **Type safety** - TypeScript + Pydantic across stack
- ✅ **Modern tooling** - uv, pnpm, Typer, Rich, Ruff
- ✅ **Linting/formatting** - Automated with pre-commit
- ✅ **Testing infrastructure** - Playwright config ready
- ✅ **Documentation** - Auto-generated from types

### Deployment
- ✅ **Zero-cost hosting** - Cloudflare Pages free tier
- ✅ **Auto-deployment** - Push to main → live in minutes
- ✅ **Preview deployments** - Every PR gets a preview URL
- ✅ **Global CDN** - Fast everywhere

### Maintainability
- ✅ **Single source of truth** - SQLite schema defines everything
- ✅ **Validation at boundaries** - Pydantic validates game exports
- ✅ **Clear separation** - Mods → CLI → Website pipeline
- ✅ **Configurable** - Easy to adjust paths, zoom levels, etc.
- ✅ **Extensible** - Add new entity types by updating schema

**Total Setup Time:** ~30 minutes
**Update Time After Game Patch:** <5 minutes
**Cost:** $0 (Cloudflare free tier)
