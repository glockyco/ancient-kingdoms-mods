using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;

namespace BuildTool.Game;

public sealed class LogStream
{
    private readonly string _path;
    private readonly TimeSpan _pollInterval;

    public LogStream(string path, TimeSpan pollInterval)
    {
        _path = path;
        _pollInterval = pollInterval;
    }

    public async IAsyncEnumerable<string> ReadAsync([EnumeratorCancellation] CancellationToken cancellationToken)
    {
        long offset = 0;
        while (!cancellationToken.IsCancellationRequested)
        {
            if (File.Exists(_path))
            {
                using var stream = new FileStream(_path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                if (stream.Length > offset)
                {
                    stream.Seek(offset, SeekOrigin.Begin);
                    using var reader = new StreamReader(stream);
                    var chunk = await reader.ReadToEndAsync(cancellationToken);
                    if (chunk.Length > 0)
                    {
                        offset = stream.Length;
                        yield return chunk;
                    }
                }
            }

            try { await Task.Delay(_pollInterval, cancellationToken); }
            catch (OperationCanceledException) { yield break; }
        }
    }
}
