using System.Collections.Generic;
using BuildTool.Abstractions;
using BuildTool.Configuration;

namespace BuildTool.Game;

public static class GameLauncher
{
    public static ProcessRequest BuildLaunchRequest(
        LocalConfig config,
        IReadOnlyList<string> gameArgs,
        bool isMacOs)
    {
        return isMacOs
            ? WineEnvironment.BuildLaunchRequest(config, gameArgs)
            : WindowsEnvironment.BuildLaunchRequest(config, gameArgs);
    }
}
