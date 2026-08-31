"""Build the deterministic browser payload for the gear planner."""

import gzip
import hashlib
import json
import sqlite3
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from compendium.models import ItemData, SkillData
from compendium.redactions import verify as redaction_verify
from compendium.redactions.verify import Subject

RAW_PAYLOAD_NAME = "planner-data.json"
COMPRESSED_PAYLOAD_NAME = f"{RAW_PAYLOAD_NAME}.gz"
SERIALIZED_SCHEMA_VERSION = 1
CAPTURE_SCHEMA_VERSION = 1
MODEL_VERSION = "1"
ADMITTED_ITEM_TYPES = frozenset(
    {"equipment", "weapon", "augment", "food", "potion", "ammo"}
)

ClassificationStatus = Literal["modelled", "excluded", "unsupported"]


class PlannerPayloadError(Exception):
    """The planner payload cannot be published safely."""


@dataclass(frozen=True)
class PlannerPayloadResult:
    """Paths, digest, and sizes produced by one payload write."""

    raw_path: Path
    compressed_path: Path
    content_sha256: str
    raw_size: int
    compressed_size: int


@dataclass(frozen=True)
class EffectClassification:
    """One admitted behavior and the planner policy for it."""

    kind: str
    status: ClassificationStatus
    reason: str


SKILL_TYPE_CLASSIFICATIONS: dict[str, EffectClassification] = {
    kind: EffectClassification(
        f"skill_type:{kind}", "modelled", "Evaluated by the combat model"
    )
    for kind in (
        "area_buff",
        "area_damage",
        "area_debuff",
        "frontal_damage",
        "frontal_projectiles",
        "passive",
        "summon",
        "target_buff",
        "target_damage",
        "target_debuff",
        "target_projectile",
    )
}
SKILL_TYPE_CLASSIFICATIONS.update(
    {
        "area_heal": EffectClassification(
            "skill_type:area_heal",
            "excluded",
            "Healing is outside the release objective",
        ),
        "target_heal": EffectClassification(
            "skill_type:target_heal",
            "excluded",
            "Healing is outside the release objective",
        ),
    }
)

_MODELLED_SKILL_FLAGS = frozenset(
    {
        "base_skill",
        "can_buff_others",
        "can_buff_self",
        "cancel_cast_if_target_died",
        "followup_default_attack",
        "is_assassination_skill",
        "is_avatar_war",
        "is_cold_debuff",
        "is_decrease_resists_skill",
        "is_disease_debuff",
        "is_familiar",
        "is_fire_debuff",
        "is_magic_debuff",
        "is_manaburn_skill",
        "is_melee_debuff",
        "is_mercenary_skill",
        "is_only_for_magic_classes",
        "is_pet_skill",
        "is_poison_debuff",
        "is_spell",
        "is_veteran",
        "learn_default",
    }
)
_EXCLUDED_SKILL_FLAGS = frozenset(
    {
        "allow_dungeon",
        "can_heal_others",
        "can_heal_self",
        "is_balance_health",
        "is_cleanse",
        "is_dispel",
        "is_double_exp_spell",
        "is_invisibility",
        "is_mana_shield",
        "is_resurrect_skill",
        "is_scroll",
        "is_teleport",
        "show_cast_bar",
    }
)
SKILL_FLAG_CLASSIFICATIONS: dict[str, EffectClassification] = {
    flag: EffectClassification(f"skill_flag:{flag}", "modelled", "Changes evaluation")
    for flag in _MODELLED_SKILL_FLAGS
}
SKILL_FLAG_CLASSIFICATIONS.update(
    {
        flag: EffectClassification(
            f"skill_flag:{flag}",
            "excluded",
            "Does not affect the stationary damage objective",
        )
        for flag in _EXCLUDED_SKILL_FLAGS
    }
)

ITEM_EFFECT_CLASSIFICATIONS = {
    "stats": EffectClassification(
        "item_effect:stats", "modelled", "Changes character stats"
    ),
    "augment_skill_bonuses": EffectClassification(
        "item_effect:augment_skill_bonuses", "modelled", "Changes learned skill levels"
    ),
    "food_buff_id": EffectClassification(
        "item_effect:food_buff", "modelled", "Applies a timed skill effect"
    ),
    "potion_buff_id": EffectClassification(
        "item_effect:potion_buff", "modelled", "Applies a timed skill effect"
    ),
    "weapon_proc_effect_id": EffectClassification(
        "item_effect:weapon_proc", "modelled", "Applies a probabilistic skill effect"
    ),
    "weapon_required_ammo_id": EffectClassification(
        "item_effect:ammunition_requirement", "modelled", "Consumes ammunition"
    ),
    "infinite_charges": EffectClassification(
        "item_effect:infinite_ammunition", "modelled", "Removes ammunition exhaustion"
    ),
    "usage_health": EffectClassification(
        "item_effect:restore_health",
        "excluded",
        "Healing is outside the release objective",
    ),
    "usage_pet_health": EffectClassification(
        "item_effect:restore_pet_health",
        "excluded",
        "Healing is outside the release objective",
    ),
    "usage_mana": EffectClassification(
        "item_effect:restore_mana", "modelled", "Changes the resource timeline"
    ),
    "usage_energy": EffectClassification(
        "item_effect:restore_energy", "modelled", "Changes the resource timeline"
    ),
}


