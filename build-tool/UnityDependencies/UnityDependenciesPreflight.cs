using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace BuildTool.UnityDependencies;

public enum UnityDependenciesPreflightStatus
{
    Unknown,
    ReleaseAvailable,
    ReleaseMissing,
    CheckInconclusive,
}

public sealed record UnityDependenciesPreflightResult(
    UnityDependenciesPreflightStatus Status,
    string? UnityVersion = null,
    string? ReleaseUrl = null,
    string? Detail = null);

public sealed class UnityDependenciesPreflight
{
    private const string ReleaseUrlTemplate =
        "https://github.com/LavaGang/MelonLoader.UnityDependencies/releases/download/{0}/Managed.zip";
    private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(10);
    private static readonly Regex UnityVersionLine = new(
        @"^\s*UnityVersion\s*=\s*""(?<version>[^""]+)""\s*$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private readonly HttpClient _httpClient;

    public UnityDependenciesPreflight(HttpClient? httpClient = null)
    {
        _httpClient = httpClient ?? new HttpClient
        {
            Timeout = RequestTimeout,
        };
    }

    public async Task<UnityDependenciesPreflightResult> CheckAsync(
        string melonLoaderPath,
        CancellationToken cancellationToken = default)
    {
        var configPath = Path.Combine(
            melonLoaderPath,
            "Dependencies",
            "Il2CppAssemblyGenerator",
            "Config.cfg");

        string? unityVersion;
        try
        {
            unityVersion = ReadUnityVersion(configPath);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return new(
                UnityDependenciesPreflightStatus.CheckInconclusive,
                Detail: $"Could not read {configPath}: {ex.Message}");
        }

        if (unityVersion is null)
            return new(UnityDependenciesPreflightStatus.Unknown);

        var releaseUrl = string.Format(
            ReleaseUrlTemplate,
            Uri.EscapeDataString(unityVersion));

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(RequestTimeout);
        var requestCancellationToken = timeoutCts.Token;

        try
        {
            using var headRequest = new HttpRequestMessage(HttpMethod.Head, releaseUrl);
            AddHeaders(headRequest);
            using var headResponse = await _httpClient.SendAsync(
                headRequest,
                HttpCompletionOption.ResponseHeadersRead,
                requestCancellationToken);

            if (headResponse.StatusCode is HttpStatusCode.MethodNotAllowed
                or HttpStatusCode.NotImplemented)
            {
                return await CheckWithGetAsync(releaseUrl, unityVersion, requestCancellationToken);
            }

            return ResultForResponse(headResponse.StatusCode, unityVersion, releaseUrl);
        }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException or IOException)
        {
            return new(
                UnityDependenciesPreflightStatus.CheckInconclusive,
                unityVersion,
                releaseUrl,
                ex.Message);
        }
    }

    private async Task<UnityDependenciesPreflightResult> CheckWithGetAsync(
        string releaseUrl,
        string unityVersion,
        CancellationToken cancellationToken)
    {
        try
        {
            using var getRequest = new HttpRequestMessage(HttpMethod.Get, releaseUrl);
            getRequest.Headers.Range = new RangeHeaderValue(0, 0);
            AddHeaders(getRequest);
            using var getResponse = await _httpClient.SendAsync(
                getRequest,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            return ResultForResponse(getResponse.StatusCode, unityVersion, releaseUrl);
        }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException or IOException)
        {
            return new(
                UnityDependenciesPreflightStatus.CheckInconclusive,
                unityVersion,
                releaseUrl,
                ex.Message);
        }
    }

    private static string? ReadUnityVersion(string configPath)
    {
        if (!File.Exists(configPath))
            return null;

        foreach (var line in File.ReadLines(configPath))
        {
            var match = UnityVersionLine.Match(line);
            if (match.Success)
                return match.Groups["version"].Value.Trim();
        }

        return null;
    }

    private static void AddHeaders(HttpRequestMessage request)
    {
        request.Headers.UserAgent.ParseAdd(
            "AncientKingdomsBuildTool/1.0 (+https://github.com/glockyco/ancient-kingdoms-mods)");
    }

    private static UnityDependenciesPreflightResult ResultForResponse(
        HttpStatusCode statusCode,
        string unityVersion,
        string releaseUrl) =>
        statusCode == HttpStatusCode.NotFound
            ? new(UnityDependenciesPreflightStatus.ReleaseMissing, unityVersion, releaseUrl)
            : (int)statusCode is >= 200 and <= 299
                ? new(UnityDependenciesPreflightStatus.ReleaseAvailable, unityVersion, releaseUrl)
                : new(
                    UnityDependenciesPreflightStatus.CheckInconclusive,
                    unityVersion,
                    releaseUrl,
                    $"Upstream returned HTTP {(int)statusCode}.");
}
