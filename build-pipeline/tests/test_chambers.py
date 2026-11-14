import copy
import json

import pytest
from acquisition_fixtures import database, item, monster, normalizer, stage

from compendium.denormalizers.acquisition import (
    STAGING_FAMILIES,
    derive,
    verify_private_reachability,
)
from compendium.loaders.catalog import DATASETS, LoadContext, load_dataset

CHANCES = {level: 0.0 for level in range(1, 40)}
CHANCES.update({40: 0.01, 45: 0.03, 50: 0.050000004, 55: 0.1, 58: 0.1})
for _level in range(41, 60):
    CHANCES.setdefault(_level, 0.1 if _level >= 55 else 0.02)
BANDS = [
    {
        "minimum_level": 40,
        "maximum_level": 49,
        "minimum_veteran_points": 0,
        "maximum_veteran_points": None,
        "minimum_quantity": 1,
        "maximum_quantity": 2,
        "distribution": "uniform_integer",
    },
    {
        "minimum_level": 50,
        "maximum_level": None,
        "minimum_veteran_points": 0,
        "maximum_veteran_points": 99,
        "minimum_quantity": 1,
        "maximum_quantity": 3,
        "distribution": "uniform_integer",
    },
    {
        "minimum_level": 50,
        "maximum_level": None,
        "minimum_veteran_points": 100,
        "maximum_veteran_points": 199,
        "minimum_quantity": 2,
        "maximum_quantity": 4,
        "distribution": "uniform_integer",
    },
    {
        "minimum_level": 50,
        "maximum_level": None,
        "minimum_veteran_points": 200,
        "maximum_veteran_points": None,
        "minimum_quantity": 3,
        "maximum_quantity": 5,
        "distribution": "uniform_integer",
    },
]


def export(max_level=41, max_veteran=2):
    """A small export that satisfies every domain check, with the real shape."""
    levels = list(range(40, max_level + 1))
    veteran = list(range(max_veteran + 1))
    enemy = list(range(37, max_level + 2))
    offsets = [
        {"offset": o, "weight": 7 - abs(o), "ordinary": True, "guardian": o >= 0}
        for o in range(-3, 7)
    ]
    chance_levels = list(range(1, 60))
    return {
        "id": "chambers_of_chaos",
        "zone_id": "chambers_of_chaos",
        "keeper_npc_id": "keeper",
        "seal_item_id": "seal",
        "reward_item_id": "token",
        "monster_pool": ["skeleton", "orc"],
        "encounter_groups": [
            {
                "id": "g1",
                "name": "Watch",
                "guards_monster_id": "skeleton",
                "support_monster_id": "orc",
            },
            {
                "id": "g2",
                "name": "Alone",
                "guards_monster_id": "orc",
                "support_monster_id": None,
            },
        ],
        "rules": {
            "room_count": 3,
            "run_duration_seconds": 1200,
            "minimum_level": 40,
            "wave_count": 3,
            "maximum_hunt_targets": 20,
            "maximum_clear_targets": 30,
            "puzzle_penalty_guards": 2,
            "combat_experience_multiplier": 3,
            "player_levels": levels,
            "veteran_points": veteran,
            "enemy_levels": enemy,
            "room_indices": [0, 1, 2],
            "seal_drop_levels": chance_levels,
            "seal_drop_chances": [
                {"level": level, "chance": CHANCES[level]} for level in chance_levels
            ],
            "completion_experience": [
                {"level": level, "experience": 150000 if level >= 40 else 0}
                for level in range(1, 51)
            ],
            "maximum_enemy_level_bonus": [
                {"veteran_points": v, "bonus": 1} for v in veteran
            ],
            "scaling": [
                {
                    "enemy_level": level,
                    "veteran_points": v,
                    "room_index": room,
                    "guardian": guardian,
                    "health": 100,
                    "power": 10,
                }
                for level in enemy
                for v in veteran
                for room in range(3)
                for guardian in (False, True)
            ],
            "reward_bands": copy.deepcopy(BANDS),
            "enemy_level_offsets": offsets,
            "trial_bag": ["Battle", "Waves", "Riddle"],
            "final_trial": "Guardian",
            "random_probes": [
                {
                    "seed": 0,
                    "player_level": 40,
                    "veteran_points": 0,
                    "guardian": False,
                    "reward": 1,
                    "enemy_level": 40,
                }
            ],
            "trial_probes": [{"seed": 0, "trials": ["Battle", "Riddle", "Guardian"]}],
        },
        "riddles": [
            {
                "id": "r0",
                "source_index": 0,
                "question": "What walks on four legs?",
                "choices": ["Man", "Wind", "Stone", "Fire"],
                "correct_answer_index": 0,
            }
        ],
        "rune_puzzles": [
            {
                "id": "p0",
                "source_id": 0,
                "title": "Borrowed Dawn",
                "clue": "The sun returns only when smoke reaches the heavens.",
                "rune_words": ["Flint", "Spark", "Smoke", "Dawn"],
                "solution_order": [0, 1, 2, 3],
            }
        ],
    }


