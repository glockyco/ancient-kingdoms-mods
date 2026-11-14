"""Withhold Chambers riddle and rune-puzzle content until the developer permits it.

The questions, choices, clues, rune words and their orders are source content, and a
canonical rune order is already the solution. The publication policy in
`redactions.toml` lists, per family, the fields that may be published. The default is
nothing: a family with no policy entry, or an empty one, publishes no row and no field.

Fields have fixed meanings declared here. The policy can only name a field this module
knows, so a field the game adds later is not published until somebody classifies it,
and the loader rejects such a field in the export before it can reach a table.

Two mechanisms carry the gate:

- A family with no permitted field has every row named for removal in the closure,
  so the shared removal machinery deletes it, records it in the ledger and scrubs
  what refers to it.
- A family with some permitted fields keeps its rows and clears the others, like
  position suppression. `clear` counts the values it cleared for the ledger.

`verify_*` prove the result on every published surface, including the surfaces that
the website build writes after the pipeline exits.
"""

import gzip
import html
import json
import re
import sqlite3
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from rich.console import Console

from compendium.redactions.verify import Finding

console = Console()

MECHANISM = "challenge_gate"
REASON = "challenge content is withheld until its publication is permitted"


@dataclass(frozen=True)
class Family:
    """One challenge table, and the fields that carry its content."""

    table: str
    # Content fields, each with what it gives away. Every other column is a stable
    # identity and says nothing about the challenge.
    fields: dict[str, str]


FAMILIES: dict[str, Family] = {
    "riddles": Family(
        "chambers_riddles",
        {
            "question": "content",
            "choices": "content",
            "correct_answer_index": "solution",
        },
    ),
    "rune_puzzles": Family(
        "chambers_rune_puzzles",
        {
            "title": "content",
            "clue": "content",
            # The canonical word order is the solution.
            "rune_words": "solution",
            "solution_order": "solution",
        },
    ),
}


class ChallengePolicyError(ValueError):
    """The publication policy is missing or malformed, so nothing may be published."""


def parse_policy(data: dict[str, Any]) -> dict[str, frozenset[str]]:
    """Read the `[challenges]` tables of redactions.toml.

    A file without the section yields no entries, and a family without an entry
    publishes nothing. `require_policy` is the gate that makes the entries mandatory
    for a build. A table that is present must be valid: an unknown family, a missing
    list or a field this module does not know fails, so no typo opens a family.
    """
    section = data.get("challenges")
    if section is None:
        return {}
    if not isinstance(section, dict):
        raise ChallengePolicyError("redactions.toml [challenges] must be a table")
    unknown = sorted(set(section) - set(FAMILIES))
    if unknown:
        raise ChallengePolicyError(
            f"redactions.toml [challenges] names unknown families: {unknown}"
        )
    policy: dict[str, frozenset[str]] = {}
    for family, entry in section.items():
        definition = FAMILIES[family]
        permitted = entry.get("permitted_fields") if isinstance(entry, dict) else None
        if not isinstance(permitted, list) or not all(
            isinstance(f, str) for f in permitted
        ):
            raise ChallengePolicyError(
                f"redactions.toml [challenges.{family}] needs a permitted_fields list"
            )
        invalid = sorted(set(permitted) - set(definition.fields))
        if invalid:
            raise ChallengePolicyError(
                f"redactions.toml [challenges.{family}] permits unknown fields: {invalid}"
            )
        policy[family] = frozenset(permitted)
    return policy


def require_policy(policy: dict[str, frozenset[str]]) -> None:
    """Fail a build whose redactions.toml does not state every family's policy."""
    missing = sorted(set(FAMILIES) - set(policy))
    if missing:
        raise ChallengePolicyError(
            f"redactions.toml needs a [challenges.<family>] permitted_fields list for {missing}"
        )


def permitted(policy: dict[str, frozenset[str]], family: str) -> frozenset[str]:
    """The fields a family may publish. A family without an entry publishes nothing."""
    return policy.get(family, frozenset())


def _present(conn: sqlite3.Connection, table: str) -> bool:
    return (
        conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
        ).fetchone()
        is not None
    )


