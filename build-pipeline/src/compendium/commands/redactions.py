"""Record and verify what redaction removes.

`check` recomputes the decisions from the export and compares them against the
committed ledger. It loads the exports into a temporary database and stops at
the point the closure runs, so it reaches the same answer as a build without
writing the published database.
"""

import sqlite3
import tempfile
from pathlib import Path

from rich.console import Console
from rich.table import Table

from compendium.config import get_repo_root
from compendium.db import create_database
from compendium.denormalizers import run_before_closure
from compendium.redactions import closure, verify
from compendium.redactions.config import load_redactions
from compendium.redactions.ledger import (
    LEDGER_NAME,
    Entry,
    Ledger,
    UnknownKeySpace,
    compare,
)
from compendium.redactions.placement import stem

console = Console()


def _removals(
    repo_root: Path, config: dict
) -> tuple[list[closure.Removal], dict[str, int], dict[str, int]]:
    """The removals the current export and configuration produce."""
    from compendium.commands.build import load_all

    export_dir = repo_root / config["paths"]["export_dir"]
    schema_path = repo_root / "build-pipeline" / "schema.sql"

    with tempfile.TemporaryDirectory() as directory:
        conn = create_database(Path(directory) / "recompute.db", schema_path)
        try:
            # Without a static directory the loaders record their manifest rows
            # and write no file, so this reads the export without publishing.
            load_all(conn, export_dir)
            redactions, suppressed, hidden_crafting = run_before_closure(conn)
            removals, _ = closure.decide(conn, redactions)
        finally:
            conn.close()

    return removals, suppressed, hidden_crafting


def _recompute(repo_root: Path, config: dict) -> Ledger:
    """Work out what the current export and configuration remove."""
    removals, suppressed, hidden_crafting = _removals(repo_root, config)

    return Ledger(
        removed={
            removal.key: Entry(
                key=removal.key,
                mechanism=removal.mechanism,
                reason=removal.reason,
                distance=removal.distance,
                via=tuple(removal.via),
            )
            for removal in removals
        },
        suppressed_zones=suppressed,
        hidden_crafting=hidden_crafting,
    )


def _ledger_path(repo_root: Path) -> Path:
    return repo_root / LEDGER_NAME


def _read_ledger(repo_root: Path) -> Ledger | None:
    """The recorded ledger, or None with the reason printed."""
    try:
        recorded = Ledger.read(_ledger_path(repo_root))
    except UnknownKeySpace as unusable:
        console.print(f"[red]{unusable}[/red]")
        return None
    if recorded is None:
        console.print(f"[red]No {LEDGER_NAME}. Run `compendium redactions sync`.[/red]")
    return recorded


def _summarise(ledger: Ledger) -> None:
    counts: dict[str, int] = {}
    for entry in ledger.removed.values():
        counts[entry.mechanism] = counts.get(entry.mechanism, 0) + 1

    table = Table(title="Redaction ledger")
    table.add_column("Mechanism")
    table.add_column("Entities", justify="right")
    for mechanism in sorted(counts):
        table.add_row(mechanism, str(counts[mechanism]))
    table.add_row("[bold]total", f"[bold]{len(ledger.removed)}")
    console.print(table)

    for zone, cleared in sorted(ledger.suppressed_zones.items()):
        console.print(f"  positions suppressed in {zone}: {cleared} values")
    for item, removed in sorted(ledger.hidden_crafting.items()):
        console.print(f"  crafting hidden for {item}: {removed} recipes")


def _check(repo_root: Path, config: dict) -> int:
    recorded = _read_ledger(repo_root)
    if recorded is None:
        return 1

    current = _recompute(repo_root, config)
    differences = compare(recorded, current)

    if not differences:
        console.print(
            f"[green]OK[/green] {len(recorded.removed)} recorded removals match "
            "the current data"
        )
        return 0

    console.print(f"[red]{len(differences)} decisions differ from {LEDGER_NAME}[/red]")
    for difference in differences:
        console.print(f"  {difference}")
    console.print("\nRun `compendium redactions sync` to accept these changes.")
    return 1


def _sync(repo_root: Path, config: dict, game_version: str) -> int:
    # The version is required rather than inherited from the ledger. Carrying the
    # recorded value forward stamped decisions taken against one export with the
    # version of an older one, and nothing reported the difference.
    path = _ledger_path(repo_root)

    current = _recompute(repo_root, config)
    current.game_version = game_version
    current.write(path)

    console.print(f"[green]Wrote[/green] {path.name} for game {game_version}")
    _summarise(current)
    return 0


