using BossMod.Core.Persistence;
using BossMod.Ui.Settings;

namespace BossMod.Ui;

public sealed class BossModUi
{
    private readonly Globals _globals;
    private readonly CastBarWindow _castBars;
    private readonly CooldownWindow _cooldowns;
    private readonly BuffTrackerWindow _buffs;
    private readonly SettingsWindow _settings;
    private readonly AlertOverlay _alertOverlay;

    public BossModUi(Globals globals, CastBarWindow castBars, CooldownWindow cooldowns, BuffTrackerWindow buffs, SettingsWindow settings, AlertOverlay alertOverlay)
    {
        _globals = globals;
        _castBars = castBars;
        _cooldowns = cooldowns;
        _buffs = buffs;
        _settings = settings;
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
        if (SettingsVisible) result.Merge(_settings.Render(frame.Mode));
        return result;
    }
}
