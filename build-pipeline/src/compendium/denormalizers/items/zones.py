"""Item zone denormalizations - precompute item-zone relationships for efficient filtering.

This module populates the item_zones_obtainable and item_zones_usable tables
by joining source/usage tables with their respective zone sources.
"""

from __future__ import annotations

import sqlite3

from rich.console import Console

console = Console()


def _populate_monster_zones(conn: sqlite3.Connection) -> None:
    """Populate item_zones_obtainable for monster drops."""
    console.print("  Processing monster drop zones...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ism.item_id, ms.zone_id
        FROM item_sources_monster ism
        JOIN monster_spawns ms ON ism.monster_id = ms.monster_id
        GROUP BY ism.item_id, ms.zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_obtainable (item_id, zone_id, source_type)
            VALUES (?, ?, 'monster')
        """,
            (item_id, zone_id),
        )


def _populate_vendor_zones(conn: sqlite3.Connection) -> None:
    """Populate item_zones_obtainable for vendor sales."""
    console.print("  Processing vendor zones...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT isv.item_id, ns.zone_id
        FROM item_sources_vendor isv
        JOIN npc_spawns ns ON isv.npc_id = ns.npc_id
        GROUP BY isv.item_id, ns.zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_obtainable (item_id, zone_id, source_type)
            VALUES (?, ?, 'vendor')
        """,
            (item_id, zone_id),
        )


def _populate_altar_source_zones(conn: sqlite3.Connection) -> None:
    """Populate item_zones_obtainable for altar rewards."""
    console.print("  Processing altar reward zones...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT isa.item_id, a.zone_id
        FROM item_sources_altar isa
        JOIN altars a ON isa.altar_id = a.id
        GROUP BY isa.item_id, a.zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_obtainable (item_id, zone_id, source_type)
            VALUES (?, ?, 'altar')
        """,
            (item_id, zone_id),
        )


def _populate_treasure_map_zones(conn: sqlite3.Connection) -> None:
    """Populate item_zones_obtainable for treasure map rewards."""
    console.print("  Processing treasure map zones...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT istm.item_id, tl.zone_id
        FROM item_sources_treasure_map istm
        JOIN treasure_locations tl ON istm.treasure_location_id = tl.id
        GROUP BY istm.item_id, tl.zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_obtainable (item_id, zone_id, source_type)
            VALUES (?, ?, 'treasure_map')
        """,
            (item_id, zone_id),
        )


def _populate_gather_zones(conn: sqlite3.Connection) -> None:
    """Populate item_zones_obtainable for gathering resources."""
    console.print("  Processing gathering resource zones...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT isg.item_id, grs.zone_id
        FROM item_sources_gather isg
        JOIN gathering_resource_spawns grs ON isg.resource_id = grs.resource_id
        GROUP BY isg.item_id, grs.zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_obtainable (item_id, zone_id, source_type)
            VALUES (?, ?, 'gather')
        """,
            (item_id, zone_id),
        )


def _populate_chest_source_zones(conn: sqlite3.Connection) -> None:
    """Populate item_zones_obtainable for chest drops."""
    console.print("  Processing chest source zones...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT isc.item_id, c.zone_id
        FROM item_sources_chest isc
        JOIN chests c ON isc.chest_id = c.id
        GROUP BY isc.item_id, c.zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_obtainable (item_id, zone_id, source_type)
            VALUES (?, ?, 'chest')
        """,
            (item_id, zone_id),
        )


def _populate_recipe_source_zones(conn: sqlite3.Connection) -> None:
    """Populate item_zones_obtainable for crafted items (by station location)."""
    console.print("  Processing recipe source zones...")
    cursor = conn.cursor()

    # Join with crafting stations
    cursor.execute("""
        SELECT isr.item_id, cs.zone_id
        FROM item_sources_recipe isr
        JOIN crafting_recipes cr ON isr.recipe_id = cr.id
        JOIN crafting_stations cs ON cr.station_type = cs.is_cooking_oven
        WHERE isr.recipe_type = 'crafting'
        GROUP BY isr.item_id, cs.zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_obtainable (item_id, zone_id, source_type)
            VALUES (?, ?, 'recipe')
        """,
            (item_id, zone_id),
        )

    # Join with alchemy tables
    cursor.execute("""
        SELECT isr.item_id, at.zone_id
        FROM item_sources_recipe isr
        JOIN alchemy_recipes ar ON isr.recipe_id = ar.id
        JOIN alchemy_tables at ON 1=1  -- All alchemy tables are valid
        WHERE isr.recipe_type = 'alchemy'
        GROUP BY isr.item_id, at.zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_obtainable (item_id, zone_id, source_type)
            VALUES (?, ?, 'recipe')
        """,
            (item_id, zone_id),
        )

    # Join with scribing tables
    cursor.execute("""
        SELECT isr.item_id, st.zone_id
        FROM item_sources_recipe isr
        JOIN scribing_recipes sr ON isr.recipe_id = sr.id
        JOIN scribing_tables st ON 1=1  -- All scribing tables are valid
        WHERE isr.recipe_type = 'scribing'
        GROUP BY isr.item_id, st.zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_obtainable (item_id, zone_id, source_type)
            VALUES (?, ?, 'recipe')
        """,
            (item_id, zone_id),
        )


