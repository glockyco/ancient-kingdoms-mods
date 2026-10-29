import json
import sqlite3
from pathlib import Path

import pytest
from acquisition_fixtures import inputs
from pydantic import ValidationError

from compendium.db import create_database, insert_model
from compendium.denormalizers.acquisition import _Normalizer
from compendium.loaders.core import (
    load_crafting_stations,
    load_game_config,
    load_quests,
    load_recipe_family,
    load_seasons,
    load_summon_triggers,
)
from compendium.models import (
    CraftingRecipeData,
    CraftingStationData,
    GameConfigData,
    MonsterSpawnData,
    NpcData,
    PortalData,
    QuestData,
    SkillData,
    SummonTriggerData,
)

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


def recipe(key: str, material: str = "ore", **changes) -> dict:
    return {
        "id": "bar",
        "definition_key": key,
        "result_item_id": "bar",
        "result_amount": 1,
        "tier": 2,
        "experience": 750,
        "is_cooking_oven": False,
        "is_scribing_table": False,
        "materials": [{"item_id": material, "amount": 2}],
        "station_type": "crafting",
        "required_quest_id": None,
        **changes,
    }


def test_recipe_route_retains_every_complete_definition(tmp_path):
    variants = [recipe("first"), recipe("second", "scrap"), recipe("first")]
    (tmp_path / "crafting_recipes.json").write_text(json.dumps(variants))
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        conn.execute(
            "INSERT INTO items(id,name,travel_zone_id) VALUES ('bar','Bar',NULL)"
        )
        load_recipe_family(conn, tmp_path, "crafting_recipes")
        assert conn.execute(
            "SELECT id,result_item_id FROM crafting_recipes"
        ).fetchall() == [("bar", "bar")]
        staged = [
            json.loads(row[0])
            for row in conn.execute(
                "SELECT payload FROM _acquisition_input_crafting_recipes ORDER BY id"
            )
        ]
        assert len(staged) == 2
        assert [row["materials"][0]["item_id"] for row in staged] == ["ore", "scrap"]
        assert [row["definition_key"] for row in staged] == ["first", "second"]


@pytest.mark.parametrize(
    ("variants", "message"),
    [
        ([recipe("same"), recipe("same", "scrap")], "conflicting content"),
        (
            [recipe("first"), recipe("second", result_item_id="other")],
            "conflicting results",
        ),
    ],
)
def test_recipe_conflicts_fail_instead_of_discarding_a_definition(
    tmp_path, variants, message
):
    (tmp_path / "crafting_recipes.json").write_text(json.dumps(variants))
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        with pytest.raises(ValueError, match=message):
            load_recipe_family(conn, tmp_path, "crafting_recipes")
        conn.rollback()


@pytest.mark.parametrize(
    "field",
    [
        "definition_key",
        "tier",
        "experience",
        "result_amount",
        "is_cooking_oven",
        "is_scribing_table",
    ],
)
def test_recipe_requires_fresh_exported_definition_fields(field):
    stale = recipe("definition")
    del stale[field]
    with pytest.raises(ValidationError):
        CraftingRecipeData.model_validate(stale)


def test_authored_monster_context_is_not_filled_from_template_defaults():
    with pytest.raises(ValidationError, match="loot_zone_number"):
        MonsterSpawnData.model_validate(
            {
                "id": "spawn",
                "monster_id": "monster",
                "zone_id": "zone",
                "position": {"x": 0, "y": 0, "z": 0},
            }
        )


def test_station_membership_requires_fresh_offers():
    with pytest.raises(ValidationError, match="recipe_offers"):
        CraftingStationData.model_validate(
            {
                "id": "station",
                "name": "Station",
                "zone_id": "zone",
                "position": {"x": 0, "y": 0, "z": 0},
            }
        )


