"""Quest tooltip denormalization - pre-rendered HTML tooltips.

This module converts raw tooltip strings with Unity TextMeshPro markup and
placeholders into HTML ready for display on the website.

Placeholders are replaced with "minimal" values as if the quest was just started
(progress = 0, no items collected, etc.). Class-specific rewards are handled by
generating one tooltip variant per class.
"""

import json
import re
import sqlite3

from rich.console import Console

console = Console()

# All playable classes in the game
CLASSES = ["Warrior", "Cleric", "Ranger", "Rogue", "Wizard", "Druid"]


def _convert_unity_markup_to_html(text: str) -> str:
    """Convert Unity TextMeshPro markup tags to HTML."""
    html = text

    # Convert <color=#HEX>text</color> to <span style="color: #HEX">text</span>
    html = re.sub(
        r"<color=(#[0-9A-Fa-f]{6})>(.*?)</color>",
        r'<span style="color: \1">\2</span>',
        html,
        flags=re.DOTALL,
    )

    # Convert <color=red> (named colors) to <span style="color: red">
    html = re.sub(
        r"<color=(\w+)>(.*?)</color>",
        r'<span style="color: \1">\2</span>',
        html,
        flags=re.DOTALL,
    )

    # Convert <size=N>text</size> to <span style="font-size: Npx">
    html = re.sub(
        r"<size=(\d+)>(.*?)</size>",
        r'<span style="font-size: \1px">\2</span>',
        html,
        flags=re.DOTALL,
    )

    # Remove <line-height=N%> tags
    html = re.sub(r"<line-height=\d+%>", "", html)

    # Convert <align="right">text</align> to <div style="text-align: right">text</div>
    html = re.sub(
        r'<align="right">(.*?)</align>',
        r'<div style="text-align: right">\1</div>',
        html,
        flags=re.DOTALL,
    )

    # Convert <i>text</i> to <em>text</em>
    html = re.sub(r"<i>(.*?)</i>", r"<em>\1</em>", html, flags=re.DOTALL)

    # Convert <b>text</b> - already valid HTML, keep as is

    # Convert <link=name>text</link> to just text (we don't have link targets)
    html = re.sub(r"<link=[^>]*>(.*?)</link>", r"\1", html, flags=re.DOTALL)

    return html


def _get_item_name(conn: sqlite3.Connection, item_id: str | None) -> str:
    """Get item name from database."""
    if not item_id:
        return ""
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM items WHERE id = ?", (item_id,))
    row = cursor.fetchone()
    return row[0] if row else item_id


def _get_monster_name(conn: sqlite3.Connection, monster_id: str | None) -> str:
    """Get monster name from database."""
    if not monster_id:
        return ""
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM monsters WHERE id = ?", (monster_id,))
    row = cursor.fetchone()
    return row[0] if row else monster_id


