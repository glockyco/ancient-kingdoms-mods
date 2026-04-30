#nullable disable

// BossMod consumes this public delegate from an IL2CPP-referenced project whose corelib lacks Roslyn nullable metadata attributes.
using System;

namespace BossMod.Core.Persistence;

public sealed class StateFlusher : IDisposable
{
    private readonly Action _write;
    private readonly Func<DateTimeOffset> _now;
    private readonly TimeSpan _debounce;
    private DateTimeOffset? _firstDirtyAt;
    private bool _disposed;

    public StateFlusher(Action write, Func<DateTimeOffset> now, TimeSpan debounce)
    {
        _write = write ?? throw new ArgumentNullException(nameof(write));
        _now = now ?? throw new ArgumentNullException(nameof(now));
        if (debounce < TimeSpan.Zero) throw new ArgumentOutOfRangeException(nameof(debounce), "Debounce cannot be negative.");
        _debounce = debounce;
    }

    public Action<Exception> OnFlushError { get; set; } = _ => { };

    public bool IsDirty => _firstDirtyAt.HasValue;

    public void MarkDirty()
    {
        if (_firstDirtyAt == null) _firstDirtyAt = _now();
    }

    public void Tick()
    {
        if (_firstDirtyAt is not { } firstDirtyAt) return;
        if (_now() - firstDirtyAt >= _debounce) Flush();
    }

    public void Flush()
    {
        if (_firstDirtyAt == null) return;

        try
        {
            _write();
            _firstDirtyAt = null;
        }
        catch (Exception ex)
        {
            OnFlushError(ex);
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        Flush();
        if (!IsDirty) _disposed = true;
    }
}