def seeds(
    conn: sqlite3.Connection, policy: dict[str, frozenset[str]]
) -> list[tuple[str, str]]:
    """The rows the closure removes: every row of a family that permits nothing."""
    found: list[tuple[str, str]] = []
    for family, definition in FAMILIES.items():
        if permitted(policy, family) or not _present(conn, definition.table):
            continue
        found += [
            (definition.table, row[0])
            for row in conn.execute(f"SELECT id FROM {definition.table} ORDER BY id")
        ]
    return found


def clear(
    conn: sqlite3.Connection, policy: dict[str, frozenset[str]]
) -> dict[str, int]:
    """Clear the fields a partially permitted family does not publish.

    Returns the number of values cleared for each family, for the ledger.
    """
    cleared: dict[str, int] = {}
    for family, definition in FAMILIES.items():
        allowed = permitted(policy, family)
        if not allowed or not _present(conn, definition.table):
            continue
        withheld = [name for name in definition.fields if name not in allowed]
        if not withheld:
            continue
        assignments = ", ".join(f"{name} = NULL" for name in withheld)
        count = conn.execute(f"SELECT count(*) FROM {definition.table}").fetchone()[0]
        conn.execute(f"UPDATE {definition.table} SET {assignments}")
        if count:
            cleared[family] = count * len(withheld)
    if cleared:
        console.print(
            "  [green]OK[/green] Withheld "
            f"{sum(cleared.values())} challenge values in {len(cleared)} families"
        )
    return cleared


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Signature:
    """Withheld text, as the phrase or the ordered words a published surface must not hold."""

    label: str
    # "text" is a phrase anywhere. "title" is a phrase that stands alone as a string,
    # a cell or an element, because a short title is also ordinary prose elsewhere.
    # "words" is an ordered list.
    kind: str
    parts: tuple[str, ...]


_ESCAPE = re.compile(r"\\u([0-9a-fA-F]{4})")
_TAG = re.compile(r"<[^>]*>")
_SPACE = re.compile(r"\s+")
# Between two words of a list there may be quotes, commas, markup and entities.
# Only the tag branch may consume "<", so the two branches never match the same text
# and a long run of punctuation cannot backtrack exponentially.
_SEPARATOR = r"(?:<[^>]*>|[^a-z0-9<])+"


def normalize(text: str) -> str:
    """Fold case, entities, JSON escapes and white space, so a phrase matches in any carrier."""
    text = html.unescape(text)
    text = _ESCAPE.sub(lambda match: chr(int(match.group(1), 16)), text)
    text = text.replace("\\'", "'").replace('\\"', '"').replace("\\n", " ")
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    return _SPACE.sub(" ", text).lower().strip()


def _sentences(text: str) -> list[str]:
    pieces = re.split(r"(?<=[.!?;:])\s+", text)
    return [piece for piece in pieces if len(piece.split()) >= 5]


def signatures(
    export: dict[str, Any], policy: dict[str, frozenset[str]]
) -> list[Signature]:
    """What the policy withholds from the raw export, in forms a surface scan can find.

    A single short word such as one choice proves nothing on its own, so choices and rune
    words are matched as the ordered list the game stores. The index of a correct answer
    has no text to match, and the table check covers it.
    """
    found: list[Signature] = []

    def text(label: str, value: str, kind: str = "text") -> None:
        phrase = normalize(value)
        found.append(Signature(label, kind, (phrase,)))
        if kind == "text":
            found.extend(
                Signature(label, "text", (normalize(sentence),))
                for sentence in _sentences(value)
            )

    def words(label: str, values: list[str]) -> None:
        if len(values) >= 2:
            found.append(Signature(label, "words", tuple(normalize(v) for v in values)))
        elif values:
            found.append(Signature(label, "text", (normalize(values[0]),)))

    riddles = permitted(policy, "riddles")
    for riddle in export.get("riddles", []):
        if "question" not in riddles:
            text(f"{riddle['id']}.question", riddle["question"])
        if "choices" not in riddles:
            words(f"{riddle['id']}.choices", list(riddle["choices"]))
    runes = permitted(policy, "rune_puzzles")
    for puzzle in export.get("rune_puzzles", []):
        if "title" not in runes:
            text(f"{puzzle['id']}.title", puzzle["title"], "title")
        if "clue" not in runes:
            text(f"{puzzle['id']}.clue", puzzle["clue"])
        canonical = list(puzzle["rune_words"])
        solved = [canonical[index] for index in puzzle["solution_order"]]
        if "rune_words" not in runes:
            words(f"{puzzle['id']}.rune_words", canonical)
        if "solution_order" not in runes and (
            solved != canonical or "rune_words" in runes
        ):
            words(f"{puzzle['id']}.solution_order", solved)
    unique: dict[tuple[str, tuple[str, ...]], Signature] = {}
    for signature in found:
        if all(len(part) >= 3 for part in signature.parts):
            unique.setdefault((signature.kind, signature.parts), signature)
    return list(unique.values())


