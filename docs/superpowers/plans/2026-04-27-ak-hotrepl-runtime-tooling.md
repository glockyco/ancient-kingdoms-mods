# Ancient Kingdoms HotRepl Runtime Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:subagent-driven-development (recommended) or skill://superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Ancient Kingdoms-side tooling that builds, deploys, launches, and smoke-tests the HotRepl MelonLoader host against the configured CrossOver Steam bottle.

**Architecture:** Keep HotRepl game-agnostic. The Ancient Kingdoms repo owns all local game-install knowledge through `Local.props` and `build-tool`; new `build-tool hotrepl-*` commands will mirror the existing export launch path while avoiding export side effects. Runtime validation is split into a basic smoke test that works at the main menu and an explicit world-state smoke test for probes that require a loaded character/world.

**Tech Stack:** C#/.NET 10 build-tool, xUnit tests for pure path/deploy/launch/smoke planning logic, CrossOver Wine via `WINE_PATH`/`WINE_PREFIX`, HotRepl Python CLI through `uv run hotrepl`.

---

## Scope and sequencing

This plan implements the missing AK-side HotRepl connection and runtime-validation tooling. It does not add visual-audit probe scripts, renderers, UnityPy extraction, website schema changes, or website UI.

The plan intentionally uses `build-tool` instead of ad hoc shell scripts because `build-tool` already owns:

- `Local.props` loading.
- `ANCIENT_KINGDOMS_PATH` validation.
- CrossOver launch environment (`CX_BOTTLE`, `WINEPREFIX`, `DOTNET_ROOT`).
- Existing mod deployment conventions.

Do not use worktrees. Do not push.

## File structure after completion

Create:

- `tests/BuildTool.Tests/BuildTool.Tests.csproj` — unit tests for new build-tool helpers.
- `tests/BuildTool.Tests/HotReplPathResolverTests.cs` — HotRepl path derivation tests.
- `tests/BuildTool.Tests/HotReplDeployerTests.cs` — file copy/deploy behavior tests.
- `tests/BuildTool.Tests/HotReplLauncherTests.cs` — CrossOver launch command construction tests.
- `tests/BuildTool.Tests/HotReplSmokeTests.cs` — smoke command planning tests.
- `build-tool/HotRepl/HotReplPaths.cs` — pure path resolver for game, HotRepl repo, output, and Mods directory.
- `build-tool/HotRepl/HotReplDeployer.cs` — builds HotRepl host and copies side-by-side artifacts.
- `build-tool/HotRepl/HotReplLauncher.cs` — builds the non-export game launch `ProcessStartInfo` and optional port wait.
- `build-tool/HotRepl/HotReplSmokeRunner.cs` — runs basic and world-state smoke checks through the HotRepl client.

Modify:

- `build-tool/Program.cs` — wire `hotrepl-deploy`, `hotrepl-launch`, `hotrepl-smoke`, and `hotrepl` commands.
- `build-tool/build-tool.csproj` — expose internals to tests if needed.
- `docs/superpowers/specs/2026-04-26-visual-asset-audit-design.md` — update the startup step to reference the new build-tool commands.
- `README.md` or `mods/CLAUDE.md` only if existing docs mention manual HotRepl deployment; do not add a new top-level documentation file.

## Command contract

Add these commands:

```bash
# Build HotRepl MelonLoader host from ../HotRepl and deploy side-by-side artifacts to the AK Mods directory.
dotnet run --project build-tool hotrepl-deploy

# Launch Ancient Kingdoms through CrossOver using Local.props, without --export-data.
dotnet run --project build-tool hotrepl-launch --wait

# Run main-menu-safe smoke checks against a running HotRepl server.
dotnet run --project build-tool hotrepl-smoke

# Run smoke checks that require a loaded world/character.
dotnet run --project build-tool hotrepl-smoke --world

# Convenience command: deploy, launch --wait, then basic smoke.
dotnet run --project build-tool hotrepl
```

