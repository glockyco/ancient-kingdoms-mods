import sqlite3

from compendium.denormalizers.experience.calculations import (
    get_alchemy_exp,
    get_crafting_exp,
    run,
)


def test_recipe_xp_includes_tier_one():
    assert [get_alchemy_exp(tier) for tier in range(5)] == [20, 300, 2000, 5000, 12000]
    assert [get_crafting_exp(tier) for tier in range(5)] == [15, 150, 750, 3500, 10000]


def test_gathering_xp_only_for_rewarding_resource_types():
    with sqlite3.connect(":memory:") as conn:
        conn.executescript("""
            CREATE TABLE monsters (id, level, health, is_boss, is_elite,
                                   no_aggro_monster, exp_multiplier, base_exp);
            CREATE TABLE zones (id, is_dungeon, discovery_exp);
            CREATE TABLE items (id, quality, is_quest_item, alchemy_exp,
                                recipe_potion_learned_id);
            CREATE TABLE crafting_recipes (id, result_item_id, crafting_exp);
            CREATE TABLE alchemy_recipes (id, level_required, result_item_id, alchemy_exp);
            CREATE TABLE gathering_resources (id, level, is_plant, is_mineral,
                is_radiant_spark, is_fishing_spot, item_reward_id, gathering_exp);
            INSERT INTO items (id, is_quest_item) VALUES ('quest_reward', 1), ('normal', 0);
            INSERT INTO gathering_resources VALUES
                ('plant', 0, 1, 0, 0, 0, 'normal', NULL),
                ('mineral', 1, 0, 1, 0, 0, 'normal', NULL),
                ('spark', 2, 0, 0, 1, 0, NULL, NULL),
                ('fish', 3, 0, 0, 0, 1, NULL, NULL),
                ('old_scroll', 0, 0, 0, 0, 0, 'normal', 15),
                ('ancient_remains', 0, 0, 0, 0, 0, NULL, 15),
                ('weathered_scroll', 0, 0, 0, 0, 0, 'normal', 15),
                ('quest_plant', 4, 1, 0, 0, 0, 'quest_reward', 10000);
        """)
        run(conn)
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
