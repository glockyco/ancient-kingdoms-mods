"""Count where a removed quest meets published content.

A quest that the redaction removes takes its own rows with it: the NPCs that
offer and complete it, the items it asks for and the standing it requires. The
NPC, item and faction stay published, and their pages would lose the quest
without a trace. Before the closure deletes the quest, these counts go into
`redacted_quest_npcs`, `redacted_quest_items` and `redacted_quest_factions`,
so the pages can show redacted quests without naming any. A count whose NPC,
item or faction is removed too goes in the closure's reference scrub, like any
row that refers to removed content.
"""

import sqlite3


def record(conn: sqlite3.Connection, removed: set[tuple[str, str]]) -> None:
    """Count the published relations of every removed quest."""
    quests = sorted(identity for table, identity in removed if table == "quests")
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
