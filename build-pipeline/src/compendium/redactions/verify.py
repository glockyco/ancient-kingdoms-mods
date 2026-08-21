"""Check that no published value names removed content.

The closure decides what to remove. This pass reads the result. It reads every
column of every table, so it also finds a reference form that no declaration
covers.

Two rules define a match.

The first rule matches a whole identifier. `key_to_old_valorath` contains
`old_valorath`, and the build publishes it on purpose. A match therefore counts
only when neither neighbouring character belongs to an identifier. The same rule
rejects the prose "divine essence" for the identifier `divine_essence`. An SQL
`LIKE` pattern reports that prose, because `_` is a single-character wildcard.

The second rule matches identifiers and not names. Prose that names a redacted
zone remains published, so a display name is not a match.
"""

import sqlite3
from dataclasses import dataclass
from pathlib import Path

from rich.console import Console

from .references import Reference

console = Console()

IDENTIFIER_CHARACTERS = set(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"
)


@dataclass(frozen=True)
class Finding:
    """One published value that still names removed content."""

    table: str
    column: str
    row: str
    identifier: str

    def __str__(self) -> str:
        # A file has no column, and its row is a path.
        if not self.column:
            return f"{self.table} {self.row} names {self.identifier}"
        return f"{self.table}.{self.column} row {self.row} names {self.identifier}"


@dataclass(frozen=True)
class Allowance:
    """An intended match, and the reason for it."""

    table: str
    column: str
    identifier: str
    reason: str

    def covers(self, finding: Finding) -> bool:
        return (
            self.table == finding.table
            and self.column == finding.column
            and self.identifier == finding.identifier
        )


@dataclass(frozen=True)
class Subject:
    """What the verification must not find.

    The closure collects this before it deletes any row. A removed zone cannot
    be looked up for its number afterwards.
    """

    identifiers: set[str]
    zone_numbers: set[int]
    allowances: list[Allowance]


class SurvivingReference(Exception):
    """Published content still names removed content."""


def _holds_identifier(haystack: str, needle: str) -> bool:
    """Whether the text contains the identifier and not a longer one.

    A neighbouring identifier character means the match is part of a different
    name. This rule prevents a report of `old_valorath` inside
    `key_to_old_valorath`.
    """
    start = haystack.find(needle)
    while start != -1:
        before = haystack[start - 1] if start > 0 else ""
        after_index = start + len(needle)
        after = haystack[after_index] if after_index < len(haystack) else ""
        if before not in IDENTIFIER_CHARACTERS and after not in IDENTIFIER_CHARACTERS:
            return True
        start = haystack.find(needle, start + 1)
    return False


def _text_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    """The columns that can hold a name. A numeric column cannot hold one."""
    return [
        row[1]
        for row in conn.execute(f"PRAGMA table_info({table})")
        if row[2].upper() in ("TEXT", "BLOB", "")
    ]


def _tables(conn: sqlite3.Connection) -> list[str]:
    return sorted(
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' "
            "AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%'"
        )
    )


def _row_name(conn: sqlite3.Connection, table: str) -> str:
    """The column that names a row in a report, or the rowid."""
    columns = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
    return "id" if "id" in columns else "rowid"


def scan(conn: sqlite3.Connection, identifiers: set[str]) -> list[Finding]:
    """Every published value that names one of the identifiers."""
    if not identifiers:
        return []

    wanted = sorted(identifiers)
    findings: list[Finding] = []

    for table in _tables(conn):
        columns = _text_columns(conn, table)
        if not columns:
            continue
        key = _row_name(conn, table)
        statement = f"SELECT {key}, {', '.join(columns)} FROM {table}"
        for row in conn.execute(statement):
            for position, column in enumerate(columns, start=1):
                value = row[position]
                if isinstance(value, bytes):
                    value = value.decode("utf-8", errors="ignore")
                if not isinstance(value, str) or not value:
                    continue
                for identifier in wanted:
                    if _holds_identifier(value, identifier):
                        findings.append(Finding(table, column, str(row[0]), identifier))
    return findings


def numeric_findings(
    conn: sqlite3.Connection,
    zone_numbers: set[int],
    references: list[Reference],
) -> list[Finding]:
    """Zone references written as a number. The text scan does not cover them.

    The declared references name these columns, so a schema addition reaches
    this pass without an edit here.
    """
    if not zone_numbers:
        return []

    placeholders = ",".join("?" * len(zone_numbers))
    parameters = tuple(sorted(zone_numbers))
    findings: list[Finding] = []

    for reference in references:
        if not reference.numeric or reference.embedded:
            continue
        key = _row_name(conn, reference.table)
        for row in conn.execute(
            f"SELECT {key}, {reference.column} FROM {reference.table} "
            f"WHERE {reference.column} IN ({placeholders})",
            parameters,
        ):
            findings.append(
                Finding(reference.table, reference.column, str(row[0]), str(row[1]))
            )
    return findings


def path_findings(
    root: Path, identifiers: set[str], surface: str = "images"
) -> list[Finding]:
    """Published files whose path names removed content.

    `reconcile` deletes the file for a removed entity. This pass reads the
    directory afterwards, so a file that no database row points at is also
    found.
    """
    if not identifiers or not root.exists():
        return []

    wanted = sorted(identifiers)
    findings: list[Finding] = []
    for path in sorted(root.rglob("*")):
        if path.is_dir():
            continue
        relative = path.relative_to(root).as_posix()
        for identifier in wanted:
            if _holds_identifier(relative, identifier):
                findings.append(Finding(surface, "", relative, identifier))
    return findings


def content_findings(
    root: Path,
    identifiers: set[str],
    suffixes: tuple[str, ...],
    surface: str = "prerendered",
) -> list[Finding]:
    """Published text that names removed content.

    The prerendered pages and their payloads are written after the pipeline
    exits, so this pass reads them from disk.
    """
    if not identifiers or not root.exists():
        return []

    wanted = sorted(identifiers)
    findings: list[Finding] = []
    for path in sorted(root.rglob("*")):
        if path.suffix not in suffixes or not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        relative = path.relative_to(root).as_posix()
        for identifier in wanted:
            if _holds_identifier(text, identifier):
                findings.append(Finding(surface, "", relative, identifier))
    return findings


def report(findings: list[Finding], allowances: list[Allowance]) -> list[Finding]:
    """The findings that no allowance covers."""
    return [
        finding
        for finding in findings
        if not any(allowance.covers(finding) for allowance in allowances)
    ]


def check(
    conn: sqlite3.Connection,
    subject: Subject,
    references: list[Reference],
    published_files: Path | None = None,
) -> None:
    """Report every published value that names removed content.

    Raises `SurvivingReference`, which fails the build.
    """
    found = scan(conn, subject.identifiers)
    found += numeric_findings(conn, subject.zone_numbers, references)
    if published_files is not None:
        found += path_findings(published_files, subject.identifiers)
    surviving = report(found, subject.allowances)

    if surviving:
        lines = "\n  ".join(str(finding) for finding in sorted(surviving, key=str))
        raise SurvivingReference(
            f"{len(surviving)} published values name removed content:\n  {lines}"
        )

    console.print(
        f"  [green]OK[/green] no published value names any of "
        f"{len(subject.identifiers)} removed identifiers"
    )
