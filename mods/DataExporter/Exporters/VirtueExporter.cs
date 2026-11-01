#nullable enable

using System;
using System.Collections.Generic;
using System.Linq;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

/// <summary>
/// Writes virtues.json from VirtueRules, VirtueEncounters, the Blessing skill assets and the
/// English column of VirtueText's table. Cooldowns are not exported: the game applies
/// literal minimums over its configured cooldown fields, so those fields alone would mislead.
/// </summary>
public class VirtueExporter : BaseExporter
{
    public VirtueExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    /// <summary>The game's virtue kinds by name, in enum order, without None.</summary>
    internal static IReadOnlyList<string> VirtueNames() =>
        Enum.GetValues(typeof(Il2Cpp.VirtueKind)).Cast<Il2Cpp.VirtueKind>()
            .Where(kind => kind != Il2Cpp.VirtueKind.None)
            .OrderBy(kind => (int)kind)
            .Select(kind => kind.ToString())
            .ToList();

    /// <summary>The English text of a VirtueText key, or null when the key or its text is missing.</summary>
    internal static string? English(string key)
    {
        var entries = Il2Cpp.VirtueText.Entries;
        if (entries == null || !entries.ContainsKey(key))
            return null;
        var texts = entries[key];
        return texts == null || texts.Length == 0 || string.IsNullOrEmpty(texts[0]) ? null : texts[0];
    }

    public override void Export()
    {
        var names = VirtueNames();
        var kinds = Enum.GetValues(typeof(Il2Cpp.VirtueKind)).Cast<Il2Cpp.VirtueKind>()
            .ToDictionary(kind => kind.ToString(), StringComparer.Ordinal);

        var skills = new List<(string SkillId, string Virtue)>();
        foreach (var obj in Resources.FindObjectsOfTypeAll(Il2CppType.Of<Il2Cpp.VirtueBlessingSkill>()))
        {
            var skill = obj.TryCast<Il2Cpp.VirtueBlessingSkill>();
            if (skill == null || string.IsNullOrEmpty(skill.name))
                continue;
            skills.Add((SanitizeId(skill.name), skill.virtue.ToString()));
        }

        var thresholds = Il2Cpp.VirtueRules.Thresholds;
        var data = VirtueRows.Create(
            names,
            thresholds == null ? Array.Empty<int>() : thresholds.ToArray(),
            Enumerable.Range(0, VirtueRows.RankCount).Select(Il2Cpp.VirtueRules.HumilityMultiplier).ToList(),
            Il2Cpp.VirtueEncounters.EscortPoints,
            Il2Cpp.VirtueEncounters.ReturnPoints,
            English,
            (virtue, rank) => Il2Cpp.VirtueRules.TitleEnglish(kinds[virtue], rank),
            skills.Distinct());

        WriteJson(data, "virtues.json");
        Logger.Msg($"✓ Exported {data.virtues.Count} virtues");
    }
}
