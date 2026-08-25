"""Remove unreleased content as the difference between two closures.

The published set is the content a player can reach from a released zone.
Removal is therefore a subtraction:

- ``R_all`` is the content reachable from every zone.
- ``R_kept`` is the content reachable from the zones that remain. Its graph
  excludes the manually named entities and the ``ignore_journal`` items.
- The redaction removes ``R_all`` minus ``R_kept``, and the excluded content
  itself.

The closure supplies the transitive part, so this module contains no loop.

Content that is reachable from nothing is absent from both results. The
subtraction therefore keeps the 96 items that have no source.

A row with its own identifier is a node. A junction row is an edge. In a
junction row, the reference that reaches names the target, and the reference
that mentions names the source. ``monster_skills`` gives an edge from a monster
to a skill. ``item_sources_monster`` gives an edge from a monster to an item.
"""

import json
import sqlite3
from collections import deque
from dataclasses import dataclass, field
from typing import Any

from rich.console import Console

from compendium.redactions.config import RedactionConfig
from compendium.redactions.discovery import (
    ZONE_TABLE,
    decode,
    geometry_columns,
    has_identifier,
    is_required,
    json_identifiers,
)
from compendium.redactions.placement import placements
from compendium.redactions.references import Reference, resolve

console = Console()

Node = tuple[str, str]

MECHANISM_ZONE = "unreleased_zone"
MECHANISM_MANUAL = "manual"
MECHANISM_JOURNAL = "ignore_journal"
MECHANISM_CASCADE = "cascade"


@dataclass
class Removal:
    """One removal and the reason for it."""

    table: str
    entity_id: str
    mechanism: str
    reason: str
    distance: int = 0
    via: list[str] = field(default_factory=list)
    # Where the row stands, when its own identifier does not survive a build.
    # `identify` fills this in while the row is still there to read.
    placement: str | None = None

    @property
    def key(self) -> str:
        """The identity the ledger records this removal under."""
        return f"{self.table}:{self.placement or self.entity_id}"


@dataclass
class Graph:
    """The reachability graph, and the parents of each node."""

    edges: dict[Node, set[Node]] = field(default_factory=dict)

    def add(self, parent: Node, child: Node) -> None:
        self.edges.setdefault(parent, set()).add(child)

    def reach(self, roots: set[Node], blocked: set[Node]) -> dict[Node, int]:
        """Breadth-first reachability, returning each node's distance."""
        seen: dict[Node, int] = {}
        queue: deque[tuple[Node, int]] = deque()
        for root in sorted(roots):
            if root not in blocked:
                seen[root] = 0
                queue.append((root, 0))
        while queue:
            node, distance = queue.popleft()
            for child in self.edges.get(node, ()):
                if child in blocked or child in seen:
                    continue
                seen[child] = distance + 1
                queue.append((child, distance + 1))
        return seen

    def parents(self) -> dict[Node, set[Node]]:
        found: dict[Node, set[Node]] = {}
        for parent, children in self.edges.items():
            for child in children:
                found.setdefault(child, set()).add(parent)
        return found


def _zone_key(conn: sqlite3.Connection) -> dict[int, str]:
    return {
        row[1]: row[0]
        for row in conn.execute(f"SELECT id, zone_id FROM {ZONE_TABLE}")
        if row[1] is not None
    }


def build_graph(conn: sqlite3.Connection, references: list[Reference]) -> Graph:
    """Build the reachability graph from the declared references."""
    graph = Graph()
    numeric_to_zone = _zone_key(conn)
    node_tables = {
        table: has_identifier(conn, table) for table in {r.table for r in references}
    }

    by_table: dict[str, list[Reference]] = {}
    for reference in references:
        by_table.setdefault(reference.table, []).append(reference)

    for table, group in by_table.items():
        reaching = [r for r in group if r.reaches]
        if not reaching:
            continue
        identified = node_tables.get(table, False)
        selected = sorted(
            {r.column for r in group}
            | {r.condition[0] for r in group if r.condition is not None}
        )
        key = "id" if identified else "rowid"
        rows = conn.execute(
            f"SELECT {key}, {', '.join(selected)} FROM {table}"
        ).fetchall()
        index = {column: position + 1 for position, column in enumerate(selected)}

        for row in rows:
            row_id = row[0]
            if row_id is None:
                continue
            source: Node | None = (table, str(row_id)) if identified else None

            # What the row names reaches the row. A place contains the row that
            # names it, and a zone contains a sub-zone, so the path runs from the
            # zone to the sub-zone to the row. An aggregate names the members
            # that provide it, so the path runs from each member to the row.
            for reference in group:
                if not reference.backwards or not _covers(reference, row, index):
                    continue
                for value in _values(reference, row[index[reference.column]]):
                    named: str | None
                    if reference.numeric:
                        named = (
                            numeric_to_zone.get(value)
                            if isinstance(value, int)
                            else None
                        )
                    else:
                        named = str(value)
                    if named is None:
                        continue
                    parent = (reference.target_table, str(named))
                    if identified and source is not None:
                        graph.add(parent, source)
                    else:
                        for target in _targets(group, row, index, reference):
                            graph.add(parent, target)

            # The row provides what it names.
            for reference in reaching:
                if reference.backwards or not _covers(reference, row, index):
                    continue
                for value in _values(reference, row[index[reference.column]]):
                    child = (reference.target_table, str(value))
                    if identified and source is not None:
                        graph.add(source, child)
                        continue
                    for parent in _sources(
                        group, row, index, reference, numeric_to_zone
                    ):
                        graph.add(parent, child)
    return graph