def test_portal_requires_exact_configured_target_field():
    with pytest.raises(ValidationError, match="need_monster_dead_spawn_id"):
        PortalData.model_validate(
            {
                "id": "portal",
                "from_zone_id": "origin",
                "to_zone_id": "destination",
                "position": {"x": 0, "y": 0, "z": 0},
                "destination": {"x": 1, "y": 1, "z": 0},
                "requires_everyone_key": False,
            }
        )


def test_npc_private_inputs_keep_duplicate_skills_and_shop_slots(tmp_path):
    npc = NpcData(
        id="npc",
        name="NPC",
        season=None,
        skill_ids=["attack", "attack"],
        quest_offers=[
            {
                "quest_id": "quest",
                "offer_index": 0,
                "accept_here": True,
                "complete_here": False,
            },
            {
                "quest_id": "quest",
                "offer_index": 3,
                "accept_here": False,
                "complete_here": True,
            },
        ],
        items_sold=[{"item_id": "pack", "price": 5}, {"item_id": "pack", "price": 5}],
    )
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        insert_model(conn.cursor(), "npcs", npc)
        stored = json.loads(
            conn.execute("SELECT payload FROM _acquisition_input_npcs").fetchone()[0]
        )
        assert stored["skill_ids"] == ["attack", "attack"]
        assert [sale["item_id"] for sale in stored["items_sold"]] == ["pack", "pack"]
        assert stored["quest_offers"] == [
            {
                "quest_id": "quest",
                "offer_index": 0,
                "accept_here": True,
                "complete_here": False,
            },
            {
                "quest_id": "quest",
                "offer_index": 3,
                "accept_here": False,
                "complete_here": True,
            },
        ]


def test_skill_linear_curves_preserve_zero_cost(tmp_path):
    skill = SkillData(
        id="skill",
        name="Skill",
        skill_type="passive",
        area_projectile=False,
        level_requirement={"base_value": 5, "bonus_per_level": 3},
        skill_point_cost={"base_value": 0, "bonus_per_level": 0},
    )
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        insert_model(conn.cursor(), "skills", skill)
        level, cost = conn.execute(
            "SELECT level_requirement,skill_point_cost FROM skills"
        ).fetchone()
        assert json.loads(level) == {"base_value": 5, "bonus_per_level": 3}
        assert json.loads(cost) == {"base_value": 0, "bonus_per_level": 0}


def test_loaded_quest_class_name_resolves_to_the_canonical_class_gate(tmp_path):
    quest = QuestData(
        id="quest", name="Quest", quest_type="kill", class_requirements=["Cleric"]
    )
    (tmp_path / "quests.json").write_text(json.dumps([quest.model_dump()]))
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        conn.execute(
            "INSERT INTO classes(id,name,description,primary_role,difficulty,resource_type,compatible_races) "
            "VALUES ('cleric','Cleric','','healer',1,'mana','[]')"
        )
        load_quests(conn, tmp_path)
        staged = json.loads(
            conn.execute("SELECT payload FROM _acquisition_input_quests").fetchone()[0]
        )
        _Normalizer(conn, inputs(quests=[staged])).quest_facts()
        assert conn.execute(
            "SELECT c.id,c.name FROM quest_class_requirements q "
            "JOIN classes c ON c.id=q.class_id WHERE q.quest_id='quest'"
        ).fetchall() == [("cleric", "Cleric")]


