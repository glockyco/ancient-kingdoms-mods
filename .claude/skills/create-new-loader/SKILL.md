---
name: create-new-loader
description: Create a loader for importing JSON data into the SQLite database
---

## Overview

Loaders read JSON files exported by DataExporter mods, validate with Pydantic models, and insert into SQLite tables. They run in foreign key order.

## Steps

1. **Add Pydantic model** to `build-pipeline/src/compendium/models.py`
2. **Update schema** in `build-pipeline/schema.sql`
3. **Add loader function** to `build-pipeline/src/compendium/loaders/core.py`
4. **Export from** `loaders/__init__.py`
5. **Call loader** in `commands/build.py` (order matters for foreign keys)

## Pydantic Model Template

```python
# In models.py
class MyEntity(BaseModel):
    """Represents a my_entity from the game."""
    
    id: str
    name: str
    level: int = 0
    zone_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    
    # Validation
    drop_rate: float = Field(ge=0.0, le=1.0, default=0.0)
```

## Schema Template

```sql
-- In schema.sql
CREATE TABLE my_entities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 0,
    zone_id TEXT REFERENCES zones(id),
    tags TEXT,  -- JSON array
    drop_rate REAL NOT NULL DEFAULT 0.0
);

CREATE INDEX idx_my_entities_zone ON my_entities(zone_id);
```

## Loader Template

```python
# In loaders/core.py
from compendium.db import insert_model

def load_my_entities(
    conn: sqlite3.Connection,
    export_dir: Path,
    console: Console,
) -> None:
    """Load my_entities from JSON export."""
    console.print("Loading my_entities...")
    
    json_path = export_dir / "my_entities.json"
    if not json_path.exists():
        console.print("  [yellow]SKIP[/yellow] my_entities.json not found")
        return
    
    with open(json_path) as f:
        raw_data = json.load(f)
    
    # Validate with Pydantic
    entities = [MyEntity.model_validate(item) for item in raw_data]
    
    cursor = conn.cursor()
    for entity in entities:
        insert_model(cursor, "my_entities", entity)
    
    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(entities)} my_entities")
```

The `insert_model()` helper from `compendium.db` handles:
- Automatic field mapping from Pydantic model to SQL columns
- JSON serialization of lists and nested objects
- Position objects split into `position_x`, `position_y`, `position_z` columns

## Registration

In `loaders/__init__.py`:

```python
from .core import (
    load_zones,
    load_monsters,
    # ...
    load_my_entities,  # Add this
)
```

In `commands/build.py` (order matters!):

```python
# Load in foreign key order
load_zones(conn, export_dir, console)
# ...zones must be loaded before entities that reference them
load_my_entities(conn, export_dir, console)
```

## Key Files

- `build-pipeline/src/compendium/models.py` - Pydantic models
- `build-pipeline/schema.sql` - SQLite schema
- `build-pipeline/src/compendium/loaders/core.py` - All loaders
- `build-pipeline/src/compendium/commands/build.py` - Build orchestration
- `build-pipeline/src/compendium/db.py` - Database utilities (`insert_model`, `serialize_value`)

## Patterns

### Foreign Key References

```sql
zone_id TEXT REFERENCES zones(id)
```

Load referenced tables first in `build.py`.

### JSON Array Fields

```python
# Store as JSON string in Python loader
json.dumps(entity.tags) if entity.tags else None
```

```typescript
// Parse in website queries (TypeScript)
JSON.parse(row.tags)
```

### Optional Fields

```python
# Pydantic model
zone_id: str | None = None

# SQL insert
entity.zone_id,  # Will be None if not provided
```

## Gotchas

- Load order matters: tables with foreign keys must be loaded after referenced tables
- Use `Field(default_factory=list)` for list defaults (not `= []`)
- JSON fields stored as TEXT - serialize with `json.dumps()`
- Pydantic validates data on load - invalid data will raise errors
- Use `model_validate()` not `parse_obj()` (Pydantic v2)
