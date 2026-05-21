namespace BuildTool.Output;

public sealed class CommandResultStore
{
    public object? Data { get; private set; }
    public object? ErrorDetails { get; private set; }

    public void SetData(object data) => Data = data;

    public void SetErrorDetails(object details) => ErrorDetails = details;
}
