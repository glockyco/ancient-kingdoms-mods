"""Resolution and hashing for a local decompiled server-script snapshot."""

from __future__ import annotations

import hashlib
import re
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


@dataclass(frozen=True)
class SnapshotIdentity:
    """Metadata recorded by the snapshot generator."""

    game_version: str | None
    ilspycmd_version: str | None
    assembly_sha256: str | None
    generated_at: str | None


class UnresolvedCitationError(LookupError):
    """Raised when a cited server-script cannot be found."""


class AmbiguousCitationError(LookupError):
    """Raised when a bare filename maps to multiple snapshot files."""

    def __init__(self, cited: str, candidates: Sequence[str]) -> None:
        self.cited = cited
        self.candidates = tuple(candidates)
        super().__init__(
            f"Citation {cited!r} is ambiguous. Candidates: "
            + ", ".join(self.candidates)
        )


def digest(lines: Sequence[str]) -> str:
    """Hash lines after removing trailing whitespace only."""
    normalized = "\n".join(line.rstrip() for line in lines)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def is_substantive(lines: Sequence[str]) -> bool:
    """Whether a region contains code rather than blank or brace-only lines."""
    return any(any(char.isalnum() or char == "_" for char in line) for line in lines)


class Snapshot:
    """A local server-scripts directory."""

    def __init__(self, root: Path) -> None:
        self.root = root
        self._basename_index: dict[str, list[str]] | None = None

    @property
    def identity(self) -> SnapshotIdentity:
        """Read snapshot metadata, or return unknown identity when absent."""
        metadata_path = self.root / "SNAPSHOT.toml"
        if not metadata_path.exists():
            return SnapshotIdentity(None, None, None, None)
        with metadata_path.open("rb") as handle:
            metadata = tomllib.load(handle)
        return SnapshotIdentity(
            metadata.get("game_version"),
            metadata.get("ilspycmd_version"),
            metadata.get("assembly_sha256"),
            metadata.get("generated_at"),
        )

    def _build_basename_index(self) -> dict[str, list[str]]:
        if self._basename_index is None:
            index: dict[str, list[str]] = {}
            for path in self.root.rglob("*.cs"):
                relative = path.relative_to(self.root).as_posix()
                index.setdefault(path.name, []).append(relative)
            self._basename_index = index
        return self._basename_index

    def resolve(self, cited: str) -> str:
        """Resolve a cited path, preferring a literal snapshot-relative path."""
        candidate = self.root / cited
        if candidate.is_file() and candidate.suffix == ".cs":
            return candidate.relative_to(self.root).as_posix()

        basename = Path(cited).name
        candidates = self._build_basename_index().get(basename, [])
        if not candidates:
            raise UnresolvedCitationError(f"Citation {cited!r} was not found")
        if len(candidates) > 1:
            raise AmbiguousCitationError(cited, sorted(candidates))
        return candidates[0]

    def region(self, rel: str, locator: str) -> list[str]:
        """Return a 1-based line or line-range region."""
        path = self.root / rel
        lines = path.read_text(encoding="utf-8").splitlines()
        if not locator or not locator[0].isdigit():
            return []
        if "-" in locator:
            first_text, last_text = locator.split("-", 1)
        else:
            first_text = last_text = locator
        first, last = int(first_text), int(last_text)
        if first < 1 or last < first or first > len(lines):
            return []
        return lines[first - 1 : min(last, len(lines))]

    def digest(self, lines: Sequence[str]) -> str:
        """Hash a region using the snapshot's normalization rule."""
        return digest(lines)

    def contains_symbol(self, rel: str, symbol: str) -> bool:
        """Whether an identifier appears as a whole word in a script."""
        text = (self.root / rel).read_text(encoding="utf-8")
        return re.search(rf"\b{re.escape(symbol)}\b", text) is not None

    def locate(self, rel: str, sha: str, span: int) -> list[int]:
        """Find all 1-based window starts matching a region digest."""
        if span <= 0:
            return []
        lines = (self.root / rel).read_text(encoding="utf-8").splitlines()
        return [
            start + 1
            for start in range(0, len(lines) - span + 1)
            if digest(lines[start : start + span]) == sha
        ]