@pytest.mark.parametrize("find_npc", [False, True])
def test_discovery_progress_is_distinct_from_tracking_locations(tmp_path, find_npc):
    quest = QuestData(
        id="quest",
        name="Quest",
        quest_type="location",
        is_find_npc_quest=find_npc,
        discovered_location_zone_id="town",
        discovered_location_position={"x": 2, "y": 0, "z": 3},
        objectives=[
            {
                "type": "location",
                "zone_id": "town",
                "position": {"x": 8, "y": 0, "z": 9},
            }
        ],
    )
    (tmp_path / "quests.json").write_text(json.dumps([quest.model_dump()]))
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        conn.execute("INSERT INTO zones(id,zone_id,name) VALUES('town',1,'Town')")
        load_quests(conn, tmp_path)
        staged = json.loads(
            conn.execute("SELECT payload FROM _acquisition_input_quests").fetchone()[0]
        )
        _Normalizer(conn, inputs(quests=[staged])).quest_facts()
        assert conn.execute(
            "SELECT o.role,l.zone_id,l.position_x,l.position_z FROM quest_objectives o "
            "JOIN quest_objective_locations l ON l.id=o.id ORDER BY o.ordinal"
        ).fetchall() == [
            ("tracking_location" if find_npc else "location_visit", "town", 2, 3),
            ("tracking_location", "town", 8, 9),
        ]


def test_find_npc_does_not_invent_an_empty_discovery_objective(tmp_path):
    quest = QuestData(
        id="quest", name="Quest", quest_type="location", is_find_npc_quest=True
    )
    (tmp_path / "quests.json").write_text(json.dumps([quest.model_dump()]))
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        load_quests(conn, tmp_path)
        staged = json.loads(
            conn.execute("SELECT payload FROM _acquisition_input_quests").fetchone()[0]
        )
        _Normalizer(conn, inputs(quests=[staged])).quest_facts()
        assert conn.execute("SELECT COUNT(*) FROM quest_objectives").fetchone() == (0,)


def test_game_config_retains_ordered_fishing_and_home_offers(tmp_path):
    config = {
        "lockpicks_item_id": "lockpicks",
        "journal_fish_item_ids": ["fish", "fish", "rare_fish"],
        "trash_fish_item_ids": ["boot", "boot"],
        "special_items": {"max_level_reward": "reward"},
        "housing_catalog": [
            {
                "item_id": "bench",
                "workstations": [
                    {
                        "component_path": "0/1:0",
                        "kind": "crafting",
                        "recipe_offers": [
                            {"definition_key": "first", "offer_index": 0},
                            {"definition_key": "first", "offer_index": 1},
                        ],
                    }
                ],
            }
        ],
        "seasons": [
            {
                "id": "halloween",
                "buff_skill_id": "halloween_event",
                "shop_item_ids": ["treat", "fireworks"],
            },
            {
                "id": "christmas",
                "buff_skill_id": "winter_festival",
                "shop_item_ids": ["cookie", "fireworks"],
            },
        ],
    }
    (tmp_path / "game_config.json").write_text(json.dumps(config))
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        conn.executemany(
            "INSERT INTO skills(id,name,skill_type) VALUES (?,?,'target_buff')",
            [("halloween_event", "Halloween"), ("winter_festival", "Winter")],
        )
        load_game_config(conn, tmp_path)
        load_seasons(conn, tmp_path)
        stored = json.loads(
            conn.execute(
                "SELECT payload FROM _acquisition_input_game_config"
            ).fetchone()[0]
        )
        assert stored == config
        assert conn.execute(
            "SELECT id, ordinal, buff_skill_id FROM seasons ORDER BY ordinal"
        ).fetchall() == [
            ("halloween", 0, "halloween_event"),
            ("christmas", 1, "winter_festival"),
        ]


def test_game_config_requires_seasons_with_shop_items():
    with pytest.raises(ValidationError, match="shop_item_ids"):
        GameConfigData.model_validate(
            {
                "lockpicks_item_id": "lockpicks",
                "journal_fish_item_ids": [],
                "trash_fish_item_ids": [],
                "special_items": {},
                "housing_catalog": [],
                "seasons": [
                    {"id": "halloween", "buff_skill_id": "b", "shop_item_ids": []}
                ],
            }
        )


