"""Custom loaders for the datasets in `catalog.py` that need more than one insert per element.

Each reads its export files, validates them with Pydantic models, and fills its
tables. Simple datasets have no loader here: `catalog.load_dataset` inserts them.
"""

import json
import shutil
import sqlite3
from collections.abc import Callable
from pathlib import Path

from rich.console import Console

from compendium.db import insert_acquisition_input, insert_model, serialize_value
from compendium.models import (
    AchievementData,
    AlchemyRecipeData,
    AlchemyTableData,
    ClassData,
    CraftingRecipeData,
    CraftingStationData,
    GameConfigData,
    GatherItemData,
    HouseData,
    ItemData,
    MonsterData,
    PetData,
    ProfessionData,
    ProgressionExportData,
    QuestData,
    ScribingRecipeData,
    ScribingTableData,
    SkillData,
    StatCatalogData,
    SummonTriggerData,
    TreasureLocationData,
    VisualAssetData,
)
from compendium.visual_assets import (
    Encoding,
    PublishedAsset,
    insert_asset,
    measure,
    publish,
    runtime_encoding,
)

console = Console()


def _require_export(
    filepath: Path, instruction: str = "Run the DataExporter mod in the game."
) -> None:
    if not filepath.is_file():
        raise FileNotFoundError(f"Required input is missing: {filepath}. {instruction}")


def _resolve_export_asset_path(export_dir: Path, export_path: str) -> Path:
    """Resolve an exported asset path and reject traversal outside export_dir."""
    relative_path = Path(export_path)
    if relative_path.is_absolute() or ".." in relative_path.parts:
        raise ValueError(f"Unsafe visual asset export path: {export_path}")
    return export_dir / relative_path


def _record_visual_assets(
    conn: sqlite3.Connection,
    export_dir: Path,
    produce: Callable[[Path, VisualAssetData], PublishedAsset],
) -> int:
    """Insert one manifest row per asset, using `produce` for the published form.

    Returns the number of rows inserted.
    """
    filepath = export_dir / "visual_assets.json"
    _require_export(filepath)

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    assets = [VisualAssetData(**item) for item in data]
    cursor = conn.cursor()

    for asset in assets:
        source_path = _resolve_export_asset_path(export_dir, asset.export_path)
        if not source_path.exists():
            raise FileNotFoundError(
                f"Visual asset file listed in manifest does not exist: {source_path}"
            )

        insert_asset(
            cursor,
            domain=asset.domain,
            entity_id=asset.entity_id,
            kind=asset.kind,
            export_path=asset.export_path,
            asset=produce(source_path, asset),
            source_field=asset.source_field,
            source_type=asset.source_type,
            source_name=asset.source_name,
            sprite_name=asset.sprite_name,
            texture_name=asset.texture_name,
        )

    conn.commit()
    return len(assets)


