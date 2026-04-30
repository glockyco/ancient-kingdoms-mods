using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using BossMod.Ui.Settings;
using ImGuiNET;

namespace BossMod.Ui.Tabs;

public sealed class GeneralTab
{
    private readonly Globals _globals;
    private readonly ISettingsMutator _mutator;

    public GeneralTab(Globals globals, ISettingsMutator mutator)
    {
        _globals = globals;
        _mutator = mutator;
    }

    public UiRenderResult Render(UiMode mode)
    {
        var result = new UiRenderResult();

        Checkbox(result, "Show cast bars", _globals.ShowCastBarWindow, value => new GlobalPatch { ShowCastBarWindow = value });
        Checkbox(result, "Show cooldowns", _globals.ShowCooldownWindow, value => new GlobalPatch { ShowCooldownWindow = value });
        Checkbox(result, "Show buff tracker", _globals.ShowBuffTrackerWindow, value => new GlobalPatch { ShowBuffTrackerWindow = value });

        bool configMode = _globals.ConfigMode;
        if (!mode.InWorldScene) ImGui.BeginDisabled();
        if (ImGui.Checkbox("Config Mode", ref configMode)) Apply(result, new GlobalPatch { ConfigMode = configMode });
        if (!mode.InWorldScene)
        {
            ImGui.EndDisabled();
            ImGui.TextDisabled("Config Mode is available only in World.");
        }

        ImGui.Separator();
        float proximity = _globals.ProximityRadius;
        if (ImGui.InputFloat("Proximity radius", ref proximity)) Apply(result, new GlobalPatch { ProximityRadius = proximity });

        int maxCastBars = _globals.MaxCastBars;
        if (ImGui.InputInt("Max cast bars", ref maxCastBars)) Apply(result, new GlobalPatch { MaxCastBars = maxCastBars });

        RenderExpansionDefault(result);

        float uiScale = _globals.UiScale;
        if (ImGui.SliderFloat("UI scale", ref uiScale, Theme.MinUiScale, Theme.MaxUiScale)) Apply(result, new GlobalPatch { UiScale = uiScale });

        ImGui.Separator();
        int criticalDamage = _globals.Thresholds.CriticalDamage;
        if (ImGui.InputInt("Critical damage threshold", ref criticalDamage)) Apply(result, new GlobalPatch { CriticalDamage = criticalDamage });
        int highDamage = _globals.Thresholds.HighDamage;
        if (ImGui.InputInt("High damage threshold", ref highDamage)) Apply(result, new GlobalPatch { HighDamage = highDamage });
        int auraDpsHigh = _globals.Thresholds.AuraDpsHigh;
        if (ImGui.InputInt("High aura DPS threshold", ref auraDpsHigh)) Apply(result, new GlobalPatch { AuraDpsHigh = auraDpsHigh });
        float criticalCastTime = _globals.Thresholds.CriticalCastTime;
        if (ImGui.InputFloat("Critical cast time threshold", ref criticalCastTime)) Apply(result, new GlobalPatch { CriticalCastTime = criticalCastTime });

        ImGui.Separator();
        Checkbox(result, "Master mute", _globals.Muted, value => new GlobalPatch { Muted = value });
        float masterVolume = _globals.MasterVolume;
        if (ImGui.SliderFloat("Master volume", ref masterVolume, 0f, 1f)) Apply(result, new GlobalPatch { MasterVolume = masterVolume });
        Checkbox(result, "Mute alert text when master muted", _globals.AlertTextMuteOnMasterMute, value => new GlobalPatch { AlertTextMuteOnMasterMute = value });

        ImGui.Separator();
        ImGui.TextDisabled("F8 toggles Settings");

        return result;
    }

    private void RenderExpansionDefault(UiRenderResult result)
    {
        string current = _globals.ExpansionDefault.ToString();
        if (!ImGui.BeginCombo("Default boss section expansion", current)) return;

        SelectExpansion(result, ExpansionDefault.ExpandTargetedOnly);
        SelectExpansion(result, ExpansionDefault.ExpandAll);
        SelectExpansion(result, ExpansionDefault.CollapseAll);
        ImGui.EndCombo();
    }

    private void SelectExpansion(UiRenderResult result, ExpansionDefault value)
    {
        if (ImGui.Selectable(value.ToString(), _globals.ExpansionDefault == value)) Apply(result, new GlobalPatch { ExpansionDefault = value });
    }

    private void Checkbox(UiRenderResult result, string label, bool current, System.Func<bool, GlobalPatch> patch)
    {
        bool value = current;
        if (ImGui.Checkbox(label, ref value)) Apply(result, patch(value));
    }

    private void Apply(UiRenderResult result, GlobalPatch patch)
    {
        if (_mutator.SetGlobal(patch)) result.Dirty = true;
    }
}
