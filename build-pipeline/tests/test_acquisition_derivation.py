"""Rooting and source hints follow actual delivery and complete cost branches."""

import json
from pathlib import Path

import pytest

from compendium.db import create_database
from compendium.denormalizers.acquisition import derive

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


@pytest.fixture
def conn(tmp_path):
    connection = create_database(tmp_path / "acquisition.db", SCHEMA_PATH)
    connection.executescript("""
        INSERT INTO zones (id, zone_id, name, level_median)
        VALUES ('town', 1, 'Town', 1), ('frontier', 2, 'Frontier', 30);
        INSERT INTO npcs (id, name, roles)
        VALUES ('merchant', 'Merchant', '{"is_merchant":true}');
        INSERT INTO npc_spawns (id, npc_id, zone_id)
        VALUES ('merchant_spawn', 'merchant', 'town');
    """)
    yield connection
    connection.close()


def item(conn, item_id):
    conn.execute(
        "INSERT INTO items (id, name, travel_zone_id) VALUES (?, ?, NULL)",
        (item_id, item_id),
    )


def method(conn, method_id, kind, rule_id=None):
    conn.execute(
        "INSERT INTO acquisition_methods (id, kind, rule_id, rooted) VALUES (?, ?, ?, 0)",
        (method_id, kind, rule_id or kind),
    )


def output(conn, method_id, item_id, *, delivery="inventory", ordinal=0):
    conn.execute(
        """INSERT INTO acquisition_outputs
        (id, method_id, ordinal, resource_kind, item_id, amount_min, amount_max,
         yield_rule, delivery, withheld)
        VALUES (?, ?, ?, 'item', ?, 1, 1, 'fixed', ?, 0)""",
        (f"{method_id}:output:{ordinal}", method_id, ordinal, item_id, delivery),
    )


def inputs(conn, method_id, item_ids):
    group_id = f"{method_id}:cost"
    conn.execute(
        """INSERT INTO acquisition_cost_groups
        (id, method_id, phase, quantity_rule, consumption_rule, selection_rule)
        VALUES (?, ?, 'use', 'fixed', 'on_success', 'always')""",
        (group_id, method_id),
    )
    for ordinal, item_id in enumerate(item_ids):
        conn.execute(
            """INSERT INTO acquisition_inputs
            (id, cost_group_id, ordinal, resource_kind, item_id, amount, withheld, role)
            VALUES (?, ?, ?, 'item', ?, 1, ?, 'component')""",
            (f"{group_id}:{ordinal}", group_id, ordinal, item_id, int(item_id is None)),
        )


def vendor(
    conn, method_id, offered, awarded=None, *, delivery="inventory", npc="merchant"
):
    method(conn, method_id, "vendor")
    conn.execute(
        """INSERT INTO acquisition_vendor_details (id, npc_id, offered_item_id, season)
        VALUES (?, ?, ?, 'none')""",
        (method_id, npc, offered),
    )
    conn.execute(
        """INSERT INTO acquisition_providers_npcs (id, method_id, npc_id, offer_index)
        VALUES (?, ?, ?, 0)""",
        (f"{method_id}:provider", method_id, npc),
    )
    output(conn, method_id, awarded or offered, delivery=delivery)


def transform(conn, method_id, initiating, awarded, *, costs=None):
    method(conn, method_id, "merge" if costs is not None else "pack_use")
    conn.execute(
        "INSERT INTO acquisition_item_details (id, item_id) VALUES (?, ?)",
        (method_id, initiating),
    )
    conn.execute(
        "INSERT INTO acquisition_providers_items (id, method_id, item_id) VALUES (?, ?, ?)",
        (f"{method_id}:provider", method_id, initiating),
    )
    inputs(conn, method_id, costs or [initiating])
    output(conn, method_id, awarded)


def state(conn, method_id):
    return conn.execute(
        "SELECT rooted, source_level_hint FROM acquisition_methods WHERE id = ?",
        (method_id,),
    ).fetchone()


def test_vendor_hints_use_the_vendor_zone_and_the_adventurer_cutoff(conn):
    for item_id in ("ordinary", "adventurer"):
        item(conn, item_id)
    conn.executescript("""
        INSERT INTO npcs (id, name, roles)
        VALUES ('frontier_merchant', 'Frontier Merchant', '{"is_merchant":true}');
        INSERT INTO npc_spawns (id, npc_id, zone_id)
        VALUES ('frontier_spawn', 'frontier_merchant', 'frontier');
    """)
    conn.execute(
        "INSERT INTO npcs (id, name, roles) VALUES ('adventurer_vendor', 'Adventurer Vendor', ?)",
        (json.dumps({"is_merchant_adventurer": True}),),
    )
    conn.execute(
        "INSERT INTO npc_spawns (id, npc_id, zone_id) VALUES ('adventurer_spawn', 'adventurer_vendor', 'town')"
    )
    vendor(conn, "ordinary_sale", "ordinary", npc="frontier_merchant")
    vendor(conn, "adventurer_sale", "adventurer", npc="adventurer_vendor")

    derive(conn)

    assert state(conn, "ordinary_sale") == (1, 30)
    assert state(conn, "adventurer_sale") == (1, 40)


