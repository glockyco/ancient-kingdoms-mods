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

    /// <summary>The item that starts the altar event, for altar spawns.</summary>
    public ScriptableItem AltarItem { get; }

    public Resolution State { get; internal set; }

    /// <summary>Summon placeholders, or the monster whose death spawns this one. Empty for none.</summary>
    internal Monster[] Guards { get; }

    /// <summary>A running altar or placeholder spawn of this monster.</summary>
    internal Monster Live { get; set; }

    // What the host saw at its last refresh, to notice kills and failed rolls.
    internal bool WasAlive { get; set; }
    internal bool WasDead { get; set; }
    internal double LastDeadline { get; set; }
    internal bool RollFailed { get; set; }
    internal double? KilledAt { get; set; }
}
