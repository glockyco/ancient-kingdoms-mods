"""The meaning of each reference, declared once and read by every pass.

Each reference carries one declaration with two independent attributes:

``reaches``
    Whether the reference puts its target in a reachability closure.

``locus``
    The geometry the reference governs. The value is the row's own position, a
    destination, or nothing.

Direction comes from the target and is not declared. A reference to a place is
read backwards, because a place contains the row that names it. Every other
reference is read forwards, because a row provides what it names.

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
        # These references grant a skill.
        ("monster_skills", "skill_id"),
        ("pet_skills", "skill_id"),
        ("items", "potion_buff_id"),
        ("items", "food_buff_id"),
        ("items", "scroll_skill_id"),
        ("items", "weapon_proc_effect_id"),
        ("items", "relic_buff_id"),
        ("skills", "prerequisite_skill_id"),
        ("skills", "prerequisite2_skill_id"),
        ("traps", "effect_skill_id"),
        ("zone_triggers", "environment_hazard_skill_id"),
        # These references yield an item.
        ("chests", "item_reward_id"),
        ("gathering_resources", "item_reward_id"),
        ("fish", "item_id"),
        ("treasure_locations", "reward_id"),
        ("quests", "given_item_on_start_id"),
        ("alchemy_recipes", "result_item_id"),
        ("crafting_recipes", "result_item_id"),
        ("scribing_recipes", "result_item_id"),
        ("items", "fragment_result_item_id"),
        ("items", "luck_token_fragment_id"),
        ("items", "recipe_potion_learned_id"),
        ("luck_tokens", "boss_luck_token_id"),
        ("luck_tokens", "fragment_token_id"),
        # Denormalized source tables. These are empty when the closure runs in
        # this pipeline. They are declared so that a closure over a fully
        # denormalized database gives the same result.
        ("item_source_entries", "item_id"),
        ("item_sources_altar", "item_id"),
        ("item_sources_chest", "item_id"),
        ("item_sources_gather", "item_id"),
        ("item_sources_merge", "item_id"),
        ("item_sources_monster", "item_id"),
        ("item_sources_pack", "item_id"),
        ("item_sources_quest", "item_id"),
        ("item_sources_random", "item_id"),
        ("item_sources_recipe", "item_id"),
        ("item_sources_treasure_map", "item_id"),
        ("item_sources_vendor", "item_id"),
    }
)

# References to something a row needs, targets or describes. If you reach the
# row, you do not necessarily reach the target.
MENTIONS: frozenset[tuple[str, str]] = frozenset(
    {
        ("altars", "required_activation_item_id"),
        ("chests", "key_required_id"),
        ("gathering_resources", "tool_required_id"),
        ("items", "buy_token_id"),
        ("items", "taught_by_recipe_id"),
        ("items", "weapon_required_ammo_id"),
        ("item_sources_altar", "altar_id"),
        ("item_sources_chest", "chest_id"),
        ("item_sources_gather", "resource_id"),
        ("item_sources_merge", "component_item_id"),
        ("item_sources_monster", "monster_id"),
        ("item_sources_pack", "pack_item_id"),
        ("item_sources_quest", "quest_id"),
        ("item_sources_random", "random_item_id"),
        ("item_sources_treasure_map", "map_item_id"),
        ("item_sources_treasure_map", "treasure_location_id"),
        ("item_sources_vendor", "currency_item_id"),
        ("item_sources_vendor", "npc_id"),
        ("item_sources_vendor", "required_faction"),
        ("item_usages_altar", "altar_id"),
        ("item_usages_altar", "item_id"),
        ("item_usages_chest", "chest_id"),
        ("item_usages_chest", "item_id"),
        ("item_usages_currency", "currency_item_id"),
        ("item_usages_currency", "npc_id"),
        ("item_usages_currency", "purchasable_item_id"),
        ("item_usages_portal", "item_id"),
        ("item_usages_portal", "portal_id"),
        ("item_usages_quest", "item_id"),
        ("item_usages_quest", "quest_id"),
        ("item_usages_recipe", "item_id"),
        ("item_zones_obtainable", "item_id"),
        ("item_zones_usable", "item_id"),
        ("monster_skills", "monster_id"),
        ("monster_spawns", "source_altar_activation_item_id"),
        ("monster_spawns", "source_monster_id"),
        ("monster_spawns", "source_summon_kill_monster_id"),
        ("npcs", "faction"),
        ("pet_skills", "pet_id"),
        ("portals", "need_monster_dead_id"),
        ("portals", "required_item_id"),
        ("professions", "achievement_id"),
        ("quests", "end_npc_id"),
        ("quests", "gather_item_1_id"),
        ("quests", "gather_item_2_id"),
        ("quests", "gather_item_3_id"),
        ("quests", "kill_target_1_id"),
        ("quests", "kill_target_2_id"),
        ("quests", "potion_item_id"),
        ("quests", "start_npc_id"),
        ("summon_trigger_placeholders", "spawn_id"),
        ("summon_trigger_placeholders", "trigger_id"),
        ("treasure_locations", "required_map_id"),
    }
)

# JSON carriers, declared with the same attributes.
JSON_PROVIDES: frozenset[tuple[str, str]] = frozenset(
    {
        ("altars", "waves"),
        ("items", "augment_armor_set_item_ids"),
        ("items", "augment_armor_set_members"),
        ("items", "augment_skill_bonuses"),
        ("items", "augment_skill_bonuses_with_names"),
        ("items", "chest_rewards"),
        ("monsters", "drops"),
        ("npcs", "drops"),
        ("npcs", "items_sold"),
        ("npcs", "quests_completed_here"),
        ("npcs", "quests_offered"),
        ("npcs", "skill_ids"),
        ("quests", "predecessor_ids"),
        ("quests", "rewards"),
        ("skills", "granted_by_items"),
    }
)

JSON_MENTIONS: frozenset[tuple[str, str]] = frozenset(
    {
        ("alchemy_recipes", "materials"),
        ("crafting_recipes", "materials"),
        ("items", "alchemy_recipe_materials"),
        ("quests", "equip_items"),
        ("quests", "gather_items"),
        ("quests", "required_items"),
        ("scribing_recipes", "materials"),
    }
)


@dataclass(frozen=True)
class Reference:
    """One reference and the single declaration every pass reads."""

    table: str
    column: str
    target_table: str
    target_column: str
    reaches: bool
    locus: Locus
    json_keys: tuple[str, ...] = ()
    geometry_prefixes: tuple[str, ...] = ()
    # The column and value that select the rows this reference covers. A row
    # that fails the test holds a value in another identifier space.
    condition: tuple[str, str] | None = None

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
        direction = "◀" if self.to_zone else "▶"
        meaning = "reaches" if self.reaches else "mentions"
        return (
            f"{self.table}.{self.column} {direction} {self.target_table} "
            f"({meaning}, {self.locus})"
        )


class UndeclaredReference(Exception):
    """The data holds a reference that no declaration covers."""


def _semantics(key: tuple[str, str], embedded: bool) -> bool | None:
    provides = JSON_PROVIDES if embedded else PROVIDES
    mentions = JSON_MENTIONS if embedded else MENTIONS
    if key in provides:
        return True
    if key in mentions:
        return False
    return None


def resolve(conn: sqlite3.Connection) -> list[Reference]:
    """Attach one declaration to every reference the schema and carriers hold.

    Raises `UndeclaredReference` when something is missing, so a schema addition
    stops the build rather than being classified by a default nobody chose.
    """
    references: list[Reference] = []
    undeclared: list[str] = []

    for key in foreign_keys(conn):
        if key.target_table in (ZONE_TABLE, SUB_ZONE_TABLE):
            prefixes = DESTINATIONS.get((key.table, key.column))
            references.append(
                Reference(
                    table=key.table,
                    column=key.column,
                    target_table=key.target_table,
                    target_column=key.target_column,
                    reaches=prefixes is None,
                    locus="destination" if prefixes is not None else "own",
                    geometry_prefixes=prefixes or (),
                )
            )
            continue

        reaches = _semantics((key.table, key.column), embedded=False)
        if reaches is None:
            undeclared.append(f"{key.table}.{key.column} -> {key.target_table}")
            continue
        references.append(
            Reference(
                table=key.table,
                column=key.column,
                target_table=key.target_table,
                target_column=key.target_column,
                reaches=reaches,
                locus="none",
                condition=key.condition,
            )
        )

    for table, column, keys, target in ENTITY_JSON_CARRIERS:
        reaches = _semantics((table, column), embedded=True)
        if reaches is None:
            undeclared.append(f"{table}.{column} -> {target} (embedded)")
            continue
        references.append(
            Reference(
                table=table,
                column=column,
                target_table=target,
                target_column="id",
                reaches=reaches,
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
                reaches=True,
                locus="own",
                json_keys=(key_name,),
            )
        )

    if undeclared:
        raise UndeclaredReference(
            "references with no declaration:\n  " + "\n  ".join(sorted(undeclared))
        )
    return references
