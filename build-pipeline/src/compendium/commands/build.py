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
    NpcData,
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
    rate: float
    zone_id: str


class GatherDropInfo(TypedDict):
    gather_item_id: str
    rate: float


class SoldByInfo(TypedDict):
    npc_id: str
    price: int
    currency_item_id: str | None
    zone_id: str


class RewardedByInfo(TypedDict):
    quest_id: str


class CraftedFromInfo(TypedDict):
    recipe_id: str
    result_amount: int


class UsedInRecipeInfo(TypedDict):
    recipe_id: str
    amount: int


class NeededForQuestInfo(TypedDict):
    quest_id: str
    purpose: str
    amount: int


class GrantedByItemInfo(TypedDict):
    item_id: str
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
    """Load gather items into database."""
    console.print("Loading gather items...")

    filepath = export_dir / "gather_items.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    gather_items = [GatherItemData(**item) for item in data]

    cursor = conn.cursor()
    for gather_item in gather_items:
        insert_model(cursor, "gather_items", gather_item)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(gather_items)} gather items")


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
        for order, monster_id in enumerate(placeholder_ids):
            cursor.execute(
                "INSERT INTO summon_trigger_placeholders (trigger_id, monster_id, placeholder_order) VALUES (?, ?, ?)",
                (trigger.id, monster_id, order),
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
        SELECT id, zone_id, drops
        FROM monsters
        WHERE drops IS NOT NULL AND drops != '[]'
    """)

    dropped_by: dict[str, list[DropInfo]] = {}

    for monster_id, zone_id, drops_json in cursor.fetchall():
        drops = json.loads(drops_json)
        for drop in drops:
            item_id = drop.get("item_id")
            if item_id:
                if item_id not in dropped_by:
                    dropped_by[item_id] = []
                dropped_by[item_id].append(
                    {
                        "monster_id": monster_id,
                        "rate": drop.get("rate", 0.0),
                        "zone_id": zone_id,
                    }
                )

    # Build gathered_from from gather_items.random_drops
    console.print("  Processing gather item drops...")
    cursor.execute("""
        SELECT id, random_drops
        FROM gather_items
        WHERE random_drops IS NOT NULL AND random_drops != '[]'
    """)

    gathered_from: dict[str, list[GatherDropInfo]] = {}

    for gather_item_id, drops_json in cursor.fetchall():
        drops = json.loads(drops_json)
        for drop in drops:
            item_id = drop.get("item_id")
            if item_id:
                if item_id not in gathered_from:
                    gathered_from[item_id] = []
                gathered_from[item_id].append(
                    {"gather_item_id": gather_item_id, "rate": drop.get("rate", 0.0)}
                )

    # Build sold_by from npcs.items_sold
    console.print("  Processing NPC vendors...")
    cursor.execute("""
        SELECT id, zone_id, items_sold
        FROM npcs
        WHERE items_sold IS NOT NULL AND items_sold != '[]'
    """)

    sold_by: dict[str, list[SoldByInfo]] = {}

    for npc_id, zone_id, items_sold_json in cursor.fetchall():
        items_sold = json.loads(items_sold_json)
        for item_sale in items_sold:
            item_id = item_sale.get("item_id")
            if item_id:
                if item_id not in sold_by:
                    sold_by[item_id] = []
                sold_by[item_id].append(
                    {
                        "npc_id": npc_id,
                        "price": item_sale.get("price", 0),
                        "currency_item_id": item_sale.get("currency_item_id"),
                        "zone_id": zone_id,
                    }
                )

    # Build rewarded_by from quests.rewards
    console.print("  Processing quest rewards...")
    cursor.execute("""
        SELECT id, rewards
        FROM quests
        WHERE rewards IS NOT NULL
    """)

    rewarded_by: dict[str, list[RewardedByInfo]] = {}

    for quest_id, rewards_json in cursor.fetchall():
        rewards = json.loads(rewards_json)
        items = rewards.get("items", [])
        for item in items:
            item_id = item.get("item_id")
            if item_id:
                if item_id not in rewarded_by:
                    rewarded_by[item_id] = []
                rewarded_by[item_id].append({"quest_id": quest_id})

    # Build crafted_from from crafting_recipes
    console.print("  Processing crafting recipes...")
    cursor.execute("""
        SELECT id, result_item_id, result_amount
        FROM crafting_recipes
        WHERE result_item_id IS NOT NULL
    """)

    crafted_from: dict[str, list[CraftedFromInfo]] = {}

    for recipe_id, result_item_id, result_amount in cursor.fetchall():
        if result_item_id:
            if result_item_id not in crafted_from:
                crafted_from[result_item_id] = []
            crafted_from[result_item_id].append(
                {"recipe_id": recipe_id, "result_amount": result_amount}
            )

    # Update items table
    console.print("  Updating items table...")
    for item_id, drops in dropped_by.items():
        cursor.execute(
            "UPDATE items SET dropped_by = ? WHERE id = ?", (json.dumps(drops), item_id)
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
        cursor.execute(
            "UPDATE items SET gathered_from = ? WHERE id = ?",
            (json.dumps(gathers), item_id),
        )

    # Build used_in_recipes from crafting_recipes.materials
    console.print("  Processing recipe materials...")
    cursor.execute("""
        SELECT id, materials
        FROM crafting_recipes
        WHERE materials IS NOT NULL AND materials != '[]'
    """)

    used_in_recipes: dict[str, list[UsedInRecipeInfo]] = {}

    for recipe_id, materials_json in cursor.fetchall():
        materials = json.loads(materials_json)
        for material in materials:
            item_id = material.get("item_id")
            if item_id:
                if item_id not in used_in_recipes:
                    used_in_recipes[item_id] = []
                used_in_recipes[item_id].append(
                    {"recipe_id": recipe_id, "amount": material.get("amount", 1)}
                )

    # Build needed_for_quests from quest objectives
    console.print("  Processing quest item requirements...")
    cursor.execute("""
        SELECT id, gather_item_1_id, gather_amount_1, gather_item_2_id, gather_amount_2,
               gather_item_3_id, gather_amount_3, gather_items, required_items, equip_items
        FROM quests
    """)

    needed_for_quests: dict[str, list[NeededForQuestInfo]] = {}

    for row in cursor.fetchall():
        quest_id = row[0]

        # Process gather_item_1, 2, 3
        if row[1]:  # gather_item_1_id
            item_id = row[1]
            if item_id not in needed_for_quests:
                needed_for_quests[item_id] = []
            needed_for_quests[item_id].append(
                {
                    "quest_id": quest_id,
                    "purpose": "gather",
                    "amount": row[2] or 1,  # gather_amount_1
                }
            )

        if row[3]:  # gather_item_2_id
            item_id = row[3]
            if item_id not in needed_for_quests:
                needed_for_quests[item_id] = []
            needed_for_quests[item_id].append(
                {
                    "quest_id": quest_id,
                    "purpose": "gather",
                    "amount": row[4] or 1,  # gather_amount_2
                }
            )

        if row[5]:  # gather_item_3_id
            item_id = row[5]
            if item_id not in needed_for_quests:
                needed_for_quests[item_id] = []
            needed_for_quests[item_id].append(
                {
                    "quest_id": quest_id,
                    "purpose": "gather",
                    "amount": row[6] or 1,  # gather_amount_3
                }
            )

        # Process gather_items (JSON array)
        if row[7]:  # gather_items
            gather_items_list = json.loads(row[7])
            for item_obj in gather_items_list:
                item_id = item_obj.get("item_id")
                if item_id:
                    if item_id not in needed_for_quests:
                        needed_for_quests[item_id] = []
                    needed_for_quests[item_id].append(
                        {
                            "quest_id": quest_id,
                            "purpose": "gather",
                            "amount": item_obj.get("amount", 1),
                        }
                    )

        # Process required_items (JSON array)
        if row[8]:  # required_items
            required_items_list = json.loads(row[8])
            for item_obj in required_items_list:
                item_id = item_obj.get("item_id")
                if item_id:
                    if item_id not in needed_for_quests:
                        needed_for_quests[item_id] = []
                    needed_for_quests[item_id].append(
                        {
                            "quest_id": quest_id,
                            "purpose": "required",
                            "amount": item_obj.get("amount", 1),
                        }
                    )

        # Process equip_items (JSON array of item IDs)
        if row[9]:  # equip_items
            equip_items_list = json.loads(row[9])
            for item_id in equip_items_list:
                if item_id:
                    if item_id not in needed_for_quests:
                        needed_for_quests[item_id] = []
                    needed_for_quests[item_id].append(
                        {"quest_id": quest_id, "purpose": "equip", "amount": 1}
                    )

    # Build granted_by_items for skills
    console.print("  Processing items that grant skills...")
    cursor.execute("""
        SELECT id, potion_buff_id, potion_buff_level, food_buff_id, food_buff_level,
               scroll_skill_id, weapon_proc_effect_id, weapon_proc_effect_probability,
               relic_buff_id, relic_buff_level
        FROM items
    """)

    granted_by_items: dict[str, list[GrantedByItemInfo]] = {}

    for row in cursor.fetchall():
        item_id = row[0]

        # Potion buff
        if row[1]:  # potion_buff_id
            skill_id = row[1]
            if skill_id not in granted_by_items:
                granted_by_items[skill_id] = []
            granted_by_items[skill_id].append(
                {
                    "item_id": item_id,
                    "type": "potion_buff",
                    "level": row[2] or 0,  # potion_buff_level
                }
            )

        # Food buff
        if row[3]:  # food_buff_id
            skill_id = row[3]
            if skill_id not in granted_by_items:
                granted_by_items[skill_id] = []
            granted_by_items[skill_id].append(
                {
                    "item_id": item_id,
                    "type": "food_buff",
                    "level": row[4] or 0,  # food_buff_level
                }
            )

        # Scroll skill
        if row[5]:  # scroll_skill_id
            skill_id = row[5]
            if skill_id not in granted_by_items:
                granted_by_items[skill_id] = []
            granted_by_items[skill_id].append({"item_id": item_id, "type": "scroll"})

        # Weapon proc effect
        if row[6]:  # weapon_proc_effect_id
            skill_id = row[6]
            if skill_id not in granted_by_items:
                granted_by_items[skill_id] = []
            granted_by_items[skill_id].append(
                {
                    "item_id": item_id,
                    "type": "weapon_proc",
                    "probability": row[7] or 0.0,  # weapon_proc_effect_probability
                }
            )

        # Relic buff
        if row[8]:  # relic_buff_id
            skill_id = row[8]
            if skill_id not in granted_by_items:
                granted_by_items[skill_id] = []
            granted_by_items[skill_id].append(
                {
                    "item_id": item_id,
                    "type": "relic_buff",
                    "level": row[9] or 0,  # relic_buff_level
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
    for augment_name, skill_bonuses_json, set_item_ids_json, set_name in cursor.fetchall():
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
        load_npcs(conn, export_dir)
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
