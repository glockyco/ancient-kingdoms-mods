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

    private static readonly AlertTrigger[] TriggerValues =
    {
        AlertTrigger.CastStart,
        AlertTrigger.CastFinish,
        AlertTrigger.CooldownReady,
    };

    public static UiRenderResult RenderOverrides(
        string idPrefix,
        SkillRecord skill,
        BossSkillRecord bossSkill,
        TierDefaults defaults,
        bool editingBossOverride,
        Func<SkillOverridePatch, bool> apply)
    {
        var result = new UiRenderResult();
        RenderThreat(idPrefix, skill, bossSkill, editingBossOverride, apply, result);
        RenderSound(idPrefix, skill, bossSkill, defaults, editingBossOverride, apply, result);
        RenderAlertText(idPrefix, skill, bossSkill, editingBossOverride, apply, result);
        RenderFireOn(idPrefix, skill, bossSkill, editingBossOverride, apply, result);
        RenderAudioMuted(idPrefix, skill, bossSkill, editingBossOverride, apply, result);
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
        if (ImGui.BeginCombo($"Threat##{idPrefix}_threat", currentLabel))
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

    private static void RenderSound(
        string idPrefix,
        SkillRecord skill,
        BossSkillRecord bossSkill,
        TierDefaults defaults,
        bool editingBossOverride,
        Func<SkillOverridePatch, bool> apply,
        UiRenderResult result)
    {
        var resolved = SettingsResolver.ResolveSoundWithSource(skill, bossSkill, defaults);
        string sound = editingBossOverride ? bossSkill.Sound : skill.Sound;
        sound ??= "";
        if (ImGui.InputText($"Sound##{idPrefix}_sound", ref sound, 128)) Apply(result, apply, new SkillOverridePatch { Sound = sound });
        ImGui.SameLine();
        if (ImGui.Button($"Inherit##{idPrefix}_sound_inherit")) Apply(result, apply, new SkillOverridePatch { ClearSound = true });
        ImGui.SameLine();
        SourceBadge($"resolved {resolved.Value} from {resolved.Source}");
    }

    private static void RenderAlertText(
        string idPrefix,
        SkillRecord skill,
        BossSkillRecord bossSkill,
        bool editingBossOverride,
        Func<SkillOverridePatch, bool> apply,
        UiRenderResult result)
    {
        var resolved = SettingsResolver.ResolveAlertTextWithSource(skill, bossSkill, skill.DisplayName);
        string text = editingBossOverride ? bossSkill.AlertText : skill.AlertText;
        text ??= "";
        if (ImGui.InputText($"Alert text##{idPrefix}_alert_text", ref text, 256)) Apply(result, apply, new SkillOverridePatch { AlertText = text });
        ImGui.SameLine();
        if (ImGui.Button($"Inherit##{idPrefix}_alert_inherit")) Apply(result, apply, new SkillOverridePatch { ClearAlertText = true });
        ImGui.SameLine();
        SourceBadge(resolved.Value.Length == 0
            ? $"resolved <disabled> from {resolved.Source}"
            : $"resolved {resolved.Value} from {resolved.Source}");
    }

    private static void RenderFireOn(
        string idPrefix,
        SkillRecord skill,
        BossSkillRecord bossSkill,
        bool editingBossOverride,
        Func<SkillOverridePatch, bool> apply,
        UiRenderResult result)
    {
        var resolved = SettingsResolver.ResolveFireOnWithSource(skill, bossSkill);
        AlertTrigger? current = editingBossOverride ? bossSkill.FireOn : skill.FireOn;
        string currentLabel = current.HasValue ? current.Value.ToString() : "Inherit";
        if (ImGui.BeginCombo($"Fire on##{idPrefix}_fire_on", currentLabel))
        {
            if (ImGui.Selectable("Inherit", !current.HasValue)) Apply(result, apply, new SkillOverridePatch { ClearFireOn = true });
            for (int i = 0; i < TriggerValues.Length; i++)
            {
                var value = TriggerValues[i];
                if (ImGui.Selectable(value.ToString(), current == value)) Apply(result, apply, new SkillOverridePatch { FireOn = value });
            }
            ImGui.EndCombo();
        }
        ImGui.SameLine();
        SourceBadge($"resolved {resolved.Value} from {resolved.Source}");
    }

    private static void RenderAudioMuted(
        string idPrefix,
        SkillRecord skill,
        BossSkillRecord bossSkill,
        bool editingBossOverride,
        Func<SkillOverridePatch, bool> apply,
        UiRenderResult result)
    {
        var resolved = SettingsResolver.ResolveAudioMutedWithSource(skill, bossSkill);
        bool? current = editingBossOverride ? bossSkill.AudioMuted : skill.AudioMuted;
        string currentLabel = current.HasValue ? (current.Value ? "Muted" : "Not muted") : "Inherit";
        if (ImGui.BeginCombo($"Audio muted##{idPrefix}_audio_muted", currentLabel))
        {
            if (ImGui.Selectable("Inherit", !current.HasValue)) Apply(result, apply, new SkillOverridePatch { ClearAudioMuted = true });
            if (ImGui.Selectable("Not muted", current == false)) Apply(result, apply, new SkillOverridePatch { AudioMuted = false });
            if (ImGui.Selectable("Muted", current == true)) Apply(result, apply, new SkillOverridePatch { AudioMuted = true });
            ImGui.EndCombo();
        }
        ImGui.SameLine();
        SourceBadge($"resolved {(resolved.Value ? "muted" : "not muted")} from {resolved.Source}");
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
