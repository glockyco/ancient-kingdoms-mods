"""Parser for Source: server-scripts provenance comments."""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

CITATION_EXTENSIONS = frozenset({".ts", ".js", ".svelte", ".py", ".sql", ".cs"})
_MAX_CONTINUATIONS = 2

_SOURCE_RE = re.compile(r"[Ss]ource:\s*server-scripts")
_FILE_RE = re.compile(
    r"(?:server-scripts(?:-[0-9][0-9.]*)?/)?"
    r"((?:[A-Za-z0-9_.]+/)*[A-Z][A-Za-z0-9_]*\.cs)"
    r"(?::("
    r"[0-9]+(?:-[0-9]+)?(?:,[0-9]+(?:-[0-9]+)?)*"
    r"|[A-Za-z_][A-Za-z0-9_]*"
    r"))?"
)
_RANGE_RE = re.compile(r"(?<![\w:.\-])(\d{2,5}(?:-\d{2,5})?)(?![\w.\-])")
_PAREN_RE = re.compile(r"\([^()]*\)")
_DASH_RE = re.compile(r" [—–] ")
_COMMENT_RE = re.compile(r"^\s*(?://|\*|#|--|<!--)\s*")
_LEADING_RANGE_RE = re.compile(r"\d{2,5}(?:-\d{2,5})?(?![\w.\-])")


@dataclass(frozen=True)
class Reference:
    """One file or line/symbol reference from a citation comment."""

    file: str
    locator: str | None
    source_path: str
    line: int
    col: int

    @property
    def is_symbol(self) -> bool:
        """Whether the locator names a member instead of a line."""
        return self.locator is not None and not self.locator[0].isdigit()


def _blank_parentheses(text: str) -> str:
    """Replace every parenthesized span with equal-length spaces."""
    while True:
        blanked = _PAREN_RE.sub(lambda match: " " * len(match.group()), text)
        if blanked == text:
            return text
        text = blanked


def _before_prose(text: str) -> str:
    """Return only the citation side of a prose dash."""
    match = _DASH_RE.search(text)
    return text[: match.start()] if match else text


def _parse_blob(blob: str) -> list[tuple[str, str | None, int]]:
    """Parse a citation block, returning file, locator and locator offset.

    References are emitted in positional order so that a bare range carries
    forward from the nearest preceding filename rather than the last one.
    """
    visible = _before_prose(_blank_parentheses(blob))
    file_matches = list(_FILE_RE.finditer(visible))
    file_spans = [match.span() for match in file_matches]

    tokens: list[tuple[int, bool, re.Match[str]]] = [
        (match.start(), True, match) for match in file_matches
    ]
    tokens += [
        (match.start(), False, match)
        for match in _RANGE_RE.finditer(visible)
        if not any(start <= match.start() < end for start, end in file_spans)
    ]
    tokens.sort(key=lambda token: token[0])

    references: list[tuple[str, str | None, int]] = []
    current_file: str | None = None
    for _, is_file, match in tokens:
        if is_file:
            current_file = match.group(1)
            locator = match.group(2)
            if locator is None:
                references.append((current_file, None, -1))
                continue
            offset = match.start(2)
            for part in locator.split(","):
                references.append((current_file, part, offset))
                offset += len(part) + 1
        elif current_file is not None:
            references.append((current_file, match.group(1), match.start(1)))
    return references


def parse_block(blob: str) -> list[tuple[str, str | None]]:
    """Parse one citation blob without source-file metadata."""
    return [(file_name, locator) for file_name, locator, _ in _parse_blob(blob)]


def _is_continuation(line: str) -> bool:
    """Whether a comment line extends a citation block.

    A continuation either names another script or opens with a bare line range.
    Requiring the range to *lead* the line keeps incidental prose numerals - for
    example a divisor inside a formula - from being read as line numbers.
    """
    match = _COMMENT_RE.match(line)
    if match is None:
        return False
    body = line[match.end() :]
    return ".cs" in body or _LEADING_RANGE_RE.match(body) is not None


def parse_file(path: Path, text: str) -> list[Reference]:
    """Parse all citations in a file's text."""
    lines = text.splitlines()
    references: list[Reference] = []
    index = 0
    while index < len(lines):
        source_match = _SOURCE_RE.search(lines[index])
        if source_match is None:
            index += 1
            continue

        end = index + 1
        block_lines = [lines[index][source_match.start() + 7 :]]
        for _ in range(_MAX_CONTINUATIONS):
            if (
                end >= len(lines)
                or "Source:" in lines[end]
                or not _is_continuation(lines[end])
            ):
                break
            block_lines.append(lines[end])
            end += 1

        block = "\n".join(block_lines)
        for file_name, locator, offset in _parse_blob(block):
            physical_line = index + 1
            if offset >= 0:
                line_offset = block.find(file_name)
                if line_offset >= 0:
                    locator_line = block[:offset].count("\n")
                    if locator_line:
                        physical_line += locator_line
                        col = offset - block.rfind("\n", 0, offset) - 1
                    else:
                        col = source_match.start() + 7 + offset
                else:
                    col = -1
            else:
                col = -1
            references.append(
                Reference(
                    file=file_name,
                    locator=locator,
                    source_path=path.as_posix(),
                    line=physical_line,
                    col=col,
                )
            )
        index = max(end, index + 1)
    return references


def iter_citation_files(repo_root: Path) -> list[Path]:
    """Return tracked files whose extensions can contain citations.

    Test files are excluded. A citation inside a test is a fixture exercising
    this parser, not a claim about game mechanics, so gating commits on it would
    make the checker's own test data drift-sensitive.
    """
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=repo_root,
        check=True,
        capture_output=True,
    )
    paths = [Path(raw) for raw in result.stdout.decode().split("\0") if raw]
    return [
        path
        for path in paths
        if path.suffix in CITATION_EXTENSIONS and "tests" not in path.parts
    ]
