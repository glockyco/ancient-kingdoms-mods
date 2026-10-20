"""The meaning of each reference, declared once and read by every pass.

Each reference carries one declaration with two independent attributes:

``reaches``
    Whether the reference puts its target in a reachability closure.

``locus``
    The geometry the reference governs. The value is the row's own position, a
    destination, or nothing.

``reaches`` follows from the direction: a reference that carries no reachability
is read in neither direction.

The direction is declared, not guessed from the target. A row provides what it
names, or the rows it names provide the row, or neither. A reference to a place
is read backwards because a place contains the row that names it, and a row that
lists the members it is composed of is read backwards for the same reason: the
members provide the row, so removing every member removes the row.

A destination reaches nothing. ``portals.to_zone_id`` therefore cannot make an
excluded zone reachable, and ``portals.from_zone_id`` still puts the portal in
the zone that contains it. Position suppression reads the same two attributes.
A portal into a suppressed zone loses its destination coordinates and keeps its
own position.
"""

import sqlite3
from dataclasses import dataclass
from typing import Literal

from compendium.redactions.discovery import (
    ENTITY_JSON_CARRIERS,
    SUB_ZONE_TABLE,
    ZONE_JSON_CARRIERS,
    ZONE_TABLE,
    foreign_keys,
)

Locus = Literal["own", "destination", "none"]

# Which way a reference carries reachability. "provides" reads forwards, from the
# row to what it names. "provided_by" reads backwards, from what it names to the
# row. "none" carries no reachability in either direction.
Direction = Literal["provides", "provided_by", "none"]

# References to a place a row points at, and the geometry each one governs. A
# reference that is absent from this table governs the row's own position. A new
# table with a position therefore needs no entry here.
DESTINATIONS: dict[tuple[str, str], tuple[str, ...]] = {
    ("portals", "to_zone_id"): ("destination_",),
    ("portals", "to_sub_zone_id"): ("destination_",),
    ("npc_spawns", "teleport_zone_id"): ("teleport_destination_",),
    ("traps", "teleport_zone_id"): ("teleport_position_", "teleport_orientation_"),
    ("items", "travel_zone_id"): ("travel_destination_",),
}

# References through which a row provides what it names. If you reach the row,
# you reach the target.
PROVIDES: frozenset[tuple[str, str]] = frozenset(
    {
        # A spawn puts a monster, an NPC or a gathering resource in the world.
        ("monster_spawns", "monster_id"),
        ("npc_spawns", "npc_id"),
        ("gathering_resource_spawns", "resource_id"),
        # A summon puts a monster in the world without a spawn record. Two
        # monsters have no spawn record and are only summoned.
        ("summon_triggers", "summoned_entity_id"),
        ("monsters", "placeholder_monster_id"),
        ("skills", "summoned_monster_id"),
        ("skills", "pet_id"),
        ("skills", "archer_pet_id"),
        ("skills", "reaper_pet_id"),
        # These references grant a skill.
        ("monster_skills", "skill_id"),
        ("pet_skills", "skill_id"),
        ("items", "potion_buff_id"),
        ("items", "food_buff_id"),
        ("items", "scroll_skill_id"),
        ("items", "weapon_proc_effect_id"),
        ("items", "relic_buff_id"),
        ("traps", "effect_skill_id"),
        ("zone_triggers", "environment_hazard_skill_id"),
        # These references yield an item.
        ("fish", "item_id"),
        ("alchemy_recipes", "result_item_id"),
        ("crafting_recipes", "result_item_id"),
        ("scribing_recipes", "result_item_id"),
        ("items", "fragment_result_item_id"),
        ("items", "luck_token_fragment_id"),
        ("items", "recipe_potion_learned_id"),
        ("luck_tokens", "boss_luck_token_id"),
        ("luck_tokens", "fragment_token_id"),
    }
)

