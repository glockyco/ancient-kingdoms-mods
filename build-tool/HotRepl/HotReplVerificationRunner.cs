using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Output;
using BuildTool.Game;

namespace BuildTool.HotRepl;

/// <param name="ResolvedDatabasePath">Database path the game reported after the redirect.</param>
/// <param name="CharacterCount">Characters the scratch database holds.</param>
public sealed record VerificationRunnerResult(
    bool Ok,
    int ExitCode,
    string Message,
    string? ResolvedDatabasePath = null,
    int? CharacterCount = null);

/// <summary>
/// Drives a verification run's runtime steps: point the game at its scratch database,
/// confirm the path it reports, then quit.
/// </summary>
/// <remarks>
/// The redirect is confirmed from the value the game reports rather than assumed from the
/// call succeeding, because everything a run does afterwards writes to whichever database
/// the game actually opened.
/// </remarks>
internal sealed class HotReplVerificationRunner
{
    private static readonly string[] BaseCommands =
    {
        "game.useScratchDatabase", "world.summary", "game.quit",
    };

    private static readonly string[] MatrixCommands =
    {
        "game.useScratchDatabase", "world.summary", "world.enter",
        "fixture.createCharacter", "fixture.validateMatrix", "game.quit",
    };

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
            HasFixtureMatrix() ? MatrixCommands : BaseCommands, ct);
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

        VerificationScratch.ConfirmReportedPath(
            _options.VerificationGamePath, _options.VerificationWinePrefix, resolvedPath!);

        if (HasFixtureMatrix())
        {
            if (!(characters > 0))
            {
                var createError = await CallJobAsync(
                    "fixture.createCharacter", FirstFixtureCharacterArgs(), ct);
                if (createError != null)
                {
                    return new(false, ExitCodes.CommandFailed,
                        "The fresh scratch database could not create a validation character: "
                        + createError, resolvedPath, characters);
                }
                characters = 1;
            }

            var enterError = await CallJobAsync("world.enter", "{}", ct);
            if (enterError != null)
            {
                return new(false, ExitCodes.CommandFailed,
                    "The fixture validator could not enter the scratch world: " + enterError,
                    resolvedPath, characters);
            }

            using var validation = await _session.CallAsync(
                "fixture.validateMatrix", _options.FixtureMatrixJson!, ct);
            var validationRoot = validation.RootElement;
            var validationStatus = validationRoot.TryGetProperty("status", out var validationStatusElement)
                ? validationStatusElement.GetString()
                : null;
            var validationOutput = validationRoot.TryGetProperty("output", out var validationOutputElement)
                ? validationOutputElement
                : default;
            var matrixOk = validationOutput.ValueKind == JsonValueKind.Object
                           && validationOutput.TryGetProperty("ok", out var matrixOkElement)
                           && matrixOkElement.ValueKind == JsonValueKind.True;
            if (validationStatus != "ok" || !matrixOk)
            {
                return new(false, ExitCodes.CommandFailed,
                    "Runtime fixture validation failed: " + validationRoot.GetRawText(),
                    resolvedPath, characters);
            }
        }


        return new(true, ExitCodes.Success,
            HasFixtureMatrix()
                ? $"Redirected to {resolvedPath}; runtime fixture matrix accepted (validation only; not verified parity)."
                : $"Redirected to {resolvedPath}.",
            resolvedPath, characters);
    }

    private string FirstFixtureCharacterArgs()
    {
        using var matrix = JsonDocument.Parse(_options.FixtureMatrixJson!);
        var fixture = matrix.RootElement.GetProperty("fixtures")[0].GetProperty("fixture");
        var character = fixture.GetProperty("buildData").GetProperty("character");
        return JsonSerializer.Serialize(new System.Collections.Generic.Dictionary<string, string>
        {
            ["characterName"] = "Verifier",
            ["class"] = character.GetProperty("class").GetString()!,
            ["race"] = character.GetProperty("race").GetString()!,
        });
    }

    private bool HasFixtureMatrix()
    {
        if (string.IsNullOrWhiteSpace(_options.FixtureMatrixJson)) return false;
        using var matrix = JsonDocument.Parse(_options.FixtureMatrixJson);
        return matrix.RootElement.TryGetProperty("fixtures", out var fixtures)
               && fixtures.ValueKind == JsonValueKind.Array
               && fixtures.GetArrayLength() > 0;
    }

    private async Task<string?> CallJobAsync(
        string command, string argsJson, CancellationToken ct)
    {
        using var accepted = await _session.CallAsync(command, argsJson, ct);
        var jobId = accepted.RootElement.TryGetProperty("jobId", out var jobIdElement)
            ? jobIdElement.GetString()
            : null;
        if (string.IsNullOrWhiteSpace(jobId))
            return "the command did not return a job id: " + accepted.RootElement.GetRawText();

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
                return status == "ok" && state == "done"
                    ? null
                    : root.GetRawText();
            }
        }
        return "the command did not finish before the job timeout";
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
