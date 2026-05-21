using System.Collections.Generic;
using System.IO;
using BuildTool.Abstractions;
using BuildTool.Configuration;

namespace BuildTool.Game;

public static class WindowsEnvironment
{
    public static ProcessRequest BuildLaunchRequest(LocalConfig config, IReadOnlyList<string> gameArgs)
    {
        var exe = Path.Combine(config.GamePath, "ancientkingdoms.exe");

        return new ProcessRequest(
            Program: exe,
            Arguments: gameArgs,
            WorkingDirectory: config.GamePath,
            Environment: null);
    }
}