def _populate_altar_usage_zones(conn: sqlite3.Connection) -> None:
    """Populate item_zones_usable for altar activation items."""
    console.print("  Processing altar usage zones...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT iua.item_id, a.zone_id
        FROM item_usages_altar iua
        JOIN altars a ON iua.altar_id = a.id
        GROUP BY iua.item_id, a.zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_usable (item_id, zone_id, usage_type)
            VALUES (?, ?, 'altar')
        """,
            (item_id, zone_id),
        )


def _populate_portal_zones(conn: sqlite3.Connection) -> None:
    """Populate item_zones_usable for portal access items."""
    console.print("  Processing portal usage zones...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT iup.item_id, p.from_zone_id
        FROM item_usages_portal iup
        JOIN portals p ON iup.portal_id = p.id
        GROUP BY iup.item_id, p.from_zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_usable (item_id, zone_id, usage_type)
            VALUES (?, ?, 'portal')
        """,
            (item_id, zone_id),
        )


def _populate_chest_usage_zones(conn: sqlite3.Connection) -> None:
    """Populate item_zones_usable for chest keys."""
    console.print("  Processing chest usage zones...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT iuc.item_id, c.zone_id
        FROM item_usages_chest iuc
        JOIN chests c ON iuc.chest_id = c.id
        GROUP BY iuc.item_id, c.zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_usable (item_id, zone_id, usage_type)
            VALUES (?, ?, 'chest')
        """,
            (item_id, zone_id),
        )


def _populate_recipe_usage_zones(conn: sqlite3.Connection) -> None:
    """Populate item_zones_usable for recipe materials (by station location)."""
    console.print("  Processing recipe usage zones...")
    cursor = conn.cursor()

    # Join with crafting stations
    cursor.execute("""
        SELECT iur.item_id, cs.zone_id
        FROM item_usages_recipe iur
        JOIN crafting_recipes cr ON iur.recipe_id = cr.id
        JOIN crafting_stations cs ON cr.station_type = cs.is_cooking_oven
        WHERE iur.recipe_type = 'crafting'
        GROUP BY iur.item_id, cs.zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_usable (item_id, zone_id, usage_type)
            VALUES (?, ?, 'recipe')
        """,
            (item_id, zone_id),
        )

    # Join with alchemy tables
    cursor.execute("""
        SELECT iur.item_id, at.zone_id
        FROM item_usages_recipe iur
        JOIN alchemy_recipes ar ON iur.recipe_id = ar.id
        JOIN alchemy_tables at ON 1=1  -- All alchemy tables are valid
        WHERE iur.recipe_type = 'alchemy'
        GROUP BY iur.item_id, at.zone_id
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_usable (item_id, zone_id, usage_type)
            VALUES (?, ?, 'recipe')
        """,
            (item_id, zone_id),
        )


def _populate_quest_usage_zones(conn: sqlite3.Connection) -> None:
    """Populate item_zones_usable for quest requirements (by quest NPC locations)."""
    console.print("  Processing quest usage zones...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT iuq.item_id, q.zone_id_final_npc
        FROM item_usages_quest iuq
        JOIN quests q ON iuq.quest_id = q.id
        WHERE q.zone_id_final_npc != -1
        GROUP BY iuq.item_id, q.zone_id_final_npc
    """)

    for item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_usable (item_id, zone_id, usage_type)
            VALUES (?, ?, 'quest')
        """,
            (item_id, zone_id),
        )


def _populate_currency_zones(conn: sqlite3.Connection) -> None:
    """Populate item_zones_usable for currency items (by vendor locations)."""
    console.print("  Processing currency usage zones...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT iuc.currency_item_id, ns.zone_id
        FROM item_usages_currency iuc
        JOIN npc_spawns ns ON iuc.npc_id = ns.npc_id
        GROUP BY iuc.currency_item_id, ns.zone_id
    """)

    for currency_item_id, zone_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_zones_usable (currency_item_id, zone_id, usage_type)
            VALUES (?, ?, 'currency')
        """,
            (currency_item_id, zone_id),
        )


def run(conn: sqlite3.Connection) -> None:
    """Run all item zone denormalizations.

    Populates item_zones_obtainable and item_zones_usable tables
    by joining source/usage tables with their respective zone sources.

    Args:
        conn: Database connection
    """
    console.print("Denormalizing item zones...")

    cursor = conn.cursor()

    # Clear zone tables first
    console.print("  Clearing zone tables...")
    cursor.execute("DELETE FROM item_zones_obtainable")
    cursor.execute("DELETE FROM item_zones_usable")

    # Populate obtainable zones
    console.print("  Populating obtainable zones...")
    _populate_monster_zones(conn)
    _populate_vendor_zones(conn)
    _populate_altar_source_zones(conn)
    _populate_gather_zones(conn)
    _populate_chest_source_zones(conn)

    # Populate usable zones
    console.print("  Populating usable zones...")
    _populate_altar_usage_zones(conn)
    _populate_portal_zones(conn)
    _populate_chest_usage_zones(conn)

    conn.commit()

    console.print("  [green]OK[/green] Item zone relationships populated")
