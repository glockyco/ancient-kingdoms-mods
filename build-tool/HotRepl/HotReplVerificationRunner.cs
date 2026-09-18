using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Output;
using BuildTool.Game;

namespace BuildTool.HotRepl;

/// <param name="ResolvedDatabasePath">Database path the game reported after the redirect.</param>
/// <param name="CharacterCount">Characters the scratch database held after the redirect.</param>
/// <param name="Stage">The stage that failed, or the last stage that completed.</param>
/// <param name="Achieved">The build command's achieved-state readback.</param>
/// <param name="Observation">The observe command's measurements.</param>
public sealed record VerificationRunnerResult(
    bool Ok,
    int ExitCode,
    string Message,
    string? ResolvedDatabasePath = null,
    int? CharacterCount = null,
    string? Stage = null,
    JsonElement? Achieved = null,
    JsonElement? Observation = null);

/// <summary>
/// Drives one fixture's runtime steps: point the game at its scratch database, confirm the
/// path it reports, create and enter the fixture's character, validate the fixture against
/// the game's definitions, build the character, take the measurement, then quit.
/// </summary>
/// <remarks>
/// The redirect is confirmed from the value the game reports rather than assumed from the
/// call succeeding, because everything a run does afterwards writes to whichever database
/// the game actually opened. Every later stage reads its result back the same way.
/// </remarks>
internal sealed class HotReplVerificationRunner
{
    private static readonly string[] BaseCommands =
    {
        "game.useScratchDatabase", "world.summary", "game.quit",
    };

    private static readonly string[] FixtureCommands =
    {
        "game.useScratchDatabase", "world.summary", "world.enter",
        "fixture.createCharacter", "fixture.validate", "fixture.buildCharacter",
        "fixture.observe", "game.quit",
    };

    private sealed record JobOutcome(string? Error, JsonElement? Output, JsonElement? Artifacts = null);

    private readonly HotReplSession _session;
    private readonly HotReplRunnerOptions _options;
    private bool _ownsRuntime;

    internal HotReplVerificationRunner(IHotReplTransport transport, HotReplRunnerOptions options)
    {
        _session = new HotReplSession(transport, options);
        _options = options;
    }

    public static HotReplVerificationRunner Create(HotReplRunnerOptions options)
        => new(new ClientWebSocketTransport(), options);

    public async Task<VerificationRunnerResult> RunAsync(CancellationToken ct)
    {
        _ownsRuntime = false;
        try
        {
            return await RunCoreAsync(ct);
        }
        catch (OperationCanceledException)
        {
            return new(false, ExitCodes.Cancelled, "Verification run cancelled.");
        }
        catch (Exception ex)
        {
            return new(false, ExitCodes.Internal,
                $"Runner error: {ex.GetType().Name}: {ex.Message}");
        }
        finally
        {
            if (_ownsRuntime)
            {
                using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                try
                {
                    var connectionFailure = await _session.ConnectAsync(cleanup.Token);
                    if (connectionFailure is null)
                    {
                        using var identity = await _session.CallAsync("world.summary", "{}", cleanup.Token);
                        var root = identity.RootElement;
                        var matched = Text(root, "status") == "ok"
                            && root.TryGetProperty("output", out var output)
                            && Text(output, "verificationSession") == _options.VerificationSession;
                        if (matched)
                        {
                            using var quit = await _session.CallAsync("game.quit", "{}", cleanup.Token);
                            if (Text(quit.RootElement, "status") != "ok")
                                Console.Error.WriteLine($"Shutdown request refused: {quit.RootElement.GetRawText()}");
                        }
                        else
                            Console.Error.WriteLine("Shutdown refused: the runtime launch identity no longer matches.");
                    }
                    else
                        Console.Error.WriteLine($"Shutdown connection failed: {connectionFailure.Message}");
                }
                catch (Exception exception)
                {
                    Console.Error.WriteLine($"Shutdown request failed: {exception.GetType().Name}: {exception.Message}");
                }
            }
        }
    }

