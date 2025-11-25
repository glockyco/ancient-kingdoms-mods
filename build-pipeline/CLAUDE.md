# Build Pipeline - Developer Documentation

This directory contains the Python-based build pipeline for processing Ancient Kingdoms game data exports into deployment-ready artifacts for the compendium website.

## Overview

The build pipeline transforms raw game data into a production-ready database and map tiles:

```
Game Data Exports (JSON + Screenshots)
    ↓
Build Pipeline (Python CLI)
    ↓
Deployment Artifacts (SQLite + Tiles + Icons + TypeScript Types)
    ↓
Website Static Assets
```

## Architecture

### Directory Structure

```
build-pipeline/
├── src/
│   └── compendium/
│       ├── __init__.py
│       ├── cli.py              # Main CLI entry (Typer app)
│       ├── config.py           # Configuration loading
│       ├── db.py               # Database utilities (create_database, insert_model, etc.)
│       ├── models.py           # Pydantic validation models for JSON loading
│       │
│       ├── commands/           # CLI command implementations
│       │   ├── __init__.py
│       │   ├── build.py        # JSON → SQLite (orchestrates loaders + denormalizers)
│       │   └── stats.py        # Database statistics
│       │
│       ├── loaders/            # Data loading from JSON exports
│       │   ├── __init__.py     # Re-exports all load_* functions
│       │   └── core.py         # All load_* functions (items, monsters, npcs, etc.)
│       │
│       ├── denormalizers/      # Post-load denormalization by target entity
│       │   ├── __init__.py     # Orchestrates all denormalizers via run_all()
│       │   ├── items/          # Denormalizations that UPDATE items table
│       │   │   ├── __init__.py
│       │   │   ├── sources.py      # dropped_by, gathered_from, sold_by, rewarded_by, etc.
│       │   │   ├── usages.py       # used_in_recipes, needed_for_quests, opens_chests, etc.
│       │   │   ├── equipment.py    # armor sets, buff names, faction tiers
│       │   │   ├── special_types.py # chests, packs, treasure maps, luck tokens
│       │   │   └── calculations.py  # item_level, primal_essence
│       │   └── skills/         # Denormalizations that UPDATE skills table
│       │       ├── __init__.py
│       │       └── sources.py      # granted_by_items (potions, food, scrolls, etc.)
│       │
│       ├── types/              # TypedDict definitions for denormalized JSON structures
│       │   ├── __init__.py
│       │   └── denormalized.py # DropInfo, GatherSourceInfo, SoldByInfo, etc.
│       │
│       └── utils/              # Shared utilities
│           ├── __init__.py
│           └── paths.py        # Path utilities
│
├── schema.sql                   # Database schema definition
├── pyproject.toml               # uv project configuration
├── .python-version              # Python version (3.12)
└── CLAUDE.md                    # This file
```

### Command Architecture

Each command is a self-contained module that:
- Takes configuration from `../config.toml`
- Performs a specific transformation
- Reports progress via Rich console output
- Returns exit code 0 on success, 1 on error

#### Command Pattern

```python
# commands/example.py
from rich.console import Console

console = Console()

def run(config: dict) -> None:
    """Command implementation"""
    console.print("[bold]Running example command...[/bold]")
    # Do work
    console.print("[green]✓[/green] Complete!")
```

### Denormalizer Architecture

The denormalizer system builds reverse relationships and derived fields after all data is loaded. It's organized by **target entity** - the entity being UPDATED, not read.

#### Organization Principle

**Rule**: Denormalization code lives with the entity being UPDATED, not the entity being READ.

For example:
- `dropped_by` on items → lives in `denormalizers/items/sources.py` (updates items)
- `drops` on monsters → would live in `denormalizers/monsters/` (updates monsters)
- Both read monsters table to build these relationships

This means bidirectional relationships naturally split between folders.

#### Denormalizer Categories

**Items** (`denormalizers/items/`):
- `sources.py` - Where items come from: drops, gathering, vendors, quests, altars, crafting
- `usages.py` - Where items are used: recipes, quests, currency, altars, portals, chest keys
- `equipment.py` - Equipment-specific: armor sets, buff names, faction tiers
- `special_types.py` - Special item behavior: chests, packs, treasure maps, luck tokens
- `calculations.py` - Derived values: item_level, primal_essence

**Skills** (`denormalizers/skills/`):
- `sources.py` - What grants skills: potions, food, scrolls, weapon procs, relics

#### Adding a New Denormalizer

1. Create module in appropriate entity folder (or new folder if new entity)
2. Implement `run(conn: sqlite3.Connection) -> None`
3. Add to entity's `__init__.py` `run_all()` function
4. Use TypedDicts from `types/denormalized.py` for JSON structures

