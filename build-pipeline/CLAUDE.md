# Build Pipeline

Python CLI for processing game data exports into deployment-ready artifacts.

## Overview

```
exported-data/ (JSON + Screenshots)
    ↓ compendium build
website/static/compendium.db
    ↓ compendium tiles
website/static/tiles/
```

Output goes directly to `website/static/`.

## CLI Commands

```bash
cd build-pipeline
uv run compendium build   # JSON → SQLite (to website/static/)
uv run compendium tiles   # Screenshots → tile pyramid
uv run compendium stats   # Database statistics
```

Global option: `--config FILE` to override config.toml location.

## Architecture

```
src/compendium/
├── cli.py              # Typer CLI entry point
├── config.py           # config.toml loading
├── db.py               # SQLite utilities
├── models.py           # Pydantic validation models
├── redaction.py        # Redaction config (redactions.toml)
├── constants.py        # Shared constants
├── commands/           # CLI command implementations
│   ├── build.py        # JSON → SQLite
│   ├── tiles.py        # Screenshot → tiles
│   └── stats.py        # Database statistics
├── loaders/            # JSON loading (21 loaders)
│   └── core.py         # All load_* functions
├── denormalizers/      # Post-load denormalization
│   ├── exclusions.py   # Zone coordinate exclusions
│   ├── experience/     # EXP calculations
│   ├── items/          # sources, usages, equipment, tooltips, special_types, calculations
│   ├── monsters/       # spawns, drops, levels
│   ├── npcs/           # relations, bitmask
│   ├── quests/         # tooltips, display_type
│   ├── search/         # FTS5 keywords
│   ├── skills/         # sources
│   └── zones/          # levels, bounds
└── types/              # TypedDicts for denormalized JSON
```

## Build Process

1. Create database from `schema.sql`
2. Load data in foreign key order (21 loaders)
3. Apply redactions from `redactions.toml`
4. Run denormalizers in dependency order
5. Optimize 11 FTS5 indexes
6. VACUUM and ANALYZE

## Denormalizer System

Builds reverse relationships and derived fields. Organized by **target entity** (the table being UPDATED). Execution order matters for dependencies.

**Adding a denormalizer:**
1. Create module in `denormalizers/{entity}/`
2. Implement function taking `conn: sqlite3.Connection`
3. Register in entity's `__init__.py`
4. Add call in `denormalizers/__init__.py` `run_all()`

## Redaction System

Optional `redactions.toml` at repo root excludes sensitive data:
- `items.hide_crafting.ids` - Hide crafting recipes for specific items
- `quests.exclude.ids` - Exclude specific quests
- `items.exclude_ignore_journal` - Exclude items with ignore_journal=true

## Adding New Data Types

1. Add Pydantic model to `models.py`
2. Update `schema.sql` with table definition
3. Add `load_{entity}()` to `loaders/core.py`
4. Export from `loaders/__init__.py`
5. Call loader in `commands/build.py` (order matters for foreign keys)
6. If denormalized fields needed, create denormalizer

## Configuration

Reads from root `config.toml`:

```toml
[paths]
export_dir = "./exported-data"
website_dir = "./website"

[build_pipeline]
db_name = "compendium.db"

[build_pipeline.tiles]
min_zoom = -3
max_zoom = 3
tile_size = 256
webp_quality = 85
```
