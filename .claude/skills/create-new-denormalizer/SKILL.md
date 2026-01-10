---
name: create-new-denormalizer
description: Create a denormalizer for computed/derived fields in the build pipeline
---

## Overview

Denormalizers transform normalized relational data into denormalized JSON fields optimized for client-side querying. They run after data loading and before FTS indexing.

## Steps

1. **Create module** in `build-pipeline/src/compendium/denormalizers/{entity}/`
2. **Define TypedDict** in `build-pipeline/src/compendium/types/denormalized.py` (if returning structured JSON)
3. **Implement function** taking `conn: sqlite3.Connection`
4. **Register** in entity's `__init__.py`
5. **Add call** in `denormalizers/__init__.py` `run_all()` (order matters!)

## Module Template

```python
"""Description of what this denormalizer does."""

import json
import sqlite3

from rich.console import Console

console = Console()


def run(conn: sqlite3.Connection) -> None:
    """Run the denormalization.
    
    Describe what data is being denormalized and why.
    """
    console.print("Denormalizing {entity} {field}...")
    cursor = conn.cursor()
    
    # Query source data
    cursor.execute("""
        SELECT id, source_field
        FROM source_table
        WHERE condition
    """)
    source_data = cursor.fetchall()
    
    # Build lookup or process data
    updated_count = 0
    for row in source_data:
        # Process and update
        cursor.execute(
            "UPDATE target_table SET denorm_field = ? WHERE id = ?",
            (json.dumps(processed_data), row[0]),
        )
        updated_count += 1
    
    conn.commit()
    console.print(f"  [green]OK[/green] Updated {updated_count} records")
```

## Execution Order

Denormalizers run in dependency order. If your denormalizer reads data produced by another, it must run after.

Example order in `run_all()`:

```python
def run_all(conn: sqlite3.Connection) -> None:
    # Monster drops first (needed by item sources)
    monsters.run_drops(conn)
    
    # Item sources reads monster drops
    items.run_all(conn)
    
    # Search keywords last (reads all denormalized fields)
    search.run_all(conn)
```

## TypedDict for JSON Structure

When storing structured JSON, define the shape:

```python
# In build-pipeline/src/compendium/types/denormalized.py
class DropInfo(TypedDict):
    item_id: str
    item_name: str
    quality: int
    rate: float
    note: str | None
```

## Key Files

- `build-pipeline/src/compendium/denormalizers/__init__.py` - Execution order
- `build-pipeline/src/compendium/denormalizers/monsters/drops.py` - Good example
- `build-pipeline/src/compendium/denormalizers/items/sources.py` - Complex example
- `build-pipeline/src/compendium/types/denormalized.py` - TypedDict definitions

## Patterns

### Building Lookups

```python
# Build item name lookup
cursor.execute("SELECT id, name FROM items")
item_names = {row[0]: row[1] for row in cursor.fetchall()}
```

### Updating JSON Fields

```python
# Parse, modify, and update JSON field
drops = json.loads(drops_json) if drops_json else []
drops.append({"item_id": "new_item", "rate": 0.1})
cursor.execute(
    "UPDATE monsters SET drops = ? WHERE id = ?",
    (json.dumps(drops), monster_id),
)
```

### Aggregating from Joins

```python
cursor.execute("""
    SELECT m.id, GROUP_CONCAT(z.name, ', ')
    FROM monsters m
    JOIN monster_spawns ms ON ms.monster_id = m.id
    JOIN zones z ON z.id = ms.zone_id
    GROUP BY m.id
""")
```

## Gotchas

- Always `conn.commit()` at the end
- Use `console.print()` with rich formatting for logging
- JSON fields may be NULL - always check before parsing
- Order in `run_all()` is critical for dependencies
- Denormalizers organized by **target entity** (table being updated)