def test_new_relationship_foreign_keys_allow_atomic_rekey_but_reject_dangling_targets(
    tmp_path,
):
    conn = create_database(tmp_path / "test.db", SCHEMA_PATH)
    try:
        conn.execute(
            "INSERT INTO acquisition_methods(id,kind,rule_id) VALUES ('method','merge','merge')"
        )
        conn.execute(
            "INSERT INTO acquisition_item_details(id,item_id) VALUES ('method','missing')"
        )
        with pytest.raises(sqlite3.IntegrityError):
            conn.commit()
        conn.rollback()
        conn.execute(
            "INSERT INTO items(id,name,travel_zone_id) VALUES ('component','Component',NULL)"
        )
        conn.execute(
            "INSERT INTO acquisition_methods(id,kind,rule_id) VALUES ('method','merge','merge')"
        )
        conn.execute(
            "INSERT INTO acquisition_item_details(id,item_id) VALUES ('method','component')"
        )
        conn.commit()
        conn.execute("UPDATE acquisition_methods SET id='opaque_method'")
        conn.execute("UPDATE acquisition_item_details SET id='opaque_method'")
        conn.commit()
        assert conn.execute("SELECT id FROM acquisition_item_details").fetchone() == (
            "opaque_method",
        )
    finally:
        conn.close()


def test_same_type_stations_keep_distinct_authored_offers(tmp_path):
    stations = [
        {
            "id": station_id,
            "name": "Forge",
            "zone_id": "zone",
            "position": {"x": index, "y": 0, "z": 0},
            "is_cooking_oven": False,
            "recipe_offers": [{"definition_key": definition, "offer_index": 3}],
        }
        for index, (station_id, definition) in enumerate(
            [("first_forge", "first_definition"), ("second_forge", "second_definition")]
        )
    ]
    (tmp_path / "crafting_stations.json").write_text(json.dumps(stations))
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        conn.execute("INSERT INTO zones(id,zone_id,name) VALUES ('zone',1,'Zone')")
        load_crafting_stations(conn, tmp_path)
        staged = dict(
            conn.execute("SELECT id,payload FROM _acquisition_input_crafting_stations")
        )
        assert json.loads(staged["first_forge"])["recipe_offers"] == [
            {"definition_key": "first_definition", "offer_index": 3}
        ]
        assert json.loads(staged["second_forge"])["recipe_offers"] == [
            {"definition_key": "second_definition", "offer_index": 3}
        ]
        assert conn.execute(
            "SELECT position_x,position_y FROM crafting_stations WHERE id='first_forge'"
        ).fetchone() == (0, 0)


def test_fixed_outputs_reject_missing_bounds(tmp_path):
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        conn.execute(
            "INSERT INTO acquisition_methods(id,kind,rule_id) VALUES ('method','merge','merge')"
        )
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                """INSERT INTO acquisition_outputs
                   (id,method_id,ordinal,resource_kind,yield_rule,delivery)
                   VALUES ('output','method',0,'gold','fixed','inventory')"""
            )


def summon_trigger(**changes):
    return {
        "id": "trigger",
        "summoned_entity_type": "Monster",
        "summoned_entity_id": "boss",
        "summoned_entity_name": "Boss",
        "summoned_monster_spawn_id": "target_second",
        "summoned_npc_spawn_id": None,
        "summoned_is_summonable": True,
        "summoned_respawn_time": 60,
        "summoned_respawn_probability": 1,
        "summoned_death_time": 10,
        "placeholder_monster_ids": ["guard_spawn", "guard_spawn"],
        **changes,
    }


@pytest.mark.parametrize(
    "field", ["summoned_monster_spawn_id", "summoned_npc_spawn_id"]
)
def test_summon_requires_fresh_exact_target_fields(field):
    raw = summon_trigger()
    del raw[field]
    with pytest.raises(ValidationError, match=field):
        SummonTriggerData.model_validate(raw)


@pytest.mark.parametrize(
    "changes",
    [
        {"summoned_monster_spawn_id": None},
        {"summoned_npc_spawn_id": "npc_target"},
        {"summoned_entity_type": "Npc"},
    ],
)
def test_summon_rejects_missing_conflicting_or_wrong_kind_targets(changes):
    with pytest.raises(ValidationError, match="matching configured spawn target"):
        SummonTriggerData.model_validate(summon_trigger(**changes))


