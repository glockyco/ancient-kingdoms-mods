import json

import pytest
from acquisition_fixtures import database, item, monster, normalizer

from compendium.denormalizers.acquisition import STAGING_FAMILIES, derive
from compendium.redactions import rekey, validate_semantics
from compendium.redactions.semantics import InvalidPublication


def test_original_pool_retains_duplicates_wrappers_caps_and_equipment_flags(tmp_path):
    with database(tmp_path) as conn:
        definitions = [
            item("weapon", item_type="weapon", quality=3),
            item("augment", item_type="augment", quality=4),
            item("quest", item_type="equipment", quality=3, is_quest_item=True),
            item(
                "wrapper",
                item_type="random",
                random_items=["weapon", "weapon", "augment"],
            ),
            item("nested", item_type="random", random_items=["wrapper", "augment"]),
        ]
        boss = monster(
            "boss",
            is_boss=True,
            drops=[
                {"item_id": target, "rate": probability}
                for target, probability in [
                    ("weapon", 0.1),
                    ("weapon", 0.2),
                    ("augment", 0.3),
                    ("quest", 0.4),
                    ("nested", 0.5),
                ]
            ],
        )
        build = normalizer(conn, items=definitions, monsters=[boss])
        build.item_definitions()
        build.monsters_and_events()
        pool = conn.execute(
            "SELECT loot_pool_id FROM monsters WHERE id='boss'"
        ).fetchone()[0]
        assert conn.execute(
            """
            SELECT ordinal,item_id,probability,duplicate_group,cap,counts_equipment,
                   guaranteed_equipment_candidate,quest_gate,resolution
            FROM loot_pool_entries WHERE pool_id=? ORDER BY ordinal
        """,
            (pool,),
        ).fetchall() == [
            (0, "weapon", 0.1, 0, 2, 1, 1, "none", "direct"),
            (1, "weapon", 0.2, 0, 2, 1, 1, "none", "direct"),
            (2, "augment", 0.3, 1, 1, 0, 0, "none", "direct"),
            (3, "quest", 0.4, 2, 1, 0, 1, "public_need", "direct"),
            (4, "nested", 0.5, 3, 1, 0, 0, "none", "uniform_child"),
        ]
        nested = conn.execute(
            "SELECT child_pool_id FROM loot_pool_entries WHERE pool_id=? AND ordinal=4",
            (pool,),
        ).fetchone()[0]
        child = conn.execute(
            "SELECT child_pool_id FROM loot_pool_entries WHERE pool_id=? AND ordinal=0",
            (nested,),
        ).fetchone()[0]
        assert conn.execute(
            "SELECT item_id FROM loot_pool_entries WHERE pool_id=? ORDER BY ordinal",
            (child,),
        ).fetchall() == [
            ("weapon",),
            ("weapon",),
            ("augment",),
        ]
        derive(conn)
        assert (
            conn.execute(
                "SELECT count(*) FROM acquisition_methods WHERE rooted=1"
            ).fetchone()[0]
            == 0
        )


