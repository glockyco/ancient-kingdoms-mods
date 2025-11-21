"""Build command - builds SQLite database from JSON exports."""

import json
import sqlite3
from pathlib import Path
from typing import Any, NotRequired, TypedDict

from pydantic import BaseModel
from rich.console import Console

from compendium.models import (
    CraftingRecipeData,
    GatherItemData,
    ItemData,
    MonsterData,
    MonsterSpawnData,
    NpcData,
    NpcSpawnData,
    PortalData,
    QuestData,
    SkillData,
    SummonTriggerData,
    ZoneData,
    ZoneTriggerData,
)
from compendium.utils import get_repo_root


class DropInfo(TypedDict):
    monster_id: str
    monster_name: str
    rate: float


class GatherDropInfo(TypedDict):
    gather_item_id: str
    gather_item_name: str
    rate: float
    type: str  # "resource" or "chest"
    zone_id: NotRequired[str]  # For chests only
    zone_name: NotRequired[str]  # For chests only
    key_required_id: NotRequired[str]  # For chests only
    key_name: NotRequired[str]  # For chests only


class SoldByInfo(TypedDict):
    npc_id: str
    npc_name: str
    price: int
    currency_item_id: str | None
    currency_item_name: str | None


class RewardedByInfo(TypedDict):
    quest_id: str
    quest_name: str


class CraftedFromInfo(TypedDict):
    recipe_id: str
    result_amount: int


class UsedInRecipeInfo(TypedDict):
    recipe_id: str
    result_item_name: str
    amount: int


class NeededForQuestInfo(TypedDict):
    quest_id: str
    quest_name: str
    purpose: str
    amount: int


class GrantedByItemInfo(TypedDict):
    item_id: str
    item_name: str
    type: str
    level: NotRequired[int]
    probability: NotRequired[float]


console = Console()


def serialize_value(value: Any) -> Any:
    """Serialize a value for SQLite insertion."""
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
    """Insert a Pydantic model into a database table using dynamic field mapping."""
    values = {}
    for field_name in model.model_fields.keys():
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
        # Handle NpcRoles object
        elif field_name == "roles" and value is not None:
            values["roles"] = json.dumps(value.model_dump())
        # Handle QuestRewards object
        elif field_name == "rewards" and value is not None:
            values["rewards"] = json.dumps(value.model_dump())
        else:
            values[field_name] = serialize_value(value)

    columns = ", ".join(values.keys())
    placeholders = ", ".join(["?"] * len(values))
    sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
    cursor.execute(sql, tuple(values.values()))


def create_database(db_path: Path, schema_path: Path) -> sqlite3.Connection:
    """Create fresh SQLite database from schema.

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


def load_zones(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load zones into database."""
    console.print("Loading zones...")

    filepath = export_dir / "zone_info.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    zones = [ZoneData(**item) for item in data]

    cursor = conn.cursor()
    for zone in zones:
        insert_model(cursor, "zones", zone)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(zones)} zones")


def load_zone_triggers(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load zone triggers into database."""
    console.print("Loading zone triggers...")

    filepath = export_dir / "zone_triggers.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    triggers = [ZoneTriggerData(**item) for item in data]

    cursor = conn.cursor()
    for trigger in triggers:
        insert_model(cursor, "zone_triggers", trigger)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(triggers)} zone triggers")


def load_skills(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load skills into database."""
    console.print("Loading skills...")

    filepath = export_dir / "skills.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    skills = [SkillData(**item) for item in data]

    cursor = conn.cursor()
    # Defer FK checks for self-referential prerequisite_skill_id
    cursor.execute("PRAGMA defer_foreign_keys = ON")

    for skill in skills:
        insert_model(cursor, "skills", skill)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(skills)} skills")