def test_summon_keeps_exact_target_among_same_template_placements_and_duplicate_guards(
    tmp_path,
):
    (tmp_path / "summon_triggers.json").write_text(json.dumps([summon_trigger()]))
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        conn.execute("INSERT INTO zones(id,zone_id,name) VALUES ('zone',1,'Zone')")
        conn.executemany(
            "INSERT INTO monsters(id,name) VALUES (?,?)",
            [("boss", "Boss"), ("guard", "Guard")],
        )
        conn.executemany(
            "INSERT INTO monster_spawns(id,monster_id,zone_id) VALUES (?,?,'zone')",
            [
                ("target_first", "boss"),
                ("target_second", "boss"),
                ("guard_spawn", "guard"),
            ],
        )
        load_summon_triggers(conn, tmp_path)
        assert conn.execute(
            "SELECT summoned_monster_spawn_id,summoned_npc_spawn_id FROM summon_triggers"
        ).fetchall() == [("target_second", None)]
        assert conn.execute(
            "SELECT spawn_id,placeholder_order,withheld FROM summon_trigger_placeholders ORDER BY placeholder_order"
        ).fetchall() == [("guard_spawn", 0, 0), ("guard_spawn", 1, 0)]
        assert (
            conn.execute(
                "SELECT COUNT(DISTINCT id) FROM summon_trigger_placeholders"
            ).fetchone()[0]
            == 2
        )


def test_summon_rejects_target_whose_template_disagrees(tmp_path):
    (tmp_path / "summon_triggers.json").write_text(json.dumps([summon_trigger()]))
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        conn.execute("INSERT INTO zones(id,zone_id,name) VALUES ('zone',1,'Zone')")
        conn.execute("INSERT INTO monsters(id,name) VALUES ('other','Other')")
        conn.execute(
            "INSERT INTO monster_spawns(id,monster_id,zone_id) VALUES ('target_second','other','zone')"
        )
        with pytest.raises(ValueError, match="mismatched configured spawn target"):
            load_summon_triggers(conn, tmp_path)


def test_skill_predecessor_preserves_membership_gate_at_declared_zero_rank(tmp_path):
    with create_database(tmp_path / "test.db", SCHEMA_PATH) as conn:
        conn.executemany(
            "INSERT INTO skills(id,name,skill_type) VALUES (?,?,'passive')",
            [("skill", "Skill"), ("predecessor", "Predecessor")],
        )
        conn.execute(
            """INSERT INTO skill_predecessors
               (id,skill_id,ordinal,predecessor_skill_id,rank)
               VALUES ('gate','skill',0,'predecessor',0)"""
        )
        assert conn.execute(
            "SELECT predecessor_skill_id,rank FROM skill_predecessors"
        ).fetchone() == ("predecessor", 0)
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute("UPDATE skill_predecessors SET rank=-1")


def test_npc_requires_native_quest_offer_flags():
    with pytest.raises(ValidationError, match="quest_offers"):
        NpcData.model_validate({"id": "npc", "name": "NPC"})
    with pytest.raises(ValidationError, match="complete_here"):
        NpcData.model_validate(
            {
                "id": "npc",
                "name": "NPC",
                "quest_offers": [
                    {"quest_id": "quest", "offer_index": 0, "accept_here": True}
                ],
            }
        )


def test_npc_quest_offers_reject_reused_native_slots():
    offer = {
        "quest_id": "quest",
        "offer_index": 0,
        "accept_here": True,
        "complete_here": False,
    }
    with pytest.raises(ValidationError, match="indices must be unique"):
        NpcData.model_validate(
            {
                "id": "npc",
                "name": "NPC",
                "season": None,
                "quest_offers": [offer, offer],
            }
        )
