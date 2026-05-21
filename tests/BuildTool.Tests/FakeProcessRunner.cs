using System;
using System.Collections.Generic;
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