Optional flags:

```bash
--hotrepl-repo <path>       # defaults to ../HotRepl from the AK repo root
--configuration <name>      # defaults to Debug
--timeout-seconds <number>  # launch wait timeout, defaults to 120
--url <ws-url>              # hotrepl-smoke URL, defaults to ws://localhost:18590
```

---

### Task 1: Add test project and HotRepl path resolver

**Files:**
- Create: `tests/BuildTool.Tests/BuildTool.Tests.csproj`
- Create: `tests/BuildTool.Tests/HotReplPathResolverTests.cs`
- Create: `build-tool/HotRepl/HotReplPaths.cs`
- Modify: `build-tool/build-tool.csproj`

- [ ] **Step 1: Create the failing test project**

Create `tests/BuildTool.Tests/BuildTool.Tests.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.*" />
    <PackageReference Include="xunit" Version="2.*" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.*" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="../../build-tool/build-tool.csproj" />
  </ItemGroup>
</Project>
```

Modify `build-tool/build-tool.csproj` to make internals visible to the test assembly:

```xml
  <ItemGroup>
    <AssemblyAttribute Include="System.Runtime.CompilerServices.InternalsVisibleTo">
      <_Parameter1>BuildTool.Tests</_Parameter1>
    </AssemblyAttribute>
  </ItemGroup>
```

Place that `ItemGroup` before `</Project>`.

- [ ] **Step 2: Write failing path resolver tests**

Create `tests/BuildTool.Tests/HotReplPathResolverTests.cs`:

```csharp
using BuildTool.HotRepl;
using Xunit;

namespace BuildTool.Tests;

public class HotReplPathResolverTests
{
    [Fact]
    public void Resolve_DefaultsHotReplRepoToSiblingCheckout()
    {
        var repoRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"), "ancient-kingdoms-mods");
        Directory.CreateDirectory(repoRoot);
        var parent = Directory.GetParent(repoRoot)!.FullName;
        var hotReplRepo = Path.Combine(parent, "HotRepl");
        Directory.CreateDirectory(hotReplRepo);

        var paths = HotReplPaths.Resolve(
            repoRoot: repoRoot,
            gamePath: "/game/Ancient Kingdoms",
            configuration: "Debug",
            explicitHotReplRepo: null);

        Assert.Equal(hotReplRepo, paths.HotReplRepoPath);
        Assert.Equal(Path.Combine("/game/Ancient Kingdoms", "Mods"), paths.ModsPath);
        Assert.Equal(Path.Combine("/game/Ancient Kingdoms", "MelonLoader"), paths.MelonLoaderPath);
        Assert.Equal(Path.Combine("/game/Ancient Kingdoms", "MelonLoader", "Il2CppAssemblies"), paths.Il2CppAssembliesPath);
        Assert.Equal(
            Path.Combine(hotReplRepo, "src", "HotRepl.Host.MelonLoader", "HotRepl.Host.MelonLoader.csproj"),
            paths.HostProjectPath);
        Assert.Equal(
            Path.Combine(hotReplRepo, "src", "HotRepl.Host.MelonLoader", "bin", "Debug", "net6.0"),
            paths.HostOutputPath);
    }

    [Fact]
    public void Resolve_UsesExplicitHotReplRepoAndConfiguration()
    {
        var repoRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"), "ancient-kingdoms-mods");
        var hotReplRepo = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"), "HotReplCustom");
        Directory.CreateDirectory(repoRoot);
        Directory.CreateDirectory(hotReplRepo);

        var paths = HotReplPaths.Resolve(
            repoRoot: repoRoot,
            gamePath: "/game/Ancient Kingdoms",
            configuration: "Release",
            explicitHotReplRepo: hotReplRepo);

        Assert.Equal(hotReplRepo, paths.HotReplRepoPath);
        Assert.Equal(Path.Combine(hotReplRepo, "src", "HotRepl.Host.MelonLoader", "bin", "Release", "net6.0"), paths.HostOutputPath);
    }

    [Fact]
    public void Resolve_RejectsMissingGamePath()
    {
        var ex = Assert.Throws<ArgumentException>(() => HotReplPaths.Resolve(
            repoRoot: "/repo",
            gamePath: "",
            configuration: "Debug",
            explicitHotReplRepo: null));

        Assert.Contains("ANCIENT_KINGDOMS_PATH", ex.Message);
    }
}
```

