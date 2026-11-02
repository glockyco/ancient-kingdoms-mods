using System;
using MelonLoader;
using PocketCompendium.Core.Feedback;

namespace PocketCompendium.Core;

/// <summary>Pocket Compendium's MelonLoader log, for code that has no mod instance at hand.</summary>
internal static class Log
{
    private static MelonLogger.Instance _logger;

    internal static void Initialize(MelonLogger.Instance logger) => _logger = logger;

    internal static void Msg(string message) => _logger?.Msg(message);

    internal static void Warning(string message) => _logger?.Warning(message);

    /// <summary>
    /// Logs an error and keeps it for problem reports, which players post in public, so
    /// <paramref name="message"/> names no server address, character name or file path. The
    /// exception follows the message in the log.
    /// </summary>
    internal static void Error(string message, Exception exception = null)
    {
        _logger?.Error(exception == null ? message : message + ": " + exception);
        SessionRecord.Add(message, exception);
    }
}
