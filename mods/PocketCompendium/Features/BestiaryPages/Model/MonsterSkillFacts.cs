#nullable disable
using System;
using System.Collections.Generic;
using PocketCompendium.Features.BestiaryPages.Skills;

namespace PocketCompendium.Features.BestiaryPages.Model;

internal sealed class SkillDeliveryInput
{
    public int skill_index { get; set; }
    public double cast_time { get; set; }
    public double cooldown { get; set; }
    public double cast_range { get; set; }
    public bool is_aura { get; set; }
    public double area_object_delay_damage { get; set; }
}

internal enum SkillShape { None, Target, AroundCaster, FrontalSquare, GroundZones }
internal enum SkillThreatKind
{
    Area, Frontal, Summon, Dispel, Stun, Fear, Knockback, UncleanseableDebuff, Heal, Enrage,
}

internal sealed class ControlEffect
{
    public SkillThreatKind Kind { get; }
    public double Chance { get; }
    public double MinimumDuration { get; }
    public double MaximumDuration { get; }
    public double Distance { get; }

    public ControlEffect(SkillThreatKind kind, double chance, double minimumDuration, double maximumDuration, double distance = 0)
    {
        Kind = kind;
        Chance = chance;
        MinimumDuration = minimumDuration;
        MaximumDuration = maximumDuration;
        Distance = distance;
    }
}

/// <summary>Skill data resolved at its runtime rank, without presentation labels.</summary>
internal sealed class MonsterSkillFacts
{
    public SkillEffectInput Effect { get; }
    public SkillDeliveryInput Delivery { get; }
    public SkillShape Shape { get; }
    public double Reach => Delivery.cast_range;
    public bool IsPassive => Effect.skill_type == "passive";
    public bool IsSpecial => Delivery.skill_index > 0 && !IsPassive && !Delivery.is_aura;
    public bool HasCastBar { get; }
    public bool ProjectileHoming { get; }
    public int RandomGroundZones { get; }
    public int TargetGroundZones { get; }
    public double GroundZoneDiameter { get; }
    public double GroundWarningSeconds { get; }
    public bool SummonsTarget { get; }
    public double SummonMinimumReach => SummonsTarget ? 3 : 0;
    public double SummonMaximumReach => SummonsTarget ? Reach : 0;
    public IReadOnlyList<ControlEffect> Controls { get; }
    public bool UncleanseableDebuff { get; }
    public bool Heals { get; }
    public double? HealBelowHealth { get; }
    public bool Enrages => IsPassive && Effect.is_enrage;
    public double? EnrageBelowHealth => Enrages ? 0.1 : null;
    public double? Damage { get; }

    public MonsterSkillFacts(SkillEffectInput effect, SkillDeliveryInput delivery)
    {
        Effect = effect;
        Delivery = delivery;
        Shape = IsPassive || delivery.is_aura ? SkillShape.None : effect.skill_type switch
        {
            "area_object_spawn" => SkillShape.GroundZones,
            "frontal_damage" or "frontal_projectiles" => SkillShape.FrontalSquare,
            "area_damage" or "area_debuff" or "area_heal" or "area_buff" => SkillShape.AroundCaster,
            "target_damage" or "target_debuff" or "target_heal" or "target_buff" or "target_projectile" or "summon_monsters" => SkillShape.Target,
            _ => SkillShape.None,
        };

        // Source: steam-26302989-532b02784df9/Monster.cs:1085-1108.
        // Slot 0 never gets a special cast bar. The strict threshold uses a Unity float.
        HasCastBar = IsSpecial && (float)delivery.cast_time > 0.3f;
        // Source: ProjectileSkillEffect.FixedUpdate follows Networktarget every frame.
        ProjectileHoming = effect.skill_type is "target_projectile" or "frontal_projectiles"
            || (effect.skill_type == "area_damage" && effect.area_projectile);
        if (Shape == SkillShape.GroundZones)
        {
            // Source: AreaObjectSpawnSkill.cs:35-47,159. Size is a diameter.
            RandomGroundZones = Math.Max(0, effect.area_objects_to_spawn ?? 0);
            TargetGroundZones = 1;
            GroundZoneDiameter = effect.area_object_size ?? 0;
            GroundWarningSeconds = delivery.area_object_delay_damage;
        }

        // Source: SummonSkillMonsters.cs:30-56. A zero summon count summons the target instead.
        SummonsTarget = effect.skill_type == "summon_monsters" && effect.summon_count_per_cast == 0;
        var controls = new List<ControlEffect>();
        if (SummonsTarget)
            controls.Add(new ControlEffect(SkillThreatKind.Stun, 1, 2, 2));
        else
        {
            var stun = Value(effect.stun_chance);
            var fear = Value(effect.fear_chance);
            if (stun > 0)
                controls.Add(new ControlEffect(SkillThreatKind.Stun, stun, Value(effect.stun_time), Value(effect.stun_time)));
            if (fear > 0)
                controls.Add(new ControlEffect(SkillThreatKind.Fear, fear, Value(effect.fear_time) / 2, Value(effect.fear_time)));
            // Area projectiles forward stun and fear, but not knockback.
            if (!(effect.skill_type == "area_damage" && effect.area_projectile) && Value(effect.knockback_chance) > 0)
                controls.Add(new ControlEffect(SkillThreatKind.Knockback, Value(effect.knockback_chance), 0, 0, effect.knockback_distance ?? 0));
        }
        Controls = controls;
        UncleanseableDebuff = effect.skill_type is "target_debuff" or "area_debuff" && effect.prob_ignore_cleanse >= 1;
        Heals = effect.skill_type is "target_heal" or "area_heal"
            ? Value(effect.heals_health) > 0 && !effect.is_balance_health
            : effect.skill_type is "target_buff" or "area_buff" &&
                (Value(effect.healing_per_second_bonus) > 0 || Value(effect.health_percent_per_second_bonus) > 0);
        // Source: MonsterSkills.cs:95-103 gates TargetHealSkill and regenerating TargetBuffSkill.
        if (Heals && effect.skill_type is "target_heal" or "target_buff")
            HealBelowHealth = 0.75;
        Damage = MonsterDamage.Amount(effect);
    }

