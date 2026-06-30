from compendium.denormalizers.items.calculations import (
    augment_item_level,
    equipment_item_level,
)


def test_equipment_item_level_includes_fear_and_critical_resist():
    assert (
        equipment_item_level(
            {"resist_fear_chance": 0.10, "critical_resist": 0.10}, weapon_delay=0
        )
        == 100
    )


def test_augment_item_level_uses_critical_resist_augment_weight():
    assert augment_item_level({"critical_resist": 0.10}) == 20
