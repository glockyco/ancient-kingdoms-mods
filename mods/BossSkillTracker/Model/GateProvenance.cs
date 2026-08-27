namespace BossSkillTracker.Model;

/// <summary>
/// Where the gate figures come from. A local world runs its own server, so the deadline is exact.
/// A client of a remote server never receives it: MonsterSkills.nextSpecialCastTime,
/// Monster.startCombatTime and Monster.basicOnlySkillTimeEnd are plain server fields, while the
/// skill list, the aggro list and the entity state are synchronized.
/// </summary>
public enum GateProvenance
{
    /// <summary>Read from the server this process runs.</summary>
    Server,

    /// <summary>Derived from casts this client saw, so the bounds are the game's, not the monster's.</summary>
    Observed,
}
