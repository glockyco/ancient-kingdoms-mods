import json
from pathlib import Path

import pytest

from compendium.db import create_database
from compendium.denormalizers.items.equipment import _denormalize_armor_sets
from compendium.denormalizers.items.tooltips import (
    _convert_unity_markup_to_html,
    run,
    tooltip_stat_fields,
)


def test_tooltip_lists_stats_through_placeholders_or_exact_stat_lines():
    template = (
        "{DEFENSEBONUS} AC\n"
        "{DELAY} Delay\n"
        "+10 <color=#A8B3B7>Magic Resist</color>\n"
        "+2% Critical Resist\n"
        "+5 Mana\n"
        "Tempo: quickens your movements.\n"
        "Ward: increases your poison resistance by 15."
    )
    stats = {
        "defense": 30,
        "magic_resist": 10,
        "critical_resist": 0.02,
        "mana_bonus": 250,
        "haste": 0.1,
        "poison_resist": 15,
    }
    names = {
        "defense": "AC",
        "magic_resist": "Magic Resist",
        "critical_resist": "Critical Resist",
        "mana_bonus": "Mana",
        "haste": "Haste",
        "poison_resist": "Poison Resist",
    }
    # Mana is typed with a value that differs from the stat, Haste is only described,
    # and the poison resistance number sits inside an effect's prose.
    assert tooltip_stat_fields(template, stats, names) == [
        "critical_resist",
        "defense",
        "magic_resist",
        "weapon_delay",
    ]


@pytest.mark.parametrize("alignment", ["left", "center", "right", "justify"])
def test_tooltip_alignment_becomes_html(alignment):
    result = _convert_unity_markup_to_html(
        f'<align="{alignment}">First line\nSecond line</align>'
    )
    assert (
        result == f'<div style="text-align: {alignment}">First line\nSecond line</div>'
    )
    assert "<align" not in result


def test_empty_augment_alignment_does_not_leak_textmeshpro_tags():
    result = _convert_unity_markup_to_html('<align="left"></align>')
    assert result == '<div style="text-align: left"></div>'


def test_unsupported_layout_tags_keep_their_content():
    result = _convert_unity_markup_to_html(
        '<align="flush"><line-height=120%><pos=50%>Text<space=1em></align>'
    )
    assert result == "Text"


def test_color_and_price_alignment_remain_supported():
    result = _convert_unity_markup_to_html(
        '<align="right">250 <color=#FFD700>●</color></align>'
    )
    assert result == (
        '<div style="text-align: right">250 <span style="color: #FFD700">●</span></div>'
    )


@pytest.mark.parametrize("item_name", ["Constitution", "Exported Attribute Name"])
def test_set_bonus_uses_catalogue_item_name(tmp_path, item_name):
    conn = _set_bonus_database(tmp_path, item_name)
    try:
        run(conn)
        html = conn.execute(
            "SELECT tooltip_html FROM items WHERE id = 'test_armor'"
        ).fetchone()[0]
        assert f"Set (3): Increases {item_name} by 5" in html
    finally:
        conn.close()


@pytest.mark.parametrize("missing_name", [False, True])
def test_set_bonus_without_a_catalogue_name_fails(tmp_path, missing_name):
    conn = _set_bonus_database(tmp_path, None if missing_name else "Constitution")
    try:
        if not missing_name:
            conn.execute("DELETE FROM stat_fields")
        with pytest.raises(
            ValueError, match="Missing item stat name for stat constitution"
        ):
            run(conn)
    finally:
        conn.close()


def _set_bonus_database(tmp_path, item_name):
    schema = Path(__file__).resolve().parents[1] / "schema.sql"
    conn = create_database(tmp_path / "tooltips.db", schema)
    conn.execute(
        "INSERT INTO stats (id, sort_order, name, item_name, format, per_point_of) "
        "VALUES ('constitution', 0, 'Character Name', ?, 'integer', '[]')",
        (item_name,),
    )
    conn.execute(
        "INSERT INTO stat_fields (source, field, stat_id, modifier, curve) "
        "VALUES ('item', 'constitution', 'constitution', 'flat', NULL)"
    )
    conn.execute(
        "INSERT INTO items (id, name, item_type, tooltip, augment_armor_set_name, "
        "augment_armor_set_members, augment_attribute_bonuses, travel_zone_id) "
        "VALUES ('test_armor', 'Test Armor', 'armor', '{DURABILITY}', 'Test Set', ?, ?, NULL)",
        (
            json.dumps([{"item_id": "test_armor", "item_name": "Test Armor"}]),
            json.dumps([{"stat_id": "constitution", "bonus": 5}]),
        ),
    )
    conn.commit()
    return conn


def test_set_bonus_derivation_stores_stat_ids_without_display_names(tmp_path):
    conn = _set_bonus_database(tmp_path, "Exported Constitution")
    try:
        conn.execute(
            "INSERT INTO items (id, name, item_type, stats, augment_skill_bonuses, "
            "augment_armor_set_item_ids, augment_armor_set_name, travel_zone_id) "
            "VALUES ('set_augment', 'Set Augment', 'augment', ?, '[]', ?, 'Test Set', NULL)",
            (
                json.dumps({"constitution": 5}),
                json.dumps(["test_armor"]),
            ),
        )
        conn.execute(
            "UPDATE items SET stats = ? WHERE id = 'test_armor'",
            (json.dumps({"augment_bonus_set": "Set Augment"}),),
        )
        assert _denormalize_armor_sets(conn) == (1, 1)
        rows = conn.execute(
            "SELECT augment_attribute_bonuses FROM items ORDER BY id"
        ).fetchall()
        assert [json.loads(row[0]) for row in rows] == [
            [{"stat_id": "constitution", "bonus": 5}],
            [{"stat_id": "constitution", "bonus": 5}],
        ]
        run(conn)
        html = conn.execute(
            "SELECT tooltip_html FROM items WHERE id = 'test_armor'"
        ).fetchone()[0]
        assert "Set (3): Increases Exported Constitution by 5" in html
    finally:
        conn.close()
