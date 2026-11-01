#nullable enable

using System;
using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;

namespace DataExporter.Exporters;

/// <summary>
/// Builds virtues.json and shrine rows from values read out of the game, and fails on any
/// virtue whose text, title or Blessing skill is missing. Text comes from a lookup over the
/// English column of the game's virtue text table, so the client language cannot change it.
/// </summary>
public static class VirtueRows
{
    public const int RankCount = 6;

    /// <param name="virtueNames">The game's virtue kinds by name, without None, in enum order.</param>
    /// <param name="english">English text for a VirtueText key, or null when the key or text is missing.</param>
    /// <param name="title">The English title of a virtue at rank 1 to 5, from VirtueRules.TitleEnglish.</param>
    /// <param name="blessingSkills">Each Blessing skill's id and the virtue name it grants.</param>
    public static VirtueExportData Create(
        IReadOnlyList<string> virtueNames,
        IReadOnlyList<int> thresholds,
        IReadOnlyList<float> humilityMultipliers,
        int escortPoints,
        int returnPoints,
        Func<string, string?> english,
        Func<string, int, string> title,
        IEnumerable<(string SkillId, string Virtue)> blessingSkills)
    {
        if (thresholds.Count != RankCount || thresholds[0] != 0
            || thresholds.Zip(thresholds.Skip(1)).Any(pair => pair.Second <= pair.First))
            throw new InvalidOperationException(
                $"virtues: rank thresholds must be {RankCount} rising values from 0, got [{string.Join(", ", thresholds)}].");
        if (humilityMultipliers.Count != RankCount)
            throw new InvalidOperationException(
                $"virtues: expected {RankCount} Humility multipliers, got {humilityMultipliers.Count}.");
        if (virtueNames.Count == 0)
            throw new InvalidOperationException("virtues: the game lists no virtues.");

        var skillsByVirtue = blessingSkills
            .GroupBy(skill => skill.Virtue, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.Select(skill => skill.SkillId).OrderBy(id => id, StringComparer.Ordinal).ToList(), StringComparer.Ordinal);
        var unknown = skillsByVirtue.Keys.Except(virtueNames, StringComparer.Ordinal).OrderBy(name => name, StringComparer.Ordinal).ToList();
        if (unknown.Count > 0)
            throw new InvalidOperationException($"virtues: Blessing skills name unknown virtues: {string.Join(", ", unknown)}.");

        string Text(string key) =>
            english(key) is { Length: > 0 } text
                ? text
                : throw new InvalidOperationException($"virtues: missing English text '{key}'.");

        var virtues = new List<VirtueData>();
        foreach (var virtue in virtueNames)
        {
            if (!skillsByVirtue.TryGetValue(virtue, out var skills) || skills.Count == 0)
                throw new InvalidOperationException($"virtues: no Blessing skill grants {virtue}.");
            if (skills.Count > 1)
                throw new InvalidOperationException($"virtues: several Blessing skills grant {virtue}: {string.Join(", ", skills)}.");

            var ranks = new List<VirtueRankData>(RankCount);
            for (var rank = 0; rank < RankCount; rank++)
            {
                var rankTitle = rank == 0 ? "" : title(virtue, rank);
                if (rank > 0 && string.IsNullOrEmpty(rankTitle))
                    throw new InvalidOperationException($"virtues: {virtue} has no title for rank {rank}.");
                ranks.Add(new VirtueRankData
                {
                    rank = rank,
                    points = thresholds[rank],
                    title = rankTitle,
                    effect = Text($"effect.{virtue}.{rank}"),
                });
            }

            virtues.Add(new VirtueData
            {
                id = GameIds.Sanitize(virtue),
                name = Text($"virtue.{virtue}"),
                summary = Text($"effect.{virtue}"),
                blessing_skill_id = skills[0],
                ranks = ranks,
            });
        }

        return new VirtueExportData
        {
            rank_thresholds = thresholds.ToList(),
            rank_zero_label = Text("rank.initial"),
            humility_multipliers = humilityMultipliers.ToList(),
            escort_points = escortPoints,
            return_points = returnPoints,
            virtues = virtues,
        };
    }

    /// <summary>A shrine row named with the game's English shrine name for its virtue.</summary>
    public static VirtueShrineData Shrine(
        string virtue,
        IReadOnlyCollection<string> virtueNames,
        Func<string, string?> english,
        PlacementIds ids,
        string zoneId,
        string subZoneId,
        Position position)
    {
        if (!virtueNames.Contains(virtue, StringComparer.Ordinal))
            throw new InvalidOperationException($"virtue_shrines: shrine at ({position.x}, {position.y}) names no virtue ('{virtue}').");
        var pattern = english("shrine.name");
        var virtueName = english($"virtue.{virtue}");
        if (string.IsNullOrEmpty(pattern) || !pattern.Contains("{0}") || string.IsNullOrEmpty(virtueName))
            throw new InvalidOperationException($"virtue_shrines: missing English shrine name for {virtue}.");
        var virtueId = GameIds.Sanitize(virtue);
        return new VirtueShrineData
        {
            id = ids.Register($"shrine_{virtueId}_{zoneId}", position.x, position.y),
            virtue_id = virtueId,
            name = pattern.Replace("{0}", virtueName),
            zone_id = zoneId,
            sub_zone_id = subZoneId,
            position = position,
        };
    }
}