def memberships(
    conn: sqlite3.Connection, references: list[Reference]
) -> dict[Node, set[Node]]:
    """The members each row declares, for the references read as provided_by.

    A place is excluded: a zone contains the row that names it rather than being
    composed of it. Only a row with its own identifier can be an aggregate,
    because a junction row is an edge and has nothing to remove.

    Rows with no member are absent. The caller must not remove a row on the
    strength of an empty member set, or every row that names nothing would go.
    """
    composed = [r for r in references if r.backwards and not r.to_zone]
    if not composed:
        return {}

    found: dict[Node, set[Node]] = {}
    by_table: dict[str, list[Reference]] = {}
    for reference in composed:
        by_table.setdefault(reference.table, []).append(reference)

    for table, group in by_table.items():
        if not has_identifier(conn, table):
            continue
        selected = sorted(
            {r.column for r in group}
            | {r.condition[0] for r in group if r.condition is not None}
        )
        index = {column: position + 1 for position, column in enumerate(selected)}
        rows = conn.execute(f"SELECT id, {', '.join(selected)} FROM {table}").fetchall()
        for row in rows:
            if row[0] is None:
                continue
            members: set[Node] = set()
            for reference in group:
                if not _covers(reference, row, index):
                    continue
                for value in _values(reference, row[index[reference.column]]):
                    members.add((reference.target_table, str(value)))
            if members:
                found[(table, str(row[0]))] = members
    return found


def _covers(reference: Reference, row: tuple[Any, ...], index: dict[str, int]) -> bool:
    """Whether this reference speaks for this row. A row that names another kind
    belongs to the reference declared for that kind."""
    if reference.condition is None:
        return True
    column, value = reference.condition
    return row[index[column]] == value


def _values(reference: Reference, raw: object) -> list[Any]:
    if reference.embedded:
        value = decode(raw if isinstance(raw, (str, bytes)) else None)
        if value is None:
            return []
        if reference.to_zone:
            return _zone_values(value, reference.json_keys[0])
        return sorted(json_identifiers(value, reference.json_keys))
    if raw is None or raw == "":
        return []
    return [raw]


def _zone_values(value: object, key: str) -> list[Any]:
    found: list[Any] = []

    def walk(node: object) -> None:
        if isinstance(node, dict):
            for name, inner in node.items():
                if name == key and inner is not None:
                    found.append(inner)
                else:
                    walk(inner)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(value)
    return found


def _sources(
    group: list[Reference],
    row: tuple,
    index: dict[str, int],
    reaching: Reference,
    numeric_to_zone: dict[int, str],
) -> list[Node]:
    """In a junction row, the mentioning references name the source."""
    found: list[Node] = []
    for reference in group:
        if reference is reaching or reference.reaches:
            continue
        if not _covers(reference, row, index):
            continue
        for value in _values(reference, row[index[reference.column]]):
            found.append((reference.target_table, str(value)))
    return found


def _targets(
    group: list[Reference], row: tuple, index: dict[str, int], parent: Reference
) -> list[Node]:
    """The content of a junction row that what the row names reaches."""
    found: list[Node] = []
    for reference in group:
        if reference is parent or reference.backwards:
            continue
        if not _covers(reference, row, index):
            continue
        for value in _values(reference, row[index[reference.column]]):
            found.append((reference.target_table, str(value)))
    return found