# What may stand directly around a string that a surface carries on its own: a quote,
# a markup edge or the break between joined values.
_EDGE = "\"'`<>\x01"


def _compile(signature: Signature) -> re.Pattern[str] | None:
    if signature.kind == "words":
        return re.compile(_SEPARATOR.join(re.escape(part) for part in signature.parts))
    if signature.kind == "title":
        return re.compile(
            rf"(?:^|[{_EDGE}])\s*{re.escape(signature.parts[0])}\s*(?:$|[{_EDGE}])"
        )
    return None


def _boundaries(haystack: str, start: int, end: int) -> bool:
    before = haystack[start - 1] if start else " "
    after = haystack[end] if end < len(haystack) else " "
    return not before.isalnum() and not after.isalnum()


class Scanner:
    """Looks for withheld challenge content in text that a surface carries."""

    def __init__(self, signatures_: list[Signature]):
        self._signatures = signatures_
        self._patterns = [_compile(signature) for signature in signatures_]

    def labels(self, raw: str) -> list[str]:
        """The labels of every signature the text carries, each once."""
        if not self._signatures:
            return []
        flat = normalize(raw)
        bare = _SPACE.sub(" ", _TAG.sub(" ", flat))
        found: set[str] = set()
        for signature, pattern in zip(self._signatures, self._patterns, strict=True):
            if signature.label in found:
                continue
            if pattern is None:
                phrase = signature.parts[0]
                if phrase in flat or phrase in bare:
                    found.add(signature.label)
            elif signature.parts[0] not in flat:
                # Every match contains its first part verbatim, so a text without it
                # cannot match and the regular expression is skipped.
                continue
            elif signature.kind == "title":
                if pattern.search(flat):
                    found.add(signature.label)
            else:
                for match in pattern.finditer(flat):
                    if _boundaries(flat, match.start(), match.end()):
                        found.add(signature.label)
                        break
        return sorted(found)


def database_findings(
    conn: sqlite3.Connection,
    policy: dict[str, frozenset[str]],
    scanner: Scanner,
) -> list[Finding]:
    """Published rows and values that the policy withholds, in tables and in any text column."""
    findings: list[Finding] = []
    for family, definition in FAMILIES.items():
        if not _present(conn, definition.table):
            continue
        allowed = permitted(policy, family)
        if not allowed:
            for (identity,) in conn.execute(f"SELECT id FROM {definition.table}"):
                findings.append(Finding(definition.table, "", identity, "withheld row"))
            continue
        for name in definition.fields:
            if name in allowed:
                continue
            for (identity,) in conn.execute(
                f"SELECT id FROM {definition.table} WHERE {name} IS NOT NULL"
            ):
                findings.append(
                    Finding(definition.table, name, identity, "withheld field")
                )
    for (table,) in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).fetchall():
        columns = [
            row[1]
            for row in conn.execute(f'PRAGMA table_info("{table}")')
            if row[2].upper() in ("TEXT", "BLOB", "")
        ]
        if not columns:
            continue
        rows = conn.execute(
            f'SELECT rowid, {", ".join(columns)} FROM "{table}"'
        ).fetchall()
        values: list[tuple[int, str, str]] = []
        for row in rows:
            for column, value in zip(columns, row[1:], strict=True):
                if isinstance(value, bytes):
                    value = value.decode("utf-8", errors="ignore")
                if isinstance(value, str) and len(value) >= 3:
                    values.append((row[0], column, value))
        # One pass over the table finds a leak. Only a hit is localized to its value.
        if not scanner.labels("\x01".join(value for _, _, value in values)):
            continue
        for rowid, column, value in values:
            findings.extend(
                Finding(table, column, str(rowid), label)
                for label in scanner.labels(value)
            )
    return findings