def record_visual_assets(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Record the visual asset manifest without publishing any image file.

    A caller that reads the manifest rather than the artwork uses this. It takes
    no static directory, so it cannot write into the published image set.
    """
    console.print("Recording visual assets...")

    count = _record_visual_assets(
        conn,
        export_dir,
        lambda source_path, asset: measure(
            source_path,
            domain=asset.domain,
            entity_id=asset.entity_id,
            kind=asset.kind,
            encoding=runtime_encoding(asset.domain, asset.kind),
        ),
    )
    console.print(f"  [green]OK[/green] Recorded {count} visual assets")


def load_visual_assets(
    conn: sqlite3.Connection, export_dir: Path, static_dir: Path
) -> None:
    """Load runtime visual asset manifest rows and publish public images."""
    console.print("Loading visual assets...")
    _require_export(export_dir / "visual_assets.json")

    images_dir = static_dir / "images"
    if images_dir.exists():
        shutil.rmtree(images_dir)

    count = _record_visual_assets(
        conn,
        export_dir,
        lambda source_path, asset: publish(
            source_path,
            static_dir,
            domain=asset.domain,
            entity_id=asset.entity_id,
            kind=asset.kind,
            encoding=runtime_encoding(asset.domain, asset.kind),
        ),
    )
    console.print(f"  [green]OK[/green] Loaded {count} visual assets")


def load_static_data(conn: sqlite3.Connection, curated_dir: Path) -> None:
    """Load static data (factions, reputation tiers) into database.

    This data is manually maintained in static_data.json since it's hardcoded
    in the game client and not exportable from game objects.
    """
    console.print("Loading static data...")

    filepath = curated_dir / "static_data.json"
    _require_export(filepath, "Restore the hand-maintained curated/static_data.json.")

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    cursor = conn.cursor()

    # Load factions (nested under factions.list)
    factions_data = data.get("factions", {})
    factions = factions_data.get("list", [])
    for faction in factions:
        cursor.execute(
            "INSERT INTO factions (id, name) VALUES (?, ?)",
            (faction["id"], faction["name"]),
        )
    console.print(f"  [green]OK[/green] Loaded {len(factions)} factions")

    # Load reputation tiers (nested under factions.reputation_tiers)
    tiers = factions_data.get("reputation_tiers", [])
    for i, tier in enumerate(tiers):
        cursor.execute(
            """INSERT INTO reputation_tiers (id, name, min_value, max_value, is_hostile)
               VALUES (?, ?, ?, ?, ?)""",
            (i, tier["name"], tier["min_value"], tier["max_value"], tier["is_hostile"]),
        )
    console.print(f"  [green]OK[/green] Loaded {len(tiers)} reputation tiers")

    conn.commit()


def _is_numeric_stat_value(value: object) -> bool:
    if isinstance(value, bool):
        return False
    if isinstance(value, (int, float)):
        return True
    return (
        isinstance(value, dict)
        and "base_value" in value
        and "bonus_per_level" in value
        and all(
            isinstance(value[key], (int, float)) and not isinstance(value[key], bool)
            for key in ("base_value", "bonus_per_level")
        )
    )


def load_stats(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load the catalogue and reject numeric export fields outside its inventory."""
    console.print("Loading stat vocabulary...")
    with open(export_dir / "stats.json", encoding="utf-8") as f:
        catalog = StatCatalogData.model_validate(json.load(f))

    stat_ids = {stat.id for stat in catalog.stats}
    if len(stat_ids) != len(catalog.stats):
        raise ValueError("stats.json contains duplicate stat ids")
    mapped: set[tuple[str, str]] = set()
    for stat in catalog.stats:
        if stat.pool_id is not None and stat.pool_id not in stat_ids:
            raise ValueError(
                f"Stat {stat.id} pool_id names unknown stat {stat.pool_id}"
            )
        for term in stat.per_point_of:
            if term.stat_id not in stat_ids:
                raise ValueError(
                    f"Stat {stat.id} per_point_of names unknown stat {term.stat_id}"
                )
        for field in stat.fields:
            key = (field.source, field.field)
            if key in mapped:
                raise ValueError(f"Duplicate stat field {field.source}.{field.field}")
            mapped.add(key)

    non_stats: set[tuple[str, str]] = set()
    for non_stat in catalog.non_stat_fields:
        key = (non_stat.source, non_stat.field)
        if key in mapped:
            raise ValueError(
                f"Field {non_stat.source}.{non_stat.field} is both mapped and non-stat"
            )
        if key in non_stats:
            raise ValueError(
                f"Duplicate non-stat field {non_stat.source}.{non_stat.field}"
            )
        non_stats.add(key)

    known_fields = mapped | non_stats
    for source, filename in (
        ("item", "items.json"),
        ("skill", "skills.json"),
        ("class", "classes_combat.json"),
        ("pet", "pets.json"),
    ):
        with open(export_dir / filename, encoding="utf-8") as f:
            entries = json.load(f)
        for entry in entries:
            values = entry.get("stats") if source == "item" else entry
            if values is None:
                continue
            for field_name, value in values.items():
                if (
                    _is_numeric_stat_value(value)
                    and (source, field_name) not in known_fields
                ):
                    raise ValueError(
                        f"Unmapped numeric stat field {source}.{field_name}"
                    )

    with conn:
        for order, stat in enumerate(catalog.stats):
            conn.execute(
                "INSERT INTO stats "
                "(id, sort_order, name, name_key, item_name, item_label, "
                "weapon_item_name, override_reason, format, min_value, max_value, "
                "pool_id, per_point_of) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    stat.id,
                    order,
                    stat.name,
                    stat.name_key,
                    stat.item_name,
                    stat.item_label,
                    stat.weapon_item_name,
                    stat.override_reason,
                    stat.format,
                    stat.min_value,
                    stat.max_value,
                    stat.pool_id,
                    json.dumps([term.model_dump() for term in stat.per_point_of]),
                ),
            )
        for stat in catalog.stats:
            conn.executemany(
                "INSERT INTO stat_fields (source, field, stat_id, modifier, curve) "
                "VALUES (?, ?, ?, ?, ?)",
                [
                    (field.source, field.field, stat.id, field.modifier, field.curve)
                    for field in stat.fields
                ],
            )
    console.print(f"  [green]OK[/green] Loaded {len(catalog.stats)} stats")


