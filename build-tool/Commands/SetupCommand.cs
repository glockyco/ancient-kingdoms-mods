using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Xml.Linq;
using BuildTool.Configuration;
using BuildTool.HotRepl;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class SetupCommand : AsyncCommand<SetupCommand.Settings>
{
    private const string DefaultProfileName = "ancient-kingdoms";
    private const string DefaultProfileUrl = "ws://127.0.0.1:18590";
    private readonly string _rootDir;

    public SetupCommand()
        : this(Directory.GetCurrentDirectory())
    {
    }

    public SetupCommand(string rootDir)
    {
        _rootDir = rootDir;
    }

    public sealed class Settings : BaseSettings
    {
        [CommandOption("--non-interactive")]
        [Description("Use defaults without prompting; suitable for CI.")]
        public bool NonInteractive { get; set; }
    }

    public static Task<int> Invoke(string rootDir, string[] args)
    {
        var settings = new Settings
        {
            NonInteractive = args.Any(arg => string.Equals(arg, "--non-interactive", StringComparison.Ordinal)),
        };
        return new SetupCommand(rootDir).ExecuteAsync(null!, settings);
    }

    public override Task<int> ExecuteAsync(CommandContext context, Settings settings) =>
        Task.FromResult(Run(settings));

    private int Run(Settings settings)
    {
        Console.WriteLine("Ancient Kingdoms — Setup");
        Console.WriteLine("========================");
        Console.WriteLine();

        var configPath = Path.Combine(_rootDir, "config.toml");
        var configExamplePath = Path.Combine(_rootDir, "config.toml.example");
        if (!File.Exists(configPath) && File.Exists(configExamplePath))
        {
            File.Copy(configExamplePath, configPath);
            Console.WriteLine("Created config.toml from example (defaults are fine).");
            Console.WriteLine();
        }

        var propsPath = Path.Combine(_rootDir, "Local.props");
        var existing = LoadExistingProps(propsPath);
        if (settings.NonInteractive)
            return RunNonInteractive(propsPath, existing);

        var detectedGamePath = DetectGamePath();
        var currentGamePath = existing.GetValueOrDefault("ANCIENT_KINGDOMS_PATH", "");
        var defaultGamePath = !string.IsNullOrEmpty(currentGamePath) ? currentGamePath : detectedGamePath;

        var gamePath = Prompt("Game path", defaultGamePath);
        if (string.IsNullOrWhiteSpace(gamePath))
        {
            Console.Error.WriteLine("Error: Game path is required.");
            return 1;
        }

        var gameExe = Path.Combine(gamePath, "ancientkingdoms.exe");
        if (!File.Exists(gameExe))
        {
            Console.Error.WriteLine($"Error: ancientkingdoms.exe not found at: {gameExe}");
            return 1;
        }

        var exportPath = Path.Combine(_rootDir, "exported-data");
        Directory.CreateDirectory(exportPath);
        Console.WriteLine($"Data export path: {exportPath}");
        Console.WriteLine();

        var winePath = string.Empty;
        var winePrefix = string.Empty;
        if (IsMacOS())
        {
            var detectedWinePath = DetectWinePath();
            var currentWinePath = existing.GetValueOrDefault("WINE_PATH", "");
            var defaultWinePath = !string.IsNullOrEmpty(currentWinePath) ? currentWinePath : detectedWinePath;

            winePath = Prompt("Wine binary (macOS)", defaultWinePath);
            if (!string.IsNullOrEmpty(winePath) && !File.Exists(winePath))
            {
                Console.Error.WriteLine($"Error: Wine binary not found at: {winePath}");
                return 1;
            }

            var detectedWinePrefix = DeriveWinePrefix(gamePath);
            var currentWinePrefix = existing.GetValueOrDefault("WINE_PREFIX", "");
            var defaultWinePrefix = !string.IsNullOrEmpty(currentWinePrefix) ? currentWinePrefix : detectedWinePrefix;

            if (string.IsNullOrEmpty(defaultWinePrefix))
                Console.WriteLine("  Could not auto-detect wine prefix from game path.");

            winePrefix = Prompt("Wine prefix (macOS)", defaultWinePrefix);
            if (!string.IsNullOrEmpty(winePrefix) && !Directory.Exists(winePrefix))
            {
                Console.Error.WriteLine($"Error: Wine prefix directory not found at: {winePrefix}");
                return 1;
            }
        }

        LocalConfigWriter.NoteChanges(existing, gamePath, exportPath, winePath, winePrefix, IsMacOS(), Console.Out);
        LocalConfigWriter.Write(propsPath, gamePath, exportPath, winePath, winePrefix, IsMacOS());

        Console.WriteLine();
        Console.WriteLine("Saved to Local.props.");
        Console.WriteLine();

        OfferProfileUpsert();

        Console.WriteLine("Next steps:");
        Console.WriteLine("  dotnet run --project build-tool all");
        Console.WriteLine("  dotnet run --project build-tool export");

        return 0;
    }

    private static int RunNonInteractive(string propsPath, IReadOnlyDictionary<string, string> existing)
    {
        if (!existing.TryGetValue("ANCIENT_KINGDOMS_PATH", out var gamePath) || string.IsNullOrWhiteSpace(gamePath))
        {
            Console.Error.WriteLine("Error: ANCIENT_KINGDOMS_PATH missing from Local.props.");
            return 1;
        }

        if (!existing.TryGetValue("DATA_EXPORT_PATH", out var exportPath) || string.IsNullOrWhiteSpace(exportPath))
        {
            Console.Error.WriteLine("Error: DATA_EXPORT_PATH missing from Local.props.");
            return 1;
        }

        existing.TryGetValue("WINE_PATH", out var winePath);
        existing.TryGetValue("WINE_PREFIX", out var winePrefix);
        var includeWine = !string.IsNullOrEmpty(winePath) || !string.IsNullOrEmpty(winePrefix);
        LocalConfigWriter.Write(propsPath, gamePath, exportPath, winePath, winePrefix, includeWine);

        Console.WriteLine("Saved to Local.props.");
        return 0;
    }

    private static Dictionary<string, string> LoadExistingProps(string propsPath)
    {
        var existing = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!File.Exists(propsPath))
            return existing;

        try
        {
            var doc = XDocument.Load(propsPath);
            foreach (var el in doc.Descendants("PropertyGroup").Elements())
                existing[el.Name.LocalName] = el.Value;
        }
        catch
        {
            Console.WriteLine("Warning: Could not parse existing Local.props, will overwrite.");
        }

        return existing;
    }

    private static string Prompt(string label, string? defaultValue)
    {
        if (!string.IsNullOrEmpty(defaultValue))
            Console.Write($"{label} [{defaultValue}]: ");
        else
            Console.Write($"{label}: ");

        var input = Console.ReadLine()?.Trim();
        var result = string.IsNullOrEmpty(input) ? (defaultValue ?? string.Empty) : input;
        Console.WriteLine();
        return result;
    }

    private static string? DetectGamePath()
    {
        var candidates = new List<string>();
        if (IsMacOS())
        {
            var bottlesDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Library", "Application Support", "CrossOver", "Bottles");
            if (Directory.Exists(bottlesDir))
            {
                foreach (var bottle in Directory.GetDirectories(bottlesDir))
                {
                    var candidate = Path.Combine(bottle, "drive_c", "Program Files (x86)",
                        "Steam", "steamapps", "common", "Ancient Kingdoms");
                    candidates.Add(candidate);
                }
            }
        }
        else
        {
            candidates.Add(@"C:\Program Files (x86)\Steam\steamapps\common\Ancient Kingdoms");
            candidates.Add(@"C:\Steam\steamapps\common\Ancient Kingdoms");
            candidates.Add(@"D:\SteamLibrary\steamapps\common\Ancient Kingdoms");
            candidates.Add(@"E:\SteamLibrary\steamapps\common\Ancient Kingdoms");
        }

        return candidates.FirstOrDefault(p => File.Exists(Path.Combine(p, "ancientkingdoms.exe")));
    }

    private static string? DetectWinePath()
    {
        var candidate = "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine";
        return File.Exists(candidate) ? candidate : null;
    }

    private static string? DeriveWinePrefix(string gamePath)
    {
        var idx = gamePath.IndexOf("drive_c", StringComparison.OrdinalIgnoreCase);
        if (idx <= 0) return null;

        var prefix = gamePath[..(idx - 1)];
        return Directory.Exists(prefix) ? prefix : null;
    }

    private static void OfferProfileUpsert()
    {
        Console.Write("Add an 'ancient-kingdoms' profile to your HotRepl profile file? (y/N): ");
        var answer = Console.ReadLine()?.Trim();
        Console.WriteLine();
        if (!string.Equals(answer, "y", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(answer, "yes", StringComparison.OrdinalIgnoreCase))
            return;

        var profilePath = DefaultProfilePath();
        Console.WriteLine($"HotRepl profile file: {profilePath}");
        var authSource = Prompt("Token source (env/token-file/inline)", "env");
        var authName = authSource switch
        {
            "env" => Prompt("Token environment variable", "HOTREPL_TOKEN"),
            "token-file" => Prompt("Token file path", null),
            "inline" => Prompt("Inline token", null),
            _ => string.Empty,
        };

        if (string.IsNullOrWhiteSpace(authName))
        {
            Console.Error.WriteLine("Error: HotRepl auth handle is required.");
            return;
        }

        ProfileWriter.Upsert(profilePath, DefaultProfileName, DefaultProfileUrl, authSource, authName);
        Console.WriteLine($"Saved HotRepl profile '{DefaultProfileName}'.");
        Console.WriteLine();
    }

    private static string DefaultProfilePath()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Library", "Application Support", "HotRepl", "profiles.json");
        }

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            return Path.Combine(localAppData, "HotRepl", "profiles.json");
        }

        var xdgConfigHome = Environment.GetEnvironmentVariable("XDG_CONFIG_HOME");
        var configRoot = !string.IsNullOrWhiteSpace(xdgConfigHome)
            ? xdgConfigHome
            : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".config");
        return Path.Combine(configRoot, "hotrepl", "profiles.json");
    }

    private static bool IsMacOS() => RuntimeInformation.IsOSPlatform(OSPlatform.OSX);
}
