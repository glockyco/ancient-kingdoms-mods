"""Database utilities for the compendium build pipeline."""

import json
import sqlite3
from pathlib import Path
from typing import Any

from pydantic import BaseModel
from rich.console import Console

console = Console()


def serialize_value(value: Any) -> Any:
    """Serialize a value for SQLite insertion.

    Handles Pydantic models, dicts, lists, and primitives.

    Args:
        value: The value to serialize

    Returns:
        SQLite-compatible value (None, str, int, float, or JSON string)
    """
    if value is None:
        return None
    # Handle Pydantic models (nested) - must check BEFORE hasattr checks
    if isinstance(value, BaseModel):
        return json.dumps(value.model_dump())
    # Handle lists of Pydantic models
    if isinstance(value, list) and value and isinstance(value[0], BaseModel):
        return json.dumps([item.model_dump() for item in value])
    # Handle dicts and lists (serialize to JSON)
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    # Everything else as-is (primitives: str, int, float, bool)
    return value


def insert_model(cursor: sqlite3.Cursor, table: str, model: BaseModel) -> None:
    """Insert a Pydantic model into a database table using dynamic field mapping.

    Handles special cases like Position objects (split into x/y/z columns),
    NpcRoles, QuestRewards, and faction fields.

    Skips fields that are used only for junction table population:
    - pack_final_item_id, pack_final_amount
    - random_items
    - merge_items_needed_ids, merge_result_item_id
    - treasure_map_reward_id

    Args:
        cursor: Database cursor
        table: Target table name
        model: Pydantic model instance to insert
    """
    # Fields that exist in ItemData model but not in items table schema
    # These are used by loader to populate junction tables
    JUNCTION_ONLY_FIELDS = {
        "pack_final_item_id",
        "pack_final_amount",
        "random_items",
        "merge_items_needed_ids",
        "merge_result_item_id",
        "treasure_map_reward_id",
    }

    values = {}
    for field_name in model.model_fields.keys():
        # Skip junction-only fields when inserting into items table
        if table == "items" and field_name in JUNCTION_ONLY_FIELDS:
            continue

        value = getattr(model, field_name)
        # Handle Position objects - extract x, y, z (skip if None)
        if field_name == "position":
            if value is not None:
                values["position_x"] = value.x
                values["position_y"] = value.y
                values["position_z"] = value.z
            # Skip position field if None (don't add columns)
        elif field_name == "spawn_position":
            if value is not None:
                values["spawn_position_x"] = value.x
                values["spawn_position_y"] = value.y
                values["spawn_position_z"] = value.z
        elif field_name == "destination":
            if value is not None:
                values["destination_x"] = value.x
                values["destination_y"] = value.y
                values["destination_z"] = value.z
        elif field_name == "orientation":
            if value is not None:
                values["orientation_x"] = value.x
                values["orientation_y"] = value.y
                values["orientation_z"] = value.z
        elif field_name == "origin_follow_position":
            if value is not None:
                values["origin_follow_position_x"] = value.x
                values["origin_follow_position_y"] = value.y
                values["origin_follow_position_z"] = value.z
        elif field_name == "teleport_destination":
            if value is not None:
                values["teleport_destination_x"] = value.x
                values["teleport_destination_y"] = value.y
                values["teleport_destination_z"] = value.z
        elif field_name == "travel_destination":
            if value is not None:
                values["travel_destination_x"] = value.x
                values["travel_destination_y"] = value.y
                values["travel_destination_z"] = value.z
        # Handle NpcRoles object
        elif field_name == "roles" and value is not None:
            values["roles"] = json.dumps(value.model_dump())
        # Handle QuestRewards object
        elif field_name == "rewards" and value is not None:
            values["rewards"] = json.dumps(value.model_dump())
        # Handle faction field - convert empty string to NULL for FK constraint
        elif field_name == "faction":
            values[field_name] = value if value else None
        else:
            values[field_name] = serialize_value(value)

    columns = ", ".join(values.keys())
    placeholders = ", ".join(["?"] * len(values))
    sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
    cursor.execute(sql, tuple(values.values()))


def create_database(db_path: Path, schema_path: Path) -> sqlite3.Connection:
    """Create fresh SQLite database from schema.

    Removes any existing database file and creates a new one.

    Args:
        db_path: Path to database file
        schema_path: Path to schema.sql file

    Returns:
        Database connection
    """
    console.print(f"Creating database: {db_path}")

    # Remove existing database
    if db_path.exists():
        db_path.unlink()
        console.print("  Removed existing database")

    # Read schema
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    # Create database
    conn = sqlite3.connect(db_path)
    conn.executescript(schema_sql)
    conn.commit()

    console.print("  [green]OK[/green] Database created with schema")
    return conn