def write_planner_payload(
    conn: sqlite3.Connection,
    export_dir: Path,
    output_dir: Path,
    snapshot_path: Path,
    redaction_subject: Subject,
) -> PlannerPayloadResult:
    """Replace both payload files only with a complete, verified payload."""
    raw_path = output_dir / RAW_PAYLOAD_NAME
    compressed_path = output_dir / COMPRESSED_PAYLOAD_NAME
    output_dir.mkdir(parents=True, exist_ok=True)
    remove_planner_payload_outputs(output_dir)

    try:
        payload = _build_payload(conn, export_dir, snapshot_path)
        raw_bytes = _serialize(payload)
        compressed_bytes = gzip.compress(raw_bytes, compresslevel=9, mtime=0)
        raw_path.write_bytes(raw_bytes)
        compressed_path.write_bytes(compressed_bytes)
        assert_planner_payload_outputs(output_dir)
        redaction_verify.check_payload_files(
            (raw_path, compressed_path), redaction_subject
        )
    except Exception:
        remove_planner_payload_outputs(output_dir)
        raise

    return PlannerPayloadResult(
        raw_path=raw_path,
        compressed_path=compressed_path,
        content_sha256=hashlib.sha256(compressed_bytes).hexdigest(),
        raw_size=len(raw_bytes),
        compressed_size=len(compressed_bytes),
    )


def remove_planner_payload_outputs(output_dir: Path) -> None:
    """Delete both owned outputs before a build can fail or replace them."""
    _remove_outputs(
        output_dir / RAW_PAYLOAD_NAME,
        output_dir / COMPRESSED_PAYLOAD_NAME,
    )


def assert_planner_payload_outputs(output_dir: Path) -> None:
    """Fail when either owned output is missing or empty."""
    for name in (RAW_PAYLOAD_NAME, COMPRESSED_PAYLOAD_NAME):
        path = output_dir / name
        if not path.is_file() or path.stat().st_size == 0:
            raise PlannerPayloadError(
                f"Required planner payload output is missing: {path}"
            )


def _build_payload(
    conn: sqlite3.Connection, export_dir: Path, snapshot_path: Path
) -> dict[str, Any]:
    items = _read_list(export_dir / "items.json")
    skills = _read_list(export_dir / "skills.json")
    pets = _read_list(export_dir / "pets.json")
    classes = _read_list(export_dir / "classes.json")
    classes_combat = _read_list(export_dir / "classes_combat.json")
    equipment_slots = _read_list(export_dir / "equipment_slots.json")
    progression = _read_object(export_dir / "progression.json")

    surviving_items = _ids(conn, "items")
    surviving_skills = _ids(conn, "skills")
    surviving_pets = _ids(conn, "pets")
    surviving_classes = _ids(conn, "classes")

    admitted_items = [
        item
        for item in items
        if item.get("id") in surviving_items
        and item.get("item_type") in ADMITTED_ITEM_TYPES
    ]
    effect_skill_ids = {
        str(item[field])
        for item in admitted_items
        for field in ("food_buff_id", "potion_buff_id", "weapon_proc_effect_id")
        if item.get(field)
    }
    emitted_skills = [
        skill
        for skill in skills
        if skill.get("id") in surviving_skills
        and (
            bool(skill.get("player_classes"))
            or bool(skill.get("is_mercenary_skill"))
            or skill.get("id") in effect_skill_ids
        )
    ]
    mercenaries = [
        pet
        for pet in pets
        if pet.get("id") in surviving_pets and pet.get("is_mercenary") is True
    ]

    classifications = _classify_effects(admitted_items, emitted_skills)
    _require_effect_references(effect_skill_ids, emitted_skills)

    class_rows = [row for row in classes if row.get("id") in surviving_classes]
    combat_rows = [row for row in classes_combat if row.get("id") in surviving_classes]
    slot_rows = [
        row
        for row in equipment_slots
        if (
            row.get("owner_type") == "player"
            and row.get("owner_id") in surviving_classes
        )
        or (
            row.get("owner_type") == "mercenary"
            and row.get("owner_id") in surviving_classes
        )
    ]
    progression = dict(progression)
    progression["class_levels"] = [
        row
        for row in progression.get("class_levels", [])
        if row.get("class_id") in surviving_classes
    ]

    return {
        "build": _build_envelope(export_dir, snapshot_path),
        "classes": _sorted_rows(class_rows),
        "classCombat": _sorted_rows(combat_rows),
        "equipmentSlots": sorted(
            slot_rows,
            key=lambda row: (
                str(row.get("owner_type")),
                str(row.get("owner_id")),
                int(row.get("slot_index", -1)),
            ),
        ),
        "equipment": _sorted_rows(
            [
                item
                for item in admitted_items
                if item.get("item_type") in {"equipment", "weapon"}
            ]
        ),
        "augments": _sorted_rows(
            [item for item in admitted_items if item.get("item_type") == "augment"]
        ),
        "progression": progression,
        "skills": _sorted_rows(emitted_skills),
        "mercenaryArchetypes": _sorted_rows(mercenaries),
        "consumables": _sorted_rows(
            [
                item
                for item in admitted_items
                if item.get("item_type") in {"food", "potion"}
            ]
        ),
        "ammunition": _sorted_rows(
            [item for item in admitted_items if item.get("item_type") == "ammo"]
        ),
        "effectClassifications": [
            {
                "kind": classification.kind,
                "status": classification.status,
                "reason": classification.reason,
            }
            for classification in classifications
        ],
    }


