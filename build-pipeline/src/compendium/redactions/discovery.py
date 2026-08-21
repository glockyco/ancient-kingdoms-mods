"""Read the reference graph from the schema.

Almost every typed reference in this database has a foreign key. Discovery
therefore reads ``PRAGMA foreign_key_list``. It does not use column names or
column values. Identifier namespaces overlap between kinds, so an item and a
monster can share the identifier ``bison``, and a sprite name can be equal to an
item identifier.

A foreign key also gives the identifier space of a reference. ``chests.zone_id``
targets ``zones.id`` and holds a string. ``items.travel_zone_id`` targets
``zones.zone_id`` and holds a number.

Three references have no foreign key and are declared below. Two of them cannot
become constraints, because ``quests.zone_id_final_npc`` and
``quests.zone_id_quest_action`` use -1 for "no zone".
"""

import json
import sqlite3
from dataclasses import dataclass
from typing import Any

ZONE_TABLE = "zones"
SUB_ZONE_TABLE = "zone_triggers"
SUB_ZONE_PARENT = "zone_id"

# References the schema does not declare as foreign keys.
UNDECLARED_ZONE_REFERENCES: tuple[tuple[str, str, str], ...] = (
    # table, column, target column in zones
    ("items", "luck_token_zone_id", "id"),
    ("quests", "zone_id_final_npc", "zone_id"),
    ("quests", "zone_id_quest_action", "zone_id"),
)

# A column whose target kind changes from row to row. No constraint can express
# this. `summoned_entity_id` names monsters, and one value that is absent from
# every table.
POLYMORPHIC_REFERENCES: tuple[tuple[str, str, str], ...] = (
    # table, column, target table
    ("summon_triggers", "summoned_entity_id", "monsters"),
)

# Columns holding a zone identifier inside a JSON value, with the key that holds
# it and the target column that fixes its identifier space.
ZONE_JSON_CARRIERS: tuple[tuple[str, str, str, str], ...] = (
    ("quests", "objectives", "zone_id", "id"),
    ("quests", "finish_quest_locations", "zone_id", "zone_id"),
)

# Columns holding entity identifiers inside a JSON value. A key of "*" means the
# value is an array of bare identifiers rather than a list of objects.
ENTITY_JSON_CARRIERS: tuple[tuple[str, str, tuple[str, ...], str], ...] = (
    ("alchemy_recipes", "materials", ("item_id",), "items"),
    ("altars", "waves", ("monster_id",), "monsters"),
    ("crafting_recipes", "materials", ("item_id",), "items"),
    ("items", "chest_rewards", ("item_id",), "items"),
    ("items", "augment_armor_set_item_ids", ("*",), "items"),
    ("items", "augment_armor_set_members", ("item_id",), "items"),
    ("items", "augment_skill_bonuses", ("skill_id",), "skills"),
    ("items", "augment_skill_bonuses_with_names", ("skill_id",), "skills"),
    ("items", "alchemy_recipe_materials", ("item_id",), "items"),
    ("monsters", "drops", ("item_id",), "items"),
    ("npcs", "quests_offered", ("id",), "quests"),
    ("npcs", "quests_completed_here", ("id",), "quests"),
    ("npcs", "items_sold", ("item_id", "currency_item_id"), "items"),
    ("npcs", "drops", ("item_id",), "items"),
    ("npcs", "skill_ids", ("id",), "skills"),
    ("quests", "rewards", ("item_id",), "items"),
    ("quests", "predecessor_ids", ("*",), "quests"),
    ("quests", "gather_items", ("item_id",), "items"),
    ("quests", "required_items", ("item_id",), "items"),
    ("quests", "equip_items", ("*",), "items"),
    ("scribing_recipes", "materials", ("item_id",), "items"),
    ("skills", "granted_by_items", ("item_id",), "items"),
)

# Keys holding a coordinate inside a JSON value.
GEOMETRY_JSON_KEYS = ("position", "bounds", "waypoints", "path", "paths")


@dataclass(frozen=True)
class ForeignKey:
    """A declared reference from one column to one column."""

    table: str
    column: str
    target_table: str
    target_column: str

    @property
    def numeric(self) -> bool:
        """Whether the reference is written in the numeric zone space."""
        return self.target_table == ZONE_TABLE and self.target_column == "zone_id"


