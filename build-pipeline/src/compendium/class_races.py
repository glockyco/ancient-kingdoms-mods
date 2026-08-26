"""Which races each class accepts, read from the game's character creator.

The engine does not pair a class with a race anywhere a tool can query. Character
creation takes both as independent strings and cross-checks neither, and no runtime
structure lists the races a class allows. The rule exists only in the character
creator, which enables or disables one class button per race.

- Source: server-scripts/UICharacterEditor.cs:921-1483 - changeRace* methods

`compatible_races` in `exported-data/classes.json` is transcribed from those methods.
A build must not require the decompiled snapshot, because that snapshot is a local
artifact and is not committed, so the transcription stays in the curated file and this
module proves it still matches the game. Run the check whenever the game updates.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

CLASSES = ("Warrior", "Ranger", "Cleric", "Rogue", "Wizard", "Druid")

_RACE_METHOD = re.compile(r"public void changeRace(\w+)\s*\(")
_MEMBER = re.compile(r"^\t(?:public|private|protected|internal)\s")
_BUTTON_STATE = re.compile(r"(\w+)Button\.interactable = (true|false)")


class PairingUnreadableError(RuntimeError):
    """The creator source did not have the shape this reader needs."""


@dataclass(frozen=True)
class Pairing:
    """Races each class accepts, keyed by class name, as race identifiers."""

    races_by_class: dict[str, list[str]]
    classes_by_race: dict[str, list[str]]


def race_identifier(method_suffix: str) -> str:
    """Turn a creator method suffix such as `DarkElf` into `dark_elf`."""
    return re.sub(r"(?<!^)(?=[A-Z])", "_", method_suffix).lower()


def read_pairing(source: str) -> Pairing:
    """Read the class and race pairing from `UICharacterEditor` source text.

    Each `changeRace*` method sets every class button's `interactable` state. A class
    is allowed for that race when its button is enabled.
    """
    lines = source.split("\n")
    starts = [
        (index, match.group(1))
        for index, line in enumerate(lines)
        if (match := _RACE_METHOD.search(line))
    ]
    if not starts:
        raise PairingUnreadableError("No changeRace method was found.")

    classes_by_race: dict[str, list[str]] = {}
    for index, suffix in starts:
        end = next(
            (
                candidate
                for candidate in range(index + 1, len(lines))
                if _MEMBER.match(lines[candidate])
            ),
            len(lines),
        )
        body = "\n".join(lines[index:end])
        states = dict(_BUTTON_STATE.findall(body))

        missing = [name for name in CLASSES if name not in states]
        if missing:
            raise PairingUnreadableError(
                f"changeRace{suffix} does not set {', '.join(missing)}."
            )

        race = race_identifier(suffix)
        classes_by_race[race] = [name for name in CLASSES if states[name] == "true"]

    races_by_class = {
        name: sorted(
            race for race, allowed in classes_by_race.items() if name in allowed
        )
        for name in CLASSES
    }
    return Pairing(races_by_class=races_by_class, classes_by_race=classes_by_race)


def read_pairing_from(snapshot_root: Path) -> Pairing:
    """Read the pairing from a decompiled snapshot directory."""
    path = snapshot_root / "UICharacterEditor.cs"
    if not path.is_file():
        raise PairingUnreadableError(f"{path} does not exist.")
    return read_pairing(path.read_text(encoding="utf-8"))


def compare(published: dict[str, list[str]], pairing: Pairing) -> list[str]:
    """Differences between published races per class and the game's own rule.

    Returns one message for each class that disagrees. An empty list means the
    published table matches the game.
    """
    problems: list[str] = []
    for name in CLASSES:
        if name not in published:
            problems.append(f"{name}: absent from the published table")
            continue
        expected = set(pairing.races_by_class[name])
        actual = set(published[name])
        if expected == actual:
            continue
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        detail = []
        if missing:
            detail.append(f"missing {', '.join(missing)}")
        if extra:
            detail.append(f"lists {', '.join(extra)} which the game refuses")
        problems.append(f"{name}: {' and '.join(detail)}")

    for name in sorted(set(published) - set(CLASSES)):
        problems.append(f"{name}: not a class the game defines")
    return problems
