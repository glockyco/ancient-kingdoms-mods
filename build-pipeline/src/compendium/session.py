"""Select and verify one immutable runtime export session."""

import hashlib
import json
import re
from pathlib import Path, PurePosixPath
from typing import Any

MANIFEST_NAME = "manifest.json"
POINTER_NAME = "active-session.json"
PUBLISHED_LOCALE = "en"
_SESSION_ID = re.compile(r"\d{8}T\d{6}Z-[0-9a-f]{8}")
_DIGEST = re.compile(r"[0-9a-f]{64}")


class WrongExportSession(Exception):
    """The selected session cannot supply the published runtime data."""


def _read_object(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise WrongExportSession(f"Cannot read {path}: {error}") from error
    if not isinstance(value, dict):
        raise WrongExportSession(f"{path} must hold a JSON object, found {value!r}")
    return value


def resolve_export_session(export_root: Path) -> Path:
    """Resolve the active pointer and verify every file before returning its path."""
    pointer_path = export_root / POINTER_NAME
    pointer = _read_object(pointer_path)
    session_id = pointer.get("session_id")
    if not isinstance(session_id, str) or not _SESSION_ID.fullmatch(session_id):
        raise WrongExportSession(f"{pointer_path}: invalid session_id {session_id!r}")
    expected_path = f"sessions/{session_id}"
    if pointer.get("path") != expected_path:
        raise WrongExportSession(
            f"{pointer_path}: path {pointer.get('path')!r} must be {expected_path!r}"
        )
    session_dir = export_root / expected_path
    if (
        not session_dir.is_dir()
        or session_dir.is_symlink()
        or (export_root / "sessions").is_symlink()
    ):
        raise WrongExportSession(
            f"Session directory is missing or invalid: {session_dir}"
        )
    manifest_path = session_dir / MANIFEST_NAME
    manifest = _read_object(manifest_path)
    if (
        type(manifest.get("schema_version")) is not int
        or manifest["schema_version"] != 1
    ):
        raise WrongExportSession(
            f"{manifest_path}: schema_version {manifest.get('schema_version')!r}, expected 1"
        )
    if manifest.get("session_id") != session_id:
        raise WrongExportSession(
            f"{manifest_path}: session_id {manifest.get('session_id')!r}, expected {session_id!r}"
        )
    if manifest.get("locale") != PUBLISHED_LOCALE:
        raise WrongExportSession(
            f"{manifest_path}: locale {manifest.get('locale')!r}, expected {PUBLISHED_LOCALE!r}"
        )
    files = manifest.get("files")
    if not isinstance(files, list):
        raise WrongExportSession(
            f"{manifest_path}: files must be an array, found {files!r}"
        )
    listed: set[str] = set()
    for entry in files:
        if not isinstance(entry, dict):
            raise WrongExportSession(f"{manifest_path}: invalid file entry {entry!r}")
        name = entry.get("path")
        if (
            not isinstance(name, str)
            or not name
            or "\\" in name
            or PurePosixPath(name).is_absolute()
            or any(part in ("", ".", "..") for part in name.split("/"))
            or name == MANIFEST_NAME
        ):
            raise WrongExportSession(f"{manifest_path}: invalid file path {name!r}")
        if name in listed:
            raise WrongExportSession(f"{manifest_path}: duplicate file path {name!r}")
        if name in {"classes.json", "static_data.json"}:
            raise WrongExportSession(
                f"{manifest_path}: curated input {name} is not runtime data"
            )
        listed.add(name)
        path = session_dir / name
        if not path.is_file() or any(
            (session_dir / parent).is_symlink()
            for parent in (PurePosixPath(name), *PurePosixPath(name).parents)
        ):
            raise WrongExportSession(f"Session file is missing or invalid: {path}")
        size = entry.get("bytes")
        if type(size) is not int or size < 0:
            raise WrongExportSession(f"{path}: invalid manifest bytes {size!r}")
        actual_size = path.stat().st_size
        if actual_size != size:
            raise WrongExportSession(f"{path}: size {actual_size}, expected {size}")
        expected_digest = entry.get("sha256")
        if not isinstance(expected_digest, str) or not _DIGEST.fullmatch(
            expected_digest
        ):
            raise WrongExportSession(f"{path}: invalid sha256 {expected_digest!r}")
        with path.open("rb") as source:
            digest = hashlib.file_digest(source, "sha256").hexdigest()
        if digest != expected_digest:
            raise WrongExportSession(
                f"{path}: sha256 {digest}, expected {expected_digest}"
            )
    for path in session_dir.rglob("*"):
        name = path.relative_to(session_dir).as_posix()
        if path.is_symlink() or (
            path.is_file() and name not in listed | {MANIFEST_NAME}
        ):
            raise WrongExportSession(f"Unlisted session file: {path}")
    return session_dir
