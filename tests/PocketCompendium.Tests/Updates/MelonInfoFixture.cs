using System;

// Lets this test assembly stand in for an installed Pocket Compendium under another file name.
[assembly: MelonLoader.MelonInfo(typeof(PocketCompendium.Tests.Updates.StagingTests), "Pocket Compendium", "1.0.2", "Tests")]

namespace MelonLoader
{
    /// <summary>The shape of MelonLoader's attribute, without a reference to the game's MelonLoader.</summary>
    [AttributeUsage(AttributeTargets.Assembly)]
    public sealed class MelonInfoAttribute : Attribute
    {
        public MelonInfoAttribute(Type type, string name, string version, string author, string? downloadLink = null)
        {
        }
    }
}