def test_placeholder_keeps_parent_context_and_separate_authored_child(tmp_path):
    with database(tmp_path) as conn:
        parent = monster(
            "parent", placeholder_monster_id="child", placeholder_spawn_probability=0.4
        )
        child = monster("child", drops=[{"item_id": "loot", "rate": 0.2}])
        build = normalizer(conn, items=[item("loot")], monsters=[parent, child])
        build.item_definitions()
        for identity, target in (
            ("parent_spawn", "parent"),
            ("second_parent_spawn", "parent"),
            ("child_spawn", "child"),
        ):
            conn.execute(
                "INSERT INTO monster_spawns(id,monster_id,zone_id,level) VALUES(?,?,'zone',10)",
                (identity, target),
            )
            build.inputs["monster_spawns"].append(
                {
                    "id": identity,
                    "monster_id": target,
                    "loot_zone_number": 1,
                    "loot_respawn": True,
                    "loot_exp_multiplier": 1,
                    "loot_is_boss": False,
                    "loot_is_elite": False,
                    "loot_is_hunt": False,
                    "loot_is_summoned_pet": False,
                    "loot_drops": child["drops"] if target == "child" else [],
                    "loot_gold_min": 0,
                    "loot_gold_max": 0,
                    "loot_gold_probability": 1,
                }
            )
        build.monsters_and_events()
        derive(conn)
        assert conn.execute("""
            SELECT d.event_kind,d.respawn,d.parent_monster_spawn_id,p.monster_spawn_id,m.rooted
            FROM acquisition_kill_details d JOIN acquisition_methods m ON m.id=d.id
            JOIN acquisition_providers_monster_spawns p ON p.method_id=d.id
            WHERE d.monster_id='child' ORDER BY d.event_kind,d.parent_monster_spawn_id
        """).fetchall() == [
            ("authored", 1, None, "child_spawn", 1),
            ("placeholder", 0, "parent_spawn", "parent_spawn", 1),
            ("placeholder", 0, "second_parent_spawn", "second_parent_spawn", 1),
        ]


def test_altar_nonfinal_is_lootless_and_final_is_setup_bound(tmp_path):
    with database(tmp_path) as conn:
        target = monster(
            "elite", is_elite=True, drops=[{"item_id": "loot", "rate": 0.75}]
        )
        build = normalizer(conn, items=[item("loot")], monsters=[target])
        conn.execute(
            "INSERT INTO altars(id,name,type,zone_id,waves) VALUES('altar','Altar','forgotten','zone',?)",
            (
                json.dumps(
                    [
                        {"wave_number": 1, "monsters": [{"monster_id": "elite"}]},
                        {"wave_number": 2, "monsters": [{"monster_id": "elite"}]},
                    ]
                ),
            ),
        )
        build.item_definitions()
        build.monsters_and_events()
        derive(conn)
        assert conn.execute("""
            SELECT d.event_kind,m.rule_id,m.setup_method_id IS NOT NULL,
                   (SELECT count(*) FROM loot_pool_entries e WHERE e.pool_id=d.loot_pool_id)
            FROM acquisition_kill_details d JOIN acquisition_methods m ON m.id=d.id ORDER BY d.wave_number
        """).fetchall() == [
            ("lootless", "lootless", 1, 0),
            ("altar_final", "altar_final_loot", 1, 1),
        ]
        assert (
            conn.execute(
                "SELECT count(*) FROM acquisition_outputs o JOIN acquisition_kill_details d ON d.id=o.method_id WHERE d.event_kind='lootless'"
            ).fetchone()[0]
            == 0
        )


def test_fragment_eligibility_uses_native_context_not_geographic_zone(tmp_path):
    with database(tmp_path) as conn:
        conn.execute(
            "INSERT INTO zones(id,zone_id,name,is_dungeon) VALUES('outside',2,'Outside',0)"
        )
        build = normalizer(
            conn, items=[item("fragment"), item("token")], monsters=[monster("normal")]
        )
        conn.execute(
            "INSERT INTO luck_tokens(zone_id,zone_name,boss_luck_token_id,fragment_token_id) VALUES('zone','Zone','token','fragment')"
        )
        for identity, native_zone, multiplier, respawn in (
            ("mummy", 2, 1, True),
            ("sentinel", 1, 1, True),
            ("low", 1, 0.5, True),
            ("once", 1, 1, False),
        ):
            conn.execute(
                "INSERT INTO monster_spawns(id,monster_id,zone_id,level) VALUES(?,'normal','zone',10)",
                (identity,),
            )
            context = {
                **build.monsters["normal"],
                "loot_zone_number": native_zone,
                "exp_multiplier": multiplier,
                "does_respawn": respawn,
            }
            build.kill_context(
                identity,
                build.monsters["normal"],
                context,
                provider=("monster_spawns", identity),
            )
        derive(conn)
        assert conn.execute("""
            SELECT p.monster_spawn_id FROM acquisition_outputs o
            JOIN acquisition_providers_monster_spawns p ON p.method_id=o.method_id WHERE o.item_id='fragment'
        """).fetchall() == [("sentinel",)]


