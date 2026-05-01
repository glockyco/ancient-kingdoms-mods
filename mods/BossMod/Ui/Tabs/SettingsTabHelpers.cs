using System;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using BossMod.Ui.Settings;
using ImGuiNET;

namespace BossMod.Ui.Tabs;

internal static class SettingsTabHelpers
{
    private static readonly ThreatTier[] ThreatValues =
    {
        ThreatTier.Low,
        ThreatTier.Medium,
        ThreatTier.High,
        ThreatTier.Critical,
    };

    private static readonly AbilityDisplayPolicy[] DisplayPolicyValues =
    {
        AbilityDisplayPolicy.Auto,
        AbilityDisplayPolicy.Always,
        AbilityDisplayPolicy.Hidden,
    };

    public static UiRenderResult RenderOverrides(
        string idPrefix,
        SkillRecord skill,
        BossSkillRecord bossSkill,
        bool editingBossOverride,
        Func<SkillOverridePatch, bool> apply)
    {
        var result = new UiRenderResult();
        RenderThreat(idPrefix, skill, bossSkill, editingBossOverride, apply, result);
        RenderDisplayPolicy(
            idPrefix,
            "Cast bars",
            SettingsResolver.ResolveCastBarVisibilityWithSource(skill, bossSkill),
            editingBossOverride ? bossSkill.CastBarVisibility : skill.CastBarVisibility,
            policy => new SkillOverridePatch { CastBarVisibility = policy },
            () => new SkillOverridePatch { ClearCastBarVisibility = true },
            apply,
            result);
        RenderDisplayPolicy(
            idPrefix,
            "Boss abilities",
            SettingsResolver.ResolveBossAbilityVisibilityWithSource(skill, bossSkill),
            editingBossOverride ? bossSkill.BossAbilityVisibility : skill.BossAbilityVisibility,
            policy => new SkillOverridePatch { BossAbilityVisibility = policy },
            () => new SkillOverridePatch { ClearBossAbilityVisibility = true },
            apply,
            result);
        return result;
    }

    public static UiRenderResult RenderSkillDefaults(
        string idPrefix,
        SkillRecord skill,
        Func<SkillOverridePatch, bool> apply)
    {
        var result = new UiRenderResult();
        RenderThreatCombo(
            $"Importance##{idPrefix}_threat",
            skill.UserThreat,
            value => new SkillOverridePatch { UserThreat = value },
            () => new SkillOverridePatch { ClearUserThreat = true },
            apply,
            result);
        RenderDisplayPolicyCombo(
            $"Cast bars##{idPrefix}_cast_bars",
            skill.CastBarVisibility,
            value => new SkillOverridePatch { CastBarVisibility = value },
            () => new SkillOverridePatch { ClearCastBarVisibility = true },
            apply,
            result);
        RenderDisplayPolicyCombo(
            $"Boss abilities##{idPrefix}_boss_abilities",
            skill.BossAbilityVisibility,
            value => new SkillOverridePatch { BossAbilityVisibility = value },
            () => new SkillOverridePatch { ClearBossAbilityVisibility = true },
            apply,
            result);
        return result;
    }

    public static void RenderBossThreatCell(
        string idPrefix,
        SkillRecord skill,
        BossSkillRecord bossSkill,
        Func<SkillOverridePatch, bool> apply,
        UiRenderResult result)
    {
        RenderThreatCombo(
            $"##{idPrefix}_importance",
            bossSkill.UserThreat,
            value => new SkillOverridePatch { UserThreat = value },
            () => new SkillOverridePatch { ClearUserThreat = true },
            apply,
            result);
        var resolved = SettingsResolver.ResolveThreatWithSource(skill, bossSkill);
        SourceBadge($"resolved {resolved.Value} from {resolved.Source}");
    }

    public static void RenderBossCastBarsCell(
        string idPrefix,
        SkillRecord skill,
        BossSkillRecord bossSkill,
        Func<SkillOverridePatch, bool> apply,
        UiRenderResult result)
    {
        RenderDisplayPolicyCombo(
            $"##{idPrefix}_cast_bars",
            bossSkill.CastBarVisibility,
            value => new SkillOverridePatch { CastBarVisibility = value },
            () => new SkillOverridePatch { ClearCastBarVisibility = true },
            apply,
            result);
        var resolved = SettingsResolver.ResolveCastBarVisibilityWithSource(skill, bossSkill);
        SourceBadge($"resolved {resolved.Value} from {resolved.Source}");
    }