def prepare(tmp_path, payload=None, roles=True):
    conn = database(tmp_path)
    conn.executescript(
        """
        INSERT INTO zones(id,zone_id,name) VALUES ('chambers_of_chaos',26,'Chambers of Chaos');
        INSERT INTO items(id,name,item_type) VALUES ('seal','Seal','general'),('token','Token','general');
        INSERT INTO monsters(id,name,level) VALUES ('skeleton','Skeleton',40),('orc','Orc',40);
        INSERT INTO progression_rules VALUES (1,50,200,1,1);
        """
    )
    conn.execute(
        "INSERT INTO npcs(id,name,roles) VALUES ('keeper','Keeper',?)",
        (json.dumps({"is_chambers_of_chaos_keeper": 1 if roles else 0}),),
    )
    data = payload or export()
    (tmp_path / "chambers_of_chaos.json").write_text(json.dumps(data))
    return conn


def load(conn, tmp_path):
    dataset = next(d for d in DATASETS if d.id == "chambers")
    load_dataset(LoadContext(conn, tmp_path, tmp_path / "curated"), dataset)


def full_export():
    data = export(max_level=50, max_veteran=200)
    return data


def test_valid_export_round_trips_without_spawns_or_bounds(tmp_path):
    conn = prepare(tmp_path, full_export())
    load(conn, tmp_path)
    assert conn.execute(
        "SELECT zone_id,keeper_npc_id,final_trial FROM chambers_definitions"
    ).fetchall() == [("chambers_of_chaos", "keeper", "Guardian")]
    assert conn.execute(
        "SELECT guards_monster_id,support_monster_id FROM chambers_encounter_groups ORDER BY ordinal"
    ).fetchall() == [("skeleton", "orc"), ("orc", None)]
    assert conn.execute("SELECT count(*) FROM chambers_pool_monsters").fetchone() == (
        2,
    )
    assert conn.execute("SELECT count(*) FROM monster_spawns").fetchone() == (0,)
    assert conn.execute("SELECT count(*) FROM chambers_scaling").fetchone() == (
        len(full_export()["rules"]["scaling"]),
    )
    # The excluded items are named only in the private staging.
    assert (
        conn.execute("SELECT payload FROM _acquisition_input_chambers")
        .fetchone()[0]
        .count("seal")
        >= 1
    )
    names = [row[1] for row in conn.execute("PRAGMA table_info(chambers_definitions)")]
    assert not any("seal" in n or "reward" in n for n in names)


def test_missing_file_fails_composition(tmp_path):
    conn = prepare(tmp_path)
    (tmp_path / "chambers_of_chaos.json").unlink()
    with pytest.raises(FileNotFoundError, match="chambers_of_chaos.json"):
        load(conn, tmp_path)
    assert conn.execute("SELECT count(*) FROM chambers_definitions").fetchone() == (0,)


