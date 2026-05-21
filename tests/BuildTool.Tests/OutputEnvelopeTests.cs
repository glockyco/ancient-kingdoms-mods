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
