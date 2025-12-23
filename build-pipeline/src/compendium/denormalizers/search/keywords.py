"""Generate search keywords for FTS5 indexing.

Keywords allow searching by entity type/category, not just name.
For example, searching "boss" finds all boss monsters, "bank" finds banker NPCs.
"""

import json
import sqlite3

from rich.console import Console

console = Console()


# NPC role flags mapped to searchable keywords (including synonyms)
NPC_ROLE_KEYWORDS = {
    "is_merchant": "vendor shop merchant buy sell store",
    "is_quest_giver": "quest giver quests",
    "can_repair_equipment": "repair",
    "is_bank": "bank storage vault deposit",
    "is_skill_master": "skill trainer skills teacher train respec",
    "is_veteran_master": "veteran trainer respec",
    "is_reset_attributes": "attribute reset respec",
    "is_soul_binder": "soul binder bind respawn",
    "is_inkeeper": "innkeeper inn rest tavern",
    "is_taskgiver_adventurer": "adventurer tasks daily dailies",
    "is_merchant_adventurer": "adventurer vendor",
    "is_recruiter_mercenaries": "mercenary recruiter hire companion pet",
    "is_guard": "guard",
    "is_faction_vendor": "faction vendor reputation rep",
    "is_essence_trader": "essence trader primal salvage",
    "is_priestess": "priestess rune runes cursed blessed bless",
    "is_augmenter": "augmenter socket remove",
    "is_renewal_sage": "renewal sage reset respawn",
}


def _generate_monster_keywords(
    is_boss: bool, is_elite: bool, is_hunt: bool
) -> str | None:
    """Generate keywords for a monster based on classification flags."""
    keywords = []
    if is_boss:
        keywords.append("boss")
    if is_elite:
        keywords.append("elite")
    if is_hunt:
        keywords.append("hunt")
    return " ".join(keywords) if keywords else None


def _generate_npc_keywords(roles_json: str | None) -> str | None:
    """Generate keywords for an NPC based on their roles."""
    if not roles_json:
        return None

    roles = json.loads(roles_json)
    keywords = []

    for role_field, keyword in NPC_ROLE_KEYWORDS.items():
        if roles.get(role_field):
            keywords.append(keyword)

    return " ".join(keywords) if keywords else None


def _generate_resource_keywords(
    is_plant: bool, is_mineral: bool, is_radiant_spark: bool
) -> str | None:
    """Generate keywords for a gathering resource based on type (including synonyms)."""
    keywords = []
    if is_plant:
        keywords.extend(["plant", "herb", "herbs", "herbalism", "forage"])
    if is_mineral:
        keywords.extend(["mineral", "ore", "mining", "vein", "node"])
    if is_radiant_spark:
        keywords.extend(["spark", "aether"])
    return " ".join(keywords) if keywords else None


def run(conn: sqlite3.Connection) -> None:
    """Generate search keywords for all searchable entities."""
    console.print("Generating search keywords...")
    cursor = conn.cursor()

    # Monster keywords (boss/elite/hunt/creature)
    cursor.execute("SELECT id, is_boss, is_elite, is_hunt FROM monsters")
    monsters = cursor.fetchall()
    monster_count = 0
    for monster_id, is_boss, is_elite, is_hunt in monsters:
        keywords = _generate_monster_keywords(is_boss, is_elite, is_hunt)
        if keywords:
            cursor.execute(
                "UPDATE monsters SET keywords = ? WHERE id = ?", (keywords, monster_id)
            )
            monster_count += 1
    console.print(
        f"  [green]OK[/green] Generated keywords for {monster_count} monsters"
    )

    # NPC keywords (service types from roles)
    cursor.execute("SELECT id, roles FROM npcs")
    npcs = cursor.fetchall()
    npc_count = 0
    for npc_id, roles_json in npcs:
        keywords = _generate_npc_keywords(roles_json)
        if keywords:
            cursor.execute(
                "UPDATE npcs SET keywords = ? WHERE id = ?", (keywords, npc_id)
            )
            npc_count += 1
    console.print(f"  [green]OK[/green] Generated keywords for {npc_count} NPCs")

    # Gathering resource keywords (plant/mineral/spark)
    cursor.execute(
        "SELECT id, is_plant, is_mineral, is_radiant_spark FROM gathering_resources"
    )
    resources = cursor.fetchall()
    resource_count = 0
    for resource_id, is_plant, is_mineral, is_spark in resources:
        keywords = _generate_resource_keywords(is_plant, is_mineral, is_spark)
        if keywords:
            cursor.execute(
                "UPDATE gathering_resources SET keywords = ? WHERE id = ?",
                (keywords, resource_id),
            )
            resource_count += 1
    console.print(
        f"  [green]OK[/green] Generated keywords for {resource_count} gathering resources"
    )

    # Portal keywords ("portal" + synonyms + destination zone name)
    cursor.execute("""
        SELECT p.id, z.name
        FROM portals p
        LEFT JOIN zones z ON p.to_zone_id = z.id
        WHERE p.is_template = 0
    """)
    portals = cursor.fetchall()
    portal_count = 0
    for portal_id, dest_zone_name in portals:
        keywords_parts = ["portal", "teleport", "gate", "warp", "travel"]
        if dest_zone_name:
            keywords_parts.append(dest_zone_name)
        keywords = " ".join(keywords_parts)
        cursor.execute(
            "UPDATE portals SET keywords = ? WHERE id = ?", (keywords, portal_id)
        )
        portal_count += 1
    console.print(f"  [green]OK[/green] Generated keywords for {portal_count} portals")

    # Crafting station keywords (with synonyms)
    cursor.execute("SELECT id, is_cooking_oven FROM crafting_stations")
    stations = cursor.fetchall()
    station_count = 0
    for station_id, is_cooking in stations:
        if is_cooking:
            keywords = "cooking cook food oven kitchen crafting"
        else:
            keywords = "forge blacksmith smithing anvil crafting"
        cursor.execute(
            "UPDATE crafting_stations SET keywords = ? WHERE id = ?",
            (keywords, station_id),
        )
        station_count += 1
    console.print(
        f"  [green]OK[/green] Generated keywords for {station_count} crafting stations"
    )

    # Alchemy table keywords (with synonyms)
    cursor.execute("SELECT id FROM alchemy_tables")
    tables = cursor.fetchall()
    table_count = 0
    for (table_id,) in tables:
        keywords = "alchemy potion potions brewing crafting"
        cursor.execute(
            "UPDATE alchemy_tables SET keywords = ? WHERE id = ?", (keywords, table_id)
        )
        table_count += 1
    console.print(
        f"  [green]OK[/green] Generated keywords for {table_count} alchemy tables"
    )

    # Chest keywords
    cursor.execute("UPDATE chests SET keywords = 'treasure'")
    chest_count = cursor.rowcount
    console.print(f"  [green]OK[/green] Generated keywords for {chest_count} chests")

    # Altar keywords (including common typo "alter")
    cursor.execute("UPDATE altars SET keywords = 'alter'")
    altar_count = cursor.rowcount
    console.print(f"  [green]OK[/green] Generated keywords for {altar_count} altars")

    conn.commit()
