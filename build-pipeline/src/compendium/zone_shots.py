"""Validate curated live-camera captures and publish zone overview artwork."""

import json
import math
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from PIL import Image
from rich.console import Console

from compendium.commands.tiles import redacted_zone_ids
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


def _records(path: Path) -> dict[str, dict[str, Any]]:
    with path.open(encoding="utf-8") as source:
        rows = json.load(source)
    if not isinstance(rows, list):
        raise TypeError(f"Zone shot input must be an array: {path}")
    result = {}
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get("zone_id"), str):
            raise TypeError(f"Zone shot row requires a zone_id: {path}")
        zone_id = validate_segment(row["zone_id"], label="Zone id")
        if zone_id in result:
            raise ValueError(f"Duplicate zone shot '{zone_id}': {path}")
        result[zone_id] = row
    return result


def _number(row: dict[str, Any], key: str, zone_id: str) -> float:
    value = row.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError(f"Zone '{zone_id}' requires numeric {key}")
    if not math.isfinite(value):
        raise ValueError(f"Zone '{zone_id}' requires finite {key}")
    return float(value)


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


def publish_zone_shots(
    conn: sqlite3.Connection,
    export_dir: Path,
    static_dir: Path,
    focal_path: Path,
) -> int:
    """Require complete released-zone coverage, then publish native-framed shots.

    Game X/Y here means the exported horizontal X/Z plane. Entity-derived zone
    bounds and the zone's live trigger rectangles are both valid containment
    evidence; triggers cover scenery beyond the entity-derived rectangle.
    """
    focal = _records(focal_path)
    shots_dir = export_dir / "screenshots" / "zones"
    captures = _records(shots_dir / "manifest.json")
    zones = {
        row[0]: row[1:]
        for row in conn.execute(
            "SELECT id, bounds_min_x, bounds_min_y, bounds_max_x, bounds_max_y FROM zones"
        )
    }
    excluded = redacted_zone_ids()
    required = set(zones) - excluded
    for label, records in (("focal points", focal), ("capture manifest", captures)):
        unknown = set(records) - set(zones)
        if unknown:
            raise ValueError(f"Unknown zone in {label}: {', '.join(sorted(unknown))}")
        forbidden = set(records) & excluded
        if forbidden:
            raise ValueError(
                f"Excluded zone in {label}: {', '.join(sorted(forbidden))}"
            )
        missing = required - set(records)
        if missing:
            raise ValueError(f"Missing zone shot {label}: {', '.join(sorted(missing))}")

    triggers: dict[str, list[tuple]] = {}
    for row in conn.execute(
        "SELECT z.id, t.bounds_min_x, t.bounds_min_y, t.bounds_max_x, t.bounds_max_y "
        "FROM zone_triggers t JOIN zones z ON z.zone_id = t.zone_id"
    ):
        triggers.setdefault(row[0], []).append(row[1:])

    # Validate the complete set before publishing any of it.
    for zone_id in sorted(required):
        point, capture = focal[zone_id], captures[zone_id]
        if not isinstance(point.get("comment"), str):
            raise TypeError(f"Zone '{zone_id}' focal point requires a comment")
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
        if _number(capture, "camera_size", zone_id) != CAMERA_SIZE:
            raise ValueError(
                f"Zone '{zone_id}' capture camera_size must be {CAMERA_SIZE}"
            )
        if (
            tuple(_number(capture, key, zone_id) for key in ("width", "height"))
            != SOURCE_SIZE
        ):
            raise ValueError(f"Zone '{zone_id}' manifest framing must be 1920x1080")
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
        source_path = shots_dir / f"{zone_id}.png"
        if not source_path.is_file():
            raise FileNotFoundError(f"Missing zone shot PNG: {source_path}")
        with Image.open(source_path) as source:
            if source.format != "PNG" or source.size != SOURCE_SIZE:
                raise ValueError(
                    f"Zone '{zone_id}' source framing must be a 1920x1080 PNG"
                )
            source.load()

    cursor = conn.cursor()
    for zone_id in sorted(required):
        export_path = f"screenshots/zones/{zone_id}.png"
        with Image.open(export_dir / export_path) as source:
            image = source.convert("RGB").resize(
                PUBLISHED_SIZE, Image.Resampling.LANCZOS
            )
        asset = publish_image(
            image,
            static_dir,
            domain="zone",
            entity_id=zone_id,
            kind="shot",
            encoding=Encoding.PHOTO,
        )
        insert_asset(
            cursor,
            domain="zone",
            entity_id=zone_id,
            kind="shot",
            export_path=export_path,
            asset=asset,
            source_field="screenshots.zones.manifest",
            source_type="LiveZoneCameraCapture",
            source_name=zone_id,
        )
    conn.commit()
    console.print(f"  [green]OK[/green] Published {len(required)} zone shots")
    return len(required)
