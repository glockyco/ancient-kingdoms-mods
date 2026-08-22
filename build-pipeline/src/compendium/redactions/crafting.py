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

console = Console()

RECIPE_TABLES = ("crafting_recipes", "alchemy_recipes")


def run(conn: sqlite3.Connection, redactions: RedactionConfig) -> dict[str, int]:
    """Delete every recipe producing an item with hidden crafting.

    Returns the number of recipes removed for each item, for the ledger.
    """
    item_ids = redactions.hide_crafting_item_ids
    if not item_ids:
        return {}

    cursor = conn.cursor()
    per_item: dict[str, int] = {}

    for item_id in sorted(item_ids):
        removed = 0
        for table in RECIPE_TABLES:
            cursor.execute(f"DELETE FROM {table} WHERE result_item_id = ?", (item_id,))
            removed += cursor.rowcount
        if removed:
            per_item[item_id] = removed

    conn.commit()
    console.print(
        f"  [green]OK[/green] Removed {sum(per_item.values())} recipes "
        f"for {len(per_item)} items"
    )
    return per_item
