"""Fatecharm display metadata."""

import sqlite3

from rich.console import Console

console = Console()


def _denormalize_luck_tokens(conn: sqlite3.Connection) -> tuple[int, int]:
    """Denormalize luck token data.

    Returns:
        Tuple of (fragment_count, boss_token_count)
    """
    console.print("  Denormalizing luck token data...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT zone_id, zone_name, boss_luck_token_id, fragment_token_id,
               fragment_amount_needed
        FROM luck_tokens
    """)

    fragment_count = 0
    boss_token_count = 0

    for (
        zone_id,
        zone_name,
        boss_token_id,
        fragment_token_id,
        fragment_amount,
    ) in cursor.fetchall():
        if fragment_token_id:
            # Loot methods own the native placement-specific fragment roll.
            update_fragment_cursor = conn.cursor()
            update_fragment_cursor.execute(
                """
                UPDATE items
                SET luck_token_zone_id = ?,
                    luck_token_zone_name = ?,
                    luck_token_role = 'fragment'
                WHERE id = ?
            """,
                (
                    zone_id,
                    zone_name,
                    fragment_token_id,
                ),
            )
            if update_fragment_cursor.rowcount > 0:
                fragment_count += 1

        if boss_token_id:
            fragment_name = None
            if fragment_token_id:
                fragment_name_cursor = conn.cursor()
                fragment_result = fragment_name_cursor.execute(
                    "SELECT name FROM items WHERE id = ?", (fragment_token_id,)
                ).fetchone()
                if fragment_result:
                    fragment_name = fragment_result[0]

            update_boss_cursor = conn.cursor()
            update_boss_cursor.execute(
                """
                UPDATE items
                SET luck_token_zone_id = ?,
                    luck_token_zone_name = ?,
                    luck_token_role = 'fatecharm',
                    luck_token_fragment_id = ?,
                    luck_token_fragment_name = ?,
                    luck_token_fragments_needed = ?
                WHERE id = ?
            """,
                (
                    zone_id,
                    zone_name,
                    fragment_token_id,
                    fragment_name,
                    fragment_amount,
                    boss_token_id,
                ),
            )
            if update_boss_cursor.rowcount > 0:
                boss_token_count += 1

    return fragment_count, boss_token_count


def run(conn: sqlite3.Connection) -> None:
    """Attach Fatecharm metadata without copying acquisition definitions."""
    console.print("Denormalizing special item types...")

    # Luck tokens
    fragment_count, boss_token_count = _denormalize_luck_tokens(conn)

    conn.commit()

    console.print(
        f"  [green]OK[/green] Updated {fragment_count} fragment luck tokens, "
        f"{boss_token_count} boss luck tokens with zone data"
    )
