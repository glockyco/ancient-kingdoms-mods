"""Load the Chambers of Chaos definition, its rule tables and its private challenge records.

The export holds the item identities the run consumes and rewards. Those items are
excluded from publication, so the public tables never name them. They go to private
acquisition staging, where normalization turns them into methods that redaction can
withhold, and the staging table is dropped before publication.

Every reference and every rule domain is checked here, so a missing monster, a gap in
a table or an input the tables do not cover fails composition instead of being
answered from the nearest row.
"""

import json
import sqlite3
from collections.abc import Iterable
from pathlib import Path

from rich.console import Console

from compendium.models import (
    ChambersExportData,
    ChambersRewardBandData,
    ChambersRulesData,
)

console = Console()

EXPORT_NAME = "chambers_of_chaos.json"


def _fail(message: str) -> ValueError:
    return ValueError(f"{EXPORT_NAME}: {message}")


def _exact(name: str, actual: Iterable[int], expected: Iterable[int]) -> None:
    actual_list, expected_set = list(actual), set(expected)
    if len(actual_list) != len(set(actual_list)):
        raise _fail(f"{name} holds duplicates")
    if set(actual_list) != expected_set:
        missing = sorted(expected_set - set(actual_list))
        unexpected = sorted(set(actual_list) - expected_set)
        raise _fail(
            f"{name} is not the declared domain; missing={missing}, unexpected={unexpected}"
        )


def _band(
    bands: list[ChambersRewardBandData], level: int, veteran: int
) -> list[ChambersRewardBandData]:
    return [
        band
        for band in bands
        if band.minimum_level <= level
        and (band.maximum_level is None or level <= band.maximum_level)
        and band.minimum_veteran_points <= veteran
        and (
            band.maximum_veteran_points is None
            or veteran <= band.maximum_veteran_points
        )
    ]


def validate_rules(
    rules: ChambersRulesData, max_level: int, max_veteran_points: int
) -> None:
    """Check that the rule tables cover exactly the domains the game's progression gives."""
    levels = range(rules.minimum_level, max_level + 1)
    veteran = range(max_veteran_points + 1)
    _exact("player_levels", rules.player_levels, levels)
    _exact("veteran_points", rules.veteran_points, veteran)
    _exact("room_indices", rules.room_indices, range(rules.room_count))
    if rules.enemy_levels != sorted(rules.enemy_levels) or len(rules.enemy_levels) < 2:
        raise _fail("enemy_levels must be an ascending list")
    enemy = range(rules.enemy_levels[0], rules.enemy_levels[-1] + 1)
    _exact("enemy_levels", rules.enemy_levels, enemy)

    chances = {row.level for row in rules.seal_drop_chances}
    if len(chances) != len(rules.seal_drop_chances):
        raise _fail("seal_drop_chances holds duplicate levels")
    _exact("seal_drop_levels", rules.seal_drop_levels, range(1, max(chances) + 1))
    _exact("seal_drop_chances levels", chances, rules.seal_drop_levels)
    _exact(
        "completion_experience levels",
        [row.level for row in rules.completion_experience],
        range(1, max_level + 1),
    )
    _exact(
        "maximum_enemy_level_bonus veteran_points",
        [row.veteran_points for row in rules.maximum_enemy_level_bonus],
        veteran,
    )

    scaling_keys = {
        (row.enemy_level, row.veteran_points, row.room_index, row.guardian)
        for row in rules.scaling
    }
    if len(scaling_keys) != len(rules.scaling):
        raise _fail("scaling holds duplicate inputs")
    expected_keys = {
        (level, points, room, guardian)
        for level in enemy
        for points in veteran
        for room in range(rules.room_count)
        for guardian in (False, True)
    }
    if scaling_keys != expected_keys:
        raise _fail(
            "scaling does not cover every enemy level, veteran total, room and "
            f"guardian variant; missing={len(expected_keys - scaling_keys)}, "
            f"unexpected={len(scaling_keys - expected_keys)}"
        )

    for level in levels:
        for points in veteran:
            matching = _band(rules.reward_bands, level, points)
            if len(matching) != 1:
                raise _fail(
                    f"{len(matching)} reward bands cover level {level} with "
                    f"{points} veteran points"
                )

    offsets = {row.offset: row for row in rules.enemy_level_offsets}
    if len(offsets) != len(rules.enemy_level_offsets):
        raise _fail("enemy_level_offsets holds duplicate offsets")
    bonus = {row.veteran_points: row.bonus for row in rules.maximum_enemy_level_bonus}
    for guardian in (False, True):
        allowed = {
            offset
            for offset, row in offsets.items()
            if (row.guardian if guardian else row.ordinary)
        }
        for points in veteran:
            lowest = min(allowed)
            wanted = set(range(lowest, bonus[points] + 1))
            if not wanted <= allowed:
                raise _fail(
                    "enemy_level_offsets lack offsets "
                    f"{sorted(wanted - allowed)} for {points} veteran points"
                )
            for level in levels:
                reachable = {level + offset for offset in wanted}
                if not reachable <= set(enemy):
                    raise _fail(
                        f"enemy level {sorted(reachable - set(enemy))} is outside "
                        "enemy_levels"
                    )
    if rules.final_trial in rules.trial_bag:
        raise _fail("the final trial is drawn from the bag")

    for probe in rules.random_probes:
        if probe.player_level < rules.minimum_level:
            if probe.reward != 0:
                raise _fail("a probe below the minimum level rewards something")
        else:
            matching = _band(
                rules.reward_bands, probe.player_level, probe.veteran_points
            )
            if len(matching) != 1 or not (
                matching[0].minimum_quantity
                <= probe.reward
                <= matching[0].maximum_quantity
            ):
                raise _fail(f"probe reward {probe.reward} is outside its reward band")
        offset = probe.enemy_level - probe.player_level
        row = offsets.get(offset)
        if (
            row is None
            or not (row.guardian if probe.guardian else row.ordinary)
            or (probe.veteran_points in bonus and offset > bonus[probe.veteran_points])
        ):
            raise _fail(f"probe enemy level offset {offset} is not a game outcome")
    for trial in rules.trial_probes:
        if (
            len(trial.trials) != rules.room_count
            or trial.trials[-1] != rules.final_trial
            or not set(trial.trials[:-1]) <= set(rules.trial_bag)
        ):
            raise _fail(f"trial probe {trial.seed} is not a valid sequence")


