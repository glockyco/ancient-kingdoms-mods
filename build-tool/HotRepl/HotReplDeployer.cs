using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;

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

    public static async Task<int> BuildAsync(
        HotReplPaths paths,
        string configuration,
        IProcessRunner runner,
        CancellationToken cancellationToken)
    {
        if (!File.Exists(paths.HostProjectPath))
        {
            Console.Error.WriteLine($"Error: HotRepl host project not found at: {paths.HostProjectPath}");
            return 1;
        }

        PrepareUnityReferences(paths);

        var request = new ProcessRequest(
            Program: "dotnet",
            Arguments: new[]
            {
                "build",
                paths.HostProjectPath,
                "-c", configuration,
                "--nologo",
                "-v", "q",
                $"-p:MelonLoaderPath={paths.MelonLoaderPath}",
                $"-p:Il2CppAssembliesPath={paths.Il2CppAssembliesPath}",
            });

        var result = await runner.RunAsync(request, cancellationToken);
        if (!string.IsNullOrWhiteSpace(result.StandardOutput))
            Console.WriteLine(result.StandardOutput);
        if (!string.IsNullOrWhiteSpace(result.StandardError))
            Console.Error.WriteLine(result.StandardError);
        return result.ExitCode;
    }

    private static void PrepareUnityReferences(HotReplPaths paths)
    {
        var unityDependenciesPath = Path.Combine(
            paths.MelonLoaderPath,
            "Dependencies",
            "Il2CppAssemblyGenerator",
            "UnityDependencies");
        var destinationPath = Path.Combine(paths.HotReplRepoPath, "src", "HotRepl.BepInEx", "lib");
        Directory.CreateDirectory(destinationPath);

        foreach (var fileName in new[] { "UnityEngine.dll", "UnityEngine.CoreModule.dll" })
        {
            var sourcePath = Path.Combine(unityDependenciesPath, fileName);
            if (!File.Exists(sourcePath))
                throw new FileNotFoundException(
                    $"Required Unity reference assembly not found. Launch the game once to generate it: {sourcePath}",
                    sourcePath);

            // A prior run of this method can leave the destination as a symlink
            // back into UnityDependencies (observed after a manual `ln -s` setup
            // there). Once a game update regenerates UnityDependencies via
            // Il2CppAssemblyGenerator, source and destination resolve to the same
            // file, and File.Copy(overwrite: true) refuses to copy a file onto
            // itself: it fails with "being used by another process", which is the
            // OS's generic message for the self-copy case and names no symlink.
            // Deleting the destination first makes the copy unconditionally
            // fresh regardless of what previously sat there. File.Delete is a
            // no-op when nothing exists at the path, and - unlike File.Exists,
            // which resolves a symlink to check its target and so misreports a
            // broken symlink as absent - it removes a symlink entry itself
            // without resolving it, broken or not.
            var destinationFile = Path.Combine(destinationPath, fileName);
            File.Delete(destinationFile);
            File.Copy(sourcePath, destinationFile);
        }
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
