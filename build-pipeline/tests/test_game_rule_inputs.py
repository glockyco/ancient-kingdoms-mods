import json
import sqlite3
from collections.abc import Iterator
from pathlib import Path

import pytest
from pydantic import ValidationError

from compendium.db import create_database
from compendium.denormalizers.items import source_entries, sources, special_types
from compendium.denormalizers.monsters.drops import _expand_altar_reward_variants
from compendium.loaders.core import load_items
from compendium.models import AltarData, ItemData

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


@pytest.fixture
def conn(tmp_path: Path) -> Iterator[sqlite3.Connection]:
    connection = create_database(tmp_path / "rules.db", SCHEMA_PATH)
    connection.execute(
        "INSERT INTO zones (id, zone_id, name) VALUES ('unknown', 0, 'Unknown')"
    )
    yield connection
    connection.close()


def seed_altar(conn: sqlite3.Connection, *, tiered: bool = True) -> None:
    conn.executescript("""
        INSERT INTO progression_rules (
            id, max_level, max_veteran_points, attribute_points_per_veteran,
            veteran_skill_points_per_veteran
        ) VALUES (1, 60, 200, 1, 1);
        INSERT INTO items (id, name, quality) VALUES
            ('common', 'Common Reward', 0), ('magic', 'Magic Reward', 2),
            ('epic', 'Epic Reward', 3), ('legendary', 'Legendary Reward', 4);
    """)
    conn.execute(
        "INSERT INTO monsters (id, name, drops) VALUES ('boss', 'Boss', ?)",
        (json.dumps([{"item_id": "common", "rate": 0.75}]),),
    )
    conn.execute(
        """
        INSERT INTO altars (
            id, name, type, min_level_required, reward_common_id,
            reward_common_name, reward_magic_id, reward_magic_name,
            reward_epic_id, reward_epic_name, reward_legendary_id,
            reward_legendary_name, magic_reward_threshold,
            epic_reward_threshold, legendary_reward_threshold, waves
        ) VALUES ('altar', 'Altar', 'forgotten', 25, 'common', 'Common Reward',
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            *(
                (
                    "magic",
                    "Magic Reward",
                    "epic",
                    "Epic Reward",
                    "legendary",
                    "Legendary Reward",
                )
                if tiered
                else (None,) * 6
            ),
            *((40, 60, 150) if tiered else (None,) * 3),
            json.dumps([{"monsters": [{"monster_id": "boss"}]}]),
        ),
    )


def test_altar_sources_split_exported_thresholds_at_exported_cap(conn):
    seed_altar(conn)
    _expand_altar_reward_variants(conn)
    sources._denormalize_altar_sources(conn)
    source_entries.run(conn)

    assert conn.execute(
        """
        SELECT reward_tier, min_level_plus_veteran, min_level, min_veteran_points,
               drop_rate
        FROM item_sources_altar ORDER BY min_level_plus_veteran
        """
    ).fetchall() == [
        ("common", 0, 0, 0, 0.75),
        ("magic", 40, 40, 0, 0.75),
        ("epic", 60, 60, 0, 0.75),
        ("legendary", 150, 60, 90, 0.75),
    ]
    assert conn.execute(
        "SELECT item_id, source_level FROM item_source_entries ORDER BY item_id"
    ).fetchall() == [("common", 25), ("epic", 60), ("legendary", 60), ("magic", 40)]

    drops = json.loads(conn.execute("SELECT drops FROM monsters").fetchone()[0])
    assert [(drop["altar_id"], drop["altar_reward_tier"]) for drop in drops] == [
        ("altar", "legendary"),
        ("altar", "epic"),
        ("altar", "magic"),
        ("altar", "common"),
    ]
    assert all("note" not in drop for drop in drops)


def test_altar_without_thresholds_has_no_tier_variants(conn):
    seed_altar(conn, tiered=False)
    _expand_altar_reward_variants(conn)
    sources._denormalize_altar_sources(conn)

    assert conn.execute(
        "SELECT item_id, reward_tier, min_level_plus_veteran, min_level, min_veteran_points FROM item_sources_altar"
    ).fetchall() == [("common", "common", 0, 0, 0)]
    drops = json.loads(conn.execute("SELECT drops FROM monsters").fetchone()[0])
    assert len(drops) == 1
    assert drops[0]["altar_id"] == "altar"
    assert drops[0]["altar_reward_tier"] == "common"
    assert "note" not in drops[0]


def test_missing_progression_cap_names_the_field(conn):
    with pytest.raises(ValueError, match=r"progression_rules.max_level"):
        sources._denormalize_altar_sources(conn)


def test_chest_rolls_preserve_order_flags_and_item_facts(conn, tmp_path):
    items = [
        {
            "id": "chest",
            "name": "Chest",
            "item_type": "chest",
            "quality": 0,
            "item_level": 0,
            "primal_essence_value": None,
            "chest_num_items": 3,
            "chest_rewards": [
                {
                    "item_id": "relic",
                    "probability": 0.2,
                    "scales_with_treasure_hunter": True,
                },
                {
                    "item_id": "weapon",
                    "probability": 0.9,
                    "scales_with_treasure_hunter": False,
                },
                {
                    "item_id": "relic",
                    "probability": 0.1,
                    "scales_with_treasure_hunter": True,
                },
            ],
        },
        {
            "id": "relic",
            "name": "Relic",
            "item_type": "relic",
            "quality": 0,
            "item_level": 0,
            "primal_essence_value": None,
        },
        {
            "id": "weapon",
            "name": "Token Weapon",
            "item_type": "weapon",
            "quality": 4,
            "item_level": 60,
            "primal_essence_value": 1,
            "sell_price": 2500,
        },
    ]
    (tmp_path / "items.json").write_text(json.dumps(items))
    load_items(conn, tmp_path)
    special_types._denormalize_chest_rewards(conn)

    assert conn.execute(
        """
        SELECT chest_item_id, item_id, roll_order, roll_chance, scales_with_treasure_hunter
        FROM chest_item_rewards ORDER BY roll_order
        """
    ).fetchall() == [
        ("chest", "relic", 0, 0.2, 1),
        ("chest", "weapon", 1, 0.9, 0),
        ("chest", "relic", 2, 0.1, 1),
    ]
    assert conn.execute("SELECT COUNT(*) FROM item_sources_random").fetchone()[0] == 0
    assert conn.execute(
        "SELECT item_level, primal_essence_value FROM items WHERE id = 'weapon'"
    ).fetchone() == (60, 1)
    assert conn.execute(
        "SELECT primal_essence_value, chest_num_items FROM items WHERE id = 'chest'"
    ).fetchone() == (None, 3)
    rewards = json.loads(
        conn.execute("SELECT chest_rewards FROM items WHERE id = 'chest'").fetchone()[0]
    )
    assert [reward["item_name"] for reward in rewards] == [
        "Relic",
        "Token Weapon",
        "Relic",
    ]
    assert all("actual_drop_chance" not in reward for reward in rewards)
    assert [reward["scales_with_treasure_hunter"] for reward in rewards] == [
        True,
        False,
        True,
    ]


@pytest.mark.parametrize("field", ["item_level", "primal_essence_value"])
def test_missing_exported_item_fact_fails_loudly(field):
    item = {
        "id": "item",
        "name": "Item",
        "item_type": "general",
        "quality": 0,
        "item_level": 0,
        "primal_essence_value": None,
    }
    del item[field]
    with pytest.raises(ValidationError, match=field):
        ItemData.model_validate(item)


def test_missing_chest_scaling_flag_fails_loudly():
    with pytest.raises(ValidationError, match="scales_with_treasure_hunter"):
        ItemData.model_validate(
            {
                "id": "chest",
                "name": "Chest",
                "item_type": "chest",
                "quality": 0,
                "item_level": 0,
                "primal_essence_value": None,
                "chest_rewards": [{"item_id": "relic", "probability": 0.1}],
            }
        )


def test_missing_exported_altar_thresholds_fail_loudly():
    with pytest.raises(ValidationError, match="magic_reward_threshold"):
        AltarData.model_validate(
            {
                "id": "altar",
                "name": "Altar",
                "type": "avatar",
                "position": {"x": 0, "y": 0, "z": 0},
            }
        )