@pytest.mark.parametrize(
    "change,message",
    [
        (lambda d: d["monster_pool"].append("ghost"), "pool monster 'ghost'"),
        (lambda d: d.update(keeper_npc_id="nobody"), "keeper 'nobody'"),
        (lambda d: d.update(seal_item_id="missing"), "item 'missing'"),
        (lambda d: d.update(zone_id="elsewhere"), "zone 'elsewhere'"),
        (
            lambda d: d["encounter_groups"][0].update(support_monster_id="ghost"),
            "encounter group g1 member 'ghost'",
        ),
        (lambda d: d["monster_pool"].remove("orc"), "outside the pool"),
        (lambda d: d["rules"]["scaling"].pop(), "scaling does not cover"),
        (
            lambda d: d["rules"]["player_levels"].pop(),
            "player_levels is not the declared domain",
        ),
        (
            lambda d: d["rules"]["seal_drop_chances"].pop(),
            "seal_drop_levels is not the declared domain",
        ),
        (
            lambda d: d["rules"]["reward_bands"][0].update(maximum_level=48),
            "0 reward bands cover level 49",
        ),
        (
            lambda d: d["rules"]["reward_bands"][1].update(maximum_veteran_points=100),
            "2 reward bands cover level 50 with 100 veteran points",
        ),
        (
            lambda d: d["rules"]["random_probes"][0].update(reward=9),
            "outside its reward band",
        ),
        (
            lambda d: d["rules"]["random_probes"][0].update(enemy_level=60),
            "not a game outcome",
        ),
        (lambda d: d["riddles"][0].update(correct_answer_index=9), "answer index"),
    ],
)
def test_bad_references_and_unsupported_inputs_fail_before_any_row(
    tmp_path, change, message
):
    data = full_export()
    change(data)
    conn = prepare(tmp_path, data)
    with pytest.raises(ValueError, match=message):
        load(conn, tmp_path)
    assert conn.execute("SELECT count(*) FROM chambers_definitions").fetchone() == (0,)
    assert conn.execute("SELECT count(*) FROM chambers_scaling").fetchone() == (0,)


def test_keeper_without_the_role_fails(tmp_path):
    conn = prepare(tmp_path, full_export(), roles=False)
    with pytest.raises(ValueError, match="lacks the Chambers keeper role"):
        load(conn, tmp_path)


def test_reward_bands_have_one_band_at_each_boundary(tmp_path):
    data = full_export()
    conn = prepare(tmp_path, data)
    load(conn, tmp_path)
    bands = conn.execute(
        "SELECT minimum_quantity,maximum_quantity FROM chambers_reward_bands ORDER BY ordinal"
    ).fetchall()
    assert bands == [(1, 2), (1, 3), (2, 4), (3, 5)]


# ---------------------------------------------------------------------------
# Native Seal of Chaos roll and the guardian provider
# ---------------------------------------------------------------------------


def staged_chambers():
    return {
        "id": "chambers_of_chaos",
        "seal_item_id": "seal",
        "reward_item_id": "token",
        "minimum_level": 40,
        "seal_drop_chances": [
            {"level": level, "chance": chance} for level, chance in CHANCES.items()
        ],
        "reward_bands": copy.deepcopy(BANDS),
    }


def spawn(identity, monster_id, level, **loot):
    return {
        "id": identity,
        "monster_id": monster_id,
        "level": level,
        "loot_zone_number": 0,
        "loot_respawn": True,
        "loot_exp_multiplier": 1.0,
        "loot_is_boss": False,
        "loot_is_elite": True,
        "loot_is_hunt": False,
        "loot_is_summoned_pet": False,
        "loot_drops": [],
        "loot_gold_min": 0,
        "loot_gold_max": 0,
        "loot_gold_probability": 0.0,
        **loot,
    }


def roll_state(tmp_path, spawns, monsters=None, chambers=True):
    conn = database(tmp_path)
    monsters = monsters or [monster("elite", level=40, is_elite=True)]
    build = normalizer(
        conn,
        items=[item("seal"), item("token")],
        monsters=monsters,
        monster_spawns=spawns,
        chambers=[staged_chambers()] if chambers else [],
    )
    for row in spawns:
        conn.execute(
            "INSERT INTO monster_spawns(id,monster_id,zone_id,level,position_x,position_y,position_z) "
            "VALUES (?,?,'zone',?,0,0,0)",
            (row["id"], row["monster_id"], row["level"]),
        )
    build.item_definitions()
    build.monsters_and_events()
    if chambers:
        conn.execute("INSERT INTO npcs(id,name,roles) VALUES ('keeper','Keeper','{}')")
        conn.execute(
            "INSERT INTO chambers_definitions VALUES ('chambers_of_chaos','zone','keeper',3,1200,40,3,20,30,2,3,'Guardian')"
        )
        build.chambers_run()
    rolls = dict(
        conn.execute(
            """SELECT p.monster_spawn_id,
                      d.code_roll_scaling||':'||coalesce(d.code_roll_level,'')||':'||coalesce(d.code_roll_chance,'')
               FROM acquisition_kill_details d
               JOIN acquisition_providers_monster_spawns p ON p.method_id=d.id
               WHERE d.code_roll_scaling IS NOT NULL"""
        ).fetchall()
    )
    return conn, build, rolls


