# HotRepl Consumer Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `build-tool` around Spectre.Console.Cli, CliWrap, typed configuration, and one test seam. Replace TCP port polling and hand-rolled subprocess plumbing. Add a structured export-result-file contract between `DataExporter` and `build-tool`. Update agent docs and add one focused skill.

**Architecture:** One .NET 10 project (`build-tool/`) refactored into feature folders; one test seam (`IProcessRunner`); all subprocess invocation through CliWrap; `DataExporter` writes `$(DATA_EXPORT_PATH)/.exporter-result.json` as the canonical completion signal; `build-tool` watches that file instead of grepping the MelonLoader log. Four logical phases on one branch (`docs/hotrepl-consumer-integration`), each phase delivered as a small group of atomic commits.

**Tech Stack:** .NET 10 (build-tool, build-tool tests), .NET 6 (mods + mod tests), xUnit, Spectre.Console.Cli (CLI framework + DI), CliWrap (subprocess), System.Text.Json (build-tool reader), Newtonsoft.Json 13.0.3 (DataExporter writer — already a mod dependency).

---

## File Structure

`build-tool/` (after the work):

```
build-tool/
  Program.cs                       # composition root; Spectre CommandApp + DI
  Commands/
    BaseSettings.cs                # --json / --quiet / --verbose / --no-color
    SetupCommand.cs
    BuildCommand.cs
    DeployCommand.cs
    DeployHostCommand.cs
    LaunchCommand.cs
    ExportCommand.cs
    UpdateCommand.cs
  Configuration/
    LocalConfig.cs                 # typed POCO
    LocalConfigLoader.cs           # parse Local.props XML
    LocalConfigWriter.cs           # atomic write + idempotent merge (existing logic)
  Game/
    GameLauncher.cs                # platform-neutral launch entrypoint
    WineEnvironment.cs             # macOS / CrossOver
    WindowsEnvironment.cs          # Windows native
    LogStream.cs                   # MelonLoader log tail (human visibility)
    ExportResultReader.cs          # parse DataExporter result file
  HotRepl/
    HotReplPaths.cs                # repo + host project + host output paths
    HotReplDeployer.cs             # build host, copy file set, prune stale
    ProfileWriter.cs               # idempotent profile upsert for setup
  Abstractions/
    IProcessRunner.cs              # CliWrap-backed seam
    CliWrapProcessRunner.cs        # production implementation
    ProcessRequest.cs              # input record
    ProcessResult.cs               # output record
  Output/
    OutputEnvelope.cs              # success/error envelope shape
    ExitCodes.cs                   # category-to-code mapping
```

`mods/DataExporter/` (after the work):

```
mods/DataExporter/
  DataExporter.cs                  # ExportAllData now returns ExportRunResult
  Models/
    ExportRunResult.cs             # top-level result POCO
    ExporterRunResult.cs           # per-exporter POCO
    ExporterRunError.cs            # structured error POCO
  ExportResultFile.cs              # atomic JSON writer
  (... existing Exporters/, other Models/)
```

`tests/` (after the work):

```
tests/
  BuildTool.Tests/                 # existing, with new test classes
    HotReplDeployerTests.cs        # updated to use IProcessRunner
    HotReplLauncherTests.cs        # renamed to GameLaunchTests.cs (or kept)
    LocalConfigLoaderTests.cs      # new
    OutputEnvelopeTests.cs         # new
    ExitCodesTests.cs              # new
    ProfileWriterTests.cs          # new
    ExportResultReaderTests.cs     # new
    SetupCommandTests.cs           # new (parse-only tests)
    ... per-command parse tests
  DataExporter.Tests/              # new project
    DataExporter.Tests.csproj
    ExportResultFileTests.cs       # writer + atomic-write tests
    ExportRunResultJsonTests.cs    # round-trip tests
```

`docs/` and skill updates: see Phase 4.

---

## Phase 1 — Internal architecture rebuild

Existing `Program.cs` keeps working at the end of this phase. New infrastructure ships alongside it, dormant until Phase 2 wires it into `Main`.

### Task 1: Add Spectre.Console.Cli and CliWrap NuGet dependencies

**Files:**
- Modify: `build-tool/build-tool.csproj`

- [ ] **Step 1: Add the package references**

Insert into the `<ItemGroup>` block (or append a new ItemGroup):

```xml
<ItemGroup>
  <PackageReference Include="Spectre.Console.Cli" Version="0.50.0" />
  <PackageReference Include="CliWrap" Version="3.7.1" />
  <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="9.0.0" />
</ItemGroup>
```

If the repo gains central package management (`Directory.Packages.props`) later, move the versions there in a follow-up; for now inline versions match the existing csproj style.

- [ ] **Step 2: Verify build**

Run: `dotnet build build-tool/ --nologo -v q`

Expected: PASS with no warnings.

- [ ] **Step 3: Commit**

```sh
git add build-tool/build-tool.csproj
git commit -m "build(build-tool): add Spectre.Console.Cli and CliWrap"
```

---

### Task 2: Add Output envelope and exit codes

**Files:**
- Create: `build-tool/Output/OutputEnvelope.cs`
- Create: `build-tool/Output/ExitCodes.cs`
- Create: `tests/BuildTool.Tests/OutputEnvelopeTests.cs`
- Create: `tests/BuildTool.Tests/ExitCodesTests.cs`

- [ ] **Step 1: Write failing tests**

`tests/BuildTool.Tests/OutputEnvelopeTests.cs`:

```csharp
using System.Text.Json;
using BuildTool.Output;
using Xunit;

namespace BuildTool.Tests;

public class OutputEnvelopeTests
{
    [Fact]
    public void Success_ContainsSchemaCommandData()
    {
        var envelope = OutputEnvelope.Success("build-tool.test", new { value = 42 }, durationMs: 12);

        using var doc = JsonDocument.Parse(envelope);
        var root = doc.RootElement;
        Assert.Equal(1, root.GetProperty("schemaVersion").GetInt32());
        Assert.True(root.GetProperty("ok").GetBoolean());
        Assert.Equal("build-tool.test", root.GetProperty("command").GetString());
        Assert.Equal(42, root.GetProperty("data").GetProperty("value").GetInt32());
        Assert.Equal(12, root.GetProperty("meta").GetProperty("durationMs").GetInt32());
    }

    [Fact]
    public void Failure_IsSymmetricWithSuccess_AndCarriesError()
    {
        var envelope = OutputEnvelope.Failure(
            command: "build-tool.test",
            kind: "command_failed",
            code: "exampleFailed",
            message: "example failed",
            retryable: false);

        using var doc = JsonDocument.Parse(envelope);
        var root = doc.RootElement;
        Assert.Equal(1, root.GetProperty("schemaVersion").GetInt32());
        Assert.False(root.GetProperty("ok").GetBoolean());
        Assert.Equal("build-tool.test", root.GetProperty("command").GetString());
        var err = root.GetProperty("error");
        Assert.Equal("command_failed", err.GetProperty("kind").GetString());
        Assert.Equal("exampleFailed", err.GetProperty("code").GetString());
        Assert.False(err.GetProperty("retryable").GetBoolean());
    }
}
```

`tests/BuildTool.Tests/ExitCodesTests.cs`:

```csharp
using BuildTool.Output;
using Xunit;

namespace BuildTool.Tests;

public class ExitCodesTests
{
    [Theory]
    [InlineData("server_unreachable", 3)]
    [InlineData("auth_failed", 4)]
    [InlineData("lease_conflict", 5)]
    [InlineData("timeout", 6)]
    [InlineData("command_failed", 7)]
    [InlineData("cancelled", 8)]
    [InlineData("internal", 1)]
    [InlineData("invalid_request", 2)]
    public void For_MapsKnownKindsToCategoryCodes(string kind, int expected)
    {
        Assert.Equal(expected, ExitCodes.For(kind));
    }

    [Fact]
    public void For_UnknownKindReturnsOne()
    {
        Assert.Equal(1, ExitCodes.For("something_unexpected"));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter "FullyQualifiedName~OutputEnvelopeTests|FullyQualifiedName~ExitCodesTests"`

Expected: FAIL (`OutputEnvelope` and `ExitCodes` do not exist).

- [ ] **Step 3: Implement Output/OutputEnvelope.cs**

```csharp
using System.Text.Json;

namespace BuildTool.Output;

public static class OutputEnvelope
{
    public const int SchemaVersion = 1;

    public static string Success(string command, object? data = null, int? durationMs = null)
    {
        var payload = new Dictionary<string, object?>
        {
            ["schemaVersion"] = SchemaVersion,
            ["ok"] = true,
            ["command"] = command,
            ["data"] = data ?? new { },
        };
        if (durationMs is not null)
            payload["meta"] = new { durationMs };
        return JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = false });
    }

    public static string Failure(
        string command,
        string kind,
        string code,
        string message,
        bool retryable,
        string? remediation = null,
        object? details = null)
    {
        var error = new Dictionary<string, object?>
        {
            ["kind"] = kind,
            ["code"] = code,
            ["message"] = message,
            ["retryable"] = retryable,
        };
        if (remediation is not null) error["remediation"] = remediation;
        if (details is not null) error["details"] = details;

        var payload = new Dictionary<string, object?>
        {
            ["schemaVersion"] = SchemaVersion,
            ["ok"] = false,
            ["command"] = command,
            ["error"] = error,
        };
        return JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = false });
    }
}
```

- [ ] **Step 4: Implement Output/ExitCodes.cs**

```csharp
namespace BuildTool.Output;

public static class ExitCodes
{
    public const int Success = 0;
    public const int Internal = 1;
    public const int InvalidUsage = 2;
    public const int Unreachable = 3;
    public const int AuthFailed = 4;
    public const int LeaseConflict = 5;
    public const int Timeout = 6;
    public const int CommandFailed = 7;
    public const int Cancelled = 8;

    public static int For(string kind) => kind switch
    {
        "server_unreachable" => Unreachable,
        "auth_failed" => AuthFailed,
        "lease_conflict" or "lease_required" => LeaseConflict,
        "timeout" => Timeout,
        "command_failed" => CommandFailed,
        "cancelled" => Cancelled,
        "invalid_request" or "validation_failed" => InvalidUsage,
        "internal" => Internal,
        _ => Internal,
    };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter "FullyQualifiedName~OutputEnvelopeTests|FullyQualifiedName~ExitCodesTests"`

Expected: PASS.

- [ ] **Step 6: Commit**

```sh
git add build-tool/Output/ tests/BuildTool.Tests/OutputEnvelopeTests.cs tests/BuildTool.Tests/ExitCodesTests.cs
git commit -m "feat(build-tool): add output envelope and exit codes"
```

---

### Task 3: Add LocalConfig POCO and loader

**Files:**
- Create: `build-tool/Configuration/LocalConfig.cs`
- Create: `build-tool/Configuration/LocalConfigLoader.cs`
- Create: `tests/BuildTool.Tests/LocalConfigLoaderTests.cs`

- [ ] **Step 1: Write failing tests**

