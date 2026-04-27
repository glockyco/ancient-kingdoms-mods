"""Visual asset audit CLI commands."""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console

from compendium.config import get_repo_root, resolve_path
from compendium.visual_audit.asset_index import (
    build_static_index,
    write_read_errors,
    write_static_index,
)
from compendium.visual_audit.hotrepl import default_hotrepl_client, run_probe
from compendium.visual_audit.models import (
    ExpectedVisual,
    RuntimeReference,
    StaticAsset,
    VisualSelection,
)
from compendium.visual_audit.report import build_coverage_markdown
from compendium.visual_audit.selection import select_visuals

console = Console()
app = typer.Typer(
    help="Audit game visual assets from runtime references and Unity asset files."
)
DEFAULT_DOMAINS = ["monsters", "items", "skills", "pets", "npcs"]


@app.command("assets")
def assets(
    ctx: typer.Context,
    game_data: Annotated[
        Path | None,
        typer.Option(
            "--game-data",
            help="Path to ancientkingdoms_Data. Defaults to .steam-download/ancientkingdoms_Data.",
        ),
    ] = None,
    output_dir: Annotated[
        Path | None,
        typer.Option("--output-dir", help="Output directory for visual audit files."),
    ] = None,
    extract: Annotated[
        bool,
        typer.Option("--extract/--no-extract", help="Extract Sprite/Texture2D PNGs."),
    ] = True,
    limit_files: Annotated[
        int | None,
        typer.Option(
            "--limit-files", help="Limit scanned files for development smoke runs."
        ),
    ] = None,
) -> None:
    repo_root = get_repo_root()
    game_data_dir = game_data or repo_root / ".steam-download" / "ancientkingdoms_Data"
    audit_dir = output_dir or repo_root / "exported-data" / "visual-audit"
    static_dir = audit_dir / "assets"

    static_assets, read_errors = build_static_index(
        game_data_dir,
        static_dir,
        extract_images=extract,
        limit_files=limit_files,
    )
    write_static_index(static_assets, static_dir / "index.json")
    write_read_errors(read_errors, static_dir / "read-errors.json")
    console.print(
        f"[green]OK[/green] Indexed {len(static_assets)} static visual assets"
    )
    console.print(f"[yellow]Read errors:[/yellow] {len(read_errors)}")


@app.command("probe")
def probe(
    ctx: typer.Context,
    domain: Annotated[
        list[str] | None,
        typer.Option(
            "--domain", help="Domain probe to run. Repeat for multiple domains."
        ),
    ] = None,
    hotrepl_client: Annotated[
        Path | None,
        typer.Option(
            "--hotrepl-client", help="Path to the HotRepl Python client project."
        ),
    ] = None,
    url: Annotated[
        str, typer.Option("--url", help="HotRepl WebSocket URL.")
    ] = "ws://localhost:18590",
    output_dir: Annotated[
        Path | None,
        typer.Option("--output-dir", help="Output directory for visual audit files."),
    ] = None,
    timeout_ms: Annotated[
        int,
        typer.Option("--timeout-ms", help="HotRepl eval timeout in milliseconds."),
    ] = 10000,
) -> None:
    repo_root = get_repo_root()
    domains = domain or DEFAULT_DOMAINS
    client_dir = hotrepl_client or default_hotrepl_client()
    runtime_dir = (
        output_dir or repo_root / "exported-data" / "visual-audit"
    ) / "runtime"
    runtime_dir.mkdir(parents=True, exist_ok=True)

    for domain_name in domains:
        rows = run_probe(
            domain_name, hotrepl_client=client_dir, url=url, timeout_ms=timeout_ms
        )
        output_path = runtime_dir / f"{domain_name}.json"
        output_path.write_text(json.dumps(rows, indent=2) + "\n")
        console.print(
            f"[green]OK[/green] Wrote {len(rows)} runtime references to {output_path}"
        )


@app.command("reconcile")
def reconcile(
    ctx: typer.Context,
    output_dir: Annotated[
        Path | None,
        typer.Option("--output-dir", help="Output directory for visual audit files."),
    ] = None,
) -> None:
    repo_root = get_repo_root()
    audit_dir = output_dir or repo_root / "exported-data" / "visual-audit"
    export_dir = resolve_path(ctx.obj, ctx.obj["paths"]["export_dir"])

    runtime_refs = _load_runtime_refs(audit_dir / "runtime")
    expected = _load_expected_visuals(export_dir, runtime_refs)
    static_assets = _load_static_assets(audit_dir / "assets" / "index.json")
    selections = select_visuals(expected, runtime_refs, static_assets)

    output_path = audit_dir / "selection.json"
    output_path.write_text(
        json.dumps(
            [selection.model_dump(mode="json") for selection in selections], indent=2
        )
        + "\n"
    )
    console.print(
        f"[green]OK[/green] Wrote {len(selections)} visual selections to {output_path}"
    )


