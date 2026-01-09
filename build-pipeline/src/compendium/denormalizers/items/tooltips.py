"""Item tooltip denormalization - pre-rendered HTML tooltips.

This module converts raw tooltip strings with Unity TextMeshPro markup and
placeholders into HTML ready for display on the website.
"""

import json
import re
import sqlite3

from rich.console import Console

console = Console()

# Maps internal stat field names to their display names (from game tooltips)
STAT_DISPLAY_NAMES: dict[str, str] = {
    "health_bonus": "Hit Points",
    "energy_bonus": "Rage",
    "mana_bonus": "Mana",
    "hp_regen_bonus": "Health Regen",
    "mana_regen_bonus": "Mana Regen",
    "defense": "AC",
    "damage": "Damage",
    "magic_damage": "Spell Power",
    "accuracy": "Accuracy",
    "haste": "Haste",
    "spell_haste": "Spell Casting Haste",
    "speed_bonus": "Movement Speed",
    "critical_chance": "Critical Chance",
    "block_chance": "Block Chance",
    "fire_resist": "Fire Resist",
    "cold_resist": "Cold Resist",
    "poison_resist": "Poison Resist",
    "disease_resist": "Disease Resist",
    "magic_resist": "Magic Resist",
    "strength": "Strength",
    "dexterity": "Dexterity",
    "constitution": "Constitution",
    "intelligence": "Intelligence",
    "wisdom": "Wisdom",
    "charisma": "Charisma",
}


def _format_stat_name(stat: str) -> str:
    """Format an internal stat name to its game display name."""
    if stat in STAT_DISPLAY_NAMES:
        return STAT_DISPLAY_NAMES[stat]
    # Fallback: title-case with underscores replaced by spaces
    return " ".join(word.capitalize() for word in stat.split("_"))


def _convert_unity_markup_to_html(text: str) -> str:
    """Convert Unity TextMeshPro markup tags to HTML."""
    html = text

    # Convert <color=#HEX>text</color> to <span style="color: #HEX">text</span>
    html = re.sub(
        r"<color=(#[0-9A-Fa-f]{6})>(.*?)</color>",
        r'<span style="color: \1">\2</span>',
        html,
    )

    # Convert <color=red> (named colors) to <span style="color: red">
    html = re.sub(
        r"<color=(\w+)>(.*?)</color>",
        r'<span style="color: \1">\2</span>',
        html,
    )

    # Convert <size=N>text</size> to <span style="font-size: Npx">
    html = re.sub(
        r"<size=(\d+)>(.*?)</size>",
        r'<span style="font-size: \1px">\2</span>',
        html,
    )

    # Remove <line-height=N%> tags
    html = re.sub(r"<line-height=\d+%>", "", html)

    # Convert <align="right">text</align> to <div style="text-align: right">text</div>
    html = re.sub(
        r'<align="right">(.*?)</align>',
        r'<div style="text-align: right">\1</div>',
        html,
    )

    return html


