import json

import pytest
from acquisition_fixtures import (
    database,
    inputs,
    item,
    monster,
    normalizer,
    npc,
    quest,
    stage,
)
from pydantic import ValidationError

from compendium.denormalizers.acquisition import derive, normalize, validate
from compendium.models import AltarData, ItemData


def test_chest_roll_order_mixed_scaling_and_duplicate_groups_survive(tmp_path):
    with database(tmp_path) as conn:
        build = normalizer(
            conn,
            items=[
                item(
                    "chest",
                    item_type="chest",
                    chest_num_items=3,
                    chest_rewards=[
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
                ),
                item("relic"),
                item("weapon", item_type="weapon", quality=4),
            ],
        )
        build.item_definitions()
        assert conn.execute("""
            SELECT e.ordinal,e.item_id,e.probability,e.scales_with_treasure_hunter,e.duplicate_group,r.num_items
            FROM loot_pool_entries e JOIN loot_chest_rules r ON r.pool_id=e.pool_id ORDER BY e.ordinal
        """).fetchall() == [
            (0, "relic", 0.2, 1, 0, 3),
            (1, "weapon", 0.9, 0, 1, 3),
            (2, "relic", 0.1, 1, 0, 3),
        ]
        assert conn.execute("""
            SELECT g.phase,g.consumption_rule,i.amount FROM acquisition_cost_groups g
            JOIN acquisition_inputs i ON i.cost_group_id=g.id
        """).fetchall() == [("use", "before_roll", 1)]


def test_altar_tiers_keep_original_roll_and_conditional_native_gold(tmp_path):
    with database(tmp_path) as conn:
        build = normalizer(
            conn,
            items=[item(name) for name in ("common", "magic", "epic", "legendary")],
            monsters=[
                monster(
                    "elite",
                    is_elite=True,
                    drops=[{"item_id": "common", "rate": 0.75}],
                    gold_min=3,
                    gold_max=9,
                )
            ],
        )
        conn.execute(
            "INSERT INTO progression_rules(id,max_level,max_veteran_points,attribute_points_per_veteran,veteran_skill_points_per_veteran) VALUES(1,60,200,1,1)"
        )
        conn.execute(
            """
            INSERT INTO altars(id,name,type,zone_id,reward_common_id,reward_magic_id,reward_epic_id,
                               reward_legendary_id,magic_reward_threshold,epic_reward_threshold,legendary_reward_threshold,waves)
            VALUES('altar','Altar','forgotten','zone','common','magic','epic','legendary',40,50,150,?)
        """,
            (json.dumps([{"wave_number": 1, "monsters": [{"monster_id": "elite"}]}]),),
        )
        conn.execute("UPDATE altars SET min_level_required=25")
        build.item_definitions()
        build.monsters_and_events()
        derive(conn)
        assert conn.execute("""
            SELECT o.item_id,o.condition_slot,o.amount_min,o.amount_max
            FROM acquisition_outputs o WHERE o.resource_kind='item' ORDER BY o.condition_slot
        """).fetchall() == [
            ("common", 0, None, None),
            ("magic", 1, None, None),
            ("epic", 2, None, None),
            ("legendary", 3, None, None),
        ]
        assert (
            conn.execute(
                "SELECT amount_min,amount_max FROM acquisition_outputs WHERE resource_kind='gold'"
            ).fetchall()
            == [(None, None)] * 4
        )
        assert conn.execute("""
            SELECT e.item_id,e.probability FROM acquisition_kill_details d
            JOIN loot_pool_entries e ON e.pool_id=d.loot_pool_id ORDER BY e.item_id
        """).fetchall() == [
            ("common", 0.75),
            ("epic", 0.75),
            ("legendary", 0.75),
            ("magic", 0.75),
        ]
        assert conn.execute("""
            SELECT o.condition_slot,m.source_level_hint FROM acquisition_outputs o
            JOIN acquisition_methods m ON m.id=o.method_id WHERE o.resource_kind='item'
            ORDER BY o.condition_slot
        """).fetchall() == [(0, 25), (1, 40), (2, 50), (3, 60)]


def test_recipe_variants_keep_exact_offers_native_tier_and_zero_experience(tmp_path):
    with database(tmp_path) as conn:
        build = normalizer(conn, items=[item(name) for name in ("result", "a", "b")])
        conn.execute(
            "INSERT INTO crafting_recipes(id,result_item_id) VALUES('route','result')"
        )
        for station in ("first", "second"):
            conn.execute(
                "INSERT INTO crafting_stations(id,name,zone_id) VALUES(?,?,'zone')",
                (station, station),
            )
        build.inputs["crafting_recipes"] = [
            {
                "id": "route",
                "definition_key": key,
                "result_item_id": "result",
                "result_amount": 25,
                "tier": 1,
                "experience": xp,
                "is_cooking_oven": False,
                "is_scribing_table": False,
                "materials": [{"item_id": material, "amount": 2}],
            }
            for key, material, xp in (("variant_a", "a", 0), ("variant_b", "b", 150))
        ]
        build.inputs["crafting_stations"] = [
            {
                "id": station,
                "recipe_offers": [{"definition_key": key, "offer_index": index}],
            }
            for station, key, index in (
                ("first", "variant_a", 4),
                ("second", "variant_b", 1),
            )
        ]
        build.recipes()
        assert conn.execute("""
            SELECT p.crafting_station_id,p.offer_index,d.result_amount,d.tier,d.experience,i.item_id
            FROM acquisition_recipe_details d JOIN acquisition_providers_crafting_stations p ON p.method_id=d.id
            JOIN acquisition_cost_groups g ON g.method_id=d.id JOIN acquisition_inputs i ON i.cost_group_id=g.id
            ORDER BY p.crafting_station_id
        """).fetchall() == [("first", 4, 25, 1, 0, "a"), ("second", 1, 25, 1, 150, "b")]
        assert conn.execute(
            "SELECT amount_min FROM acquisition_outputs ORDER BY method_id"
        ).fetchall() == [(25,), (25,)]


def test_pack_offer_awards_contents_while_carried_pack_has_separate_consumption(
    tmp_path,
):
    with database(tmp_path) as conn:
        build = normalizer(
            conn,
            items=[
                item(
                    "pack",
                    item_type="pack",
                    pack_final_item_id="arrow",
                    pack_final_amount=25,
                ),
                item("arrow"),
            ],
            npcs=[npc("shop", items_sold=[{"item_id": "pack", "price": 10}])],
        )
        build.item_definitions()
        build.vendors_and_services()
        assert conn.execute("""
            SELECT m.kind,o.item_id,o.amount_min FROM acquisition_methods m
            JOIN acquisition_outputs o ON o.method_id=m.id ORDER BY m.kind
        """).fetchall() == [("pack_use", "arrow", 25), ("vendor", "arrow", 25)]
        assert conn.execute("""
            SELECT m.kind,i.item_id,i.resource_kind FROM acquisition_methods m
            JOIN acquisition_cost_groups g ON g.method_id=m.id JOIN acquisition_inputs i ON i.cost_group_id=g.id ORDER BY m.kind
        """).fetchall() == [("pack_use", "pack", "item"), ("vendor", None, "gold")]


def test_merge_uses_complete_native_components_once(tmp_path):
    with database(tmp_path) as conn:
        components = ["ash", "emblem", "sigil"]
        build = normalizer(
            conn,
            items=[
                item(
                    name,
                    item_type="merge",
                    merge_items_needed_ids=components,
                    merge_result_item_id="key",
                )
                for name in components
            ]
            + [item("key", is_key=True)],
        )
        build.item_definitions()
        assert (
            conn.execute(
                "SELECT count(*) FROM acquisition_methods WHERE kind='merge'"
            ).fetchone()[0]
            == 1
        )
        assert conn.execute(
            "SELECT item_id,amount FROM acquisition_inputs ORDER BY ordinal"
        ).fetchall() == [("ash", 1), ("emblem", 1), ("sigil", 1)]
        assert (
            conn.execute("SELECT count(*) FROM acquisition_providers_items").fetchone()[
                0
            ]
            == 3
        )
        assert conn.execute(
            "SELECT item_id,delivery FROM acquisition_outputs"
        ).fetchall() == [("key", "keyring")]


def test_class_bow_branch_adds_fifty_ammo_without_another_choice(tmp_path):
    with database(tmp_path) as conn:
        conn.executemany(
            """INSERT INTO classes(id,name,description,primary_role,difficulty,resource_type,compatible_races)
                             VALUES(?,?,'','',1,'','[]')""",
            [("ranger", "Ranger"), ("warrior", "Warrior")],
        )
        build = normalizer(
            conn,
            items=[
                item("bow", weapon_category="Bow", weapon_required_ammo_id="arrow"),
                item("sword"),
                item("arrow"),
            ],
            quests=[
                quest(
                    "reward",
                    rewards={
                        "gold": 20,
                        "exp": 40,
                        "items": [
                            {"item_id": "bow", "class_specific": "Ranger"},
                            {"item_id": "sword", "class_specific": "Warrior"},
                        ],
                    },
                )
            ],
        )
        build.quest_facts()
        assert conn.execute(
            "SELECT item_id,amount_min,condition_slot FROM acquisition_outputs WHERE resource_kind='item' ORDER BY ordinal"
        ).fetchall() == [("bow", 1, 0), ("arrow", 50, 0), ("sword", 1, 1)]
        assert (
            conn.execute("SELECT count(*) FROM quest_reward_slots").fetchone()[0] == 2
        )
        assert conn.execute(
            "SELECT reward_gold,reward_experience FROM quests"
        ).fetchone() == (20, 40)


def test_objective_roles_zero_gaps_location_and_npc_skill_order(tmp_path):
    with database(tmp_path) as conn:
        conn.execute(
            "INSERT INTO skills(id,name,skill_type) VALUES('attack','Attack','attack')"
        )
        build = normalizer(
            conn,
            items=[item("x"), item("y")],
            npcs=[npc("guard", skill_ids=["attack", "attack"])],
            quests=[
                quest(
                    "inventory",
                    quest_type="gather_inventory",
                    gather_items=[{"item_id": "x", "amount": 5}],
                    required_items=[{"item_id": "y", "amount": 2}],
                    remove_items_on_complete=True,
                ),
                quest("equip", quest_type="equip_item", equip_items=["x", "y"]),
                quest(
                    "gather",
                    quest_type="gather",
                    gather_item_1_id="x",
                    gather_amount_1=0,
                    gather_item_2_id="y",
                    gather_amount_2=3,
                ),
                quest(
                    "visit",
                    objectives=[{"type": "location", "amount": 0, "zone_id": "zone"}],
                ),
                quest(
                    "brew", quest_type="alchemy", potion_item_id="x", potions_amount=3
                ),
            ],
        )
        build.quest_facts()
        assert conn.execute(
            "SELECT role,amount FROM quest_objectives WHERE quest_id='inventory' ORDER BY ordinal"
        ).fetchall() == [("inventory_primary", 5), ("inventory_secondary", 2)]
        assert conn.execute(
            "SELECT role FROM quest_objectives WHERE quest_id='equip' ORDER BY ordinal"
        ).fetchall() == [("equipped",), ("equipped",)]
        assert conn.execute(
            "SELECT ordinal,amount FROM quest_objectives WHERE quest_id='gather'"
        ).fetchall() == [(1, 3)]
        assert conn.execute(
            "SELECT kind,amount FROM quest_objectives WHERE quest_id='visit'"
        ).fetchall() == [("location", None)]
        assert conn.execute(
            "SELECT role,amount FROM quest_objectives WHERE quest_id='brew'"
        ).fetchall() == [("brew_counter", 3)]
        assert conn.execute(
            "SELECT skill_index,skill_id FROM npc_skills ORDER BY skill_index"
        ).fetchall() == [(0, "attack"), (1, "attack")]
        assert (
            conn.execute(
                "SELECT count(DISTINCT npc_id) FROM npc_skills WHERE skill_id='attack'"
            ).fetchone()[0]
            == 1
        )


def test_normalize_drops_all_private_staging_and_validate_detects_stale_index(tmp_path):
    with database(tmp_path) as conn:
        reward = item("cap_reward")
        conn.execute("INSERT INTO items(id,name) VALUES('cap_reward','cap_reward')")
        conn.execute(
            "INSERT INTO progression_rules(id,max_level,max_veteran_points,attribute_points_per_veteran,veteran_skill_points_per_veteran) VALUES(1,60,200,1,1)"
        )
        stage(conn, inputs(items=[reward]))
        normalize(conn)
        derive(conn)
        validate(conn)
        assert (
            conn.execute(
                "SELECT count(*) FROM sqlite_master WHERE name GLOB '_acquisition_input_*'"
            ).fetchone()[0]
            == 0
        )
        conn.execute("UPDATE acquisition_methods SET rooted=0")
        with pytest.raises(ValueError, match="stale rooted"):
            validate(conn)


@pytest.mark.parametrize("field", ["item_level", "primal_essence_value"])
def test_missing_exported_item_fact_fails_loudly(field):
    value = {
        "id": "item",
        "name": "Item",
        "item_type": "general",
        "quality": 0,
        "item_level": 0,
        "primal_essence_value": None,
    }
    del value[field]
    with pytest.raises(ValidationError, match=field):
        ItemData.model_validate(value)


def test_missing_chest_scaling_flag_fails_loudly():
    with pytest.raises(ValidationError, match="scales_with_treasure_hunter"):
        item(
            "chest",
            item_type="chest",
            chest_rewards=[{"item_id": "relic", "probability": 0.1}],
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


def test_fishing_keeps_full_ordered_primary_trash_and_quality_fallback_inputs(tmp_path):
    from compendium.models import GatherItemData

    with database(tmp_path) as conn:
        build = normalizer(
            conn,
            items=[
                item("fish0", quality=0),
                item("fish1", quality=1),
                item("fish2", quality=2),
                item("trash"),
            ],
        )
        build.config["journal_fish_item_ids"] = ["fish0", "fish1", "fish1", "fish2"]
        build.config["trash_fish_item_ids"] = ["trash", "trash"]
        resource = GatherItemData.model_validate(
            {
                "id": "spot",
                "name": "Spot",
                "resource_id": "fishing",
                "is_fishing_spot": True,
                "level": 2,
                "is_template": False,
                "random_drops": [
                    {"item_id": "fish2", "rate": 0.2},
                    {"item_id": "fish2", "rate": 0.1},
                ],
            }
        ).model_dump()
        build.inputs["gathering"] = [resource]
        conn.execute(
            "INSERT INTO gathering_resources(id,name,is_fishing_spot,level) VALUES('fishing','Fishing',1,2)"
        )
        conn.execute(
            "INSERT INTO gathering_resource_spawns(id,resource_id,zone_id) VALUES('spot','fishing','zone')"
        )
        build.gathering()
        assert conn.execute("""
            SELECT p.kind,count(*) FROM loot_pools p JOIN loot_pool_entries e ON e.pool_id=p.id
            GROUP BY p.kind ORDER BY p.kind
        """).fetchall() == [
            ("fishing_fallback", 4),
            ("fishing_primary", 2),
            ("fishing_trash", 2),
        ]
        assert conn.execute("""
            SELECT e.item_id,e.quality,e.ordinal FROM loot_pools p
            JOIN loot_pool_entries e ON e.pool_id=p.id WHERE p.kind='fishing_fallback' ORDER BY e.ordinal
        """).fetchall() == [
            ("fish0", 0, 0),
            ("fish1", 1, 1),
            ("fish1", 1, 2),
            ("fish2", 2, 3),
        ]
        derive(conn)
        assert conn.execute(
            "SELECT item_id FROM acquisition_outputs ORDER BY item_id"
        ).fetchall() == [
            ("fish0",),
            ("fish1",),
            ("fish2",),
        ]


def test_world_chest_prioritized_costs_preserve_outer_roll_timing(tmp_path):
    from compendium.models import GatherItemData

    with database(tmp_path) as conn:
        build = normalizer(conn, items=[item("key"), item("lockpicks"), item("loot")])
        build.inputs["gathering"] = [
            GatherItemData.model_validate(
                {
                    "id": "world_chest",
                    "name": "World Chest",
                    "resource_id": None,
                    "is_chest": True,
                    "tool_required_id": "key",
                    "chest_reward_probability": 0.6,
                    "item_reward_id": "loot",
                }
            ).model_dump()
        ]
        conn.execute(
            "INSERT INTO chests(id,name,zone_id) VALUES('world_chest','World Chest','zone')"
        )
        build.gathering()
        assert conn.execute("""
            SELECT g.selection_rule,g.phase,g.consumption_rule,i.item_id,i.role
            FROM acquisition_cost_groups g JOIN acquisition_inputs i ON i.cost_group_id=g.id
            ORDER BY g.selection_rule
        """).fetchall() == [
            ("chest_key_first", "attempt", "after_outer_success", "key", "key"),
            (
                "chest_lockpick_fallback",
                "attempt",
                "after_outer_success",
                "lockpicks",
                "lockpick",
            ),
        ]
        assert conn.execute(
            "SELECT outer_success FROM acquisition_world_chest_details"
        ).fetchone() == (0.6,)


@pytest.mark.parametrize(
    "probability,gift,gold_min,gold_max,expected_outer,effect_count",
    [
        (0, "loot", 0, 0, 1, 0),
        (0.4, None, 0, 0, 1, 0),
        (0.4, "loot", 0, 0, 0.4, 2),
        (0.4, None, 1, 3, 0.4, 2),
        (0.4, None, 0, 3, 1, 0),
    ],
)
def test_chest_native_outer_roll_and_faction_branch(
    tmp_path,
    probability,
    gift,
    gold_min,
    gold_max,
    expected_outer,
    effect_count,
):
    from compendium.models import GatherItemData

    with database(tmp_path) as conn:
        conn.executemany(
            "INSERT INTO factions(id,name) VALUES(?,?)",
            [("local", "Local"), ("forsaken", "The Forsaken")],
        )
        build = normalizer(conn, items=[item("loot")])
        build.inputs["gathering"] = [
            GatherItemData.model_validate(
                {
                    "id": "chest",
                    "name": "Chest",
                    "resource_id": None,
                    "is_chest": True,
                    "chest_reward_probability": probability,
                    "item_reward_id": gift,
                    "gold_min": gold_min,
                    "gold_max": gold_max,
                    "decrease_faction": "Local",
                    "random_drops": [{"item_id": "loot", "rate": 0.2}],
                }
            ).model_dump()
        ]
        conn.execute(
            "INSERT INTO chests(id,name,zone_id) VALUES('chest','Chest','zone')"
        )
        build.gathering()
        assert conn.execute(
            "SELECT outer_success FROM acquisition_world_chest_details"
        ).fetchone() == (expected_outer,)
        assert (
            conn.execute("SELECT count(*) FROM acquisition_faction_effects").fetchone()[
                0
            ]
            == effect_count
        )
        if effect_count:
            assert conn.execute(
                "SELECT event,delta FROM acquisition_faction_effects ORDER BY delta"
            ).fetchall() == [("attempt", -200), ("attempt", 200)]


@pytest.mark.parametrize("has_normal", [False, True])
def test_altar_replaces_only_first_normal_entry_and_overrides_gold_without_one(
    tmp_path, has_normal
):
    with database(tmp_path) as conn:
        drops = (
            [{"item_id": "common", "rate": 0.8}, {"item_id": "common", "rate": 0.2}]
            if has_normal
            else [{"item_id": "other", "rate": 0.7}]
        )
        build = normalizer(
            conn,
            items=[
                item(name) for name in ("common", "magic", "epic", "legendary", "other")
            ],
            monsters=[
                monster("elite", is_elite=True, drops=drops, gold_min=2, gold_max=3)
            ],
        )
        conn.execute(
            """
            INSERT INTO altars(id,name,type,zone_id,reward_common_id,reward_magic_id,reward_epic_id,
                               reward_legendary_id,magic_reward_threshold,epic_reward_threshold,legendary_reward_threshold,waves)
            VALUES('altar','Altar','forgotten','zone','common','magic','epic','legendary',40,50,150,?)
        """,
            (json.dumps([{"wave_number": 1, "monsters": [{"monster_id": "elite"}]}]),),
        )
        build.item_definitions()
        build.monsters_and_events()
        if has_normal:
            assert conn.execute("""
                SELECT e.ordinal,e.item_id,e.probability FROM acquisition_kill_details d
                JOIN acquisition_outputs o ON o.method_id=d.id AND o.condition_slot=2
                JOIN loot_pool_entries e ON e.pool_id=d.loot_pool_id ORDER BY e.ordinal
            """).fetchall() == [(0, "epic", 0.8), (1, "common", 0.2)]
        else:
            assert (
                conn.execute(
                    "SELECT count(*) FROM acquisition_kill_details"
                ).fetchone()[0]
                == 1
            )
            assert (
                conn.execute(
                    "SELECT count(*) FROM acquisition_outputs WHERE condition_slot IS NOT NULL"
                ).fetchone()[0]
                == 0
            )
        assert conn.execute(
            "SELECT count(*) FROM acquisition_outputs WHERE resource_kind='gold' AND amount_min IS NULL AND amount_max IS NULL"
        ).fetchone()[0] == (4 if has_normal else 1)


def test_npc_quest_memberships_preserve_native_flags_and_offer_gaps(tmp_path):
    with database(tmp_path) as conn:
        build = normalizer(
            conn,
            npcs=[
                npc(
                    "start",
                    quest_offers=[
                        {
                            "quest_id": "quest",
                            "offer_index": 1,
                            "accept_here": True,
                            "complete_here": False,
                        },
                        {
                            "quest_id": "quest",
                            "offer_index": 3,
                            "accept_here": False,
                            "complete_here": False,
                        },
                    ],
                ),
                npc(
                    "end",
                    quest_offers=[
                        {
                            "quest_id": "quest",
                            "offer_index": 2,
                            "accept_here": False,
                            "complete_here": True,
                        },
                    ],
                ),
                npc(
                    "both",
                    quest_offers=[
                        {
                            "quest_id": "quest",
                            "offer_index": 4,
                            "accept_here": True,
                            "complete_here": True,
                        },
                    ],
                ),
            ],
            quests=[quest("quest", start_npc_id="start", end_npc_id="end")],
        )
        build.quest_facts()
        assert conn.execute(
            "SELECT npc_id,role,ordinal FROM npc_quest_memberships ORDER BY npc_id,role"
        ).fetchall() == [
            ("both", "complete", 4),
            ("both", "offer", 4),
            ("end", "complete", 2),
            ("start", "offer", 1),
        ]
        assert conn.execute("""
            SELECT d.phase,p.npc_id FROM acquisition_quest_details d
            JOIN acquisition_providers_npcs p ON p.method_id=d.id ORDER BY d.phase,p.npc_id
        """).fetchall() == [
            ("accept", "both"),
            ("accept", "start"),
            ("complete", "both"),
            ("complete", "end"),
        ]


def test_quest_navigation_target_does_not_invent_a_completion_provider(tmp_path):
    with database(tmp_path) as conn:
        build = normalizer(
            conn,
            quests=[quest("quest", start_npc_id="giver", end_npc_id="navigation")],
            npcs=[
                npc(
                    "giver",
                    quest_offers=[
                        {
                            "quest_id": "quest",
                            "offer_index": 0,
                            "accept_here": True,
                            "complete_here": False,
                        }
                    ],
                ),
                npc("navigation"),
            ],
        )
        build.quest_facts()
        assert conn.execute(
            "SELECT role,npc_id FROM npc_quest_memberships WHERE quest_id='quest'"
        ).fetchall() == [("offer", "giver")]
        assert (
            conn.execute(
                "SELECT COUNT(*) FROM acquisition_providers_npcs p "
                "JOIN acquisition_quest_details q ON q.id=p.method_id "
                "WHERE q.quest_id='quest' AND q.phase='complete'"
            ).fetchone()[0]
            == 0
        )


def test_gathering_variants_keep_placement_yields_without_using_template_defaults(
    tmp_path,
):
    from compendium.models import GatherItemData

    with database(tmp_path) as conn:
        build = normalizer(conn, items=[item("essence")])
        rows = [("lily", 2), ("lily_a", 1), ("lily_b", 4), ("lily_c", 4)]
        build.inputs["gathering"] = [
            GatherItemData.model_validate(
                {
                    "id": identity,
                    "name": "Lily",
                    "resource_id": "lily",
                    "is_plant": True,
                    "is_template": identity == "lily",
                    "item_reward_id": "essence",
                    "item_reward_amount": amount,
                }
            ).model_dump()
            for identity, amount in rows
        ]
        conn.execute(
            "INSERT INTO gathering_resources(id,name,is_plant) VALUES('lily','Lily',1)"
        )
        conn.executemany(
            "INSERT INTO gathering_resource_spawns(id,resource_id,zone_id) VALUES(?,'lily','zone')",
            [(identity,) for identity, _ in rows if identity != "lily"],
        )
        build.gathering()
        assert conn.execute(
            "SELECT p.resource_spawn_id,o.amount_min,o.amount_max "
            "FROM acquisition_providers_resource_spawns p "
            "JOIN acquisition_outputs o ON o.method_id=p.method_id "
            "WHERE o.item_id='essence' ORDER BY p.resource_spawn_id"
        ).fetchall() == [("lily_a", 1, 1), ("lily_b", 1, 4), ("lily_c", 1, 4)]
        assert (
            conn.execute(
                "SELECT COUNT(*) FROM acquisition_resource_details WHERE resource_id='lily'"
            ).fetchone()[0]
            == 3
        )