- [ ] **Step 3: Run path resolver tests to verify RED**

Run:

```bash
dotnet test tests/BuildTool.Tests/BuildTool.Tests.csproj --nologo -v q --filter HotReplPathResolverTests
```

Expected: FAIL because `BuildTool.HotRepl.HotReplPaths` does not exist.

- [ ] **Step 4: Implement the path resolver**

Create `build-tool/HotRepl/HotReplPaths.cs`:

```csharp
namespace BuildTool.HotRepl;

internal sealed record HotReplPaths(
    string RepoRoot,
    string GamePath,
    string ModsPath,
    string MelonLoaderPath,
    string Il2CppAssembliesPath,
    string HotReplRepoPath,
    string HostProjectPath,
    string HostOutputPath)
{
    public static HotReplPaths Resolve(
        string repoRoot,
        string gamePath,
        string configuration,
        string? explicitHotReplRepo)
    {
        if (string.IsNullOrWhiteSpace(repoRoot))
            throw new ArgumentException("Repository root is required.", nameof(repoRoot));
        if (string.IsNullOrWhiteSpace(gamePath))
            throw new ArgumentException("ANCIENT_KINGDOMS_PATH is required for HotRepl deployment.", nameof(gamePath));
        if (string.IsNullOrWhiteSpace(configuration))
            configuration = "Debug";

        var hotReplRepo = string.IsNullOrWhiteSpace(explicitHotReplRepo)
            ? Path.GetFullPath(Path.Combine(repoRoot, "..", "HotRepl"))
            : Path.GetFullPath(explicitHotReplRepo);

        var hostProjectPath = Path.Combine(
            hotReplRepo,
            "src",
            "HotRepl.Host.MelonLoader",
            "HotRepl.Host.MelonLoader.csproj");

        var hostOutputPath = Path.Combine(
            hotReplRepo,
            "src",
            "HotRepl.Host.MelonLoader",
            "bin",
            configuration,
            "net6.0");

        return new HotReplPaths(
            RepoRoot: repoRoot,
            GamePath: gamePath,
            ModsPath: Path.Combine(gamePath, "Mods"),
            MelonLoaderPath: Path.Combine(gamePath, "MelonLoader"),
            Il2CppAssembliesPath: Path.Combine(gamePath, "MelonLoader", "Il2CppAssemblies"),
            HotReplRepoPath: hotReplRepo,
            HostProjectPath: hostProjectPath,
            HostOutputPath: hostOutputPath);
    }
}
```

- [ ] **Step 5: Run path resolver tests to verify GREEN**

Run:

```bash
dotnet test tests/BuildTool.Tests/BuildTool.Tests.csproj --nologo -v q --filter HotReplPathResolverTests
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add build-tool/build-tool.csproj build-tool/HotRepl/HotReplPaths.cs tests/BuildTool.Tests
git commit -m "test(build-tool): add HotRepl path resolver coverage"
```

Commit body:

```text
HotRepl runtime validation depends on paths from the Ancient Kingdoms repo rather than hard-coded local shell commands. The resolver gives the build tool a tested boundary for deriving the sibling HotRepl checkout and CrossOver game install paths.
```

---

### Task 2: Build and deploy HotRepl side-by-side artifacts

**Files:**
- Create: `tests/BuildTool.Tests/HotReplDeployerTests.cs`
- Create: `build-tool/HotRepl/HotReplDeployer.cs`
- Modify: `build-tool/Program.cs`

