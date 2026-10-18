import sqlite3
from pathlib import Path

import pytest

from compendium.db import create_database
from compendium.denormalizers.experience.calculations import (
    get_discovery_exp,
    run,
    run_gathering,
)
from compendium.redactions.semantics import apply_semantic_withholding


def test_gathering_xp_only_for_rewarding_resource_types():
    with sqlite3.connect(":memory:") as conn:
        conn.executescript("""
            CREATE TABLE monsters (id, level, health, is_boss, is_elite,
                                   no_aggro_monster, exp_multiplier, base_exp);
            CREATE TABLE zones (id, zone_id, name, is_dungeon, discovery_exp);
            CREATE TABLE zone_triggers (id, zone_id, name, discovery_exp);
            CREATE TABLE items (id, quality, is_quest_item);
            CREATE TABLE gathering_resources (id, level, is_plant, is_mineral,
                is_radiant_spark, is_fishing_spot, gathering_exp);
            CREATE TABLE acquisition_resource_details (id, resource_id);
            CREATE TABLE acquisition_outputs
                (method_id, resource_kind, yield_rule, item_id, withheld);
            INSERT INTO items (id, is_quest_item) VALUES ('quest_reward', 1), ('normal', 0);
            INSERT INTO monsters VALUES ('lootless', 30, 1000, 0, 0, 0, 0, NULL);
            INSERT INTO zones VALUES
                ('forest', 1, 'Forest', 0, NULL), ('dungeon', 2, 'Dungeon', 1, NULL);
            INSERT INTO zone_triggers VALUES
                ('city', 1, 'Alaenanore Village', NULL),
                ('field', 1, 'Forest', NULL),
                ('underground', 2, 'Alaenanore Village', NULL);
            INSERT INTO gathering_resources VALUES
                ('plant', 0, 1, 0, 0, 0, NULL),
                ('mineral', 1, 0, 1, 0, 0, NULL),
                ('spark', 2, 0, 0, 1, 0, NULL),
                ('fish', 3, 0, 0, 0, 1, NULL),
                ('old_scroll', 0, 0, 0, 0, 0, 15),
                ('ancient_remains', 0, 0, 0, 0, 0, 15),
                ('weathered_scroll', 0, 0, 0, 0, 0, 15),
                ('quest_plant', 4, 1, 0, 0, 0, 10000);
            INSERT INTO acquisition_resource_details SELECT id, id FROM gathering_resources;
            INSERT INTO acquisition_outputs VALUES
                ('plant', 'item', 'extra_gather', 'normal', 0),
                ('mineral', 'item', 'extra_gather', 'normal', 0),
                ('old_scroll', 'item', 'uniform_inclusive', 'normal', 0),
                ('weathered_scroll', 'item', 'uniform_inclusive', 'normal', 0),
                ('quest_plant', 'item', 'extra_gather', 'quest_reward', 0);
        """)
        run_gathering(conn)
        run(conn)
        assert (
            conn.execute(
                "SELECT base_exp FROM monsters WHERE id = 'lootless'"
            ).fetchone()[0]
            == 0
        )
        assert dict(
            conn.execute("SELECT id, gathering_exp FROM gathering_resources")
        ) == {
            "plant": 15,
            "mineral": 150,
            "spark": 750,
            "fish": 4000,
            "old_scroll": 0,
            "ancient_remains": 0,
            "weathered_scroll": 0,
            "quest_plant": 0,
        }
        assert dict(conn.execute("SELECT id, discovery_exp FROM zone_triggers")) == {
            "city": 10,
            "field": 25,
            "underground": 150,
        }
        assert dict(conn.execute("SELECT id, discovery_exp FROM zones")) == {
            "forest": 25,
            "dungeon": 150,
        }


def test_discovery_uses_named_area_and_parent_dungeon():
    assert get_discovery_exp("Alaenanore Village", False) == 10
    assert get_discovery_exp("Alaenanore Forest", False) == 25
    assert get_discovery_exp("Alaenanore Village", True) == 150


def add_resource_variant(conn, method_id, quest_item):
    item_id = f"{method_id}:item" if quest_item is not None else None
    if item_id is not None:
        conn.execute(
            "INSERT INTO items (id, name, travel_zone_id, is_quest_item) VALUES (?, ?, NULL, ?)",
            (item_id, item_id, quest_item),
        )
    conn.execute(
        "INSERT INTO acquisition_methods (id, kind, rule_id) VALUES (?, 'gather', 'herbalism')",
        (method_id,),
    )
    conn.execute(
        """INSERT INTO acquisition_resource_details
        (id, resource_id, resource_kind, outer_success, gold_min, gold_max)
        VALUES (?, 'plant', 'plant', 1, 0, 0)""",
        (method_id,),
    )
    conn.execute(
        """INSERT INTO acquisition_outputs
        (id, method_id, ordinal, resource_kind, item_id, amount_min, amount_max,
         yield_rule, delivery, withheld)
        VALUES (?, ?, 0, 'item', ?, 1, 1, 'extra_gather', 'inventory', ?)""",
        (f"{method_id}:output", method_id, item_id, int(item_id is None)),
    )
    return item_id


@pytest.mark.parametrize(
    "variant_flags, expected",
    [([0], 10000), ([1], 0), ([None], None), ([0, 1], None), ([0, 0], 10000)],
)
def test_gathering_xp_uses_complete_primary_variants_not_template_reward(
    tmp_path,
    variant_flags,
    expected,
):
    schema = Path(__file__).resolve().parents[1] / "schema.sql"
    with create_database(tmp_path / "xp.db", schema) as conn:
        conn.execute(
            "INSERT INTO gathering_resources (id, name, level, is_plant) VALUES ('plant', 'Plant', 4, 1)"
        )
        for index, flag in enumerate(variant_flags):
            add_resource_variant(conn, f"variant:{index}", flag)

        run_gathering(conn)

        assert (
            conn.execute(
                "SELECT gathering_exp FROM gathering_resources WHERE id = 'plant'"
            ).fetchone()[0]
            == expected
        )


def test_withholding_primary_reward_does_not_fabricate_gathering_xp(tmp_path):
    schema = Path(__file__).resolve().parents[1] / "schema.sql"
    with create_database(tmp_path / "withheld-xp.db", schema) as conn:
        conn.execute(
            "INSERT INTO gathering_resources (id, name, level, is_plant) VALUES ('plant', 'Plant', 4, 1)"
        )
        item_id = add_resource_variant(conn, "quest_variant", 1)
        run_gathering(conn)
        apply_semantic_withholding(conn, {("items", item_id)})
        conn.execute("DELETE FROM items WHERE id = ?", (item_id,))

        run(conn)

        assert (
            conn.execute(
                "SELECT gathering_exp FROM gathering_resources WHERE id = 'plant'"
            ).fetchone()[0]
            == 0
        )
        assert conn.execute(
            "SELECT item_id, withheld FROM acquisition_outputs"
        ).fetchone() == (None, 1)
