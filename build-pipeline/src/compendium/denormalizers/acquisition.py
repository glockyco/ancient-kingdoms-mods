"""Normalize acquisition facts before closure and derive public opportunities after it."""

from __future__ import annotations

import json
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

STAGING_FAMILIES = (
    "items",
    "skills",
    "monsters",
    "monster_spawns",
    "npcs",
    "quests",
    "gathering",
    "crafting_recipes",
    "alchemy_recipes",
    "scribing_recipes",
    "crafting_stations",
    "alchemy_tables",
    "scribing_tables",
    "game_config",
)
RULES = {
    "kill": {
        "monster_loot",
        "boss_loot",
        "altar_final_loot",
        "placeholder_loot",
        "lootless",
    },
    "recipe": {"crafting", "cooking", "alchemy", "scribing"},
    "gather": {"herbalism", "mining", "fishing", "radiant", "gather_fixed"},
    **{
        kind: {kind}
        for kind in (
            "vendor",
            "quest_accept",
            "quest_complete",
            "altar_activate",
            "world_chest",
            "portable_chest",
            "pack_use",
            "merge",
            "fragment",
            "treasure_dig",
            "blessing",
            "essence",
            "creation",
            "housing",
            "cap_xp",
        )
    },
}
# Cost groups a chest attempt chooses between: its key first, otherwise lockpicks.
CHEST_COST_ALTERNATIVES = frozenset({"chest_key_first", "chest_lockpick_fallback"})
PROVIDERS = {
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
DETAILS = {
    "kill": "kill",
    "vendor": "vendor",
    "quest_accept": "quest",
    "quest_complete": "quest",
    "altar_activate": "altar",
    "recipe": "recipe",
    "gather": "resource",
    "world_chest": "world_chest",
    "portable_chest": "item",
    "pack_use": "item",
    "merge": "item",
    "fragment": "item",
    "treasure_dig": "treasure",
    "blessing": "service",
    "essence": "service",
    "creation": "creation",
    "housing": "housing",
    "cap_xp": "cap_xp",
}


def _rows(
    conn: sqlite3.Connection, sql: str, params: tuple = ()
) -> list[dict[str, Any]]:
    cursor = conn.execute(sql, params)
    names = [column[0] for column in cursor.description]
    return [dict(zip(names, row)) for row in cursor.fetchall()]


def _insert(conn: sqlite3.Connection, table: str, **values: Any) -> None:
    columns = ",".join(values)
    conn.execute(
        f'INSERT INTO "{table}" ({columns}) VALUES ({",".join("?" for _ in values)})',
        tuple(values.values()),
    )


def _key(*parts: Any) -> str:
    # Private ingestion keys are replaced by the publication rekey pass.
    return json.dumps(parts, separators=(",", ":"), ensure_ascii=True)


def _authority() -> dict[str, Any]:
    path = (
        Path(__file__).resolve().parents[4]
        / "website/src/lib/acquisition/rules-data.json"
    )
    with path.open(encoding="utf-8") as stream:
        return json.load(stream)


class _Normalizer:
    def __init__(
        self, conn: sqlite3.Connection, inputs: dict[str, list[dict[str, Any]]]
    ):
        self.conn = conn
        self.inputs = inputs
        self.items = {row["id"]: row for row in inputs["items"]}
        self.monsters = {row["id"]: row for row in inputs["monsters"]}
        self.classes = {
            row["name"]: row["id"] for row in _rows(conn, "SELECT id,name FROM classes")
        }
        self.config = inputs["game_config"][0]
        self.pool_by_item: dict[str, str] = {}
        self.recipe_by_definition: dict[str, str] = {}
        self.kill_methods: dict[str, str] = {}
        self.output_ordinals: Counter[str] = Counter()

    def method(
        self,
        kind: str,
        identity: Any,
        rule: str | None = None,
        setup: str | None = None,
    ) -> str:
        method = _key("method", kind, identity)
        _insert(
            self.conn,
            "acquisition_methods",
            id=method,
            kind=kind,
            rule_id=rule or kind,
            setup_method_id=setup,
            rooted=0,
            source_level_hint=None,
        )
        return method

    def detail(self, family: str, method: str, **fields: Any) -> None:
        _insert(self.conn, f"acquisition_{family}_details", id=method, **fields)

    def provider(
        self, domain: str, method: str, target: str, ordinal: int | None = None
    ) -> None:
        _insert(
            self.conn,
            f"acquisition_providers_{domain}",
            id=_key("provider", domain, method, target, ordinal),
            method_id=method,
            **{PROVIDERS[domain]: target},
            offer_index=ordinal,
        )

    def cost(
        self,
        method: str,
        phase: str,
        entries: list[tuple[str | None, int, str]],
        quantity: str = "fixed",
        consumption: str = "on_success",
        selection: str = "always",
    ) -> None:
        if not entries:
            return
        group = _key("cost", method, phase, selection)
        _insert(
            self.conn,
            "acquisition_cost_groups",
            id=group,
            method_id=method,
            phase=phase,
            quantity_rule=quantity,
            consumption_rule=consumption,
            selection_rule=selection,
        )
        for ordinal, (item, amount, role) in enumerate(entries):
            if amount <= 0:
                raise ValueError(f"Acquisition {method}: nonpositive {role} input")
            _insert(
                self.conn,
                "acquisition_inputs",
                id=_key("input", group, ordinal),
                cost_group_id=group,
                ordinal=ordinal,
                resource_kind="item" if item else "gold",
                item_id=item,
                amount=amount,
                role=role,
                withheld=0,
            )

    def output(
        self,
        method: str,
        item: str | None,
        amount: int | None = 1,
        maximum: int | None = None,
        rule: str = "fixed",
        delivery: str | None = None,
        condition: int | None = None,
        slot: int | None = None,
    ) -> None:
        ordinal = self.output_ordinals[method]
        self.output_ordinals[method] += 1
        if delivery is None:
            delivery = "keyring" if item and self.items[item]["is_key"] else "inventory"
        _insert(
            self.conn,
            "acquisition_outputs",
            id=_key("output", method, ordinal),
            method_id=method,
            ordinal=ordinal,
            resource_kind="item" if item else "gold",
            item_id=item,
            amount_min=amount,
            amount_max=amount if maximum is None else maximum,
            yield_rule=rule,
            delivery=delivery,
            slot=slot,
            condition_slot=condition,
            withheld=0,
        )

    def award(
        self,
        method: str,
        item: str,
        amount: int = 1,
        *,
        resolve_pack: bool = False,
        resolve_random: bool = False,
        delivery: str | None = None,
        condition: int | None = None,
    ) -> None:
        definition = self.items[item]
        if resolve_pack and definition["pack_final_item_id"]:
            self.output(
                method,
                definition["pack_final_item_id"],
                amount * definition["pack_final_amount"],
                condition=condition,
                delivery=delivery,
            )
        elif (
            resolve_random
            and item in self.pool_by_item
            and definition["item_type"] == "random"
        ):
            self.bind_pool(method, self.pool_by_item[item], "parent_award")
        else:
            self.output(method, item, amount, delivery=delivery, condition=condition)

    def bind_pool(self, method: str, pool: str, event: str) -> None:
        ordinal = self.conn.execute(
            "SELECT count(*) FROM acquisition_method_pools WHERE method_id=?", (method,)
        ).fetchone()[0]
        _insert(
            self.conn,
            "acquisition_method_pools",
            id=_key("method_pool", method, ordinal),
            method_id=method,
            pool_id=pool,
            ordinal=ordinal,
            event=event,
        )

    def pool(
        self,
        kind: str,
        identity: Any,
        entries: list[dict[str, Any]],
        *,
        wrappers: bool = False,
        boss_caps: bool = False,
    ) -> str:
        pool = _key("pool", kind, identity)
        _insert(self.conn, "loot_pools", id=pool, kind=kind)
        groups: dict[str, int] = {}
        counts = Counter(entry["item_id"] for entry in entries)
        for ordinal, entry in enumerate(entries):
            item = entry["item_id"]
            definition = self.items[item]
            groups.setdefault(item, len(groups))
            equipment = definition["quality"] > 0 and definition["item_type"] in {
                "weapon",
                "equipment",
                "ammo",
                "costume",
            }
            quest_branch = kind == "monster" and bool(
                definition["is_quest_item"] or definition["has_gather_quest"]
            )
            child = (
                self.pool_by_item.get(item)
                if wrappers and not quest_branch and definition["item_type"] == "random"
                else None
            )
            gate = kind == "monster" and bool(
                definition["is_quest_item"]
                or (boss_caps and definition["has_gather_quest"])
            )
            _insert(
                self.conn,
                "loot_pool_entries",
                id=_key("entry", pool, ordinal),
                pool_id=pool,
                ordinal=ordinal,
                item_id=item,
                child_pool_id=child,
                resolution="uniform_child" if child else "direct",
                probability=entry.get("rate", entry.get("probability", 1.0)),
                duplicate_group=groups[item],
                cap=counts[item] if boss_caps else None if kind == "monster" else 1,
                counts_equipment=int(equipment and not quest_branch),
                guaranteed_equipment_candidate=int(equipment),
                quest_gate="public_need" if gate else "none",
                scales_with_treasure_hunter=int(
                    entry.get("scales_with_treasure_hunter", False)
                ),
                quality=definition["quality"],
                withheld=0,
            )
        return pool

    def item_definitions(self) -> None:
        # Allocate every wrapper first so nested references do not depend on export order.
        for item in self.items.values():
            if item["item_type"] == "random":
                self.pool_by_item[item["id"]] = _key("pool", "random", item["id"])
        for item in self.items.values():
            item_id = item["id"]
            if item["item_type"] == "random":
                pool = self.pool(
                    "random",
                    item_id,
                    [{"item_id": target} for target in item["random_items"]],
                    wrappers=True,
                )
                _insert(
                    self.conn,
                    "item_pool_definitions",
                    id=_key("definition", item_id, "random"),
                    item_id=item_id,
                    pool_id=pool,
                    role="random",
                )
            if item["item_type"] == "chest":
                pool = self.pool("portable_chest", item_id, item["chest_rewards"])
                _insert(
                    self.conn,
                    "item_pool_definitions",
                    id=_key("definition", item_id, "portable_chest"),
                    item_id=item_id,
                    pool_id=pool,
                    role="portable_chest",
                )
                _insert(
                    self.conn,
                    "loot_chest_rules",
                    id=_key("chest_rule", pool),
                    pool_id=pool,
                    num_items=item["chest_num_items"],
                )
                method = self.method("portable_chest", item_id)
                self.detail("item", method, item_id=item_id)
                self.provider("items", method, item_id)
                self.cost(
                    method,
                    "use",
                    [(item_id, 1, "activation")],
                    consumption="before_roll",
                )
                self.bind_pool(method, pool, "opening")
            if item["pack_final_item_id"]:
                method = self.method("pack_use", item_id)
                self.detail("item", method, item_id=item_id)
                self.provider("items", method, item_id)
                self.cost(method, "use", [(item_id, 1, "activation")])
                self.award(method, item_id, resolve_pack=True)
            if item["fragment_result_item_id"]:
                method = self.method("fragment", item_id)
                self.detail("item", method, item_id=item_id)
                self.provider("items", method, item_id)
                self.cost(
                    method,
                    "use",
                    [(item_id, item["fragment_amount_needed"], "fragment")],
                )
                self.award(method, item["fragment_result_item_id"])
            for ordinal, class_name in enumerate(item["class_required"]):
                if class_name.lower() == "all":
                    continue
                _insert(
                    self.conn,
                    "item_class_requirements",
                    id=_key("item_class", item_id, ordinal),
                    item_id=item_id,
                    ordinal=ordinal,
                    class_id=self.classes[class_name],
                    withheld=0,
                )
        merges: dict[tuple[str, tuple[str, ...]], list[str]] = defaultdict(list)
        for item in self.items.values():
            if item["merge_result_item_id"]:
                # Native MergeItem consumes exactly itemsNeeded, including its initiator when listed.
                components = tuple(item["merge_items_needed_ids"])
                merges[(item["merge_result_item_id"], components)].append(item["id"])
        for (result, components), initiators in merges.items():
            method = self.method("merge", [result, components])
            self.detail("item", method, item_id=initiators[0])
            for item_id in initiators:
                self.provider("items", method, item_id)
            self.cost(method, "use", [(item, 1, "component") for item in components])
            self.award(method, result)

    def recipes(self) -> None:
        for family, route_column, rule in (
            ("crafting_recipes", "crafting_recipe_id", None),
            ("alchemy_recipes", "alchemy_recipe_id", "alchemy"),
            ("scribing_recipes", "scribing_recipe_id", "scribing"),
        ):
            for recipe in self.inputs[family]:
                display = rule or (
                    "cooking" if recipe["is_cooking_oven"] else "crafting"
                )
                method = self.method("recipe", recipe["definition_key"], display)
                if recipe["definition_key"] in self.recipe_by_definition:
                    raise ValueError(
                        f"Duplicate kind-qualified recipe key {recipe['definition_key']}"
                    )
                self.recipe_by_definition[recipe["definition_key"]] = method
                self.detail(
                    "recipe",
                    method,
                    **{
                        column: recipe["id"] if column == route_column else None
                        for column in (
                            "crafting_recipe_id",
                            "alchemy_recipe_id",
                            "scribing_recipe_id",
                        )
                    },
                    declared_result_item_id=recipe["result_item_id"],
                    result_amount=recipe["result_amount"],
                    tier=recipe["tier"],
                    display_kind=display,
                    experience=recipe["experience"],
                )
                self.cost(
                    method,
                    "attempt",
                    [
                        (row["item_id"], row["amount"], "material")
                        for row in recipe["materials"]
                    ],
                    consumption="before_roll",
                )
                self.award(
                    method,
                    recipe["result_item_id"],
                    recipe["result_amount"],
                    resolve_pack=True,
                )
        for family in ("crafting_stations", "alchemy_tables", "scribing_tables"):
            for provider in self.inputs[family]:
                for offer in provider["recipe_offers"]:
                    method = self.recipe_by_definition[offer["definition_key"]]
                    self.provider(family, method, provider["id"], offer["offer_index"])
        for structure in self.config["housing_catalog"]:
            method = self.method("housing", structure["item_id"])
            self.detail("housing", method, structure_item_id=structure["item_id"])
            price = self.items[structure["item_id"]]["structure_price"]
            if price > 0:
                self.cost(method, "purchase", [(None, price, "currency")])
            self.output(method, structure["item_id"], delivery="placed_structure")
            _insert(
                self.conn,
                "acquisition_global_roots",
                id=_key("root", method),
                method_id=method,
                origin="housing",
            )
            for station in structure["workstations"]:
                for offer in station["recipe_offers"]:
                    target = self.recipe_by_definition[offer["definition_key"]]
                    _insert(
                        self.conn,
                        "acquisition_home_providers",
                        id=_key(
                            "home",
                            target,
                            structure["item_id"],
                            station["component_path"],
                            offer["offer_index"],
                        ),
                        method_id=target,
                        structure_item_id=structure["item_id"],
                        component_path=station["component_path"],
                        offer_index=offer["offer_index"],
                    )

    def quest_facts(self) -> None:
        races = {
            row["name"]: row["id"]
            for row in _rows(self.conn, "SELECT id,name FROM race_progression")
        }
        factions = {
            row["name"]: row["id"]
            for row in _rows(self.conn, "SELECT id,name FROM factions")
        }
        # Native offer flags, not quest navigation associations, govern these providers.
        memberships: dict[tuple[str, str], list[str]] = defaultdict(list)
        for npc in self.inputs["npcs"]:
            for offer in npc["quest_offers"]:
                ordinal, quest_id = offer["offer_index"], offer["quest_id"]
                for flag, role in (
                    ("accept_here", "offer"),
                    ("complete_here", "complete"),
                ):
                    if not offer[flag]:
                        continue
                    _insert(
                        self.conn,
                        "npc_quest_memberships",
                        id=_key("quest_member", npc["id"], role, ordinal),
                        npc_id=npc["id"],
                        quest_id=quest_id,
                        role=role,
                        ordinal=ordinal,
                    )
                    memberships[(quest_id, role)].append(npc["id"])
            for index, skill in enumerate(npc["skill_ids"]):
                _insert(
                    self.conn,
                    "npc_skills",
                    id=_key("npc_skill", npc["id"], index),
                    npc_id=npc["id"],
                    skill_id=skill,
                    skill_index=index,
                )
        for quest in self.inputs["quests"]:
            quest_id = quest["id"]
            for family, target_column, values in (
                ("predecessors", "predecessor_quest_id", quest["predecessor_ids"]),
                (
                    "class_requirements",
                    "class_id",
                    [
                        self.classes[name]
                        for name in quest["class_requirements"]
                        if name.lower() != "all"
                    ],
                ),
                (
                    "race_requirements",
                    "race_id",
                    [
                        races[name]
                        for name in quest["race_requirements"]
                        if name.lower() != "all"
                    ],
                ),
            ):
                for ordinal, target in enumerate(values):
                    _insert(
                        self.conn,
                        f"quest_{family}",
                        id=_key("quest_fact", family, quest_id, ordinal),
                        quest_id=quest_id,
                        ordinal=ordinal,
                        **{target_column: target},
                        withheld=0,
                    )
            for ordinal, faction in enumerate(quest["faction_requirements"]):
                _insert(
                    self.conn,
                    "quest_faction_requirements",
                    id=_key("quest_faction", quest_id, ordinal),
                    quest_id=quest_id,
                    ordinal=ordinal,
                    faction_id=factions[faction["faction"]],
                    standing=faction["faction_value"],
                    withheld=0,
                )
            rewards = quest["rewards"]
            self.conn.execute(
                "UPDATE quests SET reward_gold=?,reward_experience=? WHERE id=?",
                (rewards["gold"], rewards["exp"], quest_id),
            )
            for phase in ("accept", "complete"):
                method = self.method(f"quest_{phase}", quest_id)
                self.detail("quest", method, quest_id=quest_id, phase=phase)
                for npc_id in dict.fromkeys(
                    memberships[
                        (quest_id, "offer" if phase == "accept" else "complete")
                    ]
                ):
                    self.provider("npcs", method, npc_id)
                if phase == "accept":
                    if quest["given_item_on_start_id"]:
                        item = quest["given_item_on_start_id"]
                        _insert(
                            self.conn,
                            "quest_provided_items",
                            id=_key("quest_provided", quest_id, 0),
                            quest_id=quest_id,
                            ordinal=0,
                            item_id=item,
                            amount=1,
                            withheld=0,
                        )
                        self.award(method, item)
                    continue
                for ordinal, reward in enumerate(rewards["items"]):
                    class_name = reward["class_specific"]
                    item = reward["item_id"]
                    _insert(
                        self.conn,
                        "quest_reward_slots",
                        id=_key("quest_reward", quest_id, ordinal),
                        quest_id=quest_id,
                        ordinal=ordinal,
                        slot_kind="class" if class_name else "shared",
                        class_id=self.classes[class_name] if class_name else None,
                        item_id=item,
                        class_withheld=0,
                        item_withheld=0,
                        amount=1,
                    )
                    self.award(method, item, condition=ordinal)
                    definition = self.items[item]
                    # Native completion gives ammo only on the selected class reward branch.
                    if (
                        class_name
                        and definition["weapon_category"] == "Bow"
                        and definition["weapon_required_ammo_id"]
                    ):
                        self.output(
                            method,
                            definition["weapon_required_ammo_id"],
                            _authority()["quest"]["classBowAmmoAmount"],
                            condition=ordinal,
                        )
                if rewards["gold"] > 0:
                    self.output(method, None, rewards["gold"])
                if quest["remove_items_on_complete"]:
                    entries = [
                        (row["item_id"], row["amount"], role)
                        for field, role in (
                            ("gather_items", "quest_primary"),
                            ("required_items", "quest_secondary"),
                        )
                        for row in quest[field]
                        if row["amount"] > 0
                    ]
                    self.cost(
                        method,
                        "complete",
                        entries,
                        quantity="quest_completion",
                        consumption="quest_inventory_then_equipped",
                    )
            self.objectives(quest)
        for skill in self.inputs["skills"]:
            for ordinal, (target, rank) in enumerate(
                (
                    (skill["prerequisite_skill_id"], skill["prerequisite_level"]),
                    (skill["prerequisite2_skill_id"], skill["prerequisite2_level"]),
                )
            ):
                if target:
                    _insert(
                        self.conn,
                        "skill_predecessors",
                        id=_key("skill_predecessor", skill["id"], ordinal),
                        skill_id=skill["id"],
                        ordinal=ordinal,
                        predecessor_skill_id=target,
                        rank=rank,
                        withheld=0,
                    )

    def objectives(self, quest: dict[str, Any]) -> None:
        quest_id = quest["id"]
        facts: list[
            tuple[int, str, str, str | None, int | None, dict[str, Any] | None]
        ] = []
        kind = quest["quest_type"]
        if kind == "kill":
            for index in range(1, 3):
                facts.append(
                    (
                        index - 1,
                        "monster",
                        "kill_counter",
                        quest[f"kill_target_{index}_id"],
                        quest[f"kill_amount_{index}"],
                        None,
                    )
                )
        elif kind == "gather":
            for index in range(1, 4):
                facts.append(
                    (
                        index - 1,
                        "item",
                        "gather_counter",
                        quest[f"gather_item_{index}_id"],
                        quest[f"gather_amount_{index}"],
                        None,
                    )
                )
        elif kind == "gather_inventory":
            for field, role in (
                ("gather_items", "inventory_primary"),
                ("required_items", "inventory_secondary"),
            ):
                for row in quest[field]:
                    facts.append(
                        (len(facts), "item", role, row["item_id"], row["amount"], None)
                    )
        elif kind == "equip_item":
            for ordinal, item in enumerate(quest["equip_items"]):
                facts.append((ordinal, "item", "equipped", item, 1, None))
        elif kind == "alchemy":
            facts.append(
                (
                    0,
                    "brew",
                    "brew_counter",
                    quest["potion_item_id"],
                    quest["potions_amount"],
                    None,
                )
            )
        elif kind == "location":
            declared_location = {
                "zone_id": quest["discovered_location_zone_id"],
                "sub_zone_id": quest["discovered_location_sub_zone_id"],
                "position": quest["discovered_location_position"],
                "area": quest["discovered_location_area"],
                "discovered_location": quest["discovered_location"],
                "tracking_quest_location": quest["tracking_quest_location"],
            }
            # Source: server-scripts/PlayerQuests.cs:338-339 — finding an NPC starts fulfilled.
            find_npc = quest["is_find_npc_quest"]
            if not find_npc or any(declared_location.values()):
                facts.append(
                    (
                        0,
                        "location",
                        "tracking_location" if find_npc else "location_visit",
                        None,
                        None,
                        declared_location,
                    )
                )
        elif kind != "general":
            raise ValueError(f"Quest {quest_id}: unsupported quest type {kind!r}")
        next_ordinal = max((row[0] for row in facts), default=-1) + 1
        for additional_location in quest["objectives"]:
            if additional_location["type"] == "location":
                facts.append(
                    (
                        next_ordinal,
                        "location",
                        "tracking_location",
                        None,
                        None,
                        additional_location,
                    )
                )
                next_ordinal += 1
        for ordinal, objective_kind, role, target, amount, location in facts:
            if objective_kind != "location" and (amount is None or amount <= 0):
                continue
            if objective_kind != "location" and not target:
                raise ValueError(
                    f"Quest {quest_id}: positive {role} objective has no target"
                )
            objective = _key("objective", quest_id, ordinal)
            _insert(
                self.conn,
                "quest_objectives",
                id=objective,
                quest_id=quest_id,
                ordinal=ordinal,
                kind=objective_kind,
                role=role,
                amount=amount,
                withheld=0,
            )
            if objective_kind == "location":
                assert location is not None
                position = location.get("position") or {}
                area = location.get("area")
                _insert(
                    self.conn,
                    "quest_objective_locations",
                    id=objective,
                    zone_id=location.get("zone_id"),
                    sub_zone_id=location.get("sub_zone_id"),
                    discovered_location=location.get("discovered_location"),
                    position_x=position.get("x"),
                    position_y=position.get("y"),
                    position_z=position.get("z"),
                    area_shape=area["shape"] if area else None,
                    area_radius=area["radius"] if area else None,
                    area_paths=json.dumps(
                        [[[point["x"], point["y"]] for point in area["points"]]]
                    )
                    if area and area["shape"] == "polygon"
                    else None,
                    tracking_quest_location=location.get("tracking_quest_location"),
                )
            else:
                family = {"item": "items", "monster": "monsters", "brew": "brews"}[
                    objective_kind
                ]
                column = "monster_id" if objective_kind == "monster" else "item_id"
                _insert(
                    self.conn,
                    f"quest_objective_{family}",
                    id=objective,
                    **{column: target},
                )

    def vendors_and_services(self) -> None:
        seasonal = self.config["seasonal_items"]
        special = self.config["special_items"]
        authority = _authority()
        names: dict[str, list[str]] = defaultdict(list)
        for definition in self.items.values():
            names[definition["name"]].append(definition["id"])
        for npc in self.inputs["npcs"]:
            npc_id = npc["id"]
            for ordinal, offer in enumerate(npc["items_sold"]):
                item = offer["item_id"]
                method = self.method("vendor", [npc_id, ordinal, "none"])
                self.detail(
                    "vendor", method, npc_id=npc_id, offered_item_id=item, season="none"
                )
                self.provider("npcs", method, npc_id, ordinal)
                if offer["price"] > 0:
                    self.cost(
                        method,
                        "purchase",
                        [(offer["currency_item_id"], offer["price"], "currency")],
                    )
                self.award(method, item, resolve_pack=True)
            if npc["roles"]["can_repair_equipment"]:
                for season in ("halloween", "christmas"):
                    for ordinal, item in enumerate(seasonal[season]):
                        definition = self.items[item]
                        method = self.method("vendor", [npc_id, ordinal, season])
                        self.detail(
                            "vendor",
                            method,
                            npc_id=npc_id,
                            offered_item_id=item,
                            season=season,
                        )
                        self.provider("npcs", method, npc_id, ordinal)
                        if definition["buy_price"] > 0:
                            self.cost(
                                method,
                                "purchase",
                                [
                                    (
                                        definition["buy_token_id"],
                                        definition["buy_price"],
                                        "currency",
                                    )
                                ],
                            )
                        self.award(method, item, resolve_pack=True)
            if npc["roles"]["is_priestess"]:
                rune_ids = names[authority["blessing"]["cursedRuneName"]]
                if len(rune_ids) != 1:
                    raise ValueError(
                        "Blessing requires one exact Cursed Rune asset identity"
                    )
                method = self.method("blessing", npc_id)
                self.detail("service", method, service_role="blessing")
                self.provider("npcs", method, npc_id)
                self.cost(
                    method,
                    "exchange",
                    [
                        (rune_ids[0], 1, "material"),
                        (None, authority["blessing"]["goldPerRune"], "currency"),
                    ],
                    quantity="all_carried",
                    consumption="replace_carried_stack",
                )
                self.output(method, special["blessed_rune"], None, rule="all_carried")
            if npc["roles"]["is_essence_trader"]:
                for definition in self.items.values():
                    if definition["primal_essence_value"] is None:
                        continue
                    method = self.method("essence", [npc_id, definition["id"]])
                    self.detail("service", method, service_role="essence")
                    self.provider("npcs", method, npc_id)
                    self.cost(
                        method, "exchange", [(definition["id"], 1, "selected_instance")]
                    )
                    self.output(
                        method,
                        special["primal_essence"],
                        definition["primal_essence_value"],
                    )

    def global_grants(self) -> None:
        authority = _authority()["creation"]
        names: dict[str, list[str]] = defaultdict(list)
        for item in self.items.values():
            names[item["name"]].append(item["id"])

        def resolve(name: str) -> str:
            matches = names[name]
            if len(matches) != 1:
                raise ValueError(
                    f"Creation grant {name!r}: expected one exact asset, got {len(matches)}"
                )
            return matches[0]

        for class_name, class_id in self.classes.items():
            method = self.method("creation", class_id)
            self.detail("creation", method, class_id=class_id)
            self.provider("classes", method, class_id)
            _insert(
                self.conn,
                "acquisition_global_roots",
                id=_key("root", method),
                method_id=method,
                origin="creation",
            )
            for grant in authority["inventory"]:
                self.output(
                    method,
                    resolve(grant["name"]),
                    grant["amount"],
                    delivery="inventory",
                )
            equipment = [
                *authority["equipment"],
                {
                    "name": authority["classWeapons"][class_name],
                    "slot": authority["weaponSlot"],
                    "amount": 1,
                },
                *authority["classExtras"].get(class_name, []),
            ]
            for grant in equipment:
                self.output(
                    method,
                    resolve(grant["name"]),
                    grant["amount"],
                    delivery="equipment",
                    slot=grant["slot"],
                )
        reward = self.config["special_items"]["max_level_reward"]
        method = self.method("cap_xp", reward)
        self.detail("cap_xp", method, reward_item_id=reward)
        self.output(method, reward)
        _insert(
            self.conn,
            "acquisition_global_roots",
            id=_key("root", method),
            method_id=method,
            origin="cap_xp",
        )

    def kill_context(
        self,
        identity: Any,
        monster: dict[str, Any],
        context: dict[str, Any],
        *,
        provider: tuple[str, str],
        event: str = "authored",
        altar: dict[str, Any] | None = None,
        wave: int | None = None,
        member: int | None = None,
        parent: str | None = None,
        setup: str | None = None,
        tier_slot: int | None = None,
    ) -> None:
        lootless = event == "lootless" or context["is_summoned_pet"]
        entries = [] if lootless else context["drops"]
        rewards = (
            [
                altar[f"reward_{tier}_id"]
                for tier in ("common", "magic", "epic", "legendary")
            ]
            if altar
            else []
        )
        gold_override = bool(
            not lootless
            and altar
            and event == "altar_final"
            and context["is_elite"]
            and all(rewards)
            and entries
        )
        replacement = next(
            (
                index
                for index, entry in enumerate(entries)
                if rewards and entry["item_id"] == rewards[0]
            ),
            None,
        )
        if (
            gold_override
            and tier_slot is None
            and replacement is not None
            and entries[replacement]["rate"] > 0
        ):
            for ordinal, reward in enumerate(rewards):
                replaced = [dict(entry) for entry in entries]
                replaced[replacement]["item_id"] = reward
                self.kill_context(
                    [identity, "tier", ordinal],
                    monster,
                    {**context, "drops": replaced},
                    provider=provider,
                    event=event,
                    altar=altar,
                    wave=wave,
                    member=member,
                    parent=parent,
                    setup=setup,
                    tier_slot=ordinal,
                )
            return
        rule = (
            "lootless"
            if lootless
            else "altar_final_loot"
            if event == "altar_final"
            else "placeholder_loot"
            if event == "placeholder"
            else "boss_loot"
            if context["is_boss"]
            else "monster_loot"
        )
        zone_number = context["loot_zone_number"]
        zone = (
            self.conn.execute(
                "SELECT id FROM zones WHERE zone_id=?", (zone_number,)
            ).fetchone()
            if zone_number > 0
            else None
        )
        if zone_number > 0 and zone is None:
            raise ValueError(
                f"Kill context {identity}: native loot zone {zone_number} is absent"
            )
        signature = _key(
            monster["id"],
            rule,
            setup,
            zone_number,
            bool(context["does_respawn"] and event != "placeholder"),
            float(context["exp_multiplier"]),
            bool(context["is_boss"]),
            bool(context["is_elite"]),
            bool(context["is_hunt"]),
            bool(context["is_summoned_pet"]),
            altar["id"] if altar else None,
            wave,
            member,
            parent,
            tier_slot,
            "lootless" if lootless else event,
            0 if lootless else context["gold_min"],
            0 if lootless else context["gold_max"],
            0 if lootless else float(context["probability_drop_gold"]),
            [
                (
                    entry["item_id"],
                    float(entry.get("rate", entry.get("probability", 1.0))),
                    bool(entry.get("scales_with_treasure_hunter", False)),
                )
                for entry in entries
            ],
        )
        method = self.kill_methods.get(signature)
        if method is not None:
            self.provider(provider[0], method, provider[1])
            return
        context_id = len(self.kill_methods)
        pool = self.pool(
            "monster",
            ["context", context_id],
            entries,
            wrappers=True,
            boss_caps=context["is_boss"],
        )
        _insert(
            self.conn, "loot_monster_rules", id=_key("monster_rule", pool), pool_id=pool
        )
        method = self.method("kill", ["context", context_id], rule, setup)
        self.kill_methods[signature] = method
        self.detail(
            "kill",
            method,
            monster_id=monster["id"],
            loot_pool_id=pool,
            loot_zone_number=zone_number,
            loot_zone_id=zone[0] if zone else None,
            loot_zone_withheld=0,
            respawn=int(context["does_respawn"] and event != "placeholder"),
            exp_multiplier=context["exp_multiplier"],
            is_boss=int(context["is_boss"]),
            is_elite=int(context["is_elite"]),
            is_hunt=int(context["is_hunt"]),
            is_summoned_pet=int(context["is_summoned_pet"]),
            altar_id=altar["id"] if altar else None,
            wave_number=wave,
            wave_member_index=member,
            parent_monster_spawn_id=parent,
            event_kind="lootless" if lootless else event,
            gold_min=0 if lootless else context["gold_min"],
            gold_max=0 if lootless else context["gold_max"],
            gold_probability=0 if lootless else context["probability_drop_gold"],
        )
        self.provider(provider[0], method, provider[1])
        self.bind_pool(
            method,
            pool,
            "eligible_kill" if event == "altar_final" else "corpse_generation",
        )
        if lootless:
            return
        if gold_override:
            # DefaultEvent derives gold from the activator scenario, not the template.
            self.output(
                method, None, None, rule="uniform_upper_exclusive", delivery="corpse"
            )
            if tier_slot is not None:
                self.output(
                    method,
                    rewards[tier_slot],
                    None,
                    rule="pool",
                    delivery="corpse",
                    condition=tier_slot,
                )
        elif context["gold_max"] > 0:
            self.output(
                method,
                None,
                context["gold_min"],
                context["gold_max"],
                rule="uniform_upper_exclusive",
                delivery="corpse",
            )

    def monsters_and_events(self) -> None:
        for monster in self.monsters.values():
            pool = self.pool(
                "monster",
                ["template", monster["id"]],
                monster["drops"],
                wrappers=True,
                boss_caps=monster["is_boss"],
            )
            self.conn.execute(
                "UPDATE monsters SET loot_pool_id=? WHERE id=?", (pool, monster["id"])
            )
            _insert(
                self.conn,
                "loot_monster_rules",
                id=_key("monster_rule", pool),
                pool_id=pool,
            )
        for spawn in self.inputs["monster_spawns"]:
            monster = self.monsters[spawn["monster_id"]]
            context = {
                "loot_zone_number": spawn["loot_zone_number"],
                "does_respawn": spawn["loot_respawn"],
                "exp_multiplier": spawn["loot_exp_multiplier"],
                "is_boss": spawn["loot_is_boss"],
                "is_elite": spawn["loot_is_elite"],
                "is_hunt": spawn["loot_is_hunt"],
                "is_summoned_pet": spawn["loot_is_summoned_pet"],
                "drops": spawn["loot_drops"],
                "gold_min": spawn["loot_gold_min"],
                "gold_max": spawn["loot_gold_max"],
                "probability_drop_gold": spawn["loot_gold_probability"],
            }
            self.kill_context(
                ["authored", spawn["id"]],
                monster,
                context,
                provider=("monster_spawns", spawn["id"]),
            )
            if (
                monster["placeholder_monster_id"]
                and monster["placeholder_spawn_probability"] > 0
            ):
                child = self.monsters[monster["placeholder_monster_id"]]
                self.kill_context(
                    ["placeholder", spawn["id"], child["id"]],
                    child,
                    child,
                    provider=("monster_spawns", spawn["id"]),
                    event="placeholder",
                    parent=spawn["id"],
                )
        for altar in _rows(self.conn, "SELECT * FROM altars"):
            setup = self.method("altar_activate", altar["id"])
            self.detail("altar", setup, altar_id=altar["id"])
            self.provider("altars", setup, altar["id"])
            if altar["required_activation_item_id"]:
                self.cost(
                    setup,
                    "activate",
                    [(altar["required_activation_item_id"], 1, "activation")],
                    consumption="before_roll",
                )
            waves = json.loads(altar["waves"] or "[]")
            for wave_index, wave in enumerate(waves):
                for member, entry in enumerate(wave["monsters"]):
                    monster = self.monsters[entry["monster_id"]]
                    final = wave_index == len(waves) - 1
                    self.kill_context(
                        ["altar", altar["id"], wave["wave_number"], member],
                        monster,
                        monster,
                        provider=("altars", altar["id"]),
                        event="altar_final" if final else "lootless",
                        altar=altar,
                        wave=wave["wave_number"],
                        member=member,
                        setup=setup,
                    )

    def gathering(self) -> None:
        methods: dict[tuple[str, str], str] = {}
        placed_resources = {
            row["id"]
            for row in _rows(self.conn, "SELECT id FROM gathering_resource_spawns")
        }
        trash = self.pool(
            "fishing_trash",
            "configured",
            [{"item_id": item} for item in self.config["trash_fish_item_ids"]],
        )
        fallback = self.pool(
            "fishing_fallback",
            "configured",
            [{"item_id": item} for item in self.config["journal_fish_item_ids"]],
        )
        factions = {
            row["name"]: row["id"]
            for row in _rows(self.conn, "SELECT id,name FROM factions")
        }
        for resource in self.inputs["gathering"]:
            chest = resource["is_chest"]
            configured_chest_roll = bool(
                chest
                and resource["chest_reward_probability"] > 0
                and (
                    resource["item_reward_id"] is not None
                    or (resource["gold_min"] > 0 and resource["gold_max"] > 0)
                )
            )
            identity = resource["id"] if chest else resource["resource_id"]
            signature = json.dumps(
                {
                    key: resource[key]
                    for key in (
                        "item_reward_id",
                        "item_reward_amount",
                        "random_drops",
                        "gold_min",
                        "gold_max",
                        "is_plant",
                        "is_mineral",
                        "is_fishing_spot",
                        "is_radiant_spark",
                        "level",
                        "tool_required_id",
                        "decrease_faction",
                        "respawn_time",
                        "prob_despawn",
                        "chest_reward_probability",
                    )
                },
                sort_keys=True,
            )
            definition = (identity, signature)
            if definition in methods:
                method = methods[definition]
                if not chest and resource["id"] in placed_resources:
                    self.provider("resource_spawns", method, resource["id"])
                continue
            if chest:
                method = self.method("world_chest", identity)
                self.detail(
                    "world_chest",
                    method,
                    chest_id=identity,
                    key_item_id=resource["tool_required_id"],
                    key_item_withheld=0,
                    outer_success=resource["chest_reward_probability"]
                    if configured_chest_roll
                    else 1.0,
                    gold_min=resource["gold_min"],
                    gold_max=resource["gold_max"],
                )
                if not resource["is_template"]:
                    self.provider("chests", method, identity)
                if resource["tool_required_id"]:
                    self.cost(
                        method,
                        "attempt",
                        [(resource["tool_required_id"], 1, "key")],
                        consumption="after_outer_success",
                        selection="chest_key_first",
                    )
                    self.cost(
                        method,
                        "attempt",
                        [(self.config["lockpicks_item_id"], 1, "lockpick")],
                        consumption="after_outer_success",
                        selection="chest_lockpick_fallback",
                    )
            else:
                flags = (
                    ("is_plant", "plant", "herbalism"),
                    ("is_mineral", "mineral", "mining"),
                    ("is_fishing_spot", "fishing", "fishing"),
                    ("is_radiant_spark", "radiant", "radiant"),
                )
                resource_kind, rule = next(
                    ((kind, rule) for flag, kind, rule in flags if resource[flag]),
                    ("other", "gather_fixed"),
                )
                method = self.method("gather", definition, rule)
                self.detail(
                    "resource",
                    method,
                    resource_id=identity,
                    resource_kind=resource_kind,
                    outer_success=1.0,
                    gold_min=resource["gold_min"],
                    gold_max=resource["gold_max"],
                )
                if resource["id"] in placed_resources:
                    self.provider("resource_spawns", method, resource["id"])
            methods[definition] = method
            if resource["item_reward_id"]:
                item = resource["item_reward_id"]
                rule = (
                    "radiant"
                    if resource["is_radiant_spark"]
                    else "extra_gather"
                    if resource["is_plant"] or resource["is_mineral"]
                    else "uniform_inclusive"
                )
                if (
                    self.items[item]["is_quest_item"]
                    and self.items[item]["has_gather_quest"]
                ):
                    self.output(
                        method,
                        item,
                        1,
                        resource["item_reward_amount"],
                        rule=rule,
                        delivery="quest_progress",
                    )
                else:
                    self.output(
                        method, item, 1, resource["item_reward_amount"], rule=rule
                    )
                    if self.items[item]["has_gather_quest"]:
                        self.output(
                            method,
                            item,
                            1,
                            resource["item_reward_amount"],
                            rule=rule,
                            delivery="quest_progress",
                        )
            if resource["gold_max"] > 0:
                self.output(
                    method,
                    None,
                    resource["gold_min"],
                    resource["gold_max"],
                    rule="uniform_upper_exclusive",
                )
            if resource["is_fishing_spot"]:
                primary = self.pool(
                    "fishing_primary", definition, resource["random_drops"]
                )
                fishing_rule = _key("fishing_rule", method)
                _insert(
                    self.conn,
                    "loot_fishing_rules",
                    id=fishing_rule,
                    primary_pool_id=primary,
                    trash_pool_id=trash,
                    fallback_pool_id=fallback,
                    spot_tier=resource["level"],
                )
                _insert(
                    self.conn,
                    "acquisition_method_fishing_rules",
                    id=method,
                    method_id=method,
                    fishing_rule_id=fishing_rule,
                )
                for pool in (primary, trash, fallback):
                    self.bind_pool(method, pool, "successful_hook")
            elif resource["random_drops"]:
                pool = self.pool(
                    "resource_secondary", definition, resource["random_drops"]
                )
                self.bind_pool(method, pool, "attempt")
            if configured_chest_roll and resource["decrease_faction"]:
                for faction, delta in (
                    (resource["decrease_faction"], -200),
                    ("The Forsaken", 200),
                ):
                    _insert(
                        self.conn,
                        "acquisition_faction_effects",
                        id=_key("faction", method, faction),
                        method_id=method,
                        event="attempt",
                        faction_id=factions[faction],
                        delta=delta,
                        withheld=0,
                    )
        for location in _rows(self.conn, "SELECT * FROM treasure_locations"):
            method = self.method("treasure_dig", location["id"])
            self.detail(
                "treasure",
                method,
                treasure_location_id=location["id"],
                map_item_id=location["required_map_id"],
                map_item_withheld=0,
            )
            self.provider("treasure_locations", method, location["id"])
            self.cost(method, "use", [(location["required_map_id"], 1, "activation")])
            if location["reward_id"]:
                self.award(method, location["reward_id"])


def normalize(conn: sqlite3.Connection) -> None:
    """Consume validated private inputs without committing the caller's transaction."""
    inputs: dict[str, list[dict[str, Any]]] = {}
    for family in STAGING_FAMILIES:
        inputs[family] = [
            json.loads(row[0])
            for row in conn.execute(
                f'SELECT payload FROM "_acquisition_input_{family}" ORDER BY id'
            )
        ]
    if len(inputs["game_config"]) != 1:
        raise ValueError(
            "Acquisition normalization requires exactly one configured GameConfig"
        )
    normalizer = _Normalizer(conn, inputs)
    normalizer.item_definitions()
    normalizer.recipes()
    normalizer.quest_facts()
    normalizer.vendors_and_services()
    normalizer.global_grants()
    normalizer.monsters_and_events()
    normalizer.gathering()
    for family in STAGING_FAMILIES:
        conn.execute(f'DROP TABLE "_acquisition_input_{family}"')


def _pool_targets(conn: sqlite3.Connection) -> dict[str, set[str]]:
    entries: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in _rows(
        conn, "SELECT * FROM loot_pool_entries ORDER BY pool_id,ordinal"
    ):
        entries[entry["pool_id"]].append(entry)
    result: dict[str, set[str]] = {}

    def visit(pool: str, path: set[str]) -> set[str]:
        if pool in result:
            return result[pool]
        if pool in path:
            raise ValueError(f"Acquisition pool {pool}: cyclic nested resolution")
        targets: set[str] = set()
        for entry in entries[pool]:
            if entry["probability"] <= 0 or entry["cap"] == 0:
                continue
            if entry["resolution"] == "uniform_child":
                targets.update(visit(entry["child_pool_id"], path | {pool}))
            elif entry["item_id"] is not None:
                targets.add(entry["item_id"])
        result[pool] = targets
        return targets

    for (pool,) in conn.execute("SELECT id FROM loot_pools"):
        visit(pool, set())
    return result


def _expected_pool_outputs(conn: sqlite3.Connection) -> set[tuple[str, str, str]]:
    targets = _pool_targets(conn)
    methods = {
        row["id"]: row
        for row in _rows(conn, "SELECT id,kind,rule_id FROM acquisition_methods")
    }
    keys = {row["id"] for row in _rows(conn, "SELECT id FROM items WHERE is_key=1")}
    fishing: dict[str, dict[str, Any]] = {
        row["method_id"]: row
        for row in _rows(
            conn,
            """
            SELECT b.method_id,r.* FROM acquisition_method_fishing_rules b
            JOIN loot_fishing_rules r ON r.id=b.fishing_rule_id
        """,
        )
    }
    quality = {
        row["id"]: row["quality"] for row in _rows(conn, "SELECT id,quality FROM items")
    }
    results: set[tuple[str, str, str]] = set()
    early_return = {
        row["id"]
        for row in _rows(
            conn,
            """
        SELECT d.id FROM acquisition_resource_details d JOIN acquisition_methods m ON m.id=d.id
        JOIN acquisition_outputs o ON o.method_id=d.id JOIN items i ON i.id=o.item_id
        WHERE o.delivery='quest_progress' AND i.is_quest_item=1 AND i.has_gather_quest=1
          AND m.rule_id!='radiant'
    """,
        )
    }
    for binding in _rows(
        conn, "SELECT method_id,pool_id FROM acquisition_method_pools"
    ):
        method, pool = binding["method_id"], binding["pool_id"]
        kind = methods[method]["kind"]
        if methods[method]["rule_id"] == "lootless" or method in early_return:
            continue
        selected = targets[pool]
        if method in fishing:
            rule = fishing[method]
            tier = rule["spot_tier"]
            if pool == rule["trash_pool_id"] and tier >= 2:
                selected = set()
            elif pool == rule["fallback_pool_id"]:
                selected = {
                    item for item in selected if 1 <= tier <= 3 and quality[item] < tier
                }
        for item in selected:
            delivery = (
                "corpse"
                if kind == "kill"
                else "keyring"
                if item in keys and kind == "portable_chest"
                else "inventory"
            )
            results.add((method, item, delivery))
    # Ordinary dungeon fragments are a separate native roll, not template pool entries.
    for row in _rows(
        conn,
        """
        SELECT d.id,l.fragment_token_id FROM acquisition_kill_details d
        JOIN zones z ON z.id=d.loot_zone_id AND z.is_dungeon=1
        JOIN luck_tokens l ON l.zone_id=z.id
        WHERE d.is_boss=0 AND d.is_elite=0 AND d.loot_zone_number>0
          AND d.respawn=1 AND d.exp_multiplier>=1 AND d.is_summoned_pet=0
          AND d.event_kind='authored' AND l.fragment_token_id IS NOT NULL
    """,
    ):
        results.add((row["id"], row["fragment_token_id"], "corpse"))
    return results


def _physical_seeds(conn: sqlite3.Connection) -> tuple[set[str], dict[str, int]]:
    rooted: set[str] = set()
    hints: dict[str, int] = {}

    def add(method: str, hint: int | None) -> None:
        rooted.add(method)
        if hint is not None:
            hints[method] = min(hints.get(method, hint), hint)

    for row in _rows(
        conn,
        """
        SELECT p.method_id,CASE WHEN d.event_kind='placeholder' THEN m.level ELSE s.level END AS level
        FROM acquisition_providers_monster_spawns p
        JOIN monster_spawns s ON s.id=p.monster_spawn_id
        JOIN acquisition_kill_details d ON d.id=p.method_id JOIN monsters m ON m.id=d.monster_id
    """,
    ):
        add(row["method_id"], row["level"])
    for row in _rows(
        conn,
        """
        SELECT p.method_id,m.kind,n.roles,z.level_median FROM acquisition_providers_npcs p
        JOIN acquisition_methods m ON m.id=p.method_id JOIN npcs n ON n.id=p.npc_id
        JOIN npc_spawns s ON s.npc_id=n.id LEFT JOIN zones z ON z.id=s.zone_id
    """,
    ):
        roles = json.loads(row["roles"] or "{}")
        base = 40 if roles.get("is_merchant_adventurer") else 1
        # A shop is reached where its vendor stands, like a chest or a gathering spot.
        zone = row["level_median"] if row["kind"] == "vendor" else None
        add(row["method_id"], max(base, zone or 0))
    for family, target, target_column, zone_column in (
        (
            "resource_spawns",
            "gathering_resource_spawns",
            "resource_spawn_id",
            "zone_id",
        ),
        ("chests", "chests", "chest_id", "zone_id"),
        ("crafting_stations", "crafting_stations", "crafting_station_id", "zone_id"),
        ("alchemy_tables", "alchemy_tables", "alchemy_table_id", "zone_id"),
        ("scribing_tables", "scribing_tables", "scribing_table_id", "zone_id"),
        ("treasure_locations", "treasure_locations", "treasure_location_id", "zone_id"),
    ):
        for row in _rows(
            conn,
            f"""
            SELECT p.method_id,z.level_median FROM acquisition_providers_{family} p
            JOIN {target} s ON s.id=p.{target_column} LEFT JOIN zones z ON z.id=s.{zone_column}
        """,
        ):
            add(row["method_id"], row["level_median"])
    for row in _rows(
        conn,
        """
        SELECT p.method_id,a.type,a.min_level_required,a.waves,
               d.wave_number,d.wave_member_index
        FROM acquisition_providers_altars p JOIN altars a ON a.id=p.altar_id
        LEFT JOIN acquisition_kill_details d ON d.id=p.method_id AND d.altar_id=a.id
    """,
    ):
        hint = row["min_level_required"]
        # Source: server-scripts/AvatarEvent.cs:SummonMonsters; DefaultEvent.cs:SummonMonsters — an
        # avatar altar spawns each wave member at its authored level, while a Forgotten Altar scales
        # it to the activating player, whom its level gate already describes.
        if row["type"] == "avatar" and row["wave_number"] is not None:
            wave = next(
                wave
                for wave in json.loads(row["waves"])
                if wave["wave_number"] == row["wave_number"]
            )
            member = wave["monsters"][row["wave_member_index"]]
            hint = max(hint, member["base_level"])
        add(row["method_id"], hint)
    for row in _rows(
        conn,
        """
        SELECT d.id,o.condition_slot,a.min_level_required,a.magic_reward_threshold,
               a.epic_reward_threshold,a.legendary_reward_threshold,p.max_level
        FROM acquisition_kill_details d JOIN altars a ON a.id=d.altar_id
        JOIN acquisition_outputs o ON o.method_id=d.id AND o.condition_slot IS NOT NULL
        CROSS JOIN progression_rules p
    """,
    ):
        if row["condition_slot"] not in (0, 1, 2, 3):
            raise ValueError(
                f"Altar method {row['id']}: unsupported reward tier ordinal"
            )
        threshold = (
            0,
            row["magic_reward_threshold"],
            row["epic_reward_threshold"],
            row["legendary_reward_threshold"],
        )[row["condition_slot"]]
        if threshold is None:
            raise ValueError(
                f"Altar method {row['id']}: missing native reward threshold"
            )
        hints[row["id"]] = max(
            row["min_level_required"], min(row["max_level"], threshold)
        )
    for row in _rows(conn, "SELECT method_id,origin FROM acquisition_global_roots"):
        add(row["method_id"], 1 if row["origin"] in {"creation", "housing"} else None)
    for row in _rows(
        conn,
        """
        SELECT d.id,p.max_level FROM acquisition_cap_xp_details d CROSS JOIN progression_rules p
    """,
    ):
        hints[row["id"]] = row["max_level"]
    for row in _rows(
        conn,
        """
        SELECT d.id,q.level_required,q.level_recommended FROM acquisition_quest_details d
        JOIN quests q ON q.id=d.quest_id
    """,
    ):
        # A quest is done at the level it recommends. Its acceptance gate is a requirement.
        if row["id"] in rooted:
            hints[row["id"]] = max(row["level_required"], row["level_recommended"] or 0)
    return rooted, hints


def _derived_state(conn: sqlite3.Connection) -> dict[str, tuple[int, int | None]]:
    methods = {
        row["id"]: row for row in _rows(conn, "SELECT * FROM acquisition_methods")
    }
    roots, seed_hints = _physical_seeds(conn)
    outputs: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in _rows(conn, "SELECT * FROM acquisition_outputs"):
        outputs[row["method_id"]].append(row)
    costs: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in _rows(
        conn,
        """
        SELECT g.method_id,g.selection_rule,i.* FROM acquisition_cost_groups g
        JOIN acquisition_inputs i ON i.cost_group_id=g.id WHERE i.resource_kind='item'
    """,
    ):
        costs[row["method_id"]].append(row)
    inventory_providers: dict[str, set[str]] = defaultdict(set)
    for row in _rows(conn, "SELECT method_id,item_id FROM acquisition_providers_items"):
        inventory_providers[row["method_id"]].add(row["item_id"])
    home_providers: dict[str, set[str]] = defaultdict(set)
    for row in _rows(
        conn, "SELECT method_id,structure_item_id FROM acquisition_home_providers"
    ):
        home_providers[row["method_id"]].add(row["structure_item_id"])
    rooted = set(roots)
    hints: dict[str, int] = {}
    carried: set[str] = set()
    carried_hints: dict[str, int] = {}
    structures: set[str] = set()
    structure_hints: dict[str, int] = {}

    def cost_level(method: str) -> tuple[bool, int | None]:
        """Whether every cost can be carried, and the hardest one to obtain.

        A chest's key and its lockpick fallback are alternatives, so the easier one counts.
        """
        groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in costs[method]:
            groups[row["cost_group_id"]].append(row)
        levels: list[int] = []
        alternatives: list[int] = []
        has_alternatives = False
        for rows in groups.values():
            known = all(
                not row["withheld"] and row["item_id"] in carried_hints for row in rows
            )
            level = (
                max(carried_hints[row["item_id"]] for row in rows) if known else None
            )
            if rows[0]["selection_rule"] in CHEST_COST_ALTERNATIVES:
                has_alternatives = True
                if level is not None:
                    alternatives.append(level)
            elif level is None:
                return False, None
            else:
                levels.append(level)
        if has_alternatives:
            if not alternatives:
                return False, None
            levels.append(min(alternatives))
        return True, max(levels) if levels else None

    # Purchases, quests and chests whose item costs no source reaches still keep their own
    # level, but only once every reachable cost has had the chance to raise it.
    for allow_unpaid in (False, True):
        changed = True
        while changed:
            changed = False
            for method, definition in methods.items():
                if method not in rooted and (
                    (inventory_providers[method] & carried)
                    or (home_providers[method] & structures)
                ):
                    rooted.add(method)
                    changed = True
                if method not in rooted:
                    continue
                setup = definition["setup_method_id"]
                if setup is not None and setup not in rooted:
                    continue
                candidates: list[int] = []
                if method in seed_hints:
                    candidates.append(seed_hints[method])
                candidates.extend(
                    carried_hints[item]
                    for item in inventory_providers[method]
                    if item in carried_hints
                )
                candidates.extend(
                    structure_hints[item]
                    for item in home_providers[method]
                    if item in structure_hints
                )
                base = min(candidates) if candidates else None
                complete, cost = cost_level(method)
                # Crafting and carried transformations need a complete AND branch.
                needs_inputs = definition["kind"] in {
                    "recipe",
                    "pack_use",
                    "portable_chest",
                    "merge",
                    "fragment",
                    "essence",
                    "blessing",
                }
                hint: int | None = None
                if definition["kind"] == "recipe" and costs[method]:
                    hint = cost if complete else None
                elif complete and base is not None:
                    hint = base if cost is None else max(base, cost)
                elif allow_unpaid and not needs_inputs:
                    hint = base
                if hint is not None and (method not in hints or hint < hints[method]):
                    hints[method] = hint
                    changed = True
                for output in outputs[method]:
                    item = output["item_id"]
                    if item is None or output["withheld"]:
                        continue
                    delivery = output["delivery"]
                    target = (
                        carried
                        if delivery in {"inventory", "corpse"}
                        else structures
                        if delivery == "placed_structure"
                        else None
                    )
                    target_hints = (
                        carried_hints if target is carried else structure_hints
                    )
                    if target is None:
                        continue
                    if item not in target:
                        target.add(item)
                        changed = True
                    if hint is not None and (
                        item not in target_hints or hint < target_hints[item]
                    ):
                        target_hints[item] = hint
                        changed = True
    return {method: (int(method in rooted), hints.get(method)) for method in methods}


def derive(conn: sqlite3.Connection) -> None:
    """Build the item output index and fixed-point opportunity metadata after closure."""
    conn.execute(
        "DELETE FROM acquisition_outputs WHERE yield_rule='pool' AND condition_slot IS NULL"
    )
    existing = {
        (row["method_id"], row["item_id"], row["delivery"])
        for row in _rows(
            conn, "SELECT method_id,item_id,delivery FROM acquisition_outputs"
        )
    }
    ordinals = {
        row["method_id"]: row["next_ordinal"]
        for row in _rows(
            conn,
            """
        SELECT method_id,max(ordinal)+1 AS next_ordinal FROM acquisition_outputs GROUP BY method_id
    """,
        )
    }
    for method, item, delivery in sorted(_expected_pool_outputs(conn) - existing):
        ordinal = ordinals.get(method, 0)
        ordinals[method] = ordinal + 1
        _insert(
            conn,
            "acquisition_outputs",
            id=_key("derived_output", method, ordinal),
            method_id=method,
            ordinal=ordinal,
            resource_kind="item",
            item_id=item,
            amount_min=None,
            amount_max=None,
            yield_rule="pool",
            delivery=delivery,
            slot=None,
            condition_slot=None,
            withheld=0,
        )
    for method, (rooted, hint) in _derived_state(conn).items():
        conn.execute(
            "UPDATE acquisition_methods SET rooted=?,source_level_hint=? WHERE id=?",
            (rooted, hint, method),
        )


def validate(conn: sqlite3.Connection) -> None:
    """Reject unsupported rule dispatch, damaged process bindings and stale indexes."""
    staging = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name GLOB '_acquisition_input_*'"
    ).fetchall()
    if staging:
        raise ValueError(f"Acquisition publication contains private staging: {staging}")
    dangling = conn.execute("PRAGMA foreign_key_check").fetchone()
    if dangling:
        raise ValueError(
            f"Acquisition publication has dangling foreign key: {dangling}"
        )
    methods = _rows(conn, "SELECT * FROM acquisition_methods")
    if any(method["kind"] == "cap_xp" for method in methods):
        caps = conn.execute("SELECT max_level FROM progression_rules").fetchall()
        if len(caps) != 1 or caps[0][0] is None or caps[0][0] <= 0:
            raise ValueError(
                "Acquisition cap-XP rule requires progression_rules.max_level"
            )
    for row in _rows(
        conn,
        """
        SELECT d.id,a.magic_reward_threshold,a.epic_reward_threshold,a.legendary_reward_threshold
        FROM acquisition_kill_details d JOIN altars a ON a.id=d.altar_id
        WHERE EXISTS(SELECT 1 FROM acquisition_outputs o WHERE o.method_id=d.id AND o.condition_slot IS NOT NULL)
    """,
    ):
        thresholds = [
            row[field]
            for field in (
                "magic_reward_threshold",
                "epic_reward_threshold",
                "legendary_reward_threshold",
            )
        ]
        if any(value is None for value in thresholds) or thresholds != sorted(
            thresholds
        ):
            raise ValueError(
                f"Acquisition altar method {row['id']}: missing or unordered tier thresholds"
            )
        if (
            conn.execute(
                "SELECT count(*) FROM progression_rules WHERE max_level>0"
            ).fetchone()[0]
            != 1
        ):
            raise ValueError(
                f"Acquisition altar method {row['id']}: requires progression_rules.max_level"
            )
    for method in methods:
        kind, rule, identity = method["kind"], method["rule_id"], method["id"]
        if kind not in RULES or rule not in RULES[kind]:
            raise ValueError(
                f"Acquisition method {identity}: unsupported {kind}/{rule}"
            )
        detail = DETAILS[kind]
        for family in set(DETAILS.values()):
            count = conn.execute(
                f"SELECT count(*) FROM acquisition_{family}_details WHERE id=?",
                (identity,),
            ).fetchone()[0]
            if count != int(family == detail):
                raise ValueError(
                    f"Acquisition method {identity}: impossible {family} detail for {kind}"
                )
        if kind == "kill":
            row = _rows(
                conn, "SELECT * FROM acquisition_kill_details WHERE id=?", (identity,)
            )[0]
            if rule == "lootless" and (
                row["gold_probability"]
                or conn.execute(
                    "SELECT count(*) FROM loot_pool_entries WHERE pool_id=?",
                    (row["loot_pool_id"],),
                ).fetchone()[0]
            ):
                raise ValueError(
                    f"Acquisition method {identity}: lootless context has rewards"
                )
            if row["event_kind"] == "placeholder" and (
                row["respawn"] or not row["parent_monster_spawn_id"]
            ):
                raise ValueError(
                    f"Acquisition method {identity}: invalid placeholder context"
                )
            if row["altar_id"] and not method["setup_method_id"]:
                raise ValueError(
                    f"Acquisition method {identity}: altar context lacks activation setup"
                )
            count = conn.execute(
                "SELECT count(*) FROM loot_monster_rules WHERE pool_id=?",
                (row["loot_pool_id"],),
            ).fetchone()[0]
            binding = conn.execute(
                "SELECT count(*) FROM acquisition_method_pools WHERE method_id=? AND pool_id=?",
                (identity, row["loot_pool_id"]),
            ).fetchone()[0]
            if count != 1 or binding != 1:
                raise ValueError(
                    f"Acquisition method {identity}: damaged monster pool binding"
                )
        if kind == "portable_chest":
            count = conn.execute(
                """
                SELECT count(*) FROM acquisition_method_pools p
                JOIN loot_chest_rules r ON r.pool_id=p.pool_id WHERE p.method_id=?
            """,
                (identity,),
            ).fetchone()[0]
            if count != 1:
                raise ValueError(
                    f"Acquisition method {identity}: damaged portable-chest rule binding"
                )
        fishing_count = conn.execute(
            "SELECT count(*) FROM acquisition_method_fishing_rules WHERE method_id=?",
            (identity,),
        ).fetchone()[0]
        if fishing_count != int(rule == "fishing"):
            raise ValueError(
                f"Acquisition method {identity}: invalid fishing rule binding"
            )
    expected = _expected_pool_outputs(conn)
    actual = {
        (row["method_id"], row["item_id"], row["delivery"])
        for row in _rows(
            conn,
            "SELECT * FROM acquisition_outputs WHERE resource_kind='item' AND item_id IS NOT NULL",
        )
    }
    if not expected <= actual:
        raise ValueError(
            f"Acquisition output index missing pool outcomes: {sorted(expected - actual)}"
        )
    derived_pool = {
        (row["method_id"], row["item_id"], row["delivery"])
        for row in _rows(
            conn,
            "SELECT * FROM acquisition_outputs WHERE yield_rule='pool' AND condition_slot IS NULL",
        )
    }
    if not derived_pool <= expected:
        raise ValueError(
            f"Acquisition output index has impossible pool outcomes: {sorted(derived_pool - expected)}"
        )
    for method_id, (rooted, hint) in _derived_state(conn).items():
        stored = conn.execute(
            "SELECT rooted,source_level_hint FROM acquisition_methods WHERE id=?",
            (method_id,),
        ).fetchone()
        if stored != (rooted, hint):
            raise ValueError(
                f"Acquisition method {method_id}: stale rooted/source-level metadata"
            )
    for row in _rows(
        conn,
        """
        SELECT d.id,m.rule_id,d.display_kind FROM acquisition_recipe_details d
        JOIN acquisition_methods m ON m.id=d.id WHERE m.rule_id!=d.display_kind
    """,
    ):
        raise ValueError(
            f"Acquisition recipe {row['id']}: mismatched native recipe rule"
        )
    for row in _rows(
        conn,
        """
        SELECT d.id,m.kind,d.phase FROM acquisition_quest_details d
        JOIN acquisition_methods m ON m.id=d.id WHERE m.kind!='quest_'||d.phase
    """,
    ):
        raise ValueError(f"Acquisition quest method {row['id']}: mismatched phase")
    for row in _rows(
        conn,
        """
        SELECT d.id,m.kind FROM acquisition_service_details d JOIN acquisition_methods m ON m.id=d.id
        WHERE m.kind!=d.service_role
    """,
    ):
        raise ValueError(f"Acquisition service {row['id']}: mismatched service role")
    resource_rules = {
        "plant": "herbalism",
        "mineral": "mining",
        "fishing": "fishing",
        "radiant": "radiant",
        "other": "gather_fixed",
    }
    for row in _rows(
        conn,
        """
        SELECT d.id,d.resource_kind,m.rule_id FROM acquisition_resource_details d
        JOIN acquisition_methods m ON m.id=d.id
    """,
    ):
        if resource_rules.get(row["resource_kind"]) != row["rule_id"]:
            raise ValueError(
                f"Acquisition resource {row['id']}: mismatched gathering rule"
            )
    for row in _rows(
        conn,
        """
        SELECT r.method_id,r.origin,m.kind FROM acquisition_global_roots r
        JOIN acquisition_methods m ON m.id=r.method_id WHERE r.origin!=m.kind
    """,
    ):
        raise ValueError(
            f"Acquisition method {row['method_id']}: invalid global origin"
        )
    for row in _rows(
        conn,
        """
        SELECT g.id FROM acquisition_cost_groups g JOIN acquisition_methods m ON m.id=g.method_id
        WHERE (g.selection_rule!='always' AND
               (m.kind!='world_chest' OR g.consumption_rule!='after_outer_success'))
           OR (g.quantity_rule='all_carried' AND m.kind!='blessing')
           OR (g.quantity_rule='quest_completion' AND m.kind!='quest_complete')
           OR NOT EXISTS(SELECT 1 FROM acquisition_inputs i WHERE i.cost_group_id=g.id)
    """,
    ):
        raise ValueError(
            f"Acquisition cost group {row['id']}: impossible or empty cost branch"
        )
    pool_kinds = {
        row["id"]: row["kind"] for row in _rows(conn, "SELECT * FROM loot_pools")
    }
    for row in _rows(conn, "SELECT * FROM loot_pool_entries"):
        if (
            row["resolution"] == "uniform_child"
            and pool_kinds[row["child_pool_id"]] != "random"
        ):
            raise ValueError(
                f"Acquisition entry {row['id']}: unsupported nested pool kind"
            )
    for row in _rows(conn, "SELECT * FROM loot_monster_rules"):
        if pool_kinds[row["pool_id"]] != "monster":
            raise ValueError(f"Acquisition monster rule {row['id']}: non-monster pool")
    for row in _rows(conn, "SELECT * FROM loot_chest_rules"):
        if pool_kinds[row["pool_id"]] != "portable_chest":
            raise ValueError(f"Acquisition chest rule {row['id']}: non-chest pool")
    for row in _rows(conn, "SELECT * FROM loot_fishing_rules"):
        if any(
            pool_kinds[row[column]] != kind
            for column, kind in (
                ("primary_pool_id", "fishing_primary"),
                ("trash_pool_id", "fishing_trash"),
                ("fallback_pool_id", "fishing_fallback"),
            )
        ):
            raise ValueError(
                f"Acquisition fishing rule {row['id']}: damaged pool roles"
            )
    for row in _rows(
        conn,
        """
        SELECT o.id,o.method_id,o.condition_slot,m.kind FROM acquisition_outputs o
        JOIN acquisition_methods m ON m.id=o.method_id WHERE o.condition_slot IS NOT NULL
    """,
    ):
        if row["kind"] == "quest_complete":
            count = conn.execute(
                """
                SELECT count(*) FROM acquisition_quest_details d JOIN quest_reward_slots s ON s.quest_id=d.quest_id
                WHERE d.id=? AND s.ordinal=?
            """,
                (row["method_id"], row["condition_slot"]),
            ).fetchone()[0]
            valid = count == 1
        elif row["kind"] == "kill":
            valid = row["condition_slot"] in (0, 1, 2, 3) and bool(
                conn.execute(
                    "SELECT 1 FROM acquisition_kill_details WHERE id=? AND event_kind='altar_final' AND altar_id IS NOT NULL",
                    (row["method_id"],),
                ).fetchone()
            )
        else:
            valid = False
        if not valid:
            raise ValueError(
                f"Acquisition output {row['id']}: invalid typed condition slot"
            )
