"""Count where removed quests and recipes meet published content.

A quest or recipe that the redaction removes takes its own rows with it. The
NPCs, items and factions it named stay published, and their pages would lose it
without a trace. Before the closure deletes the removed rows, these counts go
into `redacted_quest_npcs`, `redacted_quest_items`, `redacted_quest_factions`
and `redacted_recipe_items`, so the pages show redacted quests and recipes
without naming any. Every way to remove content leaves the same trace: a quest
named in the configuration, a recipe whose product carries `ignore_journal`,
and a recipe whose crafting the configuration hides (`crafting.py`). A count
whose own target is removed too goes in the closure's reference scrub, like any
row that refers to removed content.
"""

import sqlite3


def record(conn: sqlite3.Connection, removed: set[tuple[str, str]]) -> None:
    """Count the published relations of every removed quest and recipe."""
    _record_quests(
        conn, sorted(identity for table, identity in removed if table == "quests")
    )
    _record_recipes(
        conn,
        sorted(
            identity for table, identity in removed if table == "acquisition_methods"
        ),
    )


def _record_quests(conn: sqlite3.Connection, quests: list[str]) -> None:
    if not quests:
        return
    marks = ",".join("?" * len(quests))
    conn.execute(
        f"""INSERT INTO redacted_quest_npcs (npc_id, role, quests)
        SELECT npc_id, role, COUNT(DISTINCT quest_id) FROM npc_quest_memberships
        WHERE quest_id IN ({marks})
        GROUP BY npc_id, role""",
        quests,
    )
    # The uses an item page lists under Required for Quests.
    conn.execute(
        f"""INSERT INTO redacted_quest_items (item_id, quests)
        SELECT item_id, COUNT(DISTINCT quest_id) FROM (
            SELECT objective.quest_id, target.item_id FROM quest_objectives objective
            JOIN quest_objective_items target ON target.id = objective.id
            UNION ALL
            SELECT objective.quest_id, brew.item_id FROM quest_objectives objective
            JOIN quest_objective_brews brew ON brew.id = objective.id
            UNION ALL
            SELECT quest_id, item_id FROM quest_book_requirements
        )
        WHERE quest_id IN ({marks}) AND item_id IS NOT NULL
        GROUP BY item_id""",
        quests,
    )
    conn.execute(
        f"""INSERT INTO redacted_quest_factions (faction_id, quests)
        SELECT faction_id, COUNT(DISTINCT quest_id) FROM quest_faction_requirements
        WHERE quest_id IN ({marks}) AND faction_id IS NOT NULL
        GROUP BY faction_id""",
        quests,
    )


def _record_recipes(conn: sqlite3.Connection, methods: list[str]) -> None:
    if not methods:
        return
    marks = ",".join("?" * len(methods))
    # Hidden crafting may already have counted other recipes of the same items.
    conn.execute(
        f"""INSERT INTO redacted_recipe_items (item_id, role, recipes)
        SELECT item_id, role, COUNT(DISTINCT method_id) FROM (
            SELECT detail.id AS method_id, detail.declared_result_item_id AS item_id,
                'result' AS role
            FROM acquisition_recipe_details detail
            UNION ALL
            SELECT DISTINCT cost.method_id, input.item_id, 'material'
            FROM acquisition_cost_groups cost
            JOIN acquisition_inputs input ON input.cost_group_id = cost.id
            JOIN acquisition_recipe_details detail ON detail.id = cost.method_id
            WHERE input.item_id IS NOT NULL
        )
        WHERE method_id IN ({marks})
        GROUP BY item_id, role
        ON CONFLICT (item_id, role) DO UPDATE SET recipes = recipes + excluded.recipes""",
        methods,
    )
