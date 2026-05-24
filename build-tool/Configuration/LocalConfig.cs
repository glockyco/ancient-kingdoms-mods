using System.IO;

namespace BuildTool.Configuration;

public sealed record LocalConfig(
    string GamePath,
    string DataExportPath,
    string? WinePath,
    string? WinePrefix,
    string HotReplEndpoint = "ws://127.0.0.1:18590")
{
    public static LocalConfig Empty { get; } = new(
        GamePath: string.Empty,
        DataExportPath: string.Empty,
        WinePath: null,
        WinePrefix: null);

    public string ModsPath => Path.Combine(GamePath, "Mods");
    public string MelonLoaderPath => Path.Combine(GamePath, "MelonLoader");
    public string Il2CppAssembliesPath => Path.Combine(MelonLoaderPath, "Il2CppAssemblies");
}
