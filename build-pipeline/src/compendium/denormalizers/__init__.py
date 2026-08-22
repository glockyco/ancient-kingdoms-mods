"""Denormalization functions for the compendium build pipeline.

Denormalizers transform normalized relational data into denormalized JSON
fields optimized for client-side querying. They are organized by target
entity (the table being updated).

Execution order matters - some denormalizers depend on others having run first.
"""

import sqlite3

from rich.console import Console

from compendium.denormalizers import (
    altars,
    experience,
    items,
    monsters,
    npcs,
    quests,
    recipes,
    search,
    skills,
    zones,
)
from compendium.denormalizers.items import crafting_source_level, source_entries
from compendium.redactions import closure, crafting, geometry, verify
from compendium.redactions.config import RedactionConfig, load_redactions

console = Console()


def run_before_closure(
    conn: sqlite3.Connection,
) -> tuple[RedactionConfig, dict[str, int], dict[str, int]]:
    """Run every step the unreleased-zone closure depends on.

    `redactions check` recomputes the removal decisions without writing a
    database, and it needs this state to reach the same answer as a build.

    Args:
        conn: Database connection with all base data loaded

    Returns:
        The redaction configuration, the count of geometry values cleared for
        each zone under position suppression, and the count of recipes removed
        for each item with hidden crafting.
    """
    redactions = load_redactions()

    # Attribute redaction runs before any denormalizer reads the data. Each
    # pass keeps its entities and removes part of what is published about them.
    hidden_recipes = crafting.run(conn, redactions)
    suppressed = geometry.run(conn, redactions)

    # Enrich altar waves with monster boss/elite info (before altar data is read)
    altars.run_waves(conn)

    # Monster drops (expand altar variants before item sources read drops)
    monsters.run_drops(conn)

    # Monster spawn inference (before levels and items so altar/placeholder
    # spawns exist for level range calculation and item zone association)
    monsters.run_spawns(conn)

    return redactions, suppressed, hidden_recipes


def run_all(conn: sqlite3.Connection) -> verify.Subject:
    """Run all denormalizations in dependency order.

    Args:
        conn: Database connection with all base data loaded

    Returns:
        What the verification must not find in the published database.
    """
    # The build needs the configuration. The two attribute counts belong to the
    # ledger, which `redactions sync` writes from its own recomputation.
    redactions, _, _ = run_before_closure(conn)

    # Unreleased-zone exclusion runs here for two reasons. The spawn set must be
    # complete, because a monster is reachable where it spawns and inference adds
    # the altar and placeholder spawns above. Item sources are not denormalized
    # yet, so nothing has copied a reference to removed content into another
    # table. Running it earlier judges reachability on a partial spawn set, and
    # running it later leaves those copies behind.
    # Read the numeric key of every zone before the closure deletes rows. A
    # removed zone cannot be looked up afterwards, and the verification needs
    # the number to check the columns written in the numeric zone space.
    zone_numbers = {
        row[0]: row[1] for row in conn.execute("SELECT id, zone_id FROM zones")
    }
    removals = closure.run(conn, redactions)

    # Monster level ranges (from spawns, needed before item sources)
    monsters.run_levels(conn)

    # Quest display_type (needed before item usages reads it)
    quests.run_display_type(conn)

    # Recipe materials enrichment (add item_name before consumers read materials)
    recipes.run_materials(conn)

    # Item denormalizations (reads monster drops for item_sources_monster)
    items.run_all(conn, redactions)

    # Skill denormalizations
    skills.run_all(conn)

    # Experience calculations (pre-compute EXP values)
    experience.run_all(conn)

    # NPC denormalizations (quest/item/skill names, quests_completed_here, role bitmasks)
    npcs.run_all(conn)

    # Zone bounds (computed from all entity positions for map rendering)
    zones.run_all(conn)

    # Crafting source levels (needs item sources + zone medians)
    crafting_source_level.run(conn)

    # Canonical item source summaries (needs recipe source levels)
    source_entries.run(conn)

    # Quest denormalizations (tooltips)
    quests.run_tooltips(conn)

    # Search keywords for FTS5 indexing
    search.run_all(conn)

    return verify.Subject(
        identifiers={removal.entity_id for removal in removals},
        zone_numbers={
            zone_numbers[removal.entity_id]
            for removal in removals
            if removal.table == "zones" and removal.entity_id in zone_numbers
        },
        allowances=redactions.allowances,
    )