def load_items(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load items into database."""
    console.print("Loading items...")

    filepath = export_dir / "items.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = [ItemData(**item) for item in data]

    cursor = conn.cursor()
    # Defer FK checks for self-referential item foreign keys
    cursor.execute("PRAGMA defer_foreign_keys = ON")

    for item in items:
        insert_model(cursor, "items", item)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(items)} items")


def load_monsters(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load monsters into database."""
    console.print("Loading monsters...")

    filepath = export_dir / "monsters.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    monsters = [MonsterData(**item) for item in data]

    cursor = conn.cursor()
    for monster in monsters:
        insert_model(cursor, "monsters", monster)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(monsters)} monsters")


def load_monster_spawns(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load monster spawn points into database."""
    console.print("Loading monster spawn points...")

    filepath = export_dir / "monster_spawns.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    spawns = [MonsterSpawnData(**item) for item in data]

    cursor = conn.cursor()
    for spawn in spawns:
        insert_model(cursor, "monster_spawns", spawn)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(spawns)} monster spawn points")


def load_npcs(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load NPCs into database."""
    console.print("Loading NPCs...")

    filepath = export_dir / "npcs.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    npcs = [NpcData(**item) for item in data]

    cursor = conn.cursor()
    for npc in npcs:
        insert_model(cursor, "npcs", npc)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(npcs)} NPCs")


def load_npc_spawns(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load NPC spawn points into database."""
    console.print("Loading NPC spawn points...")

    filepath = export_dir / "npc_spawns.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    spawns = [NpcSpawnData(**item) for item in data]

    cursor = conn.cursor()
    for spawn in spawns:
        insert_model(cursor, "npc_spawns", spawn)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(spawns)} NPC spawn points")


def load_quests(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load quests into database."""
    console.print("Loading quests...")

    filepath = export_dir / "quests.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    quests = [QuestData(**item) for item in data]

    cursor = conn.cursor()
    # Defer FK checks for self-referential predecessor_id
    cursor.execute("PRAGMA defer_foreign_keys = ON")

    for quest in quests:
        insert_model(cursor, "quests", quest)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(quests)} quests")


def load_portals(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load portals into database."""
    console.print("Loading portals...")

    filepath = export_dir / "portals.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    portals = [PortalData(**item) for item in data]

    cursor = conn.cursor()
    for portal in portals:
        insert_model(cursor, "portals", portal)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(portals)} portals")


def load_gather_items(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load gather items, splitting into gathering_resources and chests."""
    console.print("Loading gather items...")

    filepath = export_dir / "gather_items.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    gather_items = [GatherItemData(**item) for item in data]

    cursor = conn.cursor()

    # Split into chests vs gathering resources
    chests = []
    resources = []
    resources_seen = {}  # Track resources by name for deduplication

    for gather_item in gather_items:
        if gather_item.is_chest:
            chests.append(gather_item)
        else:
            # Deduplicate resources by name (prefer templates)
            if gather_item.name not in resources_seen:
                resources_seen[gather_item.name] = gather_item
                resources.append(gather_item)
            elif gather_item.is_template and not resources_seen[gather_item.name].is_template:
                # Replace spawn with template if we find one later
                old_idx = resources.index(resources_seen[gather_item.name])
                resources[old_idx] = gather_item
                resources_seen[gather_item.name] = gather_item

    # Insert gathering resources
    for resource in resources:
        # Insert main resource record
        values = {
            'id': resource.id,
            'name': resource.name,
            'is_plant': resource.is_plant,
            'is_mineral': resource.is_mineral,
            'is_radiant_spark': resource.is_radiant_spark,
            'level': resource.level,
            'tool_required_id': resource.tool_required_id,
            'respawn_time': resource.respawn_time,
            'spawn_ready': resource.spawn_ready,
            'prob_despawn': resource.prob_despawn,
            'item_reward_id': resource.item_reward_id,
            'item_reward_amount': resource.item_reward_amount,
            'decrease_faction': resource.decrease_faction,
            'description': resource.description,
        }

        columns = ", ".join(values.keys())
        placeholders = ", ".join(["?"] * len(values))
        sql = f"INSERT INTO gathering_resources ({columns}) VALUES ({placeholders})"
        cursor.execute(sql, tuple(values.values()))

        # Insert random drops into junction table
        for drop in resource.random_drops:
            cursor.execute(
                "INSERT INTO gathering_resource_drops (resource_id, item_id, drop_rate) VALUES (?, ?, ?)",
                (resource.id, drop.item_id, drop.rate)
            )

    # Insert chests
    for chest in chests:
        # Insert main chest record
        values = {
            'id': chest.id,
            'name': chest.name,
            'zone_id': chest.zone_id,
            'key_required_id': chest.tool_required_id,  # tool_required_id is the key for chests
            'gold_min': chest.gold_min,
            'gold_max': chest.gold_max,
            'chest_reward_probability': chest.chest_reward_probability,
            'respawn_time': chest.respawn_time,
            'decrease_faction': chest.decrease_faction,
        }

        # Add position if present
        if chest.position:
            values['position_x'] = chest.position.x
            values['position_y'] = chest.position.y
            values['position_z'] = chest.position.z

        columns = ", ".join(values.keys())
        placeholders = ", ".join(["?"] * len(values))
        sql = f"INSERT INTO chests ({columns}) VALUES ({placeholders})"
        cursor.execute(sql, tuple(values.values()))

        # Insert random drops into junction table
        for drop in chest.random_drops:
            cursor.execute(
                "INSERT INTO chest_drops (chest_id, item_id, drop_rate) VALUES (?, ?, ?)",
                (chest.id, drop.item_id, drop.rate)
            )

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(resources)} gathering resources (deduplicated)")
    console.print(f"  [green]OK[/green] Loaded {len(chests)} chests")


