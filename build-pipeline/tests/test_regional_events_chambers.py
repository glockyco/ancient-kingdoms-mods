import sqlite3
from pathlib import Path

from compendium.loaders.core import _load_regional_event_regions
from compendium.models import RegionalEventRegionData

SCHEMA = (Path(__file__).parent.parent / "schema.sql").read_text()


def _create(table: str) -> str:
    start = SCHEMA.index(f"CREATE TABLE {table} (")
    return SCHEMA[start : SCHEMA.index(");", start) + 2]


def test_tower_zone_is_not_a_prosperity_dungeon() -> None:
    conn = sqlite3.connect(":memory:")
    for table in (
        "regional_event_regions",
        "regional_event_cooking_meats",
        "regional_event_cooking_dishes",
        "regional_event_hunt_targets",
        "regional_event_dungeons",
    ):
        conn.execute(_create(table))
    conn.execute("CREATE TABLE items (id TEXT)")
    conn.execute("CREATE TABLE zones (id TEXT)")
    conn.execute("CREATE TABLE chambers_definitions (zone_id TEXT)")
    conn.executemany(
        "INSERT INTO zones VALUES (?)",
        [("crescent_coast",), ("old_mine",), ("chambers_of_chaos",)],
    )
    conn.execute("INSERT INTO chambers_definitions VALUES ('chambers_of_chaos')")
    region = RegionalEventRegionData(
        zone_id="crescent_coast",
        fishing=False,
        cooking_meat_ids=[],
        cooking_dish_ids=[],
        hunt_targets=[],
        dungeon_zone_ids=["chambers_of_chaos", "old_mine"],
    )

    _load_regional_event_regions(conn.cursor(), [region], set())

    assert conn.execute(
        "SELECT dungeon_zone_id FROM regional_event_dungeons"
    ).fetchall() == [("old_mine",)]