def test_quest_checks_are_context_local_and_precede_wrapper_resolution(tmp_path):
    with database(tmp_path) as conn:
        build = normalizer(
            conn,
            items=[
                item("child", item_type="weapon", quality=2, is_quest_item=True),
                item(
                    "wrapper",
                    item_type="random",
                    has_gather_quest=True,
                    random_items=["child"],
                ),
                item(
                    "chest",
                    item_type="chest",
                    chest_num_items=1,
                    chest_rewards=[
                        {
                            "item_id": "child",
                            "probability": 1,
                            "scales_with_treasure_hunter": False,
                        },
                    ],
                ),
            ],
        )
        build.item_definitions()
        ordinary = build.pool(
            "monster", "ordinary", [{"item_id": "wrapper", "rate": 0.5}], wrappers=True
        )
        boss = build.pool(
            "monster",
            "boss",
            [{"item_id": "wrapper", "rate": 0.5}],
            wrappers=True,
            boss_caps=True,
        )
        assert conn.execute(
            "SELECT quest_gate,resolution FROM loot_pool_entries WHERE pool_id=?",
            (ordinary,),
        ).fetchall() == [("none", "direct")]
        assert conn.execute(
            "SELECT quest_gate,resolution FROM loot_pool_entries WHERE pool_id=?",
            (boss,),
        ).fetchall() == [("public_need", "direct")]
        assert conn.execute("""
            SELECT p.kind,e.quest_gate,e.counts_equipment FROM loot_pools p
            JOIN loot_pool_entries e ON e.pool_id=p.id WHERE p.kind IN ('random','portable_chest') ORDER BY p.kind
        """).fetchall() == [("portable_chest", "none", 1), ("random", "none", 1)]


@pytest.mark.parametrize(
    "difference",
    [
        {"monster_id": "other_monster"},
        {"loot_zone_number": 2},
        {"loot_respawn": False},
        {"loot_exp_multiplier": 0.5},
        {"loot_is_boss": True},
        {"loot_is_elite": True},
        {"loot_is_hunt": True},
        {"loot_is_summoned_pet": True},
        {
            "loot_drops": [
                {"item_id": "loot", "rate": 0.4},
                {"item_id": "other", "rate": 0.2},
            ]
        },
        {
            "loot_drops": [
                {"item_id": "other", "rate": 0.4},
                {"item_id": "loot", "rate": 0.2},
            ]
        },
        {"loot_gold_min": 1},
        {"loot_gold_max": 20},
        {"loot_gold_probability": 0.8},
    ],
)
def test_equal_authored_loot_contexts_share_methods_not_distinct_contexts(
    tmp_path, difference
):
    with database(tmp_path) as conn:
        conn.execute(
            "INSERT INTO zones(id,zone_id,name) VALUES ('other_zone',2,'Other Zone')"
        )
        build = normalizer(
            conn,
            items=[item("loot"), item("other")],
            monsters=[monster("target"), monster("other_monster")],
        )
        baseline = {
            "monster_id": "target",
            "loot_zone_number": 1,
            "loot_respawn": True,
            "loot_exp_multiplier": 1.0,
            "loot_is_boss": False,
            "loot_is_elite": False,
            "loot_is_hunt": False,
            "loot_is_summoned_pet": False,
            "loot_drops": [
                {"item_id": "loot", "rate": 0.2},
                {"item_id": "other", "rate": 0.4},
            ],
            "loot_gold_min": 0,
            "loot_gold_max": 10,
            "loot_gold_probability": 1.0,
        }
        for identity, zone, level, override in (
            ("first", "zone", 10, {}),
            (
                "equal_elsewhere",
                "other_zone",
                20,
                {"loot_exp_multiplier": 1, "loot_gold_probability": 1},
            ),
            ("different", "zone", 10, difference),
        ):
            context = {**baseline, **override, "id": identity}
            conn.execute(
                """INSERT INTO monster_spawns
                (id,monster_id,zone_id,level,position_x,position_y,position_z)
                VALUES (?,?,?,?,?,0,0)""",
                (identity, context["monster_id"], zone, level, level),
            )
            build.inputs["monster_spawns"].append(context)
        build.item_definitions()
        build.monsters_and_events()
        derive(conn)

        methods = dict(
            conn.execute(
                "SELECT monster_spawn_id, method_id FROM acquisition_providers_monster_spawns"
            )
        )
        assert methods["first"] == methods["equal_elsewhere"]
        assert methods["first"] != methods["different"]
        assert conn.execute(
            """SELECT p.monster_spawn_id,s.zone_id,s.position_x
            FROM acquisition_providers_monster_spawns p
            JOIN monster_spawns s ON s.id=p.monster_spawn_id
            WHERE p.method_id=? ORDER BY p.monster_spawn_id""",
            (methods["first"],),
        ).fetchall() == [("equal_elsewhere", "other_zone", 20), ("first", "zone", 10)]
        assert conn.execute(
            """SELECT e.item_id,e.probability FROM acquisition_kill_details d
            JOIN loot_pool_entries e ON e.pool_id=d.loot_pool_id
            WHERE d.id=? ORDER BY e.ordinal""",
            (methods["first"],),
        ).fetchall() == [("loot", 0.2), ("other", 0.4)]
        assert conn.execute(
            "SELECT source_level_hint FROM acquisition_methods WHERE id=?",
            (methods["first"],),
        ).fetchone() == (10,)