def _require_ids(
    conn: sqlite3.Connection, table: str, ids: Iterable[str], what: str
) -> None:
    for identity in ids:
        if (
            conn.execute(f"SELECT 1 FROM {table} WHERE id=?", (identity,)).fetchone()
            is None
        ):
            raise _fail(f"{what} {identity!r} is not in {table}")


def validate_references(conn: sqlite3.Connection, export: ChambersExportData) -> None:
    _require_ids(conn, "zones", [export.zone_id], "zone")
    _require_ids(conn, "npcs", [export.keeper_npc_id], "keeper")
    _require_ids(conn, "items", [export.seal_item_id, export.reward_item_id], "item")
    if len(set(export.monster_pool)) != len(export.monster_pool):
        raise _fail("monster_pool holds duplicates")
    _require_ids(conn, "monsters", export.monster_pool, "pool monster")
    groups = [group.id for group in export.encounter_groups]
    if len(set(groups)) != len(groups):
        raise _fail("encounter_groups holds duplicate ids")
    pool = set(export.monster_pool)
    for group in export.encounter_groups:
        members = [group.guards_monster_id]
        if group.support_monster_id is not None:
            members.append(group.support_monster_id)
        _require_ids(conn, "monsters", members, f"encounter group {group.id} member")
        outside = [member for member in members if member not in pool]
        if outside:
            raise _fail(f"encounter group {group.id} uses {outside}, outside the pool")
    roles = conn.execute(
        "SELECT json_extract(roles, '$.is_chambers_of_chaos_keeper') FROM npcs WHERE id=?",
        (export.keeper_npc_id,),
    ).fetchone()
    if not roles or roles[0] != 1:
        raise _fail(f"keeper {export.keeper_npc_id!r} lacks the Chambers keeper role")
    for table, identities in (
        ("chambers_riddles", [row.id for row in export.riddles]),
        ("chambers_rune_puzzles", [row.id for row in export.rune_puzzles]),
    ):
        if len(set(identities)) != len(identities):
            raise _fail(f"{table} holds duplicate ids")