def _parse_quest_tooltip(
    conn: sqlite3.Connection,
    quest: dict,
    player_class: str,
    is_complete: bool = False,
) -> str:
    """Parse quest tooltip and replace placeholders with minimal values.

    Args:
        conn: Database connection
        quest: Quest data dict
        player_class: The class to render rewards for
        is_complete: If True, use tooltip_complete field

    Returns:
        HTML-rendered tooltip string
    """
    tooltip = quest.get("tooltip_complete" if is_complete else "tooltip") or ""
    if not tooltip:
        return ""

    parsed = tooltip

    # Parse rewards JSON
    rewards_json = quest.get("rewards")
    rewards = json.loads(rewards_json) if rewards_json else {}
    reward_gold = rewards.get("gold", 0)
    reward_exp = rewards.get("exp", 0)
    reward_items = rewards.get("items", [])

    # Get reward item names
    # Generic items (no class_specific) go into REWARDITEM
    # Class-specific item matching player_class goes into REWARDITEMCLASS
    generic_reward_items = []
    class_reward_item = ""

    for item in reward_items:
        item_id = item.get("item_id")
        class_specific = item.get("class_specific")
        if item_id:
            item_name = _get_item_name(conn, item_id)
            if class_specific:
                # Only include if it matches the player's class
                if class_specific == player_class:
                    class_reward_item = item_name
            else:
                generic_reward_items.append(item_name)

    # Join generic items with newlines
    reward_item_text = "\n".join(generic_reward_items)

    # Base replacements (from ScriptableQuest)
    replacements: dict[str, str] = {
        "NAME": quest.get("name", ""),
        "RECOMMENDEDLEVEL": str(quest.get("level_recommended", 0)),
        "REWARDGOLD": f"{reward_gold:,}".replace(",", " "),
        "REWARDEXPERIENCE": f"{reward_exp:,}".replace(",", " "),
        "REWARDITEM": reward_item_text,
        "REWARDITEMCLASS": class_reward_item,
    }

    # Quest type specific replacements
    quest_type = quest.get("quest_type", "")

    if quest_type == "kill":
        # KillQuest replacements
        kill_target_1 = _get_monster_name(conn, quest.get("kill_target_1_id"))
        kill_target_2 = _get_monster_name(conn, quest.get("kill_target_2_id"))
        kill_amount_1 = quest.get("kill_amount_1", 0)
        kill_amount_2 = quest.get("kill_amount_2", 0)

        replacements.update(
            {
                "KILLTARGET": kill_target_1,
                "KILLAMOUNT": str(kill_amount_1),
                "KILLED": "0",  # Minimal: not started
                "KILLTARGET2": kill_target_2,
                "KILLAMOUNT2": str(kill_amount_2) if kill_target_2 else "",
                "KILLED2": "0" if kill_target_2 else "",
                # Status shows 0/amount in red (not started)
                "STATUS": "",  # Empty when not active
                "STATUS2": "",
            }
        )

    elif quest_type == "gather":
        # GatherQuest replacements
        gather_item_1 = _get_item_name(conn, quest.get("gather_item_1_id"))
        gather_item_2 = _get_item_name(conn, quest.get("gather_item_2_id"))
        gather_item_3 = _get_item_name(conn, quest.get("gather_item_3_id"))
        gather_amount_1 = quest.get("gather_amount_1", 0)
        gather_amount_2 = quest.get("gather_amount_2", 0)
        gather_amount_3 = quest.get("gather_amount_3", 0)

        replacements.update(
            {
                "GATHERITEM": gather_item_1,
                "GATHERAMOUNT": str(gather_amount_1),
                "GATHERED": "0",
                "GATHERITEM2": gather_item_2,
                "GATHERAMOUNT2": str(gather_amount_2) if gather_item_2 else "",
                "GATHERED2": "0" if gather_item_2 else "",
                "GATHERITEM3": gather_item_3,
                "GATHERAMOUNT3": str(gather_amount_3) if gather_item_3 else "",
                "GATHERED3": "0" if gather_item_3 else "",
                "STATUS": "",
                "STATUS2": "",
                "STATUS3": "",
            }
        )

    elif quest_type == "gather_inventory":
        # GatherInventoryQuest replacements
        gather_items_json = quest.get("gather_items")
        gather_items = json.loads(gather_items_json) if gather_items_json else []

        # Build gather status text (minimal: shows items needed, no progress)
        gather_status_lines = []
        for gi in gather_items:
            item_id = gi.get("item_id")
            amount = gi.get("amount", 1)
            if item_id:
                item_name = _get_item_name(conn, item_id)
                gather_status_lines.append(f"Get {amount} {item_name}")

        replacements.update(
            {
                "GATHERSTATUS": "\n".join(gather_status_lines),
            }
        )

    elif quest_type == "equip_item":
        # EquipItemQuest replacements
        equip_items_json = quest.get("equip_items")
        equip_items = json.loads(equip_items_json) if equip_items_json else []

        # Build equip status text (minimal: shows items to equip, no progress)
        equip_status_lines = []
        for item_id in equip_items:
            if item_id:
                item_name = _get_item_name(conn, item_id)
                equip_status_lines.append(f"Equip {item_name}")

        replacements.update(
            {
                "EQUIPSTATUS": "\n".join(equip_status_lines),
            }
        )

    elif quest_type == "location":
        # LocationQuest replacements
        replacements.update(
            {
                "LOCATIONSTATUS": "",  # Empty when not active
            }
        )

    elif quest_type == "alchemy":
        # AlchemyQuest replacements
        potion_item = _get_item_name(conn, quest.get("potion_item_id"))
        alchemy_skill = quest.get("increase_alchemy_skill", 0)

        replacements.update(
            {
                "POTIONITEM": potion_item,
                "REWARDALCHEMYSKILL": f"{alchemy_skill * 100:.1f}",
                "ALCHEMYQUESTSTATUS": "",  # Empty when not active
            }
        )

    # Apply all replacements
    for key, value in replacements.items():
        parsed = parsed.replace(f"{{{key}}}", value)

    # Convert Unity markup to HTML
    parsed = _convert_unity_markup_to_html(parsed)

    return parsed


