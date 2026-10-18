using System;
using System.Collections.Generic;
using DataExporter.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace DataExporter.Tests;

public class ConfiguredValuesTests
{
    [Fact]
    public void CapturedLootKeepsOrderedRepeatsAndZeroPositionAfterSourceAndReaderMutation()
    {
        var spawn = new MonsterSpawnData
        {
            id = "monster_zone_0_0", position = new Position(0, 0, 0), loot_zone_number = 0,
            loot_respawn = false, loot_exp_multiplier = 0.25f,
            loot_drops = new List<ItemDrop>
            {
                new() { item_id = "bag", rate = 0.2f },
                new() { item_id = "bag", rate = 0.4f }
            }
        };
        var source = new List<MonsterSpawnData> { spawn };
        var values = new ConfiguredValues(new Dictionary<string, object> { ["spawns"] = source });
        spawn.position.x = 999;
        spawn.loot_drops.Clear();
        source.Clear();
        var first = values.Read<List<MonsterSpawnData>>("spawns")[0];
        Assert.Equal(0, first.position.x);
        Assert.Equal(0, first.loot_zone_number);
        Assert.False(first.loot_respawn);
        Assert.Equal(0.25f, first.loot_exp_multiplier);
        Assert.Collection(first.loot_drops,
            drop => { Assert.Equal("bag", drop.item_id); Assert.Equal(0.2f, drop.rate); },
            drop => { Assert.Equal("bag", drop.item_id); Assert.Equal(0.4f, drop.rate); });
        first.loot_drops.Clear();
        Assert.Equal(2, values.Read<List<MonsterSpawnData>>("spawns")[0].loot_drops.Count);
    }

    [Fact]
    public void InvalidationRejectsReadsInsteadOfReturningStaleWorldMembership()
    {
        var values = new ConfiguredValues(new Dictionary<string, object> { ["spawns"] = new[] { "one" } });
        values.Invalidate();
        Assert.Contains("Reload World", Assert.Throws<InvalidOperationException>(
            () => values.Read<string[]>("spawns")).Message);
    }

    [Fact]
    public void ExactPortalTargetAndAbsentTargetSurviveSerialization()
    {
        var portal = new PortalData { need_monster_dead_spawn_id = "monster_zone_1_2" };
        var settings = new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore };
        var value = JObject.Parse(JsonConvert.SerializeObject(portal, settings));
        Assert.Equal("monster_zone_1_2", value.Value<string>("need_monster_dead_spawn_id"));
        portal.need_monster_dead_spawn_id = null!;
        value = JObject.Parse(JsonConvert.SerializeObject(portal, settings));
        Assert.Equal(JTokenType.Null, value["need_monster_dead_spawn_id"]!.Type);
    }

    [Fact]
    public void DistinctStationOffersDoNotBecomeTypeWideMembership()
    {
        var one = new List<RecipeOfferData> { new() { definition_key = "first", offer_index = 0 } };
        var two = new List<RecipeOfferData> { new() { definition_key = "second", offer_index = 0 } };
        var values = new ConfiguredValues(new Dictionary<string, object> { ["one"] = one, ["two"] = two });
        one.Add(new RecipeOfferData { definition_key = "second", offer_index = 1 });
        Assert.Equal("first", Assert.Single(values.Read<List<RecipeOfferData>>("one")).definition_key);
        Assert.Equal("second", Assert.Single(values.Read<List<RecipeOfferData>>("two")).definition_key);
    }

    [Fact]
    public void ExactSummonTargetsAndGuardsRemainCapturedWhenSourceReferencesChange()
    {
        var trigger = new SummonTriggerData
        {
            summoned_entity_type = "Monster", summoned_entity_id = "same_template",
            summoned_monster_spawn_id = "same_template_zone_1_2",
            placeholder_monster_ids = new List<string> { "guard_zone_3_4", "guard_zone_5_6" }
        };
        var values = new ConfiguredValues(new Dictionary<string, object> { ["trigger"] = trigger });
        trigger.summoned_monster_spawn_id = "same_template_zone_9_9";
        trigger.placeholder_monster_ids.Clear();
        var captured = values.Read<SummonTriggerData>("trigger");
        Assert.Equal("same_template_zone_1_2", captured.summoned_monster_spawn_id);
        Assert.Null(captured.summoned_npc_spawn_id);
        Assert.Equal(new[] { "guard_zone_3_4", "guard_zone_5_6" }, captured.placeholder_monster_ids);
        var json = JObject.Parse(JsonConvert.SerializeObject(captured));
        Assert.Equal(JTokenType.Null, json["summoned_npc_spawn_id"]!.Type);
    }

    [Fact]
    public void QuestOfferFlagsAndNativeOrderRemainDistinctForRepeatedQuest()
    {
        var offers = new List<NpcQuestOfferData>
        {
            new() { quest_id = "quest", offer_index = 0, accept_here = true, complete_here = false },
            new() { quest_id = "quest", offer_index = 1, accept_here = false, complete_here = true },
            new() { quest_id = "quest", offer_index = 2, accept_here = false, complete_here = false }
        };
        var values = new ConfiguredValues(new Dictionary<string, object> { ["offers"] = offers });
        offers[0].complete_here = true;
        var captured = values.Read<List<NpcQuestOfferData>>("offers");
        Assert.Collection(captured,
            row => { Assert.Equal(0, row.offer_index); Assert.True(row.accept_here); Assert.False(row.complete_here); },
            row => { Assert.Equal(1, row.offer_index); Assert.False(row.accept_here); Assert.True(row.complete_here); },
            row => { Assert.Equal(2, row.offer_index); Assert.False(row.accept_here); Assert.False(row.complete_here); });
    }
}