# References to something a row needs, targets or describes. If you reach the
# row, you do not necessarily reach the target.
MENTIONS: frozenset[tuple[str, str]] = frozenset(
    {
        ("altars", "required_activation_item_id"),
        ("altars", "reward_common_id"),
        ("altars", "reward_magic_id"),
        ("altars", "reward_epic_id"),
        ("altars", "reward_legendary_id"),
        ("class_level_progression", "class_id"),
        ("gathering_resources", "tool_required_id"),
        ("items", "buy_token_id"),
        ("items", "weapon_required_ammo_id"),
        ("monster_skills", "monster_id"),
        ("npcs", "faction"),
        ("pet_skills", "pet_id"),
        ("portals", "need_monster_dead_spawn_id"),
        ("portals", "required_item_id"),
        ("professions", "achievement_id"),
        ("stat_fields", "stat_id"),
        ("stats", "pool_id"),
        ("treasure_locations", "required_map_id"),
        ("treasure_locations", "reward_id"),
    }
)

# JSON carriers, declared with the same attributes.
JSON_PROVIDES: frozenset[tuple[str, str]] = frozenset(
    {
        ("altars", "waves"),
        ("items", "augment_skill_bonuses"),
        ("items", "augment_skill_bonuses_with_names"),
        ("npcs", "drops"),
        ("skills", "granted_by_items"),
    }
)

# Existing aggregate references. Canonical identified memberships are declared
# separately because each membership is a graph node rather than a junction.
PROVIDED_BY: frozenset[tuple[str, str]] = frozenset()

# An armour set bonus is reached by wearing its pieces, so the pieces provide it.
# A set whose every piece is removed is unobtainable.
# A class skill is reached by playing a class that lists it.
JSON_PROVIDED_BY: frozenset[tuple[str, str]] = frozenset(
    {
        ("items", "augment_armor_set_item_ids"),
        ("items", "augment_armor_set_members"),
        ("skills", "player_classes"),
    }
)

JSON_MENTIONS: frozenset[tuple[str, str]] = frozenset()

PROVIDER_COLUMNS = {
    "monster_spawns": "monster_spawn_id",
    "npcs": "npc_id",
    "altars": "altar_id",
    "resource_spawns": "resource_spawn_id",
    "chests": "chest_id",
    "crafting_stations": "crafting_station_id",
    "alchemy_tables": "alchemy_table_id",
    "scribing_tables": "scribing_table_id",
    "items": "item_id",
    "classes": "class_id",
    "treasure_locations": "treasure_location_id",
}

