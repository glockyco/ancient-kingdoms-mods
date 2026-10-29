"""Preserve typed requirements and finite processes across publication redaction."""

import json
import math
import re
import sqlite3
import uuid
from collections import defaultdict
from typing import Any

from .config import RedactionConfig
from .discovery import (
    columns,
    foreign_keys,
    geometry_columns,
    numeric_zone_ids,
    resolve_sub_zones,
    tables,
)
from .references import DETAIL_TARGETS, PROVIDER_COLUMNS, resolve

Node = tuple[str, str]

INTERNAL_TABLES = frozenset(
    {
        "acquisition_methods",
        "acquisition_cost_groups",
        "acquisition_inputs",
        "acquisition_outputs",
        "acquisition_faction_effects",
        "acquisition_method_pools",
        "acquisition_global_roots",
        "acquisition_home_providers",
        "acquisition_method_fishing_rules",
        "loot_pools",
        "loot_pool_entries",
        "loot_monster_rules",
        "loot_chest_rules",
        "loot_fishing_rules",
        "item_pool_definitions",
        "quest_objectives",
        "quest_objective_items",
        "quest_objective_monsters",
        "quest_objective_locations",
        "quest_objective_brews",
        "quest_predecessors",
        "quest_class_requirements",
        "quest_book_requirements",
        "quest_profession_requirements",
        "quest_race_requirements",
        "quest_faction_requirements",
        "quest_reward_slots",
        "quest_provided_items",
        "npc_quest_memberships",
        "npc_skills",
        "item_class_requirements",
        "skill_predecessors",
        "summon_trigger_placeholders",
    }
    | {f"acquisition_{family}_details" for family in DETAIL_TARGETS}
    | {f"acquisition_providers_{domain}" for domain in PROVIDER_COLUMNS}
)

# A typed child is the same identity as its parent, not a separately keyed row.
EQUAL_PARENTS = {
    **{
        f"acquisition_{family}_details": "acquisition_methods"
        for family in DETAIL_TARGETS
    },
    **{
        f"quest_objective_{family}": "quest_objectives"
        for family in ("items", "monsters", "locations", "brews")
    },
    "acquisition_method_fishing_rules": "acquisition_methods",
}

# Required operands keep their authored order and amount when their target is hidden.
WITHHOLD_TARGETS = {
    ("acquisition_inputs", "item_id"): "withheld",
    ("acquisition_outputs", "item_id"): "withheld",
    ("acquisition_faction_effects", "faction_id"): "withheld",
    ("quest_objective_items", "item_id"): "@objective",
    ("quest_objective_monsters", "monster_id"): "@objective",
    ("quest_objective_locations", "zone_id"): "@objective",
    ("quest_objective_locations", "sub_zone_id"): "@objective",
    ("quest_objective_brews", "item_id"): "@objective",
    ("quest_predecessors", "predecessor_quest_id"): "withheld",
    ("quest_class_requirements", "class_id"): "withheld",
    ("quest_race_requirements", "race_id"): "withheld",
    ("quest_book_requirements", "item_id"): "withheld",
    ("quests", "alternative_ending_quest_id"): "alternative_ending_withheld",
    ("acquisition_recipe_details", "required_quest_id"): "required_quest_withheld",
    ("quest_faction_requirements", "faction_id"): "withheld",
    ("quest_reward_slots", "class_id"): "class_withheld",
    ("quest_reward_slots", "item_id"): "item_withheld",
    ("quest_provided_items", "item_id"): "withheld",
    ("item_class_requirements", "class_id"): "withheld",
    ("skill_predecessors", "predecessor_skill_id"): "withheld",
    ("acquisition_world_chest_details", "key_item_id"): "key_item_withheld",
    ("acquisition_treasure_details", "map_item_id"): "map_item_withheld",
    ("acquisition_kill_details", "loot_zone_id"): "loot_zone_withheld",
    ("items", "buy_token_id"): "buy_token_withheld",
    ("items", "weapon_required_ammo_id"): "weapon_required_ammo_withheld",
    ("items", "fragment_result_item_id"): "fragment_result_item_withheld",
    ("altars", "required_activation_item_id"): "required_activation_item_withheld",
    ("altars", "reward_common_id"): "reward_common_withheld",
    ("altars", "reward_magic_id"): "reward_magic_withheld",
    ("altars", "reward_epic_id"): "reward_epic_withheld",
    ("altars", "reward_legendary_id"): "reward_legendary_withheld",
    ("gathering_resources", "tool_required_id"): "tool_required_withheld",
    ("portals", "required_item_id"): "required_item_withheld",
    ("portals", "need_monster_dead_spawn_id"): "need_monster_dead_withheld",
    ("portals", "to_zone_id"): "destination_withheld",
    ("portals", "to_sub_zone_id"): "destination_withheld",
    ("treasure_locations", "required_map_id"): "required_map_withheld",
    ("summon_triggers", "summoned_monster_spawn_id"): "summoned_target_withheld",
    ("summon_triggers", "summoned_npc_spawn_id"): "summoned_target_withheld",
    ("summon_trigger_placeholders", "spawn_id"): "withheld",
}

