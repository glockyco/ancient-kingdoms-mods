"""Verify Source: citations against the local decompiled snapshot."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from rich.console import Console
from rich.markup import escape
from rich.table import Table

from compendium.citations import (
    AmbiguousCitationError,
    LockEntry,
    Lockfile,
    Reference,
    Snapshot,
    UnresolvedCitationError,
    claim_supported,
    is_substantive,
    iter_citation_files,
    parse_file,
)
from compendium.config import get_repo_root

console = Console()

LOCKFILE_NAME = "citations.lock.json"
# The citation path. A symlink to the current entry in the store below.
SNAPSHOT_DIR = "server-scripts"
# One entry per decompiled assembly, named `steam-<build id>-<digest>`.
STORE_DIR = ".decompiled"

FAILING_STATUSES = frozenset({"changed", "unresolved", "ambiguous", "unsupported"})
_STATUS_STYLE = {
    "ok": "green",
    "moved": "yellow",
    "changed": "red",
    "suspect": "magenta",
    "unresolved": "red",
    "ambiguous": "red",
    "unsupported": "red",
    "file-only": "cyan",
    "symbol": "cyan",
}


@dataclass
class Target:
    """A distinct cited region, with every reference that points at it."""

    key: str
    rel: str
    locator: str | None
    references: list[Reference]
    status: str = "ok"
    detail: str = ""
    sha256: str | None = None
    span: int = 0
    suspect: str | None = None
    moved_to: str | None = None


def _collect_references(repo_root: Path) -> list[Reference]:
    references: list[Reference] = []
    for relative in iter_citation_files(repo_root):
        path = repo_root / relative
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        if "ource:" not in text:
            continue
        references.extend(parse_file(relative, text))
    return references


def _build_targets(snapshot: Snapshot, references: list[Reference]) -> list[Target]:
    """Group references into distinct targets, resolving each cited path once."""
    targets: dict[str, Target] = {}
    resolutions: dict[str, tuple[str | None, str, str]] = {}

    for reference in references:
        if reference.file not in resolutions:
            try:
                resolutions[reference.file] = (
                    snapshot.resolve(reference.file),
                    "ok",
                    "",
                )
            except AmbiguousCitationError as error:
                resolutions[reference.file] = (
                    None,
                    "ambiguous",
                    ", ".join(error.candidates),
                )
            except UnresolvedCitationError:
                resolutions[reference.file] = (None, "unresolved", "no such script")

        rel, status, detail = resolutions[reference.file]
        key = (
            f"{rel or reference.file}:{reference.locator}"
            if reference.locator
            else (rel or reference.file)
        )
        target = targets.get(key)
        if target is None:
            target = Target(
                key=key,
                rel=rel or reference.file,
                locator=reference.locator,
                references=[],
                status=status,
                detail=detail,
            )
            targets[key] = target
        target.references.append(reference)

    return sorted(targets.values(), key=lambda target: target.key)


def _classify(snapshot: Snapshot, target: Target) -> None:
    """Hash a target's region and record whether it is usable as an anchor."""
    if target.status in FAILING_STATUSES:
        return
    if target.locator is None:
        target.status = "file-only"
        return
    if not target.locator[0].isdigit():
        # A symbol reference cannot be content-hashed, but it must at least name
        # something that exists, or a typo would pass silently forever.
        if not snapshot.contains_symbol(target.rel, target.locator):
            target.status = "unresolved"
            target.detail = f"no symbol named {target.locator!r} in {target.rel}"
            return
        target.status = "symbol"
        return

    region = snapshot.region(target.rel, target.locator)
    if not region:
        target.status = "suspect"
        target.suspect = "cited lines are outside the file"
        return
    if not is_substantive(region):
        target.status = "suspect"
        target.suspect = "cited region is blank or brace-only"
        return

    target.sha256 = snapshot.digest(region)
    target.span = len(region)


