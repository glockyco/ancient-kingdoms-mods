"""Skill fixups — correct fields that are set in game data but not used at runtime.

Some skills have special server-side handling (e.g. isCallHeroes in
TargetBuffSkill.cs) that overrides or ignores buff fields present in the
game data. These fixups zero out the spurious fields so the website
displays accurate information.
"""

import sqlite3

from rich.console import Console

console = Console()

# Skills where the server early-returns before applying any buff, so all
# buff-related fields are never used at runtime.
# Source: server-scripts/TargetBuffSkill.cs — isCallHeroes returns at line 237
_CALL_HEROES_ZERO_FIELDS = [
    "mana_percent_per_second_bonus",
    "is_cleanse",
]

_CALL_HEROES_ZERO_JSON = '{"base_value": 0, "bonus_per_level": 0}'


def run(conn: sqlite3.Connection) -> None:
    """Zero out spurious buff fields on skills with special server handling.

    call_of_the_heroes: TargetBuffSkill.cs teleports mercenaries and returns
    before any buff application. mana_percent_per_second_bonus and is_cleanse
    are set in game data but are never applied at runtime.
    """
    console.print("Applying skill fixups...")
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE skills
        SET mana_percent_per_second_bonus = ?,
            is_cleanse = 0
        WHERE id = 'call_of_the_heroes'
        """,
        (_CALL_HEROES_ZERO_JSON,),
    )

    if cursor.rowcount > 0:
        console.print(
            "  [green]OK[/green] Zeroed spurious buff fields on call_of_the_heroes"
        )
    else:
        console.print(
            "  [yellow]WARN[/yellow] call_of_the_heroes not found — fixup skipped"
        )

    conn.commit()
