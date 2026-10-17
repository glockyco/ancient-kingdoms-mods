import json
import sqlite3
from pathlib import Path

import pytest

from compendium.db import create_database
from compendium.loaders import DATASETS, LoadContext, load_dataset

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"
FIXTURE_PATH = Path(__file__).parent / "fixtures" / "stats.json"
STAT_DATASET = next(dataset for dataset in DATASETS if dataset.id == "stats")


@pytest.fixture
def catalog():
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


@pytest.fixture
def exports(tmp_path):
    data = {
        "items.json": [{"stats": {"health_bonus": 25, "max_durability": 100}}],
        "skills.json": [
            {
                "tier": 1,
                "health_percent_per_second_bonus": {
                    "base_value": 0.01,
                    "bonus_per_level": 0.005,
                },
            }
        ],
        "classes_combat.json": [{"base_health_value": 100}],
        "pets.json": [{"health_per_level": 5, "level": 1}],
    }
    for filename, entries in data.items():
        (tmp_path / filename).write_text(json.dumps(entries), encoding="utf-8")
    return tmp_path


@pytest.fixture
def conn(tmp_path):
    database = create_database(tmp_path / "stats.db", SCHEMA_PATH)
    try:
        yield database
    finally:
        database.close()


def _load(conn, exports, catalog):
    (exports / "stats.json").write_text(json.dumps(catalog), encoding="utf-8")
    load_dataset(LoadContext(conn, exports, exports / "curated"), STAT_DATASET)


def test_load_stat_catalogue_preserves_names_order_rules_and_fields(
    conn, exports, catalog
):
    _load(conn, exports, catalog)
    assert conn.execute(
        "SELECT id, sort_order, name, item_name, pool_id FROM stats ORDER BY sort_order"
    ).fetchall() == [
        ("health_regen", 0, "Health Regeneration", "Health Regen", "health"),
        ("health", 1, "Hit Points", "Hit Points", None),
        ("constitution", 2, "Constitution", "Constitution", None),
    ]
    minimum, maximum, terms = conn.execute(
        "SELECT min_value, max_value, per_point_of FROM stats WHERE id = 'health'"
    ).fetchone()
    assert minimum == 1
    assert maximum is None
    assert json.loads(terms) == [{"stat_id": "constitution", "amount": 10}]
    assert conn.execute(
        "SELECT source, field, stat_id, modifier, curve FROM stat_fields "
        "ORDER BY source, field"
    ).fetchall() == [
        ("class", "base_health_value", "health", "flat", "base"),
        ("item", "constitution", "constitution", "flat", None),
        ("item", "health_bonus", "health", "flat", None),
        ("pet", "health_per_level", "health", "flat", "per_level"),
        (
            "skill",
            "health_percent_per_second_bonus",
            "health_regen",
            "percent_of_max_per_second",
            None,
        ),
    ]


def test_duplicate_field_in_different_stats_fails(conn, exports, catalog):
    catalog["stats"][2]["fields"].append(catalog["stats"][1]["fields"][0])
    with pytest.raises(ValueError, match=r"Duplicate stat field item\.health_bonus"):
        _load(conn, exports, catalog)
    assert conn.execute("SELECT COUNT(*) FROM stats").fetchone()[0] == 0


def test_unknown_per_point_stat_fails(conn, exports, catalog):
    catalog["stats"][1]["per_point_of"][0]["stat_id"] = "unknown_stat"
    with pytest.raises(ValueError, match="health per_point_of.*unknown_stat"):
        _load(conn, exports, catalog)


def test_unknown_pool_stat_fails(conn, exports, catalog):
    catalog["stats"][0]["pool_id"] = "unknown_pool"
    with pytest.raises(ValueError, match="health_regen pool_id.*unknown_pool"):
        _load(conn, exports, catalog)


def test_a_field_cannot_be_mapped_and_non_stat(conn, exports, catalog):
    catalog["non_stat_fields"].append(
        {"source": "item", "field": "health_bonus", "reason": "Not a stat"}
    )
    with pytest.raises(
        ValueError, match=r"item\.health_bonus.*both mapped and non-stat"
    ):
        _load(conn, exports, catalog)


def test_a_field_cannot_reference_an_unknown_stat(conn, exports, catalog):
    _load(conn, exports, catalog)
    with pytest.raises(sqlite3.IntegrityError, match="FOREIGN KEY"):
        conn.execute(
            "INSERT INTO stat_fields (source, field, stat_id, modifier, curve) "
            "VALUES ('item', 'unknown_bonus', 'unknown_stat', 'flat', NULL)"
        )


@pytest.mark.parametrize(
    ("source", "filename"),
    [
        ("item", "items.json"),
        ("skill", "skills.json"),
        ("class", "classes_combat.json"),
        ("pet", "pets.json"),
    ],
)
@pytest.mark.parametrize(
    "value", [0, -3, 0.125, {"base_value": 0, "bonus_per_level": 1.5}]
)
def test_unmapped_numeric_export_field_fails(
    conn, exports, catalog, source, filename, value
):
    entry = {"new_bonus": value}
    entries = [{"stats": entry}] if source == "item" else [entry]
    (exports / filename).write_text(json.dumps(entries), encoding="utf-8")
    with pytest.raises(ValueError, match=rf"{source}\.new_bonus"):
        _load(conn, exports, catalog)
    assert conn.execute("SELECT COUNT(*) FROM stats").fetchone()[0] == 0


def test_non_numeric_values_do_not_require_a_mapping(conn, exports, catalog):
    (exports / "pets.json").write_text(
        json.dumps(
            [
                {
                    "is_familiar": True,
                    "nullable_bonus": None,
                    "name": "Pet",
                    "skills": ["claw"],
                    "metadata": {"owner": "player"},
                }
            ]
        ),
        encoding="utf-8",
    )
    _load(conn, exports, catalog)
    assert conn.execute("SELECT COUNT(*) FROM stats").fetchone()[0] == 3


def test_duplicate_non_stat_field_fails(conn, exports, catalog):
    catalog["non_stat_fields"].append(catalog["non_stat_fields"][0])
    with pytest.raises(
        ValueError, match=r"Duplicate non-stat field item\.max_durability"
    ):
        _load(conn, exports, catalog)


def test_duplicate_stat_id_fails(conn, exports, catalog):
    catalog["stats"].append(catalog["stats"][0])
    with pytest.raises(ValueError, match="duplicate stat ids"):
        _load(conn, exports, catalog)


@pytest.mark.parametrize("item", [{"id": "non_equipment"}, {"stats": None}])
def test_items_without_stats_have_no_numeric_item_fields(conn, exports, catalog, item):
    (exports / "items.json").write_text(json.dumps([item]), encoding="utf-8")
    _load(conn, exports, catalog)
    assert conn.execute("SELECT COUNT(*) FROM stats").fetchone()[0] == 3
