using System;

// Lets this test assembly stand in for a built mod: publish-mods reads this version from it.
[assembly: MelonLoader.MelonInfo(typeof(BuildTool.Tests.PublishModsCommandTests), "Fixture mod", "2.3.4", "Tests")]

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
