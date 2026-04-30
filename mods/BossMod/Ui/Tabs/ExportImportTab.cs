using BossMod.Ui.Settings;
using ImGuiNET;

namespace BossMod.Ui.Tabs;

public sealed class ExportImportTab
{
    private readonly IStateFileActions _actions;
    private string _exportPath = "";
    private string _importPath = "";

    public ExportImportTab(IStateFileActions actions)
    {
        _actions = actions;
    }

    public UiRenderResult Render()
    {
        var result = new UiRenderResult();
        ImGui.TextWrapped($"Active state: {_actions.ActiveStatePath}");
        if (!string.IsNullOrWhiteSpace(_actions.LastStatus)) ImGui.TextWrapped(_actions.LastStatus);

        ImGui.Separator();
        ImGui.InputText("Export path", ref _exportPath, 512);
        if (ImGui.Button("Export")) Merge(result, _actions.ExportTo(_exportPath));

        ImGui.Separator();
        ImGui.InputText("Import path", ref _importPath, 512);
        if (ImGui.Button("Import")) Merge(result, _actions.ImportFrom(_importPath));

        ImGui.Separator();
        if (ImGui.Button("Reload active state")) Merge(result, _actions.ReloadActive());
        if (ImGui.Button("Reset user settings to defaults")) Merge(result, _actions.ResetUserSettingsToDefaults());

        return result;
    }

    private static void Merge(UiRenderResult result, StateActionResult action)
    {
        result.Dirty |= action.Changed;
        result.FlushImmediately |= action.FlushImmediately;
        result.StatusMessage = action.Message;
    }
}