    private async Task<VerificationRunnerResult> RunCoreAsync(CancellationToken ct)
    {
        var failure = await _session.ConnectAsync(ct);
        if (failure != null)
            return Failed(failure);

        failure = await _session.WaitForCommandsAsync(
            HasFixture() ? FixtureCommands : BaseCommands, ct);
        if (failure != null)
            return Failed(failure);

        // A fresh connection after readiness, for the same reason the export path takes one:
        // the host may close the socket it accepted before the game finished starting.
        failure = await _session.ConnectAsync(ct);
        if (failure != null)
            return Failed(failure);

        if (string.IsNullOrWhiteSpace(_options.VerificationSession)
            || string.IsNullOrWhiteSpace(_options.VerificationGamePath)
            || string.IsNullOrWhiteSpace(_options.VerificationWinePrefix))
            return new(false, ExitCodes.InvalidUsage,
                "Verification requires a launch session identity and an owned installation path.");

        using var identity = await _session.CallAsync("world.summary", "{}", ct);
        var identityRoot = identity.RootElement;
        var identityOutput = identityRoot.TryGetProperty("output", out var identityValue)
            ? identityValue : default;
        if (Text(identityRoot, "status") != "ok"
            || !string.Equals(Text(identityOutput, "verificationSession"),
                _options.VerificationSession, StringComparison.Ordinal))
            return new(false, ExitCodes.CommandFailed,
                "Runtime session identity does not match the owned launch. No mutation or quit was sent.");
        _ownsRuntime = true;

        using var redirect = await _session.CallAsync("game.useScratchDatabase", "{}", ct);
        var root = redirect.RootElement;

        var status = root.TryGetProperty("status", out var statusElement)
            ? statusElement.GetString()
            : null;
        if (status != "ok")
        {
            return new(false, ExitCodes.CommandFailed,
                $"The game refused to use a scratch database: {DescribeError(root)}");
        }

        var output = root.TryGetProperty("output", out var resultElement)
            ? resultElement
            : default;

        var resolvedPath = Text(output, "resolvedPath");
        var isScratch = output.ValueKind == JsonValueKind.Object
                        && output.TryGetProperty("isScratch", out var scratchElement)
                        && scratchElement.ValueKind == JsonValueKind.True;
        var characters = output.ValueKind == JsonValueKind.Object
                         && output.TryGetProperty("characterCount", out var countElement)
                         && countElement.ValueKind == JsonValueKind.Number
            ? countElement.GetInt32()
            : (int?)null;

        if (!isScratch)
        {
            return new(false, ExitCodes.CommandFailed,
                "The game did not confirm a scratch database, so the run stops before it can "
                + $"reach player data. Resolved path: {resolvedPath ?? "not reported"}.",
                resolvedPath);
        }

        var ownedDatabase = VerificationScratch.ConfirmReportedPath(
            _options.VerificationGamePath, _options.VerificationWinePrefix, resolvedPath!);

        if (!HasFixture())
            return new(true, ExitCodes.Success, $"Redirected to {resolvedPath}.", resolvedPath, characters);

        if (characters > 0)
        {
            return new(false, ExitCodes.CommandFailed,
                $"The scratch database already holds {characters} character(s); a fixture attempt "
                + "needs a fresh database.", resolvedPath, characters, Stage: "scratch");
        }

        var create = await CallJobAsync("fixture.createCharacter", FixtureCharacterArgs(), ct);
        if (create.Error != null)
        {
            return new(false, ExitCodes.CommandFailed,
                "The fixture character could not be created: " + create.Error,
                resolvedPath, characters, Stage: "create");
        }

        var enter = await CallJobAsync("world.enter", "{}", ct);
        if (enter.Error != null)
        {
            return new(false, ExitCodes.CommandFailed,
                "The fixture character could not enter the scratch world: " + enter.Error,
                resolvedPath, characters, Stage: "enter");
        }

        using var validation = await _session.CallAsync("fixture.validate", _options.FixtureJson!, ct);
        var validationOutput = OkOutput(validation.RootElement);
        if (validationOutput is null || !IsTrue(validationOutput.Value, "ok"))
        {
            return new(false, ExitCodes.CommandFailed,
                "The game refused the fixture: " + validation.RootElement.GetRawText(),
                resolvedPath, characters, Stage: "validate");
        }

        var build = await CallJobAsync("fixture.buildCharacter", BuildCharacterArgs(), ct);
        if (build.Error != null || build.Output is null || !IsTrue(build.Output.Value, "ok"))
        {
            return new(false, ExitCodes.CommandFailed,
                "The fixture character could not be built: "
                + (build.Error ?? build.Output?.GetRawText() ?? "no build result"),
                resolvedPath, characters, Stage: "build", Achieved: build.Output);
        }

        var observe = await CallJobAsync("fixture.observe", ObserveArgs(), ct);
        if (observe.Error != null || observe.Output is null)
        {
            return new(false, ExitCodes.CommandFailed,
                "The measurement failed: " + (observe.Error ?? "no measurement was returned"),
                resolvedPath, characters, Stage: "observe", Achieved: build.Output);
        }
        var observation = ReadObservationArtifact(observe, ownedDatabase, out var artifactError);
        if (observation is null)
        {
            return new(false, ExitCodes.CommandFailed,
                "The measurement artifact could not be read: " + artifactError,
                resolvedPath, characters, Stage: "observe", Achieved: build.Output);
        }

        return new(true, ExitCodes.Success,
            $"Redirected to {resolvedPath}; fixture built and measured.",
            resolvedPath, characters, Stage: "observe", Achieved: build.Output, Observation: observation);
    }

