using Il2CppInterop.Runtime;
using Il2Cpp;

namespace DataExporter.Skills;

public static class SkillClassification
{
    // Source: server-scripts/DamageSkill.cs, BuffSkill.cs, SummonSkillMonsters.cs — these classes define the skill hierarchy.
    public static string DetermineSkillType(ScriptableSkill skill)
    {
        if (skill.TryCast<DamageSkill>() != null)
        {
            if (skill.TryCast<AreaObjectSpawnSkill>() != null) return "area_object_spawn";
            if (skill.TryCast<AreaDamageSkill>() != null) return "area_damage";
            if (skill.TryCast<FrontalDamageSkill>() != null) return "frontal_damage";
            if (skill.TryCast<FrontalProjectilesSkill>() != null) return "frontal_projectiles";
            if (skill.TryCast<TargetDamageSkill>() != null) return "target_damage";
            if (skill.TryCast<TargetProjectileSkill>() != null) return "target_projectile";
            if (skill.TryCast<BardFinalCadenceSkill>() != null) return "area_damage";
            return "damage";
        }

        if (skill.TryCast<HealSkill>() != null)
        {
            if (skill.TryCast<AreaHealSkill>() != null) return "area_heal";
            if (skill.TryCast<TargetHealSkill>() != null) return "target_heal";
            return "heal";
        }

        var buffSkill = skill.TryCast<BuffSkill>();
        if (buffSkill != null)
        {
            var isDebuff = buffSkill.isPoisonDebuff || buffSkill.isFireDebuff ||
                           buffSkill.isColdDebuff || buffSkill.isDiseaseDebuff ||
                           buffSkill.isMeleeDebuff || buffSkill.isMagicDebuff;

            if (skill.TryCast<AreaBuffSkill>() != null) return isDebuff ? "area_debuff" : "area_buff";
            if (skill.TryCast<AreaDebuffSkill>() != null) return "area_debuff";
            if (skill.TryCast<TargetBuffSkill>() != null) return isDebuff ? "target_debuff" : "target_buff";
            if (skill.TryCast<TargetDebuffSkill>() != null) return "target_debuff";
            if (skill.TryCast<BardSongSkill>() != null) return "area_buff";
            return isDebuff ? "debuff" : "buff";
        }

        if (skill.TryCast<PassiveSkill>() != null) return "passive";
        if (skill.TryCast<SummonSkill>() != null) return "summon";
        if (skill.TryCast<SummonSkillMonsters>() != null) return "summon_monsters";

        return "unknown";
    }

    // Source: server-scripts/DamageType.cs:1-9 — Normal is the physical damage type.
    public static string ExportDamageType(DamageType damageType) => damageType switch
    {
        DamageType.Normal => "Physical",
        DamageType.Magic => "Magic",
        DamageType.Poison => "Poison",
        DamageType.Fire => "Fire",
        DamageType.Cold => "Cold",
        DamageType.Disease => "Disease",
        _ => "Unknown",
    };

    // Source: server-scripts/Skills.cs:229-231 — negative healing or health-per-second values deal damage.
    private static bool HasNegative(LinearFloat value) => value.baseValue < 0f || value.bonusPerLevel < 0f;
    private static bool HasNegative(LinearInt value) => value.baseValue < 0 || value.bonusPerLevel < 0;
    // Source: server-scripts/Combat.cs:913-915 — only a positive damage shield is applied.
    private static bool HasPositive(LinearInt value) => value.baseValue > 0 || value.bonusPerLevel > 0;

    // Source: server-scripts/Skills.cs:796-825 — damage-over-time type uses this flag order and defaults to magic.
    public static string ResolveDamageOverTimeType(BuffSkill buffSkill)
    {
        if (!HasNegative(buffSkill.healingPerSecondBonus) &&
            !HasNegative(buffSkill.healthPercentPerSecondBonus))
            return null;

        if (buffSkill.isPoisonDebuff) return "Poison";
        if (buffSkill.isFireDebuff) return "Fire";
        if (buffSkill.isColdDebuff) return "Cold";
        if (buffSkill.isDiseaseDebuff) return "Disease";
        if (buffSkill.isMeleeDebuff) return "Physical";
        return "Magic";
    }

    // Source: server-scripts/Combat.cs:913-941 — damage-shield mitigation uses melee before poison, fire, cold, disease, and magic.
    public static string ResolveDamageShieldType(BuffSkill buffSkill)
    {
        if (!HasPositive(buffSkill.damageShield))
            return null;

        if (buffSkill.isMeleeDebuff) return "Physical";
        if (buffSkill.isPoisonDebuff) return "Poison";
        if (buffSkill.isFireDebuff) return "Fire";
        if (buffSkill.isColdDebuff) return "Cold";
        if (buffSkill.isDiseaseDebuff) return "Disease";
        if (buffSkill.isMagicDebuff) return "Magic";
        return "Unknown";
    }
}
