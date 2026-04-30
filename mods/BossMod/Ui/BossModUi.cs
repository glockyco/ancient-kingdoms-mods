using System.Numerics;
using BossMod.Core.Persistence;
using BossMod.Ui.Settings;
using ImGuiNET;

namespace BossMod.Ui;

public sealed class BossModUi
{
    private readonly Globals _globals;
    private readonly CastBarWindow _castBars;
    private readonly CooldownWindow _cooldowns;
    private readonly BuffTrackerWindow _buffs;
    private readonly SettingsWindow _settings;
    private readonly ISettingsMutator _mutator;
    private readonly AlertOverlay _alertOverlay;

    public BossModUi(Globals globals, CastBarWindow castBars, CooldownWindow cooldowns, BuffTrackerWindow buffs, SettingsWindow settings, ISettingsMutator mutator, AlertOverlay alertOverlay)
    {
        _globals = globals;
        _castBars = castBars;
        _cooldowns = cooldowns;
        _buffs = buffs;
        _settings = settings;
        _mutator = mutator;
        _alertOverlay = alertOverlay;
    }

    public bool SettingsVisible { get; private set; }

    public void ToggleSettings()
    {
        SettingsVisible = !SettingsVisible;
    }

    public UiRenderResult Render(UiFrame frame)
    {
        Theme.ApplyUiScale(_globals);
        _castBars.Render(frame);
        _cooldowns.Render(frame);
        _buffs.Render(frame);
        _alertOverlay.Render(frame.UnscaledNow);

        var result = new UiRenderResult();
        if (frame.Mode.ConfigMode) RenderConfigBanner(result);
        if (SettingsVisible) result.Merge(_settings.Render(frame.Mode));
        return result;
    }

    private void RenderConfigBanner(UiRenderResult result)
    {
        var io = ImGui.GetIO();
        ImGui.SetNextWindowPos(new Vector2(io.DisplaySize.X * 0.5f, 20f), ImGuiCond.Always, new Vector2(0.5f, 0f));
        var flags = ImGuiWindowFlags.NoDecoration |
                    ImGuiWindowFlags.AlwaysAutoResize |
                    ImGuiWindowFlags.NoSavedSettings |
                    ImGuiWindowFlags.NoMove;
        if (!ImGui.Begin("BossMod Config Mode Banner", flags))
        {
            ImGui.End();
            return;
        }

        ImGui.TextUnformatted("BossMod Config Mode");
        ImGui.SameLine();
        if (ImGui.Button("Exit") && _mutator.SetGlobal(new GlobalPatch { ConfigMode = false })) result.Dirty = true;
        ImGui.End();
    }
}
