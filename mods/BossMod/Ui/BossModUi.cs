namespace BossMod.Ui;

public sealed class BossModUi
{
    private readonly AlertOverlay _alertOverlay;

    public BossModUi(AlertOverlay alertOverlay)
    {
        _alertOverlay = alertOverlay;
    }

    public bool Render(UiFrame frame)
    {
        _alertOverlay.Render(frame.UnscaledNow);
        return false;
    }
}
