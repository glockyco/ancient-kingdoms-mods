"""Zone level statistics describe year-round play."""

from pathlib import Path

import pytest

from compendium.db import create_database
from compendium.denormalizers.zones import levels

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


@pytest.fixture
def conn(tmp_path):
    connection = create_database(tmp_path / "zones.db", SCHEMA_PATH)
    connection.executescript("""
        INSERT INTO skills (id, name, skill_type)
        VALUES ('halloween_event', 'Halloween Event', 'target_buff');
        INSERT INTO seasons (id, ordinal, buff_skill_id)
        VALUES ('halloween', 0, 'halloween_event');
        INSERT INTO zones (id, zone_id, name)
        VALUES ('lands', 1, 'Lands'), ('haunt', 2, 'Haunt');
        INSERT INTO monsters (id, name, level, type_name, season) VALUES
            ('wolf', 'Wolf', 10, 'Beast', NULL),
            ('pumpkin', 'Pumpkin', 50, 'Undead', 'halloween');
    """)
    yield connection
    connection.close()


def spawn(conn, spawn_id, monster_id, zone_id, level):
    conn.execute(
        "INSERT INTO monster_spawns (id, monster_id, zone_id, level) VALUES (?,?,?,?)",
        (spawn_id, monster_id, zone_id, level),
    )


def zone_levels(conn, zone_id):
    return conn.execute(
        "SELECT level_min, level_max, level_median FROM zones WHERE id = ?",
        (zone_id,),
    ).fetchone()


def test_seasonal_spawns_do_not_move_a_zones_levels(conn):
    for ordinal, level in enumerate((10, 20, 30, 40)):
        spawn(conn, f"wolf_{ordinal}", "wolf", "lands", level)
    for ordinal in range(4):
        spawn(conn, f"pumpkin_{ordinal}", "pumpkin", "lands", 50 + ordinal)
    levels.run(conn)
    assert zone_levels(conn, "lands") == (10, 40, 25)


def test_a_zone_with_only_seasonal_spawns_has_no_year_round_levels(conn):
    spawn(conn, "pumpkin_haunt", "pumpkin", "haunt", 50)
    levels.run(conn)
    assert zone_levels(conn, "haunt") == (None, None, None)


def test_an_odd_number_of_spawns_takes_the_middle_level(conn):
    for ordinal, level in enumerate((10, 20, 60)):
        spawn(conn, f"wolf_{ordinal}", "wolf", "lands", level)
    levels.run(conn)
    assert zone_levels(conn, "lands") == (10, 60, 20)