- [ ] **Step 1: Write failing deployer tests**

Create `tests/BuildTool.Tests/HotReplDeployerTests.cs`:

```csharp
using BuildTool.HotRepl;
using Xunit;

namespace BuildTool.Tests;

public class HotReplDeployerTests
{
    [Fact]
    public void Deploy_CopiesTopLevelAssembliesAndSatelliteFolders()
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var output = Path.Combine(root, "hotrepl-output");
        var mods = Path.Combine(root, "game", "Mods");
        Directory.CreateDirectory(output);
        Directory.CreateDirectory(Path.Combine(output, "cs"));

        File.WriteAllText(Path.Combine(output, "HotRepl.Host.MelonLoader.dll"), "host");
        File.WriteAllText(Path.Combine(output, "HotRepl.Core.dll"), "core");
        File.WriteAllText(Path.Combine(output, "Microsoft.CodeAnalysis.dll"), "roslyn");
        File.WriteAllText(Path.Combine(output, "HotRepl.Host.MelonLoader.deps.json"), "deps");
        File.WriteAllText(Path.Combine(output, "HotRepl.Host.MelonLoader.pdb"), "pdb");
        File.WriteAllText(Path.Combine(output, "cs", "Microsoft.CodeAnalysis.resources.dll"), "resources");

        var report = HotReplDeployer.Deploy(output, mods);

        Assert.Contains(Path.Combine(mods, "HotRepl.Host.MelonLoader.dll"), report.CopiedFiles);
        Assert.Contains(Path.Combine(mods, "HotRepl.Core.dll"), report.CopiedFiles);
        Assert.Contains(Path.Combine(mods, "Microsoft.CodeAnalysis.dll"), report.CopiedFiles);
        Assert.Contains(Path.Combine(mods, "HotRepl.Host.MelonLoader.deps.json"), report.CopiedFiles);
        Assert.Contains(Path.Combine(mods, "HotRepl.Host.MelonLoader.pdb"), report.CopiedFiles);
        Assert.True(File.Exists(Path.Combine(mods, "cs", "Microsoft.CodeAnalysis.resources.dll")));
    }

    [Fact]
    public void Deploy_RejectsMissingHostAssembly()
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var output = Path.Combine(root, "hotrepl-output");
        var mods = Path.Combine(root, "game", "Mods");
        Directory.CreateDirectory(output);

        var ex = Assert.Throws<FileNotFoundException>(() => HotReplDeployer.Deploy(output, mods));

        Assert.Contains("HotRepl.Host.MelonLoader.dll", ex.Message);
    }
}
```

- [ ] **Step 2: Run deployer tests to verify RED**

Run:

```bash
dotnet test tests/BuildTool.Tests/BuildTool.Tests.csproj --nologo -v q --filter HotReplDeployerTests
```

Expected: FAIL because `HotReplDeployer` does not exist.

- [ ] **Step 3: Implement deployer**

Create `build-tool/HotRepl/HotReplDeployer.cs`:

```csharp
using System.Diagnostics;

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
```

- [ ] **Step 4: Wire `hotrepl-deploy` command**

Modify `build-tool/Program.cs`:

1. Add at the top:

```csharp
using BuildTool.HotRepl;
```

2. Extend the command switch:

```csharp
"hotrepl-deploy" => RunHotReplDeploy(args),
```

3. Add usage lines:

```csharp
Console.WriteLine("  hotrepl-deploy  - Build and deploy HotRepl MelonLoader host to the configured game Mods directory");
```

4. Add the command implementation before the `// export` section:

```csharp
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

static string? ReadOption(string[] args, string name)
{
    for (var i = 0; i < args.Length - 1; i++)
    {
        if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
            return args[i + 1];
    }

    return null;
}
```

- [ ] **Step 5: Run tests and deploy command**

Run:

```bash
dotnet test tests/BuildTool.Tests/BuildTool.Tests.csproj --nologo -v q
dotnet run --project build-tool hotrepl-deploy
```

Expected:

- Tests PASS.
- `hotrepl-deploy` builds `../HotRepl/src/HotRepl.Host.MelonLoader/HotRepl.Host.MelonLoader.csproj`.
- Output includes copied HotRepl DLLs and Roslyn resource directories.

- [ ] **Step 6: Commit**

```bash
git add build-tool tests/BuildTool.Tests
git commit -m "feat(build-tool): deploy HotRepl host to Ancient Kingdoms"
```

Commit body:

```text
Runtime visual audits need a repeatable way to install the HotRepl MelonLoader host into the configured CrossOver game install. The deploy command keeps local paths in Local.props and copies the full side-by-side Roslyn dependency set needed by the host.
```

---

### Task 3: Add non-export HotRepl game launch command

**Files:**
- Create: `tests/BuildTool.Tests/HotReplLauncherTests.cs`
- Create: `build-tool/HotRepl/HotReplLauncher.cs`
- Modify: `build-tool/Program.cs`

- [ ] **Step 1: Write failing launch tests**

Create `tests/BuildTool.Tests/HotReplLauncherTests.cs`:

```csharp
using BuildTool.HotRepl;
using Xunit;

namespace BuildTool.Tests;

public class HotReplLauncherTests
{
    [Fact]
    public void CreateMacLaunchInfo_UsesCrossOverSteamBottleAndNoExportArgs()
    {
        var gamePath = "/Users/me/Library/Application Support/CrossOver/Bottles/Steam/drive_c/Game";
        var winePath = "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine";
        var winePrefix = "/Users/me/Library/Application Support/CrossOver/Bottles/Steam";

        var psi = HotReplLauncher.CreateMacLaunchInfo(gamePath, winePath, winePrefix);

        Assert.Equal(winePath, psi.FileName);
        Assert.Equal("ancientkingdoms.exe", psi.Arguments);
        Assert.Equal(gamePath, psi.WorkingDirectory);
        Assert.False(psi.UseShellExecute);
        Assert.Equal("Steam", psi.Environment["CX_BOTTLE"]);
        Assert.Equal(winePrefix, psi.Environment["WINEPREFIX"]);
        Assert.Equal(@"C:\Program Files\dotnet", psi.Environment["DOTNET_ROOT"]);
        Assert.DoesNotContain("--export-data", psi.Arguments);
    }

    [Fact]
    public void CreateWindowsLaunchInfo_UsesGameExeAndNoExportArgs()
    {
        var gamePath = @"C:\Games\Ancient Kingdoms";

        var psi = HotReplLauncher.CreateWindowsLaunchInfo(gamePath);

        Assert.Equal(Path.Combine(gamePath, "ancientkingdoms.exe"), psi.FileName);
        Assert.Equal("", psi.Arguments);
        Assert.Equal(gamePath, psi.WorkingDirectory);
        Assert.False(psi.UseShellExecute);
    }
}
```

- [ ] **Step 2: Run launch tests to verify RED**

Run:

```bash
dotnet test tests/BuildTool.Tests/BuildTool.Tests.csproj --nologo -v q --filter HotReplLauncherTests
```

Expected: FAIL because `HotReplLauncher` does not exist.

- [ ] **Step 3: Implement launch helper**

Create `build-tool/HotRepl/HotReplLauncher.cs`:

```csharp
using System.Diagnostics;
using System.Net.Sockets;

namespace BuildTool.HotRepl;

internal static class HotReplLauncher
{
    public static ProcessStartInfo CreateMacLaunchInfo(string gamePath, string winePath, string winePrefix)
    {
        var bottleName = Path.GetFileName(winePrefix);
        var psi = new ProcessStartInfo
        {
            FileName = winePath,
            Arguments = "ancientkingdoms.exe",
            WorkingDirectory = gamePath,
            UseShellExecute = false,
            RedirectStandardOutput = false,
            RedirectStandardError = false,
        };
        psi.Environment["CX_BOTTLE"] = bottleName;
        psi.Environment["WINEPREFIX"] = winePrefix;
        psi.Environment["DOTNET_ROOT"] = @"C:\Program Files\dotnet";
        return psi;
    }

    public static ProcessStartInfo CreateWindowsLaunchInfo(string gamePath)
    {
        return new ProcessStartInfo
        {
            FileName = Path.Combine(gamePath, "ancientkingdoms.exe"),
            Arguments = "",
            WorkingDirectory = gamePath,
            UseShellExecute = false,
            RedirectStandardOutput = false,
            RedirectStandardError = false,
        };
    }

    public static bool WaitForPort(string host, int port, TimeSpan timeout)
    {
        var deadline = DateTimeOffset.UtcNow + timeout;
        while (DateTimeOffset.UtcNow < deadline)
        {
            try
            {
                using var client = new TcpClient();
                var connectTask = client.ConnectAsync(host, port);
                if (connectTask.Wait(TimeSpan.FromMilliseconds(500)) && client.Connected)
                    return true;
            }
            catch
            {
            }

            Thread.Sleep(500);
        }

        return false;
    }
}
```

- [ ] **Step 4: Wire `hotrepl-launch` command**

Modify `build-tool/Program.cs`:

1. Extend the command switch:

```csharp
"hotrepl-launch" => RunHotReplLaunch(args),
```

2. Add usage:

```csharp
Console.WriteLine("  hotrepl-launch  - Launch Ancient Kingdoms for an interactive HotRepl session");
```

3. Add command implementation before `RunExport`:

```csharp
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
```

- [ ] **Step 5: Run tests and launch command**

Run:

```bash
dotnet test tests/BuildTool.Tests/BuildTool.Tests.csproj --nologo -v q --filter HotReplLauncherTests
dotnet run --project build-tool hotrepl-launch --wait --timeout-seconds 120
```

Expected:

- Tests PASS.
- Game launches through CrossOver on macOS.
- Command returns 0 after port `18590` opens, or returns 1 with an explicit log pointer if HotRepl does not start.

- [ ] **Step 6: Commit**

```bash
git add build-tool tests/BuildTool.Tests
git commit -m "feat(build-tool): launch Ancient Kingdoms for HotRepl"
```

Commit body:

```text
HotRepl validation needs the same CrossOver launch environment as exports without activating AutoExporter. The launch command reuses Local.props and waits for the REPL port so subsequent smoke checks have a deterministic starting point.
```

---

### Task 4: Add HotRepl smoke command

**Files:**
- Create: `tests/BuildTool.Tests/HotReplSmokeTests.cs`
- Create: `build-tool/HotRepl/HotReplSmokeRunner.cs`
- Modify: `build-tool/Program.cs`

- [ ] **Step 1: Write failing smoke command tests**

Create `tests/BuildTool.Tests/HotReplSmokeTests.cs`:

```csharp
using BuildTool.HotRepl;
using Xunit;

namespace BuildTool.Tests;

public class HotReplSmokeTests
{
    [Fact]
    public void BasicSmokeCommands_AreMainMenuSafe()
    {
        var commands = HotReplSmokeRunner.BuildSmokeCommands(includeWorldChecks: false, url: "ws://localhost:18590");

        Assert.Contains(commands, c => c.Arguments.Contains("info"));
        Assert.Contains(commands, c => c.Arguments.Contains("ping"));
        Assert.Contains(commands, c => c.Arguments.Contains("1 + 1"));
        Assert.Contains(commands, c => c.Arguments.Contains("UnityEngine.Application.version"));
        Assert.DoesNotContain(commands, c => c.Arguments.Contains("Il2Cpp.Monster"));
    }

    [Fact]
    public void WorldSmokeCommands_IncludeIl2CppAndSceneGraphChecks()
    {
        var commands = HotReplSmokeRunner.BuildSmokeCommands(includeWorldChecks: true, url: "ws://localhost:18590");

        Assert.Contains(commands, c => c.Arguments.Contains("Il2Cpp.Monster"));
        Assert.Contains(commands, c => c.Arguments.Contains("Il2CppHelpers.FindObjects"));
        Assert.Contains(commands, c => c.Arguments.Contains("UnityHelpers.SceneGraph"));
    }
}
```