```python
# denormalizers/items/new_feature.py
import json
import sqlite3
from rich.console import Console

console = Console()

def run(conn: sqlite3.Connection) -> None:
    """Run new feature denormalization."""
    console.print("Denormalizing new feature...")
    cursor = conn.cursor()

    # Query and process data
    # ...

    conn.commit()
    console.print(f"  [green]OK[/green] Updated X items")
```

#### Extending to New Entities

When adding entity pages (e.g., zones, monsters, NPCs):

1. Create `denormalizers/{entity}/` folder
2. Organize by what that entity needs:
   - `sources.py` - Where it comes from
   - `usages.py` - Where it's referenced
   - etc.
3. Register in `denormalizers/__init__.py`

### Configuration System

The build pipeline reads from the **root `config.toml`** file (see Configuration section below).

```python
# config.py
import tomllib
from pathlib import Path

def load_config(config_path: Path | None = None) -> dict:
    """Load configuration from root config.toml"""
    if config_path is None:
        # Default: repository root
        config_path = Path(__file__).parent.parent.parent.parent / "config.toml"

    with open(config_path, "rb") as f:
        return tomllib.load(f)
```

### Data Validation

All JSON exports are validated using Pydantic models that mirror the C# export structure:

```python
# models.py
from pydantic import BaseModel

class Position(BaseModel):
    x: float
    y: float
    z: float

class MonsterData(BaseModel):
    id: str
    name: str
    position: Position
    level: int
    # ... matches DataExporter JSON output
```

**Benefits:**
- Type safety
- Early error detection
- Auto-generated validation errors
- Documentation through types

## CLI Usage

### Installation

```bash
cd build-pipeline

# Install dependencies with uv
uv sync
```

### Commands

```bash
# Run entire pipeline
uv run compendium all

# Individual commands
uv run compendium build      # JSON → SQLite
uv run compendium tiles      # Screenshots → tile pyramid
uv run compendium icons      # Extract game icons
uv run compendium types      # Generate TypeScript types
uv run compendium deploy     # Deploy to website/static/
uv run compendium validate   # Validate JSON exports
uv run compendium stats      # Show database statistics

# Use custom config file
uv run compendium --config dev.toml all
```

### Typical Workflow

```bash
# 1. In-game: Export data and screenshots
#    Shift+F9 (DataExporter)
#    Shift+F10 (MapScreenshotter)

# 2. Process everything
cd build-pipeline
uv run compendium all

# 3. Artifacts are deployed to ../website/static/
#    - compendium.db
#    - tiles/z/x/y.png
#    - icons/*.webp
#    - ../website/src/lib/types.ts
```

## Commands Reference

### `compendium build`

Converts JSON exports to SQLite database.

**Input:**
- `{export_dir}/monsters.json`
- `{export_dir}/npcs.json`
- `{export_dir}/items.json`
- `{export_dir}/quests.json`
- `{export_dir}/skills.json`
- `{export_dir}/portals.json`
- `{export_dir}/zone_info.json`
- `{export_dir}/zone_triggers.json`
- `{export_dir}/gather_items.json`
- `{export_dir}/crafting_recipes.json`
- `{export_dir}/summon_triggers.json`

**Output:**
- `{build_dir}/compendium.db` - SQLite database with FTS5 search

**Process:**
1. Load and validate JSON with Pydantic
2. Create database from schema.sql
3. Insert data with proper relationships
4. Build FTS5 search indexes

### `compendium tiles`

Generates Leaflet-compatible map tile pyramid.

**Input:**
- `{export_dir}/screenshots/world_x000_y000.png` (grid of 1024x1024 tiles)
- `{export_dir}/screenshots/metadata.json`

**Output:**
- `{build_dir}/tiles/z/x/y.png` - Tile pyramid (zoom levels 0-6)

**Process:**
1. Stitch individual screenshots into full world map (using grid indices)
2. Generate tile pyramid at zoom levels 0-6
3. Optimize images (JPEG quality from config)

**Configuration:**
```toml
[build_pipeline.tiles]
min_zoom = 0
max_zoom = 6
tile_size = 256
jpeg_quality = 85
```

### `compendium icons`

Extracts game icons using UnityPy.

**Input:**
- `{game.install_path}/Ancient Kingdoms_Data/` (Unity assets)

**Output:**
- `{build_dir}/icons/*.webp` - Extracted icons

**Process:**
1. Use UnityPy to read Unity asset files
2. Extract sprite textures
3. Convert to WebP format
4. Resize to configured size

**Configuration:**
```toml
[build_pipeline.icons]
enabled = true
format = "webp"
size = 64
```

