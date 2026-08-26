"""The reader that recovers the class and race pairing from the character creator."""

from __future__ import annotations

import pytest

from compendium.class_races import (
    PairingUnreadableError,
    compare,
    race_identifier,
    read_pairing,
)


def creator(*races: tuple[str, dict[str, bool]]) -> str:
    """Synthetic creator source, one changeRace method for each race given."""
    parts = ["public class UICharacterEditor : MonoBehaviour", "{"]
    for suffix, states in races:
        parts.append(f"\tpublic void changeRace{suffix}()")
        parts.append("\t{")
        parts.append('\t\traceSelected = "x";')
        for name, enabled in states.items():
            parts.append(f"\t\t{name}Button.interactable = {str(enabled).lower()};")
        parts.append("\t}")
    parts.append("}")
    return "\n".join(parts)


ALL_ENABLED = {
    name: True for name in ("Warrior", "Ranger", "Cleric", "Rogue", "Wizard", "Druid")
}


def without(*disabled: str) -> dict[str, bool]:
    return {name: name not in disabled for name in ALL_ENABLED}


def test_a_race_that_enables_every_button_allows_every_class():
    pairing = read_pairing(creator(("Human", ALL_ENABLED)))
    assert pairing.classes_by_race["human"] == [
        "Warrior",
        "Ranger",
        "Cleric",
        "Rogue",
        "Wizard",
        "Druid",
    ]
    assert pairing.races_by_class["Druid"] == ["human"]


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


def test_source_without_any_race_method_is_refused():
    with pytest.raises(PairingUnreadableError, match="No changeRace method"):
        read_pairing("public class UICharacterEditor { }")


def test_a_matching_published_table_reports_nothing():
    pairing = read_pairing(creator(("Human", ALL_ENABLED), ("Dwarf", without("Druid"))))
    published = {
        "Warrior": ["dwarf", "human"],
        "Ranger": ["dwarf", "human"],
        "Cleric": ["dwarf", "human"],
        "Rogue": ["dwarf", "human"],
        "Wizard": ["dwarf", "human"],
        "Druid": ["human"],
    }
    assert compare(published, pairing) == []


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
    published["Necromancer"] = ["human"]
    problems = compare(published, pairing)
    assert "Necromancer: not a class the game defines" in problems
