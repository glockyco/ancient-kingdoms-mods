"""Remove the recipes that produce an item whose crafting is hidden.

The item stays published. What disappears is how a player makes it, which the
game keeps out of the journal for a small set of items.

This is attribute redaction, like position suppression. It keeps the entity and
removes part of what the compendium says about it, so it reports what it removed
rather than removing anything else in turn.
"""

import sqlite3

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

    for item_id in sorted(item_ids):
        methods = {
            row[0]
            for row in conn.execute(
                "SELECT id FROM acquisition_recipe_details WHERE declared_result_item_id=?",
                (item_id,),
            )
        }
        removed = len(methods)
        _remove_methods(conn, methods)
        for table in RECIPE_TABLES:
            cursor.execute(f"DELETE FROM {table} WHERE result_item_id = ?", (item_id,))
        if removed:
            per_item[item_id] = removed

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
