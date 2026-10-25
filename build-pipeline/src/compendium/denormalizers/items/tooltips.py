"""Item tooltip denormalization - pre-rendered HTML tooltips.

This module converts raw tooltip strings with Unity TextMeshPro markup and
placeholders into HTML ready for display on the website.
"""

import json
import re
import sqlite3

from rich.console import Console

console = Console()

# Source: server-scripts/EquipmentItem.cs:ToolTip — the game fills each placeholder with the item's own stat value. Movement speed has no placeholder.
_STAT_PLACEHOLDERS: dict[str, str] = {
    "defense": "DEFENSEBONUS",
    "health_bonus": "HEALTHBONUS",
    "mana_bonus": "MANABONUS",
    "energy_bonus": "ENERGYBONUS",
    "strength": "STRENGTHBONUS",
    "constitution": "CONSTITUTIONBONUS",
    "dexterity": "DEXTERITYBONUS",
    "intelligence": "INTELLIGENCEBONUS",
    "wisdom": "WISDOMBONUS",
    "charisma": "CHARISMABONUS",
    "magic_resist": "MAGICRESISTBONUS",
    "poison_resist": "POISONRESISTBONUS",
    "fire_resist": "FIRERESISTBONUS",
    "cold_resist": "COLDRESISTBONUS",
    "disease_resist": "DISEASERESISTBONUS",
    "damage": "DAMAGEBONUS",
    "magic_damage": "MAGICDAMAGEBONUS",
    "haste": "HASTEBONUS",
    "spell_haste": "SPELLHASTEBONUS",
    "accuracy": "ACCURACYBONUS",
    "block_chance": "BLOCKCHANCEBONUS",
    "critical_chance": "CRITICALCHANCEBONUS",
    "resist_fear_chance": "FEARRESISTBONUS",
    "critical_resist": "CRITICALRESISTBONUS",
    "hp_regen_bonus": "HPREGENBONUS",
    "mana_regen_bonus": "MANAREGENBONUS",
}

# Source: server-scripts/EquipmentItem.cs:ToolTip — these fractions are written as percent with format "0.##".
_PERCENT_STATS = frozenset(
    {
        "haste",
        "spell_haste",
        "accuracy",
        "block_chance",
        "critical_chance",
        "resist_fear_chance",
        "critical_resist",
    }
)


def _format_stat(field: str, value: float) -> str:
    """Format a stat the way the game fills its tooltip placeholder."""
    if field in _PERCENT_STATS:
        return f"{abs(value * 100):.2f}".rstrip("0").rstrip(".") if value else "0"
    return str(value)


def _stat_line(field: str, value: float, name: str) -> str:
    """The stat line a placeholder would produce, such as "+10 Magic Resist"."""
    number = _format_stat(field, value)
    if field in _PERCENT_STATS:
        number = f"{'-' if value < 0 else '+'}{number}%"
    elif value > 0:
        number = f"+{number}"
    return f"{number} {name}"


def tooltip_stat_fields(
    template: str, stats: dict[str, object], stat_names: dict[str, str | None]
) -> list[str]:
    """Stat fields whose value the item's tooltip lists as a stat.

    A stat is listed when the template holds its placeholder, or when the template
    types the line that placeholder would produce with the stat's exact value. A
    number inside an effect's description is not a listed stat.
    """
    text = re.sub(r"<[^>]*>", "", template)
    fields = []
    for field, placeholder in _STAT_PLACEHOLDERS.items():
        value = stats.get(field)
        name = stat_names.get(field)
        if f"{{{placeholder}}}" in template or (
            isinstance(value, int | float)
            and value != 0
            and name
            and re.search(
                rf"(?<![\w.]){re.escape(_stat_line(field, value, name))}\b", text
            )
        ):
            fields.append(field)
    if "{DELAY}" in template:
        fields.append("weapon_delay")
    return sorted(fields)


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

    # Preserve supported alignment and remove remaining TextMeshPro layout tags.
    html = re.sub(
        r'<align=["\']?(left|center|right|justify)["\']?>(.*?)</align>',
        r'<div style="text-align: \1">\2</div>',
        html,
        flags=re.DOTALL | re.IGNORECASE,
    )
    html = re.sub(
        r"</?(?:align|line-height|pos|voffset|space|indent)\b[^>]*>",
        "",
        html,
        flags=re.IGNORECASE,
    )

    return html


def _parse_tooltip(item: dict, stat_names: dict[str, str | None]) -> str:
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
            stat_id = bonus["stat_id"]
            if stat_id not in stat_names or stat_names[stat_id] is None:
                raise ValueError(f"Missing item stat name for stat {stat_id}")
            formatted_attr = stat_names[stat_id]
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
        parsed = re.sub(
            r"(?:\r?\n)*<color=#F1D65A>Item Level: \d+</color>\r?",
            "",
            parsed,
        ).rstrip()
        parsed += f"\n\n<color=#F1D65A>Item Level: {item_level}</color>"

    # Match the site's narrow no-break grouping for generated sell prices.
    sellable = item.get("sellable")
    sell_price = item.get("sell_price") or 0
    if sellable and sell_price > 0:
        formatted_price = f"{sell_price:,}".replace(",", "\u202f")
        parsed += (
            f'\n\n<align="right">{formatted_price} <color=#FFD700>●</color></align>'
        )

    # Build replacements dict for placeholders
    replacements: dict[str, str] = {
        "CATEGORY": item.get("slot") or "",
        "DURABILITY": (
            "<color=#DA4ADC>Durability: 100%</color>"
            if stats.get("max_durability")
            else ""
        ),
        "DELAY": str(item.get("weapon_delay") or 0),
        "REQUIREDAMMO": item.get("weapon_required_ammo_id") or "",
    }
    for field, placeholder in _STAT_PLACEHOLDERS.items():
        replacements[placeholder] = _format_stat(field, stats.get(field, 0))

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
    stat_names = dict(
        conn.execute(
            "SELECT DISTINCT s.id, s.item_name FROM stat_fields f "
            "JOIN stats s ON s.id = f.stat_id WHERE f.source = 'item'"
        )
    )
    field_names = dict(
        conn.execute(
            "SELECT f.field, s.item_name FROM stat_fields f "
            "JOIN stats s ON s.id = f.stat_id WHERE f.source = 'item'"
        )
    )

    cursor.execute("""
        UPDATE items
        SET tooltip_html = NULL
        WHERE item_type = 'augment'
          AND augment_armor_set_name IS NOT NULL
          AND augment_armor_set_name != ''
    """)

    # Fetch all items with fields needed for tooltip generation
    cursor.execute("""
        SELECT
            id,
            tooltip,
            slot,
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
          AND NOT (
              item_type = 'augment'
              AND augment_armor_set_name IS NOT NULL
              AND augment_armor_set_name != ''
          )
    """)

    columns = [desc[0] for desc in cursor.description]
    updated_count = 0

    for row in cursor.fetchall():
        item = dict(zip(columns, row))
        tooltip_html = _parse_tooltip(item, stat_names)

        if tooltip_html:
            conn.execute(
                "UPDATE items SET tooltip_html = ?, tooltip_stat_fields = ? WHERE id = ?",
                (
                    tooltip_html,
                    json.dumps(
                        tooltip_stat_fields(
                            item["tooltip"],
                            json.loads(item["stats"]) if item["stats"] else {},
                            field_names,
                        )
                    ),
                    item["id"],
                ),
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