def test_a_purchase_takes_the_level_of_the_token_it_costs(conn):
    for item_id in ("token", "armor"):
        item(conn, item_id)
    conn.execute(
        "INSERT INTO monsters (id, name, level) VALUES ('guardian', 'Guardian', 55)"
    )
    conn.execute(
        "INSERT INTO loot_pools (id, kind) VALUES ('guardian_pool', 'monster')"
    )
    method(conn, "guardian_kill", "kill", "monster_loot")
    conn.execute(
        """INSERT INTO acquisition_kill_details
        (id, monster_id, loot_pool_id, loot_zone_number, respawn, exp_multiplier, is_boss,
         is_elite, is_hunt, is_summoned_pet, event_kind, gold_min, gold_max, gold_probability)
        VALUES ('guardian_kill', 'guardian', 'guardian_pool', 1, 1, 1, 0, 0, 0, 0,
                'authored', 0, 0, 0)"""
    )
    conn.execute(
        "INSERT INTO monster_spawns (id, monster_id, zone_id, level) VALUES ('guardian_spawn', 'guardian', 'town', 55)"
    )
    conn.execute(
        """INSERT INTO acquisition_providers_monster_spawns (id, method_id, monster_spawn_id)
        VALUES ('guardian_kill:provider', 'guardian_kill', 'guardian_spawn')"""
    )
    output(conn, "guardian_kill", "token", delivery="corpse")
    vendor(conn, "token_sale", "armor")
    inputs(conn, "token_sale", ["token"])

    derive(conn)

    assert state(conn, "token_sale") == (1, 55)


def test_npc_definition_without_placement_does_not_root_sale(conn):
    item(conn, "unplaced_good")
    conn.execute("DELETE FROM npc_spawns")
    vendor(conn, "sale", "unplaced_good")

    derive(conn)

    assert state(conn, "sale")[0] == 0


def test_offer_inspection_is_not_carried_inventory_delivery(conn):
    for item_id in ("pack", "arrows", "opened_reward"):
        item(conn, item_id)
    vendor(conn, "pack_sale", "pack", "arrows")
    transform(conn, "carried_pack_use", "pack", "opened_reward")

    derive(conn)

    assert state(conn, "pack_sale") == (1, 1)
    assert state(conn, "carried_pack_use") == (0, None)


@pytest.mark.parametrize("delivery", ["keyring", "placed_structure", "quest_progress"])
def test_noninventory_delivery_cannot_start_carried_conversion(conn, delivery):
    for item_id in ("starter", "result"):
        item(conn, item_id)
    vendor(conn, "award", "starter", delivery=delivery)
    transform(conn, "conversion", "starter", "result")

    derive(conn)

    assert state(conn, "conversion") == (0, None)


def test_inventory_cycle_without_origin_stays_inspectable_but_unrooted(conn):
    for item_id in ("a", "b"):
        item(conn, item_id)
    transform(conn, "a_to_b", "a", "b")
    transform(conn, "b_to_a", "b", "a")

    derive(conn)

    assert state(conn, "a_to_b") == (0, None)
    assert state(conn, "b_to_a") == (0, None)
    assert (
        conn.execute("SELECT COUNT(*) FROM acquisition_item_details").fetchone()[0] == 2
    )


def test_reachable_chain_propagates_without_inventing_direct_locations(conn):
    for item_id in ("a", "b", "c"):
        item(conn, item_id)
    vendor(conn, "sale", "a")
    transform(conn, "a_to_b", "a", "b")
    transform(conn, "b_to_c", "b", "c")

    derive(conn)

    assert state(conn, "b_to_c") == (1, 1)
    assert (
        conn.execute(
            "SELECT COUNT(*) FROM acquisition_providers_npcs WHERE method_id = 'b_to_c'"
        ).fetchone()[0]
        == 0
    )


def test_withheld_cost_does_not_erase_root_but_blocks_complete_branch_hint(conn):
    for item_id in ("a", "result"):
        item(conn, item_id)
    vendor(conn, "sale", "a")
    transform(conn, "conversion", "a", "result", costs=["a", None])

    derive(conn)

    assert state(conn, "conversion") == (1, None)
    assert conn.execute(
        "SELECT amount, withheld FROM acquisition_inputs WHERE item_id IS NULL"
    ).fetchall() == [(1, 1)]


def test_complete_branch_uses_hardest_input_and_best_complete_alternative(conn):
    for item_id in ("easy", "hard", "result", "final"):
        item(conn, item_id)
    conn.execute(
        "INSERT INTO npcs (id, name, roles) VALUES ('adventurer_vendor', 'Adventurer Vendor', ?)",
        (json.dumps({"is_merchant_adventurer": True}),),
    )
    conn.execute(
        "INSERT INTO npc_spawns (id, npc_id, zone_id) VALUES ('adventurer_spawn', 'adventurer_vendor', 'town')"
    )
    vendor(conn, "easy_sale", "easy")
    vendor(conn, "hard_sale", "hard", npc="adventurer_vendor")
    transform(conn, "hard_branch", "easy", "result", costs=["easy", "hard"])
    transform(conn, "downstream", "result", "final")

    derive(conn)

    assert state(conn, "hard_branch") == (1, 40)
    assert state(conn, "downstream") == (1, 40)
    transform(conn, "easy_branch", "easy", "result")

    derive(conn)

    assert state(conn, "hard_branch") == (1, 40)
    assert state(conn, "easy_branch") == (1, 1)
    assert state(conn, "downstream") == (1, 1)


