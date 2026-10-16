"""Build command - converts JSON exports to SQLite database.

This module orchestrates the build pipeline:
1. Creates the database from schema
2. Loads all data from JSON exports
3. Runs denormalizations to create derived fields
"""

import shutil
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path

from rich.console import Console

from compendium.config import get_repo_root
from compendium.db import create_database
from compendium.denormalizers import run_all as denormalize_all
from compendium.loaders import load_all
from compendium.redactions import verify
from compendium.redactions.references import resolve
from compendium.visual_assets import reconcile
from compendium.zone_artwork import publish_zone_thumbnails
from compendium.zone_shots import publish_zone_shots

console = Console()


def _publish_staged_outputs(
    stage_root: Path,
    static_dir: Path,
    db_path: Path,
) -> None:
    outputs = ((stage_root / "static" / "images", static_dir / "images"),)
    backups: list[tuple[Path, Path]] = []
    installed: list[Path] = []
    try:
        # A crash between atomic renames can expose outputs from different builds
        # and leave staging files behind. A versioned consumer is needed for crash safety.
        for index, (staged, live) in enumerate(outputs):
            if live.exists():
                backup = stage_root / f"previous-{index}"
                live.replace(backup)
                backups.append((backup, live))
            staged.replace(live)
            installed.append(live)
        (stage_root / db_path.name).replace(db_path)
    except Exception:
        for live in reversed(installed):
            if live.is_dir():
                shutil.rmtree(live)
            else:
                live.unlink()
        for backup, live in reversed(backups):
            backup.replace(live)
        raise


def run(config: dict) -> None:
    """Build SQLite database from JSON exports.

    Args:
        config: Configuration dictionary from config.toml
    """
    repo_root = get_repo_root()
    export_dir = repo_root / config["paths"]["export_dir"]
    website_dir = repo_root / config["paths"]["website_dir"]
    static_dir = website_dir / "static"
    # The database is a build input, not a published file. Keeping it out of
    # static/ stops it from being served verbatim at a stable, unhashed URL,
    # which cannot be cached immutably. The web build gzips it and gives it a
    # content-hashed name. Images stay in static/ because pages link to them
    # directly.
    data_dir = website_dir / "data"
    schema_path = repo_root / "build-pipeline" / "schema.sql"

    static_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)
    db_path = data_dir / config["build_pipeline"]["db_name"]

    console.print("[bold]Building database from JSON exports...[/bold]\n")

    with tempfile.TemporaryDirectory(
        prefix=".compendium-build-", dir=data_dir
    ) as temp_dir:
        stage_root = Path(temp_dir)
        temp_db_path = stage_root / db_path.name
        stage_static_dir = stage_root / "static"
        conn = create_database(temp_db_path, schema_path)
        try:
            load_all(conn, export_dir, stage_static_dir)

            console.print()
            subject = denormalize_all(conn)
            publish_zone_thumbnails(conn, export_dir, stage_static_dir)
            publish_zone_shots(
                conn,
                export_dir,
                stage_static_dir,
                repo_root / "build-pipeline" / "zone_shot_focal_points.json",
            )
            reconcile(conn, stage_static_dir)

            # Verify after every step that removes published content.
            verify.check(conn, subject, resolve(conn), stage_static_dir / "images")
            conn.commit()
        except Exception as e:
            console.print(f"\n[bold red]Error building database:[/bold red] {e}")
            raise
        finally:
            conn.close()

        # VACUUM and ANALYZE require no active transaction.
        with closing(
            sqlite3.connect(temp_db_path, isolation_level=None)
        ) as vacuum_conn:
            vacuum_conn.execute("VACUUM")
            console.print("  [green]OK[/green] Vacuumed database")
            vacuum_conn.execute("ANALYZE")
            console.print("  [green]OK[/green] Analyzed query statistics")

        (stage_static_dir / "images").mkdir(parents=True, exist_ok=True)
        _publish_staged_outputs(stage_root, static_dir, db_path)

    console.print(
        f"\n[bold green]OK Database built successfully:[/bold green] {db_path}"
    )
