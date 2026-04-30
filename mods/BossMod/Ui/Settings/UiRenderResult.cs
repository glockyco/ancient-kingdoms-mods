namespace BossMod.Ui.Settings;

public sealed class UiRenderResult
{
    public static readonly UiRenderResult None = new();

    public bool Dirty { get; set; }
    public bool FlushImmediately { get; set; }
    public string StatusMessage { get; set; } = "";

    public void Merge(UiRenderResult other)
    {
        Dirty |= other.Dirty;
        FlushImmediately |= other.FlushImmediately;
        if (!string.IsNullOrWhiteSpace(other.StatusMessage)) StatusMessage = other.StatusMessage;
    }
}
