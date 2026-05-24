using HotRepl.Control;

namespace HotReplCommands
{
    /// <summary>
    /// Static command metadata. No game-assembly references; safe to compile in Unity-free tests.
    /// </summary>
    public static class HotReplCommandCatalog
    {
        public struct Entry
        {
            public string Name;
            public int Version;
            public ControlCommandKind Kind;
            public bool MutatesState;

            public Entry(string name, int version, ControlCommandKind kind, bool mutatesState)
            {
                Name = name;
                Version = version;
                Kind = kind;
                MutatesState = mutatesState;
            }
        }

        public static readonly Entry[] All = new[]
        {
            new Entry("compendium.preflight", 1, ControlCommandKind.Sync, false),
            new Entry("world.summary",        1, ControlCommandKind.Sync, false),
            new Entry("compendium.export",    1, ControlCommandKind.Job,         true),
            new Entry("game.quit",            1, ControlCommandKind.Sync, true),
        };
    }
}