`tests/BuildTool.Tests/LocalConfigLoaderTests.cs`:

```csharp
using System.IO;
using BuildTool.Configuration;
using Xunit;

namespace BuildTool.Tests;

public class LocalConfigLoaderTests
{
    [Fact]
    public void Load_ParsesWindowsShape()
    {
        var temp = Path.GetTempFileName();
        File.WriteAllText(temp, @"<Project>
  <PropertyGroup>
    <ANCIENT_KINGDOMS_PATH>C:\Games\AK</ANCIENT_KINGDOMS_PATH>
    <DATA_EXPORT_PATH>C:\Projects\AK\exported-data</DATA_EXPORT_PATH>
  </PropertyGroup>
</Project>");

        var config = LocalConfigLoader.Load(temp);

        Assert.Equal(@"C:\Games\AK", config.GamePath);
        Assert.Equal(@"C:\Projects\AK\exported-data", config.DataExportPath);
        Assert.Null(config.WinePath);
        Assert.Null(config.WinePrefix);
    }

    [Fact]
    public void Load_ParsesMacOsShapeWithWineFields()
    {
        var temp = Path.GetTempFileName();
        File.WriteAllText(temp, @"<Project>
  <PropertyGroup>
    <ANCIENT_KINGDOMS_PATH>/Users/me/.../drive_c/Game</ANCIENT_KINGDOMS_PATH>
    <DATA_EXPORT_PATH>/Users/me/Projects/AK/exported-data</DATA_EXPORT_PATH>
    <WINE_PATH>/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine</WINE_PATH>
    <WINE_PREFIX>/Users/me/Library/Application Support/CrossOver/Bottles/Steam</WINE_PREFIX>
  </PropertyGroup>
</Project>");

        var config = LocalConfigLoader.Load(temp);

        Assert.Equal("/Users/me/.../drive_c/Game", config.GamePath);
        Assert.Equal("/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine", config.WinePath);
        Assert.Equal("/Users/me/Library/Application Support/CrossOver/Bottles/Steam", config.WinePrefix);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~LocalConfigLoaderTests`

Expected: FAIL (`LocalConfig` and `LocalConfigLoader` do not exist).

- [ ] **Step 3: Implement LocalConfig.cs**

```csharp
namespace BuildTool.Configuration;

public sealed record LocalConfig(
    string GamePath,
    string DataExportPath,
    string? WinePath,
    string? WinePrefix)
{
    public string ModsPath => System.IO.Path.Combine(GamePath, "Mods");
    public string MelonLoaderPath => System.IO.Path.Combine(GamePath, "MelonLoader");
    public string Il2CppAssembliesPath => System.IO.Path.Combine(MelonLoaderPath, "Il2CppAssemblies");
}
```

- [ ] **Step 4: Implement LocalConfigLoader.cs**

```csharp
using System.Xml.Linq;

namespace BuildTool.Configuration;

public static class LocalConfigLoader
{
    public static LocalConfig Load(string propsFilePath)
    {
        var doc = XDocument.Load(propsFilePath);
        var props = doc.Descendants("PropertyGroup")
            .Elements()
            .ToDictionary(e => e.Name.LocalName, e => e.Value, StringComparer.OrdinalIgnoreCase);

        string Require(string key)
        {
            if (!props.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value))
                throw new InvalidOperationException($"{key} missing from {propsFilePath}");
            return value;
        }

        string? Optional(string key) =>
            props.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value) ? value : null;

        return new LocalConfig(
            GamePath: Require("ANCIENT_KINGDOMS_PATH"),
            DataExportPath: Require("DATA_EXPORT_PATH"),
            WinePath: Optional("WINE_PATH"),
            WinePrefix: Optional("WINE_PREFIX"));
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~LocalConfigLoaderTests`

Expected: PASS.

- [ ] **Step 6: Commit**

```sh
git add build-tool/Configuration/ tests/BuildTool.Tests/LocalConfigLoaderTests.cs
git commit -m "feat(build-tool): add typed LocalConfig loader"
```

---

### Task 4: Add IProcessRunner abstraction with CliWrap implementation

**Files:**
- Create: `build-tool/Abstractions/ProcessRequest.cs`
- Create: `build-tool/Abstractions/ProcessResult.cs`
- Create: `build-tool/Abstractions/IProcessRunner.cs`
- Create: `build-tool/Abstractions/CliWrapProcessRunner.cs`
- Create: `tests/BuildTool.Tests/FakeProcessRunner.cs`
- Create: `tests/BuildTool.Tests/CliWrapProcessRunnerTests.cs`

- [ ] **Step 1: Write failing tests**

`tests/BuildTool.Tests/CliWrapProcessRunnerTests.cs`:

```csharp
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using Xunit;

namespace BuildTool.Tests;

public class CliWrapProcessRunnerTests
{
    [Fact]
    public async Task RunsDotnetVersionAndCapturesStdout()
    {
        var runner = new CliWrapProcessRunner();
        var request = new ProcessRequest(
            Program: "dotnet",
            Arguments: new[] { "--version" });

        var result = await runner.RunAsync(request, CancellationToken.None);

        Assert.Equal(0, result.ExitCode);
        Assert.False(string.IsNullOrWhiteSpace(result.StandardOutput));
    }

    [Fact]
    public async Task NonZeroExitDoesNotThrow_AndIsReportedInResult()
    {
        var runner = new CliWrapProcessRunner();
        var request = new ProcessRequest(
            Program: "dotnet",
            Arguments: new[] { "--invalid-flag-that-cannot-exist" });

        var result = await runner.RunAsync(request, CancellationToken.None);

        Assert.NotEqual(0, result.ExitCode);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~CliWrapProcessRunnerTests`

Expected: FAIL (`IProcessRunner` / `CliWrapProcessRunner` do not exist).

- [ ] **Step 3: Implement Abstractions/ProcessRequest.cs**

```csharp
namespace BuildTool.Abstractions;

public sealed record ProcessRequest(
    string Program,
    IReadOnlyList<string> Arguments,
    string? WorkingDirectory = null,
    IReadOnlyDictionary<string, string?>? Environment = null);
```

- [ ] **Step 4: Implement Abstractions/ProcessResult.cs**

```csharp
namespace BuildTool.Abstractions;

public sealed record ProcessResult(
    int ExitCode,
    string StandardOutput,
    string StandardError,
    TimeSpan Duration);
```

- [ ] **Step 5: Implement Abstractions/IProcessRunner.cs**

```csharp
namespace BuildTool.Abstractions;

public interface IProcessRunner
{
    Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken);
}
```

- [ ] **Step 6: Implement Abstractions/CliWrapProcessRunner.cs**

```csharp
using System.Text;
using CliWrap;
using CliWrap.Buffered;

namespace BuildTool.Abstractions;

public sealed class CliWrapProcessRunner : IProcessRunner
{
    public async Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken)
    {
        var command = Cli.Wrap(request.Program)
            .WithArguments(request.Arguments)
            .WithValidation(CommandResultValidation.None);

        if (request.WorkingDirectory is not null)
            command = command.WithWorkingDirectory(request.WorkingDirectory);

        if (request.Environment is not null)
            command = command.WithEnvironmentVariables(request.Environment);

        var result = await command.ExecuteBufferedAsync(cancellationToken);

        return new ProcessResult(
            ExitCode: result.ExitCode,
            StandardOutput: result.StandardOutput,
            StandardError: result.StandardError,
            Duration: result.RunTime);
    }
}
```

- [ ] **Step 7: Implement tests/BuildTool.Tests/FakeProcessRunner.cs**

```csharp
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;

namespace BuildTool.Tests;

public sealed class FakeProcessRunner : IProcessRunner
{
    private readonly Queue<ProcessResult> _responses = new();
    public List<ProcessRequest> Calls { get; } = new();

    public void Enqueue(ProcessResult response) => _responses.Enqueue(response);

    public Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken)
    {
        Calls.Add(request);
        if (_responses.Count == 0)
            throw new InvalidOperationException($"No fake response queued for {request.Program}");
        return Task.FromResult(_responses.Dequeue());
    }
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~CliWrapProcessRunnerTests`

Expected: PASS (note: requires `dotnet` on PATH — true for any developer machine).

- [ ] **Step 9: Commit**

```sh
git add build-tool/Abstractions/ tests/BuildTool.Tests/FakeProcessRunner.cs tests/BuildTool.Tests/CliWrapProcessRunnerTests.cs
git commit -m "feat(build-tool): add IProcessRunner abstraction with CliWrap implementation"
```

---

### Task 5: Refactor platform launch environments

Extract launch-info construction from the existing `HotReplLauncher` into `Game/WineEnvironment.cs` and `Game/WindowsEnvironment.cs`. They will return typed `ProcessRequest` values that the new `GameLauncher` orchestrates.

**Files:**
- Create: `build-tool/Game/WineEnvironment.cs`
- Create: `build-tool/Game/WindowsEnvironment.cs`
- Create: `tests/BuildTool.Tests/PlatformEnvironmentTests.cs`
- Existing: `build-tool/HotRepl/HotReplLauncher.cs` — not touched yet (Phase 2 removes it).

- [ ] **Step 1: Write failing tests**

`tests/BuildTool.Tests/PlatformEnvironmentTests.cs`:

```csharp
using BuildTool.Configuration;
using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

public class PlatformEnvironmentTests
{
    private static LocalConfig MacConfig() => new(
        GamePath: "/Users/me/Library/Application Support/CrossOver/Bottles/Steam/drive_c/Game",
        DataExportPath: "/Users/me/exported-data",
        WinePath: "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine",
        WinePrefix: "/Users/me/Library/Application Support/CrossOver/Bottles/Steam");

    private static LocalConfig WindowsConfig() => new(
        GamePath: @"C:\Games\Ancient Kingdoms",
        DataExportPath: @"C:\Projects\AK\exported-data",
        WinePath: null,
        WinePrefix: null);

    [Fact]
    public void Wine_BuildsRequestWithCrossOverBottleAndDotnetRoot()
    {
        var request = WineEnvironment.BuildLaunchRequest(MacConfig(), gameArgs: new string[0]);

        Assert.Equal("/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine", request.Program);
        Assert.Equal(new[] { "ancientkingdoms.exe" }, request.Arguments);
        Assert.Equal(MacConfig().GamePath, request.WorkingDirectory);
        Assert.Equal("Steam", request.Environment!["CX_BOTTLE"]);
        Assert.Equal(MacConfig().WinePrefix, request.Environment!["WINEPREFIX"]);
        Assert.Equal(@"C:\Program Files\dotnet", request.Environment!["DOTNET_ROOT"]);
    }

    [Fact]
    public void Wine_AppendsExportArgs()
    {
        var request = WineEnvironment.BuildLaunchRequest(
            MacConfig(),
            gameArgs: new[] { "--export-data", "--export-screenshots" });

        Assert.Equal(
            new[] { "ancientkingdoms.exe", "--export-data", "--export-screenshots" },
            request.Arguments);
    }

    [Fact]
    public void Windows_BuildsRequestPointingAtGameExe()
    {
        var request = WindowsEnvironment.BuildLaunchRequest(WindowsConfig(), gameArgs: new string[0]);

        Assert.Equal(System.IO.Path.Combine(WindowsConfig().GamePath, "ancientkingdoms.exe"), request.Program);
        Assert.Empty(request.Arguments);
        Assert.Equal(WindowsConfig().GamePath, request.WorkingDirectory);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~PlatformEnvironmentTests`

