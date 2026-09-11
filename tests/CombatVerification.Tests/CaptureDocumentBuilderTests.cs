using System;
using System.Collections.Generic;
using System.Linq;
using CharacterCapture;
using CombatVerification.Builds;
using CombatVerification.Capture;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace CombatVerification.Tests;

public sealed class CaptureDocumentBuilderTests
{
    [Fact]
    public void CompleteCaptureRoundTripsThroughCheckedAdapter()
    {
        var record = Build();

        var logical = CaptureBuildAdapter.AdaptComplete(record);

        Assert.Equal("warrior", logical.Player.ClassId);
        Assert.Empty(logical.LearnedBookIds);
        Assert.Equal(2, record.Containers.Single().EntryCount);
        Assert.Equal(5, record.Containers.Single().TotalQuantity);
    }

    [Fact]
    public void MissingSectionRemainsInspectableButCannotAdapt()
    {
        var build = JObject.FromObject(Logical());
        build.Remove("learnedBookIds");
        var completeness = Completeness();
        completeness["learnedBookIds"] = "missing";

        var record = Build(build, completeness);

        Assert.False(((JObject)record.BuildData).ContainsKey("learnedBookIds"));
        var error = Assert.Throws<CaptureBuildException>(() => CaptureBuildAdapter.AdaptComplete(record));
        Assert.Contains("capture.completeness.learnedBookIds is missing", error.Message);
    }

    [Fact]
    public void UnknownCaptureSchemaIsRejected()
    {
        var record = Build();
        record.CaptureSchemaVersion = 99;

        var error = Assert.Throws<CaptureBuildException>(() =>
            CaptureBuildAdapter.Deserialize(JsonConvert.SerializeObject(record)));

        Assert.Contains("capture.captureSchemaVersion 99 is unsupported", error.Message);
    }

    [Fact]
    public void DuplicateItemInstancesAreRejected()
    {
        var containers = Containers();
        containers[0].Items[1].InstanceId = containers[0].Items[0].InstanceId;

        var error = Assert.Throws<CaptureBuildException>(() => CaptureDocumentBuilder.Build(
            JObject.FromObject(Logical()),
            GameData(),
            Completeness(),
            containers,
            DateTime.UnixEpoch));

        Assert.Contains("instanceId duplicates", error.Message);
    }

    [Fact]
    public void ContainerTotalsAreDerivedFromCapturedEntries()
    {
        var record = Build();

        Assert.Collection(record.Containers, container =>
        {
            Assert.Equal("player.inventory", container.ContainerId);
            Assert.Equal("complete", container.State);
            Assert.Equal(2, container.EntryCount);
            Assert.Equal(5, container.TotalQuantity);
        });
    }

    [Theory]
    [InlineData("Menu", false, true, "worldUnavailable")]
    [InlineData("World", false, true, "localPlayerUnavailable")]
    [InlineData("World", true, false, "")]
    public void RuntimePreconditionsRefuseMissingWorldOrPlayer(
        string scene, bool playerReady, bool unavailable, string expected)
    {
        Assert.Equal(
            unavailable,
            CharacterCaptureCommandCatalog.TryGetUnavailableReason(scene, playerReady, out var reason));
        Assert.Equal(expected, reason);
    }

    [Fact]
    public void CaptureCommandsDeclareNoMutation()
    {
        Assert.Equal(
            new[] { "character.capture", "combatMeter.capture" },
            CharacterCaptureCommandCatalog.All.Select(command => command.Name));
        Assert.All(CharacterCaptureCommandCatalog.All, command => Assert.False(command.MutatesState));
    }

    private static CaptureBuildRecord Build(
        JToken? build = null,
        Dictionary<string, string>? completeness = null) =>
        CaptureDocumentBuilder.Build(
            build ?? JObject.FromObject(Logical()),
            GameData(),
            completeness ?? Completeness(),
            Containers(),
            DateTime.UnixEpoch);

    private static LogicalBuildData Logical() => new()
    {
        SchemaVersion = LogicalBuildAdapter.SchemaVersion,
        Player = new PlayerBuild
        {
            EntityId = "player:1",
            ClassId = "warrior",
            RaceId = "human",
            Level = 1,
            VeteranPoints = 0,
            Attributes = BuildEnvelopeTestData.Attributes(),
            Skills = new List<AllocatedSkill>(),
            Equipment = new List<EquippedItem>(),
        },
        Companions = new List<CompanionBuild>(),
        Consumables = new List<ItemQuantity>(),
        Ammunition = new List<ItemQuantity>(),
        LearnedBookIds = new List<string>(),
        Provenance = new BuildProvenance { Kind = "capture", Source = "character-capture" },
    };

    private static Dictionary<string, string> Completeness() => new()
    {
        ["player"] = "complete",
        ["player.attributes"] = "complete",
        ["player.skills"] = "complete",
        ["player.equipment"] = "complete",
        ["companions"] = "complete",
        ["consumables"] = "complete",
        ["ammunition"] = "complete",
        ["learnedBookIds"] = "complete",
    };

    private static CaptureGameDataIdentity GameData() => new()
    {
        GameVersion = "0.9.31.1",
        SteamBuildId = "24986533",
        AssemblySha256 = "abc123",
    };

    private static List<ContainerCapture> Containers() => new()
    {
        new ContainerCapture
        {
            ContainerId = "player.inventory",
            State = "complete",
            Items = new List<CapturedItem>
            {
                new CapturedItem
                {
                    InstanceId = "player.inventory:0",
                    ItemId = "healing_potion",
                    ItemName = "Healing Potion",
                    Quantity = 2,
                    ContainerId = "player.inventory",
                    Slot = 0,
                },
                new CapturedItem
                {
                    InstanceId = "player.inventory:1",
                    ItemId = "arrow",
                    ItemName = "Arrow",
                    Quantity = 3,
                    ContainerId = "player.inventory",
                    Slot = 1,
                },
            },
        },
    };
}
