using Il2CppInterop.Runtime;
using Il2Cpp;

namespace DataExporter.Skills;

public static class SkillClassification
{
    // Source: server-scripts/DamageSkill.cs, BuffSkill.cs, SummonSkillMonsters.cs — these classes define the skill hierarchy.
    // Source: server-scripts/NecromancerBloodPactSkill.cs:Apply — Blood Pact derives from ScriptableSkill and converts the caster's Health into Mana.
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

        if (skill.TryCast<BuffSkill>() != null)
        {
            // Source: server-scripts/Skills.cs:BreaksPartyInvisibility — the game treats the two debuff classes, and a target buff that can buff enemies, as hostile.
            // The damage-type flags on a buff only choose the school of its damage over time or damage shield, as the resolvers below read them.
            if (skill.TryCast<TargetDebuffSkill>() != null) return "target_debuff";
            if (skill.TryCast<AreaDebuffSkill>() != null) return "area_debuff";
            var targetBuffSkill = skill.TryCast<TargetBuffSkill>();
            if (targetBuffSkill != null)
            {
                // Consumers read a buff type as the buff handler and a debuff type as the debuff handler. A target
                // buff that can buff enemies is hostile but runs the buff handler, so neither type describes it.
                if (targetBuffSkill.canBuffEnemies)
                    throw new System.InvalidOperationException(
                        $"Skill '{skill.name}' is a target buff that can buff enemies, which no skill type describes.");
                return "target_buff";
            }
            if (skill.TryCast<AreaBuffSkill>() != null) return "area_buff";
            if (skill.TryCast<BardSongSkill>() != null) return "area_buff";
            return "buff";
        }

        if (skill.TryCast<PassiveSkill>() != null) return "passive";
        if (skill.TryCast<SummonSkill>() != null) return "summon";
        if (skill.TryCast<SummonSkillMonsters>() != null) return "summon_monsters";
        if (skill.TryCast<MercenarySummonSkill>() != null) return "mercenary_summon";
        if (skill.TryCast<NecromancerBloodPactSkill>() != null) return "health_to_mana";

        // A skill class this switch does not know is new game content whose fields nothing exports.
        throw new System.InvalidOperationException(
            $"Skill '{skill.name}' has the unclassified type {skill.GetIl2CppType().FullName}.");
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

    // Source: server-scripts/Skills.cs:247-249 — negative healing or health-per-second values deal damage.
    private static bool HasNegative(LinearFloat value) => value.baseValue < 0f || value.bonusPerLevel < 0f;
    private static bool HasNegative(LinearInt value) => value.baseValue < 0 || value.bonusPerLevel < 0;
    // Source: server-scripts/Combat.cs:973-975 — only a positive damage shield is applied.
    private static bool HasPositive(LinearInt value) => value.baseValue > 0 || value.bonusPerLevel > 0;

    // Source: server-scripts/Skills.cs:814-843 — damage-over-time type uses this flag order and defaults to magic.
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

    // Source: server-scripts/Combat.cs:973-1001 — damage-shield mitigation uses melee before poison, fire, cold, disease, and magic.
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