- [ ] **Step 2: Run smoke tests to verify RED**

Run:

```bash
dotnet test tests/BuildTool.Tests/BuildTool.Tests.csproj --nologo -v q --filter HotReplSmokeTests
```

Expected: FAIL because `HotReplSmokeRunner` does not exist.

- [ ] **Step 3: Implement smoke runner**

Create `build-tool/HotRepl/HotReplSmokeRunner.cs`:

```csharp
using System.Diagnostics;

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
```

- [ ] **Step 4: Wire `hotrepl-smoke` and `hotrepl` convenience command**

Modify `build-tool/Program.cs`:

1. Extend command switch:

```csharp
"hotrepl-smoke" => RunHotReplSmoke(args),
"hotrepl" => RunHotRepl(args),
```

2. Add usage:

```csharp
Console.WriteLine("  hotrepl-smoke   - Run HotRepl smoke checks against a running game");
Console.WriteLine("  hotrepl         - Deploy HotRepl, launch game, and run basic smoke checks");
```

3. Add implementations before `RunExport`:

```csharp
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
```

- [ ] **Step 5: Run tests and smoke command**

Run:

```bash
dotnet test tests/BuildTool.Tests/BuildTool.Tests.csproj --nologo -v q --filter HotReplSmokeTests
dotnet run --project build-tool hotrepl-smoke
```

Expected:

- Tests PASS.
- With game running, basic smoke commands report HotRepl host/evaluator metadata and pass arithmetic/version evals.
- If no game is running, `hotrepl-smoke` exits non-zero with the HotRepl client's “Game not running or HotRepl not loaded” message.

- [ ] **Step 6: Commit**

```bash
git add build-tool tests/BuildTool.Tests
git commit -m "feat(build-tool): add HotRepl smoke checks"
```

Commit body:

```text
Runtime probes need a quick way to prove the deployed HotRepl host is reachable before visual-audit scripts run. The smoke command separates main-menu-safe checks from world-state checks so failures tell the truth about what state the game is in.
```

---

### Task 5: Update visual-audit spec and verify end-to-end tooling

**Files:**
- Modify: `docs/superpowers/specs/2026-04-26-visual-asset-audit-design.md`
- Modify: `README.md` or `mods/CLAUDE.md` only if existing docs need a command reference.

- [ ] **Step 1: Update visual-audit spec startup data flow**

Modify `docs/superpowers/specs/2026-04-26-visual-asset-audit-design.md` data-flow step 3 from:

```markdown
3. The user starts Ancient Kingdoms (via existing `dotnet run --project build-tool export --update` flow or directly), with HotRepl loaded via the MelonLoader host adapter.
```

to:

```markdown
3. The user deploys and starts Ancient Kingdoms for HotRepl with `dotnet run --project build-tool hotrepl` or the split `hotrepl-deploy`, `hotrepl-launch --wait`, and `hotrepl-smoke` commands. This uses `Local.props` and the CrossOver Steam bottle install; it does not pass `--export-data`.
```

Add after that paragraph:

```markdown
Use `dotnet run --project build-tool hotrepl-smoke --world` only after a character/world is loaded. The default `hotrepl-smoke` command is main-menu safe and verifies connection, evaluator metadata, arithmetic eval, and `UnityEngine.Application.version`.
```

- [ ] **Step 2: Run non-runtime checks**

Run:

```bash
dotnet test tests/BuildTool.Tests/BuildTool.Tests.csproj --nologo -v q
dotnet run --project build-tool hotrepl-deploy
```