Expected: FAIL (`WineEnvironment` / `WindowsEnvironment` do not exist).

- [ ] **Step 3: Implement Game/WineEnvironment.cs**

```csharp
using BuildTool.Abstractions;
using BuildTool.Configuration;

namespace BuildTool.Game;

public static class WineEnvironment
{
    public static ProcessRequest BuildLaunchRequest(LocalConfig config, IReadOnlyList<string> gameArgs)
    {
        if (config.WinePath is null || config.WinePrefix is null)
            throw new InvalidOperationException("WINE_PATH and WINE_PREFIX are required for macOS launch.");

        var bottleName = System.IO.Path.GetFileName(config.WinePrefix);
        var args = new List<string> { "ancientkingdoms.exe" };
        args.AddRange(gameArgs);

        var env = new Dictionary<string, string?>
        {
            ["CX_BOTTLE"] = bottleName,
            ["WINEPREFIX"] = config.WinePrefix,
            ["DOTNET_ROOT"] = @"C:\Program Files\dotnet",
        };

        return new ProcessRequest(
            Program: config.WinePath,
            Arguments: args,
            WorkingDirectory: config.GamePath,
            Environment: env);
    }
}
```

- [ ] **Step 4: Implement Game/WindowsEnvironment.cs**

```csharp
using BuildTool.Abstractions;
using BuildTool.Configuration;

namespace BuildTool.Game;

public static class WindowsEnvironment
{
    public static ProcessRequest BuildLaunchRequest(LocalConfig config, IReadOnlyList<string> gameArgs)
    {
        var exe = System.IO.Path.Combine(config.GamePath, "ancientkingdoms.exe");

        return new ProcessRequest(
            Program: exe,
            Arguments: gameArgs,
            WorkingDirectory: config.GamePath,
            Environment: null);
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~PlatformEnvironmentTests`

Expected: PASS.

- [ ] **Step 6: Commit**

```sh
git add build-tool/Game/WineEnvironment.cs build-tool/Game/WindowsEnvironment.cs tests/BuildTool.Tests/PlatformEnvironmentTests.cs
git commit -m "refactor(build-tool): extract platform launch environments"
```

---

### Task 6: Add GameLauncher orchestrator

**Files:**
- Create: `build-tool/Game/GameLauncher.cs`

`GameLauncher` is platform-neutral glue. It picks the right environment, calls `IProcessRunner`, and returns a typed launch outcome. Tests for the orchestration are minimal because the platform branching is tested in Task 5; here we just verify the dispatch.

- [ ] **Step 1: Write failing test**

Append to `tests/BuildTool.Tests/PlatformEnvironmentTests.cs` (or new file `GameLauncherTests.cs`):

```csharp
[Fact]
public void GameLauncher_DispatchesToWineWhenWineConfigured()
{
    var config = MacConfig();

    var request = GameLauncher.BuildLaunchRequest(config, gameArgs: new[] { "--export-data" }, isMacOs: true);

    Assert.Equal(config.WinePath, request.Program);
    Assert.Contains("--export-data", request.Arguments);
}

[Fact]
public void GameLauncher_DispatchesToWindowsWhenNotMacOs()
{
    var config = WindowsConfig();

    var request = GameLauncher.BuildLaunchRequest(config, gameArgs: new string[0], isMacOs: false);

    Assert.EndsWith("ancientkingdoms.exe", request.Program);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~GameLauncher`

Expected: FAIL (no `GameLauncher`).

- [ ] **Step 3: Implement Game/GameLauncher.cs**

```csharp
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~GameLauncher`

Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add build-tool/Game/GameLauncher.cs tests/BuildTool.Tests/PlatformEnvironmentTests.cs
git commit -m "feat(build-tool): add GameLauncher orchestrator"
```

---

### Task 7: Add LogStream tailer

`LogStream` tails a file (typically `MelonLoader/Latest.log`) and yields newly-appended chunks. It is used by `launch --wait` and `export` for human-visible streaming. It is **not** load-bearing for success detection — that is `ExportResultReader`'s job (Phase 3).

**Files:**
- Create: `build-tool/Game/LogStream.cs`
- Create: `tests/BuildTool.Tests/LogStreamTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

public class LogStreamTests
{
    [Fact]
    public async Task ReadsIncrementalAppendsAndStopsOnCancellation()
    {
        var temp = Path.GetTempFileName();
        await File.WriteAllTextAsync(temp, "line one\n");

        using var cts = new CancellationTokenSource();
        var stream = new LogStream(temp, TimeSpan.FromMilliseconds(20));

        var received = new List<string>();
        var task = Task.Run(async () =>
        {
            await foreach (var chunk in stream.ReadAsync(cts.Token))
                received.Add(chunk);
        });

        await Task.Delay(50);
        await File.AppendAllTextAsync(temp, "line two\n");
        await Task.Delay(100);
        cts.Cancel();
        try { await task; } catch (OperationCanceledException) { }

        var joined = string.Concat(received);
        Assert.Contains("line one", joined);
        Assert.Contains("line two", joined);
    }

    [Fact]
    public async Task TolerantOfMissingFileAtStart()
    {
        var temp = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());

        using var cts = new CancellationTokenSource();
        var stream = new LogStream(temp, TimeSpan.FromMilliseconds(20));

        var task = Task.Run(async () =>
        {
            await foreach (var _ in stream.ReadAsync(cts.Token)) { }
        });

        await Task.Delay(50);
        await File.WriteAllTextAsync(temp, "appeared late\n");
        await Task.Delay(100);
        cts.Cancel();
        try { await task; } catch (OperationCanceledException) { }
        // No assertion beyond "does not throw" — the contract is tolerance, not order.
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~LogStreamTests`

Expected: FAIL.

- [ ] **Step 3: Implement Game/LogStream.cs**

```csharp
using System.Runtime.CompilerServices;

namespace BuildTool.Game;

public sealed class LogStream
{
    private readonly string _path;
    private readonly TimeSpan _pollInterval;

    public LogStream(string path, TimeSpan pollInterval)
    {
        _path = path;
        _pollInterval = pollInterval;
    }

