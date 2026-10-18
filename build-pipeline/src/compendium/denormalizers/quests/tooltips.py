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


def _parse_quest_tooltip(
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

    generic_reward_items = []
    class_reward_items = []
    for reward in quest.get("reward_slots", ()):
        name = reward["item_name"] or "Unpublished item"
        if reward["slot_kind"] == "shared":
            generic_reward_items.append(name)
        elif reward["class_name"] == player_class:
            class_reward_items.append(name)
    reward_item_text = "\n".join(generic_reward_items)
    class_reward_item = "\n".join(class_reward_items)
    reward_gold = quest["reward_gold"]
    reward_exp = quest["reward_experience"]
    objectives = quest.get("objectives", ())

    # Base replacements (from ScriptableQuest)
    replacements: dict[str, str] = {
        "NAME": quest.get("name", ""),
        "RECOMMENDEDLEVEL": str(quest.get("level_recommended", 0)),
        "REWARDGOLD": f"{reward_gold:,}",
        "REWARDEXPERIENCE": f"{reward_exp:,}",
        "REWARDITEM": reward_item_text,
        "REWARDITEMCLASS": class_reward_item,
        "PLAYER": "[your name]",
        "RACE": "[your race]",
        "CLASS": player_class,
    }

    quest_type = quest["quest_type"]
    replacements.update(
        STATUS="",
        STATUS2="",
        STATUS3="",
        LOCATIONSTATUS="",
        ALCHEMYQUESTSTATUS="",
    )
    if quest_type in {"kill", "gather"}:
        target_prefix, amount_prefix, progress_prefix = (
            ("KILLTARGET", "KILLAMOUNT", "KILLED")
            if quest_type == "kill"
            else ("GATHERITEM", "GATHERAMOUNT", "GATHERED")
        )
        count = 2 if quest_type == "kill" else 3
        by_ordinal = {row["ordinal"]: row for row in objectives}
        for ordinal in range(count):
            suffix = "" if ordinal == 0 else str(ordinal + 1)
            objective = by_ordinal.get(ordinal)
            replacements[target_prefix + suffix] = (
                objective["target_name"] or "Unpublished target"
                if objective is not None
                else ""
            )
            replacements[amount_prefix + suffix] = (
                str(objective["amount"]) if objective is not None else ""
            )
            replacements[progress_prefix + suffix] = (
                "0" if objective is not None else ""
            )
    elif quest_type == "gather_inventory":
        replacements["GATHERSTATUS"] = "\n".join(
            f"Get {row['amount']} {row['target_name'] or 'Unpublished item'}"
            for row in objectives
        )
    elif quest_type == "equip_item":
        replacements["EQUIPSTATUS"] = "\n".join(
            f"Equip {row['target_name'] or 'Unpublished item'}" for row in objectives
        )
    elif quest_type == "alchemy":
        replacements["POTIONITEM"] = "\n".join(
            row["target_name"] or "Unpublished item" for row in objectives
        )
        replacements["REWARDALCHEMYSKILL"] = (
            f"{quest['increase_alchemy_skill'] * 100:.1f}"
        )

    # Apply all replacements
    for key, value in replacements.items():
        parsed = parsed.replace(f"{{{key}}}", value)

    # Convert Unity markup to HTML
    parsed = _convert_unity_markup_to_html(parsed)

    return parsed


def _has_class_specific_rewards(quest: dict) -> bool:
    """Check the canonical reward slot kind, including withheld classes."""
    return any(row["slot_kind"] == "class" for row in quest["reward_slots"])


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
            reward_gold,
            reward_experience,
            increase_alchemy_skill
        FROM quests
        WHERE tooltip IS NOT NULL AND tooltip != ''
    """)

    columns = [desc[0] for desc in cursor.description]
    quest_rows = cursor.fetchall()
    rewards_by_quest: dict[str, list[dict]] = {}
    for quest_id, kind, class_name, item_name in conn.execute("""
        SELECT r.quest_id, r.slot_kind, c.name, i.name
        FROM quest_reward_slots r
        LEFT JOIN classes c ON c.id = r.class_id
        LEFT JOIN items i ON i.id = r.item_id
        ORDER BY r.quest_id, r.ordinal
    """):
        rewards_by_quest.setdefault(quest_id, []).append(
            {
                "slot_kind": kind,
                "class_name": class_name,
                "item_name": item_name,
            }
        )
    objectives_by_quest: dict[str, list[dict]] = {}
    for (
        quest_id,
        ordinal,
        amount,
        item_name,
        monster_name,
        brew_name,
    ) in conn.execute("""
        SELECT o.quest_id, o.ordinal, o.amount, i.name, m.name, b.name
        FROM quest_objectives o
        LEFT JOIN quest_objective_items oi ON oi.id = o.id
        LEFT JOIN items i ON i.id = oi.item_id
        LEFT JOIN quest_objective_monsters om ON om.id = o.id
        LEFT JOIN monsters m ON m.id = om.monster_id
        LEFT JOIN quest_objective_brews ob ON ob.id = o.id
        LEFT JOIN items b ON b.id = ob.item_id
        ORDER BY o.quest_id, o.ordinal
    """):
        objectives_by_quest.setdefault(quest_id, []).append(
            {
                "ordinal": ordinal,
                "amount": amount,
                "target_name": item_name or monster_name or brew_name,
            }
        )
    player_classes = [
        row[0] for row in conn.execute("SELECT name FROM classes ORDER BY name")
    ]
    if not player_classes:
        raise ValueError("Quest tooltip generation requires playable classes")

    updated_count = 0

    for row in quest_rows:
        quest = dict(zip(columns, row))
        quest["reward_slots"] = rewards_by_quest.get(quest["id"], ())
        quest["objectives"] = objectives_by_quest.get(quest["id"], ())

        # Class placeholders need variants even when all rewards are shared.
        has_class_rewards = _has_class_specific_rewards(quest)
        has_class_context = any(
            "{CLASS}" in (quest.get(field) or "")
            for field in ("tooltip", "tooltip_complete")
        )

        if has_class_rewards or has_class_context:
            # Generate per-class tooltips.
            tooltip_html_dict = {}
            tooltip_complete_html_dict = {}

            for player_class in player_classes:
                html = _parse_quest_tooltip(quest, player_class, is_complete=False)
                if html:
                    tooltip_html_dict[player_class] = html

                complete_html = _parse_quest_tooltip(
                    quest, player_class, is_complete=True
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
            # No class-specific rewards - generate a single tooltip.
            html = _parse_quest_tooltip(quest, player_classes[0], is_complete=False)
            complete_html = _parse_quest_tooltip(
                quest, player_classes[0], is_complete=True
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
