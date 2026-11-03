"""Remove the recipes that produce an item whose crafting is hidden.

The item stays published. What disappears is how a player makes it, which the
developers asked the compendium to leave out for a small set of items.

This is attribute redaction, like position suppression. It keeps the entity and
removes part of what the compendium says about it, so it reports what it removed
rather than removing anything else in turn. Before a recipe goes, the items it
makes and consumes are counted in `redacted_recipe_items`, so their pages can
say that a redacted recipe makes or uses them without saying which.
"""

import sqlite3
from collections import Counter

from rich.console import Console

from compendium.redactions.config import RedactionConfig
from compendium.redactions.discovery import foreign_keys
from compendium.redactions.semantics import INTERNAL_TABLES

console = Console()

RECIPE_TABLES = ("crafting_recipes", "alchemy_recipes", "scribing_recipes")


def run(conn: sqlite3.Connection, redactions: RedactionConfig) -> dict[str, int]:
    """Delete every recipe producing an item with hidden crafting.

    Returns the number of complete definitions removed for each item.
    """
    item_ids = redactions.hide_crafting_item_ids
    if not item_ids:
        return {}

    cursor = conn.cursor()
    per_item: dict[str, int] = {}
    conn.execute("PRAGMA defer_foreign_keys=ON")

    results: Counter[str] = Counter()
    materials: Counter[str] = Counter()
    for item_id in sorted(item_ids):
        methods = {
            row[0]
            for row in conn.execute(
                "SELECT id FROM acquisition_recipe_details WHERE declared_result_item_id=?",
                (item_id,),
            )
        }
        for method in methods:
            results[item_id] += 1
            materials.update(
                row[0]
                for row in conn.execute(
                    """SELECT DISTINCT input.item_id
                    FROM acquisition_cost_groups cost
                    JOIN acquisition_inputs input ON input.cost_group_id = cost.id
                    WHERE cost.method_id = ? AND input.item_id IS NOT NULL""",
                    (method,),
                )
            )
        removed = len(methods)
        _remove_methods(conn, methods)
        for table in RECIPE_TABLES:
            cursor.execute(f"DELETE FROM {table} WHERE result_item_id = ?", (item_id,))
        if removed:
            per_item[item_id] = removed
    cursor.executemany(
        "INSERT INTO redacted_recipe_items (item_id, role, recipes) VALUES (?, ?, ?)",
        [(item, "result", count) for item, count in sorted(results.items())]
        + [(item, "material", count) for item, count in sorted(materials.items())],
    )

    # The build owns the transaction across normalization and redaction.
    console.print(
        f"  [green]OK[/green] Removed {sum(per_item.values())} recipes "
        f"for {len(per_item)} items"
    )
    return per_item


def _remove_methods(conn: sqlite3.Connection, methods: set[str]) -> None:
    """Delete hidden definitions and all of their internal membership facts."""
    removed = {("acquisition_methods", identity) for identity in methods}
    refs = foreign_keys(conn)
    while True:
        added: set[tuple[str, str]] = set()
        for ref in refs:
            if ref.table not in INTERNAL_TABLES or ref.target_column != "id":
                continue
            targets = {
                identity for table, identity in removed if table == ref.target_table
            }
            if not targets:
                continue
            marks = ",".join("?" for _ in targets)
            added.update(
                (ref.table, row[0])
                for row in conn.execute(
                    f"SELECT id FROM {ref.table} WHERE {ref.column} IN ({marks})",
                    tuple(sorted(targets)),
                )
            )
        added -= removed
        if not added:
            break
        removed |= added
    for table, identity in sorted(removed):
        conn.execute(f"DELETE FROM {table} WHERE id=?", (identity,))