def _seeds(conn: sqlite3.Connection, redactions: RedactionConfig) -> list[Removal]:
    """The removals that come directly from configuration."""
    seeds = [
        Removal(
            table=ZONE_TABLE,
            entity_id=zone_id,
            mechanism=MECHANISM_ZONE,
            reason="configured as an unreleased zone",
        )
        for zone_id in sorted(redactions.exclude_zone_ids)
    ]

    for row in conn.execute("SELECT id FROM items WHERE ignore_journal = 1"):
        seeds.append(
            Removal(
                table="items",
                entity_id=row[0],
                mechanism=MECHANISM_JOURNAL,
                reason="the game marks the item ignore_journal",
            )
        )

    for entity_id in sorted(redactions.exclude_entity_ids):
        for table in ("items", "skills", "monsters", "quests", "npcs"):
            if conn.execute(
                f"SELECT 1 FROM {table} WHERE id = ?", (entity_id,)
            ).fetchone():
                seeds.append(
                    Removal(
                        table=table,
                        entity_id=entity_id,
                        mechanism=MECHANISM_MANUAL,
                        reason="named in the manual exclusion list",
                    )
                )
    return seeds


def decide(
    conn: sqlite3.Connection, redactions: RedactionConfig
) -> tuple[list[Removal], list[Reference]]:
    """Calculate the removals. This function changes no data."""
    references = resolve(conn)
    graph = build_graph(conn, references)

    zones = {row[0] for row in conn.execute(f"SELECT id FROM {ZONE_TABLE}")}
    all_roots = {(ZONE_TABLE, zone) for zone in zones}
    kept_roots = {(ZONE_TABLE, zone) for zone in zones - redactions.exclude_zone_ids}

    seeds = _seeds(conn, redactions)
    seed_nodes = {(seed.table, seed.entity_id) for seed in seeds}

    reached_all = graph.reach(all_roots, blocked=set())
    reached_kept = graph.reach(kept_roots, blocked=seed_nodes)

    lost = set(reached_all) - set(reached_kept) - seed_nodes
    parents = graph.parents()
    removed_nodes = seed_nodes | lost

    removals = list(seeds)
    for node in sorted(lost):
        table, entity_id = node
        followed = sorted(
            f"{parent[0]}:{parent[1]}"
            for parent in parents.get(node, set())
            if parent in removed_nodes
        )
        removals.append(
            Removal(
                table=table,
                entity_id=entity_id,
                mechanism=MECHANISM_CASCADE,
                reason="every source that made it reachable was removed",
                distance=reached_all[node],
                via=followed,
            )
        )

    # An aggregate that only its members reach cannot come out of the closure
    # subtraction, because a member with no source of its own is in neither
    # closure. It is removed here instead, once every member it declares is
    # gone. The loop repeats because one aggregate can name another.
    aggregates = memberships(conn, references)
    while True:
        emptied = [
            (node, members)
            for node, members in sorted(aggregates.items())
            if node not in removed_nodes and members and members <= removed_nodes
        ]
        if not emptied:
            break
        for node, members in emptied:
            removed_nodes.add(node)
            removals.append(
                Removal(
                    table=node[0],
                    entity_id=node[1],
                    mechanism=MECHANISM_CASCADE,
                    reason="every member it is composed of was removed",
                    distance=1 + max(reached_all.get(m, 0) for m in members),
                    via=sorted(f"{member[0]}:{member[1]}" for member in members),
                )
            )

    identify(conn, removals)
    return removals, references


def identify(conn: sqlite3.Connection, removals: list[Removal]) -> None:
    """Record where each removed placement stands, before anything deletes it."""
    wanted: dict[str, set[str]] = {}
    for removal in removals:
        wanted.setdefault(removal.table, set()).add(removal.entity_id)

    found = placements(conn, wanted)
    for removal in removals:
        removal.placement = found.get((removal.table, removal.entity_id))

    # A parent is named by the identity it is recorded under, so that the chain
    # an entry states resolves to the entries beside it.
    recorded = {f"{r.table}:{r.entity_id}": r.key for r in removals}
    for removal in removals:
        removal.via = sorted(recorded.get(parent, parent) for parent in removal.via)


