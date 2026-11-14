"""Validate curated live-camera captures and publish zone overview artwork."""

import hashlib
import json
import math
import re
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from PIL import Image
from rich.console import Console

from compendium.redactions.config import load_redactions
from compendium.visual_assets import (
    Encoding,
    insert_asset,
    publish_image,
    validate_segment,
)

SOURCE_SIZE = (1920, 1080)
PUBLISHED_SIZE = (960, 540)
CAMERA_SIZE = 11.25
console = Console()


def _records(rows: Any, path: Path) -> dict[str, dict[str, Any]]:
    if not isinstance(rows, list):
        raise TypeError(f"Zone shot input must be an array: {path}")
    result = {}
    artwork = set()
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get("zone_id"), str):
            raise TypeError(f"Zone shot row requires a zone_id: {path}")
        validate_segment(row["zone_id"], label="Zone id")
        capture_id = row.get("capture_id")
        if not isinstance(capture_id, str) or capture_id in {".", ".."}:
            raise ValueError(f"Zone shot requires a capture_id: {path}")
        validate_segment(capture_id, label="Capture id")
        if capture_id in result:
            raise ValueError(f"Duplicate zone shot capture ID '{capture_id}': {path}")
        kind = row.get("artwork_kind")
        if not isinstance(kind, str) or kind in {".", ".."}:
            raise ValueError(f"Zone shot requires artwork_kind: {path}")
        validate_segment(kind, label="Artwork kind")
        identity = (row["zone_id"], kind)
        if identity in artwork:
            raise ValueError(f"Duplicate zone shot artwork identity: {identity}")
        artwork.add(identity)
        result[capture_id] = row
    return result


def _number(row: dict[str, Any], key: str, zone_id: str) -> float:
    value = row.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError(f"Zone '{zone_id}' requires numeric {key}")
    if not math.isfinite(value):
        raise ValueError(f"Zone '{zone_id}' requires finite {key}")
    return float(value)


def _focal_points(path: Path) -> tuple[float, dict[str, dict[str, Any]]]:
    with path.open(encoding="utf-8") as source:
        data = json.load(source)
    if not isinstance(data, dict):
        raise TypeError(f"Zone shot focal input must be an object: {path}")
    if type(data.get("schema_version")) is not int or data["schema_version"] != 2:
        raise ValueError(
            "Zone shot focal schema_version must be 2. Recapture legacy receipts."
        )
    scale = _number(data, "frame_scale", "focal configuration")
    if scale <= 0:
        raise ValueError("Zone shot frame_scale must be positive")
    points = _records(data.get("zones"), path)
    for zone_id, point in points.items():
        if "frame_scale" in point:
            override = _number(point, "frame_scale", zone_id)
            if override <= 0:
                raise ValueError(f"Zone '{zone_id}' requires positive frame_scale")
    return scale, points


def _contains(bounds: tuple, x: float, y: float) -> bool:
    if None in bounds:
        return False
    min_x, min_y, max_x, max_y = bounds
    return (
        all(math.isfinite(v) for v in bounds)
        and min_x < max_x
        and min_y < max_y
        and min_x <= x <= max_x
        and min_y <= y <= max_y
    )


def _anchor(row: dict[str, Any], zone_id: str) -> tuple[dict[str, str], list[float]]:
    if "x" in row or "y" in row:
        raise ValueError(f"Suppressed zone '{zone_id}' forbids absolute coordinates")
    anchor = row.get("anchor")
    if (
        not isinstance(anchor, dict)
        or set(anchor) != {"monster"}
        or not isinstance(anchor["monster"], str)
    ):
        raise ValueError(f"Suppressed zone '{zone_id}' requires one monster anchor")
    validate_segment(anchor["monster"], label="Monster anchor")
    offset = row.get("offset", [0, 0])
    if not isinstance(offset, list) or len(offset) != 2:
        raise ValueError(f"Zone '{zone_id}' offset requires two finite numbers")
    return anchor, [_number({"offset": value}, "offset", zone_id) for value in offset]


def _mode(row: dict[str, Any], zone_id: str, suppressed: set[str]) -> str:
    expected = (
        "procedural_run"
        if zone_id == "chambers_of_chaos"
        else "suppressed_anchor"
        if zone_id in suppressed
        else "authored_world"
    )
    if row.get("mode") != expected:
        raise ValueError(f"Zone '{zone_id}' capture mode must be {expected}")
    if expected != "procedural_run":
        if row["artwork_kind"] != "shot":
            raise ValueError("Only procedural captures support illustrations")
        if any(
            key in row
            for key in ("run_seed", "chamber_index", "trial_kind", "room_camera")
        ):
            raise ValueError(f"Zone '{zone_id}' forbids procedural provenance")
    return expected


