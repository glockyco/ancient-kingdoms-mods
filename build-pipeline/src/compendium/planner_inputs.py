"""Fail-fast validation for source data required by the gear planner."""

import json
from pathlib import Path
from typing import Any

PLANNER_EXPORT_FILES = (
    "game_config.json",
    "classes.json",
    "classes_combat.json",
    "equipment_slots.json",
    "progression.json",
    "skills.json",
    "pets.json",
    "items.json",
)

SKILL_FIELDS = {
    "id",
    "skill_type",
    "player_classes",
    "tier",
    "max_level",
    "level_required",
    "required_skill_points",
    "required_spent_points",
    "prerequisite_level",
    "prerequisite2_level",
    "required_weapon_category",
    "required_weapon_category2",
    "is_veteran",
    "learn_default",
    "mana_cost",
    "energy_cost",
    "cooldown",
    "cast_time",
    "cast_range",
}

CLASS_COMBAT_FIELDS = {
    "id",
    "resource_type",
    *{
        f"base_{stat}_{part}"
        for stat in (
            "health",
            "mana",
            "energy",
            "damage",
            "magic_damage",
            "defense",
            "magic_resist",
            "poison_resist",
            "fire_resist",
            "cold_resist",
            "disease_resist",
            "block_chance",
            "accuracy",
            "critical_chance",
        )
        for part in ("value", "per_level")
    },
}


def _read_json(export_dir: Path, filename: str) -> Any:
    path = export_dir / filename
    if not path.is_file():
        raise ValueError(f"Planner requires {filename}, but the export is missing")
    return json.loads(path.read_text(encoding="utf-8"))


def _require_rows(value: Any, filename: str) -> list[dict[str, Any]]:
    if not isinstance(value, list) or not value:
        raise ValueError(f"Planner requires at least one row in {filename}")
    if not all(isinstance(row, dict) for row in value):
        raise ValueError(f"Planner requires object rows in {filename}")
    return value


def _require_fields(rows: list[dict[str, Any]], fields: set[str], domain: str) -> None:
    for index, row in enumerate(rows):
        missing = sorted(fields - row.keys())
        if missing:
            raise ValueError(
                f"Planner {domain} row {index} is missing fields: {', '.join(missing)}"
            )


def verify_planner_inputs(export_dir: Path) -> None:
    """Verify that every planner data domain and required field is present."""
    exports = {name: _read_json(export_dir, name) for name in PLANNER_EXPORT_FILES}

    game_config = exports["game_config.json"]
    if not isinstance(game_config, dict) or not game_config.get("game_version"):
        raise ValueError("Planner game_config.json must declare game_version")

    classes = _require_rows(exports["classes.json"], "classes.json")
    _require_fields(classes, {"id", "compatible_races"}, "class")
    class_ids = {row["id"] for row in classes}

    class_combat = _require_rows(exports["classes_combat.json"], "classes_combat.json")
    _require_fields(class_combat, CLASS_COMBAT_FIELDS, "class combat")
    combat_class_ids = {row["id"] for row in class_combat}
    if combat_class_ids != class_ids:
        raise ValueError(
            "Planner class combat rows do not match classes; "
            f"missing={sorted(class_ids - combat_class_ids)}, "
            f"unexpected={sorted(combat_class_ids - class_ids)}"
        )

    progression = exports["progression.json"]
    if not isinstance(progression, dict):
        raise TypeError("Planner progression.json must contain an object")
    progression_fields = {
        "max_level",
        "max_veteran_points",
        "attribute_points_per_veteran",
        "veteran_skill_points_per_veteran",
        "races",
        "class_levels",
        "level_budgets",
    }
    missing_progression = sorted(progression_fields - progression.keys())
    if missing_progression:
        raise ValueError(
            "Planner progression is missing fields: " + ", ".join(missing_progression)
        )

    skills = _require_rows(exports["skills.json"], "skills.json")
    _require_fields(skills, SKILL_FIELDS, "skill")
    skill_class_ids = {
        class_id for skill in skills for class_id in skill["player_classes"]
    }
    if not class_ids <= skill_class_ids:
        raise ValueError(
            "Planner skill trees are missing classes: "
            + ", ".join(sorted(class_ids - skill_class_ids))
        )
    for index, skill in enumerate(skills):
        if not skill["skill_type"]:
            raise ValueError(
                f"Planner skill row {index} has no effect-classification skill_type"
            )

    pets = _require_rows(exports["pets.json"], "pets.json")
    mercenaries = [row for row in pets if row.get("is_mercenary")]
    _require_fields(
        mercenaries,
        {
            "id",
            "type_monster",
            "skill_ids",
            "innate_skill_ids",
            "damage_base",
            "damage_per_level",
            "magic_damage_base",
            "magic_damage_per_level",
        },
        "mercenary",
    )
    mercenary_class_ids = {row["type_monster"].lower() for row in mercenaries}
    if mercenary_class_ids != class_ids:
        raise ValueError(
            "Planner mercenary archetypes do not match classes; "
            f"missing={sorted(class_ids - mercenary_class_ids)}, "
            f"unexpected={sorted(mercenary_class_ids - class_ids)}"
        )

    slots = _require_rows(exports["equipment_slots.json"], "equipment_slots.json")
    _require_fields(
        slots,
        {"owner_type", "owner_id", "slot_index", "accepted_category"},
        "equipment slot",
    )
    for owner_type in ("player", "mercenary"):
        owner_ids = {
            row["owner_id"] for row in slots if row["owner_type"] == owner_type
        }
        if owner_ids != class_ids:
            raise ValueError(
                f"Planner {owner_type} slot owners do not match classes; "
                f"missing={sorted(class_ids - owner_ids)}, "
                f"unexpected={sorted(owner_ids - class_ids)}"
            )
        for owner_id in owner_ids:
            indices = {
                row["slot_index"]
                for row in slots
                if row["owner_type"] == owner_type and row["owner_id"] == owner_id
            }
            if indices != set(range(16)):
                raise ValueError(
                    f"Planner {owner_type} '{owner_id}' slots do not cover indices 0-15"
                )

    items = _require_rows(exports["items.json"], "items.json")
    _require_fields(items, {"id", "item_type", "max_stack"}, "item")
    foods = [row for row in items if row["item_type"] == "food"]
    potions = [row for row in items if row["item_type"] == "potion"]
    ammunition = [row for row in items if row["item_type"] == "ammo"]
    if not foods or not potions or not ammunition:
        raise ValueError("Planner requires food, potion, and ammunition item rows")
    _require_fields(foods, {"food_buff_id", "food_buff_level", "food_type"}, "food")
    _require_fields(
        potions,
        {
            "potion_buff_level",
            "usage_health",
            "usage_mana",
            "usage_pet_health",
        },
        "potion",
    )
    ammo_ids = {row["id"] for row in ammunition}
    ammo_references = {
        row["weapon_required_ammo_id"]
        for row in items
        if row.get("weapon_required_ammo_id")
    }
    if not ammo_references:
        raise ValueError("Planner requires at least one weapon ammunition reference")
    if not ammo_references <= ammo_ids:
        raise ValueError(
            "Planner weapons reference missing ammunition: "
            + ", ".join(sorted(ammo_references - ammo_ids))
        )