def _parse_tooltip(item: dict) -> str:
    """Parse Unity TextMeshPro markup and replace placeholders with actual item values."""
    tooltip = item.get("tooltip") or ""
    if not tooltip:
        return ""

    parsed = tooltip

    # Parse item stats if available
    stats_json = item.get("stats")
    stats = json.loads(stats_json) if stats_json else {}

    # Add set bonus information before {DURABILITY} placeholder (if this item has a set)
    if item.get("augment_armor_set_name"):
        set_members_json = item.get("augment_armor_set_members")
        set_members = json.loads(set_members_json) if set_members_json else []
        total_pieces = len(set_members)

        # Show as if only this item is equipped (1 piece)
        set_bonus = f"<color=#dccb77>{item['augment_armor_set_name']} (1/{total_pieces})</color>\n"

        # Add set members - highlight current item, gray out others
        for member in set_members:
            if member["item_id"] == item["id"]:
                # Current item - highlighted
                set_bonus += f" <color=#d8ddb6>{member['item_name']}</color>\n"
            else:
                # Other items - grayed out
                set_bonus += f" <color=#676a75>{member['item_name']}</color>\n"

        # Add attribute bonuses (3-piece) - grayed out since we only have 1 piece
        attribute_bonuses_json = item.get("augment_attribute_bonuses")
        attribute_bonuses = (
            json.loads(attribute_bonuses_json) if attribute_bonuses_json else []
        )
        for bonus in attribute_bonuses:
            formatted_attr = _format_stat_name(bonus["attribute"])
            set_bonus += f"\n<color=#676a75>Set (3): Increases {formatted_attr} by {bonus['bonus']}</color>"

        # Add skill bonuses (5-piece) - grayed out since we only have 1 piece
        skill_bonuses_json = item.get("augment_skill_bonuses_with_names")
        skill_bonuses = json.loads(skill_bonuses_json) if skill_bonuses_json else []
        for bonus in skill_bonuses:
            set_bonus += f"\n<color=#676a75>Set (5): Increases {bonus['skill_name']} by {bonus['level_bonus']}</color>"

        set_bonus += "\n\n"

        # Replace {DURABILITY} with set bonus + {DURABILITY}
        parsed = parsed.replace("{DURABILITY}", set_bonus + "{DURABILITY}")

    # Add item level if it's > 0 (pre-calculated in database)
    item_level = item.get("item_level") or 0
    if item_level > 0:
        parsed += f"\n\n<color=#F1D65A>Item Level: {item_level}</color>"

    # Add sell price if sellable (format with space separator like in-game)
    sellable = item.get("sellable")
    sell_price = item.get("sell_price") or 0
    if sellable and sell_price > 0:
        # Format price with space separators (e.g., "1 234 567")
        formatted_price = f"{sell_price:,}".replace(",", " ")
        parsed += (
            f'\n\n<align="right">{formatted_price} <color=#FFD700>●</color></align>'
        )

    # Build replacements dict for placeholders
    replacements: dict[str, str] = {
        # Equipment stats
        "DURABILITY": (
            "<color=#DA4ADC>Durability: 100%</color>"
            if stats.get("max_durability")
            else ""
        ),
        "DEFENSEBONUS": str(stats.get("defense", 0)),
        "HEALTHBONUS": str(stats.get("health_bonus", 0)),
        "MANABONUS": str(stats.get("mana_bonus", 0)),
        "ENERGYBONUS": str(stats.get("energy_bonus", 0)),
        # Primary attributes
        "STRENGTHBONUS": str(stats.get("strength", 0)),
        "CONSTITUTIONBONUS": str(stats.get("constitution", 0)),
        "DEXTERITYBONUS": str(stats.get("dexterity", 0)),
        "INTELLIGENCEBONUS": str(stats.get("intelligence", 0)),
        "WISDOMBONUS": str(stats.get("wisdom", 0)),
        "CHARISMABONUS": str(stats.get("charisma", 0)),
        # Resistances
        "MAGICRESISTBONUS": str(stats.get("magic_resist", 0)),
        "POISONRESISTBONUS": str(stats.get("poison_resist", 0)),
        "FIRERESISTBONUS": str(stats.get("fire_resist", 0)),
        "COLDRESISTBONUS": str(stats.get("cold_resist", 0)),
        "DISEASERESISTBONUS": str(stats.get("disease_resist", 0)),
        # Weapon stats
        "DAMAGEBONUS": str(stats.get("damage", 0)),
        "MAGICDAMAGEBONUS": str(stats.get("magic_damage", 0)),
        "DELAY": str(item.get("weapon_delay") or 0),
        # Combat mechanics (percentage values stored as 0.0-1.0, display as 0-100)
        # Matches C#'s "0.##" format: up to 2 decimal places, trailing zeros removed
        # Note: The raw tooltips already include % suffix, so we only output the number
        "HASTEBONUS": (
            f"{abs(stats['haste'] * 100):.2f}".rstrip("0").rstrip(".")
            if stats.get("haste")
            else "0"
        ),
        "SPELLHASTEBONUS": (
            f"{abs(stats['spell_haste'] * 100):.2f}".rstrip("0").rstrip(".")
            if stats.get("spell_haste")
            else "0"
        ),
        "ACCURACYBONUS": (
            f"{abs(stats['accuracy'] * 100):.2f}".rstrip("0").rstrip(".")
            if stats.get("accuracy")
            else "0"
        ),
        "BLOCKCHANCEBONUS": (
            f"{abs(stats['block_chance'] * 100):.2f}".rstrip("0").rstrip(".")
            if stats.get("block_chance")
            else "0"
        ),
        "CRITICALCHANCEBONUS": (
            f"{abs(stats['critical_chance'] * 100):.2f}".rstrip("0").rstrip(".")
            if stats.get("critical_chance")
            else "0"
        ),
        "HPREGENBONUS": str(stats.get("hp_regen_bonus", 0)),
        "MANAREGENBONUS": str(stats.get("mana_regen_bonus", 0)),
        # Weapon requirements
        "REQUIREDAMMO": item.get("weapon_required_ammo_id") or "",
    }

    # Replace all placeholders
    for key, value in replacements.items():
        parsed = parsed.replace(f"{{{key}}}", value)

    # Remove red color from "Requires Level" (we're not checking player level)
    parsed = re.sub(r"<color=red>(Requires Level \d+)</color>", r"\1", parsed)

    # Convert Unity TextMeshPro markup to HTML
    parsed = _convert_unity_markup_to_html(parsed)

    return parsed


