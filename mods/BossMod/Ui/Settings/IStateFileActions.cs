namespace BossMod.Ui.Settings;

public interface IStateFileActions
{
    string ActiveStatePath { get; }
    string LastStatus { get; }
    StateActionResult ExportTo(string path);
    StateActionResult ImportFrom(string path);
    StateActionResult ReloadActive();
    StateActionResult ResetUserSettingsToDefaults();
}

public readonly struct StateActionResult
{
    public StateActionResult(bool changed, bool flushImmediately, string message)
    {
        Changed = changed;
        FlushImmediately = flushImmediately;
        Message = message;
    }

    public bool Changed { get; }
    public bool FlushImmediately { get; }
    public string Message { get; }
}
