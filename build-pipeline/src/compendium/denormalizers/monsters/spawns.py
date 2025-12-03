"""Monster spawn denormalizations - inferred spawn entries.

This module creates spawn entries for monsters that don't have direct spawns
but can appear in the world through other mechanics:

- Placeholder spawns: When monster A dies, it can spawn monster B at the same
  location (e.g., Large Shade Beast -> Keeper Remnant)
- Altar wave spawns: Monsters that spawn during altar events
"""

import json
import sqlite3

from rich.console import Console

console = Console()


def _infer_placeholder_spawns(conn: sqlite3.Connection) -> int:
    """Create spawn entries for placeholder monsters.

    When a monster has placeholder_monster_id set, killing it spawns that
    placeholder monster at the same position. This creates spawn entries
    for those placeholder monsters based on their parent's spawn locations.

    Returns:
        Count of spawn entries created
    """
    console.print("  Inferring placeholder monster spawns...")
    cursor = conn.cursor()

    # Find all placeholder relationships where the placeholder has no spawns
    cursor.execute("""
        SELECT
            pm.id as placeholder_id,
            pm.name as placeholder_name,
            parent.id as parent_id,
            parent.name as parent_name,
            parent.placeholder_spawn_probability as spawn_probability
        FROM monsters parent
        JOIN monsters pm ON pm.id = parent.placeholder_monster_id
        WHERE pm.id NOT IN (SELECT DISTINCT monster_id FROM monster_spawns)
    """)

    placeholder_monsters = cursor.fetchall()

    if not placeholder_monsters:
        console.print("    No placeholder monsters need spawn inference")
        return 0

    spawns_created = 0

    for row in placeholder_monsters:
        placeholder_id = row[0]
        placeholder_name = row[1]
        parent_id = row[2]
        parent_name = row[3]
        spawn_probability = row[4] or 1.0

        # Get all spawn locations of the parent monster
        cursor.execute(
            """
            SELECT zone_id, sub_zone_id, position_x, position_y, position_z
            FROM monster_spawns
            WHERE monster_id = ?
        """,
            (parent_id,),
        )

        parent_spawns = cursor.fetchall()

        for zone_id, sub_zone_id, pos_x, pos_y, pos_z in parent_spawns:
            spawn_id = f"{placeholder_id}_{zone_id}_from_{parent_id}"

            cursor.execute(
                """
                INSERT INTO monster_spawns (
                    id, monster_id, zone_id, sub_zone_id,
                    position_x, position_y, position_z,
                    move_probability, move_distance, is_patrolling, patrol_waypoints,
                    spawn_type, source_monster_id, source_monster_name, source_spawn_probability
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, '[]', 'placeholder', ?, ?, ?)
            """,
                (
                    spawn_id,
                    placeholder_id,
                    zone_id,
                    sub_zone_id,
                    pos_x,
                    pos_y,
                    pos_z,
                    parent_id,
                    parent_name,
                    spawn_probability,
                ),
            )

            spawns_created += 1

        console.print(
            f"    {placeholder_name} <- {parent_name}: {len(parent_spawns)} spawn(s)"
        )

    return spawns_created


