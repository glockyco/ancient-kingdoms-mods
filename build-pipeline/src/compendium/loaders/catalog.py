"""The datasets the build loads into SQLite, in load order.

Every table a loader fills belongs to exactly one dataset here. A dataset names
the export files it reads, the tables it fills and the datasets whose tables it
reads. `load_all` checks the whole catalog before it loads anything, so a
dataset declared twice, a table with two owners, a prerequisite listed after its
dependent, or a missing input fails the build and names the dataset.

Adding a dataset:

- A simple dataset is one JSON array whose elements each validate against one
  model and become one row of one table. Declare it with `model`. It needs no
  loader function and no other registration.
- Anything else is a custom dataset: several inputs or tables, derived columns,
  checks against other tables, junction rows, or published files. Write its
  loader in `core.py` and declare it with `handler`.

Either way, list in `after` every dataset whose tables it reads.
`tests/test_registration.py` checks that `after` covers the foreign keys of the
dataset's tables, and that every schema table has an owner here or is filled by
the denormalizers.
"""

import json
import sqlite3
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path

from pydantic import BaseModel
from rich.console import Console

from compendium.db import insert_model
from compendium.loaders.core import (
    load_achievements,
    load_alchemy_tables,
    load_classes,
    load_crafting_stations,
    load_gather_items,
    load_houses,
    load_items,
    load_monster_skills,
    load_pet_skills,
    load_pets,
    load_professions,
    load_progression,
    load_quests,
    load_scribing_tables,
    load_skills,
    load_static_data,
    load_summon_triggers,
    load_treasure_locations,
    load_visual_assets,
    record_achievements,
    record_visual_assets,
)
from compendium.models import (
    AlchemyRecipeData,
    AltarData,
    CraftingRecipeData,
    EquipmentSlotData,
    FishData,
    GameGuideArticleData,
    LuckTokenData,
    MonsterData,
    MonsterSpawnData,
    NpcData,
    NpcSpawnData,
    PortalData,
    ScribingRecipeData,
    TrapData,
    ZoneData,
    ZoneTriggerData,
)

console = Console()


@dataclass(frozen=True)
class LoadContext:
    conn: sqlite3.Connection
    session_dir: Path
    curated_dir: Path
    # Without a static directory, artwork datasets record their rows and write
    # no image file. `redactions check` loads this way.
    static_dir: Path | None = None


Handler = Callable[[LoadContext], None]


@dataclass(frozen=True)
class Dataset:
    id: str
    inputs: tuple[str, ...]
    tables: tuple[str, ...]
    curated_inputs: tuple[str, ...] = ()
    after: tuple[str, ...] = ()
    model: type[BaseModel] | None = None
    handler: Handler | None = None

    def __post_init__(self) -> None:
        if (self.model is None) == (self.handler is None):
            raise ValueError(f"Dataset {self.id} needs exactly one of model or handler")
        if self.model is not None and (
            len(self.inputs) + len(self.curated_inputs) != 1 or len(self.tables) != 1
        ):
            raise ValueError(
                f"Simple dataset {self.id} needs exactly one input and one table"
            )


def _plain(loader: Callable[[sqlite3.Connection, Path], None]) -> Handler:
    def handler(ctx: LoadContext) -> None:
        loader(ctx.conn, ctx.session_dir)

    return handler


def _visual_assets(ctx: LoadContext) -> None:
    if ctx.static_dir is None:
        record_visual_assets(ctx.conn, ctx.session_dir)
    else:
        load_visual_assets(ctx.conn, ctx.session_dir, ctx.static_dir)


def _achievements(ctx: LoadContext) -> None:
    if ctx.static_dir is None:
        record_achievements(ctx.conn, ctx.session_dir)
    else:
        load_achievements(ctx.conn, ctx.session_dir, ctx.static_dir)


