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
    ClassData,
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


def load_classes(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load player classes into database."""
    console.print("Loading classes...")

    filepath = export_dir / "classes.json"
    if not filepath.exists():
        console.print("  [yellow]SKIP[/yellow] No classes.json found")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    classes = [ClassData(**item) for item in data]

    # Validation: assert at least 6 classes exist to catch export errors
    if len(classes) < 6:
        msg = f"Expected at least 6 classes, found {len(classes)}"
        raise ValueError(msg)

    # Warning: unexpected growth if more than 8 classes
    if len(classes) > 8:
        console.print(
            f"  [yellow]Warning:[/yellow] Found {len(classes)} classes (expected 6-8)"
        )

    cursor = conn.cursor()
    for cls in classes:
        insert_model(cursor, "classes", cls)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(classes)} classes")


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
        # Normalize class names to lowercase for consistent querying
        skill.player_classes = [c.lower() for c in skill.player_classes]
        insert_model(cursor, "skills", skill)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(skills)} skills")


def load_items(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load items into database.

    Also populates junction tables for item container relationships:
    - item_sources_pack (pack contents)
    - item_sources_random (random item pools)
    - item_sources_merge (merge recipe components)
    - item_sources_treasure_map (treasure map rewards)
    """
    console.print("Loading items...")

    filepath = export_dir / "items.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = [ItemData(**item) for item in data]

    cursor = conn.cursor()
    # Defer FK checks for self-referential item foreign keys
    cursor.execute("PRAGMA defer_foreign_keys = ON")

    # Clear junction tables that will be repopulated
    cursor.execute("DELETE FROM item_sources_pack")
    cursor.execute("DELETE FROM item_sources_random")
    cursor.execute("DELETE FROM item_sources_merge")

    # Track items with treasure map rewards for later processing
    # (treasure_locations table doesn't exist yet at this point)
    treasure_map_items: list[tuple[str, str]] = []

    # Track counts for logging
    pack_count = 0
    random_count = 0
    merge_count = 0

    # Track seen merge recipes to avoid duplicates
    # (multiple component items may reference the same merge result)
    seen_merge_recipes: set[str] = set()

    for item in items:
        # Normalize class names to lowercase for consistent querying
        item.class_required = [c.lower() for c in item.class_required]
        # Insert main item record (insert_model only inserts fields that match schema)
        insert_model(cursor, "items", item)

        # Populate junction tables from forward relationships
        # These fields exist in ItemData model but not in items table schema

        # 1. Pack contents: item.pack_final_item_id → item_sources_pack
        if item.pack_final_item_id:
            cursor.execute(
                "INSERT INTO item_sources_pack (item_id, pack_item_id, amount) VALUES (?, ?, ?)",
                (item.pack_final_item_id, item.id, item.pack_final_amount),
            )
            pack_count += 1

        # 2. Random item pools: item.random_items[] → item_sources_random
        if item.random_items:
            item_count = len(item.random_items)
            probability = 1.0 / item_count if item_count > 0 else 0.0
            for random_item_id in item.random_items:
                cursor.execute(
                    "INSERT INTO item_sources_random (item_id, random_item_id, probability) VALUES (?, ?, ?)",
                    (random_item_id, item.id, probability),
                )
            random_count += 1

        # 3. Merge recipes: item.merge_items_needed_ids[] → item_sources_merge
        #    Track merge recipes by their result item ID to avoid duplicates
        #    (multiple component items may reference the same merge recipe)
        if item.merge_items_needed_ids and item.merge_result_item_id:
            # Use result item ID as the unique key for this merge recipe
            if item.merge_result_item_id not in seen_merge_recipes:
                seen_merge_recipes.add(item.merge_result_item_id)
                for component_id in item.merge_items_needed_ids:
                    cursor.execute(
                        "INSERT INTO item_sources_merge (item_id, component_item_id) VALUES (?, ?)",
                        (item.merge_result_item_id, component_id),
                    )
                merge_count += 1

        # 4. Treasure maps: defer until treasure_locations table is loaded
        if item.treasure_map_reward_id:
            treasure_map_items.append((item.id, item.treasure_map_reward_id))

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(items)} items")
    if pack_count > 0 or random_count > 0 or merge_count > 0:
        console.print(
            f"  [green]OK[/green] Populated junction tables: {pack_count} packs, {random_count} random, {merge_count} merge"
        )

    # Store treasure map data for later processing
    # Will be populated by load_treasure_locations() after that table exists
    cursor.execute(
        "CREATE TEMP TABLE IF NOT EXISTS pending_treasure_maps (map_id TEXT, reward_id TEXT)"
    )
    for map_id, reward_id in treasure_map_items:
        cursor.execute(
            "INSERT INTO pending_treasure_maps VALUES (?, ?)", (map_id, reward_id)
        )
    conn.commit()


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