def _procedural(row: dict[str, Any], zone_id: str, *, receipt: bool) -> None:
    if any(key in row for key in ("x", "y", "anchor", "offset")):
        raise ValueError(
            f"Procedural zone '{zone_id}' forbids world coordinates and anchors"
        )
    chamber = row.get("chamber_index")
    if type(chamber) is not int or not 0 <= chamber <= 2:
        raise ValueError("Procedural chamber_index must be an integer from 0 to 2")
    camera = row.get("room_camera")
    if not isinstance(camera, list) or len(camera) != 2:
        raise ValueError("Procedural room_camera requires two finite numbers")
    for value in camera:
        _number({"room_camera": value}, "room_camera", zone_id)
    if receipt:
        seed = row.get("run_seed")
        if type(seed) is not int or not 0 < seed < 2147483647:
            raise ValueError("Procedural run_seed must be a positive game seed")
        trial = row.get("trial_kind")
        if trial not in {
            "Battle",
            "Waves",
            "Riddle",
            "Runes",
            "Manuscript",
            "Guardian",
        }:
            raise ValueError("Procedural trial_kind is invalid")
        if (chamber == 2) != (trial == "Guardian"):
            raise ValueError("Procedural trial_kind disagrees with chamber_index")


def _capture_records(data: Any, path: Path) -> dict[str, dict[str, Any]]:
    if isinstance(data, list):
        normalized = []
        for row in data:
            if not isinstance(row, dict) or not isinstance(row.get("zone_id"), str):
                raise TypeError("Legacy zone shot requires zone_id")
            zone_id = row["zone_id"]
            validate_segment(zone_id, label="Zone id")
            if zone_id in {".", "..", "chambers_of_chaos"} or any(
                key in row
                for key in (
                    "capture_id",
                    "mode",
                    "artwork_kind",
                    "run_seed",
                    "chamber_index",
                    "trial_kind",
                    "room_camera",
                )
            ):
                raise ValueError(
                    "Only legacy authored-world and Temple captures may use the array manifest"
                )
            image = f"{zone_id}.png"
            source = path.parent / image
            normalized.append(
                {
                    **row,
                    "capture_id": zone_id,
                    "artwork_kind": "shot",
                    "mode": "suppressed_anchor"
                    if zone_id == "temple_of_valaark"
                    else "authored_world",
                    "image": image,
                    "sha256": hashlib.sha256(source.read_bytes()).hexdigest()
                    if source.is_file()
                    else None,
                }
            )
        return _records(normalized, path)
    if (
        not isinstance(data, dict)
        or type(data.get("schema_version")) is not int
        or data["schema_version"] != 2
    ):
        raise ValueError("Zone shot manifest schema_version must be 2")
    return _records(data.get("captures"), path)


