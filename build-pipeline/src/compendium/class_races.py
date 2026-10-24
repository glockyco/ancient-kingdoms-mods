"""Which races each class accepts, read from the game's character creator.

The engine does not pair a class with a race anywhere a tool can query. Character
creation takes both as independent strings and cross-checks neither, and no runtime
structure lists the races a class allows. The rule exists only in the character
creator, which enables or disables one class button per race.

- Source: server-scripts/UICharacterEditor.cs:1173-1807 — one race selection method per race
- Source: server-scripts/UICharacterEditor.cs:RaceAllowsNecromancer — a switch on the selected race
- Source: server-scripts/UICharacterEditor.cs:changeClassNecromancer — one changeClass method per class

The class list comes from the creator's `changeClass*` methods rather than from this
module, so a class that a patch adds is checked instead of skipped.

`compatible_races` is curated pipeline input. The explicit check compares it with
the character creator whenever the game updates.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

_CLASS_METHOD = re.compile(r"public void changeClass(\w+)\s*\(")
_RACE_METHOD = re.compile(r"public void changeRace(\w+)\s*\(")
_MEMBER = re.compile(r"^\t(?:public|private|protected|internal)\s")
_BUTTON_STATE = re.compile(r"(\w+)Button\.interactable = (true|false)")
_BARD_STATE = re.compile(r"SetBardAvailability\(raceAllowsBard:\s*(true|false)\)")
# A race method that defers to `RaceAllows<Class>()` through this refresh call.
_REFRESH_STATE = re.compile(r"Refresh(\w+)Availability\(\)")

# The statements a decompiled `RaceAllows<Class>()` switch consists of. The reader
# refuses any other statement rather than guessing what it does.
_CASE_LABEL = re.compile(r'^case "([^"]+)":$')
_ALLOW = "return true;"
_REFUSE = "return false;"
_IGNORED = frozenset({"{", "}", "switch (raceSelected)"})


class PairingUnreadableError(RuntimeError):
    """The creator source did not have the shape this reader needs."""


@dataclass(frozen=True)
class Pairing:
    """Races each class accepts, keyed by class name, as race identifiers."""

    classes: tuple[str, ...]
    races_by_class: dict[str, list[str]]
    classes_by_race: dict[str, list[str]]


def race_identifier(method_suffix: str) -> str:
    """Turn a creator method suffix such as `DarkElf` into `dark_elf`."""
    return re.sub(r"(?<!^)(?=[A-Z])", "_", method_suffix).lower()


def _race_name_identifier(name: str) -> str:
    """Turn a creator race name such as `Dark Elf` into `dark_elf`."""
    return name.lower().replace(" ", "_")


def _member_body(lines: list[str], start: int) -> list[str]:
    """The lines of the member declared at `start`, up to the next member."""
    end = next(
        (
            index
            for index in range(start + 1, len(lines))
            if _MEMBER.match(lines[index])
        ),
        len(lines),
    )
    return lines[start:end]


def _races_allowed(lines: list[str], class_name: str) -> frozenset[str]:
    """Race identifiers that `RaceAllows<class_name>()` accepts."""
    signature = f"bool RaceAllows{class_name}()"
    start = next((index for index, line in enumerate(lines) if signature in line), None)
    if start is None:
        raise PairingUnreadableError(f"RaceAllows{class_name} was not found.")

    body = [line.strip() for line in _member_body(lines, start)[1:]]
    allowed: set[str] = set()
    pending: list[str] = []
    pending_default = False
    for statement in body:
        if not statement or statement in _IGNORED:
            continue
        if statement == "default:":
            pending_default = True
        elif match := _CASE_LABEL.match(statement):
            pending.append(match.group(1))
        elif statement == _ALLOW:
            # A default that returns true covers races no label names, and the
            # creator has no race list to work them out from.
            if pending_default:
                raise PairingUnreadableError(
                    f"RaceAllows{class_name} allows every race it does not name."
                )
            allowed.update(pending)
            pending = []
        elif statement == _REFUSE:
            pending = []
            pending_default = False
        else:
            raise PairingUnreadableError(
                f"RaceAllows{class_name} has a statement this reader does not know: "
                f"{statement!r}"
            )
    return frozenset(_race_name_identifier(name) for name in allowed)


def read_pairing(source: str) -> Pairing:
    """Read the class and race pairing from `UICharacterEditor` source text.

    Each `changeRace*` method decides every class button's state. It sets the
    button's `interactable` directly, calls the Bard helper with a constant, or
    calls `Refresh<Class>Availability()`, which applies `RaceAllows<Class>()` to the
    selected race. A class is allowed for that race when its button is enabled.
    """
    lines = source.split("\n")
    classes = tuple(
        dict.fromkeys(
            match.group(1) for line in lines if (match := _CLASS_METHOD.search(line))
        )
    )
    if not classes:
        raise PairingUnreadableError("No changeClass method was found.")

    starts = [
        (index, match.group(1))
        for index, line in enumerate(lines)
        if (match := _RACE_METHOD.search(line))
    ]
    if not starts:
        raise PairingUnreadableError("No changeRace method was found.")

    rules: dict[str, frozenset[str]] = {}
    classes_by_race: dict[str, list[str]] = {}
    for index, suffix in starts:
        race = race_identifier(suffix)
        body = "\n".join(_member_body(lines, index))
        states = {name: state == "true" for name, state in _BUTTON_STATE.findall(body)}
        bard_state = _BARD_STATE.search(body)
        if bard_state is not None:
            states["Bard"] = bard_state.group(1) == "true"
        for name in _REFRESH_STATE.findall(body):
            if name not in rules:
                rules[name] = _races_allowed(lines, name)
            states[name] = race in rules[name]

        missing = [name for name in classes if name not in states]
        if missing:
            raise PairingUnreadableError(
                f"changeRace{suffix} does not set {', '.join(missing)}."
            )

        classes_by_race[race] = [name for name in classes if states[name]]

    races_by_class = {
        name: sorted(
            race for race, allowed in classes_by_race.items() if name in allowed
        )
        for name in classes
    }
    return Pairing(
        classes=classes,
        races_by_class=races_by_class,
        classes_by_race=classes_by_race,
    )


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
    for name in pairing.classes:
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

    for name in sorted(set(published) - set(pairing.classes)):
        problems.append(f"{name}: not a class the game defines")
    return problems
