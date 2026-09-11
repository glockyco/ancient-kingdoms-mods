using CombatVerification.Builds;
using CombatVerification.Capture;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace CombatVerification.Tests;

public sealed class LogicalBuildAdapterTests
{
    private const string BuildJson = """
    {
      "schemaVersion": 1,
      "player": {
        "entityId": "player",
        "classId": "warrior",
        "raceId": "human",
        "level": 50,
        "veteranPoints": 200,
        "attributes": {
          "rawObserved": null,
          "baseProgression": { "strength": 20, "constitution": 18, "dexterity": 10, "intelligence": 8, "wisdom": 9, "charisma": 7 },
          "allocated": { "strength": 120, "constitution": 129, "dexterity": 0, "intelligence": 0, "wisdom": 0, "charisma": 0 },
          "derivedObserved": null
        },
        "skills": [ { "skillId": "melee_attack", "skillName": "Melee Attack", "level": 3, "pool": "normal" } ],
        "equipment": [ { "slot": 12, "itemId": "rusty_sword", "itemName": "Rusty Sword", "augmentId": null, "durability": 100, "amount": 1 } ]
      },
      "companions": [ {
        "entityId": "mercenary-1",
        "kind": "mercenary",
        "archetypeId": "warrior",
        "raceId": "human",
        "level": 50,
        "healthMultiplier": 1.1,
        "resourceMultiplier": 1.2,
        "baseCombat": 47,
        "skills": [],
        "equipment": []
      } ],
      "consumables": [ { "itemId": "roast_boar", "itemName": "Roast Boar", "quantity": 2 } ],
      "ammunition": [ { "itemId": "arrow", "itemName": "Arrow", "quantity": 40 } ],
      "learnedBookIds": [ "forgotten_tome" ],
      "provenance": { "kind": "authored", "source": "adapter-test" }
    }
    """;

    [Fact]
    public void LogicalBuildRoundTripPreservesLayeredInputsAndStableIds()
    {
        var build = LogicalBuildAdapter.Deserialize(BuildJson);
        var serialized = JsonConvert.SerializeObject(build);
        var again = LogicalBuildAdapter.Deserialize(serialized);

        Assert.Equal(
            JToken.Parse(serialized),
            JToken.Parse(JsonConvert.SerializeObject(again)));
        Assert.Equal(20, build.Player.Attributes.BaseProgression.Strength);
        Assert.Equal(120, build.Player.Attributes.Allocated.Strength);
        Assert.Null(build.Player.Attributes.RawObserved);
        Assert.Null(build.Player.Attributes.DerivedObserved);
        Assert.Equal("melee_attack", Assert.Single(build.Player.Skills).SkillId);
        Assert.Equal(2, Assert.Single(build.Consumables).Quantity);
        Assert.Equal(40, Assert.Single(build.Ammunition).Quantity);
        Assert.Equal("forgotten_tome", Assert.Single(build.LearnedBookIds));
    }

    [Fact]
    public void LogicalBuildRejectsMissingUnknownAndDuplicateState()
    {
        var missingLayer = JObject.Parse(BuildJson);
        ((JObject)missingLayer["player"]!["attributes"]!).Remove("rawObserved");
        Assert.Throws<JsonSerializationException>(
            () => LogicalBuildAdapter.Deserialize(missingLayer.ToString()));

        var unknownField = JObject.Parse(BuildJson);
        unknownField["copiedBookGains"] = new JObject();
        Assert.Throws<JsonSerializationException>(
            () => LogicalBuildAdapter.Deserialize(unknownField.ToString()));

        var duplicateBook = JObject.Parse(BuildJson);
        duplicateBook["learnedBookIds"] = new JArray("forgotten_tome", "forgotten_tome");
        var duplicate = Assert.Throws<LogicalBuildException>(
            () => LogicalBuildAdapter.Deserialize(duplicateBook.ToString()));
        Assert.Contains("buildData.learnedBookIds[1]", duplicate.Message);
    }

    [Fact]
    public void CaptureIntegrityIsCheckedBeforeCompleteBuildAdaptation()
    {
        var capture = Capture(BuildJson, learnedBooksState: "complete");
        var adapted = CaptureBuildAdapter.AdaptComplete(
            CaptureBuildAdapter.Deserialize(capture.ToString()));
        Assert.Equal("player", adapted.Player.EntityId);

        ((JObject)capture["containers"]![0]!)["totalQuantity"] = 2;
        var corrupt = Assert.Throws<CaptureBuildException>(
            () => CaptureBuildAdapter.Deserialize(capture.ToString()));
        Assert.Contains("totalQuantity does not match", corrupt.Message);
    }

    [Fact]
    public void PartialCaptureRemainsReadableButCannotBecomeACompleteBuild()
    {
        var capture = Capture("{}", learnedBooksState: "missing");
        var parsed = CaptureBuildAdapter.Deserialize(capture.ToString());

        Assert.Equal("missing", parsed.Completeness["learnedBookIds"]);
        var incomplete = Assert.Throws<CaptureBuildException>(
            () => CaptureBuildAdapter.AdaptComplete(parsed));
        Assert.Contains("capture.completeness.learnedBookIds is missing", incomplete.Message);
    }

    private static JObject Capture(string buildJson, string learnedBooksState)
    {
        var completeness = new JObject
        {
            ["player"] = "complete",
            ["player.attributes"] = "complete",
            ["player.skills"] = "complete",
            ["player.equipment"] = "complete",
            ["companions"] = "complete",
            ["consumables"] = "complete",
            ["ammunition"] = "complete",
            ["learnedBookIds"] = learnedBooksState,
        };
        return new JObject
        {
            ["captureSchemaVersion"] = 1,
            ["producer"] = new JObject
            {
                ["id"] = "character-state-export",
                ["version"] = "1",
                ["capturedAtUtc"] = "2026-08-01T12:00:00Z",
            },
            ["gameData"] = new JObject
            {
                ["gameVersion"] = "0.9.31.1",
                ["steamBuildId"] = "24986533",
                ["assemblySha256"] = "bd2521453b35dfb58c4fec344d7fa5c8de5a8e73c58b5ff5aa5a4c12a9466fc0",
            },
            ["modelCompatibility"] = "1",
            ["buildData"] = JToken.Parse(buildJson),
            ["completeness"] = completeness,
            ["containers"] = new JArray(new JObject
            {
                ["containerId"] = "inventory",
                ["state"] = "complete",
                ["entryCount"] = 1,
                ["totalQuantity"] = 1,
            }),
            ["ownedItems"] = new JArray(new JObject
            {
                ["instanceId"] = "inventory:0",
                ["itemId"] = "rusty_sword",
                ["itemName"] = "Rusty Sword",
                ["quantity"] = 1,
                ["containerId"] = "inventory",
                ["slot"] = null,
                ["augmentId"] = null,
                ["durability"] = 100,
            }),
        };
    }
}