POOL_FIELDS = (
    "ordinal",
    "resolution",
    "probability",
    "cap",
    "counts_equipment",
    "guaranteed_equipment_candidate",
    "quest_gate",
    "scales_with_treasure_hunter",
    "quality",
)


class InvalidPublication(ValueError):
    """The surviving facts cannot express the original public behavior safely."""


def _rows(conn: sqlite3.Connection, table: str) -> list[dict[str, Any]]:
    cursor = conn.execute(f'SELECT * FROM "{table}"')
    names = [description[0] for description in cursor.description]
    return [dict(zip(names, row, strict=True)) for row in cursor]


def _canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def _groups(conn: sqlite3.Connection) -> None:
    """Replace private duplicate-equivalence labels by first-use process ordinals."""
    grouped: dict[str, dict[Any, int]] = defaultdict(dict)
    for entry in conn.execute(
        "SELECT id,pool_id,duplicate_group FROM loot_pool_entries ORDER BY pool_id,ordinal"
    ):
        entry_id, pool_id, original = entry
        if original is None:
            continue
        equivalences = grouped[pool_id]
        group = equivalences.setdefault(original, len(equivalences))
        conn.execute(
            "UPDATE loot_pool_entries SET duplicate_group=? WHERE id=?",
            (group, entry_id),
        )


def apply_semantic_withholding(conn: sqlite3.Connection, removed: set[Node]) -> None:
    """Anonymize computed removals before any destructive reference scrubbing."""
    present = set(tables(conn))
    refs = foreign_keys(conn)
    hidden = defaultdict(set)
    for table, identity in removed:
        hidden[table].add(identity)

    # Compare every retained process operand, not just the visible outcomes.
    before = (
        {
            row["id"]: tuple(row[field] for field in POOL_FIELDS)
            for row in _rows(conn, "loot_pool_entries")
            if ("loot_pool_entries", row["id"]) not in removed
            and ("loot_pools", row["pool_id"]) not in removed
        }
        if "loot_pool_entries" in present
        else {}
    )

    for ref in refs:
        flag = WITHHOLD_TARGETS.get((ref.table, ref.column))
        targets = hidden[ref.target_table]
        if flag is None or not targets:
            continue
        marks = ",".join("?" for _ in targets)
        params = tuple(sorted(targets))
        affected = list(
            conn.execute(
                f'SELECT id FROM "{ref.table}" WHERE "{ref.column}" IN ({marks})',
                params,
            )
        )
        if not affected:
            continue
        assignments = [f'"{ref.column}"=NULL']
        if flag == "@objective":
            conn.executemany(
                "UPDATE quest_objectives SET withheld=1 WHERE id=?", affected
            )
        elif flag not in columns(conn, ref.table):
            raise InvalidPublication(
                f"{ref.table}.{ref.column}: missing withholding flag {flag}"
            )
        else:
            assignments.append(f'"{flag}"=1')
        if ref.table == "acquisition_kill_details" and ref.column == "loot_zone_id":
            assignments.append("loot_zone_number=NULL")
        if (
            ref.table == "quest_objective_locations"
            or ref.table == "portals"
            and ref.column.startswith("to_")
        ):
            governed = geometry_columns(conn, ref.table)
            if ref.table == "portals":
                governed = [
                    column for column in governed if column.startswith("destination_")
                ]
            assignments.extend(f'"{column}"=NULL' for column in governed)
        if ref.table == "summon_triggers":
            assignments.extend(
                f'"{column}"=NULL'
                for column in geometry_columns(conn, ref.table)
                if column.startswith("spawn_position_")
            )
        conn.execute(
            f'UPDATE "{ref.table}" SET {",".join(assignments)} WHERE "{ref.column}" IN ({marks})',
            params,
        )

    if "loot_pool_entries" in present:
        for row in _rows(conn, "loot_pool_entries"):
            if row["id"] not in before:
                continue
            if row["child_pool_id"] in hidden["loot_pools"]:
                raise InvalidPublication(
                    f"pool {row['pool_id']} entry {row['id']}: removed child process cannot be preserved"
                )
            if row["item_id"] in hidden["items"]:
                quest_gate = (
                    "withheld_need"
                    if row["quest_gate"] == "public_need"
                    else row["quest_gate"]
                )
                conn.execute(
                    "UPDATE loot_pool_entries SET item_id=NULL,withheld=1,quest_gate=? WHERE id=?",
                    (quest_gate, row["id"]),
                )
                expected = dict(zip(POOL_FIELDS, before[row["id"]], strict=True))
                expected["quest_gate"] = quest_gate
                before[row["id"]] = tuple(expected[field] for field in POOL_FIELDS)
        _groups(conn)
        after = {
            row["id"]: tuple(row[field] for field in POOL_FIELDS)
            for row in _rows(conn, "loot_pool_entries")
            if row["id"] in before
        }
        if before != after:
            raise InvalidPublication(
                "anonymous pool projection changed process operands or multiplicity"
            )


