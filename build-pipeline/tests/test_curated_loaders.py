"""Curated composition uses separate required inputs and matching identities."""

import json
from pathlib import Path

import pytest

from compendium.db import create_database
from compendium.loaders.core import load_classes, load_static_data

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


def _inputs(tmp_path: Path) -> tuple[Path, Path, list[dict], list[dict]]:
    session_dir = tmp_path / "session"
    curated_dir = tmp_path / "curated"
    session_dir.mkdir()
    curated_dir.mkdir()
    classes = [
        {
            "id": f"class_{index}",
            "name": f"Class {index}",
            "description": "Description",
            "primary_role": "Tank",
            "difficulty": 1,
            "resource_type": "energy",
            "compatible_races": ["human"],
        }
        for index in range(6)
    ]
    combat = [
        {"id": entry["id"], "base_health_value": 25, "resource_type": "mana"}
        for entry in classes
    ]
    (curated_dir / "classes.json").write_text(json.dumps(classes))
    (session_dir / "classes_combat.json").write_text(json.dumps(combat))
    return session_dir, curated_dir, classes, combat


def test_classes_merge_curated_metadata_with_session_combat(tmp_path: Path):
    session_dir, curated_dir, _, _ = _inputs(tmp_path)
    (session_dir / "classes.json").write_text("invalid flat copy")
    (curated_dir / "classes_combat.json").write_text("invalid curated combat")
    conn = create_database(tmp_path / "test.db", SCHEMA_PATH)
    try:
        load_classes(conn, session_dir, curated_dir)
        assert conn.execute(
            "SELECT name, base_health_value, resource_type FROM classes ORDER BY id"
        ).fetchall() == [(f"Class {index}", 25, "mana") for index in range(6)]
    finally:
        conn.close()


@pytest.mark.parametrize(
    "change", ["missing", "extra", "duplicate", "curated_duplicate"]
)
def test_class_identity_mismatch_fails_before_inserting(tmp_path: Path, change: str):
    session_dir, curated_dir, classes, combat = _inputs(tmp_path)
    if change == "missing":
        combat.pop()
    elif change == "extra":
        combat.append({"id": "unexpected"})
    elif change == "duplicate":
        combat.append(combat[0])
    else:
        classes.append(classes[0])
    (curated_dir / "classes.json").write_text(json.dumps(classes))
    (session_dir / "classes_combat.json").write_text(json.dumps(combat))
    conn = create_database(tmp_path / "test.db", SCHEMA_PATH)
    try:
        with pytest.raises(ValueError, match="classes.*json.*class ids"):
            load_classes(conn, session_dir, curated_dir)
        assert conn.execute("SELECT count(*) FROM classes").fetchone() == (0,)
    finally:
        conn.close()


@pytest.mark.parametrize("races", [[], [""], ["human", "human"]])
def test_invalid_curated_race_structure_fails(tmp_path: Path, races: list[str]):
    session_dir, curated_dir, classes, _ = _inputs(tmp_path)
    classes[0]["compatible_races"] = races
    (curated_dir / "classes.json").write_text(json.dumps(classes))
    conn = create_database(tmp_path / "test.db", SCHEMA_PATH)
    try:
        with pytest.raises(ValueError, match="classes.json.*class_0.*compatible_races"):
            load_classes(conn, session_dir, curated_dir)
        assert conn.execute("SELECT count(*) FROM classes").fetchone() == (0,)
    finally:
        conn.close()


@pytest.mark.parametrize("name", ["classes.json", "static_data.json"])
def test_missing_curated_file_fails_by_name(tmp_path: Path, name: str):
    session_dir, curated_dir, _, _ = _inputs(tmp_path)
    (curated_dir / "classes.json").unlink()
    conn = create_database(tmp_path / "test.db", SCHEMA_PATH)
    try:
        with pytest.raises(FileNotFoundError, match=f"curated/{name}"):
            if name == "classes.json":
                load_classes(conn, session_dir, curated_dir)
            else:
                load_static_data(conn, curated_dir)
    finally:
        conn.close()


def test_static_data_comes_only_from_curated_input(tmp_path: Path):
    curated_dir = tmp_path / "curated"
    curated_dir.mkdir()
    (curated_dir / "static_data.json").write_text(
        json.dumps({"factions": {"list": [{"id": "curated", "name": "Curated"}]}})
    )
    conn = create_database(tmp_path / "test.db", SCHEMA_PATH)
    try:
        load_static_data(conn, curated_dir)
        assert conn.execute("SELECT id, name FROM factions").fetchall() == [
            ("curated", "Curated")
        ]
    finally:
        conn.close()