def test_native_zero_has_no_lookup_even_with_geographic_zone_zero(tmp_path):
    with database(tmp_path) as conn:
        conn.execute("UPDATE zones SET is_dungeon=1 WHERE zone_id=0")
        build = normalizer(
            conn,
            items=[item("loot"), item("fragment"), item("token")],
            monsters=[
                monster(
                    "target",
                    loot_zone_number=0,
                    drops=[{"item_id": "loot", "rate": 0.3}],
                )
            ],
        )
        conn.execute(
            """INSERT INTO luck_tokens(zone_id,zone_name,boss_luck_token_id,fragment_token_id)
            VALUES ('unknown','Unknown','token','fragment')"""
        )
        conn.execute(
            """INSERT INTO monster_spawns(id,monster_id,zone_id,level,position_x,position_y,position_z)
            VALUES ('zero_spawn','target','unknown',10,0,0,0)"""
        )
        build.item_definitions()
        build.kill_context(
            "zero_spawn",
            build.monsters["target"],
            build.monsters["target"],
            provider=("monster_spawns", "zero_spawn"),
        )
        derive(conn)

        assert conn.execute(
            "SELECT loot_zone_number,loot_zone_id,loot_zone_withheld FROM acquisition_kill_details"
        ).fetchone() == (0, None, 0)
        assert conn.execute(
            """SELECT s.zone_id,m.rooted FROM acquisition_providers_monster_spawns p
            JOIN monster_spawns s ON s.id=p.monster_spawn_id
            JOIN acquisition_methods m ON m.id=p.method_id"""
        ).fetchone() == ("unknown", 1)
        assert conn.execute(
            "SELECT item_id FROM acquisition_outputs WHERE resource_kind='item'"
        ).fetchall() == [("loot",)]
        for family in STAGING_FAMILIES:
            conn.execute(f'DROP TABLE "_acquisition_input_{family}"')
        rekey(conn)
        validate_semantics(conn)

        conn.execute("UPDATE acquisition_kill_details SET loot_zone_id='unknown'")
        with pytest.raises(InvalidPublication, match="invalid native loot-zone lookup"):
            validate_semantics(conn)