def _scan_identifiers(repo_root: Path, config: dict) -> set[str]:
    """What the verification must not find, in the form published data carries it.

    These are the published identifiers of the current removals, and never the
    recorded ledger's keys: a placement is recorded under where it stands, and a
    ledger that has not been synced names the previous removals.
    """
    removals, _, _ = _removals(repo_root, config)
    return {removal.entity_id for removal in removals}


def _verify(repo_root: Path, config: dict) -> int:
    """Scan the surfaces the website build produces after the pipeline exits.

    The identifiers come from the removals the current data produces, in the
    form the published data carries them. Taking them from the recorded ledger
    made the proof conditional on the ledger being synced, which is exactly when
    it is not: during the 0.9.31.0 update this reported a clean result while two
    unreleased armour set bonuses were published, because the recorded set
    predated them.
    """
    identifiers = _scan_identifiers(repo_root, config)
    website_dir = repo_root / config["paths"]["website_dir"]
    search_db = website_dir / "data" / "search.db"
    images = website_dir / "static" / "images"
    prerendered = website_dir / ".svelte-kit" / "output" / "prerendered"

    findings: list[verify.Finding] = []
    missing: list[str] = []

    if search_db.exists():
        conn = sqlite3.connect(search_db)
        try:
            findings += verify.scan(conn, identifiers)
        finally:
            conn.close()
    else:
        missing.append("search.db")

    if images.exists():
        findings += verify.path_findings(images, identifiers)
    else:
        missing.append("static/images")

    if prerendered.exists():
        findings += verify.content_findings(
            prerendered, identifiers, (".html", ".json", ".js")
        )
    else:
        missing.append("prerendered output")

    for surface in missing:
        console.print(f"  [yellow]skipped[/yellow] {surface} is not built")

    surviving = verify.report(findings, load_redactions().allowances)
    if surviving:
        console.print(f"[red]{len(surviving)} published values name removed content")
        for finding in sorted(surviving, key=str)[:40]:
            console.print(f"  {finding}")
        return 1

    console.print(
        f"[green]OK[/green] no published surface names any of "
        f"{len(identifiers)} removed entities"
    )
    return 0


def _explain(repo_root: Path, entity_id: str) -> int:
    recorded = _read_ledger(repo_root)
    if recorded is None:
        return 1

    # A placement is recorded under where it stands, so neither its published
    # identifier nor a bare entity name is a recorded key. Both reach it through
    # the part of the identifier that survives a build.
    wanted = {entity_id, stem(entity_id)}
    matches = [
        entry
        for key, entry in sorted(recorded.removed.items())
        if key == entity_id
        or key.split(":", 1)[1] in wanted
        or key.split(":", 1)[1].split("@", 1)[0] in wanted
    ]
    if not matches:
        console.print(f"{entity_id} is not recorded as removed")
        return 1

    for entry in matches:
        console.print(f"[bold]{entry.key}[/bold]")
        console.print(f"  mechanism: {entry.mechanism}")
        console.print(f"  reason:    {entry.reason}")
        if entry.mechanism == "cascade":
            console.print(f"  pass:      {entry.distance}")
            console.print("  followed:")
            for parent in entry.via:
                console.print(f"    {parent}")
                _explain_parent(recorded, parent, depth=2)
    return 0


def _explain_parent(ledger: Ledger, key: str, depth: int) -> None:
    """Print the chain behind one parent, so the reason reaches a seed."""
    if depth > 6:
        return
    entry = ledger.removed.get(key)
    if entry is None:
        return
    indent = "    " * depth
    console.print(f"{indent}{entry.mechanism}: {entry.reason}")
    for parent in entry.via:
        console.print(f"{indent}  {parent}")
        _explain_parent(ledger, parent, depth + 1)


def run(
    config: dict,
    action: str,
    *,
    game_version: str | None = None,
    entity_id: str | None = None,
) -> int:
    """Run a redactions action. Returns a process exit code."""
    repo_root = get_repo_root()

    if action == "check":
        return _check(repo_root, config)
    if action == "verify":
        return _verify(repo_root, config)
    if action == "sync":
        if not game_version:
            console.print("[red]Error:[/red] --game-version is required")
            return 1
        return _sync(repo_root, config, game_version)
    if action == "explain":
        if not entity_id:
            console.print("[red]Name an entity to explain.[/red]")
            return 1
        return _explain(repo_root, entity_id)

    console.print(f"[red]Unknown action: {action}[/red]")
    return 1
