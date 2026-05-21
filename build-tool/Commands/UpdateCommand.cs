using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class UpdateCommand : AsyncCommand<UpdateCommand.Settings>
{
    private readonly string _repoRoot;
    private readonly LocalConfig _config;
    private readonly IProcessRunner _runner;

    public UpdateCommand()
        : this(
            Directory.GetCurrentDirectory(),
            LocalConfigLoader.Load(Path.Combine(Directory.GetCurrentDirectory(), "Local.props")),
            new CliWrapProcessRunner())
    {
    }

    public UpdateCommand(string repoRoot, LocalConfig config, IProcessRunner runner)
    {
        _repoRoot = repoRoot;
        _config = config;
        _runner = runner;
    }

    public sealed class Settings : BaseSettings { }

    public static Task<int> Invoke(string repoRoot, LocalConfig config, IProcessRunner runner) =>
        new UpdateCommand(repoRoot, config, runner).ExecuteAsync(null!, new Settings());

    public override Task<int> ExecuteAsync(CommandContext context, Settings settings) =>
        RunSteamUpdateAsync(_repoRoot, _config, _runner);

    internal static async Task<int> RunSteamUpdateAsync(string repoRoot, LocalConfig config, IProcessRunner runner)
    {
        var steamUser = ReadSteamUsername(Path.Combine(repoRoot, "config.toml"));
        if (string.IsNullOrEmpty(steamUser))
        {
            Console.Error.WriteLine("Error: Steam username not found in config.toml.");
            Console.Error.WriteLine("Add it under [steam] username = \"your_username\"");
            return 1;
        }

        Console.WriteLine("Running steamcmd to update Ancient Kingdoms...");
        Console.WriteLine($"  Steam user: {steamUser}");
        Console.WriteLine($"  Install dir: {config.GamePath}");
        Console.WriteLine();

        var request = new ProcessRequest(
            Program: "steamcmd",
            Arguments: new[]
            {
                "+@sSteamCmdForcePlatformType",
                "windows",
                "+force_install_dir",
                config.GamePath,
                "+login",
                steamUser,
                "+app_update",
                "2241380",
                "validate",
                "+quit",
            });
        var result = await runner.RunAsync(request, CancellationToken.None);
        if (result.ExitCode != 0)
        {
            Console.Error.WriteLine($"Error: steamcmd exited with code {result.ExitCode}.");
            return 1;
        }

        Console.WriteLine();
        Console.WriteLine("Steam update complete.");
        Console.WriteLine();
        return 0;
    }

    private static string? ReadSteamUsername(string configPath)
    {
        if (!File.Exists(configPath))
            return null;

        var inSteamSection = false;
        foreach (var line in File.ReadLines(configPath))
        {
            var trimmed = line.Trim();
            if (trimmed.StartsWith("[", StringComparison.Ordinal))
                inSteamSection = trimmed == "[steam]";

            if (inSteamSection && trimmed.StartsWith("username", StringComparison.Ordinal))
            {
                var eq = trimmed.IndexOf('=');
                if (eq < 0) continue;
                return trimmed[(eq + 1)..].Trim().Trim('"');
            }
        }

        return null;
    }
}
