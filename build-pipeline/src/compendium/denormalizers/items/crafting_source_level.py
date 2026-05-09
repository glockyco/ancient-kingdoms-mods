"""Crafting source level denormalization.

Computes an effective source_level for each crafting/alchemy recipe by
examining the materials required. The source level represents the minimum
adventuring level needed to obtain all materials, derived from:

- Monster drops: MIN(spawn level) across all monsters that drop the material
- Gathering: MIN(zone median level) across all zones where the resource spawns
- Sub-recipes: recursive lookup (materials that are themselves crafted)

The recipe's source_level = MAX across all materials of each material's
minimum obtainable level. You need ALL materials, so the bottleneck is
the hardest-to-get material's easiest source.

Primal Essence is assigned the lowest source level of any repeatably obtainable
magic-or-better equipment that can be traded to an essence trader.
"""

import json
import sqlite3

from rich.console import Console

console = Console()


# Source: server-scripts/UINpcTrading.cs:354-365 — vendor purchases have no player-level gate unless the item adds faction or adventuring requirements.
# Source: server-scripts/Npc.cs:45-47 — adventurer merchants are a distinct NPC role.
# Source: server-scripts/Npc.cs:1914-1916 — adventurer NPC interactions treat player level 40 as the low-level cutoff.
REGULAR_VENDOR_SOURCE_LEVEL = 1
ADVENTURER_VENDOR_SOURCE_LEVEL = 40


def _get_material_min_level_from_monsters(
    cursor: sqlite3.Cursor,
) -> dict[str, int]:
    """Get the minimum monster spawn level for each item that drops from monsters."""
    cursor.execute("""
        SELECT
            ism.item_id,
            MIN(COALESCE(
                (SELECT MIN(ms.level) FROM monster_spawns ms WHERE ms.monster_id = m.id),
                m.level
            )) as min_level
        FROM item_sources_monster ism
        JOIN monsters m ON ism.monster_id = m.id
        GROUP BY ism.item_id
    """)
    return {row[0]: row[1] for row in cursor.fetchall()}


def _get_material_min_level_from_gathering(
    cursor: sqlite3.Cursor,
) -> dict[str, int]:
    """Get the minimum zone median level for each item obtainable from gathering."""
    cursor.execute("""
        SELECT
            isg.item_id,
            MIN(z.level_median) as min_level
        FROM item_sources_gather isg
        JOIN gathering_resources gr ON isg.resource_id = gr.id
        JOIN gathering_resource_spawns grs ON grs.resource_id = gr.id
        JOIN zones z ON z.id = grs.zone_id
        WHERE z.level_median IS NOT NULL
        GROUP BY isg.item_id
    """)
    return {row[0]: row[1] for row in cursor.fetchall()}


def _get_recipe_materials(
    cursor: sqlite3.Cursor,
) -> dict[str, list[str]]:
    """Get material item IDs for each recipe (crafting + alchemy + scribing)."""
    recipes: dict[str, list[str]] = {}

    cursor.execute(
        "SELECT id, materials FROM crafting_recipes WHERE materials IS NOT NULL"
    )
    for recipe_id, materials_json in cursor.fetchall():
        materials = json.loads(materials_json)
        recipes[recipe_id] = [m["item_id"] for m in materials]

    cursor.execute(
        "SELECT id, materials FROM alchemy_recipes WHERE materials IS NOT NULL"
    )
    for recipe_id, materials_json in cursor.fetchall():
        materials = json.loads(materials_json)
        recipes[recipe_id] = [m["item_id"] for m in materials]

    cursor.execute(
        "SELECT id, materials FROM scribing_recipes WHERE materials IS NOT NULL"
    )
    for recipe_id, materials_json in cursor.fetchall():
        materials = json.loads(materials_json)
        recipes[recipe_id] = [m["item_id"] for m in materials]

    return recipes


def _get_item_recipe_map(cursor: sqlite3.Cursor) -> dict[str, str]:
    """Map item_id -> recipe_id for items that are crafted."""
    cursor.execute("""
        SELECT item_id, recipe_id
        FROM item_sources_recipe
    """)
    return {row[0]: row[1] for row in cursor.fetchall()}


