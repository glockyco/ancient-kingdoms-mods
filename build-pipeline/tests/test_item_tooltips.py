import pytest

from compendium.denormalizers.items.tooltips import _convert_unity_markup_to_html


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
