using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;

namespace BuildTool.HotRepl;

internal sealed record HotReplDeploymentReport(IReadOnlyList<string> CopiedFiles, IReadOnlyList<string> CopiedDirectories, IReadOnlyList<string> DeletedFiles);

internal static class HotReplDeployer
{
    private static readonly HashSet<string> CopyExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".dll",
        ".pdb",
        ".json",
    };

    private static readonly HashSet<string> ManagedDependencyFiles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Fleck.dll",
        "HotRepl.Core.dll",
        "HotRepl.Core.pdb",
        "HotRepl.Evaluator.Roslyn.dll",
        "HotRepl.Evaluator.Roslyn.pdb",
        "HotRepl.Helpers.Il2Cpp.dll",
        "HotRepl.Helpers.Il2Cpp.pdb",
        "HotRepl.Helpers.Unity.dll",
        "HotRepl.Helpers.Unity.pdb",
        "HotRepl.Host.MelonLoader.deps.json",
        "HotRepl.Host.MelonLoader.dll",
        "HotRepl.Host.MelonLoader.pdb",
        "Microsoft.CodeAnalysis.CSharp.dll",
        "Microsoft.CodeAnalysis.CSharp.Scripting.dll",
        "Microsoft.CodeAnalysis.dll",
        "Microsoft.CodeAnalysis.Scripting.dll",
        "Newtonsoft.Json.dll",
        "System.Buffers.dll",
        "System.Collections.Immutable.dll",
        "System.Memory.dll",
        "System.Numerics.Vectors.dll",
        "System.Reflection.Metadata.dll",
        "System.Runtime.CompilerServices.Unsafe.dll",
        "System.Text.Encoding.CodePages.dll",
        "System.Threading.Tasks.Extensions.dll",
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

        var currentOutputFiles = Directory.GetFiles(hostOutputPath)
            .Where(IsDeployableTopLevelFile)
            .Select(Path.GetFileName)
            .OfType<string>()
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var deletedFiles = DeleteStaleManagedFiles(modsPath, currentOutputFiles);

        var copiedFiles = new List<string>();
        foreach (var sourceFile in Directory.GetFiles(hostOutputPath))
        {
            if (!IsDeployableTopLevelFile(sourceFile))
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

        return new HotReplDeploymentReport(copiedFiles, copiedDirectories, deletedFiles);
    }

    private static IReadOnlyList<string> DeleteStaleManagedFiles(string modsPath, HashSet<string> currentOutputFiles)
    {
        var deletedFiles = new List<string>();
        foreach (var fileName in ManagedDependencyFiles)
        {
            if (currentOutputFiles.Contains(fileName))
                continue;

            var targetFile = Path.Combine(modsPath, fileName);
            if (!File.Exists(targetFile))
                continue;

            File.Delete(targetFile);
            deletedFiles.Add(targetFile);
        }

        return deletedFiles;
    }

    private static bool IsDeployableTopLevelFile(string path)
    {
        var fileName = Path.GetFileName(path);
        if (!CopyExtensions.Contains(Path.GetExtension(path)))
            return false;
        if (fileName.StartsWith("System.", StringComparison.OrdinalIgnoreCase))
            return false;
        return true;
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
