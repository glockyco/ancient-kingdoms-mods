using System.Collections.Generic;
using CombatVerification.Fixtures;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace CombatVerification.Tests
{
    /// <summary>
    /// A build captured from a player's game has to be runnable as a fixture without
    /// conversion, so the serialized shape is part of the contract, not an detail of
    /// whichever writer produced it.
    /// </summary>
    public class FixtureRoundTripTests
    {
        // A payload as a capture would emit it: identifiers for items, a display name
        // alongside as context, provenance, and every stat-bearing section stated.
        private const string CapturedPayload = """
        {
          "schemaVersion": 1,
          "gameVersion": "1.4.2",
          "name": "reported-build-4821",
          "seed": 1234,
          "capturedAt": "2026-08-26T12:00:00Z",
          "character": {
            "class": "Warrior",
            "race": "Human",
            "level": 50,
            "veteranPoints": 200,
            "allocatedAttributes": { "strength": 120, "constitution": 129 },
            "skills": [ { "name": "Melee Attack", "level": 3 } ],
            "equipment": [
              {
                "slot": 12,
                "itemId": "rusty_sword",
                "itemName": "Rusty Sword",
                "augmentId": "jagged_shard",
                "durability": 100
              }
            ]
          },
          "companions": [],
          "consumables": [ "roast_boar" ],
          "actions": [ { "skill": "Melee Attack", "facing": "front" } ],
          "target": { "spawn": "dummy", "level": 55 }
        }
        """;

        [Fact]
        public void ACapturedPayloadDeserialisesWithEveryFieldRead()
        {
            var fixture = JsonConvert.DeserializeObject<FixtureDescriptor>(CapturedPayload)!;

            Assert.Equal(1, fixture.SchemaVersion);
            Assert.Equal("1.4.2", fixture.GameVersion);
            Assert.Equal("reported-build-4821", fixture.Name);
            Assert.Equal(1234, fixture.Seed);
            Assert.Equal("2026-08-26T12:00:00Z", fixture.CapturedAt);

            Assert.Equal("Warrior", fixture.Character.Class);
            Assert.Equal(50, fixture.Character.Level);
            Assert.Equal(200, fixture.Character.VeteranPoints);
            Assert.Equal(120, fixture.Character.AllocatedAttributes["strength"]);
            Assert.Equal(3, Assert.Single(fixture.Character.Skills).Level);

            var slot = Assert.Single(fixture.Character.Equipment);
            Assert.Equal(12, slot.Slot);
            Assert.Equal("rusty_sword", slot.ItemId);
            Assert.Equal("Rusty Sword", slot.ItemName);
            Assert.Equal("jagged_shard", slot.AugmentId);
            Assert.Equal(100, slot.Durability);

            Assert.Empty(fixture.Companions);
            Assert.Equal("roast_boar", Assert.Single(fixture.Consumables));
            Assert.Equal("front", Assert.Single(fixture.Actions).Facing);
            Assert.Equal("dummy", fixture.Target.Spawn);
            Assert.Equal(55, fixture.Target.Level);
        }

        [Fact]
        public void SerialisingAndReadingBackPreservesEveryValue()
        {
            var original = JsonConvert.DeserializeObject<FixtureDescriptor>(CapturedPayload)!;

            var again = JsonConvert.DeserializeObject<FixtureDescriptor>(
                JsonConvert.SerializeObject(original))!;

            Assert.Equal(
                JToken.Parse(JsonConvert.SerializeObject(original)),
                JToken.Parse(JsonConvert.SerializeObject(again)));
        }

        [Fact]
        public void EmittedPropertyNamesAreLowerCamel()
        {
            var fixture = JsonConvert.DeserializeObject<FixtureDescriptor>(CapturedPayload)!;

            var emitted = JObject.Parse(JsonConvert.SerializeObject(fixture));

            Assert.True(emitted.ContainsKey("schemaVersion"));
            Assert.True(emitted.ContainsKey("capturedAt"));
            var slot = (JObject)emitted["character"]!["equipment"]![0]!;
            Assert.True(slot.ContainsKey("itemId"));
            Assert.True(slot.ContainsKey("itemName"));
        }

        [Fact]
        public void AnAbsentSectionStaysAbsentRatherThanBecomingEmpty()
        {
            // The distinction is the contract: absent means unread, empty means nothing.
            var fixture = JsonConvert.DeserializeObject<FixtureDescriptor>("""
            { "schemaVersion": 1, "name": "n", "gameVersion": "g", "seed": 1 }
            """)!;

            Assert.Null(fixture.Companions);
            Assert.Null(fixture.Consumables);
            Assert.Null(fixture.Actions);
            Assert.Null(fixture.Character);
        }

        [Fact]
        public void ACapturedPayloadWithAnUnreadSectionIsRefusedNotAssumed()
        {
            var fixture = JsonConvert.DeserializeObject<FixtureDescriptor>(CapturedPayload)!;
            fixture.Consumables = null;   // capture could not read it

            var rules = new SyntheticRules()
                .WithSkill("Melee Attack", classes: new[] { "Warrior" })
                .WithItem("rusty_sword", slot: 12);
            rules.Augments.Add("jagged_shard");
            rules.Consumables.Add("roast_boar");

            var problems = FixtureValidator.Validate(fixture, rules).Problems;

            Assert.Contains("consumables", System.Linq.Enumerable.Select(problems, p => p.Field));
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
            Assert.Contains("name", fields);
            Assert.Contains("gameVersion", fields);
            Assert.Contains("seed", fields);
            Assert.Contains("character", fields);
            Assert.Contains("consumables", fields);
        }

        [Fact]
        public void ACapturedPayloadPassesValidationAgainstMatchingRules()
        {
            var fixture = JsonConvert.DeserializeObject<FixtureDescriptor>(CapturedPayload)!;

            var rules = new SyntheticRules()
                .WithSkill("Melee Attack", classes: new[] { "Warrior" })
                .WithItem("rusty_sword", slot: 12);
            rules.Augments.Add("jagged_shard");
            rules.Consumables.Add("roast_boar");

            Assert.Empty(FixtureValidator.Validate(fixture, rules).Problems);
        }
    }
}