def tables(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' "
        "AND name NOT LIKE 'sqlite!_%' ESCAPE '!' "
        "AND name NOT LIKE '%!_fts%' ESCAPE '!' ORDER BY name"
    )
    return [row[0] for row in rows]


def columns(conn: sqlite3.Connection, table: str) -> list[str]:
    return [row[1] for row in conn.execute(f"PRAGMA table_info({table})")]


def is_required(conn: sqlite3.Connection, table: str, column: str) -> bool:
    """Whether a column rejects NULL. Such a row cannot lose the reference."""
    return any(
        row[1] == column and row[3]
        for row in conn.execute(f"PRAGMA table_info({table})")
    )


def has_identifier(conn: sqlite3.Connection, table: str) -> bool:
    """Whether the rows of a table have their own identifier, and can be nodes."""
    return any(
        row[1] == "id" and row[5] for row in conn.execute(f"PRAGMA table_info({table})")
    )


def foreign_keys(conn: sqlite3.Connection) -> list[ForeignKey]:
    """Every reference the schema declares, and the three it cannot."""
    found = [
        ForeignKey(table, row[3], row[2], row[4] or "id")
        for table in tables(conn)
        for row in conn.execute(f"PRAGMA foreign_key_list({table})")
    ]
    found += [
        ForeignKey(table, column, ZONE_TABLE, target)
        for table, column, target in UNDECLARED_ZONE_REFERENCES
    ]
    found += [
        ForeignKey(table, column, target, "id")
        for table, column, target in POLYMORPHIC_REFERENCES
    ]
    return found


def _is_geometry(column: str) -> bool:
    name = column.lower()
    if name.endswith("_name") or (name.endswith("_path") and name != "area_paths"):
        return False
    if name.endswith(("_x", "_y", "_z")):
        return True
    return name == "area_paths" or any(
        token in name for token in ("position", "bounds", "orientation", "waypoints")
    )


def geometry_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    """The columns of a table that hold geometry."""
    return [name for name in columns(conn, table) if _is_geometry(name)]


def resolve_sub_zones(conn: sqlite3.Connection, zone_ids: set[str]) -> set[str]:
    """The sub-zone identifiers belonging to the given zones."""
    if not zone_ids:
        return set()
    placeholders = ",".join("?" * len(zone_ids))
    rows = conn.execute(
        f"SELECT t.id FROM {SUB_ZONE_TABLE} t "
        f"JOIN {ZONE_TABLE} z ON z.zone_id = t.{SUB_ZONE_PARENT} "
        f"WHERE z.id IN ({placeholders})",
        tuple(sorted(zone_ids)),
    )
    return {row[0] for row in rows}


def numeric_zone_ids(conn: sqlite3.Connection, zone_ids: set[str]) -> set[int]:
    """The numeric identifiers of the given zones."""
    if not zone_ids:
        return set()
    placeholders = ",".join("?" * len(zone_ids))
    rows = conn.execute(
        f"SELECT zone_id FROM {ZONE_TABLE} WHERE id IN ({placeholders})",
        tuple(sorted(zone_ids)),
    )
    return {row[0] for row in rows if row[0] is not None}


def decode(raw: str | bytes | None) -> Any:
    """Decode a JSON column value, returning None when it is not JSON."""
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return None


def json_identifiers(value: Any, keys: tuple[str, ...]) -> set[str]:
    """Every identifier a decoded JSON value carries under the given keys."""
    found: set[str] = set()

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            for key, inner in node.items():
                if key in keys and isinstance(inner, str):
                    found.add(inner)
                else:
                    walk(inner)
        elif isinstance(node, list):
            for item in node:
                if "*" in keys and isinstance(item, str):
                    found.add(item)
                else:
                    walk(item)

    walk(value)
    return found


def json_holds(value: Any, key: str, wanted: set[Any]) -> bool:
    """Whether a decoded JSON value carries one of the wanted values under a key."""
    if isinstance(value, dict):
        if key in value and value[key] in wanted:
            return True
        return any(json_holds(inner, key, wanted) for inner in value.values())
    if isinstance(value, list):
        return any(json_holds(item, key, wanted) for item in value)
    return False


def strip_geometry(value: Any) -> Any:
    """Return the value with every coordinate removed, keeping everything else."""
    if isinstance(value, dict):
        return {
            key: None if key in GEOMETRY_JSON_KEYS else strip_geometry(inner)
            for key, inner in value.items()
        }
    if isinstance(value, list):
        return [strip_geometry(item) for item in value]
    return value
