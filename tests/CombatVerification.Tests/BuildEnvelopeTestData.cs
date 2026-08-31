using CombatVerification.Fixtures;

namespace CombatVerification.Tests;

internal static class BuildEnvelopeTestData
{
    internal static BuildEnvelope Create(string gameVersion = "0.9.31.1") => new()
    {
        SerializedSchemaVersion = BuildContract.SerializedSchemaVersion,
        CaptureSchemaVersion = BuildContract.CaptureSchemaVersion,
        ModelVersion = BuildContract.ModelVersion,
        GameData = new GameDataVersion
        {
            GameVersion = gameVersion,
            SteamBuildId = "24986533",
            AssemblySha256 = "bd2521453b35dfb58c4feec344d7fa5c8de5a8e73c58b5ff5aa5a4c12a9466fc",
        },
    };
}
