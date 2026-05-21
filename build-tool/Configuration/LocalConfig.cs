using System.IO;

namespace BuildTool.Configuration;

public sealed record LocalConfig(
    string GamePath,
    string DataExportPath,
    string? WinePath,
    string? WinePrefix)
{
    public string ModsPath => Path.Combine(GamePath, "Mods");
    public string MelonLoaderPath => Path.Combine(GamePath, "MelonLoader");
    public string Il2CppAssembliesPath => Path.Combine(MelonLoaderPath, "Il2CppAssemblies");
}