def load_crafting_recipes(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load crafting recipes into database."""
    console.print("Loading crafting recipes...")

    filepath = export_dir / "crafting_recipes.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    recipes = [CraftingRecipeData(**item) for item in data]

    cursor = conn.cursor()
    for recipe in recipes:
        insert_model(cursor, "crafting_recipes", recipe)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(recipes)} crafting recipes")


def load_summon_triggers(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load summon triggers into database."""
    console.print("Loading summon triggers...")

    filepath = export_dir / "summon_triggers.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    triggers = [SummonTriggerData(**item) for item in data]

    cursor = conn.cursor()
    placeholder_count = 0

    for trigger in triggers:
        # Extract placeholder_monster_ids before inserting main record
        placeholder_ids = trigger.placeholder_monster_ids

        # Insert main summon_triggers record (excluding placeholder_monster_ids)
        values = {}
        for field_name in trigger.model_fields.keys():
            if field_name == "placeholder_monster_ids":
                continue  # Skip - handled by junction table

            value = getattr(trigger, field_name)

            # Handle spawn_position
            if field_name == "spawn_position":
                if value is not None:
                    values["spawn_position_x"] = value.x
                    values["spawn_position_y"] = value.y
                    values["spawn_position_z"] = value.z
            else:
                values[field_name] = serialize_value(value)

        columns = ", ".join(values.keys())
        placeholders = ", ".join(["?"] * len(values))
        sql = f"INSERT INTO summon_triggers ({columns}) VALUES ({placeholders})"
        cursor.execute(sql, tuple(values.values()))

        # Insert placeholder relationships into junction table
        for order, spawn_id in enumerate(placeholder_ids):
            cursor.execute(
                "INSERT INTO summon_trigger_placeholders (trigger_id, spawn_id, placeholder_order) VALUES (?, ?, ?)",
                (trigger.id, spawn_id, order),
            )
            placeholder_count += 1

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(triggers)} summon triggers")
    console.print(
        f"  [green]OK[/green] Loaded {placeholder_count} placeholder relationships"
    )


