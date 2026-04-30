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
    private readonly SettingsWindow _settings;
    private readonly ISettingsMutator _mutator;

    public BossModUi(Globals globals, CastBarWindow castBars, CooldownWindow cooldowns, SettingsWindow settings, ISettingsMutator mutator)
    {
        _globals = globals;
        _castBars = castBars;
        _cooldowns = cooldowns;
        _settings = settings;
        _mutator = mutator;
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
