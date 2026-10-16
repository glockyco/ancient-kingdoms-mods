"""Readers reject incomplete or altered promoted sessions."""

import json
from pathlib import Path

import pytest
from session_fixtures import SESSION_ID, write_session

from compendium.session import (
    PUBLISHED_LOCALE,
    WrongExportSession,
    resolve_export_session,
)


def test_verified_session_returns_its_directory(tmp_path: Path):
    session_dir = write_session(
        tmp_path, {"data.json": b"[]", "images/icon.png": b"image"}
    )
    (tmp_path / "screenshots").mkdir()
    (tmp_path / "screenshots" / "unrelated.png").write_bytes(b"outside session")
    assert resolve_export_session(tmp_path) == session_dir


def test_missing_pointer_fails_by_name(tmp_path: Path):
    with pytest.raises(WrongExportSession, match="active-session.json"):
        resolve_export_session(tmp_path)


def test_missing_session_fails_by_name(tmp_path: Path):
    session_dir = write_session(tmp_path)
    (session_dir / "manifest.json").unlink()
    session_dir.rmdir()
    with pytest.raises(WrongExportSession, match=SESSION_ID):
        resolve_export_session(tmp_path)


def test_manifest_that_does_not_parse_fails_by_name(tmp_path: Path):
    session_dir = write_session(tmp_path)
    (session_dir / "manifest.json").write_text("{", encoding="utf-8")
    with pytest.raises(WrongExportSession, match="manifest.json"):
        resolve_export_session(tmp_path)


@pytest.mark.parametrize("change", ["missing", "digest", "size", "unlisted"])
def test_file_integrity_failure_names_file(tmp_path: Path, change: str):
    session_dir = write_session(tmp_path, {"data.json": b"[]"})
    path = session_dir / "data.json"
    if change == "missing":
        path.unlink()
    elif change == "digest":
        path.write_bytes(b"{}")
    elif change == "size":
        manifest_path = session_dir / "manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["files"][0]["bytes"] += 1
        manifest_path.write_text(json.dumps(manifest))
    else:
        path = session_dir / "unlisted.json"
        path.write_bytes(b"[]")
    with pytest.raises(WrongExportSession, match=path.name):
        resolve_export_session(tmp_path)


def test_wrong_locale_names_both_locales(tmp_path: Path):
    session_dir = write_session(tmp_path)
    path = session_dir / "manifest.json"
    manifest = json.loads(path.read_text())
    manifest["locale"] = "ja"
    path.write_text(json.dumps(manifest))
    with pytest.raises(WrongExportSession) as refused:
        resolve_export_session(tmp_path)
    assert "'ja'" in str(refused.value)
    assert repr(PUBLISHED_LOCALE) in str(refused.value)


@pytest.mark.parametrize("version", [2, True, "1", None])
def test_wrong_schema_version_names_value(tmp_path: Path, version: object):
    session_dir = write_session(tmp_path)
    path = session_dir / "manifest.json"
    manifest = json.loads(path.read_text())
    manifest["schema_version"] = version
    path.write_text(json.dumps(manifest))
    with pytest.raises(WrongExportSession) as refused:
        resolve_export_session(tmp_path)
    assert "schema_version" in str(refused.value)
    assert repr(version) in str(refused.value)


@pytest.mark.parametrize(
    "name", ["../outside.json", "/outside.json", "images/../x", "x\\y", "manifest.json"]
)
def test_unsafe_manifest_path_fails_by_name(tmp_path: Path, name: str):
    session_dir = write_session(tmp_path)
    path = session_dir / "manifest.json"
    manifest = json.loads(path.read_text())
    manifest["files"] = [{"path": name}]
    path.write_text(json.dumps(manifest))
    with pytest.raises(WrongExportSession) as refused:
        resolve_export_session(tmp_path)
    assert repr(name) in str(refused.value)


def test_duplicate_manifest_path_fails_by_name(tmp_path: Path):
    session_dir = write_session(tmp_path, {"data.json": b"[]"})
    path = session_dir / "manifest.json"
    manifest = json.loads(path.read_text())
    manifest["files"].append(manifest["files"][0])
    path.write_text(json.dumps(manifest))
    with pytest.raises(WrongExportSession, match="duplicate.*data.json"):
        resolve_export_session(tmp_path)


@pytest.mark.parametrize("name", ["classes.json", "static_data.json"])
def test_curated_input_is_not_a_runtime_file(tmp_path: Path, name: str):
    write_session(tmp_path, {name: b"[]"})
    with pytest.raises(WrongExportSession, match=name):
        resolve_export_session(tmp_path)


def test_pointer_cannot_select_a_different_directory(tmp_path: Path):
    write_session(tmp_path)
    (tmp_path / "active-session.json").write_text(
        json.dumps({"session_id": SESSION_ID, "path": "staging/other"})
    )
    with pytest.raises(WrongExportSession, match="staging/other"):
        resolve_export_session(tmp_path)


def test_symlink_cannot_supply_a_session_file(tmp_path: Path):
    session_dir = write_session(tmp_path, {"data.json": b"[]"})
    outside = tmp_path / "outside.json"
    outside.write_bytes(b"[]")
    (session_dir / "data.json").unlink()
    (session_dir / "data.json").symlink_to(outside)
    with pytest.raises(WrongExportSession, match="data.json"):
        resolve_export_session(tmp_path)
