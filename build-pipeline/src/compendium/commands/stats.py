"""Database statistics command."""

import sqlite3
from pathlib import Path

from rich.console import Console
from rich.table import Table

console = Console()


def run(config: dict) -> None:
    """Show database statistics."""
    # Resolve paths
    repo_root = Path(__file__).parent.parent.parent.parent.parent
    build_dir = repo_root / config["paths"]["build_dir"]
    db_name = config["build_pipeline"]["db_name"]
    db_path = build_dir / db_name

    if not db_path.exists():
        console.print(f"[red]Error:[/red] Database not found: {db_path}")
        console.print("Run [cyan]compendium build[/cyan] first")
        return

    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get table counts
    tables = [
        "monsters",
        "items",
        "npcs",
        "quests",
        "skills",
        "zones",
        "portals",
        "gather_items",
        "crafting_recipes",
        "summon_triggers",
        "zone_triggers",
    ]

    table_data = []
    for table_name in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        table_data.append((table_name, count))

    # Sort by count descending
    table_data.sort(key=lambda x: x[1], reverse=True)

    # Create table
    table = Table(
        title="Database Statistics", show_header=True, header_style="bold cyan"
    )
    table.add_column("Table", style="white")
    table.add_column("Rows", justify="right", style="green")

    for table_name, count in table_data:
        table.add_row(table_name, f"{count:,}")

    # Get database file size
    db_size = db_path.stat().st_size
    if db_size < 1024 * 1024:
        size_str = f"{db_size / 1024:.1f} KB"
    else:
        size_str = f"{db_size / (1024 * 1024):.1f} MB"

    console.print()
    console.print(table)
    console.print()
    console.print(f"Database file: [cyan]{db_path}[/cyan]")
    console.print(f"Database size: [green]{size_str}[/green]")
    console.print()

    conn.close()
