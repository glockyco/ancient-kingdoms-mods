using BossMod.Core.Persistence;

namespace BossMod.Ui;

public sealed class BossModUi
{
    private readonly Globals _globals;
    private readonly CastBarWindow _castBars;
    private readonly CooldownWindow _cooldowns;
    private readonly AlertOverlay _alertOverlay;

    public BossModUi(Globals globals, CastBarWindow castBars, CooldownWindow cooldowns, AlertOverlay alertOverlay)
    {
        _globals = globals;
        _castBars = castBars;
        _cooldowns = cooldowns;
        _alertOverlay = alertOverlay;
    }

    public bool Render(UiFrame frame)
    {
        Theme.ApplyUiScale(_globals);
        _castBars.Render(frame);
        _cooldowns.Render(frame);
        _alertOverlay.Render(frame.UnscaledNow);
        return false;
    }
}
