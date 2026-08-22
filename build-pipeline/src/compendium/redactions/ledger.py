"""The record of what redaction removed, and why.

The invariant check proves that nothing excluded survived. This ledger proves
that nothing was excluded by accident. A change in what the build removes
arrives as a reviewable diff, and not as content that disappears without
notice.

The file is sorted and formatted so that an unchanged build writes identical
bytes, and a real change reads as a short diff.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path

LEDGER_NAME = "redactions.lock.json"


@dataclass(frozen=True)
class Entry:
    """One removed entity, and the decision that removed it."""

    key: str
    mechanism: str
    reason: str
    distance: int
    via: tuple[str, ...]

    def to_dict(self) -> dict:
        record: dict[str, object] = {
            "mechanism": self.mechanism,
            "reason": self.reason,
        }
        # A seed has no distance and no parent. Recording either would state a
        # fact that the decision does not hold.
        if self.mechanism == "cascade":
            record["pass"] = self.distance
            record["via"] = list(self.via)
        return record

    @staticmethod
    def from_dict(key: str, record: dict) -> "Entry":
        return Entry(
            key=key,
            mechanism=record["mechanism"],
            reason=record["reason"],
            distance=record.get("pass", 0),
            via=tuple(record.get("via", ())),
        )


@dataclass
class Ledger:
    """Every redaction decision for one export."""

    game_version: str | None = None
    removed: dict[str, Entry] = field(default_factory=dict)
    suppressed_zones: dict[str, int] = field(default_factory=dict)
    hidden_crafting: dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "snapshot": {"game_version": self.game_version},
            "removed": {
                key: self.removed[key].to_dict() for key in sorted(self.removed)
            },
            "suppressed_positions": {
                zone: self.suppressed_zones[zone]
                for zone in sorted(self.suppressed_zones)
            },
            "hidden_crafting": {
                item: self.hidden_crafting[item]
                for item in sorted(self.hidden_crafting)
            },
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2, sort_keys=True) + "\n"

    @staticmethod
    def from_dict(data: dict) -> "Ledger":
        return Ledger(
            game_version=data.get("snapshot", {}).get("game_version"),
            removed={
                key: Entry.from_dict(key, record)
                for key, record in data.get("removed", {}).items()
            },
            suppressed_zones=dict(data.get("suppressed_positions", {})),
            hidden_crafting=dict(data.get("hidden_crafting", {})),
        )

    def write(self, path: Path) -> None:
        path.write_text(self.to_json(), encoding="utf-8")

    @staticmethod
    def read(path: Path) -> "Ledger | None":
        if not path.exists():
            return None
        return Ledger.from_dict(json.loads(path.read_text(encoding="utf-8")))


@dataclass(frozen=True)
class Difference:
    """One entity whose decision does not match the recorded one."""

    key: str
    kind: str
    detail: str

    def __str__(self) -> str:
        return f"{self.kind:12} {self.key}  {self.detail}"


def compare(recorded: Ledger, current: Ledger) -> list[Difference]:
    """Every difference between the recorded decisions and the current ones."""
    differences: list[Difference] = []

    for key in sorted(set(current.removed) - set(recorded.removed)):
        entry = current.removed[key]
        differences.append(Difference(key, "appeared", f"removed by {entry.mechanism}"))

    for key in sorted(set(recorded.removed) - set(current.removed)):
        entry = recorded.removed[key]
        differences.append(
            Difference(key, "disappeared", f"was removed by {entry.mechanism}")
        )

    for key in sorted(set(recorded.removed) & set(current.removed)):
        was, now = recorded.removed[key], current.removed[key]
        if was.mechanism != now.mechanism:
            differences.append(
                Difference(key, "changed", f"{was.mechanism} -> {now.mechanism}")
            )
        elif was.via != now.via:
            differences.append(
                Difference(
                    key,
                    "changed",
                    f"followed {', '.join(was.via) or 'nothing'} "
                    f"-> {', '.join(now.via) or 'nothing'}",
                )
            )

    for zone in sorted(set(current.suppressed_zones) - set(recorded.suppressed_zones)):
        differences.append(Difference(zone, "appeared", "positions suppressed"))

    for zone in sorted(set(recorded.suppressed_zones) - set(current.suppressed_zones)):
        differences.append(
            Difference(zone, "disappeared", "positions no longer suppressed")
        )

    for item in sorted(set(current.hidden_crafting) - set(recorded.hidden_crafting)):
        differences.append(Difference(item, "appeared", "crafting hidden"))

    for item in sorted(set(recorded.hidden_crafting) - set(current.hidden_crafting)):
        differences.append(Difference(item, "disappeared", "crafting no longer hidden"))

    return differences