# Parent ownership is backwards. Targets of costs, gates and lookups are never
# providers. A provider reaches its membership, which reaches the method.
CANONICAL_DIRECTIONS: dict[tuple[str, str], Direction] = {
    ("acquisition_methods", "setup_method_id"): "provides",
    ("acquisition_kill_details", "loot_zone_number"): "none",
    ("summon_triggers", "summoned_monster_spawn_id"): "none",
    ("summon_triggers", "summoned_npc_spawn_id"): "none",
    ("summon_trigger_placeholders", "trigger_id"): "provided_by",
    ("summon_trigger_placeholders", "spawn_id"): "none",
    ("acquisition_cost_groups", "method_id"): "provided_by",
    ("acquisition_inputs", "cost_group_id"): "provided_by",
    ("acquisition_inputs", "item_id"): "none",
    ("acquisition_outputs", "method_id"): "provided_by",
    ("acquisition_outputs", "item_id"): "provides",
    ("acquisition_faction_effects", "method_id"): "provided_by",
    ("acquisition_faction_effects", "faction_id"): "none",
    ("acquisition_method_pools", "method_id"): "provided_by",
    ("acquisition_method_pools", "pool_id"): "provides",
    ("acquisition_global_roots", "method_id"): "provides",
    ("acquisition_home_providers", "method_id"): "provides",
    ("acquisition_home_providers", "structure_item_id"): "provided_by",
    ("acquisition_method_fishing_rules", "method_id"): "provided_by",
    ("acquisition_method_fishing_rules", "fishing_rule_id"): "provides",
    ("loot_pool_entries", "pool_id"): "provided_by",
    ("loot_pool_entries", "item_id"): "provides",
    ("loot_pool_entries", "child_pool_id"): "provides",
    ("loot_monster_rules", "pool_id"): "provided_by",
    ("loot_chest_rules", "pool_id"): "provided_by",
    ("loot_fishing_rules", "primary_pool_id"): "provides",
    ("loot_fishing_rules", "trash_pool_id"): "provides",
    ("loot_fishing_rules", "fallback_pool_id"): "provides",
    ("item_pool_definitions", "item_id"): "provided_by",
    ("item_pool_definitions", "pool_id"): "provides",
    ("monsters", "loot_pool_id"): "provides",
    ("quest_objectives", "quest_id"): "provided_by",
    ("quest_objective_items", "id"): "provided_by",
    ("quest_objective_items", "item_id"): "none",
    ("quest_objective_monsters", "id"): "provided_by",
    ("quest_objective_monsters", "monster_id"): "none",
    ("quest_objective_locations", "id"): "provided_by",
    ("quest_objective_locations", "zone_id"): "none",
    ("quest_objective_locations", "sub_zone_id"): "none",
    ("quest_objective_brews", "id"): "provided_by",
    ("quest_objective_brews", "item_id"): "none",
    ("quest_predecessors", "quest_id"): "provided_by",
    ("quest_predecessors", "predecessor_quest_id"): "none",
    ("quest_class_requirements", "quest_id"): "provided_by",
    ("quest_class_requirements", "class_id"): "none",
    ("quest_race_requirements", "quest_id"): "provided_by",
    ("quest_race_requirements", "race_id"): "none",
    ("quest_faction_requirements", "quest_id"): "provided_by",
    ("quest_faction_requirements", "faction_id"): "none",
    ("quest_reward_slots", "quest_id"): "provided_by",
    ("quest_reward_slots", "class_id"): "none",
    ("quest_reward_slots", "item_id"): "provides",
    ("quest_provided_items", "quest_id"): "provided_by",
    ("quest_provided_items", "item_id"): "provides",
    ("npc_quest_memberships", "npc_id"): "provided_by",
    ("npc_quest_memberships", "quest_id"): "provides",
    ("npc_skills", "npc_id"): "provided_by",
    ("npc_skills", "skill_id"): "provides",
    ("item_class_requirements", "item_id"): "provided_by",
    ("item_class_requirements", "class_id"): "none",
    ("skill_predecessors", "skill_id"): "provided_by",
    ("skill_predecessors", "predecessor_skill_id"): "none",
}
for _domain, _column in PROVIDER_COLUMNS.items():
    CANONICAL_DIRECTIONS[(f"acquisition_providers_{_domain}", _column)] = "provided_by"
    CANONICAL_DIRECTIONS[(f"acquisition_providers_{_domain}", "method_id")] = "provides"

DETAIL_TARGETS = {
    "kill": (
        "monster_id",
        "loot_pool_id",
        "loot_zone_id",
        "altar_id",
        "parent_monster_spawn_id",
    ),
    "vendor": ("npc_id", "offered_item_id"),
    "quest": ("quest_id",),
    "recipe": (
        "crafting_recipe_id",
        "alchemy_recipe_id",
        "scribing_recipe_id",
        "declared_result_item_id",
    ),
    "resource": ("resource_id",),
    "world_chest": ("chest_id", "key_item_id"),
    "item": ("item_id",),
    "treasure": ("treasure_location_id", "map_item_id"),
    "service": (),
    "creation": ("class_id",),
    "housing": ("structure_item_id",),
    "cap_xp": ("reward_item_id",),
    "altar": ("altar_id",),
}
for _family, _columns in DETAIL_TARGETS.items():
    _table = f"acquisition_{_family}_details"
    CANONICAL_DIRECTIONS[(_table, "id")] = "provided_by"
    for _column in _columns:
        CANONICAL_DIRECTIONS[(_table, _column)] = "none"
for _key in (
    ("acquisition_kill_details", "loot_pool_id"),
    ("acquisition_vendor_details", "offered_item_id"),
    ("acquisition_recipe_details", "crafting_recipe_id"),
    ("acquisition_recipe_details", "alchemy_recipe_id"),
    ("acquisition_recipe_details", "scribing_recipe_id"),
    ("acquisition_recipe_details", "declared_result_item_id"),
):
    CANONICAL_DIRECTIONS[_key] = "provides"
CANONICAL_DIRECTIONS[("acquisition_item_details", "item_id")] = "provided_by"


