using System;

namespace BossMod.Core.Catalog;

/// <summary>
/// Effective values for a specific (boss, skill) pair. Includes the caster's
/// damage bonuses, haste, etc. — i.e., what *this* boss would actually do.
/// </summary>
public sealed class BossSkillSnapshot
{
    public int OutgoingDamage { get; set; }
    public int OutgoingDamageMin { get; set; }
    public int OutgoingDamageMax { get; set; }

    public int AuraDpsApprox { get; set; }

    public float CastTimeEffective { get; set; }
    public float CooldownEffective { get; set; }

    public DateTime ComputedAtUtc { get; set; }
}