def _get_primal_essence_min_level(
    cursor: sqlite3.Cursor,
    monster_levels: dict[str, int],
    gather_levels: dict[str, int],
    item_to_recipe: dict[str, str],
    recipe_materials: dict[str, list[str]],
) -> int | None:
    """Get the lowest source level of repeatably obtainable essence-trade gear."""
    cursor.execute(
        """
        SELECT id
        FROM items
        WHERE item_type IN ('equipment', 'weapon')
          AND quality >= 2
          AND sellable = 1
          AND sell_price > 0
          AND COALESCE(weapon_category, '') != 'Pickaxe'
        """
    )
    eligible_item_ids = [row[0] for row in cursor.fetchall()]
    if not eligible_item_ids:
        return None

    candidates: list[int] = []
    temp_cache: dict[str, int | None] = {}

    # Source: server-scripts/Npc.cs:1886-1894 — essence traders accept eligible gear from player inventory.
    # Source: server-scripts/UINpcTrading.cs:371-418 — essence trader offers every eligible carried item as a repeatable trade.
    # Source: server-scripts/Utils.cs:464-470 — eligible primal essence trades require magic-or-better equipment with sell price.
    for item_id in eligible_item_ids:
        level = _resolve_material_level(
            item_id,
            monster_levels,
            gather_levels,
            item_to_recipe,
            recipe_materials,
            temp_cache,
        )
        if level is not None:
            candidates.append(level)

    cursor.execute(
        f"""
        SELECT isv.item_id,
          MIN(CASE
            WHEN json_extract(n.roles, '$.is_merchant_adventurer') = 1 THEN {ADVENTURER_VENDOR_SOURCE_LEVEL}
            ELSE {REGULAR_VENDOR_SOURCE_LEVEL}
          END) as source_level
        FROM item_sources_vendor isv
        JOIN npcs n ON isv.npc_id = n.id
        WHERE isv.item_id IN ({",".join("?" for _ in eligible_item_ids)})
        GROUP BY isv.item_id
        """,
        eligible_item_ids,
    )
    candidates.extend(row[1] for row in cursor.fetchall() if row[1] is not None)

    cursor.execute(
        f"""
        SELECT isa.item_id, MIN(MAX(isa.min_effective_level, a.min_level_required))
        FROM item_sources_altar isa
        JOIN altars a ON isa.altar_id = a.id
        WHERE isa.item_id IN ({",".join("?" for _ in eligible_item_ids)})
        GROUP BY isa.item_id
        """,
        eligible_item_ids,
    )
    candidates.extend(row[1] for row in cursor.fetchall() if row[1] is not None)

    return min(candidates) if candidates else None


def _resolve_material_level(
    item_id: str,
    monster_levels: dict[str, int],
    gather_levels: dict[str, int],
    item_to_recipe: dict[str, str],
    recipe_materials: dict[str, list[str]],
    cache: dict[str, int | None],
    depth: int = 0,
) -> int | None:
    """Resolve the minimum obtainable level for a material item.

    Checks monster drops, gathering, and recursively resolves sub-recipes.
    Returns None if the item has no determinable source level.
    """
    if item_id in cache:
        return cache[item_id]

    if depth > 10:
        cache[item_id] = None
        return None

    candidates: list[int] = []

    if item_id in monster_levels:
        candidates.append(monster_levels[item_id])

    if item_id in gather_levels:
        candidates.append(gather_levels[item_id])

    # If the item is itself crafted, resolve its materials recursively
    if item_id in item_to_recipe:
        recipe_id = item_to_recipe[item_id]
        if recipe_id in recipe_materials:
            sub_level = _compute_recipe_source_level(
                recipe_id,
                recipe_materials,
                monster_levels,
                gather_levels,
                item_to_recipe,
                cache,
                depth + 1,
            )
            if sub_level is not None:
                candidates.append(sub_level)

    result = min(candidates) if candidates else None
    cache[item_id] = result
    return result


def _compute_recipe_source_level(
    recipe_id: str,
    recipe_materials: dict[str, list[str]],
    monster_levels: dict[str, int],
    gather_levels: dict[str, int],
    item_to_recipe: dict[str, str],
    cache: dict[str, int | None],
    depth: int = 0,
) -> int | None:
    """Compute source level for a recipe = MAX of MIN source levels across materials."""
    if recipe_id not in recipe_materials:
        return None

    materials = recipe_materials[recipe_id]
    max_material_level: int | None = None

    for material_id in materials:
        level = _resolve_material_level(
            material_id,
            monster_levels,
            gather_levels,
            item_to_recipe,
            recipe_materials,
            cache,
            depth,
        )
        if level is not None:
            if max_material_level is None or level > max_material_level:
                max_material_level = level

    return max_material_level


def run(conn: sqlite3.Connection) -> None:
    """Compute source_level for all recipe source entries.

    Must run after:
    - item sources are populated (item_sources_monster, item_sources_gather, item_sources_recipe)
    - zone median levels are computed (zones.level_median)
    """
    console.print("Denormalizing crafting source levels...")
    cursor = conn.cursor()

    monster_levels = _get_material_min_level_from_monsters(cursor)
    gather_levels = _get_material_min_level_from_gathering(cursor)
    recipe_materials = _get_recipe_materials(cursor)
    item_to_recipe = _get_item_recipe_map(cursor)

    primal_essence_level = _get_primal_essence_min_level(
        cursor,
        monster_levels,
        gather_levels,
        item_to_recipe,
        recipe_materials,
    )
    cache: dict[str, int | None] = {"primal_essence": primal_essence_level}
    updated = 0

    cursor.execute("SELECT id, recipe_id FROM item_sources_recipe")
    rows = cursor.fetchall()

    for source_id, recipe_id in rows:
        source_level = _compute_recipe_source_level(
            recipe_id,
            recipe_materials,
            monster_levels,
            gather_levels,
            item_to_recipe,
            cache,
            depth=0,
        )

        if source_level is not None:
            cursor.execute(
                "UPDATE item_sources_recipe SET source_level = ? WHERE id = ?",
                (source_level, source_id),
            )
            updated += 1

    conn.commit()
    console.print(
        f"  [green]OK[/green] Computed source levels for {updated} recipe sources"
    )
