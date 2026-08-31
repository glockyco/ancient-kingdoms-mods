using System;
using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2Cpp;
using Il2CppMirror;
using MelonLoader;

namespace DataExporter.Exporters;

public sealed class ProgressionExporter : BaseExporter
{
    public ProgressionExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting character progression...");

        var networkManager = NetworkManager.singleton;
        if (networkManager == null)
            throw new InvalidOperationException("NetworkManager singleton is unavailable.");
        var nmmo = networkManager.TryCast<NetworkManagerMMO>();
        if (nmmo == null)
            throw new InvalidOperationException("NetworkManager cannot be cast to NetworkManagerMMO.");
        if (nmmo.playerClasses == null || nmmo.playerClasses.Count == 0)
            throw new InvalidOperationException("NetworkManagerMMO player classes are unavailable.");

        var classIds = new List<string>();
        int? maxLevel = null;
        foreach (var player in nmmo.playerClasses)
        {
            if (player == null)
                throw new InvalidOperationException("A player class prefab is null.");
            if (player.level == null)
                throw new InvalidOperationException($"Player class prefab '{player.name}' has no level component.");

            var classId = GameIds.Sanitize(player.name);
            if (string.IsNullOrWhiteSpace(classId))
                throw new InvalidOperationException("A player class prefab has no name.");
            classIds.Add(classId);

            if (maxLevel.HasValue && maxLevel.Value != player.level.max)
                throw new InvalidOperationException(
                    $"Player class '{classId}' has max level {player.level.max}; expected {maxLevel.Value}.");
            maxLevel = player.level.max;
        }

        if (classIds.Distinct(StringComparer.Ordinal).Count() != classIds.Count)
            throw new InvalidOperationException("Player class prefabs contain duplicate class identifiers.");

        var progression = ProgressionRows.Create(
            maxLevel ?? throw new InvalidOperationException("No player class level cap was found."),
            Experience.maxVeteranLevel,
            classIds);
        WriteJson(progression, "progression.json");
        Logger.Msg(
            $"Exported progression for {progression.races.Count} races, "
            + $"{classIds.Count} classes, and {progression.level_budgets.Count} levels.");
    }
}
