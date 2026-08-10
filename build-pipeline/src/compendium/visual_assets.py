"""Publishing and reconciliation for entity artwork.

Every image the website serves for a game entity goes through this module, whatever
its origin: sprites extracted from the game by DataExporter, and achievement art
downloaded from Steam. That gives the compendium one path rule, one delivery format,
and one place where artwork is reconciled against redaction.

The published path is a pure function of ``(domain, entity_id, kind)``. Entity ids are
used verbatim rather than rewritten, so a consumer that knows the id can construct the
URL without a lookup, and an id that cannot appear in a path fails the build instead of
being silently mangled into a different one.
"""

import re
import sqlite3
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

from PIL import Image
from rich.console import Console

console = Console()

# Published directory per manifest domain. Adding a domain is deliberate: an unknown
# one raises rather than guessing a plural.
DOMAIN_DIRECTORIES = {
    "achievement": "achievements",
    "item": "items",
    "monster": "monsters",
    "npc": "npcs",
    "pet": "pets",
    "skill": "skills",
}

# The table that owns each domain's entities, used to reconcile artwork against
# redaction. A domain absent from this map has no owning table and is never pruned.
DOMAIN_TABLES = {
    "achievement": "achievements",
    "item": "items",
    "monster": "monsters",
    "npc": "npcs",
    "pet": "pets",
    "skill": "skills",
}

# Path segments must survive a URL and a filesystem untouched. Uppercase is allowed
# because achievement ids are uppercase in the game data.
SEGMENT_PATTERN = re.compile(r"^[A-Za-z0-9._-]+$")

PUBLISHED_SUFFIX = ".webp"

# WebP effort. Encoding runs once per build and the bytes ship to every visitor.
ENCODE_METHOD = 6

# Quality for photographic sources. Measured at -59% against the JPEG originals with
# no visible change at the sizes the site renders them.
PHOTO_QUALITY = 80


class Encoding(Enum):
    """How a source image should be published.

    SPRITE art is pixel art shown deliberately larger than its source, so it is encoded
    losslessly and its fully transparent padding is trimmed. PHOTO art is already lossy
    and is re-encoded as such.
    """

    SPRITE = "sprite"
    PHOTO = "photo"


@dataclass(frozen=True)
class PublishedAsset:
    """An image written to the website's static directory."""

    public_path: str
    width: int
    height: int


def validate_segment(value: str, *, label: str) -> str:
    """Return ``value`` unchanged, or raise if it cannot be a path segment."""
    if not SEGMENT_PATTERN.match(value):
        raise ValueError(
            f"{label} '{value}' cannot be published verbatim: "
            f"expected only letters, digits, '.', '_' or '-'"
        )
    return value


def derive_public_path(domain: str, entity_id: str, kind: str) -> str:
    """Return the static-relative path for one asset.

    This is the single definition of where artwork lives. `entityImageUrl` in the
    website mirrors it, and `test_public_paths_are_derivable` pins the two together.
    """
    try:
        directory = DOMAIN_DIRECTORIES[domain]
    except KeyError:
        raise ValueError(
            f"Unknown visual asset domain '{domain}'. "
            f"Add it to DOMAIN_DIRECTORIES to publish its artwork."
        ) from None

    validate_segment(entity_id, label="Entity id")
    validate_segment(kind, label="Asset kind")
    return f"images/{directory}/{entity_id}/{kind}{PUBLISHED_SUFFIX}"


