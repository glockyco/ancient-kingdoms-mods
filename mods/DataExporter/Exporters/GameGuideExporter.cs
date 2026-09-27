using System;
using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

/// <summary>
/// Exports the articles of the in-game Adventurer's Guide. The compendium maps every article to
/// the section that covers its topic, and the digest of each body shows when a patch edits one.
/// </summary>
/// <remarks>
/// <c>GameWikiContent.Load</c> also returns generated skill entries, which carry no article. Those
/// are skipped because the skill exports already cover them. The English fields are read directly
/// so the export does not depend on the language the game has selected.
/// </remarks>
public class GameGuideExporter : BaseExporter
{
    public GameGuideExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting Adventurer's Guide articles...");

        var entries = Il2Cpp.GameWikiContent.Load();
        var articles = new List<GameGuideArticleData>();
        foreach (var entry in entries)
        {
            var article = entry.article;
            if (article == null)
                continue;

            articles.Add(new GameGuideArticleData
            {
                id = article.id,
                category = article.category,
                title = article.titleEn,
                body = article.bodyEn,
            });
        }

        if (articles.Count == 0)
            throw new InvalidOperationException("The Adventurer's Guide returned no articles.");

        articles.Sort((a, b) => string.CompareOrdinal(a.id, b.id));
        WriteJson(articles, "game_guide.json");
        Logger.Msg($"Exported {articles.Count} guide articles");
    }
}