    private static double Value(LinearValue value) => value?.base_value ?? 0;
}

internal sealed class SkillThreat
{
    public SkillThreatKind Kind { get; }
    public MonsterSkillFacts Skill { get; }
    public SkillThreat(SkillThreatKind kind, MonsterSkillFacts skill) { Kind = kind; Skill = skill; }
}

internal sealed class MonsterSkillSummary
{
    public IReadOnlyDictionary<string, double> DamageTypes { get; }
    public IReadOnlyList<SkillThreat> Threats { get; }

    public MonsterSkillSummary(IReadOnlyList<MonsterSkillFacts> skills)
    {
        var damageTypes = new Dictionary<string, double>();
        var threats = new List<SkillThreat>();
        foreach (var skill in skills)
        {
            var effect = skill.Effect;
            AddDamage(damageTypes, effect.damage_type, skill.Damage ?? 0);
            AddDamage(damageTypes, effect.damage_over_time_type, DamagePerSecond(effect));
            AddDamage(damageTypes, effect.damage_shield_type, effect.damage_shield?.base_value ?? 0);

            // The basic attack's small stun chances would put stuns on almost every monster.
            if (skill.Delivery.skill_index == 0) continue;
            if (skill.IsSpecial)
            {
                if (skill.Shape is SkillShape.AroundCaster or SkillShape.GroundZones && ((skill.Damage ?? 0) > 0 || DamagePerSecond(effect) > 0))
                    threats.Add(new SkillThreat(SkillThreatKind.Area, skill));
                if (skill.Shape == SkillShape.FrontalSquare)
                    threats.Add(new SkillThreat(SkillThreatKind.Frontal, skill));
                if (effect.is_dispel && effect.skill_type is "target_debuff" or "area_debuff")
                    threats.Add(new SkillThreat(SkillThreatKind.Dispel, skill));
            }
            if (skill.SummonsTarget) threats.Add(new SkillThreat(SkillThreatKind.Summon, skill));
            foreach (var control in skill.Controls) threats.Add(new SkillThreat(control.Kind, skill));
            if (skill.UncleanseableDebuff) threats.Add(new SkillThreat(SkillThreatKind.UncleanseableDebuff, skill));
            if (skill.Heals) threats.Add(new SkillThreat(SkillThreatKind.Heal, skill));
            if (skill.Enrages) threats.Add(new SkillThreat(SkillThreatKind.Enrage, skill));
        }
        DamageTypes = damageTypes;
        Threats = threats;
    }

    private static void AddDamage(Dictionary<string, double> types, string type, double amount)
    {
        if (string.IsNullOrEmpty(type) || amount <= 0) return;
        if (!types.TryGetValue(type, out var previous) || amount > previous)
            types[type] = amount;
    }

    // A debuff's damage over time is a negative health regeneration bonus.
    private static double DamagePerSecond(SkillEffectInput effect) =>
        effect.skill_type is "target_debuff" or "area_debuff" ? -(effect.healing_per_second_bonus?.base_value ?? 0) : 0;
}
