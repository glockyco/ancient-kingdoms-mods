"""Canonical denormalized item source summary entries."""

import sqlite3

from rich.console import Console

console = Console()

# Source: server-scripts/UINpcTrading.cs:354-365 — vendor purchases have no player-level gate unless the item adds faction or adventuring requirements.
# Source: server-scripts/Npc.cs:45-47 — adventurer merchants are a distinct NPC role.
# Source: server-scripts/Npc.cs:1914-1916 — adventurer NPC interactions treat player level 40 as the low-level cutoff.
REGULAR_VENDOR_SOURCE_LEVEL = 1
ADVENTURER_VENDOR_SOURCE_LEVEL = 40


def _insert_direct_sources(cursor: sqlite3.Cursor) -> None:
    cursor.executescript(
        f"""
        INSERT INTO item_source_entries (
            item_id, source_type, source_id, source_name, source_level, source_sort_name
        )
        SELECT
            ism.item_id,
            'drop',
            m.id,
            m.name,
            COALESCE(m.level_min, m.level),
            m.name
        FROM item_sources_monster ism
        JOIN monsters m ON m.id = ism.monster_id;

        INSERT INTO item_source_entries (
            item_id, source_type, source_id, source_name, source_level, source_sort_name
        )
        SELECT
            isq.item_id,
            'quest',
            q.id,
            q.name,
            q.level_recommended,
            q.name
        FROM item_sources_quest isq
        JOIN quests q ON q.id = isq.quest_id;

        INSERT INTO item_source_entries (
            item_id, source_type, source_id, source_name, source_level, source_sort_name
        )
        SELECT
            isv.item_id,
            'vendor',
            n.id,
            n.name,
            CASE
                WHEN json_extract(n.roles, '$.is_merchant_adventurer') = 1
                    THEN {ADVENTURER_VENDOR_SOURCE_LEVEL}
                ELSE {REGULAR_VENDOR_SOURCE_LEVEL}
            END,
            n.name
        FROM item_sources_vendor isv
        JOIN npcs n ON n.id = isv.npc_id;

        INSERT INTO item_source_entries (
            item_id, source_type, source_id, source_name, source_level, source_sort_name
        )
        SELECT
            isa.item_id,
            'altar',
            a.id,
            a.name,
            MAX(isa.min_effective_level, a.min_level_required),
            a.name
        FROM item_sources_altar isa
        JOIN altars a ON a.id = isa.altar_id;

        INSERT INTO item_source_entries (
            item_id, source_type, source_id, source_name, source_level, source_sort_name
        )
        SELECT
            isr.item_id,
            isr.recipe_type,
            isr.recipe_id,
            CASE isr.recipe_type
                WHEN 'alchemy' THEN 'Alchemy'
                WHEN 'crafting' THEN 'Crafting'
                WHEN 'scribing' THEN 'Scribing'
                ELSE 'Recipe'
            END,
            isr.source_level,
            CASE isr.recipe_type
                WHEN 'alchemy' THEN 'Alchemy'
                WHEN 'crafting' THEN 'Crafting'
                WHEN 'scribing' THEN 'Scribing'
                ELSE 'Recipe'
            END
        FROM item_sources_recipe isr;
        """
    )


def _insert_gather_and_chest_sources(cursor: sqlite3.Cursor) -> None:
    cursor.executescript(
        """
        INSERT INTO item_source_entries (
            item_id, source_type, source_id, source_name, source_level, source_sort_name
        )
        SELECT
            isg.item_id,
            'gather',
            gr.id,
            gr.name,
            MIN(z.level_median),
            gr.name
        FROM item_sources_gather isg
        JOIN gathering_resources gr ON gr.id = isg.resource_id
        LEFT JOIN gathering_resource_spawns grs ON grs.resource_id = gr.id
        LEFT JOIN zones z ON z.id = grs.zone_id
        GROUP BY isg.item_id, gr.id, gr.name;

        INSERT INTO item_source_entries (
            item_id, source_type, source_id, source_name, source_level, source_sort_name
        )
        SELECT
            isc.item_id,
            'chest',
            c.id,
            c.name,
            z.level_median,
            c.name
        FROM item_sources_chest isc
        JOIN chests c ON c.id = isc.chest_id
        LEFT JOIN zones z ON z.id = c.zone_id;
        """
    )


def _insert_container_sources(cursor: sqlite3.Cursor) -> None:
    cursor.executescript(
        """
        INSERT INTO item_source_entries (
            item_id, source_type, source_id, source_name, source_level, source_sort_name
        )
        SELECT
            isp.item_id,
            'pack',
            i.id,
            i.name,
            container_levels.source_level,
            i.name
        FROM item_sources_pack isp
        JOIN items i ON i.id = isp.pack_item_id
        LEFT JOIN (
            SELECT item_id, MIN(source_level) as source_level
            FROM item_source_entries
            WHERE source_level IS NOT NULL
            GROUP BY item_id
        ) container_levels ON container_levels.item_id = isp.pack_item_id;

        INSERT INTO item_source_entries (
            item_id, source_type, source_id, source_name, source_level, source_sort_name
        )
        SELECT
            isr.item_id,
            'random',
            i.id,
            i.name,
            container_levels.source_level,
            i.name
        FROM item_sources_random isr
        JOIN items i ON i.id = isr.random_item_id
        LEFT JOIN (
            SELECT item_id, MIN(source_level) as source_level
            FROM item_source_entries
            WHERE source_level IS NOT NULL
            GROUP BY item_id
        ) container_levels ON container_levels.item_id = isr.random_item_id;

        INSERT INTO item_source_entries (
            item_id, source_type, source_id, source_name, source_level, source_sort_name
        )
        SELECT
            ism.item_id,
            'merge',
            i.id,
            i.name,
            container_levels.source_level,
            i.name
        FROM item_sources_merge ism
        JOIN items i ON i.id = ism.component_item_id
        LEFT JOIN (
            SELECT item_id, MIN(source_level) as source_level
            FROM item_source_entries
            WHERE source_level IS NOT NULL
            GROUP BY item_id
        ) container_levels ON container_levels.item_id = ism.component_item_id;

        INSERT INTO item_source_entries (
            item_id, source_type, source_id, source_name, source_level, source_sort_name
        )
        SELECT
            istm.item_id,
            'treasure_map',
            i.id,
            i.name,
            container_levels.source_level,
            i.name
        FROM item_sources_treasure_map istm
        JOIN items i ON i.id = istm.map_item_id
        LEFT JOIN (
            SELECT item_id, MIN(source_level) as source_level
            FROM item_source_entries
            WHERE source_level IS NOT NULL
            GROUP BY item_id
        ) container_levels ON container_levels.item_id = istm.map_item_id;
        """
    )


def run(conn: sqlite3.Connection) -> None:
    """Populate canonical item source summary rows."""
    console.print("Denormalizing item source entries...")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM item_source_entries")

    _insert_direct_sources(cursor)
    _insert_gather_and_chest_sources(cursor)
    _insert_container_sources(cursor)

    count = cursor.execute("SELECT COUNT(*) FROM item_source_entries").fetchone()[0]
    conn.commit()
    console.print(f"  [green]OK[/green] Created {count} item source entries")
