using System;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;

namespace BossMod.Ui.Settings;

public sealed class SettingsMutator : ISettingsMutator
{
    private readonly SkillCatalog _catalog;
    private readonly Globals _globals;

    public SettingsMutator(SkillCatalog catalog, Globals globals)
    {
        _catalog = catalog;
        _globals = globals;
    }

    public bool SetSkillOverride(string skillId, SkillOverridePatch patch)
    {
        if (!_catalog.Skills.TryGetValue(skillId, out var skill)) return false;

        bool changed = false;
        if (patch.ClearUserThreat) changed |= SetThreat(skill, null);
        else if (patch.UserThreat.HasValue) changed |= SetThreat(skill, patch.UserThreat.Value);

        if (patch.ClearSound) changed |= SetSound(skill, null);
        else if (patch.Sound != null) changed |= SetSound(skill, patch.Sound.Trim());

        if (patch.ClearAlertText) changed |= SetAlertText(skill, null);
        else if (patch.AlertText != null) changed |= SetAlertText(skill, patch.AlertText);

        if (patch.ClearFireOn) changed |= SetFireOn(skill, null);
        else if (patch.FireOn.HasValue) changed |= SetFireOn(skill, patch.FireOn.Value);

        if (patch.ClearAudioMuted) changed |= SetAudioMuted(skill, null);
        else if (patch.AudioMuted.HasValue) changed |= SetAudioMuted(skill, patch.AudioMuted.Value);

        return changed;
    }

    public bool SetBossSkillOverride(string bossId, string skillId, SkillOverridePatch patch)
    {
        if (!_catalog.Bosses.TryGetValue(bossId, out var boss)) return false;
        if (!boss.Skills.TryGetValue(skillId, out var bossSkill)) return false;

        bool changed = false;
        if (patch.ClearUserThreat) changed |= SetThreat(bossSkill, null);
        else if (patch.UserThreat.HasValue) changed |= SetThreat(bossSkill, patch.UserThreat.Value);

        if (patch.ClearSound) changed |= SetSound(bossSkill, null);
        else if (patch.Sound != null) changed |= SetSound(bossSkill, patch.Sound.Trim());

        if (patch.ClearAlertText) changed |= SetAlertText(bossSkill, null);
        else if (patch.AlertText != null) changed |= SetAlertText(bossSkill, patch.AlertText);

        if (patch.ClearFireOn) changed |= SetFireOn(bossSkill, null);
        else if (patch.FireOn.HasValue) changed |= SetFireOn(bossSkill, patch.FireOn.Value);

        if (patch.ClearAudioMuted) changed |= SetAudioMuted(bossSkill, null);
        else if (patch.AudioMuted.HasValue) changed |= SetAudioMuted(bossSkill, patch.AudioMuted.Value);

        return changed;
    }

