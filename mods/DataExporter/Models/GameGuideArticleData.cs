namespace DataExporter.Models;

/// <summary>One article of the in-game Adventurer's Guide, in English.</summary>
public class GameGuideArticleData
{
    /// <summary>The guide's stable identifier, such as <c>social.loot-rolls</c>.</summary>
    public string id { get; set; }

    /// <summary>The guide category: classes, combat, companions, professions, items, social, or world.</summary>
    public string category { get; set; }

    public string title { get; set; }

    /// <summary>The article body with the guide's own rich-text tags left in place.</summary>
    public string body { get; set; }
}
