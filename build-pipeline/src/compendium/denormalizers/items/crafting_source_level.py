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

Materials with no determinable source level (e.g., Primal Essence from
salvaging) are ignored — they don't gate the recipe.
"""

import json
import sqlite3

from rich.console import Console

console = Console()


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
    """Get material item IDs for each recipe (crafting + alchemy)."""
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

    return recipes


def _get_item_recipe_map(cursor: sqlite3.Cursor) -> dict[str, str]:
    """Map item_id -> recipe_id for items that are crafted."""
    cursor.execute("""
        SELECT item_id, recipe_id
        FROM item_sources_recipe
    """)
    return {row[0]: row[1] for row in cursor.fetchall()}


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

    cache: dict[str, int | None] = {}
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
