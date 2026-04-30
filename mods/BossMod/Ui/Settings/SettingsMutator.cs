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

        if (patch.ClearCastBarVisibility) changed |= SetCastBarVisibility(skill, null);
        else if (patch.CastBarVisibility.HasValue) changed |= SetCastBarVisibility(skill, patch.CastBarVisibility.Value);

        if (patch.ClearBossAbilityVisibility) changed |= SetBossAbilityVisibility(skill, null);
        else if (patch.BossAbilityVisibility.HasValue) changed |= SetBossAbilityVisibility(skill, patch.BossAbilityVisibility.Value);

        return changed;
    }

    public bool SetBossSkillOverride(string bossId, string skillId, SkillOverridePatch patch)
    {
        if (!_catalog.Bosses.TryGetValue(bossId, out var boss)) return false;
        if (!boss.Skills.TryGetValue(skillId, out var bossSkill)) return false;

        bool changed = false;
        if (patch.ClearUserThreat) changed |= SetThreat(bossSkill, null);
        else if (patch.UserThreat.HasValue) changed |= SetThreat(bossSkill, patch.UserThreat.Value);

        if (patch.ClearCastBarVisibility) changed |= SetCastBarVisibility(bossSkill, null);
        else if (patch.CastBarVisibility.HasValue) changed |= SetCastBarVisibility(bossSkill, patch.CastBarVisibility.Value);

        if (patch.ClearBossAbilityVisibility) changed |= SetBossAbilityVisibility(bossSkill, null);
        else if (patch.BossAbilityVisibility.HasValue) changed |= SetBossAbilityVisibility(bossSkill, patch.BossAbilityVisibility.Value);

        return changed;
    }

    public bool SetGlobal(GlobalPatch patch)
    {
        _globals.Thresholds ??= new Thresholds();
        bool changed = false;

        if (patch.ProximityRadius.HasValue && float.IsFinite(patch.ProximityRadius.Value))
        {
            float value = Math.Max(1f, patch.ProximityRadius.Value);
            if (_globals.ProximityRadius != value)
            {
                _globals.ProximityRadius = value;
                changed = true;
            }
        }
        if (patch.UiScale.HasValue && float.IsFinite(patch.UiScale.Value))
        {
            float value = Math.Clamp(patch.UiScale.Value, Theme.MinUiScale, Theme.MaxUiScale);
            if (_globals.UiScale != value)
            {
                _globals.UiScale = value;
                changed = true;
            }
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
        if (patch.BossAbilitiesDensity.HasValue && _globals.BossAbilitiesDensity != patch.BossAbilitiesDensity.Value)
        {
            _globals.BossAbilitiesDensity = patch.BossAbilitiesDensity.Value;
            changed = true;
        }
        if (patch.ShowCastBarWindow.HasValue && _globals.ShowCastBarWindow != patch.ShowCastBarWindow.Value)
        {
            _globals.ShowCastBarWindow = patch.ShowCastBarWindow.Value;
            changed = true;
        }
        if (patch.ShowBossAbilitiesWindow.HasValue && _globals.ShowBossAbilitiesWindow != patch.ShowBossAbilitiesWindow.Value)
        {
            _globals.ShowBossAbilitiesWindow = patch.ShowBossAbilitiesWindow.Value;
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
        if (patch.CriticalCastTime.HasValue && float.IsFinite(patch.CriticalCastTime.Value))
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

    private static bool SetCastBarVisibility(SkillRecord skill, AbilityDisplayPolicy? value)
    {
        if (skill.CastBarVisibility == value) return false;
        skill.CastBarVisibility = value;
        return true;
    }

    private static bool SetCastBarVisibility(BossSkillRecord skill, AbilityDisplayPolicy? value)
    {
        if (skill.CastBarVisibility == value) return false;
        skill.CastBarVisibility = value;
        return true;
    }

    private static bool SetBossAbilityVisibility(SkillRecord skill, AbilityDisplayPolicy? value)
    {
        if (skill.BossAbilityVisibility == value) return false;
        skill.BossAbilityVisibility = value;
        return true;
    }

    private static bool SetBossAbilityVisibility(BossSkillRecord skill, AbilityDisplayPolicy? value)
    {
        if (skill.BossAbilityVisibility == value) return false;
        skill.BossAbilityVisibility = value;
        return true;
    }
}