def rekey(conn: sqlite3.Connection) -> dict[Node, str]:
    """Allocate opaque keys from public labeled graph structure inside one savepoint.

    The returned private mapping is local build evidence only. Equal public rows
    have no private tie-breaker. Their multiplicity and labeled edges remain.
    """
    present = set(tables(conn))
    internal = present & INTERNAL_TABLES
    rows = {
        (table, str(row["id"])): row
        for table in sorted(internal)
        for row in _rows(conn, table)
    }
    refs = foreign_keys(conn)
    by_table: dict[str, list[Any]] = defaultdict(list)
    for ref in refs:
        by_table[ref.table].append(ref)

    # Equality-linked detail rows contribute semantic fields to the parent key.
    def representative(node: Node) -> Node:
        parent = EQUAL_PARENTS.get(node[0])
        return (parent, node[1]) if parent else node

    bases: dict[Node, list[Any]] = defaultdict(list)
    outgoing: dict[Node, list[tuple[str, Node]]] = defaultdict(list)
    incoming: dict[Node, list[tuple[str, Node]]] = defaultdict(list)
    for node, row in rows.items():
        owner = representative(node)
        if owner not in rows:
            raise InvalidPublication(f"{node[0]} {node[1]}: missing equality parent")
        internal_columns = {
            ref.column
            for ref in by_table[node[0]]
            if ref.target_table in internal and ref.target_column == "id"
        }
        scalar = {
            key: value
            for key, value in row.items()
            if key != "id" and key not in internal_columns
        }
        bases[owner].append((node[0], scalar))
        for ref in by_table[node[0]]:
            value = row.get(ref.column)
            if (
                value is None
                or ref.target_table not in internal
                or ref.target_column != "id"
            ):
                continue
            target = representative((ref.target_table, str(value)))
            if target == owner and ref.column == "id":
                continue
            label = f"{ref.table}.{ref.column}"
            outgoing[owner].append((label, target))
            incoming[target].append((label, owner))

    # Public references into internal rows also discriminate pool/variant roles.
    for ref in refs:
        if (
            ref.table in internal
            or ref.target_table not in internal
            or ref.target_column != "id"
        ):
            continue
        for row in _rows(conn, ref.table):
            value = row.get(ref.column)
            if value is not None:
                target = representative((ref.target_table, str(value)))
                bases[target].append(
                    (
                        f"public:{ref.table}.{ref.column}",
                        row.get("id", row.get("item_id")),
                    )
                )

    base = {
        node: _canonical(sorted(values, key=_canonical))
        for node, values in bases.items()
    }

    def ranks(signatures: dict[Node, str]) -> dict[Node, int]:
        order = {
            value: index for index, value in enumerate(sorted(set(signatures.values())))
        }
        return {node: order[value] for node, value in signatures.items()}

    colors = ranks(base)
    for _ in range(len(colors)):
        signatures = {
            node: _canonical(
                (
                    base[node],
                    colors[node],
                    sorted((label, colors[target]) for label, target in outgoing[node]),
                    sorted((label, colors[source]) for label, source in incoming[node]),
                )
            )
            for node in base
        }
        refined = ranks(signatures)
        # Refinement only splits partitions. Once the partition stops splitting,
        # later rounds add no semantic distinction.
        if len(set(refined.values())) == len(set(colors.values())):
            colors = refined
            break
        colors = refined

    mapping: dict[Node, str] = {}
    for table in sorted(internal - EQUAL_PARENTS.keys()):
        selected = [node for node in rows if node[0] == table]
        selected.sort(key=lambda node: (colors[node], base[node]))
        for ordinal, node in enumerate(selected, start=1):
            mapping[node] = f"{table}:{ordinal}"
    for node in rows:
        if node[0] in EQUAL_PARENTS:
            mapping[node] = mapping[representative(node)]

    # Two phases avoid collisions with any pre-existing public-looking key.
    nonce = uuid.uuid4().hex
    temporary = {
        node: f"__acquisition_rekey_{nonce}_{index}"
        for index, node in enumerate(mapping)
    }
    for node in temporary:
        if node[0] in EQUAL_PARENTS:
            temporary[node] = temporary[representative(node)]
    conn.execute("SAVEPOINT acquisition_public_rekey")
    try:
        conn.execute("PRAGMA defer_foreign_keys=ON")
        for source_keys, target_keys in (
            ({node: node[1] for node in mapping}, temporary),
            (temporary, mapping),
        ):
            for ref in refs:
                if ref.target_table not in internal or ref.target_column != "id":
                    continue
                # Equality child primary keys are updated once, below.
                if ref.table in EQUAL_PARENTS and (
                    ref.column == "id"
                    or ref.table == "acquisition_method_fishing_rules"
                    and ref.column == "method_id"
                ):
                    continue
                conn.executemany(
                    f'UPDATE "{ref.table}" SET "{ref.column}"=? WHERE "{ref.column}"=?',
                    [
                        (target_keys[node], source_keys[node])
                        for node in mapping
                        if node[0] == ref.target_table
                    ],
                )
            for table in sorted(internal):
                if table == "acquisition_method_fishing_rules":
                    conn.executemany(
                        f'UPDATE "{table}" SET id=?,method_id=? WHERE id=?',
                        [
                            (target_keys[node], target_keys[node], source_keys[node])
                            for node in mapping
                            if node[0] == table
                        ],
                    )
                else:
                    conn.executemany(
                        f'UPDATE "{table}" SET id=? WHERE id=?',
                        [
                            (target_keys[node], source_keys[node])
                            for node in mapping
                            if node[0] == table
                        ],
                    )
        failures = list(conn.execute("PRAGMA foreign_key_check"))
        if failures:
            raise InvalidPublication(
                f"rekey left dangling foreign keys: {failures[:5]}"
            )
        conn.execute("RELEASE acquisition_public_rekey")
    except Exception:
        conn.execute("ROLLBACK TO acquisition_public_rekey")
        conn.execute("RELEASE acquisition_public_rekey")
        raise
    return mapping


