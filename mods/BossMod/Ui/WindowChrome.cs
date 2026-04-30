using ImGuiNET;

namespace BossMod.Ui;

public readonly record struct UiMode(
    bool InWorldScene,
    bool ConfigMode,
    WindowChrome CastBarChrome,
    WindowChrome CooldownChrome,
    WindowChrome BuffTrackerChrome,
    WindowChrome AlertChrome);

public readonly record struct WindowChrome(
    bool ClickThrough,
    bool ShowTitleBar,
    bool ShowBackground,
    bool Movable,
    bool Resizable,
    bool ShowConfigOutline)
{
    public static UiMode ForMode(bool inWorldScene, bool configMode)
    {
        bool configUnlocked = inWorldScene && configMode;
        var movableHud = configUnlocked ? ConfigurableHud : LockedHud;

        return new UiMode(
            InWorldScene: inWorldScene,
            ConfigMode: configUnlocked,
            CastBarChrome: movableHud,
            CooldownChrome: movableHud,
            BuffTrackerChrome: movableHud,
            AlertChrome: AlertOverlay);
    }

    private static WindowChrome LockedHud => new(
        ClickThrough: true,
        ShowTitleBar: false,
        ShowBackground: false,
        Movable: false,
        Resizable: false,
        ShowConfigOutline: false);

    private static WindowChrome ConfigurableHud => new(
        ClickThrough: false,
        ShowTitleBar: true,
        ShowBackground: true,
        Movable: true,
        Resizable: true,
        ShowConfigOutline: true);

    private static WindowChrome AlertOverlay => new(
        ClickThrough: true,
        ShowTitleBar: false,
        ShowBackground: false,
        Movable: false,
        Resizable: false,
        ShowConfigOutline: false);
}

public static class WindowChromeExtensions
{
    public static ImGuiWindowFlags ToImGuiFlags(this WindowChrome chrome)
    {
        var flags = ImGuiWindowFlags.NoScrollbar;

        if (chrome.ClickThrough) flags |= ImGuiWindowFlags.NoInputs;
        if (!chrome.ShowTitleBar) flags |= ImGuiWindowFlags.NoTitleBar;
        if (!chrome.ShowBackground) flags |= ImGuiWindowFlags.NoBackground;
        if (!chrome.Movable) flags |= ImGuiWindowFlags.NoMove;
        if (!chrome.Resizable) flags |= ImGuiWindowFlags.NoResize;

        return flags;
    }

    public static void DrawConfigOutline(WindowChrome chrome)
    {
        if (!chrome.ShowConfigOutline) return;
        var drawList = ImGui.GetWindowDrawList();
        drawList.AddRect(ImGui.GetWindowPos(), ImGui.GetWindowPos() + ImGui.GetWindowSize(), Theme.ConfigOutline, 4f, ImDrawFlags.None, 2f);
    }
}