def apply(
    conn: sqlite3.Connection, removals: list[Removal], references: list[Reference]
) -> None:
    """Delete the removed rows, and clear references to them from survivors."""
    by_table: dict[str, set[str]] = {}
    for removal in removals:
        by_table.setdefault(removal.table, set()).add(removal.entity_id)

    numeric_to_zone = _zone_key(conn)
    zone_numeric = {
        str(number)
        for number, zone in numeric_to_zone.items()
        if zone in by_table.get(ZONE_TABLE, set())
    }

    # Clear every reference to a removed row before you delete any row. This
    # order prevents a reference to a row that no longer exists.
    for reference in references:
        removed = by_table.get(reference.target_table, set())
        if not removed:
            continue
        wanted = zone_numeric if reference.numeric else removed

        if reference.embedded:
            _scrub_embedded(conn, reference, wanted)
            continue

        placeholders = ",".join("?" * len(wanted))
        parameters = tuple(sorted(wanted))
        # A reference that covers part of a table speaks only for its own rows.
        covered = ""
        if reference.condition is not None:
            covered = f" AND {reference.condition[0]} = ?"
            parameters += (reference.condition[1],)
        # A destination reference also governs the coordinates of the place it
        # points at. Clearing the identifier alone leaves the position of
        # removed content in the published data, and the map draws a line to it.
        if reference.locus == "destination" and reference.geometry_prefixes:
            governed = [
                column
                for column in geometry_columns(conn, reference.table)
                if column.startswith(reference.geometry_prefixes)
            ]
            if governed:
                assignments = ", ".join(f"{column} = NULL" for column in governed)
                conn.execute(
                    f"UPDATE {reference.table} SET {assignments} "
                    f"WHERE {reference.column} IN "
                    f"({','.join('?' * len(wanted))})",
                    tuple(sorted(wanted)),
                )

        # A row with its own identifier keeps the row and loses the reference.
        # Delete the row in two other conditions. A junction row is the
        # reference. A required column cannot hold NULL.
        survives = has_identifier(conn, reference.table) and not is_required(
            conn, reference.table, reference.column
        )
        statement = (
            f"UPDATE {reference.table} SET {reference.column} = NULL"
            if survives
            else f"DELETE FROM {reference.table}"
        )
        conn.execute(
            f"{statement} WHERE {reference.column} IN ({placeholders}){covered}",
            parameters,
        )

    # A removed row can reference another removed row. A sub-zone references its
    # zone. Defer the constraints so the order of these deletions does not
    # matter.
    # The rows in visual_assets stay. `visual_assets.reconcile` finds an asset
    # whose entity is absent, deletes the row, and deletes the published file.
    # Deleting the row here would hide the asset from that step and leave the
    # file in website/static/images.
    cursor = conn.cursor()
    cursor.execute("PRAGMA defer_foreign_keys = ON")
    for table, identifiers in sorted(by_table.items()):
        placeholders = ",".join("?" * len(identifiers))
        parameters = tuple(sorted(identifiers))
        cursor.execute(f"DELETE FROM {table} WHERE id IN ({placeholders})", parameters)

    conn.commit()


def _scrub_embedded(
    conn: sqlite3.Connection, reference: Reference, removed: set[str]
) -> None:
    rows = conn.execute(
        f"SELECT rowid, {reference.column} FROM {reference.table} "
        f"WHERE {reference.column} IS NOT NULL"
    ).fetchall()
    for rowid, raw in rows:
        value = decode(raw)
        if value is None:
            continue
        cleaned = _drop(value, reference.json_keys, removed)
        if cleaned != value:
            conn.execute(
                f"UPDATE {reference.table} SET {reference.column} = ? WHERE rowid = ?",
                (json.dumps(cleaned), rowid),
            )


def _drop(value: object, keys: tuple[str, ...], removed: set[str]) -> object:
    if isinstance(value, list):
        kept: list[Any] = []
        for item in value:
            if isinstance(item, str):
                if "*" in keys and item in removed:
                    continue
                kept.append(item)
            elif isinstance(item, dict) and any(
                item.get(key) in removed for key in keys if key != "*"
            ):
                continue
            else:
                kept.append(_drop(item, keys, removed))
        return kept
    if isinstance(value, dict):
        return {key: _drop(inner, keys, removed) for key, inner in value.items()}
    return value


def run(conn: sqlite3.Connection, redactions: RedactionConfig) -> list[Removal]:
    """Remove unreleased content, and content with no other source."""
    removals, references = decide(conn, redactions)
    apply(conn, removals, references)

    counts: dict[str, int] = {}
    for removal in removals:
        counts[removal.mechanism] = counts.get(removal.mechanism, 0) + 1
    console.print(
        "Excluding unreleased content: "
        + ", ".join(f"{count} by {name}" for name, count in sorted(counts.items()))
    )
    depth = max((removal.distance for removal in removals), default=0)
    console.print(
        f"  Removed {len(removals)} rows, reached up to {depth} references deep"
    )
    return removals