def validate_semantics(
    conn: sqlite3.Connection, redactions: RedactionConfig | None = None
) -> None:
    """Reject invalid, damaged or private canonical publication facts."""
    present = set(tables(conn))
    staging = sorted(
        table for table in present if table.startswith("_acquisition_input_")
    )
    if staging:
        raise InvalidPublication(f"private acquisition staging survived: {staging}")
    failures = list(conn.execute("PRAGMA foreign_key_check"))
    if failures:
        raise InvalidPublication(f"dangling foreign keys: {failures[:5]}")
    invalid_zone = conn.execute("""
        SELECT d.id FROM acquisition_kill_details d
        LEFT JOIN zones z ON z.id=d.loot_zone_id
        WHERE d.loot_zone_withheld=0 AND (
            d.loot_zone_number<0
            OR (d.loot_zone_number=0 AND d.loot_zone_id IS NOT NULL)
            OR (d.loot_zone_number>0 AND (d.loot_zone_id IS NULL OR z.zone_id<>d.loot_zone_number))
        ) LIMIT 1
    """).fetchone()
    if invalid_zone:
        raise InvalidPublication(
            f"kill method {invalid_zone[0]}: invalid native loot-zone lookup"
        )
    unknown = sorted(
        table
        for table in present - INTERNAL_TABLES
        if table.startswith(
            (
                "acquisition_",
                "loot_pool",
                "loot_fishing_",
                "loot_chest_",
                "loot_monster_",
            )
        )
    )
    if unknown:
        raise InvalidPublication(f"unregistered acquisition tables: {unknown}")
    for table in sorted(present & INTERNAL_TABLES):
        for name in columns(conn, table):
            if name in {"definition_key", "payload", "provenance", "private_id"}:
                raise InvalidPublication(
                    f"private acquisition field survived: {table}.{name}"
                )
        parent = EQUAL_PARENTS.get(table, table)
        expected = re.compile(re.escape(parent) + r":[1-9][0-9]*\Z")
        ordinals = []
        for (identity,) in conn.execute(f'SELECT id FROM "{table}"'):
            if not isinstance(identity, str) or not expected.fullmatch(identity):
                raise InvalidPublication(
                    f"{table}: private or noncanonical identity {identity}"
                )
            ordinals.append(int(identity.rsplit(":", 1)[1]))
        if table not in EQUAL_PARENTS and sorted(ordinals) != list(
            range(1, len(ordinals) + 1)
        ):
            raise InvalidPublication(f"{table}: internal identities are not sequential")
    for ref in foreign_keys(conn):
        flag = WITHHOLD_TARGETS.get((ref.table, ref.column))
        if flag is None or ref.table not in present:
            continue
        if flag == "@objective":
            if ref.table == "quest_objective_locations":
                # Sub-zone membership is optional. Location facts can instead
                # name a declared discovery region without an entity target.
                continue
            statement = f'SELECT d.id FROM "{ref.table}" d JOIN quest_objectives o ON o.id=d.id WHERE (d."{ref.column}" IS NULL AND o.withheld<>1) OR (d."{ref.column}" IS NOT NULL AND o.withheld<>0)'
        elif flag in columns(conn, ref.table):
            # Optional scalar targets can honestly be absent. Identified operands
            # are required unless they are gold or a shared class-reward slot.
            if ref.table not in INTERNAL_TABLES or ref.table.endswith("_details"):
                statement = f'SELECT id FROM "{ref.table}" WHERE "{flag}"=1 AND "{ref.column}" IS NOT NULL'
            else:
                condition = ""
                if ref.table in {"acquisition_inputs", "acquisition_outputs"}:
                    condition = " AND resource_kind='item'"
                if ref.table == "quest_reward_slots" and ref.column == "class_id":
                    condition = " AND slot_kind='class'"
                statement = f'SELECT id FROM "{ref.table}" WHERE (("{ref.column}" IS NULL AND "{flag}"<>1) OR ("{ref.column}" IS NOT NULL AND "{flag}"<>0)){condition}'
        else:
            continue
        row = conn.execute(statement).fetchone()
        if row:
            raise InvalidPublication(
                f"{ref.table} {row[0]}: lost required target or conflicting withholding"
            )

    if "loot_pool_entries" in present:
        pool_kinds = dict(conn.execute("SELECT id,kind FROM loot_pools"))
        for row in _rows(conn, "loot_pool_entries"):
            context = f"pool {row['pool_id']} entry {row['id']}"
            if (
                pool_kinds[row["pool_id"]].startswith("fishing_")
                and row["quality"] is None
            ):
                raise InvalidPublication(
                    f"{context}: missing quality needed for fishing process"
                )
            if row["resolution"] not in {"direct", "uniform_child"}:
                raise InvalidPublication(
                    f"{context}: unsupported resolution {row['resolution']}"
                )
            if (row["item_id"] is None) != (row["withheld"] == 1):
                raise InvalidPublication(
                    f"{context}: conflicting target or anonymous withholding"
                )
            if row["withheld"] == 1 and row["quest_gate"] == "public_need":
                raise InvalidPublication(
                    f"{context}: hidden quest need was treated as public"
                )
            if row["resolution"] == "uniform_child" and row["child_pool_id"] is None:
                raise InvalidPublication(f"{context}: missing child process")
            if row["resolution"] == "direct" and row["child_pool_id"] is not None:
                raise InvalidPublication(f"{context}: direct entry has child process")
            chance = row["probability"]
            if chance is not None and (
                not math.isfinite(chance) or not 0 <= chance <= 1
            ):
                raise InvalidPublication(f"{context}: unsupported probability {chance}")
        _validate_pool_graph(conn)
    if "acquisition_cost_groups" in present:
        empty = conn.execute(
            "SELECT g.id FROM acquisition_cost_groups g LEFT JOIN acquisition_inputs i ON i.cost_group_id=g.id GROUP BY g.id HAVING count(i.id)=0"
        ).fetchone()
        if empty:
            raise InvalidPublication(
                f"cost group {empty[0]}: empty accidental requirement group"
            )
    if "quest_reward_slots" in present:
        row = conn.execute(
            "SELECT id FROM quest_reward_slots WHERE slot_kind='shared' AND class_withheld=1"
        ).fetchone()
        if row:
            raise InvalidPublication(
                f"quest reward slot {row[0]}: withheld class became shared"
            )
    if redactions is not None:
        _validate_geometry(conn, redactions)
        if (
            redactions.hide_crafting_item_ids
            and "acquisition_recipe_details" in present
        ):
            marks = ",".join("?" for _ in redactions.hide_crafting_item_ids)
            row = conn.execute(
                f"SELECT id FROM acquisition_recipe_details WHERE declared_result_item_id IN ({marks})",
                tuple(sorted(redactions.hide_crafting_item_ids)),
            ).fetchone()
            if row:
                raise InvalidPublication(f"hidden crafting method survived: {row[0]}")