def _has_class_specific_rewards(quest: dict) -> bool:
    """Check if quest has any class-specific reward items."""
    rewards_json = quest.get("rewards")
    if not rewards_json:
        return False
    rewards = json.loads(rewards_json)
    items = rewards.get("items", [])
    return any(item.get("class_specific") for item in items)


def run(conn: sqlite3.Connection) -> None:
    """Generate pre-rendered HTML tooltips for all quests."""
    console.print("Generating quest tooltips...")
    cursor = conn.cursor()

    # Fetch all quests with tooltip data
    cursor.execute("""
        SELECT
            id,
            name,
            quest_type,
            level_recommended,
            tooltip,
            tooltip_complete,
            rewards,
            kill_target_1_id,
            kill_amount_1,
            kill_target_2_id,
            kill_amount_2,
            gather_item_1_id,
            gather_amount_1,
            gather_item_2_id,
            gather_amount_2,
            gather_item_3_id,
            gather_amount_3,
            gather_items,
            equip_items,
            potion_item_id,
            increase_alchemy_skill
        FROM quests
        WHERE tooltip IS NOT NULL AND tooltip != ''
    """)

    columns = [desc[0] for desc in cursor.description]
    updated_count = 0

    for row in cursor.fetchall():
        quest = dict(zip(columns, row))

        # Check if quest has class-specific rewards
        has_class_rewards = _has_class_specific_rewards(quest)

        if has_class_rewards:
            # Generate per-class tooltips
            tooltip_html_dict = {}
            tooltip_complete_html_dict = {}

            for player_class in CLASSES:
                html = _parse_quest_tooltip(
                    conn, quest, player_class, is_complete=False
                )
                if html:
                    tooltip_html_dict[player_class] = html

                complete_html = _parse_quest_tooltip(
                    conn, quest, player_class, is_complete=True
                )
                if complete_html:
                    tooltip_complete_html_dict[player_class] = complete_html

            tooltip_html = json.dumps(tooltip_html_dict) if tooltip_html_dict else None
            tooltip_complete_html = (
                json.dumps(tooltip_complete_html_dict)
                if tooltip_complete_html_dict
                else None
            )
        else:
            # No class-specific rewards - generate single tooltip (use "Warrior" as dummy class)
            html = _parse_quest_tooltip(conn, quest, "Warrior", is_complete=False)
            complete_html = _parse_quest_tooltip(
                conn, quest, "Warrior", is_complete=True
            )

            # Store as JSON with single key for consistency
            tooltip_html = json.dumps({"_default": html}) if html else None
            tooltip_complete_html = (
                json.dumps({"_default": complete_html}) if complete_html else None
            )

        if tooltip_html or tooltip_complete_html:
            conn.execute(
                """UPDATE quests
                   SET tooltip_html = ?, tooltip_complete_html = ?
                   WHERE id = ?""",
                (tooltip_html, tooltip_complete_html, quest["id"]),
            )
            updated_count += 1

    conn.commit()
    console.print(f"  [green]OK[/green] Generated tooltips for {updated_count} quests")