def publish(
    source_path: Path,
    static_dir: Path,
    *,
    domain: str,
    entity_id: str,
    kind: str,
    encoding: Encoding,
) -> PublishedAsset:
    """Encode one source image into the website's static directory as WebP."""
    public_path = derive_public_path(domain, entity_id, kind)
    destination = static_dir / public_path
    destination.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source_path) as image:
        image.load()
        if encoding is Encoding.SPRITE:
            rgba = image if image.mode == "RGBA" else image.convert("RGBA")
            alpha_bbox = rgba.getchannel("A").getbbox()
            published = rgba if alpha_bbox is None else rgba.crop(alpha_bbox)
            published.save(
                destination, "WEBP", lossless=True, quality=100, method=ENCODE_METHOD
            )
        else:
            published = image
            published.save(
                destination, "WEBP", quality=PHOTO_QUALITY, method=ENCODE_METHOD
            )
        width, height = published.size

    return PublishedAsset(public_path=public_path, width=width, height=height)


def insert_asset(
    cursor: sqlite3.Cursor,
    *,
    domain: str,
    entity_id: str,
    kind: str,
    export_path: str,
    asset: PublishedAsset,
    source_field: str | None = None,
    source_type: str | None = None,
    source_name: str | None = None,
    sprite_name: str | None = None,
    texture_name: str | None = None,
) -> None:
    """Record one published asset."""
    cursor.execute(
        """
        INSERT INTO visual_assets (
            domain, entity_id, kind, export_path, public_path,
            source_field, source_type, source_name, sprite_name, texture_name,
            width, height
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            domain,
            entity_id,
            kind,
            export_path,
            asset.public_path,
            source_field,
            source_type,
            source_name,
            sprite_name,
            texture_name,
            asset.width,
            asset.height,
        ),
    )


def reconcile(conn: sqlite3.Connection, static_dir: Path) -> int:
    """Drop artwork whose entity no longer exists, then assert what remains.

    Assets are published before redaction runs, because the loaders that publish them
    run before the denormalizers that delete redacted rows. Reconciling afterwards
    means artwork inherits every redaction rule automatically instead of duplicating
    `redactions.toml` here. Returns the number of assets removed.
    """
    cursor = conn.cursor()
    removed = 0

    for domain, table in sorted(DOMAIN_TABLES.items()):
        orphans = cursor.execute(
            f"""
            SELECT v.entity_id, v.kind, v.public_path
            FROM visual_assets v
            LEFT JOIN {table} e ON e.id = v.entity_id
            WHERE v.domain = ? AND e.id IS NULL
            """,
            (domain,),
        ).fetchall()

        for entity_id, kind, public_path in orphans:
            published = static_dir / public_path
            published.unlink(missing_ok=True)
            entity_dir = published.parent
            if entity_dir.is_dir() and not any(entity_dir.iterdir()):
                entity_dir.rmdir()
            cursor.execute(
                "DELETE FROM visual_assets WHERE domain = ? AND entity_id = ? AND kind = ?",
                (domain, entity_id, kind),
            )
            removed += 1

    conn.commit()
    _assert_invariants(conn, static_dir)

    if removed:
        console.print(
            f"  Removed {removed} assets for entities excluded from the build"
        )
    return removed


def _assert_invariants(conn: sqlite3.Connection, static_dir: Path) -> None:
    """Fail the build when published artwork disagrees with the database."""
    cursor = conn.cursor()

    for domain, entity_id, kind, public_path in cursor.execute(
        "SELECT domain, entity_id, kind, public_path FROM visual_assets"
    ):
        expected = derive_public_path(domain, entity_id, kind)
        if public_path != expected:
            raise ValueError(
                f"Visual asset {domain}/{entity_id}/{kind} is published at "
                f"'{public_path}' but derives to '{expected}'"
            )
        if not (static_dir / public_path).is_file():
            raise FileNotFoundError(f"Visual asset row has no file: {public_path}")

    collisions = cursor.execute(
        """
        SELECT domain, lower(entity_id), count(DISTINCT entity_id) AS variants
        FROM visual_assets
        GROUP BY domain, lower(entity_id)
        HAVING variants > 1
        """
    ).fetchall()
    if collisions:
        raise ValueError(
            "Entity ids differing only by case collide on case-insensitive "
            f"filesystems: {collisions}"
        )
