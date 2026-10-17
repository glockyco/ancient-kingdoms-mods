import json
from pathlib import Path

from compendium.db import create_database
from compendium.denormalizers.items.sources import _denormalize_monster_sources
from compendium.denormalizers.monsters.drops import _record_loot_inputs

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


def test_template_inputs_preserve_duplicates_and_equipment_eligibility(tmp_path):
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        conn.executemany(
            """INSERT INTO items
            (id, name, item_type, quality, is_quest_item, has_gather_quest, travel_zone_id)
            VALUES (?, ?, ?, ?, ?, ?, NULL)""",
            [
                ("weapon", "Weapon", "weapon", 3, 0, 0),
                ("armor", "Armor", "equipment", 2, 0, 0),
                ("augment", "Augment", "augment", 4, 0, 0),
                ("common", "Common", "equipment", 0, 0, 0),
                ("ammo", "Ammo", "ammo", 1, 0, 0),
                ("costume", "Costume", "costume", 1, 0, 0),
                ("quest", "Quest", "equipment", 3, 1, 0),
                ("gather", "Gather", "equipment", 3, 0, 1),
                ("random", "Random", "random", 0, 0, 0),
            ],
        )
        conn.executemany(
            """INSERT INTO item_sources_random (random_item_id, item_id, probability)
            VALUES ('random', ?, ?)""",
            [("weapon", 1 / 3), ("weapon", 1 / 3), ("augment", 1 / 3)],
        )
        item_ids = [
            "weapon",
            "weapon",
            "armor",
            "augment",
            "common",
            "ammo",
            "costume",
            "quest",
            "gather",
            "random",
        ]
        conn.execute(
            "INSERT INTO monsters (id, name, drops) VALUES ('boss', 'Boss', ?)",
            (json.dumps([{"item_id": item_id, "rate": 0.1} for item_id in item_ids]),),
        )
        conn.execute(
            "INSERT INTO monsters (id, name, drops) VALUES ('empty', 'Empty', '[]')"
        )
        _record_loot_inputs(conn)
        inputs = json.loads(
            conn.execute(
                "SELECT loot_inputs FROM monsters WHERE id = 'boss'"
            ).fetchone()[0]
        )
        assert [row["item_id"] for row in inputs] == item_ids
        assert [row["counts_as_equipment"] for row in inputs] == [
            True,
            True,
            True,
            False,
            False,
            True,
            True,
            True,
            True,
            False,
        ]
        assert [row["requires_quest"] for row in inputs] == [
            False,
            False,
            False,
            False,
            False,
            False,
            False,
            True,
            True,
            False,
        ]
        assert inputs[-1]["random_items"] == [
            {"item_id": "weapon", "counts_as_equipment": True},
            {"item_id": "weapon", "counts_as_equipment": True},
            {"item_id": "augment", "counts_as_equipment": False},
        ]
        assert (
            json.loads(
                conn.execute(
                    "SELECT loot_inputs FROM monsters WHERE id = 'empty'"
                ).fetchone()[0]
            )
            == []
        )
        conn.execute("UPDATE monsters SET drops = '[]' WHERE id = 'boss'")
        _record_loot_inputs(conn)
        assert (
            json.loads(
                conn.execute(
                    "SELECT loot_inputs FROM monsters WHERE id = 'boss'"
                ).fetchone()[0]
            )
            == inputs
        )


def test_nonfinal_only_altar_templates_are_not_monster_loot_sources(tmp_path):
    with create_database(tmp_path / "sources.db", SCHEMA_PATH) as conn:
        conn.execute(
            "INSERT INTO items (id, name, travel_zone_id) VALUES ('loot', 'Loot', NULL)"
        )
        drops = json.dumps([{"item_id": "loot", "rate": 0.2}])
        conn.executemany(
            "INSERT INTO monsters (id, name, drops) VALUES (?, ?, ?)",
            [(name, name, drops) for name in ("nonfinal", "mixed", "final", "both")],
        )
        waves = [
            {
                "monsters": [
                    {"monster_id": name} for name in ("nonfinal", "mixed", "both")
                ]
            },
            {"monsters": [{"monster_id": name} for name in ("final", "both")]},
        ]
        conn.execute(
            "INSERT INTO altars (id, name, type, waves) VALUES ('altar', 'Altar', 'forgotten', ?)",
            (json.dumps(waves),),
        )
        conn.execute("INSERT INTO zones (id, zone_id, name) VALUES ('zone', 1, 'Zone')")
        conn.execute(
            """INSERT INTO monster_spawns (id, monster_id, zone_id, spawn_type)
            VALUES ('mixed-world', 'mixed', 'zone', 'regular')"""
        )
        _denormalize_monster_sources(conn)
        assert conn.execute(
            "SELECT monster_id FROM item_sources_monster ORDER BY monster_id"
        ).fetchall() == [("both",), ("final",), ("mixed",)]


def test_combat_summons_need_a_loot_bearing_alternate_path(tmp_path):
    with create_database(tmp_path / "summons.db", SCHEMA_PATH) as conn:
        conn.execute(
            "INSERT INTO items (id, name, travel_zone_id) VALUES ('loot', 'Loot', NULL)"
        )
        drops = json.dumps([{"item_id": "loot", "rate": 0.2}])
        templates = ("skill_only", "skill_nonfinal", "skill_world", "skill_final")
        conn.executemany(
            "INSERT INTO monsters (id, name, drops) VALUES (?, ?, ?)",
            [(name, name, drops) for name in (*templates, "caster")],
        )
        conn.executemany(
            """INSERT INTO skills
            (id, name, skill_type, summoned_monster_id, summon_count_per_cast)
            VALUES (?, ?, 'summon_monsters', ?, 1)""",
            [(name, name, name) for name in templates],
        )
        conn.executemany(
            """INSERT INTO monster_skills
            (monster_id, skill_id, skill_index, runtime_level) VALUES ('caster', ?, ?, 1)""",
            [(name, index) for index, name in enumerate(templates)],
        )
        waves = [
            {"monsters": [{"monster_id": "skill_nonfinal"}]},
            {"monsters": [{"monster_id": "skill_final"}]},
        ]
        conn.execute(
            "INSERT INTO altars (id, name, type, waves) VALUES ('altar', 'Altar', 'forgotten', ?)",
            (json.dumps(waves),),
        )
        conn.execute("INSERT INTO zones (id, zone_id, name) VALUES ('zone', 1, 'Zone')")
        conn.execute(
            """INSERT INTO monster_spawns (id, monster_id, zone_id, spawn_type)
            VALUES ('world', 'skill_world', 'zone', 'regular')"""
        )
        _denormalize_monster_sources(conn)
        assert conn.execute(
            "SELECT monster_id FROM item_sources_monster ORDER BY monster_id"
        ).fetchall() == [("caster",), ("skill_final",), ("skill_world",)]
