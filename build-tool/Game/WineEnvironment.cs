using System;
using System.Collections.Generic;
using System.IO;
using BuildTool.Abstractions;
using BuildTool.Configuration;

namespace BuildTool.Game;

public static class WineEnvironment
{
    public static ProcessRequest BuildLaunchRequest(LocalConfig config, IReadOnlyList<string> gameArgs)
    {
        if (config.WinePath is null || config.WinePrefix is null)
            throw new InvalidOperationException("WINE_PATH and WINE_PREFIX are required for macOS launch.");

        var bottleName = Path.GetFileName(config.WinePrefix);
        var args = new List<string> { "ancientkingdoms.exe" };
        args.AddRange(gameArgs);

        var env = new Dictionary<string, string?>
        {
            ["CX_BOTTLE"] = bottleName,
            ["WINEPREFIX"] = config.WinePrefix,
            ["DOTNET_ROOT"] = @"C:\Program Files\dotnet",
        };

        return new ProcessRequest(
            Program: config.WinePath,
            Arguments: args,
            WorkingDirectory: config.GamePath,
            Environment: env);
    }
}
