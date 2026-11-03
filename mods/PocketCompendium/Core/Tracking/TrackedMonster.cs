using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core.Game;
using UnityEngine;

namespace PocketCompendium.Core.Tracking;

/// <summary>One boss, elite or fabled monster from the Bestiary, where it spawns, and its latest state.</summary>
public sealed class TrackedMonster
{
    internal TrackedMonster(int index, Monster definition, Monster placed, Tier tier, SpawnRules rules, int zone, Vector2 where, Monster[] guards, ScriptableItem altarItem)
    {
        Index = index;
        Key = definition.name;
        Definition = definition;
        Placed = placed;
        Tier = tier;
        Level = definition.level.current;
        Rules = rules;
        Zone = zone;
        Where = where;
        Guards = guards;
        AltarItem = altarItem;
    }

    /// <summary>The canonical name, which is also the GameObject name and the Bestiary's key.</summary>
    public string Key { get; }

    /// <summary>The position in the Bestiary.</summary>
    public int Index { get; }

    /// <summary>The Bestiary's prefab.</summary>
    public Monster Definition { get; }

    /// <summary>The placement in the world. Null for altar and placeholder spawns.</summary>
    public Monster Placed { get; }

    public Tier Tier { get; }
    public int Level { get; }
    public SpawnRules Rules { get; }

    /// <summary>
    /// The zone of the placement, the altar or the monster whose death spawns it, from the scene
    /// hierarchy. <c>Monster.idZone</c> is wrong for six elites.
    /// </summary>
    public int Zone { get; }

    /// <summary>The spawn point, the altar, or the monster whose death spawns it.</summary>
    public Vector2 Where { get; }

    /// <summary>
    /// Where the monster is now: a monster that is up and that the game shows nearby may have left
    /// its spawn point, so this follows it. Otherwise <see cref="Where"/>.
    /// </summary>
    public Vector2 Position
    {
        get
        {
            if (!State.IsUp) return Where;
            var live = Placed != null ? Placed : Live;
            return live != null && live.gameObject.activeInHierarchy ? live.transform.position : Where;
        }
    }

    /// <summary>The item that starts the altar event, for altar spawns.</summary>
    public ScriptableItem AltarItem { get; }

    public TrackedState State { get; internal set; }

    /// <summary>Summon placeholders, or the monster whose death spawns this one. Empty for none.</summary>
    internal Monster[] Guards { get; }

    /// <summary>A running altar or placeholder spawn of this monster.</summary>
    internal Monster Live { get; private set; }

    // Altar and placeholder spawns of this monster that the game started and has not destroyed.
    private readonly List<Monster> _spawns = new();

    internal void AddSpawn(Monster spawn)
    {
        if (!_spawns.Contains(spawn)) _spawns.Add(spawn);
    }

    /// <summary>
    /// Picks the spawn the tracker reads: the last living one in the scene, otherwise the first one
    /// in the scene. Spawns the game destroyed are dropped.
    /// </summary>
    internal void PickLive()
    {
        Live = null;
        for (int index = _spawns.Count - 1; index >= 0; index--)
            if (_spawns[index] == null) _spawns.RemoveAt(index);

        foreach (var spawn in _spawns)
        {
            if (!spawn.gameObject.activeInHierarchy) continue;
            if (Live == null || spawn.health.current > 0) Live = spawn;
        }
    }

    // What the host saw at its last refresh, to notice kills and failed rolls.
    internal bool WasAlive { get; set; }
    internal bool WasDead { get; set; }
    internal double LastDeadline { get; set; }
    internal bool RollFailed { get; set; }
    internal double? KilledAt { get; set; }
}