@dataclass(frozen=True)
class Reference:
    """One reference and the single declaration every pass reads."""

    table: str
    column: str
    target_table: str
    target_column: str
    direction: Direction
    locus: Locus
    json_keys: tuple[str, ...] = ()
    geometry_prefixes: tuple[str, ...] = ()
    # The column and value that select the rows this reference covers. A row
    # that fails the test holds a value in another identifier space.
    condition: tuple[str, str] | None = None

    @property
    def reaches(self) -> bool:
        """Whether the reference puts anything in a reachability closure."""
        return self.direction != "none"

    @property
    def backwards(self) -> bool:
        """Whether reachability runs from what the row names to the row."""
        return self.direction == "provided_by"

    @property
    def to_zone(self) -> bool:
        """Whether the target is a place, so the reference is read backwards."""
        return self.target_table in (ZONE_TABLE, SUB_ZONE_TABLE)

    @property
    def to_sub_zone(self) -> bool:
        return self.target_table == SUB_ZONE_TABLE

    @property
    def numeric(self) -> bool:
        return self.target_table == ZONE_TABLE and self.target_column == "zone_id"

    @property
    def embedded(self) -> bool:
        return bool(self.json_keys)

    def __str__(self) -> str:
        arrow = {"provides": "▶", "provided_by": "◀", "none": "·"}[self.direction]
        return (
            f"{self.table}.{self.column} {arrow} {self.target_table} "
            f"({self.direction}, {self.locus})"
        )


class UndeclaredReference(Exception):
    """The data holds a reference that no declaration covers."""


def _semantics(key: tuple[str, str], embedded: bool) -> Direction | None:
    if not embedded and key in CANONICAL_DIRECTIONS:
        return CANONICAL_DIRECTIONS[key]
    provides = JSON_PROVIDES if embedded else PROVIDES
    provided_by = JSON_PROVIDED_BY if embedded else PROVIDED_BY
    mentions = JSON_MENTIONS if embedded else MENTIONS
    if key in provides:
        return "provides"
    if key in provided_by:
        return "provided_by"
    if key in mentions:
        return "none"
    return None


def resolve(conn: sqlite3.Connection) -> list[Reference]:
    """Attach one declaration to every reference the schema and carriers hold.

    Raises `UndeclaredReference` when something is missing, so a schema addition
    stops the build rather than being classified by a default nobody chose.
    """
    references: list[Reference] = []
    undeclared: list[str] = []

    for key in foreign_keys(conn):
        canonical = CANONICAL_DIRECTIONS.get((key.table, key.column))
        if key.target_table in (ZONE_TABLE, SUB_ZONE_TABLE) and canonical is None:
            prefixes = DESTINATIONS.get((key.table, key.column))
            references.append(
                Reference(
                    table=key.table,
                    column=key.column,
                    target_table=key.target_table,
                    target_column=key.target_column,
                    direction="none" if prefixes is not None else "provided_by",
                    locus="destination" if prefixes is not None else "own",
                    geometry_prefixes=prefixes or (),
                )
            )
            continue

        direction = _semantics((key.table, key.column), embedded=False)
        if direction is None:
            undeclared.append(f"{key.table}.{key.column} -> {key.target_table}")
            continue
        references.append(
            Reference(
                table=key.table,
                column=key.column,
                target_table=key.target_table,
                target_column=key.target_column,
                direction=direction,
                locus="own" if key.table == "quest_objective_locations" else "none",
                condition=key.condition,
            )
        )

    for table, column, keys, target in ENTITY_JSON_CARRIERS:
        if column not in {
            row[1] for row in conn.execute(f"PRAGMA table_info({table})")
        }:
            continue
        direction = _semantics((table, column), embedded=True)
        if direction is None:
            undeclared.append(f"{table}.{column} -> {target} (embedded)")
            continue
        references.append(
            Reference(
                table=table,
                column=column,
                target_table=target,
                target_column="id",
                direction=direction,
                locus="none",
                json_keys=keys,
            )
        )

    for table, column, key_name, target_column in ZONE_JSON_CARRIERS:
        references.append(
            Reference(
                table=table,
                column=column,
                target_table=ZONE_TABLE,
                target_column=target_column,
                direction="provided_by",
                locus="own",
                json_keys=(key_name,),
            )
        )

    if undeclared:
        raise UndeclaredReference(
            "references with no declaration:\n  " + "\n  ".join(sorted(undeclared))
        )
    return references
