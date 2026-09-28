"""Build command - converts JSON exports to SQLite database.

This module orchestrates the build pipeline:
1. Creates the database from schema
2. Loads all data from JSON exports
3. Runs denormalizations to create derived fields
"""

import json
import shutil
import sqlite3
import tempfile
import tomllib
from contextlib import closing
from pathlib import Path

from rich.console import Console

from compendium.config import get_repo_root
from compendium.db import create_database
from compendium.denormalizers import run_all as denormalize_all
from compendium.loaders import (
    load_achievements,
    load_alchemy_recipes,
    load_alchemy_tables,
    load_altars,
    load_classes,
    load_crafting_recipes,
    load_crafting_stations,
    load_equipment_slots,
    load_fish,
    load_game_guide,
    load_gather_items,
    load_houses,
    load_items,
    load_luck_tokens,
    load_monster_skills,
    load_monster_spawns,
    load_monsters,
    load_npc_spawns,
    load_npcs,
    load_pet_skills,
    load_pets,
    load_portals,
    load_professions,
    load_progression,
    load_quests,
    load_scribing_recipes,
    load_scribing_tables,
    load_skills,
    load_static_data,
    load_summon_triggers,
    load_traps,
    load_treasure_locations,
    load_visual_assets,
    load_zone_triggers,
    load_zones,
    record_achievements,
    record_visual_assets,
)
from compendium.planner_inputs import verify_planner_inputs
from compendium.planner_payload import (
    COMPRESSED_PAYLOAD_NAME,
    RAW_PAYLOAD_NAME,
    write_planner_payload,
)
from compendium.redactions import verify
from compendium.redactions.references import resolve
from compendium.session import verify_export_locale
from compendium.visual_assets import reconcile
from compendium.zone_artwork import publish_zone_thumbnails

console = Console()


def load_all(
    conn: sqlite3.Connection, export_dir: Path, static_dir: Path | None = None
) -> None:
    """Load every export into the database, in foreign key order.

    `redactions check` recomputes the removal decisions, so it needs the same
    starting state as a build.

    Args:
        static_dir: Where to write image files. Without one, the artwork loaders
            record manifest rows but write no image files.
    """
    verify_export_locale(export_dir)  # Before anything reads a localized string
    load_static_data(conn, export_dir)  # Factions, reputation tiers (before NPCs)
    load_classes(conn, export_dir)  # Player classes (early, no dependencies)
    load_equipment_slots(conn, export_dir)
    load_game_guide(conn, export_dir)
    load_progression(conn, export_dir)  # After classes (class and race coverage)
    load_zones(conn, export_dir)
    if static_dir is None:
        record_visual_assets(conn, export_dir)
        record_achievements(conn, export_dir)
    else:
        load_visual_assets(conn, export_dir, static_dir)  # Runtime images for website
        load_achievements(conn, export_dir, static_dir)
    load_professions(conn, export_dir)
    load_skills(conn, export_dir)
    load_zone_triggers(
        conn, export_dir
    )  # After skills (environment_hazard_skill_id FK)
    load_houses(conn, export_dir)  # After zones + zone_triggers
    load_items(conn, export_dir)
    load_fish(conn, export_dir)
    load_luck_tokens(conn, export_dir)  # After zones + items
    load_altars(conn, export_dir)  # After zones + items
    load_monsters(conn, export_dir)
    load_monster_spawns(conn, export_dir)  # After monsters
    load_monster_skills(conn, export_dir)  # After monsters + skills
    load_pets(conn, export_dir)  # After skills
    load_pet_skills(conn, export_dir)  # After pets + skills
    load_npcs(conn, export_dir)
    load_npc_spawns(conn, export_dir)  # After NPCs
    load_summon_triggers(conn, export_dir)  # After monsters/NPCs
    load_quests(conn, export_dir)
    load_portals(conn, export_dir)
    load_treasure_locations(conn, export_dir)  # After items
    load_traps(conn, export_dir)  # After zones + zone_triggers + skills
    load_gather_items(conn, export_dir)
    load_crafting_recipes(conn, export_dir)
    load_alchemy_recipes(conn, export_dir)
    load_alchemy_tables(conn, export_dir)  # After zones + zone_triggers
    load_scribing_recipes(conn, export_dir)  # After items
    load_scribing_tables(conn, export_dir)  # After zones + zone_triggers
    load_crafting_stations(conn, export_dir)  # After zones + zone_triggers


def _verify_snapshot_identity(export_dir: Path, snapshot_path: Path) -> None:
    if not snapshot_path.is_file():
        raise FileNotFoundError(
            f"Required snapshot is missing: {snapshot_path}. Generate the decompiled server-scripts snapshot before building."
        )
    with snapshot_path.open("rb") as handle:
        snapshot = tomllib.load(handle)
    for field in ("game_version", "steam_build_id", "assembly_sha256"):
        if not isinstance(snapshot.get(field), str) or not snapshot[field]:
            raise ValueError(
                f"Required snapshot field {field!r} is missing in {snapshot_path}"
            )

    game_config_path = export_dir / "game_config.json"
    if not game_config_path.is_file():
        raise FileNotFoundError(
            f"Required input is missing: {game_config_path}. Run the DataExporter mod in the game."
        )
    exported_version = json.loads(game_config_path.read_text(encoding="utf-8"))[
        "game_version"
    ]
    if exported_version != snapshot["game_version"]:
        raise ValueError(
            f"Export game version {exported_version!r} does not match snapshot {snapshot['game_version']!r}"
        )


def _publish_staged_outputs(
    stage_root: Path,
    static_dir: Path,
    data_dir: Path,
    db_path: Path,
) -> None:
    outputs = (
        (stage_root / "static" / "images", static_dir / "images"),
        (stage_root / "data" / RAW_PAYLOAD_NAME, data_dir / RAW_PAYLOAD_NAME),
        (
            stage_root / "data" / COMPRESSED_PAYLOAD_NAME,
            data_dir / COMPRESSED_PAYLOAD_NAME,
        ),
    )
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

    snapshot_path = repo_root / "server-scripts" / "SNAPSHOT.toml"
    _verify_snapshot_identity(export_dir, snapshot_path)
    verify_planner_inputs(export_dir)

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
        stage_data_dir = stage_root / "data"
        stage_data_dir.mkdir()
        conn = create_database(temp_db_path, schema_path)
        try:
            load_all(conn, export_dir, stage_static_dir)

            console.print()
            subject = denormalize_all(conn)
            publish_zone_thumbnails(conn, export_dir, stage_static_dir)
            reconcile(conn, stage_static_dir)

            # Verify after every step that removes published content.
            verify.check(conn, subject, resolve(conn), stage_static_dir / "images")
            planner_payload = write_planner_payload(
                conn, export_dir, stage_data_dir, snapshot_path, subject
            )
            console.print(
                "  [green]OK[/green] Prepared planner payload "
                f"({planner_payload.raw_size:,} raw bytes, "
                f"{planner_payload.compressed_size:,} compressed bytes)"
            )
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
        _publish_staged_outputs(stage_root, static_dir, data_dir, db_path)

    console.print(
        f"\n[bold green]OK Database built successfully:[/bold green] {db_path}"
    )