def load_chambers(conn: sqlite3.Connection, export_dir: Path) -> None:
    """Load the definition, rule tables and private challenge records."""
    console.print("Loading Chambers of Chaos...")
    path = export_dir / EXPORT_NAME
    if not path.is_file():
        raise FileNotFoundError(
            f"Required input is missing: {path}. Run the DataExporter mod in the game."
        )
    export = ChambersExportData.model_validate_json(path.read_text(encoding="utf-8"))
    progression = conn.execute(
        "SELECT max_level, max_veteran_points FROM progression_rules"
    ).fetchone()
    if progression is None:
        raise _fail("progression rules are required to check the rule domains")
    validate_references(conn, export)
    rules = export.rules
    validate_rules(rules, progression[0], progression[1])

    definition = export.id
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO chambers_definitions (id, zone_id, keeper_npc_id, room_count, "
        "run_duration_seconds, minimum_level, wave_count, maximum_hunt_targets, "
        "maximum_clear_targets, puzzle_penalty_guards, combat_experience_multiplier, "
        "final_trial) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (
            definition,
            export.zone_id,
            export.keeper_npc_id,
            rules.room_count,
            rules.run_duration_seconds,
            rules.minimum_level,
            rules.wave_count,
            rules.maximum_hunt_targets,
            rules.maximum_clear_targets,
            rules.puzzle_penalty_guards,
            rules.combat_experience_multiplier,
            rules.final_trial,
        ),
    )
    cursor.executemany(
        "INSERT INTO chambers_pool_monsters (id, definition_id, ordinal, monster_id) "
        "VALUES (?,?,?,?)",
        [
            (f"{definition}:{monster}", definition, ordinal, monster)
            for ordinal, monster in enumerate(export.monster_pool)
        ],
    )
    cursor.executemany(
        "INSERT INTO chambers_encounter_groups (id, definition_id, ordinal, name, "
        "guards_monster_id, support_monster_id) VALUES (?,?,?,?,?,?)",
        [
            (
                group.id,
                definition,
                ordinal,
                group.name,
                group.guards_monster_id,
                group.support_monster_id,
            )
            for ordinal, group in enumerate(export.encounter_groups)
        ],
    )
    cursor.executemany(
        "INSERT INTO chambers_trial_bag (definition_id, ordinal, trial_kind) VALUES (?,?,?)",
        [(definition, ordinal, kind) for ordinal, kind in enumerate(rules.trial_bag)],
    )
    for domain, values in (
        ("player_level", rules.player_levels),
        ("veteran_points", rules.veteran_points),
        ("enemy_level", rules.enemy_levels),
        ("room_index", rules.room_indices),
        ("entry_item_drop_level", rules.seal_drop_levels),
    ):
        cursor.executemany(
            "INSERT INTO chambers_rule_domains (definition_id, domain, value) VALUES (?,?,?)",
            [(definition, domain, value) for value in values],
        )
    cursor.executemany(
        "INSERT INTO chambers_entry_item_chances (definition_id, level, chance) VALUES (?,?,?)",
        [(definition, row.level, row.chance) for row in rules.seal_drop_chances],
    )
    cursor.executemany(
        "INSERT INTO chambers_completion_experience (definition_id, level, experience) "
        "VALUES (?,?,?)",
        [
            (definition, row.level, row.experience)
            for row in rules.completion_experience
        ],
    )
    cursor.executemany(
        "INSERT INTO chambers_veteran_level_bonuses (definition_id, veteran_points, bonus) "
        "VALUES (?,?,?)",
        [
            (definition, row.veteran_points, row.bonus)
            for row in rules.maximum_enemy_level_bonus
        ],
    )
    cursor.executemany(
        "INSERT INTO chambers_enemy_level_offsets (definition_id, level_offset, weight, "
        "ordinary, guardian) VALUES (?,?,?,?,?)",
        [
            (definition, row.offset, row.weight, int(row.ordinary), int(row.guardian))
            for row in rules.enemy_level_offsets
        ],
    )
    cursor.executemany(
        "INSERT INTO chambers_scaling (definition_id, enemy_level, veteran_points, "
        "room_index, guardian, health, power) VALUES (?,?,?,?,?,?,?)",
        [
            (
                definition,
                row.enemy_level,
                row.veteran_points,
                row.room_index,
                int(row.guardian),
                row.health,
                row.power,
            )
            for row in rules.scaling
        ],
    )
    cursor.executemany(
        "INSERT INTO chambers_reward_bands (definition_id, ordinal, minimum_level, "
        "maximum_level, minimum_veteran_points, maximum_veteran_points, "
        "minimum_quantity, maximum_quantity, distribution) VALUES (?,?,?,?,?,?,?,?,?)",
        [
            (
                definition,
                ordinal,
                band.minimum_level,
                band.maximum_level,
                band.minimum_veteran_points,
                band.maximum_veteran_points,
                band.minimum_quantity,
                band.maximum_quantity,
                band.distribution,
            )
            for ordinal, band in enumerate(rules.reward_bands)
        ],
    )
    cursor.executemany(
        "INSERT INTO chambers_riddles (id, definition_id, source_index, question, "
        "choices, correct_answer_index) VALUES (?,?,?,?,?,?)",
        [
            (
                row.id,
                definition,
                row.source_index,
                row.question,
                json.dumps(row.choices),
                row.correct_answer_index,
            )
            for row in export.riddles
        ],
    )
    cursor.executemany(
        "INSERT INTO chambers_rune_puzzles (id, definition_id, source_id, title, clue, "
        "rune_words, solution_order) VALUES (?,?,?,?,?,?,?)",
        [
            (
                row.id,
                definition,
                row.source_id,
                row.title,
                row.clue,
                json.dumps(row.rune_words),
                json.dumps(row.solution_order),
            )
            for row in export.rune_puzzles
        ],
    )
    # The private staging keeps what the public tables must not name.
    cursor.execute(
        "INSERT INTO _acquisition_input_chambers (id, payload) VALUES (?,?)",
        (
            definition,
            json.dumps(
                {
                    "id": definition,
                    "seal_item_id": export.seal_item_id,
                    "reward_item_id": export.reward_item_id,
                    "minimum_level": rules.minimum_level,
                    "seal_drop_chances": [
                        {"level": row.level, "chance": row.chance}
                        for row in rules.seal_drop_chances
                    ],
                    "reward_bands": [
                        band.model_dump(mode="json") for band in rules.reward_bands
                    ],
                }
            ),
        ),
    )
    conn.commit()
    console.print(
        f"  [green]OK[/green] Loaded {definition}: {len(export.monster_pool)} monsters, "
        f"{len(export.encounter_groups)} groups, {len(rules.scaling)} scaling rows"
    )
