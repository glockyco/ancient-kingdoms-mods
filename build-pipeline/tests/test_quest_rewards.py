"""Quest tooltips consume canonical slots, counters and withheld targets."""

import json
from pathlib import Path

import pytest

from compendium.db import create_database
from compendium.denormalizers.quests import tooltips

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


def add_quest(conn, *, quest_type="general", tooltip="{REWARDITEM}\n{REWARDITEMCLASS}"):
    conn.execute(
        """INSERT INTO quests
        (id, name, quest_type, reward_gold, reward_experience, tooltip, tooltip_complete)
        VALUES ('quest', 'Quest', ?, 5, 10, ?, ?)""",
        (quest_type, tooltip, tooltip),
    )


def add_reward(
    conn, ordinal, item_id, *, class_id=None, withheld_class=False, amount=1
):
    conn.execute(
        """INSERT INTO quest_reward_slots
        (id, quest_id, ordinal, slot_kind, class_id, item_id,
         class_withheld, item_withheld, amount)
        VALUES (?, 'quest', ?, ?, ?, ?, ?, ?, ?)""",
        (
            f"reward:{ordinal}",
            ordinal,
            "class" if class_id or withheld_class else "shared",
            class_id,
            item_id,
            int(withheld_class),
            int(item_id is None),
            amount,
        ),
    )


def tooltips_for(conn):
    return tuple(
        json.loads(value)
        for value in conn.execute(
            "SELECT tooltip_html, tooltip_complete_html FROM quests"
        ).fetchone()
    )


@pytest.mark.parametrize("names", [CLASS_NAMES[:2], CLASS_NAMES])
def test_shared_and_class_slots_keep_distinct_native_placeholders(conn, names):
    add_classes(conn, names)
    conn.executemany(
        "INSERT INTO items (id, name, travel_zone_id) VALUES (?, ?, NULL)",
        [("rune", "Rune"), ("essence", "Essence")],
    )
    add_quest(conn)
    add_reward(conn, 0, "rune")
    for ordinal, name in enumerate(names, 1):
        add_reward(conn, ordinal, "essence", class_id=name.lower())

    tooltips.run(conn)

    expected = {name: "Rune\nEssence" for name in names}
    assert tooltips_for(conn) == (expected, expected)
    assert conn.execute(
        "SELECT COUNT(*) FROM quest_reward_slots WHERE slot_kind = 'class'"
    ).fetchone()[0] == len(names)


def test_different_class_reward_does_not_leak_into_other_class_tooltip(conn):
    add_classes(conn, ("Warrior", "Wizard"))
    conn.executemany(
        "INSERT INTO items (id, name, travel_zone_id) VALUES (?, ?, NULL)",
        [("sword", "Sword"), ("staff", "Staff")],
    )
    add_quest(conn)
    add_reward(conn, 0, "sword", class_id="warrior")
    add_reward(conn, 1, "staff", class_id="wizard")

    tooltips.run(conn)

    expected = {"Warrior": "\nSword", "Wizard": "\nStaff"}
    assert tooltips_for(conn) == (expected, expected)


def test_withheld_class_reward_is_never_rendered_as_shared(conn):
    add_classes(conn, ("Warrior", "Wizard"))
    conn.execute(
        "INSERT INTO items (id, name, travel_zone_id) VALUES ('reward', 'Reward', NULL)"
    )
    add_quest(conn)
    add_reward(conn, 0, "reward", withheld_class=True)

    tooltips.run(conn)

    assert tooltips_for(conn) == ({"Warrior": "\n", "Wizard": "\n"},) * 2
    assert conn.execute(
        "SELECT slot_kind, class_id, class_withheld FROM quest_reward_slots"
    ).fetchone() == ("class", None, 1)


def test_withheld_shared_reward_keeps_unknown_target_visible(conn):
    add_classes(conn, ("Wizard",))
    add_quest(conn)
    add_reward(conn, 0, None)

    tooltips.run(conn)

    assert tooltips_for(conn) == ({"_default": "Unpublished item\n"},) * 2


def test_empty_classes_cannot_render_quest_tooltips(conn):
    add_quest(conn)
    with pytest.raises(ValueError, match="requires playable classes"):
        tooltips.run(conn)


def test_tooltip_resolves_player_context_and_formats_reward_numbers(conn):
    quest = {
        "quest_type": "general",
        "tooltip": "{PLAYER}|{RACE}|{CLASS}|{REWARDGOLD}|{REWARDEXPERIENCE}",
        "reward_gold": 1200,
        "reward_experience": 180000,
        "reward_slots": (),
    }
    fields = tooltips._parse_quest_tooltip(quest, "Wizard").split("|")
    assert all("{" not in field and "}" not in field for field in fields)
    assert fields[2] == "Wizard"
    assert fields[3:] == ["1,200", "180,000"]


def test_objective_gap_keeps_second_native_counter_placeholder(conn):
    add_classes(conn, ("Wizard",))
    conn.execute("INSERT INTO monsters (id, name) VALUES ('wolf', 'Wolf')")
    add_quest(
        conn,
        quest_type="kill",
        tooltip="{KILLTARGET}|{KILLTARGET2}|{KILLAMOUNT2}|{KILLED2}",
    )
    conn.execute(
        """INSERT INTO quest_objectives
        (id, quest_id, ordinal, kind, role, amount, withheld)
        VALUES ('objective', 'quest', 1, 'monster', 'kill_counter', 3, 0)"""
    )
    conn.execute(
        "INSERT INTO quest_objective_monsters (id, monster_id) VALUES ('objective', 'wolf')"
    )

    tooltips.run(conn)

    assert tooltips_for(conn) == ({"_default": "|Wolf|3|0"},) * 2


def test_brew_tooltip_reads_brew_objective_not_owned_potions(conn):
    add_classes(conn, ("Wizard",))
    conn.execute(
        "INSERT INTO items (id, name, travel_zone_id) VALUES ('potion', 'Potion', NULL)"
    )
    add_quest(conn, quest_type="alchemy", tooltip="{POTIONITEM}|{REWARDALCHEMYSKILL}")
    conn.execute("UPDATE quests SET increase_alchemy_skill = 0.03")
    conn.execute(
        """INSERT INTO quest_objectives
        (id, quest_id, ordinal, kind, role, amount, withheld)
        VALUES ('brew', 'quest', 0, 'brew', 'brew_counter', 3, 0)"""
    )
    conn.execute(
        "INSERT INTO quest_objective_brews (id, item_id) VALUES ('brew', 'potion')"
    )

    tooltips.run(conn)

    assert tooltips_for(conn) == ({"_default": "Potion|3.0"},) * 2


def test_class_placeholder_generates_variants_without_class_rewards(conn):
    add_classes(conn, ("Warrior", "Wizard"))
    add_quest(conn, tooltip="{CLASS}")

    tooltips.run(conn)

    expected = {"Warrior": "Warrior", "Wizard": "Wizard"}
    assert tooltips_for(conn) == (expected, expected)