def _check_claims(snapshot: Snapshot, targets: list[Target]) -> None:
    """Flag citations whose prose names code none of their regions contain.

    A claim belongs to the comment, not to each locator inside it: one comment
    routinely cites a call site and the method it calls, and only one of those
    holds the identifier. So the regions of a comment are pooled before the
    claim is tested, and a target is only flagged when every comment pointing at
    it fails. That keeps the rule aimed at genuine drift rather than at the
    normal habit of citing several places at once.
    """
    by_target = {target.key: target for target in targets}
    comments: dict[tuple[str, int], dict[str, object]] = {}
    for target in targets:
        if target.status in FAILING_STATUSES or target.locator is None:
            continue
        if not target.locator[0].isdigit():
            continue
        for reference in target.references:
            if not reference.claim:
                continue
            group = comments.setdefault(
                (reference.source_path, reference.line),
                {"claim": reference.claim, "keys": set(), "context": []},
            )
            keys = group["keys"]
            assert isinstance(keys, set)
            if target.key in keys:
                continue
            keys.add(target.key)
            context = group["context"]
            assert isinstance(context, list)
            context.extend(snapshot.region(target.rel, target.locator))
            context.extend(snapshot.enclosing_declaration(target.rel, target.locator))

    failed: dict[str, str] = {}
    satisfied: set[str] = set()
    for group in comments.values():
        claim = group["claim"]
        context = group["context"]
        keys = group["keys"]
        assert isinstance(claim, str) and isinstance(context, list)
        assert isinstance(keys, set)
        if claim_supported(claim, context):
            satisfied |= keys
        else:
            for key in keys:
                failed.setdefault(key, claim)

    for key, claim in failed.items():
        if key in satisfied:
            continue
        target = by_target[key]
        target.status = "unsupported"
        target.detail = f"claim names code absent from the cited region: {claim[:80]!r}"


def _shift(locator: str, start: int) -> str:
    """Rewrite a locator so it begins at a new start line, keeping its length."""
    if "-" not in locator:
        return str(start)
    first, last = locator.split("-", 1)
    return f"{start}-{start + (int(last) - int(first))}"


def _compare(snapshot: Snapshot, target: Target, entry: LockEntry | None) -> None:
    """Compare a freshly hashed target against its recorded anchor."""
    if entry is None:
        target.status = "changed"
        target.detail = "not in lockfile; run 'citations sync'"
        return
    if entry.suspect is not None:
        target.status = "suspect"
        target.suspect = entry.suspect
        return
    if target.status in {"file-only", "symbol"}:
        return
    if target.status in {"suspect", "unsupported"}:
        return
    if entry.sha256 is None:
        target.status = "changed"
        target.detail = "lockfile entry has no hash"
        return
    if target.sha256 == entry.sha256:
        target.status = "ok"
        return

    assert target.locator is not None
    hits = snapshot.locate(target.rel, entry.sha256, entry.span)
    if len(hits) == 1:
        target.status = "moved"
        target.moved_to = _shift(target.locator, hits[0])
        target.detail = f"{target.locator} -> {target.moved_to}"
    elif len(hits) > 1:
        target.status = "ambiguous"
        target.detail = f"content matches {len(hits)} regions: {hits[:5]}"
    else:
        target.status = "changed"
        target.detail = "cited code no longer matches the recorded hash"


def _print_summary(targets: list[Target], title: str) -> None:
    counts = Counter(target.status for target in targets)
    table = Table(title=title, show_header=True, header_style="bold cyan")
    table.add_column("Status", style="white")
    table.add_column("Targets", justify="right")
    for status in sorted(counts):
        table.add_row(
            f"[{_STATUS_STYLE.get(status, 'white')}]{status}[/]", f"{counts[status]:,}"
        )
    table.add_row("[bold]total[/bold]", f"[bold]{len(targets):,}[/bold]")
    console.print()
    console.print(table)


def _print_problems(targets: list[Target]) -> None:
    problems = [
        target
        for target in targets
        if target.status not in {"ok", "file-only", "symbol"}
    ]
    if not problems:
        return
    console.print()
    for target in problems:
        style = _STATUS_STYLE.get(target.status, "white")
        detail = target.detail or target.suspect or ""
        origin = target.references[0]
        console.print(
            f"  [{style}]{target.status:<10}[/] {escape(target.key)}"
            + (f"  [dim]{escape(detail)}[/dim]" if detail else "")
            + f"  [dim]({escape(origin.source_path)}:{origin.line})[/dim]"
        )


def _tool_mismatch(snapshot: Snapshot, lock: Lockfile) -> str | None:
    """Detect a snapshot produced by a different decompiler than the lockfile."""
    recorded = lock.ilspycmd_version
    actual = snapshot.identity.ilspycmd_version
    if recorded is None or actual is None or recorded == actual:
        return None
    return (
        f"snapshot was produced by ilspycmd {actual} but the lockfile was "
        f"anchored with {recorded}; regenerate with the pinned version, or "
        f"review the tool bump and re-anchor with 'citations sync'"
    )