def test_home_capability_roots_recipe_without_turning_structure_into_carried_item(conn):
    for item_id in ("workbench", "crafted", "impossible_opening"):
        item(conn, item_id)
    method(conn, "catalog", "housing")
    conn.execute(
        "INSERT INTO acquisition_housing_details (id, structure_item_id) VALUES ('catalog', 'workbench')"
    )
    conn.execute(
        "INSERT INTO acquisition_global_roots (id, method_id, origin) VALUES ('catalog_root', 'catalog', 'housing')"
    )
    output(conn, "catalog", "workbench", delivery="placed_structure")
    conn.execute(
        "INSERT INTO crafting_recipes (id, result_item_id) VALUES ('route', 'crafted')"
    )
    method(conn, "home_recipe", "recipe", "crafting")
    conn.execute(
        """INSERT INTO acquisition_recipe_details
        (id, crafting_recipe_id, declared_result_item_id, result_amount, tier, display_kind)
        VALUES ('home_recipe', 'route', 'crafted', 1, 0, 'crafting')"""
    )
    conn.execute(
        """INSERT INTO acquisition_home_providers
        (id, method_id, structure_item_id, component_path, offer_index)
        VALUES ('home_provider', 'home_recipe', 'workbench', '0:0', 0)"""
    )
    output(conn, "home_recipe", "crafted")
    transform(conn, "carried_structure_use", "workbench", "impossible_opening")

    derive(conn)

    assert state(conn, "home_recipe") == (1, 1)
    assert state(conn, "carried_structure_use") == (0, None)
    assert (
        conn.execute(
            "SELECT COUNT(*) FROM acquisition_providers_crafting_stations WHERE method_id = 'home_recipe'"
        ).fetchone()[0]
        == 0
    )


@pytest.mark.parametrize(
    ("altar_type", "gate", "expected"),
    [("avatar", 0, 58), ("forgotten", 30, 30)],
)
def test_altar_kill_hint_uses_authored_wave_level_only_for_avatar_altars(
    conn, altar_type, gate, expected
):
    waves = [
        {"wave_number": 0, "monsters": [{"monster_id": "add", "base_level": 53}]},
        {"wave_number": 2, "monsters": [{"monster_id": "boss", "base_level": 58}]},
    ]
    item(conn, "boss_loot")
    conn.execute("INSERT INTO monsters (id, name, level) VALUES ('boss', 'Boss', 1)")
    conn.execute(
        """INSERT INTO altars (id, name, type, min_level_required, waves)
        VALUES ('altar', 'Altar', ?, ?, ?)""",
        (altar_type, gate, json.dumps(waves)),
    )
    conn.execute("INSERT INTO loot_pools (id, kind) VALUES ('boss_pool', 'monster')")
    method(conn, "boss_kill", "kill", "altar_final_loot")
    conn.execute(
        """INSERT INTO acquisition_kill_details
        (id, monster_id, loot_pool_id, loot_zone_number, respawn, exp_multiplier, is_boss,
         is_elite, is_hunt, is_summoned_pet, altar_id, wave_number, wave_member_index,
         event_kind, gold_min, gold_max, gold_probability)
        VALUES ('boss_kill', 'boss', 'boss_pool', 0, 0, 1, 1, 0, 0, 0, 'altar', 2, 0,
                'altar_final', 0, 0, 0)"""
    )
    conn.execute(
        """INSERT INTO acquisition_providers_altars (id, method_id, altar_id)
        VALUES ('boss_kill:provider', 'boss_kill', 'altar')"""
    )
    output(conn, "boss_kill", "boss_loot", delivery="corpse")

    derive(conn)

    assert state(conn, "boss_kill") == (1, expected)


def test_quest_reward_takes_the_recommended_level_not_the_acceptance_gate(conn):
    item(conn, "roast")
    conn.execute(
        """INSERT INTO quests (id, name, quest_type, level_required, level_recommended)
        VALUES ('bison_hunt', 'Bison Hunt', 'kill', 15, 40)"""
    )
    method(conn, "hunt_reward", "quest_complete")
    conn.execute(
        "INSERT INTO acquisition_quest_details (id, quest_id, phase) VALUES ('hunt_reward', 'bison_hunt', 'complete')"
    )
    conn.execute(
        """INSERT INTO acquisition_providers_npcs (id, method_id, npc_id, offer_index)
        VALUES ('hunt_reward:provider', 'hunt_reward', 'merchant', 0)"""
    )
    output(conn, "hunt_reward", "roast")

    derive(conn)

    assert state(conn, "hunt_reward") == (1, 40)
