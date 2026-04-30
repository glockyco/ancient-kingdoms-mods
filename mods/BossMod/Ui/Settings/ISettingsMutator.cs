using BossMod.Core.Catalog;
using BossMod.Core.Persistence;

namespace BossMod.Ui.Settings;

public sealed class SkillOverridePatch
{
    public ThreatTier? UserThreat { get; set; }
    public string Sound { get; set; }
    public string AlertText { get; set; }
    public AlertTrigger? FireOn { get; set; }
    public bool? AudioMuted { get; set; }
    public bool ClearUserThreat { get; set; }
    public bool ClearSound { get; set; }
    public bool ClearAlertText { get; set; }
    public bool ClearFireOn { get; set; }
    public bool ClearAudioMuted { get; set; }
}

public sealed class GlobalPatch
{
    public bool? Muted { get; set; }
    public float? MasterVolume { get; set; }
    public bool? AlertTextMuteOnMasterMute { get; set; }
    public float? ProximityRadius { get; set; }
    public float? UiScale { get; set; }
    public ExpansionDefault? ExpansionDefault { get; set; }
    public int? MaxCastBars { get; set; }
    public bool? ShowCastBarWindow { get; set; }
    public bool? ShowCooldownWindow { get; set; }
    public bool? ShowBuffTrackerWindow { get; set; }
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
