"""Tracked JSON lockfile for citation provenance hashes."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class LockEntry:
    """One target's stored hash and region length."""

    sha256: str | None = None
    span: int = 0
    suspect: str | None = None

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> LockEntry:
        return cls(value.get("sha256"), int(value.get("span", 0)), value.get("suspect"))

    def to_dict(self) -> dict[str, Any]:
        value: dict[str, Any] = {"span": self.span}
        if self.sha256 is not None:
            value["sha256"] = self.sha256
        if self.suspect is not None:
            value["suspect"] = self.suspect
        return value


class Lockfile:
    """In-memory representation of the repository lockfile."""

    def __init__(
        self,
        version: int = 1,
        game_version: str | None = None,
        ilspycmd_version: str | None = None,
        targets: dict[str, LockEntry] | None = None,
    ) -> None:
        self.version = version
        self.game_version = game_version
        self.ilspycmd_version = ilspycmd_version
        self.targets = targets or {}

    @classmethod
    def load(cls, path: Path) -> Lockfile:
        with path.open(encoding="utf-8") as handle:
            value = json.load(handle)
        snapshot = value.get("snapshot", {})
        targets = {
            key: LockEntry.from_dict(entry)
            for key, entry in value.get("targets", {}).items()
        }
        return cls(
            version=int(value.get("version", 1)),
            game_version=snapshot.get("game_version"),
            ilspycmd_version=snapshot.get("ilspycmd_version"),
            targets=targets,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "snapshot": {
                "game_version": self.game_version,
                "ilspycmd_version": self.ilspycmd_version,
            },
            "targets": {
                key: entry.to_dict() for key, entry in sorted(self.targets.items())
            },
        }

    def dumps(self) -> str:
        return json.dumps(self.to_dict(), indent=2, sort_keys=True) + "\n"

    def save(self, path: Path) -> None:
        path.write_text(self.dumps(), encoding="utf-8")