Expected:

- Build-tool tests PASS.
- Deploy command exits 0 and copies HotRepl artifacts into the CrossOver `Mods/` directory.

- [ ] **Step 3: Run runtime checks**

Run:

```bash
dotnet run --project build-tool hotrepl-launch --wait --timeout-seconds 120
dotnet run --project build-tool hotrepl-smoke
```

Expected:

- Launch command exits 0 after port `18590` opens.
- Basic smoke exits 0.
- `hotrepl info` output reports host `MelonLoader` and evaluator `Roslyn.Script`.
- `hotrepl eval '1 + 1'` returns `2`.
- `hotrepl eval 'UnityEngine.Application.version'` returns a non-empty value.

After loading a character/world manually, run:

```bash
dotnet run --project build-tool hotrepl-smoke --world
```

Expected:

- `Il2CppType.Of<Il2Cpp.Monster>() != null` returns true.
- `Il2CppHelpers.FindObjects("Il2Cpp.Monster").Length` returns a numeric value. If it returns zero, record the game state as “wrapper type available, no loaded monster objects observed” rather than treating the helper as broken.
- `UnityHelpers.SceneGraph(null, null, 1, 5)` returns an array-like serialized value.

- [ ] **Step 4: Commit docs/validation corrections if needed**

If Task 5 changed only the visual-audit spec:

```bash
git add docs/superpowers/specs/2026-04-26-visual-asset-audit-design.md
git commit -m "docs(visual-audit): reference HotRepl runtime tooling"
```

Commit body:

```text
The visual audit now has a concrete AK-side startup path for runtime probes. Pointing the spec at build-tool HotRepl commands removes the previous ambiguity between export-mode launches and interactive probe sessions.
```

If runtime validation revealed a documentation correction in `README.md` or `mods/CLAUDE.md`, include those files in the same commit and explain the observed correction in the body.

---

## Final verification before handing back

Run from `/Users/joaichberger/Projects/ancient-kingdoms-mods`:

```bash
dotnet test tests/BuildTool.Tests/BuildTool.Tests.csproj --nologo -v q
dotnet run --project build-tool hotrepl-deploy
dotnet run --project build-tool hotrepl-launch --wait --timeout-seconds 120
dotnet run --project build-tool hotrepl-smoke
```

Run `hotrepl-smoke --world` only after loading into a character/world state:

```bash
dotnet run --project build-tool hotrepl-smoke --world
```

If the game cannot be launched or the port does not open, report:

- Exact command run.
- Exit code.
- The last relevant lines from `$ANCIENT_KINGDOMS_PATH/MelonLoader/Latest.log`.
- Whether port `18590` is listening.

A completion claim requires observed passing output for the build-tool tests and explicit notes for each runtime smoke command: passed, skipped due to game state, or blocked by launch/dependency failure.

## Self-review

Spec coverage:

- HotRepl operational against the Ancient Kingdoms CrossOver install: Tasks 2, 3, and 4.
- `HotRepl.Helpers.Unity` and `HotRepl.Helpers.Il2Cpp` exposed in eval sessions: verified by Task 4 basic/world smoke commands.
- Runtime relationship and renderer prerequisites: Task 5 updates the visual-audit spec to point at the concrete startup path.
- No Ancient Kingdoms concepts added to HotRepl: all implementation lives in AK `build-tool`.

Placeholder scan:

- No `TBD` or `TODO` placeholders are intentionally left in this plan.
- Runtime-only uncertainty is represented as explicit pass/skip/block reporting, not implementation gaps.

Type consistency:

- `HotReplPaths`, `HotReplDeployer`, `HotReplLauncher`, and `HotReplSmokeRunner` are defined before use in later tasks.
- Command names are consistent across tasks: `hotrepl-deploy`, `hotrepl-launch`, `hotrepl-smoke`, and `hotrepl`.
