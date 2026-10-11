"""Publish identical rewards for every playable class as one unrestricted item.

Run before item sources and quest tooltips consume quests.rewards. Retain the
original tooltip placeholder so shared class rewards stay in their game slot.
"""

import json
import sqlite3
from collections import defaultdict

from rich.console import Console

console = Console()


def run(conn: sqlite3.Connection) -> None:
    """Collapse only item/amount groups covering exactly the classes table."""
    class_names = {row[0] for row in conn.execute("SELECT name FROM classes")}
    if not class_names:
        raise ValueError("Quest reward normalization requires playable classes")

    updated_count = 0
    for quest_id, rewards_json in conn.execute(
        "SELECT id, rewards FROM quests"
    ).fetchall():
        if not rewards_json:
            continue
        rewards = json.loads(rewards_json)
        items = rewards.get("items", [])
        groups: dict[tuple[str, int], list[dict]] = defaultdict(list)
        # Source: server-scripts/ScriptableQuest.cs:130-164, PlayerQuests.cs:403-418 — each class receives its selected reward item once.
        for item in items:
            if item.get("class_specific"):
                groups[(item["item_id"], item.get("amount", 1))].append(item)
        shared = {
            key
            for key, group in groups.items()
            if len(group) == len(class_names)
            and {item["class_specific"] for item in group} == class_names
        }
        if not shared:
            continue

        normalized = []
        emitted = set()
        for item in items:
            key = (item["item_id"], item.get("amount", 1))
            if item.get("class_specific") and key in shared:
                if key in emitted:
                    continue
                emitted.add(key)
                item = {
                    **item,
                    "class_specific": None,
                    "tooltip_placeholder": "REWARDITEMCLASS",
                }
            normalized.append(item)
        rewards["items"] = normalized
        conn.execute(
            "UPDATE quests SET rewards = ? WHERE id = ?",
            (json.dumps(rewards), quest_id),
        )
        updated_count += 1

    conn.commit()
    console.print(
        f"  [green]OK[/green] Normalized shared rewards for {updated_count} quests"
    )
