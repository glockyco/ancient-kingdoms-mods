"""The reader that recovers the class and race pairing from the character creator."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from compendium.class_races import (
    PairingUnreadableError,
    compare,
    race_identifier,
    read_pairing,
)
from compendium.commands import class_races as class_races_command

CLASS_NAMES = ("Warrior", "Ranger", "Cleric", "Rogue", "Wizard", "Druid", "Bard")


def creator(
    *races: tuple[str, dict[str, bool]],
    classes: tuple[str, ...] = CLASS_NAMES,
    extra: tuple[str, ...] = (),
) -> str:
    """Synthetic creator source: one changeClass method per class, one changeRace
    method per race given, and any extra members verbatim."""
    parts = ["public class UICharacterEditor : MonoBehaviour", "{"]
    for name in classes:
        parts.extend([f"\tpublic void changeClass{name}()", "\t{", "\t}"])
    for suffix, states in races:
        parts.append(f"\tpublic void changeRace{suffix}()")
        parts.append("\t{")
        parts.append('\t\traceSelected = "x";')
        for name, enabled in states.items():
            parts.append(f"\t\t{name}Button.interactable = {str(enabled).lower()};")
        parts.append("\t}")
    parts.extend(extra)
    parts.append("}")
    return "\n".join(parts)


# The decompiled shape of the 0.9.35.0 Necromancer rule: case labels that allow,
# and a default branch that allows one more race by comparison.
RACE_ALLOWS_NECROMANCER = (
    "\tprivate bool RaceAllowsNecromancer()",
    "\t{",
    "\t\tstring text = raceSelected;",
    "\t\tint num;",
    "\t\tswitch (text)",
    "\t\t{",
    "\t\tdefault:",
    '\t\t\tnum = ((!(text == "Drassar")) ? 1 : 0);',
    "\t\t\tbreak;",
    '\t\tcase "Human":',
    '\t\tcase "Dark Elf":',
    "\t\t\tnum = 0;",
    "\t\t\tbreak;",
    "\t\t}",
    "\t\treturn num == 0;",
    "\t}",
)

ALL_ENABLED = {name: True for name in CLASS_NAMES}


def without(*disabled: str) -> dict[str, bool]:
    return {name: name not in disabled for name in ALL_ENABLED}


def with_necromancer_refresh(source: str) -> str:
    return source.replace(
        '\t\traceSelected = "x";',
        '\t\traceSelected = "x";\n\t\tRefreshNecromancerAvailability();',
    )


def test_a_race_that_enables_every_button_allows_every_class():
    pairing = read_pairing(creator(("Human", ALL_ENABLED)))
    assert pairing.classes_by_race["human"] == list(CLASS_NAMES)
    assert pairing.races_by_class["Druid"] == ["human"]


def test_bard_availability_helper_sets_the_bard_rule():
    source = creator(("Dwarf", ALL_ENABLED)).replace(
        "\t\tBardButton.interactable = true;",
        "\t\tSetBardAvailability(raceAllowsBard: false);",
    )

    pairing = read_pairing(source)

    assert pairing.races_by_class["Bard"] == []


def test_a_refresh_call_applies_the_race_switch_of_its_class():
    source = with_necromancer_refresh(
        creator(
            ("Human", ALL_ENABLED),
            ("DarkElf", ALL_ENABLED),
            ("Drassar", ALL_ENABLED),
            ("Elf", ALL_ENABLED),
            classes=(*CLASS_NAMES, "Necromancer"),
            extra=RACE_ALLOWS_NECROMANCER,
        )
    )

    pairing = read_pairing(source)

    assert pairing.races_by_class["Necromancer"] == ["dark_elf", "drassar", "human"]


def test_a_race_switch_with_an_unknown_statement_is_refused():
    """Guessing what an unfamiliar branch does would publish a rule the game lacks."""
    unfamiliar = tuple(
        line.replace("num = 0;", "num = Allowed(text);")
        for line in RACE_ALLOWS_NECROMANCER
    )
    source = with_necromancer_refresh(
        creator(
            ("Human", ALL_ENABLED),
            classes=(*CLASS_NAMES, "Necromancer"),
            extra=unfamiliar,
        )
    )

    with pytest.raises(PairingUnreadableError, match="Allowed"):
        read_pairing(source)


def test_a_disabled_button_removes_that_class_for_that_race():
    pairing = read_pairing(creator(("Felarii", without("Cleric"))))
    assert "Cleric" not in pairing.classes_by_race["felarii"]
    assert pairing.races_by_class["Cleric"] == []


def test_a_compound_method_name_becomes_an_identifier():
    assert race_identifier("DarkElf") == "dark_elf"
    assert race_identifier("FireGoblin") == "fire_goblin"
    assert race_identifier("Human") == "human"


def test_the_reader_inverts_the_table_across_races():
    pairing = read_pairing(
        creator(
            ("Human", ALL_ENABLED),
            ("Dwarf", without("Wizard", "Druid")),
            ("DarkElf", without("Druid")),
        )
    )
    assert pairing.races_by_class["Druid"] == ["human"]
    assert pairing.races_by_class["Wizard"] == ["dark_elf", "human"]
    assert pairing.races_by_class["Warrior"] == ["dark_elf", "dwarf", "human"]


def test_a_method_that_does_not_set_every_class_is_refused():
    """A silently partial read would publish a pairing the game does not hold."""
    partial = creator(("Human", {"Warrior": True, "Ranger": True}))
    with pytest.raises(PairingUnreadableError, match="Cleric"):
        read_pairing(partial)


def test_source_without_any_class_method_is_refused():
    with pytest.raises(PairingUnreadableError, match="No changeClass method"):
        read_pairing(creator(("Human", ALL_ENABLED), classes=()))


def test_source_without_any_race_method_is_refused():
    with pytest.raises(PairingUnreadableError, match="No changeRace method"):
        read_pairing(creator())


def test_a_matching_published_table_reports_nothing():
    pairing = read_pairing(creator(("Human", ALL_ENABLED), ("Dwarf", without("Druid"))))
    published = {
        "Warrior": ["dwarf", "human"],
        "Ranger": ["dwarf", "human"],
        "Cleric": ["dwarf", "human"],
        "Rogue": ["dwarf", "human"],
        "Wizard": ["dwarf", "human"],
        "Druid": ["human"],
        "Bard": ["dwarf", "human"],
    }
    assert compare(published, pairing) == []


def test_a_class_the_creator_adds_is_checked_rather_than_skipped():
    """A patch that adds a class must fail the check until the table lists it."""
    source = with_necromancer_refresh(
        creator(
            ("Human", ALL_ENABLED),
            classes=(*CLASS_NAMES, "Necromancer"),
            extra=RACE_ALLOWS_NECROMANCER,
        )
    )
    pairing = read_pairing(source)
    published = {name: ["human"] for name in CLASS_NAMES}

    assert compare(published, pairing) == [
        "Necromancer: absent from the published table"
    ]


def test_a_missing_race_is_named():
    pairing = read_pairing(creator(("Human", ALL_ENABLED), ("Dwarf", ALL_ENABLED)))
    published = {name: ["human"] for name in ALL_ENABLED}
    problems = compare(published, pairing)
    assert any("missing dwarf" in problem for problem in problems)


def test_a_race_the_game_refuses_is_named():
    pairing = read_pairing(creator(("Human", ALL_ENABLED), ("Dwarf", without("Druid"))))
    published = {name: ["dwarf", "human"] for name in ALL_ENABLED}
    problems = compare(published, pairing)
    assert [problem for problem in problems if problem.startswith("Druid")] == [
        "Druid: lists dwarf which the game refuses"
    ]


def test_an_unknown_class_in_the_published_table_is_named():
    pairing = read_pairing(creator(("Human", ALL_ENABLED)))
    published = {name: ["human"] for name in ALL_ENABLED}
    published["Paladin"] = ["human"]
    problems = compare(published, pairing)
    assert "Paladin: not a class the game defines" in problems


@pytest.mark.parametrize("valid", [True, False])
def test_explicit_check_uses_curated_classes_and_snapshot(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, valid: bool
):
    curated_dir = tmp_path / "build-pipeline" / "curated"
    curated_dir.mkdir(parents=True)
    entries = [{"name": name, "compatible_races": ["human"]} for name in CLASS_NAMES]
    if not valid:
        entries[0]["compatible_races"] = ["dwarf"]
    (curated_dir / "classes.json").write_text(json.dumps(entries))
    snapshot = tmp_path / "server-scripts"
    snapshot.mkdir()
    (snapshot / "UICharacterEditor.cs").write_text(creator(("Human", ALL_ENABLED)))
    monkeypatch.setattr(class_races_command, "get_repo_root", lambda: tmp_path)
    assert class_races_command.run({}) == (0 if valid else 1)
