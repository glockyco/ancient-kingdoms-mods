"""Shared class rewards retain their quantity and original tooltip placement."""

import json
from pathlib import Path

import pytest

from compendium.db import create_database
from compendium.denormalizers.items.sources import _denormalize_quest_reward_sources
from compendium.denormalizers.quests import rewards, tooltips

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"
CLASS_NAMES = (
    "Warrior",
    "Ranger",
    "Cleric",
    "Rogue",
    "Wizard",
    "Druid",
    "Bard",
    "Necromancer",
)


@pytest.fixture
def conn(tmp_path):
    connection = create_database(tmp_path / "test.db", SCHEMA_PATH)
    yield connection
    connection.close()


def add_classes(conn, names=CLASS_NAMES):
    conn.executemany(
        """INSERT INTO classes
        (id, name, description, primary_role, difficulty, resource_type, compatible_races)
        VALUES (?, ?, '', 'Support', 1, 'mana', '[]')""",
        [(name.lower(), name) for name in names],
    )


def add_quest(conn, items):
    conn.execute(
        """INSERT INTO quests (id, name, quest_type, rewards, tooltip, tooltip_complete)
        VALUES ('quest', 'Quest', 'general', ?, ?, ?)""",
        (
            json.dumps({"gold": 5, "exp": 10, "items": items}),
            "{REWARDITEM}\n{REWARDITEMCLASS}",
            "{REWARDITEM}\n{REWARDITEMCLASS}",
        ),
    )


def reward_items(conn):
    return json.loads(conn.execute("SELECT rewards FROM quests").fetchone()[0])["items"]


def class_rewards(names=CLASS_NAMES):
    return [{"item_id": "essence", "class_specific": name} for name in names]


@pytest.mark.parametrize("names", [CLASS_NAMES[:2], CLASS_NAMES])
def test_shared_rewards_use_the_classes_table_and_keep_tooltip_slot(conn, names):
    add_classes(conn, names)
    conn.executemany(
        "INSERT INTO items (id, name, travel_zone_id) VALUES (?, ?, NULL)",
        [("rune", "Rune"), ("essence", "Essence")],
    )
    generic = {"item_id": "rune", "class_specific": None}
    add_quest(conn, [generic, *class_rewards(names)])

    rewards.run(conn)
    assert reward_items(conn) == [
        generic,
        {
            "item_id": "essence",
            "class_specific": None,
            "tooltip_placeholder": "REWARDITEMCLASS",
        },
    ]
    rewards.run(conn)
    assert len(reward_items(conn)) == 2

    tooltips.run(conn)
    start, complete = conn.execute(
        "SELECT tooltip_html, tooltip_complete_html FROM quests"
    ).fetchone()
    assert json.loads(start) == {"_default": "Rune\nEssence"}
    assert json.loads(complete) == {"_default": "Rune\nEssence"}
    _denormalize_quest_reward_sources(conn)
    assert (
        conn.execute(
            "SELECT class_restriction FROM item_sources_quest WHERE item_id = 'essence'"
        ).fetchone()[0]
        is None
    )


@pytest.mark.parametrize(
    "difference", ["missing", "duplicate", "amount", "item", "unknown_class"]
)
def test_distinct_or_incomplete_rewards_keep_class_restrictions(conn, difference):
    add_classes(conn)
    items = class_rewards()
    if difference == "missing":
        items.pop()
    elif difference == "duplicate":
        items[-1] = dict(items[0])
    elif difference == "amount":
        items[-1]["amount"] = 2
    elif difference == "item":
        items[-1]["item_id"] = "other"
    else:
        items[-1]["class_specific"] = "Unknown"
    add_quest(conn, items)

    rewards.run(conn)
    assert reward_items(conn) == items


def test_explicit_and_implicit_one_are_the_same_amount(conn):
    add_classes(conn)
    items = class_rewards()
    items[0]["amount"] = 1
    add_quest(conn, items)
    rewards.run(conn)
    assert len(reward_items(conn)) == 1
    assert reward_items(conn)[0]["amount"] == 1


def test_empty_classes_cannot_publish_unrestricted_rewards(conn):
    add_quest(conn, class_rewards())
    with pytest.raises(ValueError, match="requires playable classes"):
        rewards.run(conn)
