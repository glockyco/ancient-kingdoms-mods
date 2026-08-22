# Build Pipeline

Python CLI for processing game data exports into deployment-ready artifacts.

## Overview

```
exported-data/ (JSON + Screenshots + Runtime Images)
    ↓ compendium build
website/data/compendium.db + website/static/images/
    ↓ compendium tiles
website/static/tiles/
```

The database goes to `website/data/`. Images and tiles go to `website/static/`.

## CLI Commands

```bash
cd build-pipeline
uv run compendium build   # JSON → SQLite (to website/static/)
uv run compendium tiles   # Screenshots → tile pyramid
uv run compendium stats   # Database statistics
# DataExporter writes exported-data/visual_assets.json and exported-data/images/
```

`uv run compendium tiles` validates the stitched screenshot source at non-excluded boss/world-boss spawn positions before replacing `website/static/tiles`. A validation failure means the screenshot export is bad; re-export screenshots from the game before retrying tile generation.

Selected visual images are produced by the DataExporter runtime export as `exported-data/visual_assets.json` plus files under `exported-data/images/`. `compendium build` loads the manifest into the `visual_assets` table and copies public image files to `website/static/images/` with readable paths such as `images/monsters/zarothak_the_tormentor/primary.png`. The old standalone `visual-audit` HotRepl/UnityPy mapping pipeline is removed. Runtime findings and current exclusions are documented in `docs/visual-audit-runtime-findings.md`.

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
├── loaders/            # JSON loading (30 loaders)
│   └── core.py         # All load_* functions
├── denormalizers/      # Post-load denormalization
│   ├── exclusions.py   # Zone coordinate exclusions
│   ├── experience/     # EXP calculations
│   ├── items/          # sources, usages, equipment, tooltips, special_types, calculations, zones, source_entries, crafting_source_level
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
2. Load data in foreign key order (30 loaders)
3. Apply redactions from `redactions.toml`
4. Run denormalizers in dependency order
5. Optimize 13 FTS5 indexes
6. VACUUM and ANALYZE

## Denormalizer System

Builds reverse relationships and derived fields. Organized by **target entity** (the table being UPDATED). Execution order matters for dependencies.

**Adding a denormalizer:**
1. Create module in `denormalizers/{entity}/`
2. Implement function taking `conn: sqlite3.Connection`
3. Register in entity's `__init__.py`
4. Add call in `denormalizers/__init__.py` `run_all()`

## Redaction System

`redactions.toml` at the repo root is required. The build fails without it,
because an empty configuration publishes everything redaction removes.

Two families of mechanism live in `src/compendium/redactions/`.

**Attribute redaction** keeps the entity and removes part of its data:
- `zones.suppress_positions.zone_ids` - clear the geometry of a released zone
  whose positions the game withholds from the player (`geometry.py`)
- `items.hide_crafting.ids` - remove the recipes producing an item, and publish
  the item (`crafting.py`)

**Entity redaction** removes the entity and everything left with no other
source, by following declared references to a fixpoint (`closure.py`):
- `zones.exclude_unreleased.zone_ids` - a zone that has not shipped
- `entities.exclude.ids` - content that no rule over the references can select
- items carrying `ignore_journal`, which the game marks internal

Supporting modules: `config.py` reads the file, `discovery.py` reads the
reference graph from the schema, `references.py` declares what each reference
means, `ledger.py` records every decision, `verify.py` fails the build when a
published value still names removed content.

`redactions.lock.json` records each removal with its mechanism, reason, pass
number, and the entities it followed, plus the per-zone and per-item counts of
the attribute mechanisms.

```bash
uv run compendium redactions check              # decisions match the ledger
uv run compendium redactions sync               # rewrite the ledger, deliberately
uv run compendium redactions explain <entity>   # why something is absent
uv run compendium redactions verify             # scan the published surfaces
```

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