def _read_text(path: Path) -> str:
    data = path.read_bytes()
    if path.suffix == ".gz":
        data = gzip.decompress(data)
    return data.decode("utf-8", errors="ignore")


def file_findings(path: Path, scanner: Scanner, surface: str) -> list[Finding]:
    """Withheld content in one file, a gzip copy included."""
    if not path.is_file():
        return []
    return [
        Finding(surface, "", path.name, label)
        for label in scanner.labels(_read_text(path))
    ]


TEXT_SUFFIXES = (".html", ".json", ".js", ".mjs", ".css", ".txt", ".xml", ".svg", ".gz")


def tree_findings(
    root: Path,
    scanner: Scanner,
    surface: str,
    suffixes: tuple[str, ...] = TEXT_SUFFIXES,
) -> list[Finding]:
    """Withheld content in every text file under a directory, gzip copies included."""
    if not root.exists():
        return []
    findings: list[Finding] = []
    for path in _files(root, suffixes):
        for label in scanner.labels(_read_text(path)):
            findings.append(
                Finding(surface, "", path.relative_to(root).as_posix(), label)
            )
    return findings


def _files(root: Path, suffixes: Iterable[str]) -> Iterator[Path]:
    wanted = tuple(suffixes)
    for path in sorted(root.rglob("*")):
        if path.is_file() and path.suffix in wanted:
            yield path


def load_export(session_dir: Path) -> dict[str, Any]:
    """The raw challenge records, from the private export."""
    path = session_dir / "chambers_of_chaos.json"
    return json.loads(path.read_text(encoding="utf-8"))


def verify_surfaces(
    website_dir: Path, session_dir: Path, policy: dict[str, frozenset[str]]
) -> tuple[list[Finding], list[str]]:
    """Scan every surface the website holds for withheld challenge content.

    The database, its gzip copy, the search index and its gzip copy are the
    browser's data. The build output holds the prerendered pages, their payloads
    and every script bundle, including the hashed gzip copies Vite emits for the
    browser database and search index. Returns the findings and the surfaces that
    are not built.
    """
    scanner = Scanner(signatures(load_export(session_dir), policy))
    findings: list[Finding] = []
    missing: list[str] = []
    data = website_dir / "data"
    for name, surface in (
        ("compendium.db", "database file"),
        ("compendium.db.gz", "compressed browser database"),
        ("search-index.json", "search index"),
        ("search-index.json.gz", "compressed search index"),
    ):
        path = data / name
        if path.is_file():
            findings += file_findings(path, scanner, surface)
        else:
            missing.append(surface)
    database = data / "compendium.db"
    if database.is_file():
        connection = sqlite3.connect(f"file:{database}?mode=ro", uri=True)
        try:
            findings += database_findings(connection, policy, scanner)
        finally:
            connection.close()
    built = website_dir / ".svelte-kit" / "output"
    if built.exists():
        findings += tree_findings(built, scanner, "build output")
    else:
        missing.append("build output")
    return findings, missing


class WithheldContentSurvives(Exception):
    """Published data still holds challenge content the policy withholds."""


def check_database(
    conn: sqlite3.Connection,
    policy: dict[str, frozenset[str]],
    session_dir: Path,
) -> None:
    """Fail the build when the staged database holds withheld challenge content.

    The rows and fields come from the policy, and the text scan covers every text
    column of every table, so a copy in a description or an artwork caption is found
    as well as a copy in a challenge table.
    """
    scanner = Scanner(signatures(load_export(session_dir), policy))
    findings = database_findings(conn, policy, scanner)
    if findings:
        lines = "\n  ".join(str(finding) for finding in sorted(findings, key=str))
        raise WithheldContentSurvives(
            f"{len(findings)} published values hold withheld challenge content:\n  {lines}"
        )
    console.print(
        "  [green]OK[/green] no published value holds withheld challenge content"
    )