def load_classes(
    conn: sqlite3.Connection, session_dir: Path, curated_dir: Path
) -> None:
    """Load player classes into database.

    Merges two sources:
    - classes.json: manually curated metadata (description, roles, difficulty, races)
    - classes_combat.json: exported combat stats from player prefabs (damage, health, resists)
    """
    console.print("Loading classes...")

    filepath = curated_dir / "classes.json"
    _require_export(filepath, "Restore the hand-maintained curated/classes.json.")

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    combat_filepath = session_dir / "classes_combat.json"
    _require_export(combat_filepath)
    with open(combat_filepath, "r", encoding="utf-8") as f:
        combat_data = json.load(f)
    combat_by_id = {entry["id"]: entry for entry in combat_data}
    curated_ids = [entry["id"] for entry in data]
    combat_ids = [entry["id"] for entry in combat_data]
    if len(set(curated_ids)) != len(curated_ids):
        raise ValueError(f"{filepath} contains duplicate class ids")
    if len(combat_by_id) != len(combat_ids):
        raise ValueError(f"{combat_filepath} contains duplicate class ids")
    if set(curated_ids) != set(combat_ids):
        raise ValueError(
            f"{filepath} and {combat_filepath} class ids do not match: "
            f"missing combat={sorted(set(curated_ids) - set(combat_ids))}, "
            f"unexpected combat={sorted(set(combat_ids) - set(curated_ids))}"
        )
    console.print(
        f"  Merging combat stats from classes_combat.json ({len(combat_by_id)} entries)"
    )

    # Merge combat fields into each class entry
    for item in data:
        combat = combat_by_id[item["id"]]
        for key, value in combat.items():
            # Only merge combat stat fields, don't overwrite manual metadata
            if key.startswith("base_"):
                item[key] = value
        # resource_type from combat export is authoritative (detected from prefab scaling)
        if "resource_type" in combat:
            item["resource_type"] = combat["resource_type"]

    classes = [ClassData(**item) for item in data]
    for cls in classes:
        if (
            not cls.compatible_races
            or any(not race.strip() for race in cls.compatible_races)
            or len(set(cls.compatible_races)) != len(cls.compatible_races)
        ):
            raise ValueError(
                f"{filepath}: class {cls.id!r} needs non-empty, unique compatible_races"
            )

    # Guard band: reject suspiciously small exports, not an exact class census.
    if len(classes) < 6:
        msg = f"Expected at least 6 classes, found {len(classes)}"
        raise ValueError(msg)

    # Warn above the guard band's upper bound so new classes prompt review.
    if len(classes) > 8:
        console.print(
            f"  [yellow]Warning:[/yellow] Found {len(classes)} classes (expected 6-8)"
        )

    cursor = conn.cursor()
    for cls in classes:
        insert_model(cursor, "classes", cls)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(classes)} classes")


