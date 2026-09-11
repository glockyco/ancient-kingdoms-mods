using System.Collections.Generic;
using CombatVerification.Builds;
using CombatVerification.Fixtures;

namespace CombatVerification.Tests;

internal static class BuildEnvelopeTestData
{
    internal static BuildEnvelope Create(string gameVersion = "0.9.31.1") => new()
    {
        SerializedSchemaVersion = BuildContract.SerializedSchemaVersion,
        ModelVersion = BuildContract.ModelVersion,
        GameData = new GameDataVersion
        {
            GameVersion = gameVersion,
            SteamBuildId = "24986533",
            AssemblySha256 = "bd2521453b35dfb58c4feec344d7fa5c8de5a8e73c58b5ff5aa5a4c12a9466fc",
        },
    };

    internal static AttributeLayers Attributes(
        IReadOnlyDictionary<string, int>? allocated = null) => new()
    {
        BaseProgression = new AttributeValues(),
        Allocated = new AttributeValues
        {
            Strength = Value(allocated, "strength"),
            Constitution = Value(allocated, "constitution"),
            Dexterity = Value(allocated, "dexterity"),
            Intelligence = Value(allocated, "intelligence"),
            Wisdom = Value(allocated, "wisdom"),
            Charisma = Value(allocated, "charisma"),
        },
    };

    private static int Value(IReadOnlyDictionary<string, int>? values, string key)
        => values != null && values.TryGetValue(key, out var value) ? value : 0;
}
