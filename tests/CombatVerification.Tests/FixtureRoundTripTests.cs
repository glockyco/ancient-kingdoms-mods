using System.Collections.Generic;
using CombatVerification.Builds;
using CombatVerification.Fixtures;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace CombatVerification.Tests
{
    /// <summary>
    /// A fixture stores logical build data and execution data as separate containers,
    /// so the serialized composition is part of the contract.
    /// </summary>
    public class FixtureRoundTripTests
    {
        private const string FixturePayload = """
        {
          "schemaVersion": 3,
          "build": {
            "serializedSchemaVersion": 3,
            "modelVersion": "1",
            "gameData": {
              "gameVersion": "1.4.2",
              "steamBuildId": "4821",
              "assemblySha256": "12dada1fff4d4787ade3333147202c3b443e376f9023d150371d7c9a06aa4b90"
            }
          },
          "name": "reported-build-4821",
          "buildData": {
            "schemaVersion": 1,
            "player": {
              "entityId": "player",
              "classId": "warrior",
              "raceId": "human",
              "level": 50,
              "veteranPoints": 200,
              "attributes": {
                "rawObserved": null,
                "baseProgression": { "strength": 0, "constitution": 0, "dexterity": 0, "intelligence": 0, "wisdom": 0, "charisma": 0 },
                "allocated": { "strength": 120, "constitution": 129, "dexterity": 0, "intelligence": 0, "wisdom": 0, "charisma": 0 },
                "derivedObserved": null
              },
              "skills": [ { "skillId": "melee_attack", "skillName": "Melee Attack", "level": 3, "pool": "normal" } ],
              "equipment": [
                {
                  "slot": 12,
                  "itemId": "rusty_sword",
                  "itemName": "Rusty Sword",
                  "augmentId": "jagged_shard",
                  "durability": 100,
                  "amount": 1
                }
              ]
            },
            "companions": [],
            "consumables": [ { "itemId": "roast_boar", "itemName": "Roast Boar", "quantity": 1 } ],
            "ammunition": [],
            "learnedBookIds": [ "forgotten_tome" ],
            "provenance": { "kind": "capture", "source": "player-save" }
          },
          "execution": {
            "seed": 1234,
            "actions": [ { "skill": "Melee Attack", "facing": "front" } ],
            "target": { "spawn": "dummy", "level": 55 }
          }
        }
        """;

        [Fact]
        public void AFixturePayloadDeserialisesWithEveryFieldRead()
        {
            var fixture = JsonConvert.DeserializeObject<FixtureDescriptor>(FixturePayload)!;

            Assert.Equal(3, fixture.SchemaVersion);
            Assert.Equal(3, fixture.Build.SerializedSchemaVersion);
            Assert.Equal("1", fixture.Build.ModelVersion);
            Assert.Equal("1.4.2", fixture.Build.GameData.GameVersion);
            Assert.Equal("4821", fixture.Build.GameData.SteamBuildId);
            Assert.Equal("reported-build-4821", fixture.Name);
            Assert.Equal("capture", fixture.BuildData.Provenance.Kind);
            Assert.Equal("player-save", fixture.BuildData.Provenance.Source);
            Assert.Equal(1234, fixture.Execution.Seed);

            Assert.Equal("warrior", fixture.BuildData.Player.ClassId);
            Assert.Equal(50, fixture.BuildData.Player.Level);
            Assert.Equal(200, fixture.BuildData.Player.VeteranPoints);
            Assert.Equal(120, fixture.BuildData.Player.Attributes.Allocated.Strength);
            Assert.Equal(3, Assert.Single(fixture.BuildData.Player.Skills).Level);

            var slot = Assert.Single(fixture.BuildData.Player.Equipment);
            Assert.Equal(12, slot.Slot);
            Assert.Equal("rusty_sword", slot.ItemId);
            Assert.Equal("Rusty Sword", slot.ItemName);
            Assert.Equal("jagged_shard", slot.AugmentId);
            Assert.Equal(100, slot.Durability);

            Assert.Empty(fixture.BuildData.Companions);
            Assert.Equal("roast_boar", Assert.Single(fixture.BuildData.Consumables).ItemId);
            Assert.Equal("forgotten_tome", Assert.Single(fixture.BuildData.LearnedBookIds));
            Assert.Equal("front", Assert.Single(fixture.Execution.Actions).Facing);
            Assert.Equal("dummy", fixture.Execution.Target.Spawn);
            Assert.Equal(55, fixture.Execution.Target.Level);
        }

        [Fact]
        public void SerialisingAndReadingBackPreservesEveryValue()
        {
            var original = JsonConvert.DeserializeObject<FixtureDescriptor>(FixturePayload)!;

            var again = JsonConvert.DeserializeObject<FixtureDescriptor>(
                JsonConvert.SerializeObject(original))!;

            Assert.Equal(
                JToken.Parse(JsonConvert.SerializeObject(original)),
                JToken.Parse(JsonConvert.SerializeObject(again)));
        }

        [Fact]
        public void EmittedPropertyNamesAreLowerCamel()
        {
            var fixture = JsonConvert.DeserializeObject<FixtureDescriptor>(FixturePayload)!;

            var emitted = JObject.Parse(JsonConvert.SerializeObject(fixture));

            Assert.True(emitted.ContainsKey("schemaVersion"));
            Assert.True(emitted.ContainsKey("build"));
            Assert.True(((JObject)emitted["build"]!).ContainsKey("serializedSchemaVersion"));
            Assert.True(emitted.ContainsKey("buildData"));
            var provenance = (JObject)emitted["buildData"]!["provenance"]!;
            Assert.True(provenance.ContainsKey("kind"));
            Assert.True(provenance.ContainsKey("source"));
            Assert.True(emitted.ContainsKey("execution"));
            Assert.False(emitted.ContainsKey("capturedAt"));
            var slot = (JObject)emitted["buildData"]!["player"]!["equipment"]![0]!;
            Assert.True(slot.ContainsKey("itemId"));
            Assert.True(slot.ContainsKey("itemName"));
        }

        [Fact]
        public void AnAbsentSectionStaysAbsentRatherThanBecomingEmpty()
        {
            // The distinction is the contract: absent means unread, empty means nothing.
            var fixture = JsonConvert.DeserializeObject<FixtureDescriptor>("""
            { "schemaVersion": 3, "build": {}, "name": "n" }
            """)!;

            Assert.Null(fixture.BuildData);
            Assert.Null(fixture.Execution);
        }

        [Fact]
        public void AFixturePayloadWithAnUnreadSectionIsRefusedNotAssumed()
        {
            var fixture = JsonConvert.DeserializeObject<FixtureDescriptor>(FixturePayload)!;
            fixture.BuildData.Consumables = null;   // capture could not read it

            var rules = new SyntheticRules()
                .WithSkill("Melee Attack", classes: new[] { "Warrior" })
                .WithItem("rusty_sword", slot: 12)
                .WithItem("forgotten_tome", slot: 0, isBook: true);
            rules.Augments.Add("jagged_shard");
            rules.Consumables.Add("roast_boar");

            var problems = FixtureValidator.Validate(fixture, rules).Problems;

            Assert.Contains("buildData.consumables", System.Linq.Enumerable.Select(problems, p => p.Field));
        }

        [Fact]
        public void AnEmptyPayloadIsRefusedWithNamedFieldsRatherThanThrowing()
        {
            // Reading must not abort on the first absent field, because a fixture may be
            // wrong in several ways and the contract is to name each one.
            var fixture = JsonConvert.DeserializeObject<FixtureDescriptor>("{}")!;

            var problems = FixtureValidator.Validate(fixture, new SyntheticRules()).Problems;
            var fields = System.Linq.Enumerable.ToList(
                System.Linq.Enumerable.Select(problems, p => p.Field));

            Assert.Contains("schemaVersion", fields);
            Assert.Contains("build", fields);
            Assert.Contains("name", fields);
            Assert.Contains("buildData", fields);
            Assert.Contains("execution", fields);
        }

        [Fact]
        public void AFixturePayloadPassesValidationAgainstMatchingRules()
        {
            var fixture = JsonConvert.DeserializeObject<FixtureDescriptor>(FixturePayload)!;

            var rules = new SyntheticRules()
                .WithSkill("Melee Attack", classes: new[] { "Warrior" })
                .WithItem("rusty_sword", slot: 12)
                .WithItem("forgotten_tome", slot: 0, isBook: true);
            rules.Augments.Add("jagged_shard");
            rules.Consumables.Add("roast_boar");

            Assert.Empty(FixtureValidator.Validate(fixture, rules).Problems);
        }
    }
}