def _infer_altar_spawns(conn: sqlite3.Connection) -> int:
    """Create spawn entries for all altar wave monsters.

    Creates spawn entries for monsters that appear during altar wave events,
    regardless of whether they also have regular world spawns.

    Returns:
        Count of spawn entries created
    """
    console.print("  Inferring altar wave monster spawns...")
    cursor = conn.cursor()

    # Get all altars with their wave data
    cursor.execute("""
        SELECT id, name, zone_id, sub_zone_id, waves,
               required_activation_item_id, required_activation_item_name
        FROM altars
        WHERE waves IS NOT NULL
    """)

    altars = cursor.fetchall()
    spawns_created = 0
    monsters_processed = set()

    for (
        altar_id,
        altar_name,
        zone_id,
        sub_zone_id,
        waves_json,
        activation_item_id,
        activation_item_name,
    ) in altars:
        if not waves_json:
            continue

        waves = json.loads(waves_json)

        for wave in waves:
            wave_number = wave.get("wave_number", 0)
            monsters = wave.get("monsters", [])

            for monster_data in monsters:
                monster_id = monster_data.get("monster_id")
                if not monster_id:
                    continue

                spawn_location = monster_data.get("spawn_location", {})
                pos_x = spawn_location.get("x", 0)
                pos_y = spawn_location.get("y", 0)
                pos_z = spawn_location.get("z", 0)

                # Get base_level from wave data (this is the wave-configured level,
                # not the monster's canonical level)
                base_level = monster_data.get("base_level")

                # Create unique spawn ID
                spawn_id = f"{monster_id}_{altar_id}_wave{wave_number}_{int(pos_x)}_{int(pos_y)}"

                # Check if we already created this spawn
                cursor.execute("SELECT 1 FROM monster_spawns WHERE id = ?", (spawn_id,))
                if cursor.fetchone():
                    continue

                cursor.execute(
                    """
                    INSERT INTO monster_spawns (
                        id, monster_id, zone_id, sub_zone_id,
                        position_x, position_y, position_z, level,
                        move_probability, move_distance, is_patrolling, patrol_waypoints,
                        spawn_type, source_altar_id, source_altar_name, source_altar_wave,
                        source_altar_activation_item_id, source_altar_activation_item_name
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, '[]', 'altar', ?, ?, ?, ?, ?)
                """,
                    (
                        spawn_id,
                        monster_id,
                        zone_id,
                        sub_zone_id,
                        pos_x,
                        pos_y,
                        pos_z,
                        base_level,
                        altar_id,
                        altar_name,
                        wave_number,
                        activation_item_id,
                        activation_item_name,
                    ),
                )

                spawns_created += 1
                monsters_processed.add(monster_id)

    if monsters_processed:
        console.print(
            f"    Created spawns for {len(monsters_processed)} altar wave monsters"
        )
    else:
        console.print("    No altar wave monsters found")

    return spawns_created


def _annotate_summon_spawns(conn: sqlite3.Connection) -> int:
    """Annotate existing spawns for summoned monsters.

    Monsters that are summoned by killing other monsters have existing spawns
    (they're placed in the world but dormant). This updates those spawns to
    mark them as summon type with kill requirements.

    Returns:
        Count of spawns annotated
    """
    console.print("  Annotating summon trigger spawns...")
    cursor = conn.cursor()

    # Get summon triggers with their kill requirements
    cursor.execute("""
        SELECT
            st.id as trigger_id,
            st.summoned_entity_id as monster_id,
            st.summon_message,
            m.id as kill_monster_id,
            m.name as kill_monster_name,
            COUNT(*) as kill_count
        FROM summon_triggers st
        JOIN summon_trigger_placeholders stp ON stp.trigger_id = st.id
        JOIN monster_spawns ms ON ms.id = stp.spawn_id
        JOIN monsters m ON m.id = ms.monster_id
        WHERE st.summoned_entity_type = 'Monster'
        GROUP BY st.id, m.id
    """)

    triggers = cursor.fetchall()
    spawns_annotated = 0

    for (
        trigger_id,
        monster_id,
        summon_message,
        kill_monster_id,
        kill_monster_name,
        kill_count,
    ) in triggers:
        # Update all spawns for this monster to mark them as summon type
        cursor.execute(
            """
            UPDATE monster_spawns
            SET spawn_type = 'summon',
                source_summon_trigger_id = ?,
                source_summon_kill_monster_id = ?,
                source_summon_kill_monster_name = ?,
                source_summon_kill_count = ?,
                source_summon_message = ?
            WHERE monster_id = ? AND spawn_type = 'regular'
        """,
            (
                trigger_id,
                kill_monster_id,
                kill_monster_name,
                kill_count,
                summon_message,
                monster_id,
            ),
        )

        if cursor.rowcount > 0:
            spawns_annotated += cursor.rowcount
            console.print(f"    {kill_count}x {kill_monster_name} -> summoned monster")

    return spawns_annotated


def run(conn: sqlite3.Connection) -> None:
    """Run all monster spawn denormalizations.

    Creates inferred spawn entries for monsters that appear through
    indirect mechanics (placeholder spawns, altar waves, etc.)
    """
    console.print("Inferring monster spawn entries...")

    placeholder_count = _infer_placeholder_spawns(conn)
    altar_count = _infer_altar_spawns(conn)
    summon_count = _annotate_summon_spawns(conn)

    conn.commit()

    total = placeholder_count + altar_count
    console.print(f"  [green]OK[/green] Created {total} inferred spawn entries")
    console.print(f"      - {placeholder_count} placeholder spawns")
    console.print(f"      - {altar_count} altar wave spawns")
    console.print(f"  [green]OK[/green] Annotated {summon_count} summon trigger spawns")
