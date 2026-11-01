namespace PocketCompendium.Core.Tracking;

/// <summary>The one named state of a tracked monster, from the respawn-tracking spec.</summary>
public enum SpawnState
{
    /// <summary>Alive and spawned.</summary>
    Up,

    /// <summary>Alive and fighting someone.</summary>
    InCombat,

    /// <summary>Dead, with the exact respawn time.</summary>
    Respawns,

    /// <summary>Dead, with a respawn time estimated from a death the player saw or a kill notice.</summary>
    Estimated,

    /// <summary>Dead, and its next spawn is a roll below 100%.</summary>
    Chance,

    /// <summary>Its time has passed, so it spawns, or rolls, the next time the game checks.</summary>
    Due,

    /// <summary>Outside its time-of-day window.</summary>
    Window,

    /// <summary>Waiting for a fresh kill of all its guards.</summary>
    Guards,

    /// <summary>Spawns only from an altar event.</summary>
    Altar,

    /// <summary>Seen up, now out of sight.</summary>
    Seen,

    /// <summary>Never seen on this server.</summary>
    NotSeen,
}

/// <summary>Where a state comes from.</summary>
public enum StateSource
{
    None,

    /// <summary>Read from the world this process hosts.</summary>
    Host,

    /// <summary>Sent by a host that runs Pocket Compendium.</summary>
    Shared,

    /// <summary>A death the player saw happen.</summary>
    SeenDeath,

    /// <summary>A corpse the player found, so the death happened up to one corpse time earlier.</summary>
    SeenCorpse,

    /// <summary>The kill notice a dedicated server sends for every boss.</summary>
    KillNotice,

    /// <summary>The monster seen alive.</summary>
    Sighting,

    /// <summary>A remembered death whose timer the player ended by renewing its dungeon.</summary>
    Renewal,
}

/// <summary>A tracked monster's state with the facts the surfaces show. All times are server times.</summary>
public readonly struct TrackedState
{
    public SpawnState State { get; init; }

    /// <summary>The moment the countdown runs to: the respawn, the roll or the window's opening.</summary>
    public double? At { get; init; }

    /// <summary>Whether <see cref="At"/> is an estimate, shown with a leading <c>~</c>.</summary>
    public bool Estimate { get; init; }

    public StateSource Source { get; init; }

    /// <summary>When the death, kill notice or sighting behind the state happened, if known.</summary>
    public double? ObservedAt { get; init; }

    /// <summary>The guards still alive, or -1 when they are out of sight.</summary>
    public int GuardsLeft { get; init; }

    public int GuardsTotal { get; init; }

    /// <summary>Whether the last chance roll failed, observed on a host.</summary>
    public bool LastRollFailed { get; init; }

    /// <summary>
    /// The zone has been empty since the world started, so the monster spawns dead when someone
    /// enters and its first roll comes one respawn time later.
    /// </summary>
    public bool WaitsForEntry { get; init; }

    public bool IsUp => State is SpawnState.Up or SpawnState.InCombat;
}
