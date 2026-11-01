using System;

namespace PocketCompendium.Core.Tracking;

/// <summary>Where a tracked monster comes from.</summary>
public enum SpawnOrigin
{
    /// <summary>Placed in the world, respawning on a timer.</summary>
    Placed,

    /// <summary>Spawned only by an altar event.</summary>
    Altar,

    /// <summary>Spawned when another monster dies, such as Keeper Remnant after Large Shade Beast.</summary>
    Placeholder,
}

/// <summary>
/// The spawn rules of one tracked monster, read once from its scene or prefab data. No game
/// references, so the test project compiles this file directly.
/// </summary>
public sealed class SpawnRules
{
    public SpawnRules(SpawnOrigin origin, double respawnSeconds, double corpseSeconds, float chance, int windowStart, int windowEnd, bool summoned)
    {
        Origin = origin;
        RespawnSeconds = respawnSeconds;
        CorpseSeconds = corpseSeconds;
        Chance = chance;
        WindowStart = windowStart;
        WindowEnd = windowEnd;
        Summoned = summoned;
    }

    public SpawnOrigin Origin { get; }

    /// <summary>The wait after the corpse disappears, <c>Monster.respawnTime</c>.</summary>
    public double RespawnSeconds { get; }

    /// <summary>How long the corpse stays, <c>Monster.deathTime</c>.</summary>
    public double CorpseSeconds { get; }

    /// <summary>The chance that each respawn succeeds, 1 for a certain spawn.</summary>
    public float Chance { get; }

    /// <summary>The game hour the spawn window opens. 0 together with <see cref="WindowEnd"/> means no window.</summary>
    public int WindowStart { get; }

    /// <summary>The game hour the spawn window closes.</summary>
    public int WindowEnd { get; }

    /// <summary>Whether the monster spawns only after a fresh kill of all its guards.</summary>
    public bool Summoned { get; }

    public bool Rolls => Chance < 1f;

    /// <summary>The chance of each spawn in whole percent, as the surfaces write it, or null for a certain spawn.</summary>
    public int? ChancePercent => Rolls ? (int)Math.Round(Chance * 100f) : null;

    public bool HasWindow => WindowStart != 0 || WindowEnd != 0;

    /// <summary>A window across midnight is a night window. The surfaces show it with a moon.</summary>
    public bool NightWindow => WindowStart > WindowEnd;

    /// <summary>The interval from a kill to the respawn: corpse time, then respawn time.</summary>
    public double KillToRespawnSeconds => CorpseSeconds + RespawnSeconds;
}