def _load(repo_root: Path) -> tuple[Snapshot, list[Target]] | None:
    snapshot_root = repo_root / SNAPSHOT_DIR
    if not snapshot_root.is_dir():
        console.print(f"[red]Error:[/red] Snapshot not found: {snapshot_root}")
        console.print(
            "Run [cyan]scripts/update-server-scripts.sh <version>[/cyan] first"
        )
        return None
    snapshot = Snapshot(snapshot_root)
    targets = _build_targets(snapshot, _collect_references(repo_root))
    for target in targets:
        _classify(snapshot, target)
    _check_claims(snapshot, targets)
    return snapshot, targets


def _check(repo_root: Path) -> int:
    loaded = _load(repo_root)
    if loaded is None:
        return 1
    snapshot, targets = loaded

    lock_path = repo_root / LOCKFILE_NAME
    if not lock_path.exists():
        console.print(f"[red]Error:[/red] {LOCKFILE_NAME} not found")
        console.print("Run [cyan]compendium citations sync --game-version <v>[/cyan]")
        return 1
    lock = Lockfile.load(lock_path)

    mismatch = _tool_mismatch(snapshot, lock)
    if mismatch is not None:
        console.print(f"[red]Error (tool-mismatch):[/red] {mismatch}")
        return 1

    for target in targets:
        _compare(snapshot, target, lock.targets.get(target.key))

    _print_summary(targets, "Citation Provenance")
    _print_problems(targets)

    failing = [target for target in targets if target.status in FAILING_STATUSES]
    console.print()
    if failing:
        console.print(f"[red]{len(failing)} citation(s) need attention.[/red]")
        return 1
    console.print("[green]All citations verified.[/green]")
    return 0


def _sync(repo_root: Path, game_version: str | None) -> int:
    if not game_version:
        console.print("[red]Error:[/red] --game-version is required")
        return 1
    loaded = _load(repo_root)
    if loaded is None:
        return 1
    snapshot, targets = loaded

    identity = snapshot.identity
    if identity.game_version is not None and identity.game_version != game_version:
        console.print(
            f"[red]Error:[/red] snapshot reports game version "
            f"{identity.game_version} but --game-version says {game_version}"
        )
        return 1

    lock = Lockfile(
        game_version=game_version,
        ilspycmd_version=identity.ilspycmd_version,
        targets={
            target.key: LockEntry(target.sha256, target.span, target.suspect)
            for target in targets
        },
    )
    lock.save(repo_root / LOCKFILE_NAME)

    _print_summary(targets, f"Anchored {LOCKFILE_NAME} at {game_version}")
    _print_problems(targets)
    console.print()
    console.print(f"Wrote [cyan]{repo_root / LOCKFILE_NAME}[/cyan]")
    return 0


def _fix(repo_root: Path) -> int:
    loaded = _load(repo_root)
    if loaded is None:
        return 1
    snapshot, targets = loaded

    lock_path = repo_root / LOCKFILE_NAME
    if not lock_path.exists():
        console.print(f"[red]Error:[/red] {LOCKFILE_NAME} not found")
        return 1
    lock = Lockfile.load(lock_path)

    mismatch = _tool_mismatch(snapshot, lock)
    if mismatch is not None:
        console.print(f"[red]Error (tool-mismatch):[/red] {mismatch}")
        return 1

    for target in targets:
        _compare(snapshot, target, lock.targets.get(target.key))

    edits: dict[str, list[tuple[int, int, str, str]]] = {}
    rekeys: dict[str, str] = {}
    for target in targets:
        if target.status != "moved" or target.moved_to is None:
            continue
        rekeys[target.key] = f"{target.rel}:{target.moved_to}"
        for reference in target.references:
            if reference.col < 0 or reference.locator is None:
                continue
            edits.setdefault(reference.source_path, []).append(
                (reference.line, reference.col, reference.locator, target.moved_to)
            )

    if not edits:
        console.print("[green]Nothing to relocate.[/green]")
        return 0

    rewritten = 0
    for source_path, changes in sorted(edits.items()):
        path = repo_root / source_path
        lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
        # Apply right-to-left so earlier columns keep their offsets.
        for line_no, col, old, new in sorted(changes, reverse=True):
            line = lines[line_no - 1]
            if line[col : col + len(old)] != old:
                console.print(
                    f"[yellow]skip[/yellow] {escape(source_path)}:{line_no} "
                    f"expected {escape(repr(old))} at column {col}"
                )
                continue
            lines[line_no - 1] = line[:col] + new + line[col + len(old) :]
            rewritten += 1
        path.write_text("".join(lines), encoding="utf-8")

    console.print(f"[green]Relocated {rewritten} reference(s).[/green]")

    # Re-key the lockfile in place. The content is byte-identical - only its
    # position moved - so the recorded hash and span carry over unchanged and no
    # game version is needed to re-anchor.
    for old_key, new_key in rekeys.items():
        entry = lock.targets.pop(old_key, None)
        if entry is not None:
            lock.targets[new_key] = entry
    lock.save(lock_path)
    console.print(
        f"Re-anchored {len(rekeys)} target(s) in [cyan]{LOCKFILE_NAME}[/cyan]."
    )
    return 0