DATASETS: tuple[Dataset, ...] = (
    Dataset(
        "static_data",
        (),
        ("factions", "reputation_tiers"),
        curated_inputs=("static_data.json",),
        handler=lambda ctx: load_static_data(ctx.conn, ctx.curated_dir),
    ),
    Dataset(
        "classes",
        ("classes_combat.json",),
        ("classes",),
        curated_inputs=("classes.json",),
        handler=lambda ctx: load_classes(ctx.conn, ctx.session_dir, ctx.curated_dir),
    ),
    Dataset(
        "equipment_slots",
        ("equipment_slots.json",),
        ("equipment_slots",),
        model=EquipmentSlotData,
    ),
    Dataset(
        "game_guide",
        ("game_guide.json",),
        ("game_guide_articles",),
        model=GameGuideArticleData,
    ),
    Dataset(
        "progression",
        ("progression.json",),
        (
            "progression_rules",
            "race_progression",
            "class_level_progression",
            "level_budgets",
        ),
        after=("classes",),
        handler=_plain(load_progression),
    ),
    Dataset("zones", ("zone_info.json",), ("zones",), model=ZoneData),
    Dataset(
        "visual_assets",
        ("visual_assets.json",),
        ("visual_assets",),
        handler=_visual_assets,
    ),
    Dataset(
        "achievements",
        ("achievements.json",),
        ("achievements",),
        handler=_achievements,
    ),
    Dataset(
        "professions",
        ("professions.json",),
        ("professions",),
        after=("achievements",),
        handler=_plain(load_professions),
    ),
    Dataset("skills", ("skills.json",), ("skills",), handler=_plain(load_skills)),
    Dataset(
        "zone_triggers",
        ("zone_triggers.json",),
        ("zone_triggers",),
        after=("zones", "skills"),
        model=ZoneTriggerData,
    ),
    Dataset(
        "houses",
        ("houses.json",),
        ("houses",),
        after=("zones", "zone_triggers"),
        handler=_plain(load_houses),
    ),
    Dataset(
        "items",
        ("items.json",),
        ("items", "item_sources_pack", "item_sources_random", "item_sources_merge"),
        after=("zones", "skills"),
        handler=_plain(load_items),
    ),
    Dataset("fish", ("fish.json",), ("fish",), after=("items",), model=FishData),
    Dataset(
        "luck_tokens",
        ("luck_tokens.json",),
        ("luck_tokens",),
        after=("zones", "items"),
        model=LuckTokenData,
    ),
    Dataset(
        "altars",
        ("altars.json",),
        ("altars",),
        after=("zones", "zone_triggers"),
        model=AltarData,
    ),
    Dataset("monsters", ("monsters.json",), ("monsters",), model=MonsterData),
    Dataset(
        "monster_spawns",
        ("monster_spawns.json",),
        ("monster_spawns",),
        after=("zones", "zone_triggers", "monsters"),
        model=MonsterSpawnData,
    ),
    Dataset(
        "monster_skills",
        ("monsters.json",),
        ("monster_skills",),
        after=("skills", "monsters"),
        handler=_plain(load_monster_skills),
    ),
    Dataset(
        "pets",
        ("pets.json",),
        ("pets",),
        # Not a foreign key: the loader checks that every summon skill's pet exists.
        after=("skills",),
        handler=_plain(load_pets),
    ),
    Dataset(
        "pet_skills",
        ("pets.json",),
        ("pet_skills",),
        after=("skills", "pets"),
        handler=_plain(load_pet_skills),
    ),
    Dataset(
        "npcs",
        ("npcs.json",),
        ("npcs",),
        after=("static_data",),
        model=NpcData,
    ),
    Dataset(
        "npc_spawns",
        ("npc_spawns.json",),
        ("npc_spawns",),
        after=("zones", "zone_triggers", "npcs"),
        model=NpcSpawnData,
    ),
    Dataset(
        "summon_triggers",
        ("summon_triggers.json",),
        ("summon_triggers", "summon_trigger_placeholders"),
        after=("zones", "monster_spawns"),
        handler=_plain(load_summon_triggers),
    ),
    Dataset(
        "quests",
        ("quests.json",),
        ("quests",),
        after=("zones", "zone_triggers", "items", "monsters", "npcs"),
        handler=_plain(load_quests),
    ),
    Dataset(
        "portals",
        ("portals.json",),
        ("portals",),
        after=("zones", "zone_triggers", "items", "monsters"),
        model=PortalData,
    ),
    Dataset(
        "treasure_locations",
        ("treasure_locations.json",),
        ("treasure_locations", "item_sources_treasure_map"),
        # The items loader leaves the treasure maps it found for this loader.
        after=("zones", "zone_triggers", "items"),
        handler=_plain(load_treasure_locations),
    ),
    Dataset(
        "traps",
        ("traps.json",),
        ("traps",),
        after=("zones", "zone_triggers", "skills"),
        model=TrapData,
    ),
    Dataset(
        "gather_items",
        ("gather_items.json",),
        (
            "gathering_resources",
            "gathering_resource_spawns",
            "chests",
            "item_sources_gather",
            "item_sources_chest",
        ),
        after=("zones", "zone_triggers", "items"),
        handler=_plain(load_gather_items),
    ),
    Dataset(
        "crafting_recipes",
        ("crafting_recipes.json",),
        ("crafting_recipes",),
        after=("items",),
        model=CraftingRecipeData,
    ),
    Dataset(
        "alchemy_recipes",
        ("alchemy_recipes.json",),
        ("alchemy_recipes",),
        after=("items",),
        model=AlchemyRecipeData,
    ),
    Dataset(
        "alchemy_tables",
        ("alchemy_tables.json",),
        ("alchemy_tables",),
        after=("zones", "zone_triggers"),
        handler=_plain(load_alchemy_tables),
    ),
    Dataset(
        "scribing_recipes",
        ("scribing_recipes.json",),
        ("scribing_recipes",),
        after=("items",),
        model=ScribingRecipeData,
    ),
    Dataset(
        "scribing_tables",
        ("scribing_tables.json",),
        ("scribing_tables",),
        after=("zones", "zone_triggers"),
        handler=_plain(load_scribing_tables),
    ),
    Dataset(
        "crafting_stations",
        ("crafting_stations.json",),
        ("crafting_stations",),
        after=("zones", "zone_triggers"),
        handler=_plain(load_crafting_stations),
    ),
)


