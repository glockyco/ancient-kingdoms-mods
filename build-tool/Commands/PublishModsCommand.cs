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

    protected override async Task<int> ExecuteAsync(
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
        var downloadsRoot = Path.Combine(_repoRoot, "website", "static", "downloads");
        var targetDir = Path.Combine(downloadsRoot, "mods");
        var stagingDir = Path.Combine(downloadsRoot, $".mods-{Guid.NewGuid():N}");

        try
        {
            Directory.CreateDirectory(stagingDir);
            foreach (var mod in config.Mods)
            {
                var projectPath = Path.Combine(_repoRoot, "mods", mod.Project, $"{mod.Project}.csproj");
                if (!File.Exists(projectPath))
                    throw new InvalidDataException($"Project '{mod.Project}' does not exist at {projectPath}.");

                Console.WriteLine($"Building {mod.Project}...");
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
                    _resultStore.SetErrorDetails(new { mod.Project, projectPath, result.ExitCode });
                    return ExitCodes.CommandFailed;
                }

                var fileName = $"{mod.Project}.dll";
                var sourcePath = Path.Combine(
                    _repoRoot,
                    "mods",
                    mod.Project,
                    "bin",
                    "Release",
                    "net6.0",
                    fileName);
                if (!File.Exists(sourcePath))
                    throw new InvalidDataException($"Build did not produce {sourcePath}.");

                var modDir = Path.Combine(stagingDir, mod.Id);
                Directory.CreateDirectory(modDir);
                File.Copy(sourcePath, Path.Combine(modDir, fileName));

                using var stream = File.OpenRead(sourcePath);
                var sha256 = Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
                artifacts.Add(new PublishedMod(
                    mod.Id,
                    mod.Name,
                    mod.Description,
                    fileName,
                    $"/downloads/mods/{mod.Id}/{fileName}",
                    stream.Length,
                    sha256));
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

    private sealed record DownloadManifest(int SchemaVersion, List<PublishedMod> Mods);

    private sealed record PublishedMod(
        string Id,
        string Name,
        string Description,
        string FileName,
        string DownloadPath,
        long SizeBytes,
        string Sha256);
}