@pytest.mark.parametrize(
    "level,chance",
    [(40, 0.01), (50, 0.050000004), (55, 0.1), (58, 0.1)],
)
def test_eligible_elites_roll_at_the_exported_chance(tmp_path, level, chance):
    conn, _, rolls = roll_state(tmp_path, [spawn("s", "elite", level)])
    assert rolls == {"s": f"fixed:{level}:{chance}"}
    assert conn.execute(
        "SELECT item_id,amount_min,amount_max,yield_rule,delivery FROM acquisition_outputs o "
        "JOIN acquisition_kill_details d ON d.id=o.method_id WHERE d.code_roll_scaling IS NOT NULL"
    ).fetchall() == [("seal", 1, 1, "fixed", "corpse")]


def test_a_level_below_40_has_no_roll(tmp_path):
    _, _, rolls = roll_state(tmp_path, [spawn("s", "elite", 39)])
    assert rolls == {}


def test_the_spawn_level_decides_not_the_template_level(tmp_path):
    spawns = [spawn("low", "elite", 33), spawn("high", "elite", 40)]
    conn, _, rolls = roll_state(tmp_path, spawns)
    assert set(rolls) == {"high"}
    # The level-33 spawn keeps its own method without the roll.
    assert conn.execute(
        "SELECT count(*) FROM acquisition_kill_details WHERE code_roll_scaling IS NULL"
    ).fetchone() == (1,)


@pytest.mark.parametrize(
    "loot",
    [{"loot_is_boss": True}, {"loot_is_elite": False}],
)
def test_bosses_and_ordinary_monsters_have_no_roll(tmp_path, loot):
    _, _, rolls = roll_state(tmp_path, [spawn("s", "elite", 55, **loot)])
    assert rolls == {}


def test_a_dummy_has_no_roll(tmp_path):
    dummy = monster("elite", level=50, is_elite=True, is_dummy=True)
    _, _, rolls = roll_state(tmp_path, [spawn("s", "elite", 50)], monsters=[dummy])
    assert rolls == {}


def test_without_a_chambers_definition_nothing_rolls(tmp_path):
    _, _, rolls = roll_state(tmp_path, [spawn("s", "elite", 55)], chambers=False)
    assert rolls == {}


def test_a_live_level_outside_the_exported_table_fails(tmp_path):
    with pytest.raises(
        ValueError, match="outside the exported entry item chance domain"
    ):
        roll_state(tmp_path, [spawn("s", "elite", 99)])


def test_summoned_elites_roll_like_any_elite(tmp_path):
    _, _, rolls = roll_state(
        tmp_path, [spawn("s", "elite", 55, loot_is_summoned_pet=True)]
    )
    assert rolls == {"s": "fixed:55:0.1"}


def test_the_guardian_is_a_provider_without_spawn_or_kill_context(tmp_path):
    conn, _, _ = roll_state(tmp_path, [])
    # Tower deaths take another branch, so no kill context exists for the run.
    assert conn.execute("SELECT count(*) FROM acquisition_kill_details").fetchone() == (
        0,
    )
    assert conn.execute(
        "SELECT count(*) FROM acquisition_providers_monster_spawns"
    ).fetchone() == (0,)
    methods = conn.execute(
        "SELECT kind,rule_id FROM acquisition_methods WHERE kind='chambers_guardian'"
    ).fetchall()
    assert methods == [("chambers_guardian", "chambers_guardian")]
    assert conn.execute(
        "SELECT chambers_id FROM acquisition_providers_chambers"
    ).fetchall() == [("chambers_of_chaos",)]


def test_guardian_reward_bands_and_a_single_entry_charge(tmp_path):
    conn, _, _ = roll_state(tmp_path, [])
    assert conn.execute(
        "SELECT condition_slot,item_id,amount_min,amount_max,delivery FROM acquisition_outputs "
        "ORDER BY condition_slot"
    ).fetchall() == [
        (0, "token", 1, 2, "corpse"),
        (1, "token", 1, 3, "corpse"),
        (2, "token", 2, 4, "corpse"),
        (3, "token", 3, 5, "corpse"),
    ]
    # The entry item is charged once, in its own phase, and never at looting.
    assert conn.execute(
        "SELECT g.phase,g.consumption_rule,i.item_id,i.amount FROM acquisition_cost_groups g "
        "JOIN acquisition_inputs i ON i.cost_group_id=g.id"
    ).fetchall() == [("entry", "before_roll", "seal", 1)]