def validate_catalog(
    datasets: Sequence[Dataset], session_dir: Path, curated_dir: Path
) -> None:
    """Reject a catalog that cannot load correctly, before anything loads."""
    declared = {dataset.id for dataset in datasets}
    loaded: set[str] = set()
    owners: dict[str, str] = {}
    for dataset in datasets:
        if dataset.id in loaded:
            raise ValueError(f"Dataset {dataset.id} is declared twice")
        for prerequisite in dataset.after:
            if prerequisite not in loaded:
                where = (
                    "is listed after it"
                    if prerequisite in declared
                    else "is not declared"
                )
                raise ValueError(
                    f"Dataset {dataset.id} needs {prerequisite}, which {where}"
                )
        for table in dataset.tables:
            if table in owners:
                raise ValueError(
                    f"Table {table} is filled by both {owners[table]} and {dataset.id}"
                )
            owners[table] = dataset.id
        loaded.add(dataset.id)

    missing = [
        f"{root / name} ({dataset.id})"
        for dataset in datasets
        for root, names in (
            (session_dir, dataset.inputs),
            (curated_dir, dataset.curated_inputs),
        )
        for name in names
        if not (root / name).is_file()
    ]
    if missing:
        raise FileNotFoundError(
            f"Required inputs are missing: {', '.join(missing)}. "
            "Export runtime data or restore the hand-maintained curated input."
        )


def load_dataset(ctx: LoadContext, dataset: Dataset) -> None:
    """Load one dataset. A simple dataset goes through the validated insert path."""
    if dataset.handler is not None:
        dataset.handler(ctx)
        return

    assert dataset.model is not None
    if dataset.inputs:
        (input_name,) = dataset.inputs
        input_dir = ctx.session_dir
    else:
        (input_name,) = dataset.curated_inputs
        input_dir = ctx.curated_dir
    (table,) = dataset.tables
    console.print(f"Loading {dataset.id}...")
    data = json.loads((input_dir / input_name).read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        # An empty export means the exporter found nothing, which is never valid.
        raise ValueError(f"{input_name} must hold a non-empty JSON array")
    rows = [dataset.model.model_validate(element) for element in data]

    cursor = ctx.conn.cursor()
    for row in rows:
        insert_model(cursor, table, row)
    ctx.conn.commit()
    console.print(f"  [green]OK[/green] Loaded {len(rows)} rows into {table}")


def load_all(
    conn: sqlite3.Connection,
    session_dir: Path,
    curated_dir: Path,
    static_dir: Path | None = None,
) -> None:
    """Load every dataset into the database, in catalog order.

    `redactions check` recomputes the removal decisions, so it needs the same
    starting state as a build.

    Args:
        static_dir: Where to write image files. Without one, the artwork datasets
            record manifest rows but write no image files.
    """
    validate_catalog(DATASETS, session_dir, curated_dir)
    ctx = LoadContext(conn, session_dir, curated_dir, static_dir)
    for dataset in DATASETS:
        load_dataset(ctx, dataset)
