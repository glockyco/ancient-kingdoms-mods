using BossMod.Core.Catalog;
using BossMod.Core.Persistence;

namespace BossMod.Ui.Settings;

public sealed class SkillOverridePatch
{
    public ThreatTier? UserThreat { get; set; }
    public AbilityDisplayPolicy? CastBarVisibility { get; set; }
    public AbilityDisplayPolicy? BossAbilityVisibility { get; set; }
    public bool ClearUserThreat { get; set; }
    public bool ClearCastBarVisibility { get; set; }
    public bool ClearBossAbilityVisibility { get; set; }
}

public sealed class GlobalPatch
{
    public float? ProximityRadius { get; set; }
    public float? UiScale { get; set; }
    public int? MaxCastBars { get; set; }
    public BossAbilityDensity? BossAbilitiesDensity { get; set; }
    public bool? ShowCastBarWindow { get; set; }
    public bool? ShowBossAbilitiesWindow { get; set; }
    public bool? ConfigMode { get; set; }
    public int? CriticalDamage { get; set; }
    public int? HighDamage { get; set; }
    public int? AuraDpsHigh { get; set; }
    public float? CriticalCastTime { get; set; }
}

public interface ISettingsMutator
{
    bool SetSkillOverride(string skillId, SkillOverridePatch patch);
    bool SetBossSkillOverride(string bossId, string skillId, SkillOverridePatch patch);
    bool SetGlobal(GlobalPatch patch);
    bool ApplyLoadedStateInPlace(SkillCatalog loadedCatalog, Globals loadedGlobals);
    bool ResetUserSettingsToDefaults();
}