def denormalize_data(conn: sqlite3.Connection) -> None:
    """Populate all denormalized fields for items and skills."""
    console.print("Denormalizing data...")

    cursor = conn.cursor()

    # Build dropped_by from monsters.drops
    console.print("  Processing monster drops...")
    cursor.execute("""
        SELECT id, name, level, drops
        FROM monsters
        WHERE drops IS NOT NULL AND drops != '[]'
    """)

    dropped_by: dict[str, list[DropInfo]] = {}

    for monster_id, monster_name, monster_level, drops_json in cursor.fetchall():
        drops = json.loads(drops_json)
        for drop in drops:
            item_id = drop.get("item_id")
            if item_id:
                if item_id not in dropped_by:
                    dropped_by[item_id] = []
                dropped_by[item_id].append(
                    {
                        "monster_id": monster_id,
                        "monster_name": monster_name,
                        "monster_level": monster_level,
                        "rate": drop.get("rate", 0.0),
                    }
                )

    # Build gathered_from from gathering_resource_drops and chest_drops
    console.print("  Processing gathering resource drops...")
    cursor.execute("""
        SELECT gr.id, gr.name, grd.item_id, grd.drop_rate
        FROM gathering_resources gr
        JOIN gathering_resource_drops grd ON gr.id = grd.resource_id
    """)

    gathered_from: dict[str, list[GatherDropInfo]] = {}

    for resource_id, resource_name, item_id, drop_rate in cursor.fetchall():
        if item_id not in gathered_from:
            gathered_from[item_id] = []
        gathered_from[item_id].append(
            {
                "gather_item_id": resource_id,
                "gather_item_name": resource_name,
                "rate": drop_rate,
                "type": "resource",
            }
        )

    console.print("  Processing guaranteed resource rewards...")
    cursor.execute("""
        SELECT id, name, item_reward_id
        FROM gathering_resources
        WHERE item_reward_id IS NOT NULL
    """)

    for resource_id, resource_name, item_id in cursor.fetchall():
        if item_id not in gathered_from:
            gathered_from[item_id] = []
        gathered_from[item_id].append(
            {
                "gather_item_id": resource_id,
                "gather_item_name": resource_name,
                "rate": 1.0,
                "type": "resource",
            }
        )

    console.print("  Processing chest drops...")
    cursor.execute("""
        SELECT c.id, c.name, cd.item_id, cd.drop_rate,
               c.zone_id, z.name as zone_name,
               c.key_required_id, k.name as key_name
        FROM chests c
        JOIN chest_drops cd ON c.id = cd.chest_id
        LEFT JOIN zones z ON c.zone_id = z.id
        LEFT JOIN items k ON c.key_required_id = k.id
    """)

    for chest_id, chest_name, item_id, drop_rate, zone_id, zone_name, key_id, key_name in cursor.fetchall():
        if item_id not in gathered_from:
            gathered_from[item_id] = []

        chest_info: GatherDropInfo = {
            "gather_item_id": chest_id,
            "gather_item_name": chest_name,
            "rate": drop_rate,
            "type": "chest",
        }

        # Add chest-specific fields
        if zone_id:
            chest_info["zone_id"] = zone_id
        if zone_name:
            chest_info["zone_name"] = zone_name
        if key_id:
            chest_info["key_required_id"] = key_id
        if key_name:
            chest_info["key_name"] = key_name

        gathered_from[item_id].append(chest_info)

    # Build sold_by from npcs.items_sold
    console.print("  Processing NPC vendors...")

    # Build a lookup for item names
    cursor.execute("SELECT id, name FROM items")
    item_name_lookup = {row[0]: row[1] for row in cursor.fetchall()}

    cursor.execute("""
        SELECT id, name, items_sold
        FROM npcs
        WHERE items_sold IS NOT NULL AND items_sold != '[]'
    """)

    sold_by: dict[str, list[SoldByInfo]] = {}

    for npc_id, npc_name, items_sold_json in cursor.fetchall():
        items_sold = json.loads(items_sold_json)
        for item_sale in items_sold:
            item_id = item_sale.get("item_id")
            if item_id:
                if item_id not in sold_by:
                    sold_by[item_id] = []
                currency_id = item_sale.get("currency_item_id")
                sold_by[item_id].append(
                    {
                        "npc_id": npc_id,
                        "npc_name": npc_name,
                        "price": item_sale.get("price", 0),
                        "currency_item_id": currency_id,
                        "currency_item_name": item_name_lookup.get(currency_id)
                        if currency_id
                        else None,
                    }
                )

    # Build rewarded_by from quests.rewards
    console.print("  Processing quest rewards...")
    cursor.execute("""
        SELECT id, name, level_required, level_recommended, rewards
        FROM quests
        WHERE rewards IS NOT NULL
    """)

    rewarded_by: dict[str, list[RewardedByInfo]] = {}

    for quest_id, quest_name, level_required, level_recommended, rewards_json in cursor.fetchall():
        rewards = json.loads(rewards_json)
        items = rewards.get("items", [])
        for item in items:
            item_id = item.get("item_id")
            if item_id:
                if item_id not in rewarded_by:
                    rewarded_by[item_id] = []
                rewarded_by[item_id].append({
                    "quest_id": quest_id,
                    "quest_name": quest_name,
                    "level_required": level_required,
                    "level_recommended": level_recommended
                })

    # Build crafted_from from crafting_recipes
    console.print("  Processing crafting recipes...")
    cursor.execute("""
        SELECT id, result_item_id, result_amount, materials
        FROM crafting_recipes
        WHERE result_item_id IS NOT NULL
    """)

    crafted_from: dict[str, list[CraftedFromInfo]] = {}

    for recipe_id, result_item_id, result_amount, materials_json in cursor.fetchall():
        if result_item_id:
            if result_item_id not in crafted_from:
                crafted_from[result_item_id] = []

            # Parse materials and add item names
            materials = json.loads(materials_json) if materials_json else []
            materials_with_names = []
            for material in materials:
                material_id = material.get("item_id")
                amount = material.get("amount", 1)

                # Get item name
                cursor.execute("SELECT name FROM items WHERE id = ?", (material_id,))
                result = cursor.fetchone()
                material_name = result[0] if result else "Unknown"

                materials_with_names.append({
                    "item_id": material_id,
                    "item_name": material_name,
                    "amount": amount
                })

            crafted_from[result_item_id].append({
                "recipe_id": recipe_id,
                "result_amount": result_amount,
                "materials": materials_with_names
            })

    # Update items table
    console.print("  Updating items table...")
    for item_id, drops in dropped_by.items():
        # Sort by drop rate descending (highest first), then by monster name
        drops_sorted = sorted(drops, key=lambda x: (-x["rate"], x["monster_name"]))
        cursor.execute(
            "UPDATE items SET dropped_by = ? WHERE id = ?", (json.dumps(drops_sorted), item_id)
        )

    for item_id, vendors in sold_by.items():
        cursor.execute(
            "UPDATE items SET sold_by = ? WHERE id = ?", (json.dumps(vendors), item_id)
        )

    for item_id, quests in rewarded_by.items():
        cursor.execute(
            "UPDATE items SET rewarded_by = ? WHERE id = ?",
            (json.dumps(quests), item_id),
        )

    for item_id, recipes in crafted_from.items():
        cursor.execute(
            "UPDATE items SET crafted_from = ? WHERE id = ?",
            (json.dumps(recipes), item_id),
        )

    for item_id, gathers in gathered_from.items():
        # Sort by drop rate descending (highest first), then by name
        gathers_sorted = sorted(gathers, key=lambda x: (-x["rate"], x["gather_item_name"]))
        cursor.execute(
            "UPDATE items SET gathered_from = ? WHERE id = ?",
            (json.dumps(gathers_sorted), item_id),
        )

    # Build used_in_recipes from crafting_recipes.materials
    console.print("  Processing recipe materials...")
    cursor.execute("""
        SELECT cr.id, cr.result_item_id, i.name, cr.materials
        FROM crafting_recipes cr
        LEFT JOIN items i ON cr.result_item_id = i.id
        WHERE cr.materials IS NOT NULL AND cr.materials != '[]'
    """)

    used_in_recipes: dict[str, list[UsedInRecipeInfo]] = {}

    for (
        recipe_id,
        result_item_id,
        result_item_name,
        materials_json,
    ) in cursor.fetchall():
        materials = json.loads(materials_json)
        for material in materials:
            item_id = material.get("item_id")
            if item_id:
                if item_id not in used_in_recipes:
                    used_in_recipes[item_id] = []
                used_in_recipes[item_id].append(
                    {
                        "recipe_id": recipe_id,
                        "result_item_id": result_item_id,
                        "result_item_name": result_item_name or "Unknown",
                        "amount": material.get("amount", 1),
                    }
                )

    # Build needed_for_quests from quest objectives
    console.print("  Processing quest item requirements...")
    cursor.execute("""
        SELECT id, name, level_required, level_recommended,
               gather_item_1_id, gather_amount_1, gather_item_2_id, gather_amount_2,
               gather_item_3_id, gather_amount_3, gather_items, required_items, equip_items
        FROM quests
    """)

    needed_for_quests: dict[str, list[NeededForQuestInfo]] = {}

    for row in cursor.fetchall():
        quest_id = row[0]
        quest_name = row[1]
        level_required = row[2]
        level_recommended = row[3]

        # Process gather_item_1, 2, 3
        if row[4]:  # gather_item_1_id
            item_id = row[4]
            if item_id not in needed_for_quests:
                needed_for_quests[item_id] = []
            needed_for_quests[item_id].append(
                {
                    "quest_id": quest_id,
                    "quest_name": quest_name,
                    "level_required": level_required,
                    "level_recommended": level_recommended,
                    "purpose": "gather",
                    "amount": row[5] or 1,  # gather_amount_1
                }
            )

        if row[6]:  # gather_item_2_id
            item_id = row[6]
            if item_id not in needed_for_quests:
                needed_for_quests[item_id] = []
            needed_for_quests[item_id].append(
                {
                    "quest_id": quest_id,
                    "quest_name": quest_name,
                    "level_required": level_required,
                    "level_recommended": level_recommended,
                    "purpose": "gather",
                    "amount": row[7] or 1,  # gather_amount_2
                }
            )

        if row[8]:  # gather_item_3_id
            item_id = row[8]
            if item_id not in needed_for_quests:
                needed_for_quests[item_id] = []
            needed_for_quests[item_id].append(
                {
                    "quest_id": quest_id,
                    "quest_name": quest_name,
                    "level_required": level_required,
                    "level_recommended": level_recommended,
                    "purpose": "gather",
                    "amount": row[9] or 1,  # gather_amount_3
                }
            )

        # Process gather_items (JSON array)
        if row[10]:  # gather_items
            gather_items_list = json.loads(row[10])
            for item_obj in gather_items_list:
                item_id = item_obj.get("item_id")
                if item_id:
                    if item_id not in needed_for_quests:
                        needed_for_quests[item_id] = []
                    needed_for_quests[item_id].append(
                        {
                            "quest_id": quest_id,
                            "quest_name": quest_name,
                            "level_required": level_required,
                            "level_recommended": level_recommended,
                            "purpose": "gather",
                            "amount": item_obj.get("amount", 1),
                        }
                    )

        # Process required_items (JSON array)
        if row[11]:  # required_items
            required_items_list = json.loads(row[11])
            for item_obj in required_items_list:
                item_id = item_obj.get("item_id")
                if item_id:
                    if item_id not in needed_for_quests:
                        needed_for_quests[item_id] = []
                    needed_for_quests[item_id].append(
                        {
                            "quest_id": quest_id,
                            "quest_name": quest_name,
                            "level_required": level_required,
                            "level_recommended": level_recommended,
                            "purpose": "required",
                            "amount": item_obj.get("amount", 1),
                        }
                    )

        # Process equip_items (JSON array of item IDs)
        if row[12]:  # equip_items
            equip_items_list = json.loads(row[12])
            for item_id in equip_items_list:
                if item_id:
                    if item_id not in needed_for_quests:
                        needed_for_quests[item_id] = []
                    needed_for_quests[item_id].append(
                        {
                            "quest_id": quest_id,
                            "quest_name": quest_name,
                            "level_required": level_required,
                            "level_recommended": level_recommended,
                            "purpose": "equip",
                            "amount": 1,
                        }
                    )

    # Build granted_by_items for skills
    console.print("  Processing items that grant skills...")
    cursor.execute("""
        SELECT id, name, potion_buff_id, potion_buff_level, food_buff_id, food_buff_level,
               scroll_skill_id, weapon_proc_effect_id, weapon_proc_effect_probability,
               relic_buff_id, relic_buff_level
        FROM items
    """)

    granted_by_items: dict[str, list[GrantedByItemInfo]] = {}

    for row in cursor.fetchall():
        item_id = row[0]
        item_name = row[1]

        # Potion buff
        if row[2]:  # potion_buff_id
            skill_id = row[2]
            if skill_id not in granted_by_items:
                granted_by_items[skill_id] = []
            granted_by_items[skill_id].append(
                {
                    "item_id": item_id,
                    "item_name": item_name,
                    "type": "potion_buff",
                    "level": row[3] or 0,  # potion_buff_level
                }
            )

        # Food buff
        if row[4]:  # food_buff_id
            skill_id = row[4]
            if skill_id not in granted_by_items:
                granted_by_items[skill_id] = []
            granted_by_items[skill_id].append(
                {
                    "item_id": item_id,
                    "item_name": item_name,
                    "type": "food_buff",
                    "level": row[5] or 0,  # food_buff_level
                }
            )

        # Scroll skill
        if row[6]:  # scroll_skill_id
            skill_id = row[6]
            if skill_id not in granted_by_items:
                granted_by_items[skill_id] = []
            granted_by_items[skill_id].append(
                {"item_id": item_id, "item_name": item_name, "type": "scroll"}
            )

        # Weapon proc effect
        if row[7]:  # weapon_proc_effect_id
            skill_id = row[7]
            if skill_id not in granted_by_items:
                granted_by_items[skill_id] = []
            granted_by_items[skill_id].append(
                {
                    "item_id": item_id,
                    "item_name": item_name,
                    "type": "weapon_proc",
                    "probability": row[8] or 0.0,  # weapon_proc_effect_probability
                }
            )

        # Relic buff
        if row[9]:  # relic_buff_id
            skill_id = row[9]
            if skill_id not in granted_by_items:
                granted_by_items[skill_id] = []
            granted_by_items[skill_id].append(
                {
                    "item_id": item_id,
                    "item_name": item_name,
                    "type": "relic_buff",
                    "level": row[10] or 0,  # relic_buff_level
                }
            )

    # Update items table with new denormalized fields
    for item_id, recipe_list in used_in_recipes.items():
        cursor.execute(
            "UPDATE items SET used_in_recipes = ? WHERE id = ?",
            (json.dumps(recipe_list), item_id),
        )

    for item_id, quest_list in needed_for_quests.items():
        cursor.execute(
            "UPDATE items SET needed_for_quests = ? WHERE id = ?",
            (json.dumps(quest_list), item_id),
        )

    # Update skills table
    console.print("  Updating skills table...")
    for skill_id, items in granted_by_items.items():
        cursor.execute(
            "UPDATE skills SET granted_by_items = ? WHERE id = ?",
            (json.dumps(items), skill_id),
        )

    # Denormalize armor set data from augment items to armor pieces
    console.print("  Denormalizing armor set data...")
    cursor.execute("""
        SELECT name, augment_skill_bonuses, augment_armor_set_item_ids, augment_armor_set_name
        FROM items
        WHERE item_type = 'augment' AND augment_skill_bonuses IS NOT NULL
    """)

    # Build mapping of augment item name -> (skill bonuses, set item IDs, set name)
    # Armor pieces reference augments by their name field, not ID
    set_data: dict[str, tuple[str, str, str]] = {}
    for (
        augment_name,
        skill_bonuses_json,
        set_item_ids_json,
        set_name,
    ) in cursor.fetchall():
        set_data[augment_name] = (skill_bonuses_json, set_item_ids_json, set_name)

    # Find all items with augment_bonus_set in stats and copy the set data
    cursor.execute("SELECT id, stats FROM items WHERE stats IS NOT NULL")
    update_count = 0

    for item_id, stats_json in cursor.fetchall():
        try:
            stats = json.loads(stats_json)
            augment_set_name = stats.get("augment_bonus_set")

            if augment_set_name and augment_set_name in set_data:
                skill_bonuses, set_item_ids, set_name = set_data[augment_set_name]
                # Copy skill bonuses, set member IDs, and set name to this item
                cursor.execute(
                    """UPDATE items
                       SET augment_skill_bonuses = ?,
                           augment_armor_set_item_ids = ?,
                           augment_armor_set_name = ?
                       WHERE id = ?""",
                    (skill_bonuses, set_item_ids, set_name, item_id),
                )
                update_count += 1
        except (json.JSONDecodeError, KeyError):
            # Invalid JSON or missing field, skip
            pass

    conn.commit()

    console.print(
        f"  [green]OK[/green] Updated {update_count} items with armor set data (bonuses, members, name)"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(dropped_by)} items with monster drops"
    )
    console.print(f"  [green]OK[/green] Updated {len(sold_by)} items with vendor info")
    console.print(
        f"  [green]OK[/green] Updated {len(rewarded_by)} items as quest rewards"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(crafted_from)} items with crafting recipes"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(gathered_from)} items with gather sources"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(used_in_recipes)} items used in recipes"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(needed_for_quests)} items needed for quests"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(granted_by_items)} skills granted by items"
    )


