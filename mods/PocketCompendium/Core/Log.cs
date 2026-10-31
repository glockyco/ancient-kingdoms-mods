using MelonLoader;

namespace PocketCompendium.Core;

/// <summary>Pocket Compendium's MelonLoader log, for code that has no mod instance at hand.</summary>
internal static class Log
{
    private static MelonLogger.Instance _logger;

    internal static void Initialize(MelonLogger.Instance logger) => _logger = logger;

    internal static void Msg(string message) => _logger?.Msg(message);

    internal static void Warning(string message) => _logger?.Warning(message);

    internal static void Error(string message) => _logger?.Error(message);
}
