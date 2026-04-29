using System.IO;
using BossMod.Imgui;
using ImGuiNET;
using MelonLoader;
using MelonLoader.Utils;

[assembly: MelonInfo(typeof(BossMod.BossMod), "BossMod", "0.1.0", "ancient-kingdoms-mods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace BossMod;

public class BossMod : MelonMod
{
    private ImGuiRenderer _renderer;
    private bool _showDemo = true;

    public override void OnInitializeMelon()
    {
        var userData = Path.Combine(MelonEnvironment.UserDataDirectory, "BossMod");
        Directory.CreateDirectory(userData);
        var iniPath = Path.Combine(userData, "imgui.ini");
        var cacheDir = Path.Combine(userData, "cache");

        _renderer = new ImGuiRenderer(LoggerInstance);
        if (!_renderer.Init(iniPath, cacheDir))
        {
            LoggerInstance.Error("Renderer init failed; mod disabled");
            _renderer = null;
            return;
        }

        _renderer.OnLayout = () =>
        {
            if (_showDemo) ImGui.ShowDemoWindow(ref _showDemo);
        };

        LoggerInstance.Msg("BossMod initialized");
    }

    public override void OnGUI() => _renderer?.OnGUI();

    public override void OnDeinitializeMelon() => _renderer?.Dispose();
}
