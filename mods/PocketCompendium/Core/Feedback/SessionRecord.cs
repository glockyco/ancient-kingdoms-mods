using System;
using System.Collections.Generic;

namespace PocketCompendium.Core.Feedback;

/// <summary>
/// The worlds entered and the errors logged since the game started, for problem reports. Each
/// error keeps where the player was when it happened.
/// </summary>
internal static class SessionRecord
{
    /// <summary>The errors kept in full. Later ones are only counted, because a cascade adds little.</summary>
    public const int KeptErrors = 5;

    private static readonly List<LoggedError> Kept = new();
    private static bool _networkActive;

    public static int WorldsEntered { get; private set; }

    public static int ErrorCount { get; private set; }

    public static IReadOnlyList<LoggedError> Errors => Kept;

    /// <summary>
    /// Counts a world when the game's network starts, which it does when the player enters a world,
    /// as its host or as a client. Called once a frame, before anything that can log an error.
    /// </summary>
    public static void Observe(bool networkActive)
    {
        if (networkActive && !_networkActive) WorldsEntered++;
        _networkActive = networkActive;
    }

    public static void Add(string message, Exception exception)
    {
        ErrorCount++;
        if (Kept.Count >= KeptErrors) return;

        Kept.Add(new LoggedError
        {
            Message = message,
            Exception = exception?.ToString(),
            Setting = SetupReader.Setting(),
            Worlds = WorldsEntered,
        });
    }
}
