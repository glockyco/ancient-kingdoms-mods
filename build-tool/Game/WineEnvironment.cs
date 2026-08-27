using System;
using System.Collections.Generic;
using System.IO;
using BuildTool.Abstractions;
using BuildTool.Configuration;

namespace BuildTool.Game;

public static class WineEnvironment
{
    private const string ReplPortVariable = "HOTREPL_PORT";

    public static ProcessRequest BuildLaunchRequest(LocalConfig config, IReadOnlyList<string> gameArgs)
    {
        var bottleName = Path.GetFileName(config.WinePrefix);
        var args = new List<string> { "ancientkingdoms.exe" };
        args.AddRange(gameArgs);

        var env = new Dictionary<string, string?>
        {
            ["CX_BOTTLE"] = bottleName,
            ["WINEPREFIX"] = config.WinePrefix,
            ["DOTNET_ROOT"] = @"C:\Program Files\dotnet",
            ["WINEDLLOVERRIDES"] = "version=n,b",
        };

        // The runtime host reads its listen port from the environment. The value belongs to one
        // launch rather than to Local.props, because two instances need different ports.
        var replPort = Environment.GetEnvironmentVariable(ReplPortVariable);
        if (!string.IsNullOrWhiteSpace(replPort))
            env[ReplPortVariable] = replPort;

        return new ProcessRequest(
            Program: config.WinePath,
            Arguments: args,
            WorkingDirectory: config.GamePath,
            Environment: env);
    }
}