    private string FixtureCharacterArgs()
    {
        using var fixture = JsonDocument.Parse(_options.FixtureJson!);
        var character = fixture.RootElement.GetProperty("buildData").GetProperty("player");
        return JsonSerializer.Serialize(new System.Collections.Generic.Dictionary<string, string>
        {
            ["characterName"] = "Verifier",
            ["class"] = character.GetProperty("classId").GetString()!,
            ["race"] = character.GetProperty("raceId").GetString()!,
        });
    }

    private string BuildCharacterArgs()
    {
        using var fixture = JsonDocument.Parse(_options.FixtureJson!);
        return JsonSerializer.Serialize(new System.Collections.Generic.Dictionary<string, JsonElement>
        {
            ["build"] = fixture.RootElement.GetProperty("build").Clone(),
            ["buildData"] = fixture.RootElement.GetProperty("buildData").Clone(),
        });
    }

    private string ObserveArgs()
    {
        using var fixture = JsonDocument.Parse(_options.FixtureJson!);
        return JsonSerializer.Serialize(new System.Collections.Generic.Dictionary<string, JsonElement>
        {
            ["fixture"] = fixture.RootElement.Clone(),
        });
    }

    private bool HasFixture() => !string.IsNullOrWhiteSpace(_options.FixtureJson);

