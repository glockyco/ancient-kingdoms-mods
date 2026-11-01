namespace PocketCompendium.Core.Feedback;

/// <summary>
/// The addresses the About page links. A test compares those the website also links with the
/// website's own constants, so the two cannot drift apart.
/// </summary>
public static class ModLinks
{
    public const string Site = "https://ancient-kingdoms.compendiums.org";
    public const string Source = "https://github.com/glockyco/ancient-kingdoms-mods/tree/main/mods/PocketCompendium";
    public const string Discord = "https://discord.gg/8MkSWjXwab";
    public const string KoFi = "https://ko-fi.com/wowmuch";
    public const string IdeasForm = ProblemReport.FormUrl + "?template=pocket-compendium-idea.yml";
}
