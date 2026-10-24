"""Database utilities for the compendium build pipeline."""

import json
import sqlite3
from pathlib import Path
from typing import TYPE_CHECKING, Any, Protocol, cast

from pydantic import BaseModel
from rich.console import Console

if TYPE_CHECKING:
    from compendium.models import QuestData


class _IdentifiedInput(Protocol):
    id: str


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


    Args:
        cursor: Database cursor
        table: Target table name
        model: Pydantic model instance to insert
    """
    # Private relationship fields are normalized after ingestion, not published
    # as a second JSON authority.
    JUNCTION_ONLY_FIELDS: dict[str, set[str]] = {
        "items": {
            "pack_final_item_id",
            "pack_final_amount",
            "random_items",
            "merge_items_needed_ids",
            "merge_result_item_id",
            "treasure_map_reward_id",
            "chest_rewards",
            "chest_num_items",
            "class_required",
        },
        "skills": {
            "prerequisite_skill_id",
            "prerequisite_level",
            "prerequisite2_skill_id",
            "prerequisite2_level",
        },
        "monsters": {
            "skill_ids",
            "drops",
            "loot_zone_number",
            "is_summoned_pet",
        },
        "pets": {
            "skill_ids",
            "innate_skill_ids",
        },
        "achievements": {
            "unlocked_icon_path",
            "locked_icon_path",
        },
        "monster_spawns": {
            "loot_zone_number",
            "loot_respawn",
            "loot_exp_multiplier",
            "loot_is_boss",
            "loot_is_elite",
            "loot_is_hunt",
            "loot_is_summoned_pet",
            "loot_event_kind",
            "loot_drops",
            "loot_gold_min",
            "loot_gold_max",
            "loot_gold_probability",
        },
        "npcs": {"quest_offers", "items_sold", "skill_ids"},
        "quests": {
            "race_requirements",
            "class_requirements",
            "faction_requirements",
            "finish_quest_locations",
            "objectives",
            "rewards",
            "start_npc_id",
            "end_npc_id",
            "predecessor_ids",
            "kill_target_1_id",
            "kill_target_2_id",
            "kill_amount_1",
            "kill_amount_2",
            "gather_item_1_id",
            "gather_item_2_id",
            "gather_item_3_id",
            "gather_amount_1",
            "gather_amount_2",
            "gather_amount_3",
            "gather_items",
            "required_items",
            "equip_items",
            "given_item_on_start_id",
            "potions_amount",
            "potion_item_id",
            "discovered_location",
            "discovered_location_zone_id",
            "discovered_location_sub_zone_id",
            "discovered_location_position",
            "discovered_location_area",
            "tracking_quest_location",
            "zone_id_final_npc",
            "zone_id_quest_action",
        },
    }
    staging_families = {
        "items",
        "skills",
        "monsters",
        "monster_spawns",
        "npcs",
        "quests",
    }
    if table in staging_families:
        insert_acquisition_input(cursor, table, model)

    values = {}
    skip_fields = JUNCTION_ONLY_FIELDS.get(table, set())
    for field_name in type(model).model_fields:
        if field_name in skip_fields:
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
        elif field_name == "teleport_position":
            if value is not None:
                values["teleport_position_x"] = value.x
                values["teleport_position_y"] = value.y
                values["teleport_position_z"] = value.z
        elif field_name == "teleport_orientation":
            if value is not None:
                values["teleport_orientation_x"] = value.x
                values["teleport_orientation_y"] = value.y
                values["teleport_orientation_z"] = value.z
        elif field_name == "travel_destination":
            if value is not None:
                values["travel_destination_x"] = value.x
                values["travel_destination_y"] = value.y
                values["travel_destination_z"] = value.z
        # Handle polygon rings - store as compact [[x, y], ...] arrays for the map
        elif field_name == "area_paths":
            values[field_name] = (
                json.dumps([[[point.x, point.y] for point in ring] for ring in value])
                if value is not None
                else None
            )
        # Handle NpcRoles object
        elif field_name == "roles" and value is not None:
            values["roles"] = json.dumps(value.model_dump())
        # Handle faction field - convert empty string to NULL for FK constraint
        elif field_name == "faction":
            values[field_name] = value if value else None
        else:
            values[field_name] = serialize_value(value)
    if table == "quests":
        rewards = cast("QuestData", model).rewards
        values["reward_gold"] = rewards.gold
        values["reward_experience"] = rewards.exp

    columns = ", ".join(values.keys())
    placeholders = ", ".join(["?"] * len(values))
    sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
    cursor.execute(sql, tuple(values.values()))


def insert_acquisition_input(
    cursor: sqlite3.Cursor,
    family: str,
    model: BaseModel,
    *,
    identity: str | None = None,
) -> None:
    """Retain validated immutable source facts until acquisition normalization."""
    cursor.execute(
        f"INSERT INTO _acquisition_input_{family} (id,payload) VALUES (?,?)",
        (
            identity if identity is not None else cast(_IdentifiedInput, model).id,
            model.model_dump_json(),
        ),
    )


def create_database(db_path: Path, schema_path: Path) -> sqlite3.Connection:
    """Create a new SQLite database from schema without replacing an existing file.

    Args:
        db_path: Path to database file
        schema_path: Path to schema.sql file

    Returns:
        Database connection
    """
    console.print(f"Creating database: {db_path}")

    if db_path.exists():
        raise FileExistsError(f"Database already exists: {db_path}")

    # Read schema
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    # Create database
    conn = sqlite3.connect(db_path)
    conn.executescript(schema_sql)
    conn.commit()

    console.print("  [green]OK[/green] Database created with schema")
    return conn
