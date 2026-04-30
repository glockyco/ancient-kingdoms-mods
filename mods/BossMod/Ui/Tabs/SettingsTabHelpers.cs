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
        string currentLabel = current.HasValue ? current.Value.ToString() : "Inherit";
        if (ImGui.BeginCombo($"Importance##{idPrefix}_threat", currentLabel))
        {
            if (ImGui.Selectable("Inherit", !current.HasValue)) Apply(result, apply, new SkillOverridePatch { ClearUserThreat = true });
            for (int i = 0; i < ThreatValues.Length; i++)
            {
                var value = ThreatValues[i];
                if (ImGui.Selectable(value.ToString(), current == value)) Apply(result, apply, new SkillOverridePatch { UserThreat = value });
            }
            ImGui.EndCombo();
        }
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
        string currentLabel = current.HasValue ? current.Value.ToString() : "Inherit";
        if (ImGui.BeginCombo($"{label}##{idPrefix}_{label}", currentLabel))
        {
            if (ImGui.Selectable("Inherit", !current.HasValue)) Apply(result, apply, clearPatch());
            for (int i = 0; i < DisplayPolicyValues.Length; i++)
            {
                var value = DisplayPolicyValues[i];
                if (ImGui.Selectable(value.ToString(), current == value)) Apply(result, apply, setPatch(value));
            }
            ImGui.EndCombo();
        }
        ImGui.SameLine();
        SourceBadge($"resolved {resolved.Value} from {resolved.Source}");
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