def load_monster_skills(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Populate monster_skills junction table from monsters.json skill_ids."""
    console.print("Loading monster skills...")

    filepath = export_dir / "monsters.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    monsters = [MonsterData(**item) for item in data]

    cursor = conn.cursor()

    # Build set of valid skill IDs for referential integrity
    valid_skills = {
        row[0] for row in cursor.execute("SELECT id FROM skills").fetchall()
    }

    count = 0
    skipped = 0
    for monster in monsters:
        for index, skill_id in enumerate(monster.skill_ids):
            if skill_id in valid_skills:
                cursor.execute(
                    "INSERT INTO monster_skills (monster_id, skill_id, skill_index) VALUES (?, ?, ?)",
                    (monster.id, skill_id, index),
                )
                count += 1
            else:
                skipped += 1

    conn.commit()
    if skipped > 0:
        console.print(
            f"  [green]OK[/green] Loaded {count} monster-skill links (skipped {skipped} unknown skill refs)"
        )
    else:
        console.print(f"  [green]OK[/green] Loaded {count} monster-skill links")


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
        # Normalize class names to lowercase for consistent querying
        quest.class_requirements = [c.lower() for c in quest.class_requirements]
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

    # Process pending treasure map items now that treasure_locations exists
    # Build lookup dict: required_map_id -> treasure_location.id
    treasure_location_lookup: dict[str, str] = {}
    for loc in locations:
        if loc.required_map_id:
            treasure_location_lookup[loc.required_map_id] = loc.id

    # Populate item_sources_treasure_map from pending items
    pending = cursor.execute(
        "SELECT map_id, reward_id FROM pending_treasure_maps"
    ).fetchall()
    for map_id, reward_id in pending:
        location_id = treasure_location_lookup.get(map_id)
        cursor.execute(
            "INSERT INTO item_sources_treasure_map (item_id, map_item_id, treasure_location_id) VALUES (?, ?, ?)",
            (reward_id, map_id, location_id),
        )

    # Clean up temp table
    cursor.execute("DROP TABLE IF EXISTS pending_treasure_maps")

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

    # Clear junction tables that will be repopulated
    # (random drops from this loader + guaranteed drops from denormalizer)
    cursor.execute("DELETE FROM item_sources_gather")
    cursor.execute("DELETE FROM item_sources_chest")

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
        # For non-template resources, derive a clean ID from the name
        # This handles cases like radiant sparks which only exist as scene instances
        resource_id = (
            resource.id
            if resource.is_template
            else resource.name.lower().replace(" ", "_")
        )

        # Insert main resource record
        values = {
            "id": resource_id,
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
                "INSERT INTO item_sources_gather (item_id, resource_id, drop_rate) VALUES (?, ?, ?)",
                (drop.item_id, resource_id, drop.rate),
            )

    # Insert gathering resource spawns (links to deduplicated resources)
    for spawn in resource_spawns:
        # Map spawn to its deduplicated resource - derive normalized ID from name
        deduplicated_resource = resources_seen[spawn.name]
        normalized_resource_id = (
            deduplicated_resource.id
            if deduplicated_resource.is_template
            else deduplicated_resource.name.lower().replace(" ", "_")
        )
        cursor.execute(
            """INSERT INTO gathering_resource_spawns
               (id, resource_id, zone_id, sub_zone_id, position_x, position_y, position_z)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                spawn.id,
                normalized_resource_id,
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
            # Game uses 0 = guaranteed (100%), >0 = actual probability
            # Convert to standard: 0 = 0%, 1 = 100%
            "chest_reward_probability": 1.0
            if chest.chest_reward_probability == 0
            else chest.chest_reward_probability,
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
                "INSERT INTO item_sources_chest (item_id, chest_id, drop_rate) VALUES (?, ?, ?)",
                (drop.item_id, chest.id, drop.rate),
            )

    # Calculate actual drop chances for gathering resource drops
    # Game logic: picks ONE random drop uniformly, then rolls its probability
    # Actual drop chance = (1 / num_drops) * drop_rate
    console.print("  Calculating actual drop chances for gathering resources...")
    cursor.execute("""
        SELECT resource_id, COUNT(*) as num_drops
        FROM item_sources_gather
        GROUP BY resource_id
    """)

    for resource_id, num_drops in cursor.fetchall():
        selection_probability = 1.0 / num_drops
        cursor.execute(
            """
            UPDATE item_sources_gather
            SET actual_drop_chance = drop_rate * ?
            WHERE resource_id = ?
        """,
            (selection_probability, resource_id),
        )

    # Calculate actual drop chances for chest drops using same logic
    console.print("  Calculating actual drop chances for chests...")
    cursor.execute("""
        SELECT chest_id, COUNT(*) as num_drops
        FROM item_sources_chest
        GROUP BY chest_id
    """)

    for chest_id, num_drops in cursor.fetchall():
        selection_probability = 1.0 / num_drops
        cursor.execute(
            """
            UPDATE item_sources_chest
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
