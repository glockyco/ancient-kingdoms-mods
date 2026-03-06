"""Recipe denormalizers.

Enriches recipe data with information from related tables.
"""

import json
import sqlite3

from rich.console import Console

console = Console()


def run_materials(conn: sqlite3.Connection) -> None:
    """Enrich materials JSON on crafting_recipes and alchemy_recipes with item names.

    The raw materials JSON stores [{"item_id": "...", "amount": N}].
    This adds item_name to each material: [{"item_id": "...", "item_name": "...", "amount": N}].
    """
    console.print("Enriching recipe materials with item names...")

    cursor = conn.cursor()

    # Build item name lookup
    cursor.execute("SELECT id, name FROM items")
    item_names: dict[str, str] = {row[0]: row[1] for row in cursor.fetchall()}

    updated = 0
    for table in ("crafting_recipes", "alchemy_recipes"):
        cursor.execute(f"SELECT id, materials FROM {table} WHERE materials IS NOT NULL")  # noqa: S608
        rows = cursor.fetchall()

        for recipe_id, materials_json in rows:
            if not materials_json:
                continue

            materials = json.loads(materials_json)
            enriched = False

            for material in materials:
                item_id = material.get("item_id")
                if item_id and "item_name" not in material:
                    item_name = item_names.get(item_id)
                    if not item_name:
                        raise ValueError(
                            f"Material item_id '{item_id}' in recipe '{recipe_id}' "
                            f"({table}) not found in items table"
                        )
                    material["item_name"] = item_name
                    enriched = True

            if enriched:
                cursor.execute(
                    f"UPDATE {table} SET materials = ? WHERE id = ?",  # noqa: S608
                    (json.dumps(materials), recipe_id),
                )
                updated += 1

    conn.commit()
    console.print(f"  [green]OK[/green] Enriched materials for {updated} recipes")