@app.command("report")
def report(
    ctx: typer.Context,
    output_dir: Annotated[
        Path | None,
        typer.Option("--output-dir", help="Output directory for visual audit files."),
    ] = None,
) -> None:
    repo_root = get_repo_root()
    audit_dir = output_dir or repo_root / "exported-data" / "visual-audit"
    selection_path = audit_dir / "selection.json"
    selections = [
        VisualSelection.model_validate(row)
        for row in json.loads(selection_path.read_text())
    ]
    markdown = build_coverage_markdown(selections)
    output_path = audit_dir / "coverage.md"
    output_path.write_text(markdown)
    console.print(f"[green]OK[/green] Wrote coverage report to {output_path}")


@app.command("all")
def all_commands(
    ctx: typer.Context,
    game_data: Annotated[Path | None, typer.Option("--game-data")] = None,
    hotrepl_client: Annotated[Path | None, typer.Option("--hotrepl-client")] = None,
    url: Annotated[str, typer.Option("--url")] = "ws://localhost:18590",
    timeout_ms: Annotated[int, typer.Option("--timeout-ms")] = 10000,
) -> None:
    assets(ctx, game_data=game_data, output_dir=None, extract=True, limit_files=None)
    probe(
        ctx,
        domain=None,
        hotrepl_client=hotrepl_client,
        url=url,
        output_dir=None,
        timeout_ms=timeout_ms,
    )
    reconcile(ctx, output_dir=None)
    report(ctx, output_dir=None)


def _load_expected_visuals(
    export_dir: Path, runtime_refs: list[RuntimeReference]
) -> list[ExpectedVisual]:
    expected: list[ExpectedVisual] = []
    expected.extend(
        _expected_from_json(
            export_dir / "monsters.json", "monster", ["renderer", "animator"]
        )
    )
    expected.extend(_expected_from_items(export_dir / "items.json"))
    expected.extend(_expected_from_json(export_dir / "skills.json", "skill", ["icon"]))
    expected.extend(
        _expected_from_json(export_dir / "pets.json", "pet", ["icon", "renderer"])
    )
    expected.extend(
        _expected_from_json(export_dir / "npcs.json", "npc", ["renderer", "animator"])
    )
    expected.extend(
        ExpectedVisual(
            domain=ref.domain,
            entity_id=ref.entity_id,
            entity_name=ref.entity_name,
            visual_kind=ref.visual_kind,
        )
        for ref in runtime_refs
    )
    return _dedupe_expected(expected)


def _expected_from_items(path: Path) -> list[ExpectedVisual]:
    if not path.exists():
        return []
    rows = json.loads(path.read_text())
    expected: list[ExpectedVisual] = []
    for row in rows:
        entity_id = row.get("id")
        entity_name = row.get("name") or entity_id
        if not entity_id:
            continue
        expected.append(
            ExpectedVisual(
                domain="item",
                entity_id=entity_id,
                entity_name=entity_name,
                visual_kind="icon",
            )
        )
        item_type = row.get("item_type")
        if item_type == "treasure_map":
            expected.append(
                ExpectedVisual(
                    domain="item",
                    entity_id=entity_id,
                    entity_name=entity_name,
                    visual_kind="treasure_map_image",
                )
            )
        if item_type in {"weapon", "equipment"}:
            expected.append(
                ExpectedVisual(
                    domain="item",
                    entity_id=entity_id,
                    entity_name=entity_name,
                    visual_kind="equipment_path",
                )
            )
    return expected


def _expected_from_json(
    path: Path,
    domain: str,
    visual_kinds: list[str],
    predicate: Callable[[dict], bool] | None = None,
) -> list[ExpectedVisual]:
    if not path.exists():
        return []
    rows = json.loads(path.read_text())
    expected: list[ExpectedVisual] = []
    for row in rows:
        if predicate is not None and not predicate(row):
            continue
        entity_id = row.get("id")
        entity_name = row.get("name") or entity_id
        if not entity_id:
            continue
        for visual_kind in visual_kinds:
            expected.append(
                ExpectedVisual(
                    domain=domain,
                    entity_id=entity_id,
                    entity_name=entity_name,
                    visual_kind=visual_kind,
                )
            )
    return expected


def _dedupe_expected(expected: list[ExpectedVisual]) -> list[ExpectedVisual]:
    deduped: dict[tuple[str, str, str], ExpectedVisual] = {}
    for slot in expected:
        deduped[(slot.domain, slot.entity_id, slot.visual_kind)] = slot
    return list(deduped.values())


def _load_runtime_refs(runtime_dir: Path) -> list[RuntimeReference]:
    refs: list[RuntimeReference] = []
    for path in sorted(runtime_dir.glob("*.json")):
        refs.extend(
            RuntimeReference.model_validate(row) for row in json.loads(path.read_text())
        )
    return refs


def _load_static_assets(index_path: Path) -> list[StaticAsset]:
    payload = json.loads(index_path.read_text())
    return [StaticAsset.model_validate(row) for row in payload["assets"]]
