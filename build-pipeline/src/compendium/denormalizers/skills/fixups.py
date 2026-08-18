"""Skill fixups — correct fields that are set in game data but not used at runtime.

Some skills have special server-side handling (e.g. isCallHeroes in
TargetBuffSkill.cs) that overrides or ignores buff fields present in the
game data. These fixups zero out the spurious fields so the website
displays accurate information.
"""

import json
import sqlite3

from rich.console import Console

console = Console()

_ZERO_JSON = '{"base_value": 0, "bonus_per_level": 0}'

# All LinearFloat stat fields that can appear on buff/debuff skills.
# Dispel skills (is_dispel=1) never call AddOrRefreshBuff, so these are unused.
# Source: AreaDebuffSkill.cs:161-258, TargetDebuffSkill.cs:168-265 —
# isDispel branch calls SpawnEffect and returns; the else branch with
# AddOrRefreshBuff is never reached.
_STAT_JSON_FIELDS = [
    "damage_bonus",
    "damage_percent_bonus",
    "magic_damage_bonus",
    "magic_damage_percent_bonus",
    "defense_bonus",
    "ward_bonus",
    "magic_resist_bonus",
    "poison_resist_bonus",
    "fire_resist_bonus",
    "cold_resist_bonus",
    "disease_resist_bonus",
    "haste_bonus",
    "spell_haste_bonus",
    "speed_bonus",
    "critical_chance_bonus",
    "critical_resist_bonus",
    "accuracy_bonus",
    "block_chance_bonus",
    "fear_resist_chance_bonus",
    "cooldown_reduction_percent",
    "damage_shield",
    "heal_on_hit_percent",
    "healing_per_second_bonus",
    "health_percent_per_second_bonus",
    "mana_per_second_bonus",
    "mana_percent_per_second_bonus",
    "energy_per_second_bonus",
    "energy_percent_per_second_bonus",
    "health_max_bonus",
    "health_max_percent_bonus",
    "mana_max_bonus",
    "mana_max_percent_bonus",
    "energy_max_bonus",
    "strength_bonus",
    "intelligence_bonus",
    "dexterity_bonus",
    "constitution_bonus",
    "wisdom_bonus",
    "charisma_bonus",
]


def run(conn: sqlite3.Connection) -> None:
    """Zero out spurious buff fields on skills with special server handling."""
    console.print("Applying skill fixups...")
    cursor = conn.cursor()

    # call_of_the_heroes: TargetBuffSkill.cs teleports mercenaries and returns
    # before any buff application. mana_percent_per_second_bonus and is_cleanse
    # are set in game data but are never applied at runtime.
    # Source: server-scripts/TargetBuffSkill.cs — isCallHeroes returns at line 237
    cursor.execute(
        """
        UPDATE skills
        SET mana_percent_per_second_bonus = ?,
            is_cleanse = 0
        WHERE id = 'call_of_the_heroes'
        """,
        (_ZERO_JSON,),
    )

    if cursor.rowcount > 0:
        console.print(
            "  [green]OK[/green] Zeroed spurious buff fields on call_of_the_heroes"
        )
    else:
        console.print(
            "  [yellow]WARN[/yellow] call_of_the_heroes not found — fixup skipped"
        )

    # Dispel skills: AreaDebuffSkill.cs and TargetDebuffSkill.cs both take an
    # early path when isDispel=true that never reaches AddOrRefreshBuff, so all
    # stat fields are inert. Zero them out to avoid misleading display.
    # Source: AreaDebuffSkill.cs:161-258, TargetDebuffSkill.cs:168-265
    set_clause = ", ".join(f"{f} = ?" for f in _STAT_JSON_FIELDS)
    cursor.execute(
        f"UPDATE skills SET {set_clause} WHERE is_dispel = 1",
        [_ZERO_JSON] * len(_STAT_JSON_FIELDS),
    )

    if cursor.rowcount > 0:
        console.print(
            f"  [green]OK[/green] Zeroed spurious stat fields on {cursor.rowcount} dispel skill(s)"
        )
    else:
        console.print("  [yellow]WARN[/yellow] No dispel skills found — fixup skipped")

    _zero_unreachable_level_scaling(cursor)

    conn.commit()


def _linear_value_columns(cursor: sqlite3.Cursor) -> list[str]:
    """Columns on skills that hold a LinearValue object.

    Discovered from the stored rows rather than listed, so a new exported
    LinearValue column is covered without editing this module.
    """
    columns = [row[1] for row in cursor.execute("PRAGMA table_info(skills)")]
    linear: list[str] = []
    for column in columns:
        row = cursor.execute(
            f"""
            SELECT 1 FROM skills
            WHERE json_valid({column})
              AND json_type({column}, '$.bonus_per_level') IS NOT NULL
            LIMIT 1
            """
        ).fetchone()
        if row is not None:
            linear.append(column)
    return linear


def _zero_unreachable_level_scaling(cursor: sqlite3.Cursor) -> None:
    """Drop per-level growth that no level can reach.

    A LinearValue resolves to `bonus_per_level * (level - 1) + base_value`, and a
    skill's level never exceeds its max level: PetSkills clamps every mercenary,
    familiar and companion skill with Math.Min(item.maxLevel, ...). A skill with
    a single level therefore always resolves to its base value, yet game data
    still carries growth on some of them - Ant Attack's stun chance reads
    "1% (+0.3%/lvl)" for a level the skill cannot reach.

    Source: server-scripts/LinearFloat.cs:10-13, LinearInt.cs:10-13 (Get), PetSkills.cs:26-47
    """
    columns = _linear_value_columns(cursor)
    if not columns:
        console.print(
            "  [yellow]WARN[/yellow] No LinearValue columns on skills — fixup skipped"
        )
        return

    selection = ", ".join(columns)
    rows = cursor.execute(
        f"SELECT id, {selection} FROM skills WHERE max_level <= 1"
    ).fetchall()

    skills_changed = 0
    values_changed = 0
    for row in rows:
        skill_id = row[0]
        updates: dict[str, str] = {}
        for column, raw in zip(columns, row[1:], strict=True):
            if not raw:
                continue
            value = json.loads(raw)
            if value.get("bonus_per_level"):
                value["bonus_per_level"] = 0
                updates[column] = json.dumps(value)
        if not updates:
            continue
        set_clause = ", ".join(f"{column} = ?" for column in updates)
        cursor.execute(
            f"UPDATE skills SET {set_clause} WHERE id = ?",
            [*updates.values(), skill_id],
        )
        skills_changed += 1
        values_changed += len(updates)

    if skills_changed > 0:
        console.print(
            f"  [green]OK[/green] Zeroed {values_changed} unreachable per-level "
            f"value(s) on {skills_changed} single-level skill(s)"
        )
    else:
        console.print("  [green]OK[/green] No unreachable per-level values found")
