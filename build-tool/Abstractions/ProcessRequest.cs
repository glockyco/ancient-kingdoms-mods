using System.Collections.Generic;

namespace BuildTool.Abstractions;

public sealed record ProcessRequest(
    string Program,
    IReadOnlyList<string> Arguments,
    string? WorkingDirectory = null,
    IReadOnlyDictionary<string, string?>? Environment = null);
