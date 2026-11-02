using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Output;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed partial class PublishModsCommand : AsyncCommand<PublishModsCommand.Settings>
{
    private const int ManifestSchemaVersion = 1;
    private readonly string _repoRoot;
    private readonly IProcessRunner _runner;
    private readonly CommandResultStore _resultStore;

    public PublishModsCommand()
        : this(Directory.GetCurrentDirectory(), new CliWrapProcessRunner(), new CommandResultStore())
    {
    }

    public PublishModsCommand(string repoRoot, IProcessRunner runner, CommandResultStore? resultStore = null)
    {
        _repoRoot = repoRoot;
        _runner = runner;
        _resultStore = resultStore ?? new CommandResultStore();
    }

    public sealed class Settings : BaseSettings { }

    internal Task<int> RunAsync(Settings settings, CancellationToken cancellationToken = default) =>
        ExecuteAsync(null!, settings, cancellationToken);

    public override async Task<int> ExecuteAsync(
        CommandContext context,
        Settings settings,
        CancellationToken cancellationToken)
    {
        var configPath = Path.Combine(_repoRoot, "website", "mod-downloads.json");
        DownloadConfig config;
        try
        {
            config = LoadConfig(configPath);
            ValidateConfig(config);
        }
        catch (Exception ex) when (ex is IOException or JsonException or InvalidDataException)
        {
            Console.Error.WriteLine($"Invalid mod download configuration: {ex.Message}");
            _resultStore.SetErrorDetails(new { configPath, message = ex.Message });
            return ExitCodes.InvalidUsage;
        }

        Console.WriteLine($"Publishing {config.Mods.Count} downloadable mods...");
        var artifacts = new List<PublishedMod>(config.Mods.Count);
        var staticRoot = Path.Combine(_repoRoot, "website", "static");
        var targetDir = Path.Combine(staticRoot, "mods");
        var stagingDir = Path.Combine(staticRoot, $".mods-{Guid.NewGuid():N}");

        try
        {
            Directory.CreateDirectory(stagingDir);
            foreach (var mod in config.Mods)
            {
                // A deploy runs this, so each mod comes from the newest tag of its releases and never from
                // unreleased work in the working tree.
                var release = await NewestReleaseAsync(mod.Id, cancellationToken);
                var worktree = Path.Combine(Path.GetTempPath(), $"publish-{mod.Id}-{Guid.NewGuid():N}");
                await RunGitAsync(new[] { "worktree", "add", "--detach", worktree, release.Tag }, cancellationToken);
                try
                {
                    // The tag's tree has no Local.props, which names the game install the build references.
                    var localProps = Path.Combine(_repoRoot, "Local.props");
                    if (File.Exists(localProps))
                        File.Copy(localProps, Path.Combine(worktree, "Local.props"));

                    var projectPath = Path.Combine(worktree, "mods", mod.Project, $"{mod.Project}.csproj");
                    if (!File.Exists(projectPath))
                        throw new InvalidDataException($"Project '{mod.Project}' does not exist at {release.Tag}.");

                    Console.WriteLine($"Building {mod.Project} from {release.Tag}...");
                    var result = await _runner.RunAsync(
                        new ProcessRequest(
                            Program: "dotnet",
                            Arguments: new[] { "build", projectPath, "-c", "Release", "--no-incremental" }),
                        cancellationToken);
                    if (!string.IsNullOrWhiteSpace(result.StandardOutput))
                        Console.WriteLine(result.StandardOutput);
                    if (!string.IsNullOrWhiteSpace(result.StandardError))
                        Console.Error.WriteLine(result.StandardError);
                    if (result.ExitCode != 0)
                    {
                        _resultStore.SetErrorDetails(new { mod.Project, release.Tag, projectPath, result.ExitCode });
                        return ExitCodes.CommandFailed;
                    }

                    var fileName = $"{mod.Project}.dll";
                    var sourcePath = Path.Combine(
                        worktree,
                        "mods",
                        mod.Project,
                        "bin",
                        "Release",
                        "net6.0",
                        fileName);
                    if (!File.Exists(sourcePath))
                        throw new InvalidDataException($"Build did not produce {sourcePath}.");

                    var version = ReadVersion(sourcePath, fileName);
                    if (version != release.Version)
                        throw new InvalidDataException($"{fileName} built from {release.Tag} names version {version}.");
                    File.Copy(sourcePath, Path.Combine(stagingDir, fileName));

                    using var stream = File.OpenRead(sourcePath);
                    var sha256 = Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
                    artifacts.Add(new PublishedMod(
                        mod.Id,
                        mod.Name,
                        version,
                        mod.Description,
                        fileName,
                        $"/mods/{fileName}",
                        stream.Length,
                        sha256));
                }
                finally
                {
                    await RemoveWorktreeAsync(worktree, cancellationToken);
                }
            }

            var manifest = new DownloadManifest(ManifestSchemaVersion, artifacts);
            var manifestJson = JsonSerializer.Serialize(manifest, JsonOptions) + Environment.NewLine;
            File.WriteAllText(Path.Combine(stagingDir, "manifest.json"), manifestJson);
            ReplaceDirectory(stagingDir, targetDir);
        }
        catch (Exception ex) when (ex is IOException or InvalidDataException)
        {
            Console.Error.WriteLine($"Could not publish mod downloads: {ex.Message}");
            _resultStore.SetErrorDetails(new { configPath, targetDir, message = ex.Message });
            return ExitCodes.CommandFailed;
        }
        finally
        {
            if (Directory.Exists(stagingDir))
                Directory.Delete(stagingDir, recursive: true);
        }

        _resultStore.SetData(new
        {
            manifestPath = Path.Combine(targetDir, "manifest.json"),
            publishedCount = artifacts.Count,
            downloads = artifacts.Select(artifact => artifact.DownloadPath).ToArray(),
        });
        Console.WriteLine($"Published {artifacts.Count} mods to {targetDir}");
        return ExitCodes.Success;
    }

    private static DownloadConfig LoadConfig(string path)
    {
        if (!File.Exists(path))
            throw new InvalidDataException($"Configuration file not found at {path}.");

        return JsonSerializer.Deserialize<DownloadConfig>(File.ReadAllText(path), JsonOptions)
            ?? throw new InvalidDataException("Configuration is empty.");
    }

    // The website names the version a player sees in game, so it comes from the DLL itself.
    private static string ReadVersion(string path, string fileName)
    {
        try
        {
            return MelonInfoReader.Version(path)
                ?? throw new InvalidDataException($"{fileName} names no version in a MelonInfo attribute.");
        }
        catch (BadImageFormatException ex)
        {
            throw new InvalidDataException($"{fileName} is not a .NET assembly: {ex.Message}");
        }
    }

    // A release is a tag named after the mod's id and its version, such as pocket-compendium-v1.0.1.
    private async Task<Release> NewestReleaseAsync(string id, CancellationToken cancellationToken)
    {
        var listing = await RunGitAsync(new[] { "tag", "--list", $"{id}-v*" }, cancellationToken);
        var pattern = new Regex($"^{Regex.Escape(id)}-v(\\d+)\\.(\\d+)\\.(\\d+)$", RegexOptions.CultureInvariant);
        Release? newest = null;
        (int, int, int) newestKey = default;
        foreach (var line in listing.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var match = pattern.Match(line);
            if (!match.Success)
                continue;
            var key = (int.Parse(match.Groups[1].Value), int.Parse(match.Groups[2].Value), int.Parse(match.Groups[3].Value));
            if (newest is null || key.CompareTo(newestKey) > 0)
            {
                newest = new Release(line, $"{key.Item1}.{key.Item2}.{key.Item3}");
                newestKey = key;
            }
        }

        return newest ?? throw new InvalidDataException(
            $"{id} has no release tag. Tag the commit of its release as {id}-v<version>, the version its MelonInfo names.");
    }

    private async Task<string> RunGitAsync(string[] arguments, CancellationToken cancellationToken)
    {
        var result = await _runner.RunAsync(
            new ProcessRequest(Program: "git", Arguments: arguments, WorkingDirectory: _repoRoot),
            cancellationToken);
        if (result.ExitCode != 0)
            throw new InvalidDataException($"git {string.Join(' ', arguments)} failed: {result.StandardError.Trim()}");
        return result.StandardOutput;
    }

    // A worktree left behind only costs disk space, so a failed removal warns instead of failing the publish.
    private async Task RemoveWorktreeAsync(string worktree, CancellationToken cancellationToken)
    {
        try
        {
            await RunGitAsync(new[] { "worktree", "remove", "--force", worktree }, cancellationToken);
        }
        catch (InvalidDataException ex)
        {
            Console.Error.WriteLine($"Could not remove the build worktree {worktree}: {ex.Message}");
        }
    }

    private static void ValidateConfig(DownloadConfig config)
    {
        if (config.SchemaVersion != ManifestSchemaVersion)
            throw new InvalidDataException($"Unsupported schemaVersion {config.SchemaVersion}.");
        if (config.Mods is not { Count: > 0 })
            throw new InvalidDataException("At least one mod must be configured.");

        var ids = new HashSet<string>(StringComparer.Ordinal);
        var projects = new HashSet<string>(StringComparer.Ordinal);
        foreach (var mod in config.Mods)
        {
            if (!DownloadIdPattern().IsMatch(mod.Id))
                throw new InvalidDataException($"Mod id '{mod.Id}' must use lowercase letters, digits, and single hyphens.");
            if (string.IsNullOrWhiteSpace(mod.Project) ||
                mod.Project is "." or ".." ||
                mod.Project.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 ||
                mod.Project.Contains('/') ||
                mod.Project.Contains('\\'))
                throw new InvalidDataException($"Project '{mod.Project}' is not a valid project name.");
            if (string.IsNullOrWhiteSpace(mod.Name))
                throw new InvalidDataException($"Mod '{mod.Id}' needs a name.");
            if (string.IsNullOrWhiteSpace(mod.Description))
                throw new InvalidDataException($"Mod '{mod.Id}' needs a description.");
            if (!ids.Add(mod.Id))
                throw new InvalidDataException($"Duplicate mod id '{mod.Id}'.");
            if (!projects.Add(mod.Project))
                throw new InvalidDataException($"Duplicate project '{mod.Project}'.");
        }
    }

    private static void ReplaceDirectory(string stagingDir, string targetDir)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(targetDir)!);
        if (!Directory.Exists(targetDir))
        {
            Directory.Move(stagingDir, targetDir);
            return;
        }

        var backupDir = $"{targetDir}.old-{Guid.NewGuid():N}";
        Directory.Move(targetDir, backupDir);
        try
        {
            Directory.Move(stagingDir, targetDir);
            Directory.Delete(backupDir, recursive: true);
        }
        catch
        {
            if (!Directory.Exists(targetDir) && Directory.Exists(backupDir))
                Directory.Move(backupDir, targetDir);
            throw;
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    [GeneratedRegex("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.CultureInvariant)]
    private static partial Regex DownloadIdPattern();

    private sealed record DownloadConfig(int SchemaVersion, List<DownloadMod> Mods);

    private sealed record DownloadMod(string Id, string Project, string Name, string Description);

    private sealed record Release(string Tag, string Version);

    private sealed record DownloadManifest(int SchemaVersion, List<PublishedMod> Mods);

    private sealed record PublishedMod(
        string Id,
        string Name,
        string Version,
        string Description,
        string FileName,
        string DownloadPath,
        long SizeBytes,
        string Sha256);
}
