using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Xml.Linq;
using BuildTool.HotRepl;

class Program
{
    static string? RootDir;
    static readonly bool IsMacOS = RuntimeInformation.IsOSPlatform(OSPlatform.OSX);

    static int Main(string[] args)
    {
        try
        {
            // Change to repository root
            RootDir = Path.GetDirectoryName(Path.GetDirectoryName(AppContext.BaseDirectory));
            while (RootDir != null && !File.Exists(Path.Combine(RootDir, "Local.props.example")))
            {
                RootDir = Directory.GetParent(RootDir)?.FullName;
            }

            if (RootDir == null)
            {
                Console.Error.WriteLine("Error: Could not find repository root (looking for Local.props.example)");
                return 1;
            }

            Directory.SetCurrentDirectory(RootDir);

            // Check for dotnet CLI
            if (!IsDotNetInstalled())
            {
                Console.Error.WriteLine("Error: dotnet CLI not found!");
                Console.Error.WriteLine("Install .NET 6.0 SDK or later from https://dotnet.microsoft.com/download");
                return 1;
            }

            var command = args.Length > 0 ? args[0].ToLower() : "build";

            // setup runs without Local.props (it creates it)
            if (command == "setup")
                return RunSetup();

            // All other commands require Local.props
            var propsFile = Path.Combine(RootDir, "Local.props");
            if (!File.Exists(propsFile))
            {
                Console.Error.WriteLine("Error: Local.props file not found!");
                Console.Error.WriteLine("Run: dotnet run --project build-tool setup");
                return 1;
            }

            LoadPropsFile(propsFile);

            return command switch
            {
                "build" => BuildMods(),
                "deploy" => DeployMods(),
                "all" => BuildMods() == 0 ? DeployMods() : 1,
                "hotrepl-deploy" => RunHotReplDeploy(args),
                "hotrepl-launch" => RunHotReplLaunch(args),
                "hotrepl-smoke" => RunHotReplSmoke(args),
                "hotrepl" => RunHotRepl(args),
                "export" => RunExport(args),
                _ => ShowUsage()
            };
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: {ex.Message}");
            return 1;
        }
    }

    static void LoadPropsFile(string propsFile)
    {
        var doc = XDocument.Load(propsFile);
        var props = doc.Descendants("PropertyGroup").Elements()
            .ToDictionary(e => e.Name.LocalName, e => e.Value);

        foreach (var prop in props)
        {
            Environment.SetEnvironmentVariable(prop.Key, prop.Value);
        }
    }

    static int ShowUsage()
    {
        Console.WriteLine("Ancient Kingdoms Mod Build Tool");
        Console.WriteLine();
        Console.WriteLine("Usage: dotnet run --project build-tool [command]");
        Console.WriteLine();
        Console.WriteLine("Commands:");
        Console.WriteLine("  build   - Build all mods (default)");
        Console.WriteLine("  deploy  - Deploy built mods to game directory");
        Console.WriteLine("  all     - Build and deploy");
        Console.WriteLine("  setup   - Configure Local.props (interactive, run once)");
        Console.WriteLine("  export  - Launch game, run data export, stream log");
        Console.WriteLine("  export --update      - Run steamcmd app_update before exporting");
        Console.WriteLine("  export --screenshots - Also capture map screenshots (use when map changed)");
        Console.WriteLine("  hotrepl-deploy  - Build and deploy HotRepl MelonLoader host to the configured game Mods directory");
        Console.WriteLine("  hotrepl-launch  - Launch Ancient Kingdoms for an interactive HotRepl session");
        Console.WriteLine("  hotrepl-smoke   - Run HotRepl smoke checks against a running game");
        Console.WriteLine("  hotrepl         - Deploy HotRepl, launch game, and run basic smoke checks");
        Console.WriteLine();
        return 0;
    }

    // =========================================================================
    // setup
    // =========================================================================