### `compendium types`

Generates TypeScript types from SQLite schema.

**Input:**
- `{build_dir}/compendium.db` - SQLite database

**Output:**
- `{website_dir}/src/lib/types.ts` - TypeScript interfaces

**Process:**
1. Read SQLite schema
2. Map SQL types to TypeScript types
3. Generate interfaces for all tables
4. Add JSDoc comments

**Example Output:**
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
  // ...
}
```

### `compendium deploy`

Copies build artifacts to website static directory.

**Input:**
- `{build_dir}/compendium.db`
- `{build_dir}/tiles/`
- `{build_dir}/icons/`

**Output:**
- `{website_dir}/static/compendium.db`
- `{website_dir}/static/tiles/`
- `{website_dir}/static/icons/`

**Process:**
1. Copy database file
2. Copy tile directory
3. Copy icons directory
4. Report file sizes and counts

### `compendium validate`

Validates JSON exports without building database.

**Input:**
- All JSON files in `{export_dir}/`

**Output:**
- Console report of validation results

**Process:**
1. Load each JSON file
2. Validate against Pydantic models
3. Report errors with file/line numbers
4. Exit 0 if valid, 1 if errors

### `compendium stats`

Shows database statistics.

**Input:**
- `{build_dir}/compendium.db`

**Output:**
- Rich table with row counts, file sizes

**Example Output:**
```
┏━━━━━━━━━━━━━━━━━━┳━━━━━━━━┓
┃ Table            ┃ Rows   ┃
┡━━━━━━━━━━━━━━━━━━╇━━━━━━━━┩
│ monsters         │ 1,247  │
│ items            │ 3,891  │
│ npcs             │ 412    │
│ quests           │ 523    │
│ skills           │ 187    │
└──────────────────┴────────┘

Database size: 8.4 MB
```

### `compendium all`

Runs the complete pipeline in order:

1. `validate` - Ensure JSON is valid
2. `build` - Create database
3. `tiles` - Generate map tiles
4. `icons` - Extract icons (if enabled)
5. `types` - Generate TypeScript types
6. `deploy` - Copy to website
7. `stats` - Show summary

## Dependencies

```toml
[project]
dependencies = [
    "typer>=0.12.0",      # CLI framework
    "rich>=13.7.0",       # Beautiful terminal output
    "pydantic>=2.5.0",    # Data validation
    "pillow>=10.0.0",     # Image processing
    "unitypy>=1.10.0",    # Unity asset extraction
]
```

**Why these?**
- **Typer**: Type-safe CLI with automatic help generation
- **Rich**: Beautiful progress bars, tables, colored output
- **Pydantic**: Runtime type validation matching C# exports
- **Pillow**: Image stitching and tile pyramid generation
- **UnityPy**: Extract sprites from Unity asset bundles

## Error Handling

### Validation Errors

Pydantic validation errors show exactly what's wrong:

```
ValidationError: 2 validation errors for MonsterData
position.x
  Input should be a valid number [type=float_type, input_value='invalid']
level
  Input should be greater than 0 [type=greater_than, input_value=-5]
```

### File Not Found

```
Error: Export directory not found: E:/ancient-kingdoms-export
Check config.toml [paths.export_dir] setting.
```

### Database Errors

```
Error: Failed to create database: table 'monsters' already exists
Delete {build_dir}/compendium.db or use --force flag.
```

## Development

### Adding a New Command

1. Create `commands/newcommand.py`:
```python
import typer
from rich.console import Console

console = Console()

def run(config: dict) -> None:
    """Short description of command"""
    console.print("[bold]Running new command...[/bold]")
    # Implementation
    console.print("[green]✓[/green] Done!")
```

2. Register in `cli.py`:
```python
from compendium.commands import newcommand

@app.command()
def new():
    """Short description"""
    config = load_config()
    newcommand.run(config)
```

3. Update IMPLEMENTATION_PLAN.md

### Adding a New Data Type

1. Add Pydantic model to `models.py` for JSON validation
2. Update `schema.sql` with table definition
3. Add `load_{entity}()` function to `loaders/core.py`
4. Export from `loaders/__init__.py`
5. Call loader in `commands/build.py` (order matters for foreign keys)
6. If entity needs denormalized fields:
   - Add TypedDicts to `types/denormalized.py`
   - Create denormalizer in `denormalizers/{entity}/`
   - Register in `denormalizers/__init__.py`

## Future Enhancements

- [ ] Progress bars for long-running operations
- [ ] Parallel processing for tile generation
- [ ] Incremental builds (only process changed files)
- [ ] Compression for deployed artifacts
- [ ] Sample data generator for testing
