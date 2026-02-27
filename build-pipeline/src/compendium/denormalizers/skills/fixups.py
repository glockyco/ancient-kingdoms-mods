"""Skill fixups — correct fields that are set in game data but not used at runtime.

Some skills have special server-side handling (e.g. isCallHeroes in
TargetBuffSkill.cs) that overrides or ignores buff fields present in the
game data. These fixups zero out the spurious fields so the website
displays accurate information.
"""

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

    # Zero-duration buff/debuff skills: Buff.cs:225 sets buffTimeEnd = serverTime + 0,
    # so BuffTimeRemaining() returns 0 immediately. CleanupBuffs() removes it on the
    # same tick. Any stat fields are applied and removed before they take effect.
    # Source: Buff.cs:225, Buff.cs:272-276, Skills.cs:909-966
    # Exclude passives (no buff system) and dispels (already handled above).
    # Exclude is_permanent skills (permanent flag overrides duration in game UI,
    # but those have a separate code path — none currently have duration=0 anyway).
    cursor.execute(
        f"""
        UPDATE skills SET {set_clause}
        WHERE skill_type IN ('target_buff', 'area_buff', 'target_debuff', 'area_debuff')
          AND duration_base = 0 AND duration_per_level = 0
          AND is_dispel = 0
          AND is_permanent = 0
        """,
        [_ZERO_JSON] * len(_STAT_JSON_FIELDS),
    )

    if cursor.rowcount > 0:
        console.print(
            f"  [green]OK[/green] Zeroed spurious stat fields on {cursor.rowcount} zero-duration buff/debuff skill(s)"
        )
    else:
        console.print(
            "  [yellow]WARN[/yellow] No zero-duration buff/debuff skills found — fixup skipped"
        )

    conn.commit()