def load_progression(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load complete character progression curves and point budgets."""
    console.print("Loading character progression...")

    filepath = export_dir / "progression.json"
    with open(filepath, "r", encoding="utf-8") as f:
        progression = ProgressionExportData(**json.load(f))

    class_ids = {row[0] for row in conn.execute("SELECT id FROM classes")}
    expected_class_levels = {
        (class_id, level)
        for class_id in class_ids
        for level in range(1, progression.max_level + 1)
    }
    actual_class_levels = {
        (row.class_id, row.level) for row in progression.class_levels
    }
    if len(actual_class_levels) != len(progression.class_levels):
        raise ValueError("progression.json contains duplicate class-level rows")
    if actual_class_levels != expected_class_levels:
        missing = sorted(expected_class_levels - actual_class_levels)
        unexpected = sorted(actual_class_levels - expected_class_levels)
        raise ValueError(
            "progression.json class-level rows do not match classes and level range; "
            f"missing={missing}, unexpected={unexpected}"
        )

    expected_levels = set(range(1, progression.max_level + 1))
    actual_levels = {row.level for row in progression.level_budgets}
    if len(actual_levels) != len(progression.level_budgets):
        raise ValueError("progression.json contains duplicate level budgets")
    if actual_levels != expected_levels:
        raise ValueError(
            "progression.json level budgets do not cover every level; "
            f"missing={sorted(expected_levels - actual_levels)}, "
            f"unexpected={sorted(actual_levels - expected_levels)}"
        )

    expected_races: set[str] = set()
    for (compatible_races,) in conn.execute("SELECT compatible_races FROM classes"):
        expected_races.update(json.loads(compatible_races))
    actual_races = {race.id for race in progression.races}
    if len(actual_races) != len(progression.races):
        raise ValueError("progression.json contains duplicate race rows")
    if actual_races != expected_races:
        raise ValueError(
            "progression.json races do not match class compatibility metadata; "
            f"missing={sorted(expected_races - actual_races)}, "
            f"unexpected={sorted(actual_races - expected_races)}"
        )

    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO progression_rules VALUES (1, ?, ?, ?, ?)",
        (
            progression.max_level,
            progression.max_veteran_points,
            progression.attribute_points_per_veteran,
            progression.veteran_skill_points_per_veteran,
        ),
    )
    for race in progression.races:
        attributes = race.starting_attributes
        cursor.execute(
            "INSERT INTO race_progression VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                race.id,
                race.name,
                attributes.strength,
                attributes.constitution,
                attributes.dexterity,
                attributes.intelligence,
                attributes.wisdom,
                attributes.charisma,
            ),
        )
    for row in progression.class_levels:
        attributes = row.automatic_attributes
        cursor.execute(
            "INSERT INTO class_level_progression VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                row.class_id,
                row.level,
                attributes.strength,
                attributes.constitution,
                attributes.dexterity,
                attributes.intelligence,
                attributes.wisdom,
                attributes.charisma,
            ),
        )
    for budget in progression.level_budgets:
        cursor.execute(
            "INSERT INTO level_budgets VALUES (?, ?, ?)",
            (budget.level, budget.normal_skill_points, budget.attribute_points),
        )

    conn.commit()
    console.print(
        f"  [green]OK[/green] Loaded {len(progression.races)} races, "
        f"{len(progression.class_levels)} class levels, and "
        f"{len(progression.level_budgets)} point budgets"
    )


def _load_achievements(
    conn: sqlite3.Connection,
    export_dir: Path,
    produce: Callable[[Path, str], PublishedAsset],
) -> int:
    """Insert the achievements and their icon rows, using `produce` for the icon.

    Returns the number of achievements inserted.
    """

    filepath = export_dir / "achievements.json"
    _require_export(filepath)

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    achievements = [AchievementData(**item) for item in data]
    if len(achievements) != 38:
        raise ValueError(f"Expected 38 achievements, found {len(achievements)}")

    ids = [achievement.id for achievement in achievements]
    if len(set(ids)) != len(ids):
        raise ValueError("Achievement IDs must be unique")

    display_orders = [achievement.display_order for achievement in achievements]
    if sorted(display_orders) != list(range(len(achievements))):
        raise ValueError(
            "Achievement display order must contain each value from 0 to 37"
        )

    cursor = conn.cursor()
    for achievement in achievements:
        if not achievement.hidden and (
            not achievement.name.strip() or not achievement.description.strip()
        ):
            raise ValueError(
                f"Visible achievement '{achievement.id}' requires a name and description"
            )

        source = _resolve_export_asset_path(export_dir, achievement.unlocked_icon_path)
        if not source.is_file():
            raise FileNotFoundError(
                f"Achievement '{achievement.id}' icon is unavailable: {source}"
            )
        if source.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise ValueError(
                f"Achievement '{achievement.id}' has unsupported icon type "
                f"'{source.suffix.lower()}'"
            )

        insert_asset(
            cursor,
            domain="achievement",
            entity_id=achievement.id,
            kind="icon",
            export_path=achievement.unlocked_icon_path,
            asset=produce(source, achievement.id),
            source_field="unlocked_icon_path",
            source_type="SteamAchievementIcon",
            source_name=achievement.id,
        )
        insert_model(cursor, "achievements", achievement)

    conn.commit()
    return len(achievements)


def record_achievements(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Record the achievements without publishing any icon file."""
    console.print("Recording achievements...")

    count = _load_achievements(
        conn,
        export_dir,
        lambda source, entity_id: measure(
            source,
            domain="achievement",
            entity_id=entity_id,
            kind="icon",
            encoding=Encoding.PHOTO,
        ),
    )
    console.print(f"  [green]OK[/green] Recorded {count} achievements")


def load_achievements(
    conn: sqlite3.Connection, export_dir: Path, static_dir: Path
) -> None:
    """Load Steam achievements and publish their icon files."""
    console.print("Loading achievements...")

    count = _load_achievements(
        conn,
        export_dir,
        lambda source, entity_id: publish(
            source,
            static_dir,
            domain="achievement",
            entity_id=entity_id,
            kind="icon",
            encoding=Encoding.PHOTO,
        ),
    )
    console.print(f"  [green]OK[/green] Loaded {count} achievements")


def load_professions(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load professions into database."""
    console.print("Loading professions...")

    filepath = export_dir / "professions.json"
    _require_export(filepath)

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    professions = [ProfessionData(**item) for item in data]

    achievement_ids = {
        row[0] for row in conn.execute("SELECT id FROM achievements").fetchall()
    }
    unknown_ids = sorted(
        {
            profession.achievement_id
            for profession in professions
            if profession.achievement_id not in achievement_ids
        }
    )
    if unknown_ids:
        raise ValueError(
            f"Professions reference unknown achievement IDs: {', '.join(unknown_ids)}"
        )

    cursor = conn.cursor()

    for profession in professions:
        insert_model(cursor, "professions", profession)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(professions)} professions")


def load_skills(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load skills into database."""
    console.print("Loading skills...")

    filepath = export_dir / "skills.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    skills = [SkillData(**item) for item in data]

    cursor = conn.cursor()
    # Defer FK checks for self-referential prerequisite_skill_id
    cursor.execute("PRAGMA defer_foreign_keys = ON")
    occupied_positions: dict[str, set[int]] = {}

    for skill in skills:
        # Normalize class names to lowercase for consistent querying
        skill.player_classes = [c.lower() for c in skill.player_classes]
        skill.class_skill_positions = {
            class_id.lower(): position
            for class_id, position in skill.class_skill_positions.items()
        }
        if set(skill.class_skill_positions) != set(skill.player_classes):
            raise ValueError(
                f"Skill {skill.id} class_skill_positions must match player_classes"
            )
        for class_id, position in skill.class_skill_positions.items():
            if position < 0:
                raise ValueError(
                    f"Skill {skill.id} has a negative {class_id} progression position"
                )
            class_positions = occupied_positions.setdefault(class_id, set())
            if position in class_positions:
                raise ValueError(
                    f"Class {class_id} has duplicate progression position {position}"
                )
            class_positions.add(position)
        insert_model(cursor, "skills", skill)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(skills)} skills")


def load_items(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load item definitions and preserve ordered private acquisition inputs."""
    with open(export_dir / "items.json", encoding="utf-8") as f:
        items = [ItemData.model_validate(item) for item in json.load(f)]
    cursor = conn.cursor()
    cursor.execute("PRAGMA defer_foreign_keys = ON")
    for item in items:
        insert_model(cursor, "items", item)
    conn.commit()


def load_monster_skills(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Populate monster_skills junction table from monsters.json skill_ids."""
    console.print("Loading monster skills...")

    filepath = export_dir / "monsters.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    monsters = [MonsterData(**item) for item in data]

    cursor = conn.cursor()

    # Skill(ScriptableSkill) initializes level directly from learn_default.
    # MonsterSkills adds that instance without applying the monster's entity level.
    runtime_levels = {
        skill_id: 1 if learn_default else 0
        for skill_id, learn_default in cursor.execute(
            "SELECT id, learn_default FROM skills"
        ).fetchall()
    }

    count = 0
    for monster in monsters:
        for index, skill_id in enumerate(monster.skill_ids):
            if skill_id not in runtime_levels:
                raise ValueError(
                    f"Monster {monster.id} references skill {skill_id} missing from skills.json"
                )
            cursor.execute(
                "INSERT INTO monster_skills "
                "(monster_id, skill_id, skill_index, runtime_level) "
                "VALUES (?, ?, ?, ?)",
                (monster.id, skill_id, index, runtime_levels[skill_id]),
            )
            count += 1

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {count} monster-skill links")


def load_pets(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load pets (familiars, animal pets, mercenaries) into database."""
    console.print("Loading pets...")

    filepath = export_dir / "pets.json"
    _require_export(filepath)

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    pets = [PetData(**item) for item in data]
    pet_ids = {pet.id for pet in pets}
    for skill_id, summoned_pet_id, archer_id, reaper_id in conn.execute(
        "SELECT id, pet_id, archer_pet_id, reaper_pet_id FROM skills "
        "WHERE pet_id IS NOT NULL OR archer_pet_id IS NOT NULL OR reaper_pet_id IS NOT NULL"
    ):
        for pet_id in (summoned_pet_id, archer_id, reaper_id):
            if pet_id is not None and pet_id not in pet_ids:
                raise ValueError(
                    f"Summon skill {skill_id} references pet {pet_id} "
                    "missing from pets.json"
                )

    cursor = conn.cursor()
    for pet in pets:
        insert_model(cursor, "pets", pet)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(pets)} pets")


def load_pet_skills(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Populate pet_skills junction table from pets.json skill_ids."""
    console.print("Loading pet skills...")

    filepath = export_dir / "pets.json"
    _require_export(filepath)

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    pets = [PetData(**item) for item in data]

    cursor = conn.cursor()

    # Build set of valid skill IDs for referential integrity
    valid_skills = {
        row[0] for row in cursor.execute("SELECT id FROM skills").fetchall()
    }

    count = 0
    for pet in pets:
        for index, skill_id in enumerate(pet.skill_ids):
            if skill_id not in valid_skills:
                raise ValueError(
                    f"Pet {pet.id} references skill {skill_id} missing from skills.json"
                )
            cursor.execute(
                "INSERT INTO pet_skills (pet_id, skill_id, skill_index, is_innate) VALUES (?, ?, ?, 0)",
                (pet.id, skill_id, index),
            )
            count += 1

        for index, skill_id in enumerate(pet.innate_skill_ids):
            if skill_id not in valid_skills:
                raise ValueError(
                    f"Pet {pet.id} references innate skill {skill_id} missing from skills.json"
                )
            cursor.execute(
                "INSERT INTO pet_skills (pet_id, skill_id, skill_index, is_innate) VALUES (?, ?, ?, 1)",
                (pet.id, skill_id, index),
            )
            count += 1

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {count} pet-skill links")


def load_quests(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load quests into database."""
    console.print("Loading quests...")

    filepath = export_dir / "quests.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    quests = [QuestData(**item) for item in data]

    cursor = conn.cursor()
    for quest in quests:
        insert_model(cursor, "quests", quest)

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(quests)} quests")


def load_treasure_locations(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load treasure dig locations into database."""
    console.print("Loading treasure locations...")

    filepath = export_dir / "treasure_locations.json"
    _require_export(filepath)

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    locations = [TreasureLocationData(**item) for item in data]

    cursor = conn.cursor()
    for loc in locations:
        insert_model(cursor, "treasure_locations", loc)

    # Acquisition normalization resolves every configured map/location association.

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(locations)} treasure locations")


def _gather_drop_pool(resource: GatherItemData) -> tuple[tuple[str, float], ...]:
    """Preserve authored pool order in complete-definition consistency checks."""
    return tuple((drop.item_id, drop.rate) for drop in resource.random_drops)


def _validate_exported_resource_ids(gather_items: list[GatherItemData]) -> None:
    """Validate exporter-owned IDs before deduplicating resources or inserting links."""
    definitions: dict[str, tuple[str, int, tuple[tuple[str, float], ...]]] = {}
    fishing_variants: dict[tuple[str, int, tuple[tuple[str, float], ...]], str] = {}

    for gather_item in gather_items:
        if gather_item.is_chest:
            if gather_item.resource_id is not None:
                raise ValueError(
                    f"Chest GatherItem {gather_item.id!r} must have resource_id=null"
                )
            continue

        resource_id = gather_item.resource_id
        if not resource_id:
            raise ValueError(
                f"Non-chest GatherItem {gather_item.id!r} requires resource_id"
            )

        definition = (
            gather_item.name,
            gather_item.level,
            _gather_drop_pool(gather_item),
        )
        previous = definitions.get(resource_id)
        if previous is not None and previous != definition:
            raise ValueError(
                f"Gather resource_id {resource_id!r} describes different names, levels, or drop pools"
            )

        if gather_item.is_fishing_spot:
            previous_resource_id = fishing_variants.get(definition)
            if previous_resource_id is not None and previous_resource_id != resource_id:
                raise ValueError(
                    f"Fishing variant {definition[0]!r} has multiple resource IDs"
                )
            fishing_variants[definition] = resource_id

        definitions[resource_id] = definition


def load_gather_items(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load gather items, splitting into gathering_resources and chests."""
    console.print("Loading gather items...")

    filepath = export_dir / "gather_items.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    gather_items = [GatherItemData(**item) for item in data]
    _validate_exported_resource_ids(gather_items)

    cursor = conn.cursor()

    for gather_item in gather_items:
        insert_acquisition_input(cursor, "gathering", gather_item)

    # Deduplicate only by the canonical resource_id assigned by the exporter.
    chests = []
    resources = []
    resource_spawns = []  # All non-chest spawns with zone/position
    resources_seen: dict[str, GatherItemData] = {}

    for gather_item in gather_items:
        if gather_item.is_chest:
            chests.append(gather_item)
            continue

        if gather_item.zone_id and gather_item.position:
            resource_spawns.append(gather_item)

        resource_id = gather_item.resource_id
        if resource_id is None:
            raise ValueError(
                f"Resource {gather_item.id!r} has no canonical resource_id"
            )
        if resource_id not in resources_seen:
            resources_seen[resource_id] = gather_item
            resources.append(gather_item)
        elif gather_item.is_template and not resources_seen[resource_id].is_template:
            # Replace a scene representative with the authoritative template.
            old_idx = resources.index(resources_seen[resource_id])
            resources[old_idx] = gather_item
            resources_seen[resource_id] = gather_item

    # Insert gathering resources
    for resource in resources:
        resource_id = resource.resource_id
        if resource_id is None:
            raise ValueError(f"Resource {resource.id!r} has no canonical resource_id")

        values = {
            "id": resource_id,
            "name": resource.name,
            "is_plant": resource.is_plant,
            "is_fishing_spot": resource.is_fishing_spot,
            "is_mineral": resource.is_mineral,
            "is_radiant_spark": resource.is_radiant_spark,
            "level": resource.level,
            "tool_required_id": resource.tool_required_id,
            "respawn_time": resource.respawn_time,
            "spawn_ready": resource.spawn_ready,
            "prob_despawn": resource.prob_despawn,
            "decrease_faction": resource.decrease_faction,
            "description": resource.description,
        }

        columns = ", ".join(values.keys())
        placeholders = ", ".join(["?"] * len(values))
        sql = f"INSERT INTO gathering_resources ({columns}) VALUES ({placeholders})"
        cursor.execute(sql, tuple(values.values()))

    # Insert gathering resource spawns using the exported canonical ID directly.
    for spawn in resource_spawns:
        if spawn.resource_id is None:
            raise ValueError(f"Spawn {spawn.id!r} has no canonical resource_id")
        cursor.execute(
            """INSERT INTO gathering_resource_spawns
               (id, resource_id, zone_id, sub_zone_id, position_x, position_y, position_z)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                spawn.id,
                spawn.resource_id,
                spawn.zone_id,
                spawn.sub_zone_id,
                spawn.position.x if spawn.position else None,
                spawn.position.y if spawn.position else None,
                spawn.position.z if spawn.position else None,
            ),
        )

    # Insert chests
    for chest in chests:
        # Insert main chest record
        values = {
            "id": chest.id,
            "name": chest.name,
            "zone_id": chest.zone_id,
            "sub_zone_id": chest.sub_zone_id,
            "respawn_time": chest.respawn_time,
            "decrease_faction": chest.decrease_faction,
        }

        # Add position if present
        if chest.position:
            values["position_x"] = chest.position.x
            values["position_y"] = chest.position.y
            values["position_z"] = chest.position.z

        columns = ", ".join(values.keys())
        placeholders = ", ".join(["?"] * len(values))
        sql = f"INSERT INTO chests ({columns}) VALUES ({placeholders})"
        cursor.execute(sql, tuple(values.values()))

    conn.commit()
    console.print(
        f"  [green]OK[/green] Loaded {len(resources)} gathering resources (deduplicated)"
    )
    console.print(
        f"  [green]OK[/green] Loaded {len(resource_spawns)} gathering resource spawns"
    )
    console.print(f"  [green]OK[/green] Loaded {len(chests)} chests")


def load_summon_triggers(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load summon triggers into database."""
    console.print("Loading summon triggers...")

    filepath = export_dir / "summon_triggers.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    triggers = [SummonTriggerData(**item) for item in data]

    cursor = conn.cursor()
    placeholder_count = 0

    for trigger in triggers:
        if trigger.summoned_entity_type == "Monster":
            target = cursor.execute(
                "SELECT monster_id FROM monster_spawns WHERE id=?",
                (trigger.summoned_monster_spawn_id,),
            ).fetchone()
        else:
            target = cursor.execute(
                "SELECT npc_id FROM npc_spawns WHERE id=?",
                (trigger.summoned_npc_spawn_id,),
            ).fetchone()
        if target is None or target[0] != trigger.summoned_entity_id:
            raise ValueError(
                f"Summon trigger {trigger.id} has a missing or mismatched configured spawn target"
            )
        # Extract placeholder_monster_ids before inserting main record
        placeholder_ids = trigger.placeholder_monster_ids

        # Insert main summon_triggers record (excluding placeholder_monster_ids)
        values = {}
        for field_name in type(trigger).model_fields:
            if field_name == "placeholder_monster_ids":
                continue  # Skip - handled by junction table

            value = getattr(trigger, field_name)

            # Handle spawn_position
            if field_name == "spawn_position":
                if value is not None:
                    values["spawn_position_x"] = value.x
                    values["spawn_position_y"] = value.y
                    values["spawn_position_z"] = value.z
            else:
                values[field_name] = serialize_value(value)

        columns = ", ".join(values.keys())
        placeholders = ", ".join(["?"] * len(values))
        sql = f"INSERT INTO summon_triggers ({columns}) VALUES ({placeholders})"
        cursor.execute(sql, tuple(values.values()))

        # Insert placeholder relationships into junction table
        for order, spawn_id in enumerate(placeholder_ids):
            cursor.execute(
                "INSERT INTO summon_trigger_placeholders "
                "(id,trigger_id,spawn_id,placeholder_order) VALUES (?,?,?,?)",
                (f"{trigger.id}:guard:{order}", trigger.id, spawn_id, order),
            )
            placeholder_count += 1

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(triggers)} summon triggers")
    console.print(
        f"  [green]OK[/green] Loaded {placeholder_count} placeholder relationships"
    )


def load_alchemy_tables(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load alchemy table world locations into database."""
    console.print("Loading alchemy tables...")

    filepath = export_dir / "alchemy_tables.json"
    _require_export(filepath)

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    tables = [AlchemyTableData(**item) for item in data]
    for table in tables:
        insert_acquisition_input(conn.cursor(), "alchemy_tables", table)

    # Build lookup maps for zone/sub-zone names
    cursor = conn.cursor()
    zone_names = dict(cursor.execute("SELECT id, name FROM zones").fetchall())
    sub_zone_names = dict(
        cursor.execute("SELECT id, name FROM zone_triggers").fetchall()
    )

    for table in tables:
        cursor.execute(
            """INSERT INTO alchemy_tables
               (id, name, zone_id, zone_name, sub_zone_id, sub_zone_name,
                position_x, position_y, position_z)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                table.id,
                table.name,
                table.zone_id,
                zone_names.get(table.zone_id),
                table.sub_zone_id,
                sub_zone_names.get(table.sub_zone_id) if table.sub_zone_id else None,
                table.position.x,
                table.position.y,
                table.position.z,
            ),
        )

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(tables)} alchemy tables")


def load_houses(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load house purchase world locations into database."""
    console.print("Loading houses...")

    filepath = export_dir / "houses.json"
    _require_export(filepath)

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    houses = [HouseData(**item) for item in data]

    cursor = conn.cursor()
    zone_names = dict(cursor.execute("SELECT id, name FROM zones").fetchall())
    sub_zone_names = dict(
        cursor.execute("SELECT id, name FROM zone_triggers").fetchall()
    )

    for house in houses:
        keywords = "house housing property storage chest"

        cursor.execute(
            """
            INSERT INTO houses (
                id, name, description, base_price, faction_id, faction_required,
                zone_id, zone_name, sub_zone_id, sub_zone_name,
                position_x, position_y, position_z, keywords
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                house.id,
                house.name,
                house.description,
                house.base_price,
                house.faction_id,
                house.faction_required,
                house.zone_id,
                zone_names.get(house.zone_id),
                house.sub_zone_id,
                sub_zone_names.get(house.sub_zone_id) if house.sub_zone_id else None,
                house.position.x,
                house.position.y,
                house.position.z,
                keywords,
            ),
        )

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(houses)} houses")


def load_scribing_tables(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load scribing table world locations into database."""
    console.print("Loading scribing tables...")

    filepath = export_dir / "scribing_tables.json"
    _require_export(filepath)

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    tables = [ScribingTableData(**item) for item in data]
    for table in tables:
        insert_acquisition_input(conn.cursor(), "scribing_tables", table)

    # Build lookup maps for zone/sub-zone names
    cursor = conn.cursor()
    zone_names = dict(cursor.execute("SELECT id, name FROM zones").fetchall())
    sub_zone_names = dict(
        cursor.execute("SELECT id, name FROM zone_triggers").fetchall()
    )

    for table in tables:
        cursor.execute(
            """INSERT INTO scribing_tables
               (id, name, zone_id, zone_name, sub_zone_id, sub_zone_name,
                position_x, position_y, position_z)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                table.id,
                table.name,
                table.zone_id,
                zone_names.get(table.zone_id),
                table.sub_zone_id,
                sub_zone_names.get(table.sub_zone_id) if table.sub_zone_id else None,
                table.position.x,
                table.position.y,
                table.position.z,
            ),
        )

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(tables)} scribing tables")


def load_crafting_stations(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load crafting station world locations into database."""
    console.print("Loading crafting stations...")

    filepath = export_dir / "crafting_stations.json"
    _require_export(filepath)

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    stations = [CraftingStationData(**item) for item in data]
    for station in stations:
        insert_acquisition_input(conn.cursor(), "crafting_stations", station)

    # Build lookup maps for zone/sub-zone names
    cursor = conn.cursor()
    zone_names = dict(cursor.execute("SELECT id, name FROM zones").fetchall())
    sub_zone_names = dict(
        cursor.execute("SELECT id, name FROM zone_triggers").fetchall()
    )

    for station in stations:
        cursor.execute(
            """INSERT INTO crafting_stations
               (id, name, zone_id, zone_name, sub_zone_id, sub_zone_name,
                position_x, position_y, position_z, is_cooking_oven)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                station.id,
                station.name,
                station.zone_id,
                zone_names.get(station.zone_id),
                station.sub_zone_id,
                sub_zone_names.get(station.sub_zone_id)
                if station.sub_zone_id
                else None,
                station.position.x,
                station.position.y,
                station.position.z,
                station.is_cooking_oven,
            ),
        )

    conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(stations)} crafting stations")


def load_recipe_family(conn: sqlite3.Connection, export_dir: Path, family: str) -> None:
    """Insert route anchors separately from immutable complete recipe variants."""
    models: dict[
        str, type[CraftingRecipeData | AlchemyRecipeData | ScribingRecipeData]
    ] = {
        "crafting_recipes": CraftingRecipeData,
        "alchemy_recipes": AlchemyRecipeData,
        "scribing_recipes": ScribingRecipeData,
    }
    model_type = models[family]
    with open(export_dir / f"{family}.json", encoding="utf-8") as f:
        recipes = [model_type.model_validate(row) for row in json.load(f)]
    anchors: dict[str, str] = {}
    definitions: dict[str, dict] = {}
    cursor = conn.cursor()
    for recipe in recipes:
        result = anchors.setdefault(recipe.id, recipe.result_item_id)
        if result != recipe.result_item_id:
            raise ValueError(f"{family} route {recipe.id} has conflicting results")
        payload = recipe.model_dump()
        # Route identity is not part of a complete native definition.
        definition = {key: value for key, value in payload.items() if key != "id"}
        previous = definitions.get(recipe.definition_key)
        if previous is not None:
            if previous != definition:
                raise ValueError(
                    f"{family} definition key {recipe.definition_key} has conflicting content"
                )
            continue
        definitions[recipe.definition_key] = definition
        insert_acquisition_input(cursor, family, recipe, identity=recipe.definition_key)
    cursor.executemany(
        f"INSERT INTO {family} (id,result_item_id) VALUES (?,?)", anchors.items()
    )
    conn.commit()


def load_game_config(conn: sqlite3.Connection, export_dir: Path) -> None:
    with open(export_dir / "game_config.json", encoding="utf-8") as f:
        config = GameConfigData.model_validate(json.load(f))
    insert_acquisition_input(conn.cursor(), "game_config", config, identity="config")
    conn.commit()
