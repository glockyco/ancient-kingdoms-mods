namespace BossSkillTracker.Model;

/// <summary>
/// The server-side deadlines that decide when a monster may start a special skill, in
/// server-corrected time. This build hosts its own server, so these are read values.
/// </summary>
public readonly struct GateReading
{
    /// <summary>MonsterSkills.nextSpecialCastTime: no special starts before it.</summary>
    public readonly double NextSpecialCastTime;

    /// <summary>Monster.startCombatTime: the warmup window runs from here.</summary>
    public readonly double StartCombatTime;

    /// <summary>Monster.basicOnlySkillTimeEnd: only basic attacks until it passes.</summary>
    public readonly double BasicOnlySkillTimeEnd;

    /// <summary>
    /// One basic attack cycle: its cast, its cooldown and the refractory hold. A monster only
    /// selects a skill between cycles, so a deadline that opens mid-cycle is served this much late.
    /// </summary>
    public readonly double BasicCycleSeconds;

    public GateReading(double nextSpecialCastTime, double startCombatTime, double basicOnlySkillTimeEnd, double basicCycleSeconds)
    {
        NextSpecialCastTime = nextSpecialCastTime;
        StartCombatTime = startCombatTime;
        BasicOnlySkillTimeEnd = basicOnlySkillTimeEnd;
        BasicCycleSeconds = basicCycleSeconds;
    }
}