    public async IAsyncEnumerable<string> ReadAsync([EnumeratorCancellation] CancellationToken cancellationToken)
    {
        long offset = 0;
        while (!cancellationToken.IsCancellationRequested)
        {
            if (File.Exists(_path))
            {
                using var stream = new FileStream(_path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                if (stream.Length > offset)
                {
                    stream.Seek(offset, SeekOrigin.Begin);
                    using var reader = new StreamReader(stream);
                    var chunk = await reader.ReadToEndAsync(cancellationToken);
                    if (chunk.Length > 0)
                    {
                        offset += chunk.Length;
                        yield return chunk;
                    }
                }
            }
            try { await Task.Delay(_pollInterval, cancellationToken); }
            catch (OperationCanceledException) { yield break; }
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~LogStreamTests`

Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add build-tool/Game/LogStream.cs tests/BuildTool.Tests/LogStreamTests.cs
git commit -m "feat(build-tool): add MelonLoader log stream tailer"
```

---

### Task 8: Refactor HotReplDeployer through IProcessRunner

Existing `HotReplDeployer.Build` shells out to `dotnet` via raw `Process.Start`. Refactor it to call through `IProcessRunner` so it is testable with a fake.

**Files:**
- Modify: `build-tool/HotRepl/HotReplDeployer.cs`
- Modify: `tests/BuildTool.Tests/HotReplDeployerTests.cs`

- [ ] **Step 1: Update test for IProcessRunner-driven build**

Add a test ensuring `HotReplDeployer.Build` invokes the runner with `dotnet build <hostProject>`. Use the existing `HotReplDeployerTests.cs` shape; if it currently asserts on filesystem effects, keep those, and add a new `BuildInvokesProcessRunner` test:

```csharp
[Fact]
public async Task Build_InvokesDotnetBuildWithHostProject()
{
    var runner = new FakeProcessRunner();
    runner.Enqueue(new ProcessResult(0, "Build succeeded", "", TimeSpan.FromSeconds(1)));

    var paths = new HotReplPaths(
        RepoRoot: "/repo",
        GamePath: "/game",
        ModsPath: "/game/Mods",
        MelonLoaderPath: "/game/MelonLoader",
        Il2CppAssembliesPath: "/game/MelonLoader/Il2CppAssemblies",
        HotReplRepoPath: "/repo/../HotRepl",
        HostProjectPath: "/repo/../HotRepl/src/HotRepl.Host.MelonLoader/HotRepl.Host.MelonLoader.csproj",
        HostOutputPath: "/repo/../HotRepl/src/HotRepl.Host.MelonLoader/bin/Debug/net6.0");

    var exit = await HotReplDeployer.BuildAsync(paths, "Debug", runner, CancellationToken.None);

    Assert.Equal(0, exit);
    Assert.Single(runner.Calls);
    var call = runner.Calls[0];
    Assert.Equal("dotnet", call.Program);
    Assert.Contains("build", call.Arguments);
    Assert.Contains(paths.HostProjectPath, call.Arguments);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter Build_InvokesDotnetBuildWithHostProject`

Expected: FAIL (`BuildAsync` does not exist; existing `Build` is synchronous and uses `Process.Start`).

- [ ] **Step 3: Refactor HotReplDeployer**

Replace the existing `Build` method with an async overload that takes `IProcessRunner`. Keep file-copy logic (`Deploy`) as-is; only the build invocation changes.

```csharp
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
```

Delete the old synchronous `Build` method.

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~HotReplDeployerTests`

Expected: PASS (both old file-copy tests and new IProcessRunner test).

- [ ] **Step 5: Update Program.cs old-style caller**

The existing `Program.RunHotReplDeploy` still calls the synchronous `Build`. Update it to call the async version, awaiting via `.GetAwaiter().GetResult()` for now (Phase 2 replaces the caller entirely):

```csharp
var runner = new CliWrapProcessRunner();
var buildExit = HotReplDeployer.BuildAsync(paths, configuration, runner, CancellationToken.None).GetAwaiter().GetResult();
```

- [ ] **Step 6: Verify existing CLI still works**

Run: `dotnet build build-tool/ --nologo -v q`

Expected: PASS, no warnings.

- [ ] **Step 7: Commit**

```sh
git add build-tool/HotRepl/HotReplDeployer.cs build-tool/Program.cs tests/BuildTool.Tests/HotReplDeployerTests.cs
git commit -m "refactor(build-tool): route HotReplDeployer build through IProcessRunner"
```

---

### Task 9: Add ProfileWriter (HotRepl profile upsert)

**Files:**
- Create: `build-tool/HotRepl/ProfileWriter.cs`
- Create: `tests/BuildTool.Tests/ProfileWriterTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
using System.IO;
using System.Text.Json;
using BuildTool.HotRepl;
using Xunit;

namespace BuildTool.Tests;

public class ProfileWriterTests
{
    [Fact]
    public void Upsert_CreatesProfileFileWhenAbsent()
    {
        var path = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());

        ProfileWriter.Upsert(path, profileName: "ancient-kingdoms", url: "ws://127.0.0.1:18590",
            authSource: "env", authName: "HOTREPL_TOKEN");

        var doc = JsonDocument.Parse(File.ReadAllText(path));
        var profile = doc.RootElement.GetProperty("profiles").GetProperty("ancient-kingdoms");
        Assert.Equal("ws://127.0.0.1:18590", profile.GetProperty("url").GetString());
        Assert.Equal("env", profile.GetProperty("auth").GetProperty("source").GetString());
        Assert.Equal("HOTREPL_TOKEN", profile.GetProperty("auth").GetProperty("name").GetString());
        File.Delete(path);
    }

    [Fact]
    public void Upsert_PreservesOtherProfiles()
    {
        var path = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
        File.WriteAllText(path, """
            {
              "schemaVersion": 1,
              "profiles": {
                "other": { "url": "ws://example/" }
              }
            }
            """);

        ProfileWriter.Upsert(path, profileName: "ancient-kingdoms", url: "ws://127.0.0.1:18590",
            authSource: "env", authName: "HOTREPL_TOKEN");

        var doc = JsonDocument.Parse(File.ReadAllText(path));
        var profiles = doc.RootElement.GetProperty("profiles");
        Assert.True(profiles.TryGetProperty("other", out _));
        Assert.True(profiles.TryGetProperty("ancient-kingdoms", out _));
        File.Delete(path);
    }

    [Fact]
    public void Upsert_ReplacesExistingEntry()
    {
        var path = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
        File.WriteAllText(path, """
            {
              "schemaVersion": 1,
              "profiles": {
                "ancient-kingdoms": { "url": "ws://old/" }
              }
            }
            """);

        ProfileWriter.Upsert(path, profileName: "ancient-kingdoms", url: "ws://new/",
            authSource: "env", authName: "HOTREPL_TOKEN");

        var doc = JsonDocument.Parse(File.ReadAllText(path));
        var profile = doc.RootElement.GetProperty("profiles").GetProperty("ancient-kingdoms");
        Assert.Equal("ws://new/", profile.GetProperty("url").GetString());
        File.Delete(path);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~ProfileWriterTests`

Expected: FAIL.

- [ ] **Step 3: Implement HotRepl/ProfileWriter.cs**

```csharp
using System.Text.Json;
using System.Text.Json.Nodes;

namespace BuildTool.HotRepl;

public static class ProfileWriter
{
    public static void Upsert(
        string profileFilePath,
        string profileName,
        string url,
        string authSource,
        string authName)
    {
        JsonObject root;
        if (File.Exists(profileFilePath))
        {
            var existing = JsonNode.Parse(File.ReadAllText(profileFilePath));
            root = existing as JsonObject ?? new JsonObject();
        }
        else
        {
            root = new JsonObject { ["schemaVersion"] = 1 };
        }

        if (root["profiles"] is not JsonObject profiles)
        {
            profiles = new JsonObject();
            root["profiles"] = profiles;
        }

        profiles[profileName] = new JsonObject
        {
            ["url"] = url,
            ["auth"] = new JsonObject
            {
                ["source"] = authSource,
                ["name"] = authName,
            },
        };

        var directory = Path.GetDirectoryName(profileFilePath);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            Directory.CreateDirectory(directory);

        var tempPath = profileFilePath + ".tmp";
        var json = root.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(tempPath, json);
        File.Move(tempPath, profileFilePath, overwrite: true);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~ProfileWriterTests`

Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add build-tool/HotRepl/ProfileWriter.cs tests/BuildTool.Tests/ProfileWriterTests.cs
git commit -m "feat(build-tool): add HotRepl profile writer"
```

---

## Phase 2 — Command surface cutover

This phase replaces the static `Program.Main` dispatch with Spectre.Console.Cli. Commands are implemented one at a time as Spectre `Command<TSettings>` classes; the existing static methods stay live until the final cutover commit.

### Task 10: Scaffold Spectre Settings and Command types (no wiring yet)

**Files:**
- Create: `build-tool/Commands/BaseSettings.cs`
- Create: `build-tool/Commands/SetupCommand.cs` (stub)
- Create: `build-tool/Commands/BuildCommand.cs` (stub)
- Create: `build-tool/Commands/DeployCommand.cs` (stub)
- Create: `build-tool/Commands/DeployHostCommand.cs` (stub)
- Create: `build-tool/Commands/LaunchCommand.cs` (stub)
- Create: `build-tool/Commands/ExportCommand.cs` (stub)
- Create: `build-tool/Commands/UpdateCommand.cs` (stub)
- Create: `tests/BuildTool.Tests/CommandRegistrationTests.cs`

- [ ] **Step 1: Write failing registration test**

```csharp
using BuildTool.Commands;
using Spectre.Console.Cli;
using Xunit;

namespace BuildTool.Tests;

public class CommandRegistrationTests
{
    [Fact]
    public void AllCommandsAreRegisteredWithExpectedVerbs()
    {
        var app = new CommandApp();
        app.Configure(config =>
        {
            config.AddCommand<SetupCommand>("setup");
            config.AddCommand<BuildCommand>("build");
            config.AddCommand<DeployCommand>("deploy");
            config.AddCommand<DeployHostCommand>("deploy-host");
            config.AddCommand<LaunchCommand>("launch");
            config.AddCommand<ExportCommand>("export");
            config.AddCommand<UpdateCommand>("update");
        });

        // If any registration line fails to compile or throws, the test fails.
        Assert.NotNull(app);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~CommandRegistrationTests`

Expected: FAIL (command classes do not exist).

- [ ] **Step 3: Create Commands/BaseSettings.cs**

```csharp
using System.ComponentModel;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public class BaseSettings : CommandSettings
{
    [CommandOption("--json")]
    [Description("Emit machine-readable JSON envelope on stdout (stderr on failure).")]
    public bool Json { get; set; }

    [CommandOption("--quiet")]
    [Description("Suppress non-essential human output.")]
    public bool Quiet { get; set; }

    [CommandOption("--verbose")]
    [Description("Emit verbose human output.")]
    public bool Verbose { get; set; }

    [CommandOption("--no-color")]
    [Description("Disable ANSI colour in human output.")]
    public bool NoColor { get; set; }
}
```

- [ ] **Step 4: Create Commands/*.cs stubs**

For each of the seven commands, create a stub `AsyncCommand<TSettings>` that throws `NotImplementedException`. Example:

```csharp
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class SetupCommand : AsyncCommand<SetupCommand.Settings>
{
    public sealed class Settings : BaseSettings { }

    public override Task<int> ExecuteAsync(CommandContext context, Settings settings) =>
        throw new NotImplementedException("Filled in Task 11.");
}
```

Repeat for `BuildCommand`, `DeployCommand`, `DeployHostCommand`, `LaunchCommand`, `ExportCommand`, `UpdateCommand` with their own `Settings` nested class (each inheriting from `BaseSettings`).

For `LaunchCommand.Settings`, add:

```csharp
[CommandOption("--wait")]
[Description("Block until the MelonLoader bootstrap banner appears.")]
public bool Wait { get; set; }

[CommandOption("--export")]
[Description("Pass --export-data to the game on launch.")]
public bool Export { get; set; }
```

For `ExportCommand.Settings`, add:

```csharp
[CommandOption("--screenshots")]
[Description("Also capture map screenshots.")]
public bool Screenshots { get; set; }

[CommandOption("--update")]
[Description("Run steamcmd app_update before export.")]
public bool Update { get; set; }
```

For `SetupCommand.Settings`, add (after Phase 2):

```csharp
[CommandOption("--non-interactive")]
[Description("Use defaults without prompting; suitable for CI.")]
public bool NonInteractive { get; set; }
```

(Other commands have no extra options at this point.)

- [ ] **Step 5: Run test to verify it passes**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~CommandRegistrationTests`

Expected: PASS.

- [ ] **Step 6: Commit**

```sh
git add build-tool/Commands/ tests/BuildTool.Tests/CommandRegistrationTests.cs
git commit -m "feat(build-tool): scaffold Spectre command types"
```

---

### Task 11: Implement SetupCommand

Move setup logic out of `Program.RunSetup` into `SetupCommand`. Add the optional HotRepl profile upsert offer.

**Files:**
- Modify: `build-tool/Commands/SetupCommand.cs`
- Modify: `build-tool/Program.cs` (delegate the old switch case to the new command)
- Create: `tests/BuildTool.Tests/SetupCommandTests.cs`

- [ ] **Step 1: Write failing tests for non-interactive shape**

Setup is interactive by design; we test the non-interactive branch (CI usage):

```csharp
using System.IO;
using System.Threading.Tasks;
using BuildTool.Commands;
using Spectre.Console.Cli;
using Xunit;

namespace BuildTool.Tests;

public class SetupCommandTests
{
    [Fact]
    public async Task NonInteractive_WithExistingPropsFile_PreservesValues()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var propsPath = Path.Combine(tempRoot, "Local.props");
        File.WriteAllText(propsPath, """
            <Project>
              <PropertyGroup>
                <ANCIENT_KINGDOMS_PATH>C:\Games\AK</ANCIENT_KINGDOMS_PATH>
                <DATA_EXPORT_PATH>C:\export</DATA_EXPORT_PATH>
              </PropertyGroup>
            </Project>
            """);

        var settings = new SetupCommand.Settings { NonInteractive = true };
        var command = new SetupCommand(tempRoot);
        var result = await command.ExecuteAsync(null!, settings);

        Assert.Equal(0, result);
        var contents = File.ReadAllText(propsPath);
        Assert.Contains("C:\\Games\\AK", contents);
        Directory.Delete(tempRoot, recursive: true);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~SetupCommandTests`

Expected: FAIL (`SetupCommand` still throws `NotImplementedException`).

- [ ] **Step 3: Implement SetupCommand**

Port the existing `Program.RunSetup`, `Program.Prompt`, `Program.DetectGamePath`, `Program.DetectWinePath`, `Program.DeriveWinePrefix`, and `Program.WriteLocalProps` helpers into `SetupCommand` (or into `Configuration/LocalConfigWriter.cs` if you prefer to keep the command lean — recommended). The non-interactive branch reads existing values and rewrites the file unchanged.

After writing `Local.props`, in interactive mode prompt:

> "Add an 'ancient-kingdoms' profile to your HotRepl profile file? (y/N): "

Default no. On yes, ask for token source (env / token-file / inline), then call `ProfileWriter.Upsert(...)` with the user's HotRepl profile file path (platform default: `~/Library/Application Support/HotRepl/profiles.json` on macOS, `%LOCALAPPDATA%\HotRepl\profiles.json` on Windows, `~/.config/hotrepl/profiles.json` on Linux).

In non-interactive mode, the profile prompt is skipped entirely.

- [ ] **Step 4: Update Program.cs**

Replace the existing `"setup" => RunSetup()` branch with a call into `SetupCommand`:

```csharp
"setup" => SetupCommand.Invoke(RootDir!, args).GetAwaiter().GetResult(),
```

Add a static `Invoke` helper on `SetupCommand` if useful, or temporarily construct the command directly. The goal is for the existing `dotnet run --project build-tool setup` invocation to continue working through the new command class.

- [ ] **Step 5: Run tests and verify the CLI still works**

```sh
dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~SetupCommandTests
dotnet build build-tool/ --nologo -v q
```

Expected: tests pass, build clean.

- [ ] **Step 6: Commit**

```sh
git add build-tool/Commands/SetupCommand.cs build-tool/Program.cs tests/BuildTool.Tests/SetupCommandTests.cs build-tool/Configuration/LocalConfigWriter.cs
git commit -m "feat(build-tool): implement SetupCommand with optional profile upsert"
```

---

### Task 12: Implement BuildCommand

Move build logic from `Program.BuildMods` into `BuildCommand`. Use `IProcessRunner` for the `dotnet build` invocations.

**Files:**
- Modify: `build-tool/Commands/BuildCommand.cs`
- Modify: `build-tool/Program.cs`
- Create: `tests/BuildTool.Tests/BuildCommandTests.cs`

- [ ] **Step 1: Write failing test**

```csharp
using System.IO;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Commands;
using Xunit;

namespace BuildTool.Tests;

public class BuildCommandTests
{
    [Fact]
    public async Task InvokesDotnetBuildForEachModProject()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var modsRoot = Path.Combine(tempRoot, "mods");
        Directory.CreateDirectory(Path.Combine(modsRoot, "ModA"));
        Directory.CreateDirectory(Path.Combine(modsRoot, "ModB"));
        File.WriteAllText(Path.Combine(modsRoot, "ModA", "ModA.csproj"), "<Project/>");
        File.WriteAllText(Path.Combine(modsRoot, "ModB", "ModB.csproj"), "<Project/>");

        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "", "", default));
        runner.Enqueue(new ProcessResult(0, "", "", default));

        var command = new BuildCommand(tempRoot, runner);
        var result = await command.ExecuteAsync(null!, new BuildCommand.Settings());

        Assert.Equal(0, result);
        Assert.Equal(2, runner.Calls.Count);
        Assert.All(runner.Calls, call => Assert.Equal("dotnet", call.Program));
        Assert.All(runner.Calls, call => Assert.Contains("build", call.Arguments));
        Directory.Delete(tempRoot, recursive: true);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~BuildCommandTests`

Expected: FAIL.

- [ ] **Step 3: Implement BuildCommand**

```csharp
using System.IO;
using BuildTool.Abstractions;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class BuildCommand : AsyncCommand<BuildCommand.Settings>
{
    public sealed class Settings : BaseSettings { }

    private readonly string _repoRoot;
    private readonly IProcessRunner _runner;

    public BuildCommand(string repoRoot, IProcessRunner runner)
    {
        _repoRoot = repoRoot;
        _runner = runner;
    }

    public override async Task<int> ExecuteAsync(CommandContext context, Settings settings)
    {
        var modsRoot = Path.Combine(_repoRoot, "mods");
        if (!Directory.Exists(modsRoot)) return 0;

        foreach (var csproj in Directory.EnumerateFiles(modsRoot, "*.csproj", SearchOption.AllDirectories))
        {
            var request = new ProcessRequest(
                Program: "dotnet",
                Arguments: new[] { "build", csproj, "--nologo", "-v", "q" });
            var result = await _runner.RunAsync(request, CancellationToken.None);
            if (result.ExitCode != 0) return result.ExitCode;
        }
        return 0;
    }
}
```

- [ ] **Step 4: Update Program.cs**

Replace the `"build"` and `"all"` branches:

```csharp
"build" => new BuildCommand(RootDir!, new CliWrapProcessRunner()).ExecuteAsync(null!, new BuildCommand.Settings()).GetAwaiter().GetResult(),
"all" => (new BuildCommand(RootDir!, new CliWrapProcessRunner()).ExecuteAsync(null!, new BuildCommand.Settings()).GetAwaiter().GetResult() is 0 ? DeployMods() : 1),
```

(`DeployMods` is updated in Task 13.)

- [ ] **Step 5: Run tests and verify CLI**

```sh
dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~BuildCommandTests
dotnet build build-tool/ --nologo -v q
```

- [ ] **Step 6: Commit**

```sh
git add build-tool/Commands/BuildCommand.cs build-tool/Program.cs tests/BuildTool.Tests/BuildCommandTests.cs
git commit -m "feat(build-tool): implement BuildCommand"
```

---

### Task 13: Implement DeployCommand

Move deploy logic from `Program.DeployMods` into `DeployCommand`. Pure file operations; no subprocess.

**Files:**
- Modify: `build-tool/Commands/DeployCommand.cs`
- Modify: `build-tool/Program.cs`
- Create: `tests/BuildTool.Tests/DeployCommandTests.cs`

- [ ] **Step 1: Write failing test**

Mirror existing `Program.DeployMods` behaviour (copies built `*.dll` from `mods/*/bin/Debug/*/` into `$(ModsPath)`). Test asserts on filesystem effects using temp dirs.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement DeployCommand**

Port the file-copy logic verbatim from `Program.DeployMods`. Use `LocalConfig.ModsPath` as the destination.

- [ ] **Step 4: Update Program.cs**

Replace `"deploy" => DeployMods()` with a call into the new command. Remove the old `DeployMods` static method.

- [ ] **Step 5: Run tests and verify CLI**

- [ ] **Step 6: Commit**

```sh
git add build-tool/Commands/DeployCommand.cs build-tool/Program.cs tests/BuildTool.Tests/DeployCommandTests.cs
git commit -m "feat(build-tool): implement DeployCommand"
```

---

### Task 14: Implement DeployHostCommand

Port the existing `Program.RunHotReplDeploy` logic. This is the rename from `hotrepl-deploy` to `deploy-host`. The old verb is still wired in Program.cs's switch for now — both names dispatch to the same command class.

**Files:**
- Modify: `build-tool/Commands/DeployHostCommand.cs`
- Modify: `build-tool/Program.cs`
- Create: `tests/BuildTool.Tests/DeployHostCommandTests.cs`

- [ ] **Step 1: Write failing test**

Test asserts that `DeployHostCommand` invokes `HotReplDeployer.BuildAsync` and `HotReplDeployer.Deploy` in order with the configured paths.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement DeployHostCommand**

Inject `IProcessRunner` and call `HotReplDeployer.BuildAsync` (Task 8). On success, call `HotReplDeployer.Deploy` (existing file-copy logic).

- [ ] **Step 4: Update Program.cs**

Replace `"hotrepl-deploy" => RunHotReplDeploy(args)` with a call to `DeployHostCommand`. Keep the `"hotrepl-deploy"` string in the switch for now — Phase 2 finale removes the old name when the Spectre wiring takes over.

- [ ] **Step 5: Run tests and verify CLI**

- [ ] **Step 6: Commit**

```sh
git add build-tool/Commands/DeployHostCommand.cs build-tool/Program.cs tests/BuildTool.Tests/DeployHostCommandTests.cs
git commit -m "feat(build-tool): implement DeployHostCommand"
```

---

### Task 15: Implement LaunchCommand

Port `Program.RunHotReplLaunch`. Drop `WaitForPort`; replace with MelonLoader-banner detection via `LogStream` when `--wait` is set.

**Files:**
- Modify: `build-tool/Commands/LaunchCommand.cs`
- Modify: `build-tool/Program.cs`
- Create: `tests/BuildTool.Tests/LaunchCommandTests.cs`

- [ ] **Step 1: Write failing test**

```csharp
[Fact]
public async Task BuildsLaunchRequest_AppendsExportArgWhenSet()
{
    var config = new LocalConfig(
        GamePath: "/game",
        DataExportPath: "/export",
        WinePath: "/wine",
        WinePrefix: "/prefix");
    var runner = new FakeProcessRunner();
    runner.Enqueue(new ProcessResult(0, "", "", default));

    var settings = new LaunchCommand.Settings { Export = true };
    var command = new LaunchCommand(config, runner, isMacOs: true);
    var result = await command.ExecuteAsync(null!, settings);

    Assert.Equal(0, result);
    Assert.Single(runner.Calls);
    Assert.Contains("--export-data", runner.Calls[0].Arguments);
}
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement LaunchCommand**

```csharp
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.Game;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class LaunchCommand : AsyncCommand<LaunchCommand.Settings>
{
    public sealed class Settings : BaseSettings
    {
        [CommandOption("--wait")] public bool Wait { get; set; }
        [CommandOption("--export")] public bool Export { get; set; }
    }

    private readonly LocalConfig _config;
    private readonly IProcessRunner _runner;
    private readonly bool _isMacOs;

    public LaunchCommand(LocalConfig config, IProcessRunner runner, bool isMacOs)
    {
        _config = config;
        _runner = runner;
        _isMacOs = isMacOs;
    }

    public override async Task<int> ExecuteAsync(CommandContext context, Settings settings)
    {
        var gameArgs = settings.Export ? new[] { "--export-data" } : Array.Empty<string>();
        var request = GameLauncher.BuildLaunchRequest(_config, gameArgs, _isMacOs);

        if (!settings.Wait)
        {
            // Fire and forget — return immediately.
            _ = _runner.RunAsync(request, CancellationToken.None);
            return 0;
        }

        var logPath = Path.Combine(_config.MelonLoaderPath, "Latest.log");
        Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
        File.WriteAllText(logPath, "");

        using var bannerCts = new CancellationTokenSource(TimeSpan.FromSeconds(120));
        var bannerTask = WaitForBannerAsync(logPath, bannerCts.Token);
        var runTask = _runner.RunAsync(request, CancellationToken.None);

        var completed = await Task.WhenAny(bannerTask, runTask);
        if (completed == bannerTask && await bannerTask)
            return 0;
        if (completed == runTask)
            return runTask.Result.ExitCode == 0 ? 0 : 7;
        return 6;
    }

    private static async Task<bool> WaitForBannerAsync(string logPath, CancellationToken cancellationToken)
    {
        var stream = new LogStream(logPath, TimeSpan.FromMilliseconds(200));
        var buffer = new System.Text.StringBuilder();
        try
        {
            await foreach (var chunk in stream.ReadAsync(cancellationToken))
            {
                buffer.Append(chunk);
                Console.Write(chunk);
                if (buffer.ToString().Contains("MelonLoader Loaded.", StringComparison.Ordinal))
                    return true;
            }
        }
        catch (OperationCanceledException) { }
        return false;
    }
}
```

Banner string: `MelonLoader Loaded.` (confirm against `MelonLoader/Latest.log` from a recent run). On timeout (120s default) we return exit code 6. On game exit before banner we return exit code 7. The 120-second default may be tuned via a `--timeout` option in a follow-up; not in v1.

- [ ] **Step 4: Update Program.cs**

Replace `"hotrepl-launch" => RunHotReplLaunch(args)` with a call to `LaunchCommand`. The old `"hotrepl-launch"` string stays in the switch until the Phase 2 finale.

- [ ] **Step 5: Run tests and verify CLI**

- [ ] **Step 6: Commit**

```sh
git add build-tool/Commands/LaunchCommand.cs build-tool/Program.cs tests/BuildTool.Tests/LaunchCommandTests.cs
git commit -m "feat(build-tool): implement LaunchCommand without TCP port poll"
```

---

### Task 16: Implement ExportCommand (preserving marker detection for now)

Port `Program.RunExport`. In this task, marker detection (`logContent.Contains("All exports complete. Quitting.")`) is preserved exactly as it is today — the result-file integration is Phase 3.

**Files:**
- Modify: `build-tool/Commands/ExportCommand.cs`
- Modify: `build-tool/Program.cs`
- Create: `tests/BuildTool.Tests/ExportCommandTests.cs`

- [ ] **Step 1: Write failing test for argument construction**

Test that `--export-data` and `--export-screenshots` are passed to the game when set, and that `update` triggers a Steam update step first.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement ExportCommand**

Port from `Program.RunExport`. Inject `IProcessRunner` for game launch and `steamcmd` invocation. Marker detection stays string-based via `LogStream`. Final exit: `0` if marker observed, `7` if process exits without marker, `6` on timeout.

- [ ] **Step 4: Update Program.cs**

Replace `"export" => RunExport(args)`.

- [ ] **Step 5: Run tests and verify CLI**

- [ ] **Step 6: Commit**

```sh
git add build-tool/Commands/ExportCommand.cs build-tool/Program.cs tests/BuildTool.Tests/ExportCommandTests.cs
git commit -m "feat(build-tool): implement ExportCommand preserving marker detection"
```

---

### Task 17: Implement UpdateCommand

Port `Program.RunSteamUpdate`. Wraps `steamcmd app_update` via `IProcessRunner`.

**Files:**
- Modify: `build-tool/Commands/UpdateCommand.cs`
- Modify: `build-tool/Program.cs`
- Create: `tests/BuildTool.Tests/UpdateCommandTests.cs`

- [ ] **Step 1: Write failing test**

Assert that `UpdateCommand` invokes `steamcmd` with `+app_update` and the correct game app ID (currently hard-coded; preserve that).

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement UpdateCommand**

- [ ] **Step 4: Update Program.cs**

Replace the old `"update"` branch if any (currently `export --update` is the only invocation; expose `update` as a standalone verb).

- [ ] **Step 5: Run tests and verify CLI**

- [ ] **Step 6: Commit**

```sh
git add build-tool/Commands/UpdateCommand.cs build-tool/Program.cs tests/BuildTool.Tests/UpdateCommandTests.cs
git commit -m "feat(build-tool): implement UpdateCommand"
```

---

### Task 18: Cut over Program.cs to Spectre CommandApp

The final Phase 2 commit. Replace the entire static `Main` switch with Spectre.Console.Cli's `CommandApp`. Delete obsolete code in the same commit.

**Files:**
- Modify: `build-tool/Program.cs`
- Delete: `build-tool/HotRepl/HotReplLauncher.cs` (logic moved to `Game/`)
- Delete: `build-tool/HotRepl/HotReplSmokeRunner.cs`
- Delete: `tests/BuildTool.Tests/HotReplSmokeTests.cs`
- Delete: `tests/BuildTool.Tests/HotReplLauncherTests.cs` (covered by `PlatformEnvironmentTests`)

- [ ] **Step 1: Replace Program.cs**

```csharp
using BuildTool.Abstractions;
using BuildTool.Commands;
using BuildTool.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Spectre.Console.Cli;
using Spectre.Console.Cli.Extensions.DependencyInjection;

namespace BuildTool;

public static class Program
{
    public static int Main(string[] args)
    {
        var rootDir = FindRepoRoot();
        var propsPath = Path.Combine(rootDir, "Local.props");

        var services = new ServiceCollection();
        services.AddSingleton<IProcessRunner, CliWrapProcessRunner>();
        services.AddSingleton(_ => rootDir);
        services.AddSingleton(_ => File.Exists(propsPath) ? LocalConfigLoader.Load(propsPath) : LocalConfig.Empty);
        services.AddSingleton(_ => OperatingSystem.IsMacOS());

        using var registrar = new DependencyInjectionRegistrar(services);
        var app = new CommandApp(registrar);
        app.Configure(config =>
        {
            config.SetApplicationName("build-tool");
            config.AddCommand<SetupCommand>("setup").WithDescription("Configure Local.props (interactive).");
            config.AddCommand<BuildCommand>("build").WithDescription("Build all mods.");
            config.AddCommand<DeployCommand>("deploy").WithDescription("Copy built mods to the game Mods directory.");
            config.AddCommand<DeployHostCommand>("deploy-host").WithDescription("Build and deploy HotRepl host.");
            config.AddCommand<LaunchCommand>("launch").WithDescription("Launch Ancient Kingdoms.");
            config.AddCommand<ExportCommand>("export").WithDescription("Launch with --export-data and capture results.");
            config.AddCommand<UpdateCommand>("update").WithDescription("Run steamcmd app_update.");
        });
        return app.Run(args);
    }

    private static string FindRepoRoot()
    {
        var dir = Path.GetDirectoryName(Path.GetDirectoryName(AppContext.BaseDirectory))!;
        while (dir != null && !File.Exists(Path.Combine(dir, "Local.props.example")))
            dir = Directory.GetParent(dir)?.FullName;
        if (dir is null)
            throw new InvalidOperationException("Could not find repository root (looking for Local.props.example).");
        return dir;
    }
}
```

Add `LocalConfig.Empty` static property if needed for the no-props-file case (used by `setup` before the file exists):

```csharp
public static LocalConfig Empty => new(
    GamePath: "",
    DataExportPath: "",
    WinePath: null,
    WinePrefix: null);
```

- [ ] **Step 2: Delete obsolete files**

```sh
rm build-tool/HotRepl/HotReplLauncher.cs
rm build-tool/HotRepl/HotReplSmokeRunner.cs
rm tests/BuildTool.Tests/HotReplSmokeTests.cs
rm tests/BuildTool.Tests/HotReplLauncherTests.cs
```

If `Program.cs` had a `Quote` helper, ensure it's gone.

- [ ] **Step 3: Verify build and tests**

```sh
dotnet build build-tool/ --nologo -v q
dotnet test tests/BuildTool.Tests/ --nologo -v q
```

Expected: PASS.

- [ ] **Step 4: Manually verify CLI surface**

```sh
dotnet run --project build-tool -- --help
dotnet run --project build-tool -- setup --help
dotnet run --project build-tool -- deploy-host --help
dotnet run --project build-tool -- launch --help
```

Expected: Spectre renders the help tree with the seven commands and their options.

- [ ] **Step 5: Commit**

```sh
git add build-tool/Program.cs build-tool/HotRepl/ tests/BuildTool.Tests/
git commit -m "refactor(build-tool): cut over Program.cs to Spectre CommandApp"
```

---

## Phase 3 — Export completion signal

DataExporter writes a structured JSON result file as part of `ExportAllData()`. `build-tool`'s `ExportCommand` reads that file as the canonical completion signal, replacing the legacy log-marker grep. The MelonLoader log keeps streaming to the human terminal but is no longer load-bearing for success detection.

### Task 19: Add ExportRunResult types and ExportResultFile writer in DataExporter

**Files:**
- Create: `mods/DataExporter/Models/ExportRunResult.cs`
- Create: `mods/DataExporter/Models/ExporterRunResult.cs`
- Create: `mods/DataExporter/Models/ExporterRunError.cs`
- Create: `mods/DataExporter/ExportResultFile.cs`

- [ ] **Step 1: Create the POCOs**

`Models/ExporterRunError.cs`:

```csharp
using Newtonsoft.Json;

namespace DataExporter.Models
{
    public sealed class ExporterRunError
    {
        [JsonProperty("kind")] public string Kind { get; set; } = "exporter_failed";
        [JsonProperty("message")] public string Message { get; set; } = "";
        [JsonProperty("details", NullValueHandling = NullValueHandling.Ignore)]
        public object? Details { get; set; }
    }
}
```

`Models/ExporterRunResult.cs`:

```csharp
using Newtonsoft.Json;

namespace DataExporter.Models
{
    public sealed class ExporterRunResult
    {
        [JsonProperty("name")] public string Name { get; set; } = "";
        [JsonProperty("ok")] public bool Ok { get; set; }
        [JsonProperty("required")] public bool Required { get; set; } = true;
        [JsonProperty("count", NullValueHandling = NullValueHandling.Ignore)]
        public int? Count { get; set; }
        [JsonProperty("outputPath", NullValueHandling = NullValueHandling.Ignore)]
        public string? OutputPath { get; set; }
        [JsonProperty("error", NullValueHandling = NullValueHandling.Ignore)]
        public ExporterRunError? Error { get; set; }
    }
}
```

`Models/ExportRunResult.cs`:

```csharp
using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace DataExporter.Models
{
    public sealed class ExportRunResult
    {
        [JsonProperty("schemaVersion")] public int SchemaVersion { get; set; } = 1;
        [JsonProperty("ok")] public bool Ok { get; set; }
        [JsonProperty("startedAt")] public DateTime StartedAt { get; set; }
        [JsonProperty("completedAt")] public DateTime CompletedAt { get; set; }
        [JsonProperty("durationMs")] public long DurationMs { get; set; }
        [JsonProperty("exporters")] public List<ExporterRunResult> Exporters { get; set; } = new();
        [JsonProperty("errors")] public List<string> Errors { get; set; } = new();
    }
}
```

- [ ] **Step 2: Create ExportResultFile.cs (atomic writer)**

```csharp
using System;
using System.IO;
using DataExporter.Models;
using Newtonsoft.Json;

namespace DataExporter
{
    public static class ExportResultFile
    {
        public const string FileName = ".exporter-result.json";

        public static void Write(string directory, ExportRunResult result)
        {
            if (!Directory.Exists(directory))
                Directory.CreateDirectory(directory);

            var finalPath = Path.Combine(directory, FileName);
            var tempPath = finalPath + ".tmp";
            var json = JsonConvert.SerializeObject(result, Formatting.Indented);
            File.WriteAllText(tempPath, json);
            if (File.Exists(finalPath)) File.Delete(finalPath);
            File.Move(tempPath, finalPath);
        }
    }
}
```

- [ ] **Step 3: Verify mod builds**

Run: `dotnet build mods/DataExporter/ --nologo -v q`

Expected: PASS.

- [ ] **Step 4: Commit**

```sh
git add mods/DataExporter/Models/ mods/DataExporter/ExportResultFile.cs
git commit -m "feat(DataExporter): add result-file types and atomic writer"
```

---

### Task 20: Scaffold tests/DataExporter.Tests/ project

**Files:**
- Create: `tests/DataExporter.Tests/DataExporter.Tests.csproj`
- Create: `tests/DataExporter.Tests/ExportResultFileTests.cs`
- Create: `tests/DataExporter.Tests/ExportRunResultJsonTests.cs`
- Modify: `AncientKingdomsMods.sln` (add the new test project)

The mod itself depends on MelonLoader and IL2CPP assemblies which are not available in CI; tests cover only the parts of DataExporter that have no Unity dependency: the POCOs and `ExportResultFile`. The test project targets `net6.0` to match the mod's framework.

- [ ] **Step 1: Create the test csproj**

`tests/DataExporter.Tests/DataExporter.Tests.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.*" />
    <PackageReference Include="xunit" Version="2.*" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.*" />
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
  </ItemGroup>

  <ItemGroup>
    <Compile Include="..\..\mods\DataExporter\Models\ExporterRunError.cs" Link="Models\ExporterRunError.cs" />
    <Compile Include="..\..\mods\DataExporter\Models\ExporterRunResult.cs" Link="Models\ExporterRunResult.cs" />
    <Compile Include="..\..\mods\DataExporter\Models\ExportRunResult.cs" Link="Models\ExportRunResult.cs" />
    <Compile Include="..\..\mods\DataExporter\ExportResultFile.cs" Link="ExportResultFile.cs" />
  </ItemGroup>
</Project>
```

Rationale: file-link rather than `<ProjectReference>` because the mod csproj has heavy IL2CPP/Unity references that the test project must not pull in. The linked files compile against only Newtonsoft.Json.

- [ ] **Step 2: Add to solution**

Run: `dotnet sln AncientKingdomsMods.sln add tests/DataExporter.Tests/DataExporter.Tests.csproj`

- [ ] **Step 3: Write failing tests**

`tests/DataExporter.Tests/ExportResultFileTests.cs`:

```csharp
using System.IO;
using DataExporter;
using DataExporter.Models;
using Newtonsoft.Json.Linq;
using Xunit;

namespace DataExporter.Tests
{
    public class ExportResultFileTests
    {
        [Fact]
        public void Write_ProducesWellFormedJson()
        {
            var dir = Directory.CreateTempSubdirectory().FullName;
            try
            {
                var result = new ExportRunResult
                {
                    Ok = true,
                    Exporters =
                    {
                        new ExporterRunResult { Name = "items", Ok = true, Count = 100, OutputPath = "items.json" },
                    },
                };

                ExportResultFile.Write(dir, result);

                var path = Path.Combine(dir, ExportResultFile.FileName);
                Assert.True(File.Exists(path));
                var json = JObject.Parse(File.ReadAllText(path));
                Assert.Equal(1, (int)json["schemaVersion"]!);
                Assert.True((bool)json["ok"]!);
                Assert.Equal("items", (string)json["exporters"]![0]!["name"]!);
            }
            finally { Directory.Delete(dir, recursive: true); }
        }

        [Fact]
        public void Write_IsAtomic_OverwritesExistingFile()
        {
            var dir = Directory.CreateTempSubdirectory().FullName;
            try
            {
                ExportResultFile.Write(dir, new ExportRunResult { Ok = false });
                ExportResultFile.Write(dir, new ExportRunResult { Ok = true });

                var path = Path.Combine(dir, ExportResultFile.FileName);
                var json = JObject.Parse(File.ReadAllText(path));
                Assert.True((bool)json["ok"]!);
            }
            finally { Directory.Delete(dir, recursive: true); }
        }
    }
}
```

`tests/DataExporter.Tests/ExportRunResultJsonTests.cs`:

```csharp
using DataExporter.Models;
using Newtonsoft.Json;
using Xunit;

namespace DataExporter.Tests
{
    public class ExportRunResultJsonTests
    {
        [Fact]
        public void RoundTrip_PreservesAllFields()
        {
            var original = new ExportRunResult
            {
                Ok = true,
                Exporters =
                {
                    new ExporterRunResult { Name = "ok", Ok = true, Required = true, Count = 5 },
                    new ExporterRunResult { Name = "fail", Ok = false, Required = false,
                        Error = new ExporterRunError { Kind = "exporter_failed", Message = "boom" } },
                },
            };

            var json = JsonConvert.SerializeObject(original);
            var roundTripped = JsonConvert.DeserializeObject<ExportRunResult>(json)!;

            Assert.Equal(2, roundTripped.Exporters.Count);
            Assert.Equal("fail", roundTripped.Exporters[1].Name);
            Assert.Equal("boom", roundTripped.Exporters[1].Error!.Message);
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test tests/DataExporter.Tests/ --nologo -v q`

Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add tests/DataExporter.Tests/ AncientKingdomsMods.sln
git commit -m "test(DataExporter): scaffold tests/DataExporter.Tests/ project"
```

---

### Task 21: Refactor DataExporter.ExportAllData to per-exporter try/catch and write result file

**Files:**
- Modify: `mods/DataExporter/DataExporter.cs`

- [ ] **Step 1: Change ExportAllData signature**

Change from `public void ExportAllData()` to `public ExportRunResult ExportAllData()`. The method now:

1. Records `StartedAt = DateTime.UtcNow`.
2. For each exporter, wraps the `.Export()` call in a small `RunExporter(string name, bool required, Action body)` helper that captures success/failure into an `ExporterRunResult`.
3. Computes top-level `Ok` as "every required exporter ok".
4. Records `CompletedAt`, `DurationMs`.
5. Calls `ExportResultFile.Write(ExportPath, result)`.
6. Returns the result.

The `RunExporter` helper:

```csharp
private ExporterRunResult RunExporter(string name, bool required, Action body)
{
    try
    {
        body();
        return new ExporterRunResult { Name = name, Ok = true, Required = required };
    }
    catch (Exception ex)
    {
        LoggerInstance.Error($"[{name}] export failed: {ex.Message}");
        LoggerInstance.Error(ex.StackTrace);
        return new ExporterRunResult
        {
            Name = name,
            Ok = false,
            Required = required,
            Error = new ExporterRunError { Kind = "exporter_failed", Message = ex.Message },
        };
    }
}
```

Convert each exporter call site from:

```csharp
var monsterExporter = new MonsterExporter(...);
monsterExporter.Export();
```

to:

```csharp
result.Exporters.Add(RunExporter("monsters", required: true, () =>
{
    var exporter = new MonsterExporter(LoggerInstance, ExportPath, visualAssets);
    exporter.Export();
}));
```

Wrap the visual-assets manifest write in its own `RunExporter("visualAssets.manifest", ...)`.

- [ ] **Step 2: Update AutoExporter to consume the result**

`mods/AutoExporter/AutoExporter.cs`: `dataExporterMod.ExportAllData()` now returns a result. AutoExporter doesn't need to inspect it (DataExporter writes the file itself), but the call expression must accept the new return type:

```csharp
var result = dataExporterMod.ExportAllData();
LoggerInstance.Msg($"[AutoExporter] Data export complete. ok={result.Ok}, exporters={result.Exporters.Count}.");
```

- [ ] **Step 3: Verify both mods build**

```sh
dotnet build mods/DataExporter/ --nologo -v q
dotnet build mods/AutoExporter/ --nologo -v q
```

Expected: PASS.

- [ ] **Step 4: Commit**

```sh
git add mods/DataExporter/DataExporter.cs mods/AutoExporter/AutoExporter.cs
git commit -m "feat(DataExporter): write structured result file and per-exporter status"
```

---

### Task 22: Add ExportResultReader in build-tool

**Files:**
- Create: `build-tool/Game/ExportResultReader.cs`
- Create: `tests/BuildTool.Tests/ExportResultReaderTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

public class ExportResultReaderTests
{
    [Fact]
    public async Task ReadAsync_ReturnsOutcome_WhenFileExistsWithSchemaVersion1()
    {
        var dir = Directory.CreateTempSubdirectory().FullName;
        try
        {
            var path = Path.Combine(dir, ".exporter-result.json");
            File.WriteAllText(path, """
                {
                  "schemaVersion": 1,
                  "ok": true,
                  "exporters": [{ "name": "items", "ok": true }],
                  "errors": []
                }
                """);

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            var outcome = await ExportResultReader.WaitForResultAsync(dir, TimeSpan.FromSeconds(1), cts.Token);

            Assert.True(outcome.Ok);
            Assert.Single(outcome.Exporters);
        }
        finally { Directory.Delete(dir, recursive: true); }
    }

    [Fact]
    public async Task ReadAsync_TimesOut_WhenFileNeverAppears()
    {
        var dir = Directory.CreateTempSubdirectory().FullName;
        try
        {
            var outcome = await ExportResultReader.WaitForResultAsync(dir, TimeSpan.FromMilliseconds(100), CancellationToken.None);
            Assert.True(outcome.TimedOut);
        }
        finally { Directory.Delete(dir, recursive: true); }
    }

    [Fact]
    public async Task ReadAsync_FailsOnUnknownSchemaVersion()
    {
        var dir = Directory.CreateTempSubdirectory().FullName;
        try
        {
            var path = Path.Combine(dir, ".exporter-result.json");
            File.WriteAllText(path, """{ "schemaVersion": 99, "ok": true }""");

            var outcome = await ExportResultReader.WaitForResultAsync(dir, TimeSpan.FromSeconds(1), CancellationToken.None);

            Assert.False(outcome.Ok);
            Assert.True(outcome.UnknownSchema);
        }
        finally { Directory.Delete(dir, recursive: true); }
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~ExportResultReaderTests`

Expected: FAIL.

- [ ] **Step 3: Implement ExportResultReader.cs**

```csharp
using System.Text.Json;

namespace BuildTool.Game;

public sealed record ExportOutcome(
    bool Ok,
    bool TimedOut,
    bool UnknownSchema,
    IReadOnlyList<ExporterOutcome> Exporters,
    string? ErrorMessage = null);

public sealed record ExporterOutcome(string Name, bool Ok, int? Count, string? OutputPath, string? ErrorMessage);

public static class ExportResultReader
{
    public const string FileName = ".exporter-result.json";
    public const int SupportedSchemaVersion = 1;

    public static async Task<ExportOutcome> WaitForResultAsync(string directory, TimeSpan timeout, CancellationToken cancellationToken)
    {
        var path = Path.Combine(directory, FileName);
        var deadline = DateTime.UtcNow + timeout;

        while (!cancellationToken.IsCancellationRequested)
        {
            if (File.Exists(path))
            {
                try { return Parse(await File.ReadAllTextAsync(path, cancellationToken)); }
                catch (IOException) { /* mid-write — retry */ }
            }
            if (DateTime.UtcNow >= deadline)
                return new ExportOutcome(false, TimedOut: true, UnknownSchema: false, Array.Empty<ExporterOutcome>());
            await Task.Delay(TimeSpan.FromMilliseconds(200), cancellationToken);
        }
        return new ExportOutcome(false, TimedOut: true, UnknownSchema: false, Array.Empty<ExporterOutcome>());
    }

    private static ExportOutcome Parse(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var version = root.GetProperty("schemaVersion").GetInt32();
        if (version != SupportedSchemaVersion)
            return new ExportOutcome(false, TimedOut: false, UnknownSchema: true, Array.Empty<ExporterOutcome>(),
                ErrorMessage: $"Unknown schemaVersion {version}");

        var ok = root.GetProperty("ok").GetBoolean();
        var exporters = new List<ExporterOutcome>();
        if (root.TryGetProperty("exporters", out var arr))
        {
            foreach (var e in arr.EnumerateArray())
            {
                exporters.Add(new ExporterOutcome(
                    Name: e.GetProperty("name").GetString() ?? "",
                    Ok: e.GetProperty("ok").GetBoolean(),
                    Count: e.TryGetProperty("count", out var c) ? c.GetInt32() : null,
                    OutputPath: e.TryGetProperty("outputPath", out var op) ? op.GetString() : null,
                    ErrorMessage: e.TryGetProperty("error", out var err) && err.TryGetProperty("message", out var m) ? m.GetString() : null));
            }
        }
        return new ExportOutcome(ok, TimedOut: false, UnknownSchema: false, exporters);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test tests/BuildTool.Tests/ --nologo -v q --filter FullyQualifiedName~ExportResultReaderTests`

Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add build-tool/Game/ExportResultReader.cs tests/BuildTool.Tests/ExportResultReaderTests.cs
git commit -m "feat(build-tool): add ExportResultReader"
```

---

### Task 23: Wire ExportResultReader into ExportCommand

**Files:**
- Modify: `build-tool/Commands/ExportCommand.cs`
- Modify: `tests/BuildTool.Tests/ExportCommandTests.cs`

- [ ] **Step 1: Write failing test**

```csharp
[Fact]
public async Task ReturnsSuccess_WhenResultFileShowsOkTrue()
{
    var exportDir = Directory.CreateTempSubdirectory().FullName;
    File.WriteAllText(Path.Combine(exportDir, ".exporter-result.json"), """
        { "schemaVersion": 1, "ok": true, "exporters": [], "errors": [] }
        """);

    var runner = new FakeProcessRunner();
    runner.Enqueue(new ProcessResult(0, "", "", default));

    var command = new ExportCommand(/* config with DataExportPath=exportDir */, runner, isMacOs: false);
    var result = await command.ExecuteAsync(null!, new ExportCommand.Settings());

    Assert.Equal(0, result);
}

[Fact]
public async Task ReturnsCommandFailed_WhenResultFileShowsOkFalse()
{
    var exportDir = Directory.CreateTempSubdirectory().FullName;
    File.WriteAllText(Path.Combine(exportDir, ".exporter-result.json"), """
        { "schemaVersion": 1, "ok": false, "exporters": [
            { "name": "items", "ok": false, "error": { "kind": "exporter_failed", "message": "boom" } }
        ], "errors": [] }
        """);

    var runner = new FakeProcessRunner();
    runner.Enqueue(new ProcessResult(0, "", "", default));

    var command = new ExportCommand(/* config */, runner, isMacOs: false);
    var result = await command.ExecuteAsync(null!, new ExportCommand.Settings());

    Assert.Equal(7, result);
}
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Update ExportCommand**

Replace the marker-watch logic with `await ExportResultReader.WaitForResultAsync(...)`. Map outcomes to exit codes per the spec:

| Outcome | Exit |
|---|---|
| `outcome.Ok` | 0 |
| `!outcome.Ok && !outcome.TimedOut && !outcome.UnknownSchema` | 7 |
| `outcome.TimedOut` | 6 |
| `outcome.UnknownSchema` | 7 |
| Game exits before file appears (process exit-then-no-file) | 7 |

The MelonLoader log still streams to the console for human visibility (via `LogStream`) but does not gate success.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```sh
git add build-tool/Commands/ExportCommand.cs tests/BuildTool.Tests/ExportCommandTests.cs
git commit -m "refactor(build-tool): replace marker grep with ExportResultReader"
```

---

## Phase 4 — Documentation and skill update

### Task 24: Update root CLAUDE.md and project-map.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/project-map.md`

- [ ] **Step 1: Update CLAUDE.md Quick Reference**

Replace the HotRepl block:

```text
# HotRepl runtime inspection (deploys from sibling ../HotRepl checkout)
dotnet run --project build-tool hotrepl-deploy
dotnet run --project build-tool hotrepl-launch --wait --timeout-seconds 30
dotnet run --project build-tool hotrepl-smoke
```

with:

```text
# HotRepl host deploy + game launch (build-tool owns these)
dotnet run --project build-tool deploy-host
dotnet run --project build-tool launch --wait

# REPL readiness, diagnostics, and control execution (hotrepl CLI owns these)
hotrepl --profile ancient-kingdoms wait --commands compendium.preflight
hotrepl --profile ancient-kingdoms doctor --json
```

Add a task trigger row in the Task Triggers table:

```text
| Inspecting live game state via HotRepl | Load skill: hotrepl-runtime-inspection |
```

Keep CLAUDE.md under 150 lines.

- [ ] **Step 2: Update docs/project-map.md**

Fix the "Windows only" wording on the `mods/` row to reflect cross-platform build with CrossOver/WINE for execution on macOS.

- [ ] **Step 3: Commit**

```sh
git add CLAUDE.md docs/project-map.md
git commit -m "docs: refresh HotRepl quick reference and project map"
```

---

### Task 25: Update mods/CLAUDE.md

**Files:**
- Modify: `mods/CLAUDE.md`

- [ ] **Step 1: Replace stale HotRepl section**

Remove `dotnet run --project build-tool hotrepl` and `hotrepl-smoke --world` from the Quick Start. Replace with:

```text
dotnet run --project build-tool deploy-host    # build & deploy HotRepl host into Mods/
dotnet run --project build-tool launch --wait  # launch game; wait for MelonLoader bootstrap
```

Point at the new skill for runtime inspection:

> For live game state inspection via HotRepl, load the `hotrepl-runtime-inspection` skill.

Remove the "HotRepl sidecar cleanup" note; that's an implementation detail of `HotReplDeployer`.

- [ ] **Step 2: Commit**

```sh
git add mods/CLAUDE.md
git commit -m "docs(mods): refresh HotRepl quick start"
```

---

### Task 26: Update Local.props.example

**Files:**
- Modify: `Local.props.example`

- [ ] **Step 1: Fix typo and WINE comment scope**

Replace `dotnet run - -project build-tool setup` with `dotnet run --project build-tool setup`.

Update the WINE comment from "Required for 'dotnet run --project build-tool export'" to "Required for `launch`, `export`, and any game-running command on macOS".

- [ ] **Step 2: Commit**

```sh
git add Local.props.example
git commit -m "docs: fix Local.props.example typo and WINE scope"
```

---

### Task 27: Update create-new-mod skill

**Files:**
- Modify: `.claude/skills/create-new-mod/SKILL.md`

- [ ] **Step 1: Align platform wording**

Replace Windows-only build language with cross-platform wording matching `mods/CLAUDE.md`: build runs natively on macOS via the .NET 10 build-tool; runtime execution uses CrossOver/WINE on macOS.

- [ ] **Step 2: Commit**

```sh
git add .claude/skills/create-new-mod/SKILL.md
git commit -m "docs(skill): align create-new-mod platform wording"
```

---

### Task 28: Create hotrepl-runtime-inspection skill

**Files:**
- Create: `.claude/skills/hotrepl-runtime-inspection/SKILL.md`

- [ ] **Step 1: Write the skill (target 60-80 lines)**

```markdown
---
name: hotrepl-runtime-inspection
description: Use when inspecting live Ancient Kingdoms game state, running a control command against the running game, or verifying REPL readiness via HotRepl.
---

# HotRepl Runtime Inspection

Use HotRepl to inspect or control Ancient Kingdoms while it is running. This is rare: most workflows are served by static exports, the build pipeline, or website code. Reach for HotRepl only when you genuinely need a live runtime view.

## When to use

- Verifying live IL2CPP/Unity state (monster counts, scene graph, player position).
- Running a leased mutating control command against the game (when one exists; see Future Direction in the spec).
- Diagnosing why the game's exporter is not producing expected data.

## When NOT to use

- Verifying exported JSON files — use `build-pipeline` or read the file directly.
- Verifying website pages — use the website's own tooling.
- Adding game-specific control commands — that is mod work, separate from this skill.

## Workflow

```sh
# 1. Make sure the HotRepl host is deployed into the game's Mods/.
dotnet run --project build-tool deploy-host

# 2. Launch the game and wait for MelonLoader bootstrap.
dotnet run --project build-tool launch --wait

# 3. From another terminal, query HotRepl using the profile written by `setup`.
hotrepl --profile ancient-kingdoms doctor --json
hotrepl --profile ancient-kingdoms wait --commands compendium.preflight

# 4. For leased mutating commands (when registered):
hotrepl --profile ancient-kingdoms control run compendium.preflight '{}' \
  --lease --wait --jsonl
```

`hotrepl` has its own `--help` for each subcommand; this skill does not restate it.

## Profile setup

`dotnet run --project build-tool setup` offers to upsert an `ancient-kingdoms` profile into your HotRepl profile file. Decline if you prefer to author it manually; the rest of `build-tool` does not require the profile.

Tokens never enter this repository. The profile references a token source (env var, token file, BepInEx config) under your control.

## Available game-specific control commands

As of this skill's writing, none. The DataExporter mod may register commands such as `compendium.preflight` and `compendium.export` in follow-up specs. Run `hotrepl doctor` against a live game to see what is actually registered.

## Boundary

`build-tool` owns deploy, launch, export orchestration, and Steam updates. `hotrepl` owns discovery, profiles, auth, readiness, and control execution. Compose them; do not wrap one with the other.
```

- [ ] **Step 2: Commit**

```sh
git add .claude/skills/hotrepl-runtime-inspection/
git commit -m "docs(skill): add hotrepl-runtime-inspection"
```

---

## Final verification

After all commits land on `docs/hotrepl-consumer-integration`:

- [ ] `dotnet build` from repo root completes clean.
- [ ] `dotnet test tests/BuildTool.Tests/` and `dotnet test tests/DataExporter.Tests/` both PASS.
- [ ] `dotnet run --project build-tool -- --help` lists all seven commands.
- [ ] `dotnet run --project build-tool -- deploy-host --help` and `dotnet run --project build-tool -- launch --help` show the new option shapes.
- [ ] `typos` runs clean on the changed files.
- [ ] `git diff --check` is clean.
- [ ] No references to `hotrepl-smoke`, `hotrepl-deploy`, `hotrepl-launch`, or `WaitForPort` remain anywhere in the repo.

Search to confirm:

```sh
grep -RIn --exclude-dir=docs --exclude-dir=.git "hotrepl-smoke\|hotrepl-deploy\|hotrepl-launch\|WaitForPort" .
```

Expected: no matches outside historical docs (the new docs only mention the new names).