def _classify_effects(
    items: list[dict[str, Any]], skills: list[dict[str, Any]]
) -> list[EffectClassification]:
    classifications: dict[str, EffectClassification] = {}
    known_item_fields = set(ItemData.model_fields)
    known_skill_fields = set(SkillData.model_fields)

    for item in items:
        unknown = set(item) - known_item_fields
        if unknown:
            raise PlannerPayloadError(
                f"Planner item {item.get('id')!r} has unclassified fields: "
                + ", ".join(sorted(unknown))
            )
        for field, classification in ITEM_EFFECT_CLASSIFICATIONS.items():
            if _present(item.get(field)):
                classifications[classification.kind] = classification

    for skill in skills:
        unknown = set(skill) - known_skill_fields
        if unknown:
            raise PlannerPayloadError(
                f"Planner skill {skill.get('id')!r} has unclassified fields: "
                + ", ".join(sorted(unknown))
            )
        skill_type = str(skill.get("skill_type", ""))
        skill_classification = SKILL_TYPE_CLASSIFICATIONS.get(skill_type)
        if skill_classification is None:
            raise PlannerPayloadError(
                f"Planner skill {skill.get('id')!r} has unclassified type {skill_type!r}"
            )
        classifications[skill_classification.kind] = skill_classification

        for field, value in skill.items():
            if value is not True:
                continue
            flag = SKILL_FLAG_CLASSIFICATIONS.get(field)
            if flag is None:
                raise PlannerPayloadError(
                    f"Planner skill {skill.get('id')!r} has unclassified active flag {field!r}"
                )
            classifications[flag.kind] = flag

    unsupported = sorted(
        classification.kind
        for classification in classifications.values()
        if classification.status == "unsupported"
    )
    if unsupported:
        raise PlannerPayloadError(
            "Planner payload contains unsupported admitted effects: "
            + ", ".join(unsupported)
        )
    return sorted(classifications.values(), key=lambda value: value.kind)


def _build_envelope(export_dir: Path, snapshot_path: Path) -> dict[str, Any]:
    snapshot = tomllib.loads(snapshot_path.read_text(encoding="utf-8"))
    game_config = _read_object(export_dir / "game_config.json")
    exported_version = game_config.get("game_version")
    snapshot_version = snapshot.get("game_version")
    if exported_version != snapshot_version:
        raise PlannerPayloadError(
            f"Export game version {exported_version!r} does not match snapshot {snapshot_version!r}"
        )

    return {
        "serializedSchemaVersion": SERIALIZED_SCHEMA_VERSION,
        "captureSchemaVersion": CAPTURE_SCHEMA_VERSION,
        "modelVersion": MODEL_VERSION,
        "gameData": {
            "gameVersion": _required_snapshot_value(snapshot, "game_version"),
            "steamBuildId": _required_snapshot_value(snapshot, "steam_build_id"),
            "assemblySha256": _required_snapshot_value(snapshot, "assembly_sha256"),
        },
    }


def _required_snapshot_value(snapshot: dict[str, Any], key: str) -> str:
    value = snapshot.get(key)
    if not isinstance(value, str) or not value:
        raise PlannerPayloadError(f"Snapshot field {key!r} is missing")
    return value


def _require_effect_references(
    effect_skill_ids: set[str], emitted_skills: list[dict[str, Any]]
) -> None:
    emitted_ids = {str(skill.get("id")) for skill in emitted_skills}
    missing = sorted(effect_skill_ids - emitted_ids)
    if missing:
        raise PlannerPayloadError(
            "Planner item effects reference skills outside the payload: "
            + ", ".join(missing)
        )


def _ids(conn: sqlite3.Connection, table: str) -> set[str]:
    return {str(row[0]) for row in conn.execute(f"SELECT id FROM {table}")}


def _read_list(path: Path) -> list[dict[str, Any]]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list) or not all(isinstance(row, dict) for row in value):
        raise TypeError(f"{path.name} must contain a list of objects")
    return value


def _read_object(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise TypeError(f"{path.name} must contain an object")
    return value


def _sorted_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(rows, key=lambda row: str(row.get("id", "")))


def _serialize(payload: dict[str, Any]) -> bytes:
    return (
        json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        + "\n"
    ).encode("utf-8")


def _present(value: Any) -> bool:
    return value not in (None, False, 0, 0.0, "", [], {})


def _remove_outputs(*paths: Path) -> None:
    for path in paths:
        path.unlink(missing_ok=True)
