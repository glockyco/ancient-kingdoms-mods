"""Build command - converts JSON exports to SQLite database.

This module orchestrates the build pipeline:
1. Creates the database from schema
2. Loads all data from JSON exports
3. Runs denormalizations to create derived fields
"""

from rich.console import Console

from compendium.config import get_repo_root
from compendium.db import create_database
from compendium.denormalizers import run_all as denormalize_all
from compendium.loaders import (
    load_alchemy_recipes,
    load_alchemy_tables,
    load_altars,
    load_crafting_recipes,
    load_crafting_stations,
    load_gather_items,
    load_items,
    load_luck_tokens,
    load_monster_spawns,
    load_monsters,
    load_npc_spawns,
    load_npcs,
    load_portals,
    load_professions,
    load_quests,
    load_skills,
    load_static_data,
    load_summon_triggers,
    load_treasure_locations,
    load_zone_triggers,
    load_zones,
)

console = Console()


def run(config: dict) -> None:
    """Build SQLite database from JSON exports.

    Args:
        config: Configuration dictionary from config.toml
    """
    repo_root = get_repo_root()
    export_dir = repo_root / config["paths"]["export_dir"]
    website_dir = repo_root / config["paths"]["website_dir"]
    static_dir = website_dir / "static"
    schema_path = repo_root / "build-pipeline" / "schema.sql"

    # Ensure static directory exists
    static_dir.mkdir(parents=True, exist_ok=True)

    db_path = static_dir / config["build_pipeline"]["db_name"]

    console.print("[bold]Building database from JSON exports...[/bold]\n")

    # Create database
    conn = create_database(db_path, schema_path)

    try:
        # Load data in order (respecting foreign keys)
        load_static_data(conn, export_dir)  # Factions, reputation tiers (before NPCs)
        load_zones(conn, export_dir)
        load_professions(conn, export_dir)
        load_zone_triggers(conn, export_dir)
        load_skills(conn, export_dir)
        load_items(conn, export_dir)
        load_luck_tokens(conn, export_dir)  # After zones + items
        load_altars(conn, export_dir)  # After zones + items
        load_monsters(conn, export_dir)
        load_monster_spawns(conn, export_dir)  # After monsters
        load_npcs(conn, export_dir)
        load_npc_spawns(conn, export_dir)  # After NPCs
        load_summon_triggers(conn, export_dir)  # After monsters/NPCs
        load_quests(conn, export_dir)
        load_portals(conn, export_dir)
        load_treasure_locations(conn, export_dir)  # After items
        load_gather_items(conn, export_dir)
        load_crafting_recipes(conn, export_dir)
        load_alchemy_recipes(conn, export_dir)
        load_alchemy_tables(conn, export_dir)  # After zones + zone_triggers
        load_crafting_stations(conn, export_dir)  # After zones + zone_triggers

        # Denormalize data (must be done after all data is loaded)
        console.print()
        denormalize_all(conn)

        # Optimize FTS5 indexes (merges segments, reduces size)
        console.print("\nOptimizing database...")
        cursor = conn.cursor()
        fts_tables = [
            "items_fts",
            "monsters_fts",
            "npcs_fts",
            "quests_fts",
            "zones_fts",
            "gathering_resources_fts",
            "chests_fts",
            "altars_fts",
            "portals_fts",
            "crafting_stations_fts",
            "alchemy_tables_fts",
        ]
        for table in fts_tables:
            cursor.execute(f"INSERT INTO {table}({table}) VALUES ('optimize')")
        console.print(f"  [green]OK[/green] Optimized {len(fts_tables)} FTS5 indexes")

        conn.commit()
        console.print(
            f"\n[bold green]OK Database built successfully:[/bold green] {db_path}"
        )

    except Exception as e:
        console.print(f"\n[bold red]Error building database:[/bold red] {e}")
        raise
    finally:
        conn.close()

    # VACUUM and ANALYZE must run outside of any transaction
    import sqlite3

    vacuum_conn = sqlite3.connect(db_path, isolation_level=None)
    vacuum_conn.execute("VACUUM")
    console.print("  [green]OK[/green] Vacuumed database")
    vacuum_conn.execute("ANALYZE")
    console.print("  [green]OK[/green] Analyzed query statistics")
    vacuum_conn.close()

    # Post-processing for sql.js-httpvfs chunked mode
    # Cloudflare doesn't expose Content-Length header, so we use chunked mode
    # which requires the file to have a numeric suffix and a metadata file
    import json
    import shutil

    db_size = db_path.stat().st_size
    chunked_path = db_path.parent / (db_path.name + "0")
    shutil.move(db_path, chunked_path)
    console.print(f"  [green]OK[/green] Renamed to chunked format: {chunked_path.name}")

    metadata_path = static_dir / "db-metadata.json"
    with open(metadata_path, "w") as f:
        json.dump({"size": db_size}, f)
    console.print(f"  [green]OK[/green] Wrote database metadata: {metadata_path}")