def _validate_pool_graph(conn: sqlite3.Connection) -> None:
    graph: dict[str, set[str]] = defaultdict(set)
    for parent, child in conn.execute(
        "SELECT pool_id,child_pool_id FROM loot_pool_entries WHERE child_pool_id IS NOT NULL"
    ):
        graph[parent].add(child)
    active: set[str] = set()
    done: set[str] = set()

    def visit(pool: str) -> None:
        if pool in active:
            raise InvalidPublication(
                f"pool {pool}: recursive process cannot preserve finite sampling"
            )
        if pool in done:
            return
        active.add(pool)
        for child in graph[pool]:
            visit(child)
        active.remove(pool)
        done.add(pool)

    for pool in list(graph):
        visit(pool)


def _validate_geometry(conn: sqlite3.Connection, redactions: RedactionConfig) -> None:
    from .geometry import _governed

    suppressed = redactions.suppress_position_zone_ids | redactions.exclude_zone_ids
    refs = [
        ref
        for ref in resolve(conn)
        if ref.to_zone and not ref.embedded and ref.locus != "none"
    ]
    by_table: dict[str, list[Any]] = defaultdict(list)
    for ref in refs:
        by_table[ref.table].append(ref)
    numeric = numeric_zone_ids(conn, suppressed)
    subzones = resolve_sub_zones(conn, suppressed)
    for ref in refs:
        values = numeric if ref.numeric else subzones if ref.to_sub_zone else suppressed
        governed = _governed(conn, ref, by_table[ref.table])
        if not values or not governed:
            continue
        marks = ",".join("?" for _ in values)
        predicate = " OR ".join(f'"{column}" IS NOT NULL' for column in governed)
        row = conn.execute(
            f'SELECT rowid FROM "{ref.table}" WHERE "{ref.column}" IN ({marks}) AND ({predicate})',
            tuple(sorted(values, key=str)),
        ).fetchone()
        if row:
            raise InvalidPublication(
                f"{ref.table} row {row[0]}: hidden geometry survived"
            )
    for table, condition in (
        ("portals", "destination_withheld=1"),
        (
            "quest_objective_locations",
            "id IN (SELECT id FROM quest_objectives WHERE withheld=1)",
        ),
        ("summon_triggers", "summoned_target_withheld=1"),
    ):
        if table not in tables(conn):
            continue
        governed = geometry_columns(conn, table)
        if table == "portals":
            governed = [name for name in governed if name.startswith("destination_")]
        if table == "summon_triggers":
            governed = [name for name in governed if name.startswith("spawn_position_")]
        if governed:
            predicate = " OR ".join(f'"{column}" IS NOT NULL' for column in governed)
            if conn.execute(
                f'SELECT 1 FROM "{table}" WHERE {condition} AND ({predicate})'
            ).fetchone():
                raise InvalidPublication(
                    f"{table}: withheld target retained hidden geometry"
                )
