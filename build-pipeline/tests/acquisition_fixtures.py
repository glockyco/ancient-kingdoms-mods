"""Small native-shaped inputs for canonical acquisition outcome tests."""

import json
import sqlite3
from pathlib import Path
from typing import Any

from compendium.db import create_database
from compendium.denormalizers.acquisition import STAGING_FAMILIES, _Normalizer
from compendium.models import ItemData, MonsterData, NpcData, QuestData

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


def database(tmp_path: Path) -> sqlite3.Connection:
    conn = create_database(tmp_path / "acquisition.db", SCHEMA_PATH)
    conn.execute("INSERT INTO zones(id,zone_id,name) VALUES('unknown',0,'Unknown')")
    conn.execute(
        "INSERT INTO zones(id,zone_id,name,is_dungeon,level_median) VALUES ('zone',1,'Zone',1,10)"
    )
    return conn


def item(identity: str, **fields) -> dict:
    return ItemData.model_validate(
        {
            "id": identity,
            "name": identity,
            "item_type": "general",
            "quality": 0,
            "item_level": 0,
            "primal_essence_value": None,
            **fields,
        }
    ).model_dump()


def monster(identity: str, **fields) -> dict:
    return MonsterData.model_validate(
        {
            "id": identity,
            "name": identity,
            "level": 10,
            "health": 100,
            "type_name": "Monster",
            "class_name": "Warrior",
            "loot_zone_number": 1,
            "is_summoned_pet": False,
            **fields,
        }
    ).model_dump()


def npc(identity: str, **fields) -> dict:
    return NpcData.model_validate(
        {"id": identity, "name": identity, "quest_offers": [], **fields}
    ).model_dump()


def quest(identity: str, **fields) -> dict:
    return QuestData.model_validate(
        {"id": identity, "name": identity, "quest_type": "general", **fields}
    ).model_dump()


def inputs(**families) -> dict:
    result: dict[str, list[dict[str, Any]]] = {
        family: [] for family in STAGING_FAMILIES
    }
    result["game_config"] = [
        {
            "special_items": {
                "max_level_reward": "cap_reward",
                "blessed_rune": "blessed",
                "primal_essence": "essence",
            },
            "seasonal_items": {"halloween": [], "christmas": []},
            "lockpicks_item_id": "lockpicks",
            "housing_catalog": [],
            "journal_fish_item_ids": [],
            "trash_fish_item_ids": [],
        }
    ]
    result.update(families)
    return result


def normalizer(conn: sqlite3.Connection, **families) -> _Normalizer:
    data = inputs(**families)
    for row in data["items"]:
        conn.execute(
            "INSERT INTO items(id,name,item_type,quality,is_key,has_gather_quest,is_quest_item) VALUES(?,?,?,?,?,?,?)",
            (
                row["id"],
                row["name"],
                row["item_type"],
                row["quality"],
                row["is_key"],
                row["has_gather_quest"],
                row["is_quest_item"],
            ),
        )
    for row in data["monsters"]:
        conn.execute(
            "INSERT INTO monsters(id,name,level) VALUES(?,?,?)",
            (row["id"], row["name"], row["level"]),
        )
    for row in data["npcs"]:
        conn.execute(
            "INSERT INTO npcs(id,name,roles) VALUES(?,?,?)",
            (row["id"], row["name"], json.dumps(row["roles"])),
        )
    for row in data["quests"]:
        conn.execute(
            "INSERT INTO quests(id,name,quest_type) VALUES(?,?,?)",
            (row["id"], row["name"], row["quest_type"]),
        )
    return _Normalizer(conn, data)


def stage(conn: sqlite3.Connection, data: dict) -> None:
    for family, rows in data.items():
        for index, row in enumerate(rows):
            identity = row.get("definition_key", row.get("id", str(index)))
            conn.execute(
                f'INSERT INTO "_acquisition_input_{family}"(id,payload) VALUES(?,?)',
                (identity, json.dumps(row)),
            )
