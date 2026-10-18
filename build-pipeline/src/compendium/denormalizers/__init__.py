"""Build public read models after canonical normalization and redaction."""

import sqlite3

from rich.console import Console

from compendium.denormalizers import (
    acquisition,
    altars,
    experience,
    items,
    monsters,
    npcs,
    quests,
    search,
    skills,
    zones,
)
from compendium.redactions import closure, crafting, geometry, semantics, verify
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

    # Enrich altar waves with monster boss/elite info (before altar data is read)
    altars.run_waves(conn)

    # Canonical process inputs and identified requirements must exist before
    # reachability removes any identity or scrubs a required target.
    acquisition.normalize(conn)
    experience.run_gathering(conn)
    # Apply field policies to canonical facts before closure. Running these
    # before normalization would recreate hidden variants or objective geometry.
    suppressed = geometry.run(conn, redactions)
    hidden_recipes = crafting.run(conn, redactions)

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

    # Snapshot the numeric zone space before removing unpublished identities.
    # Read the numeric key of every zone before the closure deletes rows. A
    # removed zone cannot be looked up afterwards, and the verification needs
    # the number to check the columns written in the numeric zone space.
    zone_numbers = {
        row[0]: row[1] for row in conn.execute("SELECT id, zone_id FROM zones")
    }
    removals = closure.run(conn, redactions)

    # Level metadata uses surviving configured placements.
    monsters.run_levels(conn)
    # Display labels retain the native quest objective behavior.
    quests.run_display_type(conn)

    # Display enrichments may only read the surviving canonical relations.
    items.run_all(conn)

    # Skill denormalizations
    skills.run_all(conn)

    # Experience calculations (pre-compute EXP values)
    experience.run_all(conn)

    # Retain NPC service flags and map role bitmasks.
    npcs.run_all(conn)

    # Zone bounds (computed from all entity positions for map rendering)
    zones.run_all(conn)

    # Rooting and complete-branch source hints have one pipeline authority.
    acquisition.derive(conn)
    semantics.rekey(conn)
    acquisition.validate(conn)
    semantics.validate_semantics(conn, redactions)

    # Quest denormalizations (tooltips)
    quests.run_tooltips(conn)

    # Search keywords, read by the website search index
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
