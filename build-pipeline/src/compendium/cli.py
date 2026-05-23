"""Main CLI entry point for the Ancient Kingdoms Compendium build pipeline."""

from pathlib import Path
from typing import Optional

import typer
from rich.console import Console

from compendium.config import load_config

app = typer.Typer(
    name="compendium",
    help="Ancient Kingdoms Compendium - Build Pipeline",
    add_completion=False,
)

console = Console()


@app.callback()
def main(
    ctx: typer.Context,
    config: Optional[Path] = typer.Option(
        None,
        "--config",
        help="Path to config file (default: config.toml in repository root)",
        exists=True,
        dir_okay=False,
    ),
):
    """Ancient Kingdoms Compendium build pipeline."""
    # Load configuration and store in context for commands
    try:
        cfg = load_config(config)
        ctx.obj = cfg
    except FileNotFoundError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]Error loading config:[/red] {e}")
        raise typer.Exit(1)


@app.command()
def build(ctx: typer.Context):
    """Build SQLite database from JSON exports."""
    from compendium.commands import build as build_cmd

    build_cmd.run(ctx.obj)


@app.command()
def tiles(ctx: typer.Context):
    """Generate map tile pyramid from screenshots."""
    from compendium.commands import tiles as tiles_cmd

    tiles_cmd.run(ctx.obj)


@app.command()
def stats(ctx: typer.Context):
    """Show database statistics."""
    from compendium.commands import stats as stats_cmd

    stats_cmd.run(ctx.obj)


if __name__ == "__main__":
    app()
