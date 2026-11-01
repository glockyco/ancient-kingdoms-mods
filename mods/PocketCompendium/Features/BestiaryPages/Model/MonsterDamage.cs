#nullable disable
using System;
using PocketCompendium.Features.BestiaryPages.Skills;

namespace PocketCompendium.Features.BestiaryPages.Model;

internal sealed class MonsterDamageContext
{
    public double damage { get; set; }
    public double magicDamage { get; set; }
}

internal static class MonsterDamage
{
    /// <summary>Damage before mitigation, randomness and the target's level adjustment.</summary>
    public static double? Amount(SkillEffectInput skill)
    {
        // Zero listed damage and zero scaling do not turn a control skill into an attack.
        if (!HasValue(skill.damage) && !HasValue(skill.damage_percent))
            return null;

        var monster = skill.monster ?? throw new InvalidOperationException("Monster damage needs the caster's combat stats.");
        var total = skill.damage?.base_value ?? 0;
        if (skill.monster_damage_terms != null)
        {
            foreach (var term in skill.monster_damage_terms)
                total += term switch
                {
                    "attack_power" => monster.damage,
                    "spell_power" => monster.magicDamage,
                    _ => throw new InvalidOperationException($"Monsters have no {term} damage term"),
                };
        }

        // Source: TargetDamageSkill.ApplyDamage, AreaDamageSkill.Apply and
        // FrontalProjectilesSkill.Apply. Unity multiplies floats and rounds ties to even.
        var multiplier = skill.damage_percent?.base_value ?? 0;
        return skill.skill_type != "frontal_projectiles" && multiplier > 0
            ? Math.Round((float)total * (float)multiplier, MidpointRounding.ToEven)
            : total;
    }

    private static bool HasValue(LinearValue value) =>
        value != null && (value.base_value != 0 || value.bonus_per_level != 0);
}