    static int RunSetup()
    {
        Console.WriteLine("Ancient Kingdoms — Setup");
        Console.WriteLine("========================");
        Console.WriteLine();

        // Step 1: config.toml
        var configPath = Path.Combine(RootDir!, "config.toml");
        var configExamplePath = Path.Combine(RootDir!, "config.toml.example");
        if (!File.Exists(configPath) && File.Exists(configExamplePath))
        {
            File.Copy(configExamplePath, configPath);
            Console.WriteLine("Created config.toml from example (defaults are fine).");
            Console.WriteLine();
        }

        // Load existing Local.props values if present
        var propsPath = Path.Combine(RootDir!, "Local.props");
        var existing = new Dictionary<string, string>();
        if (File.Exists(propsPath))
        {
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
        }

        // Step 2: ANCIENT_KINGDOMS_PATH
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

        // Step 3: DATA_EXPORT_PATH (auto-derived)
        var exportPath = Path.Combine(RootDir!, "exported-data");
        Directory.CreateDirectory(exportPath);
        Console.WriteLine($"Data export path: {exportPath}");
        Console.WriteLine();

        // Step 4: Wine fields (macOS only)
        var winePath = "";
        var winePrefix = "";
        if (IsMacOS)
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

        // Step 5: Write Local.props
        WriteLocalProps(propsPath, gamePath, exportPath, winePath, winePrefix, existing);

        Console.WriteLine();
        Console.WriteLine("Saved to Local.props.");
        Console.WriteLine();
        Console.WriteLine("Next steps:");
        Console.WriteLine("  dotnet run --project build-tool all");
        Console.WriteLine("  dotnet run --project build-tool export");

        return 0;
    }

    static string Prompt(string label, string? defaultValue)
    {
        if (!string.IsNullOrEmpty(defaultValue))
            Console.Write($"{label} [{defaultValue}]: ");
        else
            Console.Write($"{label}: ");

        var input = Console.ReadLine()?.Trim();
        var result = string.IsNullOrEmpty(input) ? (defaultValue ?? "") : input;
        Console.WriteLine();
        return result;
    }

    static string? DetectGamePath()
    {
        var candidates = new List<string>();

        if (IsMacOS)
        {
            // CrossOver bottles: ~/Library/Application Support/CrossOver/Bottles/*/drive_c/...
            var bottlesDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Library", "Application Support", "CrossOver", "Bottles"
            );
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
            // Windows common Steam locations
            candidates.Add(@"C:\Program Files (x86)\Steam\steamapps\common\Ancient Kingdoms");
            candidates.Add(@"C:\Steam\steamapps\common\Ancient Kingdoms");
            candidates.Add(@"D:\SteamLibrary\steamapps\common\Ancient Kingdoms");
            candidates.Add(@"E:\SteamLibrary\steamapps\common\Ancient Kingdoms");
        }

