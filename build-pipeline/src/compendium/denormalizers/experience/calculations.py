"""Experience calculations denormalizer.

Computes pre-computed EXP values for monsters, zones, gathering resources,
and crafting/alchemy recipes based on game formulas from server-scripts.

Source references:
- Source: server-scripts/Monster.cs:CalculateRewardExp — CalculateRewardExp (monster EXP)
- Source: server-scripts/ZoneTrigger.cs:NewZoneDiscovered — zone discovery EXP
- Source: server-scripts/GatherItem.cs:630-639 — gathering EXP by tier
- Source: server-scripts/Player.cs:13886-13892 — crafting EXP by item quality
- Source: server-scripts/Player.cs:12079-12086 — alchemy EXP by recipe tier
"""

import sqlite3

from rich.console import Console

console = Console()

# Source: server-scripts/ZoneTrigger.cs:167-175 - discovery checks the trigger name.
CITY_NAMES = {
    "Alaenanore Village",
    "Thogh Maldur",
    "Milldenn",
    "Bonebreach",
    "Felarii Village",
}
DISCOVERY_EXP_DUNGEON = 150
DISCOVERY_EXP_CITY = 10
DISCOVERY_EXP_REGULAR = 25

# Gathering EXP by resource level
GATHERING_EXP_BY_LEVEL = {
    0: 15,
    1: 150,
    2: 750,
    3: 4000,
    4: 10000,
}
GATHERING_EXP_DEFAULT = 15


def calculate_monster_base_exp(
    level: int,
    health: int,
    is_boss: bool,
    is_elite: bool,
    no_aggro: bool,
    exp_multiplier: float,
) -> int:
    """Calculate base EXP reward for killing a monster.

    This is the base value before level difference scaling is applied.
    Formula from Monster.cs:2802-2829.

    Args:
        level: Monster level
        health: Monster max health
        is_boss: Whether monster is a boss
        is_elite: Whether monster is elite
        no_aggro: Whether monster is passive (no_aggro_monster)
        exp_multiplier: Monster's exp_multiplier field

    Returns:
        Base EXP reward (integer)
    """
    # Base formula varies by level
    if level <= 40:
        base = 15.0 * (1.12 ** (level - 1))
    else:
        base = 15.0 * (1.12**39) * (1.07 ** (level - 40))

    # Type multipliers (mutually exclusive in order)
    if is_boss:
        base *= 5.0
    elif is_elite:
        base *= 3.0
    elif no_aggro:
        base *= 0.5

    # Health bonus
    if health > 100000:
        bonus_pct = 10.0 + ((health - 100000) / 5000) * 0.01
        base += base * bonus_pct
    else:
        base += base * (health / 1000.0) * 0.1

    # Apply monster's exp_multiplier
    base *= exp_multiplier

    return round(base)


def get_discovery_exp(area_name: str, is_dungeon: bool) -> int:
    """Get discovery EXP from the area's name and its parent dungeon flag."""
    if is_dungeon:
        return DISCOVERY_EXP_DUNGEON
    if area_name in CITY_NAMES:
        return DISCOVERY_EXP_CITY
    return DISCOVERY_EXP_REGULAR


def get_gathering_exp(level: int) -> int:
    """Get EXP reward for gathering a resource.

    Source: server-scripts/GatherItem.cs:630-639 — gathering EXP by tier.

    Args:
        level: Resource level (0-4)

    Returns:
        Gathering EXP reward
    """
    return GATHERING_EXP_BY_LEVEL.get(level, GATHERING_EXP_DEFAULT)


def run(conn: sqlite3.Connection) -> None:
    """Update monster and discovery experience after redaction.

    Args:
        conn: Database connection
    """
    console.print("Calculating experience values...")
    cursor = conn.cursor()

    # Calculate monster base_exp
    cursor.execute("""
        SELECT id, level, health, is_boss, is_elite, no_aggro_monster, exp_multiplier
        FROM monsters
    """)
    monsters = cursor.fetchall()

    monster_count = 0
    for monster_id, level, health, is_boss, is_elite, no_aggro, exp_mult in monsters:
        base_exp = calculate_monster_base_exp(
            level=level or 1,
            health=health or 100,
            is_boss=bool(is_boss),
            is_elite=bool(is_elite),
            no_aggro=bool(no_aggro),
            exp_multiplier=exp_mult if exp_mult is not None else 1.0,
        )
        cursor.execute(
            "UPDATE monsters SET base_exp = ? WHERE id = ?",
            (base_exp, monster_id),
        )
        monster_count += 1

    console.print(
        f"  [green]OK[/green] Calculated base_exp for {monster_count} monsters"
    )

    # Parent zones and their named trigger areas use the same discovery rule.
    cursor.execute("SELECT id, name, is_dungeon FROM zones")
    zones = cursor.fetchall()

    zone_count = 0
    for zone_id, name, is_dungeon in zones:
        discovery_exp = get_discovery_exp(name, bool(is_dungeon))
        cursor.execute(
            "UPDATE zones SET discovery_exp = ? WHERE id = ?",
            (discovery_exp, zone_id),
        )
        zone_count += 1

    console.print(
        f"  [green]OK[/green] Calculated discovery_exp for {zone_count} zones"
    )

    areas = cursor.execute("""
        SELECT t.id, t.name, z.is_dungeon
        FROM zone_triggers t JOIN zones z ON z.zone_id = t.zone_id
    """).fetchall()
    cursor.executemany(
        "UPDATE zone_triggers SET discovery_exp = ? WHERE id = ?",
        [
            (get_discovery_exp(name, bool(is_dungeon)), area_id)
            for area_id, name, is_dungeon in areas
        ],
    )

    conn.commit()


def run_gathering(conn: sqlite3.Connection) -> None:
    """Derive definition XP from canonical primary outputs before withholding."""
    # GatherItem.cs:630-644,817-828 excludes quest-only primary rewards from XP.
    resources = {
        row[0]: row[1:]
        for row in conn.execute("""
            SELECT id, level, is_plant, is_mineral, is_radiant_spark, is_fishing_spot
            FROM gathering_resources
        """)
    }
    variants: dict[str, dict[str, set[bool | None]]] = {}
    for resource_id, method_id, quest_item, withheld in conn.execute("""
        SELECT d.resource_id, d.id, i.is_quest_item, o.withheld
        FROM acquisition_resource_details d
        LEFT JOIN acquisition_outputs o ON o.method_id = d.id
            AND o.resource_kind = 'item'
            AND o.yield_rule IN ('extra_gather', 'radiant', 'uniform_inclusive')
        LEFT JOIN items i ON i.id = o.item_id
    """):
        flags = variants.setdefault(resource_id, {}).setdefault(method_id, set())
        flags.add(None if withheld else bool(quest_item))
    for resource_id, (level, plant, mineral, spark, fishing) in resources.items():
        methods = variants.get(resource_id)
        if not methods:
            raise ValueError(
                f"Gathering resource {resource_id}: missing canonical method"
            )
        outcomes: set[int | None] = set()
        for flags in methods.values():
            if fishing:
                outcomes.add(get_gathering_exp(level))
            elif not (plant or mineral or spark) or True in flags:
                outcomes.add(0)
            elif None in flags:
                outcomes.add(None)
            else:
                outcomes.add(get_gathering_exp(level))
        amount = next(iter(outcomes)) if len(outcomes) == 1 else None
        conn.execute(
            "UPDATE gathering_resources SET gathering_exp = ? WHERE id = ?",
            (amount, resource_id),
        )
