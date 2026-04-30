using System.Numerics;
using BossMod.Ui.Settings;
using BossMod.Ui.Tabs;
using ImGuiNET;

namespace BossMod.Ui;

public sealed class SettingsWindow
{
    private readonly GeneralTab _general;
    private readonly SkillsTab _skills;
    private readonly BossesTab _bosses;
    private readonly ExportImportTab _exportImport;

    public SettingsWindow(GeneralTab general, SkillsTab skills, BossesTab bosses, ExportImportTab exportImport)
    {
        _general = general;
        _skills = skills;
        _bosses = bosses;
        _exportImport = exportImport;
    }

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
            if (ImGui.BeginTabItem("General"))
            {
                result.Merge(_general.Render(mode));
                ImGui.EndTabItem();
            }

            if (ImGui.BeginTabItem("Bosses"))
            {
                result.Merge(_bosses.Render());
                ImGui.EndTabItem();
            }

            if (ImGui.BeginTabItem("Skills"))
            {
                result.Merge(_skills.Render());
                ImGui.EndTabItem();
            }

            if (ImGui.BeginTabItem("Data"))
            {
                result.Merge(_exportImport.Render());
                ImGui.EndTabItem();
            }

            ImGui.EndTabBar();
        }

        ImGui.End();
        return result;
    }
}
