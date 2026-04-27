using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;

namespace BuildTool.HotRepl;

internal sealed record HotReplSmokeCommand(string Label, string Arguments);

internal static class HotReplSmokeRunner
{
    public static IReadOnlyList<HotReplSmokeCommand> BuildSmokeCommands(bool includeWorldChecks, string url)
    {
        var urlArgs = $"--url {Quote(url)}";
        var commands = new List<HotReplSmokeCommand>
        {
            new("info", $"run hotrepl {urlArgs} info"),
            new("ping", $"run hotrepl {urlArgs} ping"),
            new("eval arithmetic", $"run hotrepl {urlArgs} eval {Quote("1 + 1")}"),
            new("eval game version", $"run hotrepl {urlArgs} eval {Quote("UnityEngine.Application.version")}"),
        };

        if (includeWorldChecks)
        {
            commands.Add(new("eval il2cpp type", $"run hotrepl {urlArgs} eval {Quote("using Il2Cpp; using Il2CppInterop.Runtime; Il2CppType.Of<Il2Cpp.Monster>() != null")}"));
            commands.Add(new("eval monster objects", $"run hotrepl {urlArgs} eval {Quote("Il2CppHelpers.FindObjects(\"Il2Cpp.Monster\").Length")}"));
            commands.Add(new("eval scene graph", $"run hotrepl {urlArgs} eval {Quote("UnityHelpers.SceneGraph(null, null, 1, 5)")}"));
        }

        return commands;
    }

    public static int Run(string hotReplClientPath, bool includeWorldChecks, string url)
    {
        if (!Directory.Exists(hotReplClientPath))
        {
            Console.Error.WriteLine($"Error: HotRepl client directory not found: {hotReplClientPath}");
            return 1;
        }

        foreach (var command in BuildSmokeCommands(includeWorldChecks, url))
        {
            Console.WriteLine($"[hotrepl-smoke] {command.Label}");
            var psi = new ProcessStartInfo
            {
                FileName = "uv",
                Arguments = command.Arguments,
                WorkingDirectory = hotReplClientPath,
                UseShellExecute = false,
            };
            var process = Process.Start(psi)!;
            process.WaitForExit();
            if (process.ExitCode != 0)
            {
                Console.Error.WriteLine($"Error: HotRepl smoke command failed: {command.Label}");
                return process.ExitCode;
            }
        }

        return 0;
    }

    private static string Quote(string value) => "\"" + value.Replace("\"", "\\\"") + "\"";
}
