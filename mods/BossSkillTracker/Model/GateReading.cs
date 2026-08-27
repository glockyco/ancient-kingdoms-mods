namespace BossSkillTracker.Model;

/// <summary>
/// What this process can see of a monster's special-cast gate, in server-corrected time.
/// </summary>
public readonly struct GateReading
{
    public readonly GateProvenance Provenance;

    /// <summary>MonsterSkills.nextSpecialCastTime: no special starts before it. Server only.</summary>
    public readonly double NextSpecialCastTime;

    /// <summary>Monster.startCombatTime: the warmup window runs from here. Server only.</summary>
    public readonly double StartCombatTime;

    /// <summary>Monster.basicOnlySkillTimeEnd: only basic attacks until it passes. Server only.</summary>
    public readonly double BasicOnlySkillTimeEnd;

    /// <summary>End of the special being cast now, or zero. Synchronized, so both provenances have it.</summary>
    public readonly double SpecialCastEnd;

    /// <summary>
    /// One basic attack cycle: its cast, its cooldown and the refractory hold. A monster only
    /// selects a skill between cycles, so a gate that opens mid-cycle is served this much late.
    /// </summary>
    public readonly double BasicCycleSeconds;

    private GateReading(GateProvenance provenance, double nextSpecialCastTime, double startCombatTime, double basicOnlySkillTimeEnd, double specialCastEnd, double basicCycleSeconds)
    {
        Provenance = provenance;
        NextSpecialCastTime = nextSpecialCastTime;
        StartCombatTime = startCombatTime;
        BasicOnlySkillTimeEnd = basicOnlySkillTimeEnd;
        SpecialCastEnd = specialCastEnd;
        BasicCycleSeconds = basicCycleSeconds;
    }

    public static GateReading FromServer(double nextSpecialCastTime, double startCombatTime, double basicOnlySkillTimeEnd, double specialCastEnd, double basicCycleSeconds)
        => new(GateProvenance.Server, nextSpecialCastTime, startCombatTime, basicOnlySkillTimeEnd, specialCastEnd, basicCycleSeconds);

    public static GateReading FromObservation(double specialCastEnd, double basicCycleSeconds)
        => new(GateProvenance.Observed, 0, 0, 0, specialCastEnd, basicCycleSeconds);
}
