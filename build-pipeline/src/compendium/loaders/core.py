"""Core data loaders for the compendium build pipeline.

Each loader reads a JSON export file, validates it with Pydantic models,
and inserts the records into the database.
"""

import json
import sqlite3
from pathlib import Path

from rich.console import Console

from compendium.db import insert_model, serialize_value
from compendium.models import (
    AlchemyRecipeData,
    AlchemyTableData,
    AltarData,
    CraftingRecipeData,
    CraftingStationData,
    GatherItemData,
    ItemData,
    LuckTokenData,
    MonsterData,
    MonsterSpawnData,
    NpcData,
    NpcSpawnData,
    PortalData,
    ProfessionData,
    QuestData,
    SkillData,
    SummonTriggerData,
    TreasureLocationData,
    ZoneData,
    ZoneTriggerData,
)

console = Console()


def load_static_data(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load static data (factions, reputation tiers) into database.

    This data is manually maintained in static_data.json since it's hardcoded
    in the game client and not exportable from game objects.
    """
    console.print("Loading static data...")

    filepath = export_dir / "static_data.json"
    if not filepath.exists():
        console.print("  [yellow]SKIP[/yellow] No static_data.json found")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    cursor = conn.cursor()

    # Load factions (nested under factions.list)
    factions_data = data.get("factions", {})
    factions = factions_data.get("list", [])
    for faction in factions:
        cursor.execute(
            "INSERT INTO factions (id, name) VALUES (?, ?)",
            (faction["id"], faction["name"]),
        )
    console.print(f"  [green]OK[/green] Loaded {len(factions)} factions")

    # Load reputation tiers (nested under factions.reputation_tiers)
    tiers = factions_data.get("reputation_tiers", [])
    for i, tier in enumerate(tiers):
        cursor.execute(
            """INSERT INTO reputation_tiers (id, name, min_value, max_value, is_hostile)
               VALUES (?, ?, ?, ?, ?)""",
            (i, tier["name"], tier["min_value"], tier["max_value"], tier["is_hostile"]),
        )
    console.print(f"  [green]OK[/green] Loaded {len(tiers)} reputation tiers")

    conn.commit()


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


def load_professions(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load professions into database."""
    console.print("Loading professions...")

    filepath = export_dir / "professions.json"
    if not filepath.exists():
        console.print("  [yellow]SKIP[/yellow] No professions.json found")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    professions = [ProfessionData(**item) for item in data]

    cursor = conn.cursor()
    for profession in professions:
        insert_model(cursor, "professions", profession)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(professions)} professions")


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


