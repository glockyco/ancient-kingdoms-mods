"""Build command - builds SQLite database from JSON exports."""

import json
import sqlite3
from pathlib import Path
from typing import Any, NotRequired, TypedDict

from pydantic import BaseModel
from rich.console import Console

from compendium.models import (
    AltarData,
    CraftingRecipeData,
    GatherItemData,
    ItemData,
    LuckTokenData,
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
    monster_level: int
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
    amount_min: NotRequired[int]  # For guaranteed rewards with variable amount
    amount_max: NotRequired[int]  # For guaranteed rewards with variable amount


class ChestSourceInfo(TypedDict):
    chest_id: str
    chest_name: str
    rate: float


class SoldByInfo(TypedDict):
    npc_id: str
    npc_name: str
    price: int
    currency_item_id: str | None
    currency_item_name: str | None


class RewardedByInfo(TypedDict):
    quest_id: str
    quest_name: str
    level_required: int
    level_recommended: int


class MaterialInfo(TypedDict):
    item_id: str
    item_name: str
    amount: int


class CraftedFromInfo(TypedDict):
    recipe_id: str
    result_amount: int
    materials: list[MaterialInfo]


class UsedInRecipeInfo(TypedDict):
    recipe_id: str
    result_item_id: str
    result_item_name: str
    amount: int


class NeededForQuestInfo(TypedDict):
    quest_id: str
    quest_name: str
    level_required: int
    level_recommended: int
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


def load_luck_tokens(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load luck tokens into database."""
    console.print("Loading luck tokens...")

    filepath = export_dir / "luck_tokens.json"
    if not filepath.exists():
        console.print("  [yellow]SKIP[/yellow] No luck_tokens.json found")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    tokens = [LuckTokenData(**item) for item in data]

    cursor = conn.cursor()
    for token in tokens:
        insert_model(cursor, "luck_tokens", token)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(tokens)} luck token configurations")


def load_altars(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load altars into database."""
    console.print("Loading altars...")

    filepath = export_dir / "altars.json"
    if not filepath.exists():
        console.print("  [yellow]SKIP[/yellow] No altars.json found")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    altars = [AltarData(**item) for item in data]

    cursor = conn.cursor()
    for altar in altars:
        insert_model(cursor, "altars", altar)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(altars)} altars")


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

    # Calculate actual drop chances for gathering resource drops
    # Game logic: picks ONE random drop uniformly, then rolls its probability
    # Actual drop chance = (1 / num_drops) * drop_rate
    console.print("  Calculating actual drop chances for gathering resources...")
    cursor.execute("""
        SELECT resource_id, COUNT(*) as num_drops
        FROM gathering_resource_drops
        GROUP BY resource_id
    """)

    for resource_id, num_drops in cursor.fetchall():
        selection_probability = 1.0 / num_drops
        cursor.execute("""
            UPDATE gathering_resource_drops
            SET actual_drop_chance = drop_rate * ?
            WHERE resource_id = ?
        """, (selection_probability, resource_id))

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
        SELECT gr.id, gr.name, grd.item_id, grd.actual_drop_chance
        FROM gathering_resources gr
        JOIN gathering_resource_drops grd ON gr.id = grd.resource_id
    """)

    gathered_from: dict[str, list[GatherDropInfo]] = {}

    for resource_id, resource_name, item_id, actual_drop_chance in cursor.fetchall():
        if item_id not in gathered_from:
            gathered_from[item_id] = []
        gathered_from[item_id].append(
            {
                "gather_item_id": resource_id,
                "gather_item_name": resource_name,
                "rate": actual_drop_chance,
                "type": "resource",
            }
        )

    console.print("  Processing guaranteed resource rewards...")
    cursor.execute("""
        SELECT id, name, item_reward_id, item_reward_amount
        FROM gathering_resources
        WHERE item_reward_id IS NOT NULL
    """)

    for resource_id, resource_name, item_id, item_reward_amount in cursor.fetchall():
        if item_id not in gathered_from:
            gathered_from[item_id] = []

        # Amount is random: Random.Range(1, amount + 1) in game code
        gather_info: GatherDropInfo = {
            "gather_item_id": resource_id,
            "gather_item_name": resource_name,
            "rate": 1.0,
            "type": "resource",
        }

        # Add amount range if variable
        if item_reward_amount > 1:
            gather_info["amount_min"] = 1
            gather_info["amount_max"] = item_reward_amount

        gathered_from[item_id].append(gather_info)

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
            materials_with_names: list[MaterialInfo] = []
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

    # Build rewarded_by_altars from altars
    console.print("  Processing altar rewards...")
    cursor.execute("""
        SELECT a.id, a.name, a.type, a.zone_id, z.name,
               a.reward_normal_id, a.reward_magic_id, a.reward_epic_id, a.reward_legendary_id
        FROM altars a
        LEFT JOIN zones z ON a.zone_id = z.id
        WHERE a.reward_normal_id IS NOT NULL OR a.reward_magic_id IS NOT NULL
           OR a.reward_epic_id IS NOT NULL OR a.reward_legendary_id IS NOT NULL
    """)

    rewarded_by_altars: dict[str, list[dict]] = {}

    for altar_id, altar_name, altar_type, zone_id, zone_name, normal_id, magic_id, epic_id, legendary_id in cursor.fetchall():
        # Normal tier (effective level < 35)
        if normal_id:
            if normal_id not in rewarded_by_altars:
                rewarded_by_altars[normal_id] = []
            rewarded_by_altars[normal_id].append({
                "altar_id": altar_id,
                "altar_name": altar_name,
                "reward_tier": "normal",
                "min_effective_level": 0,
                "zone_id": zone_id,
                "zone_name": zone_name if zone_name else zone_id
            })

        # Magic tier (effective level 35-44)
        if magic_id:
            if magic_id not in rewarded_by_altars:
                rewarded_by_altars[magic_id] = []
            rewarded_by_altars[magic_id].append({
                "altar_id": altar_id,
                "altar_name": altar_name,
                "reward_tier": "magic",
                "min_effective_level": 35,
                "zone_id": zone_id,
                "zone_name": zone_name if zone_name else zone_id
            })

        # Epic tier (effective level 45-54)
        if epic_id:
            if epic_id not in rewarded_by_altars:
                rewarded_by_altars[epic_id] = []
            rewarded_by_altars[epic_id].append({
                "altar_id": altar_id,
                "altar_name": altar_name,
                "reward_tier": "epic",
                "min_effective_level": 45,
                "zone_id": zone_id,
                "zone_name": zone_name if zone_name else zone_id
            })

        # Legendary tier (effective level >= 55)
        if legendary_id:
            if legendary_id not in rewarded_by_altars:
                rewarded_by_altars[legendary_id] = []
            rewarded_by_altars[legendary_id].append({
                "altar_id": altar_id,
                "altar_name": altar_name,
                "reward_tier": "legendary",
                "min_effective_level": 55,
                "zone_id": zone_id,
                "zone_name": zone_name if zone_name else zone_id
            })

    # Build required_for_altars from altars
    console.print("  Processing altar activation items...")
    cursor.execute("""
        SELECT a.id, a.name, a.required_activation_item_id, a.min_level_required, a.zone_id, z.name
        FROM altars a
        LEFT JOIN zones z ON a.zone_id = z.id
        WHERE a.required_activation_item_id IS NOT NULL
    """)

    required_for_altars: dict[str, list[dict]] = {}

    for altar_id, altar_name, activation_item_id, min_level_required, zone_id, zone_name in cursor.fetchall():
        if activation_item_id not in required_for_altars:
            required_for_altars[activation_item_id] = []
        required_for_altars[activation_item_id].append({
            "altar_id": altar_id,
            "altar_name": altar_name,
            "min_level_required": min_level_required,
            "zone_id": zone_id,
            "zone_name": zone_name if zone_name else zone_id
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
        # Sort by NPC name alphabetically
        vendors_sorted = sorted(vendors, key=lambda x: x["npc_name"])
        cursor.execute(
            "UPDATE items SET sold_by = ? WHERE id = ?", (json.dumps(vendors_sorted), item_id)
        )

    for item_id, quests in rewarded_by.items():
        # Sort by quest name alphabetically
        quests_sorted = sorted(quests, key=lambda x: x["quest_name"])
        cursor.execute(
            "UPDATE items SET rewarded_by = ? WHERE id = ?",
            (json.dumps(quests_sorted), item_id),
        )

    for item_id, altars in rewarded_by_altars.items():
        # Sort by altar name alphabetically
        altars_sorted = sorted(altars, key=lambda x: x["altar_name"])
        cursor.execute(
            "UPDATE items SET rewarded_by_altars = ? WHERE id = ?",
            (json.dumps(altars_sorted), item_id),
        )

    for item_id, altars in required_for_altars.items():
        # Sort by altar name, then by zone name
        altars_sorted = sorted(altars, key=lambda x: (x["altar_name"], x["zone_name"]))
        cursor.execute(
            "UPDATE items SET required_for_altars = ? WHERE id = ?",
            (json.dumps(altars_sorted), item_id),
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

    # Build used_as_currency_for from items.buy_token_id (only for items actually sold by vendors)
    console.print("  Processing currency usage...")
    cursor.execute("""
        SELECT id, name, buy_token_id, buy_price
        FROM items
        WHERE buy_token_id IS NOT NULL AND buy_token_id != ''
          AND sold_by IS NOT NULL AND sold_by != '[]'
    """)

    used_as_currency_for: dict[str, list[dict]] = {}

    for item_id, item_name, currency_id, price in cursor.fetchall():
        if currency_id not in used_as_currency_for:
            used_as_currency_for[currency_id] = []
        used_as_currency_for[currency_id].append({
            "item_id": item_id,
            "item_name": item_name,
            "price": price
        })

    # Update items table with new denormalized fields
    for item_id, recipe_list in used_in_recipes.items():
        cursor.execute(
            "UPDATE items SET used_in_recipes = ? WHERE id = ?",
            (json.dumps(recipe_list), item_id),
        )

    for item_id, quest_list in needed_for_quests.items():
        # Sort by quest name alphabetically
        quest_list_sorted = sorted(quest_list, key=lambda x: x["quest_name"])
        cursor.execute(
            "UPDATE items SET needed_for_quests = ? WHERE id = ?",
            (json.dumps(quest_list_sorted), item_id),
        )

    for currency_id, item_list in used_as_currency_for.items():
        # Sort by item name alphabetically
        item_list_sorted = sorted(item_list, key=lambda x: x["item_name"])
        cursor.execute(
            "UPDATE items SET used_as_currency_for = ? WHERE id = ?",
            (json.dumps(item_list_sorted), currency_id),
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
        SELECT id, name, augment_skill_bonuses, augment_armor_set_item_ids, augment_armor_set_name, stats
        FROM items
        WHERE item_type = 'augment' AND augment_skill_bonuses IS NOT NULL
    """)

    # Build mapping of augment item name -> (augment_id, skill bonuses, set item IDs, set name, attribute bonuses)
    # Armor pieces reference augments by their name field, not ID
    set_data: dict[str, tuple[str, str, str, str, str]] = {}
    augment_items_updated = 0
    for (
        augment_id,
        augment_name,
        skill_bonuses_json,
        set_item_ids_json,
        set_name,
        stats_json,
    ) in cursor.fetchall():
        # Extract attribute bonuses from stats
        attribute_bonuses = []
        if stats_json:
            try:
                stats = json.loads(stats_json)
                attributes = {
                    "strength": "Strength",
                    "dexterity": "Dexterity",
                    "constitution": "Constitution",
                    "intelligence": "Intelligence",
                    "wisdom": "Wisdom",
                    "charisma": "Charisma"
                }
                for attr_key, attr_name in attributes.items():
                    value = stats.get(attr_key, 0)
                    if value > 0:
                        attribute_bonuses.append({"attribute": attr_name, "bonus": value})
            except json.JSONDecodeError:
                pass

        attribute_bonuses_json = json.dumps(attribute_bonuses) if attribute_bonuses else None
        set_data[augment_name] = (augment_id, skill_bonuses_json, set_item_ids_json, set_name, attribute_bonuses_json)

        # Also update the augment item itself with attribute bonuses
        if attribute_bonuses_json:
            cursor.execute(
                """UPDATE items
                   SET augment_attribute_bonuses = ?
                   WHERE id = ?""",
                (attribute_bonuses_json, augment_id),
            )
            augment_items_updated += 1

    # Find all items with augment_bonus_set in stats and copy the set data
    cursor.execute("SELECT id, stats FROM items WHERE stats IS NOT NULL")
    update_count = 0

    for item_id, stats_json in cursor.fetchall():
        try:
            stats = json.loads(stats_json)
            augment_set_name = stats.get("augment_bonus_set")

            if augment_set_name and augment_set_name in set_data:
                augment_id, skill_bonuses, set_item_ids, set_name, attribute_bonuses = set_data[augment_set_name]
                # Copy augment ID, skill bonuses, set member IDs, set name, and attribute bonuses to this item
                cursor.execute(
                    """UPDATE items
                       SET augment_armor_set_id = ?,
                           augment_skill_bonuses = ?,
                           augment_armor_set_item_ids = ?,
                           augment_armor_set_name = ?,
                           augment_attribute_bonuses = ?
                       WHERE id = ?""",
                    (augment_id, skill_bonuses, set_item_ids, set_name, attribute_bonuses, item_id),
                )
                update_count += 1
        except (json.JSONDecodeError, KeyError):
            # Invalid JSON or missing field, skip
            pass

    # Denormalize skill names and item names in armor sets
    console.print("  Denormalizing armor set skill and item names...")
    cursor.execute("""
        SELECT id, augment_skill_bonuses, augment_armor_set_item_ids
        FROM items
        WHERE augment_skill_bonuses IS NOT NULL OR augment_armor_set_item_ids IS NOT NULL
    """)

    skill_bonuses_updated = 0
    set_members_updated = 0

    for item_id, skill_bonuses_json, set_item_ids_json in cursor.fetchall():
        # Denormalize skill bonuses with skill names
        if skill_bonuses_json:
            try:
                skill_bonuses = json.loads(skill_bonuses_json)
                skill_bonuses_with_names = []

                for bonus in skill_bonuses:
                    skill_id = bonus.get("skill_id")
                    level_bonus = bonus.get("level_bonus", 0)

                    if skill_id:
                        skill_name_cursor = conn.cursor()
                        skill_result = skill_name_cursor.execute("SELECT name FROM skills WHERE id = ?", (skill_id,)).fetchone()
                        skill_name = skill_result[0] if skill_result else skill_id.replace("_", " ").title()

                        skill_bonuses_with_names.append({
                            "skill_id": skill_id,
                            "skill_name": skill_name,
                            "level_bonus": level_bonus
                        })

                if skill_bonuses_with_names:
                    update_skill_cursor = conn.cursor()
                    update_skill_cursor.execute("""
                        UPDATE items
                        SET augment_skill_bonuses_with_names = ?
                        WHERE id = ?
                    """, (json.dumps(skill_bonuses_with_names), item_id))
                    if update_skill_cursor.rowcount > 0:
                        skill_bonuses_updated += 1
            except (json.JSONDecodeError, KeyError):
                pass

        # Denormalize armor set members with item names
        if set_item_ids_json:
            try:
                set_item_ids = json.loads(set_item_ids_json)
                set_members_with_names = []

                for member_id in set_item_ids:
                    if member_id:
                        member_name_cursor = conn.cursor()
                        member_result = member_name_cursor.execute("SELECT name FROM items WHERE id = ?", (member_id,)).fetchone()
                        member_name = member_result[0] if member_result else member_id.replace("_", " ").title()

                        set_members_with_names.append({
                            "item_id": member_id,
                            "item_name": member_name
                        })

                if set_members_with_names:
                    update_members_cursor = conn.cursor()
                    update_members_cursor.execute("""
                        UPDATE items
                        SET augment_armor_set_members = ?
                        WHERE id = ?
                    """, (json.dumps(set_members_with_names), item_id))
                    if update_members_cursor.rowcount > 0:
                        set_members_updated += 1
            except (json.JSONDecodeError, KeyError):
                pass

    conn.commit()

    # Denormalize buff names from skills table
    console.print("  Denormalizing buff names...")
    cursor.execute("""
        UPDATE items
        SET food_buff_name = (SELECT name FROM skills WHERE skills.id = items.food_buff_id)
        WHERE food_buff_id IS NOT NULL
    """)
    food_buff_count = cursor.rowcount

    cursor.execute("""
        UPDATE items
        SET relic_buff_name = (SELECT name FROM skills WHERE skills.id = items.relic_buff_id)
        WHERE relic_buff_id IS NOT NULL
    """)
    relic_buff_count = cursor.rowcount

    cursor.execute("""
        UPDATE items
        SET fragment_result_item_name = (SELECT name FROM items AS i WHERE i.id = items.fragment_result_item_id)
        WHERE fragment_result_item_id IS NOT NULL
    """)
    fragment_result_count = cursor.rowcount

    cursor.execute("""
        UPDATE items
        SET pack_final_item_name = (SELECT name FROM items AS i WHERE i.id = items.pack_final_item_id)
        WHERE pack_final_item_id IS NOT NULL
    """)
    pack_final_count = cursor.rowcount

    # Denormalize item names in chest_rewards and calculate exact drop chances
    console.print("  Denormalizing chest reward item names and calculating exact drop chances...")
    cursor.execute("""
        SELECT id, chest_rewards, chest_num_items
        FROM items
        WHERE chest_rewards IS NOT NULL AND chest_rewards != '[]'
    """)

    def calculate_exact_chest_probabilities(rewards: list[dict], num_items: int) -> dict[str, float]:
        """
        Calculate drop probabilities using Monte Carlo simulation.

        Fast and accurate - matches actual game behavior exactly.
        """
        import random

        num_simulations = 100000
        max_passes = 10

        # Track how many times each item was selected
        item_counts = {r["item_id"]: 0 for r in rewards}

        for _ in range(num_simulations):
            selected_ids = set()
            num_passes = 0

            while len(selected_ids) < num_items and num_passes < max_passes:
                for reward in rewards:
                    # Skip if already selected
                    if reward["item_id"] in selected_ids:
                        continue

                    # Roll for this item
                    if random.random() < reward["probability"]:
                        selected_ids.add(reward["item_id"])
                        item_counts[reward["item_id"]] += 1

                    # Check if we have enough items
                    if len(selected_ids) >= num_items:
                        break

                num_passes += 1

        # Convert counts to probabilities
        item_probs = {}
        for item_id, count in item_counts.items():
            item_probs[item_id] = count / num_simulations

        return item_probs

    chest_rewards_updated = 0
    found_in_chests: dict[str, list[ChestSourceInfo]] = {}

    for chest_id, chest_rewards_json, num_items in cursor.fetchall():
        chest_rewards = json.loads(chest_rewards_json)
        updated_rewards = []

        # First pass: add item names
        for reward in chest_rewards:
            item_id = reward.get("item_id")
            probability = reward.get("probability", 0.0)

            if item_id:
                item_name_cursor = conn.cursor()
                item_result = item_name_cursor.execute("SELECT name FROM items WHERE id = ?", (item_id,)).fetchone()
                item_name = item_result[0] if item_result else "Unknown"

                updated_rewards.append({
                    "item_id": item_id,
                    "item_name": item_name,
                    "probability": probability,
                })

        # Calculate exact drop chances
        if updated_rewards and num_items > 0:
            exact_probs = calculate_exact_chest_probabilities(updated_rewards, num_items)

            for reward in updated_rewards:
                reward["actual_drop_chance"] = exact_probs.get(reward["item_id"], 0.0)

        # Build found_in_chests using actual drop chances
        chest_name_cursor = conn.cursor()
        chest_name_result = chest_name_cursor.execute("SELECT name FROM items WHERE id = ?", (chest_id,)).fetchone()
        chest_name = chest_name_result[0] if chest_name_result else "Unknown"

        for reward in updated_rewards:
            item_id = reward["item_id"]
            actual_chance = reward.get("actual_drop_chance", reward["probability"])

            if item_id not in found_in_chests:
                found_in_chests[item_id] = []

            found_in_chests[item_id].append({
                "chest_id": chest_id,
                "chest_name": chest_name,
                "rate": actual_chance,
            })

        if updated_rewards:
            rewards_sorted = sorted(updated_rewards, key=lambda x: (-x.get("actual_drop_chance", x["probability"]), x["item_name"]))
            update_cursor = conn.cursor()
            update_cursor.execute(
                "UPDATE items SET chest_rewards = ? WHERE id = ?",
                (json.dumps(rewards_sorted), chest_id)
            )
            if update_cursor.rowcount > 0:
                chest_rewards_updated += 1

    # Update found_in_chests with actual drop chances
    console.print("  Updating found_in_chests with actual drop chances...")
    for item_id, chests in found_in_chests.items():
        chests_sorted = sorted(chests, key=lambda x: (-x["rate"], x["chest_name"]))
        update_found_cursor = conn.cursor()
        update_found_cursor.execute(
            "UPDATE items SET found_in_chests = ? WHERE id = ?",
            (json.dumps(chests_sorted), item_id),
        )

    conn.commit()

    # Denormalize pack item sources
    console.print("  Denormalizing pack item sources...")
    found_in_packs: dict[str, list[dict]] = {}

    cursor.execute("""
        SELECT id, name, pack_final_item_id, pack_final_amount
        FROM items
        WHERE pack_final_item_id IS NOT NULL
    """)

    for pack_id, pack_name, item_id, amount in cursor.fetchall():
        if item_id not in found_in_packs:
            found_in_packs[item_id] = []

        found_in_packs[item_id].append({
            "pack_id": pack_id,
            "pack_name": pack_name,
            "amount": amount,
        })

    for item_id, packs in found_in_packs.items():
        packs_sorted = sorted(packs, key=lambda x: x["pack_name"])
        update_pack_cursor = conn.cursor()
        update_pack_cursor.execute(
            "UPDATE items SET found_in_packs = ? WHERE id = ?",
            (json.dumps(packs_sorted), item_id),
        )

    conn.commit()

    # Denormalize luck token data
    console.print("  Denormalizing luck token data...")
    cursor.execute("""
        SELECT zone_id, zone_name, boss_luck_token_id, fragment_token_id,
               fragment_amount_needed, fragment_drop_chance, boss_luck_bonus
        FROM luck_tokens
    """)

    fragment_count = 0
    boss_token_count = 0

    for zone_id, zone_name, boss_token_id, fragment_token_id, fragment_amount, fragment_drop_chance, boss_bonus in cursor.fetchall():
        if fragment_token_id:
            monsters_cursor = conn.cursor()
            monsters_cursor.execute("""
                SELECT DISTINCT m.id, m.name, m.level
                FROM monsters m
                JOIN monster_spawns ms ON m.id = ms.monster_id
                WHERE ms.zone_id = ? AND m.is_boss = 0 AND m.is_elite = 0
            """, (zone_id,))

            fragment_drops = []
            for monster_id, monster_name, monster_level in monsters_cursor.fetchall():
                fragment_drops.append({
                    "monster_id": monster_id,
                    "monster_name": monster_name,
                    "monster_level": monster_level,
                    "rate": fragment_drop_chance,
                    "zone_id": zone_id,
                })

            existing_drops_cursor = conn.cursor()
            existing_dropped_by = existing_drops_cursor.execute("SELECT dropped_by FROM items WHERE id = ?", (fragment_token_id,)).fetchone()
            if existing_dropped_by and existing_dropped_by[0]:
                existing = json.loads(existing_dropped_by[0])
                fragment_drops.extend(existing)

            fragment_drops_sorted = sorted(fragment_drops, key=lambda x: (-x["rate"], x["monster_name"]))

            update_fragment_cursor = conn.cursor()
            update_fragment_cursor.execute("""
                UPDATE items
                SET luck_token_zone_id = ?,
                    luck_token_zone_name = ?,
                    luck_token_drop_chance = ?,
                    dropped_by = ?
                WHERE id = ?
            """, (zone_id, zone_name, fragment_drop_chance, json.dumps(fragment_drops_sorted), fragment_token_id))
            if update_fragment_cursor.rowcount > 0:
                fragment_count += 1

        if boss_token_id:
            fragment_name = None
            if fragment_token_id:
                fragment_name_cursor = conn.cursor()
                fragment_result = fragment_name_cursor.execute("SELECT name FROM items WHERE id = ?", (fragment_token_id,)).fetchone()
                if fragment_result:
                    fragment_name = fragment_result[0]

            update_boss_cursor = conn.cursor()
            update_boss_cursor.execute("""
                UPDATE items
                SET luck_token_zone_id = ?,
                    luck_token_zone_name = ?,
                    luck_token_bonus = ?,
                    luck_token_fragment_id = ?,
                    luck_token_fragment_name = ?,
                    luck_token_fragments_needed = ?
                WHERE id = ?
            """, (zone_id, zone_name, boss_bonus, fragment_token_id, fragment_name, fragment_amount, boss_token_id))
            if update_boss_cursor.rowcount > 0:
                boss_token_count += 1

    conn.commit()

    # Denormalize merge item data
    console.print("  Denormalizing merge item data...")
    merge_items_updated = 0
    merge_result_updated = 0
    created_from_merge_updated = 0

    # Update merge items with full item data (items needed + result item name)
    cursor.execute("""
        SELECT id, merge_items_needed_ids, merge_result_item_id
        FROM items
        WHERE merge_items_needed_ids IS NOT NULL
    """)

    for item_id, items_needed_json, result_item_id in cursor.fetchall():
        if not items_needed_json:
            continue

        items_needed_ids = json.loads(items_needed_json)
        if not items_needed_ids:
            continue

        # Fetch names for all needed items
        merge_items_needed = []
        for needed_id in items_needed_ids:
            name_cursor = conn.cursor()
            name_result = name_cursor.execute("SELECT name FROM items WHERE id = ?", (needed_id,)).fetchone()
            if name_result:
                merge_items_needed.append({
                    "item_id": needed_id,
                    "item_name": name_result[0]
                })

        # Fetch result item name
        result_item_name = None
        if result_item_id:
            result_cursor = conn.cursor()
            result = result_cursor.execute("SELECT name FROM items WHERE id = ?", (result_item_id,)).fetchone()
            if result:
                result_item_name = result[0]

        # Update the merge item
        update_cursor = conn.cursor()
        update_cursor.execute("""
            UPDATE items
            SET merge_items_needed = ?,
                merge_result_item_name = ?
            WHERE id = ?
        """, (json.dumps(merge_items_needed), result_item_name, item_id))

        if update_cursor.rowcount > 0:
            merge_items_updated += 1
            merge_result_updated += 1 if result_item_name else 0

    # Update result items with source merge items (reverse relationship)
    cursor.execute("""
        SELECT DISTINCT merge_result_item_id
        FROM items
        WHERE merge_result_item_id IS NOT NULL
    """)

    for (result_item_id,) in cursor.fetchall():
        # Find all merge items that create this result
        sources_cursor = conn.cursor()
        sources_cursor.execute("""
            SELECT id, name
            FROM items
            WHERE merge_result_item_id = ?
        """, (result_item_id,))

        created_from = []
        for merge_item_id, merge_item_name in sources_cursor.fetchall():
            created_from.append({
                "item_id": merge_item_id,
                "item_name": merge_item_name
            })

        if created_from:
            update_cursor = conn.cursor()
            update_cursor.execute("""
                UPDATE items
                SET created_from_merge = ?
                WHERE id = ?
            """, (json.dumps(created_from), result_item_id))

            if update_cursor.rowcount > 0:
                created_from_merge_updated += 1

    conn.commit()

    console.print(
        f"  [green]OK[/green] Updated {augment_items_updated} augment items with attribute bonuses"
    )
    console.print(
        f"  [green]OK[/green] Updated {update_count} armor pieces with set data (bonuses, members, name)"
    )
    console.print(
        f"  [green]OK[/green] Denormalized {skill_bonuses_updated} armor sets with skill names, {set_members_updated} armor sets with member names"
    )
    console.print(
        f"  [green]OK[/green] Updated {food_buff_count} items with food buff names, {relic_buff_count} items with relic buff names, {pack_final_count} pack items with final item names"
    )
    console.print(
        f"  [green]OK[/green] Denormalized item names in {chest_rewards_updated} chest reward lists"
    )
    console.print(
        f"  [green]OK[/green] Updated {fragment_count} fragment luck tokens, {boss_token_count} boss luck tokens with zone data"
    )
    console.print(
        f"  [green]OK[/green] Updated {merge_items_updated} merge items with denormalized data, {created_from_merge_updated} result items with merge sources"
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
    # Calculate item levels for all equipment
    console.print("  Calculating item levels...")
    cursor.execute("""
        SELECT id, stats, weapon_delay
        FROM items
        WHERE stats IS NOT NULL
    """)

    item_levels_updated = 0
    for item_id, stats_json, weapon_delay in cursor.fetchall():
        if not stats_json:
            continue

        stats = json.loads(stats_json)

        # Calculate weapon bonus if applicable
        weapon_bonus = 0
        if weapon_delay and weapon_delay > 0:
            import math
            d = -0.0365 * math.pow(weapon_delay - 15, 2)
            weapon_bonus_float = 38.017 * math.exp(d) - 0.1983 * (weapon_delay - 25)
            # C# casts to int (truncates toward zero)
            weapon_bonus = int(weapon_bonus_float)

        # Calculate item level using game formula
        item_level = round(
            stats.get('defense', 0) +
            (stats.get('strength', 0) + stats.get('constitution', 0) + stats.get('dexterity', 0) +
             stats.get('charisma', 0) + stats.get('intelligence', 0) + stats.get('wisdom', 0)) * 5 +
            stats.get('health_bonus', 0) / 10 +
            stats.get('hp_regen_bonus', 0) * 10 +
            stats.get('mana_regen_bonus', 0) * 10 +
            stats.get('mana_bonus', 0) / 10 +
            stats.get('energy_bonus', 0) / 10 +
            stats.get('damage', 0) * 0.7 +
            stats.get('magic_damage', 0) +
            stats.get('magic_resist', 0) +
            stats.get('poison_resist', 0) +
            stats.get('fire_resist', 0) +
            stats.get('cold_resist', 0) +
            stats.get('disease_resist', 0) +
            stats.get('block_chance', 0) * 200 +
            stats.get('accuracy', 0) * 200 +
            stats.get('critical_chance', 0) * 200 +
            stats.get('haste', 0) * 200 +
            stats.get('spell_haste', 0) * 200 +
            weapon_bonus
        )

        if item_level > 0:
            cursor.execute(
                "UPDATE items SET item_level = ? WHERE id = ?",
                (item_level, item_id)
            )
            item_levels_updated += 1

    # Calculate primal essence values for tradeable equipment
    console.print("  Calculating primal essence values...")
    cursor.execute("""
        SELECT id, sell_price
        FROM items
        WHERE item_type = 'equipment'
          AND quality >= 1
          AND sellable = 1
          AND sell_price > 0
    """)

    primal_essence_updated = 0
    for item_id, sell_price in cursor.fetchall():
        # Primal essence = ceil(sell_price * 0.06)
        import math
        primal_essence = math.ceil(sell_price * 0.06)

        cursor.execute(
            "UPDATE items SET primal_essence_value = ? WHERE id = ?",
            (primal_essence, item_id)
        )
        primal_essence_updated += 1

    conn.commit()

    console.print(
        f"  [green]OK[/green] Updated {len(gathered_from)} items with gather sources"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(found_in_chests)} items with chest sources"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(used_in_recipes)} items used in recipes"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(used_as_currency_for)} currency items"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(needed_for_quests)} items needed for quests"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(rewarded_by_altars)} items rewarded by altars"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(required_for_altars)} items required for altars"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(granted_by_items)} skills granted by items"
    )
    console.print(
        f"  [green]OK[/green] Calculated item levels for {item_levels_updated} items"
    )
    console.print(
        f"  [green]OK[/green] Calculated primal essence for {primal_essence_updated} items"
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
        load_luck_tokens(conn, export_dir)  # After zones + items
        load_altars(conn, export_dir)  # After zones + items
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
