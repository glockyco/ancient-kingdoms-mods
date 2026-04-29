namespace BossMod.Core.Catalog;

/// <summary>
/// Raw values harvested from a ScriptableSkill at a given level.
/// Caster-independent; same for any boss using this skill.
/// </summary>
public sealed class SkillSnapshot
{
    public string SkillClass { get; set; } = "";
    public bool IsSpell { get; set; }
    public bool IsAura { get; set; }

    public float CastTime { get; set; }
    public float Cooldown { get; set; }
    public float CastRange { get; set; }

    public int RawDamage { get; set; }
    public int RawMagicDamage { get; set; }
    public float DamagePercent { get; set; }
    public DamageType DamageType { get; set; }

    public float? AoeRadius { get; set; }
    public float? AoeDelay { get; set; }

    public DebuffKind Debuffs { get; set; }
    public float StunChance { get; set; }
    public float StunTime { get; set; }
    public float FearChance { get; set; }
    public float FearTime { get; set; }
}
