using System.Numerics;
using BossMod.Ui.Settings;
using ImGuiNET;

namespace BossMod.Ui;

public sealed class SettingsWindow
{
    public UiRenderResult Render(UiMode mode)
    {
        var result = new UiRenderResult();
        ImGui.SetNextWindowSize(new Vector2(720f, 520f), ImGuiCond.FirstUseEver);
        if (!ImGui.Begin("BossMod Settings"))
        {
            ImGui.End();
            return result;
        }

        if (ImGui.BeginTabBar("BossMod Settings Tabs"))
        {
            ImGui.TextDisabled("Settings tabs are added by subsequent Plan 4 tasks.");
            ImGui.EndTabBar();
        }

        ImGui.End();
        return result;
    }
}
