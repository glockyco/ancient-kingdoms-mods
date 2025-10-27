using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Xml.Linq;

class Program
{
    static int Main(string[] args)
    {
        try
        {
            // Change to repository root
            var rootDir = Path.GetDirectoryName(Path.GetDirectoryName(AppContext.BaseDirectory));
            while (rootDir != null && !File.Exists(Path.Combine(rootDir, "Local.props.example")))
            {
                rootDir = Directory.GetParent(rootDir)?.FullName;
            }

            if (rootDir == null)
            {
                Console.Error.WriteLine("Error: Could not find repository root (looking for Local.props.example)");
                return 1;
            }

            Directory.SetCurrentDirectory(rootDir);

            // Check for dotnet CLI
            if (!IsDotNetInstalled())
            {
                Console.Error.WriteLine("Error: dotnet CLI not found!");
                Console.Error.WriteLine("Install .NET 6.0 SDK or later from https://dotnet.microsoft.com/download");
                return 1;
            }

            // Load Local.props file
            var propsFile = Path.Combine(rootDir, "Local.props");
            if (!File.Exists(propsFile))
            {
                Console.Error.WriteLine("Error: Local.props file not found!");
                Console.Error.WriteLine("Copy Local.props.example to Local.props and configure your paths.");
                return 1;
            }

            LoadPropsFile(propsFile);

            var command = args.Length > 0 ? args[0].ToLower() : "build";

            return command switch
            {
                "build" => BuildMods(),
                "deploy" => DeployMods(),
                "all" => BuildMods() == 0 ? DeployMods() : 1,
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
        Console.WriteLine("Usage: dotnet run [command]");
        Console.WriteLine();
        Console.WriteLine("Commands:");
        Console.WriteLine("  build   - Build all mods (default)");
        Console.WriteLine("  deploy  - Deploy built mods to game directory");
        Console.WriteLine("  all     - Build and deploy");
        Console.WriteLine();
        return 0;
    }

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
                Arguments = "build -c Release",
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
                Console.WriteLine($"✓ {modName}.dll copied to mods directory");
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
