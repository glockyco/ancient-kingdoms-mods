using System;
using System.IO;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;

namespace BossMod.Ui.Settings;

public sealed class StateFileActions : IStateFileActions
{
    private readonly SkillCatalog _catalog;
    private readonly Globals _globals;
    private readonly ISettingsMutator _mutator;

    public StateFileActions(string activeStatePath, SkillCatalog catalog, Globals globals, ISettingsMutator mutator)
    {
        ActiveStatePath = activeStatePath;
        _catalog = catalog;
        _globals = globals;
        _mutator = mutator;
        LastStatus = "";
    }

    public string ActiveStatePath { get; }
    public string LastStatus { get; private set; }

    public StateActionResult ExportTo(string path)
    {
        path = NormalizeInputPath(path);
        if (string.IsNullOrWhiteSpace(path)) return Finish(false, false, "Export path is empty.");
        if (SamePath(path, ActiveStatePath)) return Finish(false, false, "Export refused: choose a path other than the active state.json.");

        try
        {
            StateJson.Write(path, _catalog, _globals);
            return Finish(false, false, $"Exported state to {path}.");
        }
        catch (Exception ex) when (ex is IOException || ex is UnauthorizedAccessException || ex is ArgumentException || ex is NotSupportedException)
        {
            return Finish(false, false, $"Export failed: {ex.Message}");
        }
    }

    public StateActionResult ImportFrom(string path)
    {
        path = NormalizeInputPath(path);
        if (string.IsNullOrWhiteSpace(path)) return Finish(false, false, "Import path is empty.");
        return ApplyRead(StateJson.Read(path), "Import");
    }

    public StateActionResult ReloadActive() => ApplyRead(StateJson.Read(ActiveStatePath), "Reload");

    public StateActionResult ResetUserSettingsToDefaults()
    {
        bool changed = _mutator.ResetUserSettingsToDefaults();
        return Finish(changed, changed, changed ? "Reset user settings to defaults." : "User settings were already defaults.");
    }

    public void SetLastStatus(string message)
    {
        LastStatus = message;
    }

    private StateActionResult ApplyRead(StateReadResult read, string action)
    {
        if (read.Status != StateReadStatus.Loaded)
        {
            string detail = string.IsNullOrEmpty(read.ErrorMessage) ? read.Status.ToString() : $"{read.Status}: {read.ErrorMessage}";
            return Finish(false, false, $"{action} did not change live state: {detail}.");
        }

        bool changed = _mutator.ApplyLoadedStateInPlace(read.Catalog, read.Globals);
        return Finish(
            changed,
            changed,
            changed ? $"{action} applied changed state." : $"{action} found no state changes.");
    }

    private StateActionResult Finish(bool changed, bool flushImmediately, string message)
    {
        LastStatus = message;
        return new StateActionResult(changed, flushImmediately, message);
    }

    private static string NormalizeInputPath(string path) => string.IsNullOrWhiteSpace(path) ? "" : path.Trim();

    private static bool SamePath(string left, string right)
    {
        try
        {
            return string.Equals(Path.GetFullPath(left), Path.GetFullPath(right), StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex) when (ex is ArgumentException || ex is NotSupportedException || ex is PathTooLongException)
        {
            return false;
        }
    }
}