def _archived_snapshots(repo_root: Path) -> list[tuple[str, Snapshot]]:
    """Stored decompiles other than the current one, newest first.

    Store entries are named `steam-<build id>-<digest>`, so the build identifier
    orders them chronologically. An entry whose build identifier was never
    recorded sorts last, because nothing places it in that sequence. The entry the
    citation path resolves to is the current snapshot rather than an archive, so it
    is excluded: locating a region in a tree identical to the current one proposes
    the position it already has.
    """
    store = repo_root / STORE_DIR
    if not store.is_dir():
        return []

    current = (repo_root / SNAPSHOT_DIR).resolve()

    def build_key(path: Path) -> tuple[int, int]:
        parts = path.name.split("-")
        if len(parts) >= 3 and parts[1].isdigit():
            return (1, int(parts[1]))
        return (0, 0)

    directories = [
        entry
        for entry in store.iterdir()
        if entry.is_dir() and entry.resolve() != current
    ]
    directories.sort(key=build_key, reverse=True)
    return [
        (Snapshot(entry).identity.game_version or entry.name, Snapshot(entry))
        for entry in directories
    ]


def _suggest(repo_root: Path) -> int:
    loaded = _load(repo_root)
    if loaded is None:
        return 1
    snapshot, targets = loaded

    lock_path = repo_root / LOCKFILE_NAME
    if lock_path.exists():
        lock = Lockfile.load(lock_path)
        for target in targets:
            _compare(snapshot, target, lock.targets.get(target.key))

    wanted = [
        target
        for target in targets
        if target.status in {"suspect", "changed"} and target.locator is not None
    ]
    if not wanted:
        console.print("[green]No suspect or changed citations to investigate.[/green]")
        return 0

    archives = _archived_snapshots(repo_root)
    console.print()
    console.print(
        f"Investigating {len(wanted)} citation(s) across {len(archives)} archived snapshot(s)."
    )
    console.print()

    found = 0
    for target in wanted:
        assert target.locator is not None
        proposal = None
        for version, archive in archives:
            source = archive.root / target.rel
            if not source.is_file():
                continue
            region = archive.region(target.rel, target.locator)
            if not region or not is_substantive(region):
                continue
            hits = snapshot.locate(target.rel, archive.digest(region), len(region))
            if len(hits) == 1:
                proposal = (version, hits[0], region[0].strip())
                break
        origin = target.references[0]
        if proposal is None:
            console.print(
                f"  [red]none[/red]      {escape(target.key)}"
                f"  [dim]({escape(origin.source_path)}:{origin.line})[/dim]"
            )
            continue
        version, start, first = proposal
        found += 1
        console.print(
            f"  [green]{target.locator} -> {_shift(target.locator, start)}[/green]"
            f"  {escape(target.rel)}  [dim](via {version})[/dim]"
        )
        console.print(
            f"      [dim]{escape(first)}[/dim]  "
            f"[dim]({escape(origin.source_path)}:{origin.line})[/dim]"
        )

    console.print()
    console.print(f"Proposed a relocation for {found} of {len(wanted)} citation(s).")
    console.print(
        "[yellow]Proposals only. Verify each against the citation's own claim before editing.[/yellow]"
    )
    return 0


def run(config: dict, action: str, *, game_version: str | None = None) -> int:
    """Run a citations action. Returns a process exit code."""
    del config
    repo_root = get_repo_root()
    if action == "check":
        return _check(repo_root)
    if action == "sync":
        return _sync(repo_root, game_version)
    if action == "fix":
        return _fix(repo_root)
    if action == "suggest":
        return _suggest(repo_root)
    console.print(f"[red]Error:[/red] unknown action {action!r}")
    return 1