def publish_zone_shots(
    conn: sqlite3.Connection,
    export_root: Path,
    static_dir: Path,
    focal_path: Path,
) -> int:
    """Require complete released-zone coverage, then publish native-framed shots.

    Game X/Y here means the exported horizontal X/Z plane. Entity-derived zone
    bounds and the zone's live trigger rectangles are both valid containment
    evidence; triggers cover scenery beyond the entity-derived rectangle.
    """
    scale, focal = _focal_points(focal_path)
    shots_dir = export_root / "screenshots" / "zones"
    manifest_path = shots_dir / "manifest.json"
    with manifest_path.open(encoding="utf-8") as source:
        manifest = json.load(source)
    captures = _capture_records(manifest, manifest_path)
    zones = {
        row[0]: row[1:]
        for row in conn.execute(
            "SELECT id, bounds_min_x, bounds_min_y, bounds_max_x, bounds_max_y FROM zones"
        )
    }
    redactions = load_redactions()
    excluded = redactions.exclude_zone_ids
    required = set(zones) - excluded
    for label, records in (("focal points", focal), ("capture manifest", captures)):
        record_zones = {row["zone_id"] for row in records.values()}
        unknown = record_zones - set(zones)
        if unknown:
            raise ValueError(f"Unknown zone in {label}: {', '.join(sorted(unknown))}")
        forbidden = record_zones & excluded
        if forbidden:
            raise ValueError(
                f"Excluded zone in {label}: {', '.join(sorted(forbidden))}"
            )
        primary_zones = {
            row["zone_id"] for row in records.values() if row["artwork_kind"] == "shot"
        }
        missing = required - primary_zones
        if missing:
            raise ValueError(f"Missing zone shot {label}: {', '.join(sorted(missing))}")
    if set(focal) != set(captures):
        raise ValueError(
            "Missing or unexpected zone shot capture IDs relative to focal points"
        )

    triggers: dict[str, list[tuple]] = {}
    for row in conn.execute(
        "SELECT z.id, t.bounds_min_x, t.bounds_min_y, t.bounds_max_x, t.bounds_max_y "
        "FROM zone_triggers t JOIN zones z ON z.zone_id = t.zone_id"
    ):
        triggers.setdefault(row[0], []).append(row[1:])

    # Validate the complete set before publishing any of it.
    for capture_id in sorted(focal):
        point, capture = focal[capture_id], captures[capture_id]
        zone_id = point["zone_id"]
        if (capture["zone_id"], capture["artwork_kind"]) != (
            zone_id,
            point["artwork_kind"],
        ):
            raise ValueError(
                f"Capture '{capture_id}' receipt identity differs from focal point"
            )
        mode = _mode(point, zone_id, redactions.suppress_position_zone_ids)
        _mode(capture, zone_id, redactions.suppress_position_zone_ids)
        effective_scale = point.get("frame_scale", scale)
        # Positive dimensions use the same midpoint rule as Math.Round AwayFromZero.
        source_size = tuple(
            math.floor(dimension * effective_scale + 0.5) for dimension in SOURCE_SIZE
        )
        camera_size = CAMERA_SIZE * effective_scale
        if not isinstance(point.get("comment"), str):
            raise TypeError(f"Zone '{zone_id}' focal point requires a comment")
        if not point["comment"].strip():
            raise ValueError(
                f"Zone '{zone_id}' focal point requires a nonempty comment"
            )
        if mode == "procedural_run":
            _procedural(point, zone_id, receipt=False)
            _procedural(capture, zone_id, receipt=True)
            if any(
                point[key] != capture[key] for key in ("chamber_index", "room_camera")
            ):
                raise ValueError(
                    f"Capture '{capture_id}' procedural framing differs from focal point"
                )
        elif zone_id in redactions.suppress_position_zone_ids:
            if _anchor(point, zone_id) != _anchor(capture, zone_id):
                raise ValueError(
                    f"Zone '{zone_id}' capture anchor or offset differs from focal point"
                )
            # The live capture verifies containment; published geometry is withheld.
        else:
            if any(
                key in row for row in (point, capture) for key in ("anchor", "offset")
            ):
                raise ValueError(f"Normal zone '{zone_id}' forbids anchor or offset")
            x, y = (_number(point, key, zone_id) for key in ("x", "y"))
            rectangles = [zones[zone_id], *triggers.get(zone_id, [])]
            if not any(_contains(bounds, x, y) for bounds in rectangles):
                raise ValueError(f"Zone '{zone_id}' focal point is outside zone bounds")
            for key, value in (("x", x), ("y", y)):
                if not math.isclose(
                    _number(capture, key, zone_id), value, abs_tol=0.001, rel_tol=0
                ):
                    raise ValueError(
                        f"Zone '{zone_id}' capture {key} differs from focal point"
                    )
        if not math.isclose(
            _number(capture, "camera_size", zone_id),
            camera_size,
            rel_tol=1e-6,
            abs_tol=1e-6,
        ):
            raise ValueError(
                f"Zone '{zone_id}' capture camera_size must be {camera_size}"
            )
        if (
            tuple(_number(capture, key, zone_id) for key in ("width", "height"))
            != source_size
        ):
            raise ValueError(
                f"Zone '{zone_id}' manifest framing must be {source_size[0]}x{source_size[1]}"
            )
        timestamp = capture.get("captured_at")
        if not isinstance(timestamp, str):
            raise TypeError(f"Zone '{zone_id}' requires captured_at")
        try:
            parsed = datetime.fromisoformat(timestamp)
        except ValueError as error:
            raise ValueError(
                f"Zone '{zone_id}' captured_at must be an ISO timestamp"
            ) from error
        if parsed.tzinfo is None:
            raise ValueError(f"Zone '{zone_id}' captured_at requires a timezone")
        image = capture.get("image")
        if (
            not isinstance(image, str)
            or Path(image).name != image
            or not re.fullmatch(r"[A-Za-z0-9._-]+\.png", image)
        ):
            raise ValueError(
                f"Capture '{capture_id}' requires a safe PNG image filename"
            )
        source_path = shots_dir / image
        if not source_path.is_file():
            raise FileNotFoundError(f"Missing zone shot PNG: {source_path}")
        with Image.open(source_path) as source:
            if source.format != "PNG" or source.size != source_size:
                raise ValueError(
                    f"Zone '{zone_id}' source framing must be a {source_size[0]}x{source_size[1]} PNG"
                )
            source.load()
        digest = capture.get("sha256")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ValueError(
                f"Capture '{capture_id}' requires a lowercase SHA-256 digest"
            )
        if hashlib.sha256(source_path.read_bytes()).hexdigest() != digest:
            raise ValueError(
                f"Capture '{capture_id}' image digest differs from its receipt"
            )

    cursor = conn.cursor()
    for capture_id in sorted(focal):
        capture = captures[capture_id]
        zone_id = capture["zone_id"]
        kind = capture["artwork_kind"]
        export_path = f"screenshots/zones/{capture['image']}"
        with Image.open(export_root / export_path) as source:
            image = source.convert("RGB").resize(
                PUBLISHED_SIZE, Image.Resampling.LANCZOS
            )
        asset = publish_image(
            image,
            static_dir,
            domain="zone",
            entity_id=zone_id,
            kind=kind,
            encoding=Encoding.PHOTO,
        )
        insert_asset(
            cursor,
            domain="zone",
            entity_id=zone_id,
            kind=kind,
            export_path=export_path,
            asset=asset,
            source_field="screenshots.zones.manifest",
            source_type="LiveProceduralCameraCapture"
            if capture["mode"] == "procedural_run"
            else "LiveZoneCameraCapture",
            source_name=capture_id,
        )
    conn.commit()
    console.print(
        f"  [green]OK[/green] Published {len(captures)} zone shots and illustrations"
    )
    return len(captures)