def _enrich_set_members_with_tooltips(conn: sqlite3.Connection) -> int:
    """Add tooltip_html to armor set members JSON.

    This runs after tooltip generation so tooltip_html is available.

    Returns:
        Count of updated items
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, augment_armor_set_members
        FROM items
        WHERE augment_armor_set_members IS NOT NULL
          AND augment_armor_set_members != ''
    """)

    updated_count = 0

    for item_id, members_json in cursor.fetchall():
        try:
            members = json.loads(members_json)
            if not members:
                continue

            # Fetch tooltip_html for all member items
            member_ids = [m["item_id"] for m in members]
            placeholders = ",".join("?" * len(member_ids))
            tooltip_cursor = conn.cursor()
            tooltip_cursor.execute(
                f"SELECT id, tooltip_html FROM items WHERE id IN ({placeholders})",
                member_ids,
            )
            tooltip_map = {row[0]: row[1] for row in tooltip_cursor.fetchall()}

            # Enrich members with tooltip_html
            for member in members:
                member["tooltip_html"] = tooltip_map.get(member["item_id"])

            # Update the JSON
            conn.execute(
                "UPDATE items SET augment_armor_set_members = ? WHERE id = ?",
                (json.dumps(members), item_id),
            )
            updated_count += 1

        except (json.JSONDecodeError, KeyError):
            pass

    return updated_count


def run(conn: sqlite3.Connection) -> None:
    """Generate pre-rendered HTML tooltips for all items."""
    console.print("Generating item tooltips...")
    cursor = conn.cursor()

    # Clear any existing tooltip_html for augmentations (they should never have tooltips)
    cursor.execute("UPDATE items SET tooltip_html = NULL WHERE item_type = 'augment'")

    # Fetch all items with fields needed for tooltip generation
    # Exclude augmentations - they should never have tooltips rendered
    cursor.execute("""
        SELECT
            id,
            tooltip,
            stats,
            item_level,
            sellable,
            sell_price,
            weapon_delay,
            weapon_required_ammo_id,
            augment_armor_set_name,
            augment_armor_set_members,
            augment_attribute_bonuses,
            augment_skill_bonuses_with_names
        FROM items
        WHERE tooltip IS NOT NULL AND tooltip != ''
          AND item_type != 'augment'
    """)

    columns = [desc[0] for desc in cursor.description]
    updated_count = 0

    for row in cursor.fetchall():
        item = dict(zip(columns, row))
        tooltip_html = _parse_tooltip(item)

        if tooltip_html:
            conn.execute(
                "UPDATE items SET tooltip_html = ? WHERE id = ?",
                (tooltip_html, item["id"]),
            )
            updated_count += 1

    conn.commit()
    console.print(f"  [green]OK[/green] Generated tooltips for {updated_count} items")

    # Enrich armor set members with tooltip_html
    console.print("  Enriching armor set members with tooltips...")
    set_members_count = _enrich_set_members_with_tooltips(conn)
    conn.commit()
    console.print(
        f"  [green]OK[/green] Enriched {set_members_count} armor sets with member tooltips"
    )