    public static void RenderBossAbilitiesCell(
        string idPrefix,
        SkillRecord skill,
        BossSkillRecord bossSkill,
        Func<SkillOverridePatch, bool> apply,
        UiRenderResult result)
    {
        RenderDisplayPolicyCombo(
            $"##{idPrefix}_boss_abilities",
            bossSkill.BossAbilityVisibility,
            value => new SkillOverridePatch { BossAbilityVisibility = value },
            () => new SkillOverridePatch { ClearBossAbilityVisibility = true },
            apply,
            result);
        var resolved = SettingsResolver.ResolveBossAbilityVisibilityWithSource(skill, bossSkill);
        SourceBadge($"resolved {resolved.Value} from {resolved.Source}");
    }

    private static void RenderThreat(
        string idPrefix,
        SkillRecord skill,
        BossSkillRecord bossSkill,
        bool editingBossOverride,
        Func<SkillOverridePatch, bool> apply,
        UiRenderResult result)
    {
        var resolved = SettingsResolver.ResolveThreatWithSource(skill, bossSkill);
        ThreatTier? current = editingBossOverride ? bossSkill.UserThreat : skill.UserThreat;
        RenderThreatCombo(
            $"Importance##{idPrefix}_threat",
            current,
            value => new SkillOverridePatch { UserThreat = value },
            () => new SkillOverridePatch { ClearUserThreat = true },
            apply,
            result);
        ImGui.SameLine();
        SourceBadge($"resolved {resolved.Value} from {resolved.Source}");
    }

    private static void RenderDisplayPolicy(
        string idPrefix,
        string label,
        ResolvedSetting<AbilityDisplayPolicy> resolved,
        AbilityDisplayPolicy? current,
        Func<AbilityDisplayPolicy, SkillOverridePatch> setPatch,
        Func<SkillOverridePatch> clearPatch,
        Func<SkillOverridePatch, bool> apply,
        UiRenderResult result)
    {
        RenderDisplayPolicyCombo($"{label}##{idPrefix}_{label}", current, setPatch, clearPatch, apply, result);
        ImGui.SameLine();
        SourceBadge($"resolved {resolved.Value} from {resolved.Source}");
    }

    private static void RenderThreatCombo(
        string label,
        ThreatTier? current,
        Func<ThreatTier, SkillOverridePatch> setPatch,
        Func<SkillOverridePatch> clearPatch,
        Func<SkillOverridePatch, bool> apply,
        UiRenderResult result)
    {
        string currentLabel = current.HasValue ? current.Value.ToString() : "Inherit";
        ImGui.SetNextItemWidth(-1f);
        if (!ImGui.BeginCombo(label, currentLabel)) return;

        if (ImGui.Selectable("Inherit", !current.HasValue)) Apply(result, apply, clearPatch());
        for (int i = 0; i < ThreatValues.Length; i++)
        {
            var value = ThreatValues[i];
            if (ImGui.Selectable(value.ToString(), current == value)) Apply(result, apply, setPatch(value));
        }
        ImGui.EndCombo();
    }

    private static void RenderDisplayPolicyCombo(
        string label,
        AbilityDisplayPolicy? current,
        Func<AbilityDisplayPolicy, SkillOverridePatch> setPatch,
        Func<SkillOverridePatch> clearPatch,
        Func<SkillOverridePatch, bool> apply,
        UiRenderResult result)
    {
        string currentLabel = current.HasValue ? current.Value.ToString() : "Inherit";
        ImGui.SetNextItemWidth(-1f);
        if (!ImGui.BeginCombo(label, currentLabel)) return;

        if (ImGui.Selectable("Inherit", !current.HasValue)) Apply(result, apply, clearPatch());
        for (int i = 0; i < DisplayPolicyValues.Length; i++)
        {
            var value = DisplayPolicyValues[i];
            if (ImGui.Selectable(value.ToString(), current == value)) Apply(result, apply, setPatch(value));
        }
        ImGui.EndCombo();
    }

    private static void Apply(UiRenderResult result, Func<SkillOverridePatch, bool> apply, SkillOverridePatch patch)
    {
        if (apply(patch)) result.Dirty = true;
    }

    private static void SourceBadge(string text)
    {
        ImGui.TextDisabled(text);
    }
}
