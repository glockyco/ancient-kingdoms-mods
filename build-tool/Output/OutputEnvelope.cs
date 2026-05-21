using System.Collections.Generic;
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