def load_treasure_locations(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load treasure dig locations into database."""
    console.print("Loading treasure locations...")

    filepath = export_dir / "treasure_locations.json"
    if not filepath.exists():
        console.print("  [yellow]SKIP[/yellow] No treasure_locations.json found")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    locations = [TreasureLocationData(**item) for item in data]

    cursor = conn.cursor()
    for loc in locations:
        insert_model(cursor, "treasure_locations", loc)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(locations)} treasure locations")


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
    resource_spawns = []  # All non-chest spawns with zone/position
    resources_seen: dict[str, GatherItemData] = {}

    for gather_item in gather_items:
        if gather_item.is_chest:
            chests.append(gather_item)
        else:
            # Track all spawns with zone/position for the spawns table
            if gather_item.zone_id and gather_item.position:
                resource_spawns.append(gather_item)

            # Deduplicate resources by name (prefer templates)
            if gather_item.name not in resources_seen:
                resources_seen[gather_item.name] = gather_item
                resources.append(gather_item)
            elif (
                gather_item.is_template
                and not resources_seen[gather_item.name].is_template
            ):
                # Replace spawn with template if we find one later
                old_idx = resources.index(resources_seen[gather_item.name])
                resources[old_idx] = gather_item
                resources_seen[gather_item.name] = gather_item

    # Insert gathering resources
    for resource in resources:
        # Insert main resource record
        values = {
            "id": resource.id,
            "name": resource.name,
            "is_plant": resource.is_plant,
            "is_mineral": resource.is_mineral,
            "is_radiant_spark": resource.is_radiant_spark,
            "level": resource.level,
            "tool_required_id": resource.tool_required_id,
            "respawn_time": resource.respawn_time,
            "spawn_ready": resource.spawn_ready,
            "prob_despawn": resource.prob_despawn,
            "item_reward_id": resource.item_reward_id,
            "item_reward_amount": resource.item_reward_amount,
            "decrease_faction": resource.decrease_faction,
            "description": resource.description,
        }

        columns = ", ".join(values.keys())
        placeholders = ", ".join(["?"] * len(values))
        sql = f"INSERT INTO gathering_resources ({columns}) VALUES ({placeholders})"
        cursor.execute(sql, tuple(values.values()))

        # Insert random drops into junction table
        for drop in resource.random_drops:
            cursor.execute(
                "INSERT INTO gathering_resource_drops (resource_id, item_id, drop_rate) VALUES (?, ?, ?)",
                (resource.id, drop.item_id, drop.rate),
            )

    # Insert gathering resource spawns (links to deduplicated resources)
    for spawn in resource_spawns:
        # Map spawn to its deduplicated resource ID
        deduplicated_resource = resources_seen[spawn.name]
        cursor.execute(
            """INSERT INTO gathering_resource_spawns
               (id, resource_id, zone_id, sub_zone_id, position_x, position_y, position_z)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                spawn.id,
                deduplicated_resource.id,
                spawn.zone_id,
                spawn.sub_zone_id,
                spawn.position.x if spawn.position else None,
                spawn.position.y if spawn.position else None,
                spawn.position.z if spawn.position else None,
            ),
        )

    # Insert chests
    for chest in chests:
        # Insert main chest record
        values = {
            "id": chest.id,
            "name": chest.name,
            "zone_id": chest.zone_id,
            "sub_zone_id": chest.sub_zone_id,
            "key_required_id": chest.tool_required_id,  # tool_required_id is the key for chests
            "gold_min": chest.gold_min,
            "gold_max": chest.gold_max,
            "item_reward_id": chest.item_reward_id,
            "item_reward_amount": chest.item_reward_amount,
            "chest_reward_probability": chest.chest_reward_probability,
            "respawn_time": chest.respawn_time,
            "decrease_faction": chest.decrease_faction,
        }

        # Add position if present
        if chest.position:
            values["position_x"] = chest.position.x
            values["position_y"] = chest.position.y
            values["position_z"] = chest.position.z

        columns = ", ".join(values.keys())
        placeholders = ", ".join(["?"] * len(values))
        sql = f"INSERT INTO chests ({columns}) VALUES ({placeholders})"
        cursor.execute(sql, tuple(values.values()))

        # Insert random drops into junction table
        for drop in chest.random_drops:
            cursor.execute(
                "INSERT INTO chest_drops (chest_id, item_id, drop_rate) VALUES (?, ?, ?)",
                (chest.id, drop.item_id, drop.rate),
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
        cursor.execute(
            """
            UPDATE gathering_resource_drops
            SET actual_drop_chance = drop_rate * ?
            WHERE resource_id = ?
        """,
            (selection_probability, resource_id),
        )

    # Calculate actual drop chances for chest drops using same logic
    console.print("  Calculating actual drop chances for chests...")
    cursor.execute("""
        SELECT chest_id, COUNT(*) as num_drops
        FROM chest_drops
        GROUP BY chest_id
    """)

    for chest_id, num_drops in cursor.fetchall():
        selection_probability = 1.0 / num_drops
        cursor.execute(
            """
            UPDATE chest_drops
            SET actual_drop_chance = drop_rate * ?
            WHERE chest_id = ?
        """,
            (selection_probability, chest_id),
        )

    conn.commit()
    console.print(
        f"  [green]OK[/green] Loaded {len(resources)} gathering resources (deduplicated)"
    )
    console.print(
        f"  [green]OK[/green] Loaded {len(resource_spawns)} gathering resource spawns"
    )
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


def load_alchemy_recipes(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load alchemy recipes into database."""
    console.print("Loading alchemy recipes...")

    filepath = export_dir / "alchemy_recipes.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    recipes = [AlchemyRecipeData(**item) for item in data]

    cursor = conn.cursor()
    for recipe in recipes:
        insert_model(cursor, "alchemy_recipes", recipe)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(recipes)} alchemy recipes")


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


def load_alchemy_tables(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load alchemy table world locations into database."""
    console.print("Loading alchemy tables...")

    filepath = export_dir / "alchemy_tables.json"
    if not filepath.exists():
        console.print("  [yellow]SKIP[/yellow] No alchemy_tables.json found")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    tables = [AlchemyTableData(**item) for item in data]

    # Build lookup maps for zone/sub-zone names
    cursor = conn.cursor()
    zone_names = dict(cursor.execute("SELECT id, name FROM zones").fetchall())
    sub_zone_names = dict(
        cursor.execute("SELECT id, name FROM zone_triggers").fetchall()
    )

    for table in tables:
        cursor.execute(
            """INSERT INTO alchemy_tables
               (id, name, zone_id, zone_name, sub_zone_id, sub_zone_name,
                position_x, position_y, position_z)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                table.id,
                table.name,
                table.zone_id,
                zone_names.get(table.zone_id),
                table.sub_zone_id,
                sub_zone_names.get(table.sub_zone_id) if table.sub_zone_id else None,
                table.position.x,
                table.position.y,
                table.position.z,
            ),
        )

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(tables)} alchemy tables")


def load_crafting_stations(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load crafting station world locations into database."""
    console.print("Loading crafting stations...")

    filepath = export_dir / "crafting_stations.json"
    if not filepath.exists():
        console.print("  [yellow]SKIP[/yellow] No crafting_stations.json found")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    stations = [CraftingStationData(**item) for item in data]

    # Build lookup maps for zone/sub-zone names
    cursor = conn.cursor()
    zone_names = dict(cursor.execute("SELECT id, name FROM zones").fetchall())
    sub_zone_names = dict(
        cursor.execute("SELECT id, name FROM zone_triggers").fetchall()
    )

    for station in stations:
        cursor.execute(
            """INSERT INTO crafting_stations
               (id, name, zone_id, zone_name, sub_zone_id, sub_zone_name,
                position_x, position_y, position_z, is_cooking_oven)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                station.id,
                station.name,
                station.zone_id,
                zone_names.get(station.zone_id),
                station.sub_zone_id,
                sub_zone_names.get(station.sub_zone_id)
                if station.sub_zone_id
                else None,
                station.position.x,
                station.position.y,
                station.position.z,
                station.is_cooking_oven,
            ),
        )

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(stations)} crafting stations")