    public bool SetGlobal(GlobalPatch patch)
    {
        _globals.Thresholds ??= new Thresholds();
        bool changed = false;

        if (patch.Muted.HasValue && _globals.Muted != patch.Muted.Value)
        {
            _globals.Muted = patch.Muted.Value;
            changed = true;
        }
        if (patch.MasterVolume.HasValue)
        {
            float value = Math.Clamp(patch.MasterVolume.Value, 0f, 1f);
            if (_globals.MasterVolume != value)
            {
                _globals.MasterVolume = value;
                changed = true;
            }
        }
        if (patch.AlertTextMuteOnMasterMute.HasValue && _globals.AlertTextMuteOnMasterMute != patch.AlertTextMuteOnMasterMute.Value)
        {
            _globals.AlertTextMuteOnMasterMute = patch.AlertTextMuteOnMasterMute.Value;
            changed = true;
        }
        if (patch.ProximityRadius.HasValue)
        {
            float value = Math.Max(1f, patch.ProximityRadius.Value);
            if (_globals.ProximityRadius != value)
            {
                _globals.ProximityRadius = value;
                changed = true;
            }
        }
        if (patch.UiScale.HasValue)
        {
            float value = Math.Clamp(patch.UiScale.Value, Theme.MinUiScale, Theme.MaxUiScale);
            if (_globals.UiScale != value)
            {
                _globals.UiScale = value;
                changed = true;
            }
        }
        if (patch.ExpansionDefault.HasValue && _globals.ExpansionDefault != patch.ExpansionDefault.Value)
        {
            _globals.ExpansionDefault = patch.ExpansionDefault.Value;
            changed = true;
        }
        if (patch.MaxCastBars.HasValue)
        {
            int value = Math.Max(1, patch.MaxCastBars.Value);
            if (_globals.MaxCastBars != value)
            {
                _globals.MaxCastBars = value;
                changed = true;
            }
        }
        if (patch.ShowCastBarWindow.HasValue && _globals.ShowCastBarWindow != patch.ShowCastBarWindow.Value)
        {
            _globals.ShowCastBarWindow = patch.ShowCastBarWindow.Value;
            changed = true;
        }
        if (patch.ShowCooldownWindow.HasValue && _globals.ShowCooldownWindow != patch.ShowCooldownWindow.Value)
        {
            _globals.ShowCooldownWindow = patch.ShowCooldownWindow.Value;
            changed = true;
        }
        if (patch.ShowBuffTrackerWindow.HasValue && _globals.ShowBuffTrackerWindow != patch.ShowBuffTrackerWindow.Value)
        {
            _globals.ShowBuffTrackerWindow = patch.ShowBuffTrackerWindow.Value;
            changed = true;
        }
        if (patch.ConfigMode.HasValue && _globals.ConfigMode != patch.ConfigMode.Value)
        {
            _globals.ConfigMode = patch.ConfigMode.Value;
            changed = true;
        }
        if (patch.CriticalDamage.HasValue)
        {
            int value = Math.Max(0, patch.CriticalDamage.Value);
            if (_globals.Thresholds.CriticalDamage != value)
            {
                _globals.Thresholds.CriticalDamage = value;
                changed = true;
            }
        }
        if (patch.HighDamage.HasValue)
        {
            int value = Math.Max(0, patch.HighDamage.Value);
            if (_globals.Thresholds.HighDamage != value)
            {
                _globals.Thresholds.HighDamage = value;
                changed = true;
            }
        }
        if (patch.AuraDpsHigh.HasValue)
        {
            int value = Math.Max(0, patch.AuraDpsHigh.Value);
            if (_globals.Thresholds.AuraDpsHigh != value)
            {
                _globals.Thresholds.AuraDpsHigh = value;
                changed = true;
            }
        }
        if (patch.CriticalCastTime.HasValue)
        {
            float value = Math.Max(0f, patch.CriticalCastTime.Value);
            if (_globals.Thresholds.CriticalCastTime != value)
            {
                _globals.Thresholds.CriticalCastTime = value;
                changed = true;
            }
        }

        return changed;
    }

    public bool ApplyLoadedStateInPlace(SkillCatalog loadedCatalog, Globals loadedGlobals) =>
        StateMutation.ApplyLoadedStateInPlace(_catalog, _globals, loadedCatalog, loadedGlobals);

    public bool ResetUserSettingsToDefaults() =>
        StateMutation.ResetUserSettingsToDefaults(_catalog, _globals);

    private static bool SetThreat(SkillRecord skill, ThreatTier? value)
    {
        if (skill.UserThreat == value) return false;
        skill.UserThreat = value;
        return true;
    }

    private static bool SetThreat(BossSkillRecord skill, ThreatTier? value)
    {
        if (skill.UserThreat == value) return false;
        skill.UserThreat = value;
        return true;
    }

    private static bool SetSound(SkillRecord skill, string value)
    {
        if (skill.Sound == value) return false;
        skill.Sound = value;
        return true;
    }

    private static bool SetSound(BossSkillRecord skill, string value)
    {
        if (skill.Sound == value) return false;
        skill.Sound = value;
        return true;
    }

    private static bool SetAlertText(SkillRecord skill, string value)
    {
        if (skill.AlertText == value) return false;
        skill.AlertText = value;
        return true;
    }

    private static bool SetAlertText(BossSkillRecord skill, string value)
    {
        if (skill.AlertText == value) return false;
        skill.AlertText = value;
        return true;
    }

    private static bool SetFireOn(SkillRecord skill, AlertTrigger? value)
    {
        if (skill.FireOn == value) return false;
        skill.FireOn = value;
        return true;
    }

    private static bool SetFireOn(BossSkillRecord skill, AlertTrigger? value)
    {
        if (skill.FireOn == value) return false;
        skill.FireOn = value;
        return true;
    }

    private static bool SetAudioMuted(SkillRecord skill, bool? value)
    {
        if (skill.AudioMuted == value) return false;
        skill.AudioMuted = value;
        return true;
    }

    private static bool SetAudioMuted(BossSkillRecord skill, bool? value)
    {
        if (skill.AudioMuted == value) return false;
        skill.AudioMuted = value;
        return true;
    }

    private static bool SetBool(ref bool target, bool value)
    {
        if (target == value) return false;
        target = value;
        return true;
    }

    private static bool SetInt(ref int target, int value)
    {
        if (target == value) return false;
        target = value;
        return true;
    }

    private static bool SetFloat(ref float target, float value)
    {
        if (target == value) return false;
        target = value;
        return true;
    }
}
