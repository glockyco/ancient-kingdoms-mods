namespace CharacterCapture
{
    /// <summary>Command metadata and runtime preconditions without game dependencies.</summary>
    public static class CharacterCaptureCommandCatalog
    {
        public readonly struct Entry
        {
            public Entry(string name, bool mutatesState)
            {
                Name = name;
                MutatesState = mutatesState;
            }

            public string Name { get; }
            public bool MutatesState { get; }
        }

        public static readonly Entry[] All =
        {
            new("character.capture", false),
            new("combatMeter.capture", false),
        };

        public static bool TryGetUnavailableReason(
            string sceneName,
            bool localPlayerReady,
            out string reason)
        {
            if (sceneName != "World")
            {
                reason = "worldUnavailable";
                return true;
            }
            if (!localPlayerReady)
            {
                reason = "localPlayerUnavailable";
                return true;
            }
            reason = string.Empty;
            return false;
        }
    }
}