# ---------------------------------------------------------------------------
# The private reward chain
# ---------------------------------------------------------------------------


def chain(tmp_path, vendor=True, spawn_level=50):
    conn = database(tmp_path)
    items = [
        item("seal"),
        item("token"),
        item("catalyst", item_type="augment_upgrade"),
        item(
            "epic",
            item_type="augment",
            quality=3,
            augment_is_defensive=True,
            augment_next_quality_id="legendary",
        ),
        item("legendary", item_type="augment", quality=4, augment_is_defensive=True),
    ]
    from compendium.models import NpcData  # noqa: F401  (shape reference)

    seller = {
        "item_id": "catalyst",
        "price": 10,
        "currency_item_id": "token",
    }
    npcs = [
        {
            "id": "quirin",
            "name": "Quirin",
            "quest_offers": [],
            "season": None,
            "items_sold": [seller] if vendor else [],
            "roles": {"is_merchant_adventurer": True},
        }
    ]
    from acquisition_fixtures import npc as make_npc

    npc_rows = [
        make_npc(
            "quirin",
            items_sold=npcs[0]["items_sold"],
            roles={"is_merchant_adventurer": True},
        )
    ]
    build = normalizer(
        conn,
        items=items,
        monsters=[
            monster("elite", level=spawn_level, is_elite=True),
            monster("dropper", level=10, drops=[{"item_id": "epic", "rate": 0.5}]),
        ],
        monster_spawns=[
            spawn("s", "elite", spawn_level),
            spawn(
                "d",
                "dropper",
                10,
                loot_is_elite=False,
                loot_drops=[{"item_id": "epic", "rate": 0.5}],
            ),
        ],
        npcs=npc_rows,
        chambers=[staged_chambers()],
    )
    conn.execute(
        "INSERT INTO monster_spawns(id,monster_id,zone_id,level,position_x,position_y,position_z) "
        "VALUES ('d','dropper','zone',10,0,0,0)"
    )
    conn.execute(
        "INSERT INTO monster_spawns(id,monster_id,zone_id,level,position_x,position_y,position_z) "
        "VALUES ('s','elite','zone',?,0,0,0)",
        (spawn_level,),
    )
    conn.execute(
        "INSERT INTO npc_spawns(id,npc_id,zone_id) VALUES ('q','quirin','zone')"
    )
    conn.execute(
        "INSERT INTO chambers_definitions VALUES ('chambers_of_chaos','zone','quirin',3,1200,40,3,20,30,2,3,'Guardian')"
    )
    build.item_definitions()
    build.vendors_and_services()
    build.monsters_and_events()
    build.chambers_run()
    return conn


def test_the_reward_chain_is_reachable_from_an_eligible_elite(tmp_path):
    conn = chain(tmp_path)
    verify_private_reachability(conn)
    # The check leaves the staged rows exactly as it found them.
    assert conn.execute(
        "SELECT count(*) FROM acquisition_outputs WHERE yield_rule='pool'"
    ).fetchone() == (0,)
    derive(conn)
    assert conn.execute(
        "SELECT m.rooted FROM acquisition_methods m JOIN acquisition_outputs o ON o.method_id=m.id "
        "WHERE m.kind='augment_upgrade' AND o.item_id='legendary'"
    ).fetchone() == (1,)


def test_a_missing_catalyst_offer_breaks_the_chain(tmp_path):
    conn = chain(tmp_path, vendor=False)
    with pytest.raises(
        ValueError, match="catalyst catalyst has no source outside the upgrades"
    ):
        verify_private_reachability(conn)


def test_without_an_eligible_elite_the_entry_item_has_no_source(tmp_path):
    conn = chain(tmp_path, spawn_level=39)
    with pytest.raises(ValueError, match="no eligible elite drops the entry item"):
        verify_private_reachability(conn)


def test_staging_family_is_registered():
    assert "chambers" in STAGING_FAMILIES
    assert stage  # the shared helper stays importable for staged inputs