    /// <summary>
    /// Reads the observation the game wrote beside its scratch database. The artifact names a
    /// game path and a content hash; both are checked on this side before the record is trusted.
    /// </summary>
    private JsonElement? ReadObservationArtifact(JobOutcome observe, string ownedDatabase, out string error)
    {
        error = "";
        var key = Text(observe.Output!.Value, "artifact");
        if (key is null || observe.Artifacts is null
            || observe.Artifacts.Value.ValueKind != JsonValueKind.Object
            || !observe.Artifacts.Value.TryGetProperty(key, out var artifact))
        {
            error = "the result names no observation artifact";
            return null;
        }
        var reported = Text(artifact, "path");
        var expectedSha = Text(artifact, "sha256");
        var hostPath = WinePath.ToHost(reported, _options.VerificationWinePrefix!);
        if (hostPath is null || !System.IO.File.Exists(hostPath))
        {
            error = $"artifact path {reported ?? "(none)"} has no readable host file";
            return null;
        }
        var scratch = System.IO.Path.GetDirectoryName(ownedDatabase)!;
        var canonical = VerificationScratch.CanonicalHostPath(hostPath, "observation artifact");
        if (!string.Equals(System.IO.Path.GetDirectoryName(canonical), scratch, StringComparison.Ordinal))
        {
            error = $"artifact {canonical} lies outside the owned scratch directory {scratch}";
            return null;
        }
        var bytes = System.IO.File.ReadAllBytes(hostPath);
        var sha = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes)).ToLowerInvariant();
        if (!string.Equals(sha, expectedSha, StringComparison.OrdinalIgnoreCase))
        {
            error = "artifact content hash does not match the reported hash";
            return null;
        }
        using var document = JsonDocument.Parse(bytes);
        return document.RootElement.Clone();
    }

    private static JsonElement? OkOutput(JsonElement root)
        => Text(root, "status") == "ok"
           && root.TryGetProperty("output", out var output)
           && output.ValueKind == JsonValueKind.Object
            ? output.Clone()
            : null;

    private static bool IsTrue(JsonElement element, string property)
        => element.ValueKind == JsonValueKind.Object
           && element.TryGetProperty(property, out var value)
           && value.ValueKind == JsonValueKind.True;

    private async Task<JobOutcome> CallJobAsync(
        string command, string argsJson, CancellationToken ct)
    {
        using var accepted = await _session.CallAsync(command, argsJson, ct);
        var jobId = accepted.RootElement.TryGetProperty("jobId", out var jobIdElement)
            ? jobIdElement.GetString()
            : null;
        if (string.IsNullOrWhiteSpace(jobId))
            return new("the command did not return a job id: " + accepted.RootElement.GetRawText(), null);

        var deadline = DateTime.UtcNow + _options.JobTimeout;
        while (DateTime.UtcNow < deadline)
        {
            await Task.Delay(_options.PollInterval, ct);
            using var poll = await _session.SendReceiveAsync(
                $"{{\"type\":\"job_status\",\"id\":\"{_session.Id()}\",\"jobId\":\"{jobId}\"}}",
                ct);
            var root = poll.RootElement;
            var type = root.TryGetProperty("type", out var typeElement)
                ? typeElement.GetString()
                : null;
            var state = root.TryGetProperty("state", out var stateElement)
                ? stateElement.GetString()
                : null;
            if (type == "job_status_result" && state == "running") continue;
            if (type == "job_result" || type == "job_status_result")
            {
                var status = root.TryGetProperty("status", out var statusElement)
                    ? statusElement.GetString()
                    : null;
                var output = root.TryGetProperty("output", out var outputElement)
                    ? outputElement.Clone()
                    : (JsonElement?)null;
                var artifacts = root.TryGetProperty("artifacts", out var artifactsElement)
                    ? artifactsElement.Clone()
                    : (JsonElement?)null;
                return status == "ok" && state == "done"
                    ? new(null, output, artifacts)
                    : new(root.GetRawText(), output, artifacts);
            }
        }
        return new("the command did not finish before the job timeout", null);
    }

    private static VerificationRunnerResult Failed(HotReplFailure failure)
        => new(false, failure.ExitCode, failure.Message);

    private static string? Text(JsonElement element, string property)
        => element.ValueKind == JsonValueKind.Object
           && element.TryGetProperty(property, out var value)
           && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static string DescribeError(JsonElement root)
    {
        if (!root.TryGetProperty("error", out var error))
            return "no error detail reported";

        var code = Text(error, "code");
        var message = Text(error, "message");
        return string.IsNullOrWhiteSpace(code) && string.IsNullOrWhiteSpace(message)
            ? "no error detail reported"
            : $"{code}: {message}";
    }
}