def run(config: dict) -> None:
    """Build SQLite database from JSON exports.

    Args:
        config: Configuration dictionary from config.toml
    """
    repo_root = get_repo_root()
    export_dir = repo_root / config["paths"]["export_dir"]
    website_dir = repo_root / config["paths"]["website_dir"]
    static_dir = website_dir / "static"
    schema_path = repo_root / "build-pipeline" / "schema.sql"

    # Ensure static directory exists
    static_dir.mkdir(parents=True, exist_ok=True)

    db_path = static_dir / config["build_pipeline"]["db_name"]

    console.print("[bold]Building database from JSON exports...[/bold]\n")

    # Create database
    conn = create_database(db_path, schema_path)

    try:
        # Load data in order (respecting foreign keys)
        load_zones(conn, export_dir)
        load_zone_triggers(conn, export_dir)
        load_skills(conn, export_dir)
        load_items(conn, export_dir)
        load_monsters(conn, export_dir)
        load_monster_spawns(conn, export_dir)  # After monsters
        load_npcs(conn, export_dir)
        load_npc_spawns(conn, export_dir)  # After NPCs
        load_summon_triggers(conn, export_dir)  # After monsters/NPCs
        load_quests(conn, export_dir)
        load_portals(conn, export_dir)
        load_gather_items(conn, export_dir)
        load_crafting_recipes(conn, export_dir)

        # Denormalize data (must be done after all data is loaded)
        console.print()
        denormalize_data(conn)

        console.print(
            f"\n[bold green]OK Database built successfully:[/bold green] {db_path}"
        )

    except Exception as e:
        console.print(f"\n[bold red]Error building database:[/bold red] {e}")
        raise
    finally:
        conn.close()
