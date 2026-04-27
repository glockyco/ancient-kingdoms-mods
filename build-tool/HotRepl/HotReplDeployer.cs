using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;

namespace BuildTool.HotRepl;

internal sealed record HotReplDeploymentReport(IReadOnlyList<string> CopiedFiles, IReadOnlyList<string> CopiedDirectories);

internal static class HotReplDeployer
{
    private static readonly HashSet<string> CopyExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".dll",
        ".pdb",
        ".json",
    };

    public static int Build(HotReplPaths paths, string configuration)
    {
        if (!File.Exists(paths.HostProjectPath))
        {
            Console.Error.WriteLine($"Error: HotRepl host project not found at: {paths.HostProjectPath}");
            return 1;
        }

        var psi = new ProcessStartInfo
        {
            FileName = "dotnet",
            UseShellExecute = false,
        };
        psi.ArgumentList.Add("build");
        psi.ArgumentList.Add(paths.HostProjectPath);
        psi.ArgumentList.Add("--nologo");
        psi.ArgumentList.Add("-v");
        psi.ArgumentList.Add("q");
        psi.ArgumentList.Add("-c");
        psi.ArgumentList.Add(configuration);
        psi.ArgumentList.Add($"-p:MelonLoaderPath={paths.MelonLoaderPath}");
        psi.ArgumentList.Add($"-p:Il2CppAssembliesPath={paths.Il2CppAssembliesPath}");

        var process = Process.Start(psi)!;
        process.WaitForExit();
        return process.ExitCode;
    }

    public static HotReplDeploymentReport Deploy(string hostOutputPath, string modsPath)
    {
        var hostDll = Path.Combine(hostOutputPath, "HotRepl.Host.MelonLoader.dll");
        if (!File.Exists(hostDll))
            throw new FileNotFoundException($"Required HotRepl host assembly not found: {hostDll}", hostDll);

        Directory.CreateDirectory(modsPath);

        var copiedFiles = new List<string>();
        foreach (var sourceFile in Directory.GetFiles(hostOutputPath))
        {
            if (!CopyExtensions.Contains(Path.GetExtension(sourceFile)))
                continue;

            var targetFile = Path.Combine(modsPath, Path.GetFileName(sourceFile));
            File.Copy(sourceFile, targetFile, overwrite: true);
            copiedFiles.Add(targetFile);
        }

        var copiedDirectories = new List<string>();
        foreach (var sourceDir in Directory.GetDirectories(hostOutputPath))
        {
            var dirName = Path.GetFileName(sourceDir);
            if (!IsSatelliteDirectoryName(dirName))
                continue;

            var targetDir = Path.Combine(modsPath, dirName);
            CopyDirectory(sourceDir, targetDir);
            copiedDirectories.Add(targetDir);
        }

        return new HotReplDeploymentReport(copiedFiles, copiedDirectories);
    }

    private static bool IsSatelliteDirectoryName(string name)
    {
        if (name.Length == 2)
            return name.All(char.IsLetter);
        if (name.Contains('-'))
            return name.All(c => char.IsLetter(c) || c == '-');
        return false;
    }

    private static void CopyDirectory(string sourceDir, string targetDir)
    {
        Directory.CreateDirectory(targetDir);
        foreach (var sourceFile in Directory.GetFiles(sourceDir))
        {
            var targetFile = Path.Combine(targetDir, Path.GetFileName(sourceFile));
            File.Copy(sourceFile, targetFile, overwrite: true);
        }

        foreach (var childSourceDir in Directory.GetDirectories(sourceDir))
        {
            var childTargetDir = Path.Combine(targetDir, Path.GetFileName(childSourceDir));
            CopyDirectory(childSourceDir, childTargetDir);
        }
    }
}
