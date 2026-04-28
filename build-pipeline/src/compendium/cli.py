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
def icons(ctx: typer.Context):
    """Visual assets are exported by DataExporter; build-pipeline consumption is not implemented."""
    console.print("[yellow]visual asset consumption is not yet implemented[/yellow]")


@app.command()
def types(ctx: typer.Context):
    """Generate TypeScript types from SQLite schema."""
    console.print("[yellow]types command not yet implemented[/yellow]")


@app.command()
def deploy(ctx: typer.Context):
    """Deploy artifacts to website."""
    console.print("[yellow]deploy command not yet implemented[/yellow]")


@app.command()
def validate(ctx: typer.Context):
    """Validate JSON exports."""
    console.print("[yellow]validate command not yet implemented[/yellow]")


@app.command()
def stats(ctx: typer.Context):
    """Show database statistics."""
    from compendium.commands import stats as stats_cmd

    stats_cmd.run(ctx.obj)


@app.command()
def all(ctx: typer.Context):
    """Run complete pipeline (validate → build → tiles → icons → types → deploy → stats)."""
    console.print("[bold]Running complete build pipeline...[/bold]")
    console.print("[yellow]all command not yet implemented[/yellow]")


if __name__ == "__main__":
    app()