        return candidates.FirstOrDefault(p =>
            File.Exists(Path.Combine(p, "ancientkingdoms.exe")));
    }

    static string? DetectWinePath()
    {
        var candidate = "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine";
        return File.Exists(candidate) ? candidate : null;
    }

    static string? DeriveWinePrefix(string gamePath)
    {
        // Game path like .../Bottles/Steam/drive_c/Program Files/... → .../Bottles/Steam
        var idx = gamePath.IndexOf("drive_c", StringComparison.OrdinalIgnoreCase);
        if (idx <= 0) return null;

        var prefix = gamePath[..(idx - 1)]; // strip the separator before drive_c
        return Directory.Exists(prefix) ? prefix : null;
    }

    static void WriteLocalProps(string path, string gamePath, string exportPath,
        string winePath, string winePrefix, Dictionary<string, string> existing)
    {
        // Show changes for existing values
        void NoteChange(string key, string newValue)
        {
            if (existing.TryGetValue(key, out var old) && old != newValue)
                Console.WriteLine($"  Updated {key} (was: {old})");
        }

        NoteChange("ANCIENT_KINGDOMS_PATH", gamePath);
        NoteChange("DATA_EXPORT_PATH", exportPath);
        if (IsMacOS)
        {
            NoteChange("WINE_PATH", winePath);
            NoteChange("WINE_PREFIX", winePrefix);
        }

        var sb = new StringBuilder();
        sb.AppendLine("<Project>");
        sb.AppendLine("  <PropertyGroup>");
        sb.AppendLine($"    <ANCIENT_KINGDOMS_PATH>{gamePath}</ANCIENT_KINGDOMS_PATH>");
        sb.AppendLine($"    <DATA_EXPORT_PATH>{exportPath}</DATA_EXPORT_PATH>");
        if (IsMacOS && !string.IsNullOrEmpty(winePath))
            sb.AppendLine($"    <WINE_PATH>{winePath}</WINE_PATH>");
        if (IsMacOS && !string.IsNullOrEmpty(winePrefix))
            sb.AppendLine($"    <WINE_PREFIX>{winePrefix}</WINE_PREFIX>");
        sb.AppendLine("  </PropertyGroup>");
        sb.AppendLine("</Project>");

        // Atomic write: temp file then move
        var tmpPath = path + ".tmp";
        File.WriteAllText(tmpPath, sb.ToString());
        File.Move(tmpPath, path, overwrite: true);
    }

    // =========================================================================
    // steam update
    // =========================================================================

    static int RunSteamUpdate(string gamePath)
    {
        // Find steamcmd
        var steamCmdPath = FindExecutable("steamcmd");
        if (steamCmdPath == null)
        {
            Console.Error.WriteLine("Error: steamcmd not found in PATH.");
            Console.Error.WriteLine("Install it with: brew install steamcmd");
            return 1;
        }

        // Read Steam username from config.toml
        var configPath = Path.Combine(RootDir!, "config.toml");
        var steamUser = ReadSteamUsername(configPath);
        if (string.IsNullOrEmpty(steamUser))
        {
            Console.Error.WriteLine("Error: Steam username not found in config.toml.");
            Console.Error.WriteLine("Add it under [steam] username = \"your_username\"");
            return 1;
        }

        // force_install_dir must point at the game directory itself.
        // steamcmd deposits game files directly into this folder (equivalent to steamapps/common/<Game>).
        Console.WriteLine("Running steamcmd to update Ancient Kingdoms...");
        Console.WriteLine($"  steamcmd: {steamCmdPath}");
        Console.WriteLine($"  Steam user: {steamUser}");
        Console.WriteLine($"  Install dir: {gamePath}");
        Console.WriteLine();

        var psi = new ProcessStartInfo
        {
            FileName = steamCmdPath,
            UseShellExecute = false,
        };
        psi.ArgumentList.Add("+@sSteamCmdForcePlatformType");
        psi.ArgumentList.Add("windows");
        psi.ArgumentList.Add("+force_install_dir");
        psi.ArgumentList.Add(gamePath);
        psi.ArgumentList.Add("+login");
        psi.ArgumentList.Add(steamUser);
        psi.ArgumentList.Add("+app_update");
        psi.ArgumentList.Add("2241380");
        psi.ArgumentList.Add("validate");
        psi.ArgumentList.Add("+quit");

        var process = Process.Start(psi)!;
        process.WaitForExit();

        if (process.ExitCode != 0)
        {
            Console.Error.WriteLine($"Error: steamcmd exited with code {process.ExitCode}.");
            return 1;
        }

        Console.WriteLine();
        Console.WriteLine("Steam update complete.");
        Console.WriteLine();
        return 0;
    }

    static string? FindExecutable(string name)
    {
        // Check common Homebrew paths first, then fall back to PATH search
        var candidates = new[]
        {
            $"/opt/homebrew/bin/{name}",
            $"/usr/local/bin/{name}",
            $"/usr/bin/{name}",
        };

        foreach (var candidate in candidates)
        {
            if (File.Exists(candidate))
                return candidate;
        }

        // Try PATH via `which`
        try
        {
            var which = Process.Start(new ProcessStartInfo
            {
                FileName = "which",
                Arguments = name,
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            });
            var output = which?.StandardOutput.ReadToEnd().Trim();
            which?.WaitForExit();
            if (!string.IsNullOrEmpty(output) && File.Exists(output))
                return output;
        }
        catch { }

        return null;
    }

    static string? ReadSteamUsername(string configPath)
    {
        if (!File.Exists(configPath))
            return null;

        var inSteamSection = false;
        foreach (var line in File.ReadLines(configPath))
        {
            var trimmed = line.Trim();
            if (trimmed.StartsWith("["))
                inSteamSection = trimmed == "[steam]";

            if (inSteamSection && trimmed.StartsWith("username"))
            {
                var eq = trimmed.IndexOf('=');
                if (eq < 0) continue;
                return trimmed[(eq + 1)..].Trim().Trim('"');
            }
        }

        return null;
    }

    // =========================================================================
    // hotrepl
    // =========================================================================

    static int RunHotReplDeploy(string[] args)
    {
        var gamePath = Environment.GetEnvironmentVariable("ANCIENT_KINGDOMS_PATH") ?? "";
        var configuration = ReadOption(args, "--configuration") ?? "Debug";
        var explicitRepo = ReadOption(args, "--hotrepl-repo");
        var paths = HotReplPaths.Resolve(RootDir!, gamePath, configuration, explicitRepo);

        Console.WriteLine("Building HotRepl MelonLoader host...");
        Console.WriteLine($"  HotRepl repo: {paths.HotReplRepoPath}");
        Console.WriteLine($"  Host project: {paths.HostProjectPath}");
        Console.WriteLine($"  Game: {paths.GamePath}");
        Console.WriteLine($"  Mods: {paths.ModsPath}");
        Console.WriteLine();

        var buildExit = HotReplDeployer.Build(paths, configuration);
        if (buildExit != 0)
            return buildExit;

        try
        {
            var report = HotReplDeployer.Deploy(paths.HostOutputPath, paths.ModsPath);
            foreach (var copiedFile in report.CopiedFiles)
                Console.WriteLine($"  copied {Path.GetFileName(copiedFile)}");
            foreach (var copiedDir in report.CopiedDirectories)
                Console.WriteLine($"  copied {Path.GetFileName(copiedDir)}/");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: HotRepl deploy failed: {ex.Message}");
            Console.Error.WriteLine("Note: Close the game before deploying to avoid file lock issues.");
            return 1;
        }

        Console.WriteLine("HotRepl deploy complete.");
        return 0;
    }

    static int RunHotReplLaunch(string[] args)
    {
        var gamePath = Environment.GetEnvironmentVariable("ANCIENT_KINGDOMS_PATH") ?? "";
        if (string.IsNullOrWhiteSpace(gamePath))
        {
            Console.Error.WriteLine("Error: ANCIENT_KINGDOMS_PATH not set.");
            return 1;
        }

        var gameExe = Path.Combine(gamePath, "ancientkingdoms.exe");
        if (!File.Exists(gameExe))
        {
            Console.Error.WriteLine($"Error: Game executable not found at: {gameExe}");
            return 1;
        }

        var logPath = Path.Combine(gamePath, "MelonLoader", "Latest.log");
        Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
        File.WriteAllText(logPath, "");

        ProcessStartInfo psi;
        if (IsMacOS)
        {
            var winePath = Environment.GetEnvironmentVariable("WINE_PATH") ?? "";
            var winePrefix = Environment.GetEnvironmentVariable("WINE_PREFIX") ?? "";
            if (string.IsNullOrWhiteSpace(winePath) || string.IsNullOrWhiteSpace(winePrefix))
            {
                Console.Error.WriteLine("Error: WINE_PATH and WINE_PREFIX are required on macOS.");
                return 1;
            }

            psi = HotReplLauncher.CreateMacLaunchInfo(gamePath, winePath, winePrefix);
        }
        else
        {
            psi = HotReplLauncher.CreateWindowsLaunchInfo(gamePath);
        }

        Console.WriteLine("Launching Ancient Kingdoms for HotRepl...");
        Console.WriteLine($"  Game: {gamePath}");
        Console.WriteLine($"  Command: {psi.FileName} {psi.Arguments}".TrimEnd());
        Console.WriteLine();

        var process = Process.Start(psi);
        if (process == null)
        {
            Console.Error.WriteLine("Error: failed to start game process.");
            return 1;
        }

        if (!args.Contains("--wait"))
        {
            Console.WriteLine($"Game process started with PID {process.Id}.");
            return 0;
        }

        var timeoutSeconds = int.TryParse(ReadOption(args, "--timeout-seconds"), out var parsedTimeout)
            ? parsedTimeout
            : 120;
        Console.WriteLine($"Waiting up to {timeoutSeconds}s for HotRepl on ws://localhost:18590...");
        var reachable = HotReplLauncher.WaitForPort("127.0.0.1", 18590, TimeSpan.FromSeconds(timeoutSeconds));
        if (!reachable)
        {
            Console.Error.WriteLine("Error: HotRepl port did not open before timeout. Check MelonLoader/Latest.log.");
            return 1;
        }

        Console.WriteLine("HotRepl port is reachable.");
        return 0;
    }

    static int RunHotReplSmoke(string[] args)
    {
        var gamePath = Environment.GetEnvironmentVariable("ANCIENT_KINGDOMS_PATH") ?? "";
        var configuration = ReadOption(args, "--configuration") ?? "Debug";
        var explicitRepo = ReadOption(args, "--hotrepl-repo");
        var url = ReadOption(args, "--url") ?? "ws://localhost:18590";
        var includeWorld = args.Contains("--world");
        var paths = HotReplPaths.Resolve(RootDir!, gamePath, configuration, explicitRepo);
        var clientPath = Path.Combine(paths.HotReplRepoPath, "client");

        return HotReplSmokeRunner.Run(clientPath, includeWorld, url);
    }

    static int RunHotRepl(string[] args)
    {
        var deployExit = RunHotReplDeploy(args);
        if (deployExit != 0)
            return deployExit;

        var launchArgs = args.Contains("--wait") ? args : args.Concat(new[] { "--wait" }).ToArray();
        var launchExit = RunHotReplLaunch(launchArgs);
        if (launchExit != 0)
            return launchExit;

        return RunHotReplSmoke(args);
    }

    static string? ReadOption(string[] args, string name)
    {
        for (var i = 0; i < args.Length - 1; i++)
        {
            if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
                return args[i + 1];
        }

        return null;
    }


    // =========================================================================
    // export
    // =========================================================================

    static int RunExport(string[] args)
    {
        var includeScreenshots = args.Contains("--screenshots");
        var runUpdate = args.Contains("--update");
        var gamePath = Environment.GetEnvironmentVariable("ANCIENT_KINGDOMS_PATH");
        if (string.IsNullOrEmpty(gamePath))
        {
            Console.Error.WriteLine("Error: ANCIENT_KINGDOMS_PATH not set.");
            Console.Error.WriteLine("Run: dotnet run --project build-tool setup");
            return 1;
        }

        var gameExe = Path.Combine(gamePath, "ancientkingdoms.exe");
        if (!File.Exists(gameExe))
        {
            Console.Error.WriteLine($"Error: Game executable not found at: {gameExe}");
            return 1;
        }

        var exportPath = Environment.GetEnvironmentVariable("DATA_EXPORT_PATH") ?? "";
        var logPath = Path.Combine(gamePath, "MelonLoader", "Latest.log");

        // Run steamcmd update before launching the game
        if (runUpdate)
        {
            var updateResult = RunSteamUpdate(gamePath);
            if (updateResult != 0)
                return updateResult;
        }

        // Truncate the log for a clean start
        try
        {
            var logDir = Path.GetDirectoryName(logPath)!;
            if (!Directory.Exists(logDir))
                Directory.CreateDirectory(logDir);
            File.WriteAllText(logPath, "");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Could not truncate log: {ex.Message}");
        }

        // Launch the game
        Process process;
        if (IsMacOS)
        {
            var winePath = Environment.GetEnvironmentVariable("WINE_PATH");
            var winePrefix = Environment.GetEnvironmentVariable("WINE_PREFIX");

            if (string.IsNullOrEmpty(winePath) || string.IsNullOrEmpty(winePrefix))
            {
                Console.Error.WriteLine("Error: WINE_PATH and WINE_PREFIX not set.");
                Console.Error.WriteLine("Run: dotnet run --project build-tool setup");
                return 1;
            }

            if (!File.Exists(winePath))
            {
                Console.Error.WriteLine($"Error: Wine binary not found at: {winePath}");
                return 1;
            }

            // Derive CrossOver bottle name from prefix path (e.g. ".../Bottles/Steam" → "Steam")
            var bottleName = Path.GetFileName(winePrefix);

            Console.WriteLine($"Launching game via wine...");
            Console.WriteLine($"  Wine: {winePath}");
            Console.WriteLine($"  Bottle: {bottleName} ({winePrefix})");
            Console.WriteLine($"  Game: {gamePath}");
            Console.WriteLine();

            var gameArgs = "--export-data" + (includeScreenshots ? " --export-screenshots" : "");
            var psi = new ProcessStartInfo
            {
                FileName = winePath,
                Arguments = $"ancientkingdoms.exe {gameArgs}",
                WorkingDirectory = gamePath,
                UseShellExecute = false,
                RedirectStandardOutput = false,
                RedirectStandardError = false,
            };
            // CrossOver wine uses CX_BOTTLE (not WINEPREFIX) to select the bottle
            psi.Environment["CX_BOTTLE"] = bottleName;
            psi.Environment["WINEPREFIX"] = winePrefix;
            // MelonLoader bootstrap needs DOTNET_ROOT to find the .NET 6 runtime
            psi.Environment["DOTNET_ROOT"] = @"C:\Program Files\dotnet";

            process = Process.Start(psi)!;
        }
        else
        {
            Console.WriteLine($"Launching game...");
            Console.WriteLine($"  Game: {gamePath}");
            Console.WriteLine();

            var gameArgs = "--export-data" + (includeScreenshots ? " --export-screenshots" : "");
            var psi = new ProcessStartInfo
            {
                FileName = gameExe,
                Arguments = gameArgs,
                WorkingDirectory = gamePath,
                UseShellExecute = false,
                RedirectStandardOutput = false,
                RedirectStandardError = false,
            };

            process = Process.Start(psi)!;
        }

        // Stream the MelonLoader log
        Console.WriteLine("Streaming MelonLoader log...");
        Console.WriteLine("---");

        long offset = 0;
        var logContent = new StringBuilder();
        var timeoutMs = 300_000;
        var stopwatch = Stopwatch.StartNew();
        var exportComplete = false;

        while (!process.HasExited)
        {
            offset = DrainLog(logPath, offset, logContent);

            // Check for completion signal during streaming — wine may not exit cleanly
            if (!exportComplete && logContent.ToString().Contains("All exports complete. Quitting."))
            {
                exportComplete = true;
                Console.WriteLine("---");
                Console.WriteLine();
                Console.WriteLine("Export signal detected. Waiting for game to exit...");

                // Give the game a few seconds to quit gracefully
                if (!process.WaitForExit(10_000))
                {
                    Console.WriteLine("Game did not exit cleanly — terminating wine process.");
                    try { process.Kill(); } catch { }
                    process.WaitForExit(5_000);
                }
                break;
            }

            if (stopwatch.ElapsedMilliseconds > timeoutMs)
            {
                Console.WriteLine("---");
                Console.Error.WriteLine($"Error: Timed out after {timeoutMs / 1000}s — game did not complete export.");
                try { process.Kill(); } catch { }
                return 1;
            }

            Thread.Sleep(100);
        }

        // Final drain after process exits
        DrainLog(logPath, offset, logContent);
        if (!exportComplete)
        {
            Console.WriteLine("---");
            Console.WriteLine();
            exportComplete = logContent.ToString().Contains("All exports complete. Quitting.");
        }

        // Check for success
        var hasRecentJson = false;
        if (!string.IsNullOrEmpty(exportPath) && Directory.Exists(exportPath))
        {
            var cutoff = DateTime.Now.AddMinutes(-2);
            hasRecentJson = Directory.GetFiles(exportPath, "*.json")
                .Any(f => File.GetLastWriteTime(f) > cutoff);
        }

        if (exportComplete && hasRecentJson)
        {
            Console.WriteLine("Export complete.");
            return 0;
        }

        if (!exportComplete)
            Console.Error.WriteLine("Error: Export completion signal not found in log.");
        if (!hasRecentJson)
            Console.Error.WriteLine("Error: No recently modified .json files found in export directory.");

        Console.Error.WriteLine($"Game exited with code: {process.ExitCode}");
        return 1;
    }

    static long DrainLog(string logPath, long offset, StringBuilder logContent)
    {
        try
        {
            if (!File.Exists(logPath)) return offset;

            using var fs = new FileStream(logPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            if (fs.Length <= offset) return offset;

            fs.Seek(offset, SeekOrigin.Begin);
            var buffer = new byte[fs.Length - offset];
            var bytesRead = fs.Read(buffer, 0, buffer.Length);
            if (bytesRead > 0)
            {
                var text = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                logContent.Append(text);

                // Print line by line with prefix
                var lines = text.Split('\n');
                foreach (var line in lines)
                {
                    var trimmed = line.TrimEnd('\r');
                    if (!string.IsNullOrEmpty(trimmed))
                        Console.WriteLine($"[game] {trimmed}");
                }

                offset += bytesRead;
            }

            return offset;
        }
        catch
        {
            // File may be briefly locked by the game
            return offset;
        }
    }

    // =========================================================================
    // build / deploy
    // =========================================================================

    static bool IsDotNetInstalled()
    {
        try
        {
            var process = Process.Start(new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = "--version",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            });
            process?.WaitForExit();
            return process?.ExitCode == 0;
        }
        catch
        {
            return false;
        }
    }

    static int BuildMods()
    {
        Console.WriteLine("Building Ancient Kingdoms mods...");
        var gamePath = Environment.GetEnvironmentVariable("ANCIENT_KINGDOMS_PATH");
        Console.WriteLine($"Game path: {gamePath}");
        Console.WriteLine();

        var modsDir = Path.Combine(Directory.GetCurrentDirectory(), "mods");
        if (!Directory.Exists(modsDir))
        {
            Console.WriteLine("Warning: mods/ directory not found");
            return 1;
        }

        var projectFiles = Directory.GetFiles(modsDir, "*.csproj", SearchOption.AllDirectories);
        if (projectFiles.Length == 0)
        {
            Console.WriteLine("No mod projects found in mods/");
            return 0;
        }

        var failed = false;
        foreach (var projectFile in projectFiles)
        {
            var modName = Path.GetFileNameWithoutExtension(projectFile);
            Console.WriteLine($"Building {modName}...");

            var process = Process.Start(new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = "build -c Release --no-incremental",
                WorkingDirectory = Path.GetDirectoryName(projectFile),
                UseShellExecute = false
            });

            process?.WaitForExit();

            if (process?.ExitCode != 0)
            {
                Console.Error.WriteLine($"Failed to build {modName}");
                failed = true;
            }

            Console.WriteLine();
        }

        Console.WriteLine(failed ? "Build completed with errors!" : "Build complete!");
        return failed ? 1 : 0;
    }

    static int DeployMods()
    {
        Console.WriteLine("Deploying Ancient Kingdoms mods...");

        var modsPath = Environment.GetEnvironmentVariable("ModsPath");
        if (string.IsNullOrEmpty(modsPath))
        {
            // Derive from ANCIENT_KINGDOMS_PATH
            var gamePath = Environment.GetEnvironmentVariable("ANCIENT_KINGDOMS_PATH");
            if (string.IsNullOrEmpty(gamePath))
            {
                Console.Error.WriteLine("Error: ANCIENT_KINGDOMS_PATH not set in Local.props");
                return 1;
            }
            modsPath = Path.Combine(gamePath, "Mods");
        }

        Console.WriteLine($"Mods path: {modsPath}");
        Console.WriteLine();

        // Create mods directory if it doesn't exist
        Directory.CreateDirectory(modsPath);

        // Find all built DLLs in mods/*/bin/Release/net6.0/
        var modsDir = Path.Combine(Directory.GetCurrentDirectory(), "mods");
        var dllFiles = Directory.GetFiles(modsDir, "*.dll", SearchOption.AllDirectories)
            .Where(f => f.Contains(Path.Combine("bin", "Release", "net6.0")))
            .ToList();

        if (dllFiles.Count == 0)
        {
            Console.WriteLine("Warning: No built mods found in mods/ directory. Did you run build first?");
            return 1;
        }

        foreach (var dllFile in dllFiles)
        {
            var modName = Path.GetFileNameWithoutExtension(dllFile);
            var targetPath = Path.Combine(modsPath, $"{modName}.dll");

            Console.WriteLine($"Deploying {modName}...");

            try
            {
                File.Copy(dllFile, targetPath, overwrite: true);
                Console.WriteLine($"  {modName}.dll copied to mods directory");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Failed to copy {modName}.dll: {ex.Message}");
                Console.Error.WriteLine("Note: Close the game before deploying to avoid file lock issues.");
                return 1;
            }
        }

        Console.WriteLine();
        Console.WriteLine("Deploy complete!");
        Console.WriteLine("Note: Close the game before deploying to avoid file lock issues.");
        return 0;
    }
}
