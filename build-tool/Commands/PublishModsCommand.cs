using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using AncientKingdomsMods.Shared;
using BuildTool.Abstractions;
using BuildTool.Output;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed partial class PublishModsCommand : AsyncCommand<PublishModsCommand.Settings>
{
    private const int RegistrySchemaVersion = 1;
    private const int ManifestSchemaVersion = 2;
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
                var releases = SelectReleases(mod, release.Version);
                // Inside the repository rather than the system temporary folder, which is a symlink on macOS
                // that keeps the compiler from mapping source paths to /_/.
                var worktree = Path.Combine(_repoRoot, ".local", "tmp", "publish", $"{mod.Id}-{Guid.NewGuid():N}");
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
                            // Mapping source paths keeps the build folder out of the DLL, so a tag always
                            // builds the same file and the update notice only fires for a new release.
                            Arguments: new[] { "build", projectPath, "-c", "Release", "--no-incremental", "-p:ContinuousIntegrationBuild=true" }),
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
                        sha256,
                        releases));
                }
                finally
                {
                    await RemoveWorktreeAsync(worktree, cancellationToken);
                }
            }

            WriteManifest(
                stagingDir,
                artifacts,
                Environment.GetEnvironmentVariable("UPDATE_SIGNING_KEY"),
                Path.Combine(_repoRoot, "mods", "Shared", "Updates", "release-key.txt"));
            ReplaceDirectory(stagingDir, targetDir);
        }
        catch (Exception ex) when (ex is IOException or InvalidDataException or CryptographicException or ArgumentException or UnauthorizedAccessException)
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

        return ParseConfig(File.ReadAllText(path));
    }

    internal static DownloadConfig ParseConfig(string json)
    {
        var config = JsonSerializer.Deserialize<DownloadConfig>(json, JsonOptions)
            ?? throw new InvalidDataException("Configuration is empty.");
        ValidateConfig(config);
        return config;
    }

    internal static List<RegistryRelease>? SelectReleases(DownloadMod mod, string publishedVersion)
    {
        if (mod.Releases is null)
            return null;

        var version = ParseReleaseVersion(publishedVersion);
        if (!mod.Releases.Any(release => release.Version == publishedVersion))
            throw new InvalidDataException(
                $"Mod '{mod.Id}' has no release changes for newest tagged version {publishedVersion}. Add it to website/mod-downloads.json.");

        return mod.Releases.Where(release => ParseReleaseVersion(release.Version) <= version).ToList();
    }

    internal static string SerializeManifest(List<PublishedMod> artifacts) =>
        JsonSerializer.Serialize(new DownloadManifest(ManifestSchemaVersion, artifacts), JsonOptions) + Environment.NewLine;

    internal static void WriteManifest(
        string stagingDir,
        List<PublishedMod> artifacts,
        string? signingKeyPath,
        string publicKeyPath)
    {
        var manifestPath = Path.Combine(stagingDir, "manifest.json");
        File.WriteAllText(manifestPath, SerializeManifest(artifacts));
        if (string.IsNullOrEmpty(signingKeyPath))
        {
            Console.WriteLine("Mod list is unsigned because UPDATE_SIGNING_KEY is not set.");
            return;
        }

        if (!File.Exists(publicKeyPath))
            throw new InvalidDataException($"Release public key is missing at {publicKeyPath}. Run build-tool update-key --private <path> first.");

        var pem = File.ReadAllText(signingKeyPath);
        if (!PemEncoding.TryFind(pem, out var fields) || !pem.AsSpan()[fields.Label].SequenceEqual("PRIVATE KEY"))
            throw new InvalidDataException($"UPDATE_SIGNING_KEY must name an RSA private key in PKCS#8 PEM format: {signingKeyPath}.");

        using var key = RSA.Create();
        key.ImportFromPem(pem);
        if (!string.Equals(
                Convert.ToBase64String(key.ExportSubjectPublicKeyInfo()),
                File.ReadAllText(publicKeyPath).Trim(),
                StringComparison.Ordinal))
            throw new InvalidDataException($"UPDATE_SIGNING_KEY does not match the release public key at {publicKeyPath}.");

        var signature = key.SignData(File.ReadAllBytes(manifestPath), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        File.WriteAllText(Path.Combine(stagingDir, "manifest.json.sig"), Convert.ToBase64String(signature));
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
        if (config.SchemaVersion != RegistrySchemaVersion)
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
            if (mod.Releases is not null)
            {
                Version? previous = null;
                foreach (var release in mod.Releases)
                {
                    if (release is null)
                        throw new InvalidDataException($"Mod '{mod.Id}' has a null release.");
                    var version = ParseReleaseVersion(release.Version);
                    if (previous is not null && version >= previous)
                        throw new InvalidDataException($"Mod '{mod.Id}' releases must have unique versions in descending order.");
                    if (release.Changes is not { Count: > 0 } || release.Changes.Any(string.IsNullOrWhiteSpace))
                        throw new InvalidDataException($"Mod '{mod.Id}' release {release.Version} needs at least one non-blank change.");
                    previous = version;
                }
            }
        }
    }

    private static Version ParseReleaseVersion(string version)
    {
        if (version is null || !ReleaseVersionPattern().IsMatch(version) || !Version.TryParse(version, out var parsed))
            throw new InvalidDataException($"Release version '{version}' must be major.minor.patch.");
        return parsed;
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

    [GeneratedRegex(@"\A(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\z", RegexOptions.CultureInvariant)]
    private static partial Regex ReleaseVersionPattern();

    internal sealed record DownloadConfig(int SchemaVersion, List<DownloadMod> Mods);

    internal sealed record DownloadMod(
        string Id,
        string Project,
        string Name,
        string Description,
        List<RegistryRelease>? Releases = null);

    internal sealed record RegistryRelease(string Version, List<string> Changes);

    private sealed record Release(string Tag, string Version);

    private sealed record DownloadManifest(int SchemaVersion, List<PublishedMod> Mods);

    internal sealed record PublishedMod(
        string Id,
        string Name,
        string Version,
        string Description,
        string FileName,
        string DownloadPath,
        long SizeBytes,
        string Sha256,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] List<RegistryRelease>? Releases = null);
}
