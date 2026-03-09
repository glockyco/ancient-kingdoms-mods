"""Experience calculations denormalizer.

Computes pre-computed EXP values for monsters, zones, gathering resources,
and crafting/alchemy recipes based on game formulas from server-scripts.

Source references:
- Source: server-scripts/Monster.cs:2802-2829 — CalculateRewardExp (monster EXP)
- Source: server-scripts/ZoneTrigger.cs:148-174 — zone discovery EXP
- Source: server-scripts/GatherItem.cs:548-554 — gathering EXP by tier
- Source: server-scripts/Player.cs:10476-10480 — crafting EXP by item quality
- Source: server-scripts/Player.cs:10246-10253 — alchemy EXP by recipe tier
"""

import sqlite3

from rich.console import Console

console = Console()

# Zone discovery EXP amounts
CITY_ZONES = {
    "alaenanore_village",
    "thogh_maldur",
    "milldenn",
    "bonebreach",
    "felarii_village",
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

# Crafting EXP by item quality
CRAFTING_EXP_BY_QUALITY = {
    1: 150,
    2: 750,
    3: 3500,
    4: 10000,
}
CRAFTING_EXP_DEFAULT = 15

# Alchemy EXP by item quality
ALCHEMY_EXP_BY_QUALITY = {
    1: 300,
    2: 2000,
    3: 5000,
    4: 12000,
}
ALCHEMY_EXP_DEFAULT = 20


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


def get_discovery_exp(zone_id: str, is_dungeon: bool) -> int:
    """Get EXP reward for discovering a zone.

    Formula from ZoneTrigger.cs:148-174.

    Args:
        zone_id: Zone identifier
        is_dungeon: Whether zone is a dungeon

    Returns:
        Discovery EXP reward
    """
    if is_dungeon:
        return DISCOVERY_EXP_DUNGEON
    if zone_id in CITY_ZONES:
        return DISCOVERY_EXP_CITY
    return DISCOVERY_EXP_REGULAR


def get_gathering_exp(level: int) -> int:
    """Get EXP reward for gathering a resource.

    Source: server-scripts/GatherItem.cs:548-554 — gathering EXP by tier.

    Args:
        level: Resource level (0-4)

    Returns:
        Gathering EXP reward
    """
    return GATHERING_EXP_BY_LEVEL.get(level, GATHERING_EXP_DEFAULT)


def get_crafting_exp(quality: int) -> int:
    """Get EXP reward for crafting an item.

    Source: server-scripts/Player.cs:10476-10480 — crafting EXP by item quality.

    Args:
        quality: Item quality (1-4)

    Returns:
        Crafting EXP reward
    """
    return CRAFTING_EXP_BY_QUALITY.get(quality, CRAFTING_EXP_DEFAULT)


def get_alchemy_exp(tier: int) -> int:
    """Get EXP reward for crafting a potion.

    Source: server-scripts/Player.cs:10246-10253 — alchemy EXP by recipe tier.

    Args:
        tier: Recipe tier / level_required (0-4)

    Returns:
        Alchemy EXP reward
    """
    return ALCHEMY_EXP_BY_QUALITY.get(tier, ALCHEMY_EXP_DEFAULT)


def run(conn: sqlite3.Connection) -> None:
    """Run all experience calculations.

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
            exp_multiplier=exp_mult or 1.0,
        )
        cursor.execute(
            "UPDATE monsters SET base_exp = ? WHERE id = ?",
            (base_exp, monster_id),
        )
        monster_count += 1

    console.print(
        f"  [green]OK[/green] Calculated base_exp for {monster_count} monsters"
    )

    # Calculate zone discovery_exp
    cursor.execute("SELECT id, is_dungeon FROM zones")
    zones = cursor.fetchall()

    zone_count = 0
    for zone_id, is_dungeon in zones:
        discovery_exp = get_discovery_exp(zone_id, bool(is_dungeon))
        cursor.execute(
            "UPDATE zones SET discovery_exp = ? WHERE id = ?",
            (discovery_exp, zone_id),
        )
        zone_count += 1

    console.print(
        f"  [green]OK[/green] Calculated discovery_exp for {zone_count} zones"
    )

    # Calculate gathering_exp for gathering resources
    cursor.execute("SELECT id, level FROM gathering_resources")
    resources = cursor.fetchall()

    resource_count = 0
    for resource_id, level in resources:
        gathering_exp = get_gathering_exp(level or 0)
        cursor.execute(
            "UPDATE gathering_resources SET gathering_exp = ? WHERE id = ?",
            (gathering_exp, resource_id),
        )
        resource_count += 1

    console.print(
        f"  [green]OK[/green] Calculated gathering_exp for {resource_count} gathering resources"
    )

    # Calculate crafting_exp for crafting recipes (based on result item quality)
    cursor.execute("""
        SELECT cr.id, i.quality
        FROM crafting_recipes cr
        LEFT JOIN items i ON cr.result_item_id = i.id
    """)
    crafting_recipes = cursor.fetchall()

    crafting_count = 0
    for recipe_id, quality in crafting_recipes:
        crafting_exp = get_crafting_exp(quality or 0)
        cursor.execute(
            "UPDATE crafting_recipes SET crafting_exp = ? WHERE id = ?",
            (crafting_exp, recipe_id),
        )
        crafting_count += 1

    console.print(
        f"  [green]OK[/green] Calculated crafting_exp for {crafting_count} crafting recipes"
    )

    # Calculate alchemy_exp for alchemy recipes (based on recipe level_required)
    cursor.execute("""
        SELECT id, level_required
        FROM alchemy_recipes
    """)
    alchemy_recipes = cursor.fetchall()

    alchemy_count = 0
    for recipe_id, level_required in alchemy_recipes:
        alchemy_exp = get_alchemy_exp(level_required or 0)
        cursor.execute(
            "UPDATE alchemy_recipes SET alchemy_exp = ? WHERE id = ?",
            (alchemy_exp, recipe_id),
        )
        alchemy_count += 1

    console.print(
        f"  [green]OK[/green] Calculated alchemy_exp for {alchemy_count} alchemy recipes"
    )

    # Copy alchemy_exp to potion items (for display on item page)
    cursor.execute("""
        UPDATE items
        SET alchemy_exp = (
            SELECT ar.alchemy_exp
            FROM alchemy_recipes ar
            WHERE ar.result_item_id = items.id
        )
        WHERE id IN (SELECT result_item_id FROM alchemy_recipes)
    """)
    potion_count = cursor.rowcount

    console.print(
        f"  [green]OK[/green] Copied alchemy_exp to {potion_count} potion items"
    )

    # Copy alchemy_exp to recipe items (for display in Basic Information)
    # Recipe items have recipe_potion_learned_id pointing to the potion they create
    cursor.execute("""
        UPDATE items
        SET alchemy_exp = (
            SELECT ar.alchemy_exp
            FROM alchemy_recipes ar
            WHERE ar.result_item_id = items.recipe_potion_learned_id
        )
        WHERE recipe_potion_learned_id IS NOT NULL
    """)
    recipe_count = cursor.rowcount

    console.print(
        f"  [green]OK[/green] Copied alchemy_exp to {recipe_count} recipe items"
    )

    conn.commit()
