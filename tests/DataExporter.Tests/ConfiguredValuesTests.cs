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
        var spawn = new MonsterSpawnData("monster_zone_0_0", "monster", "zone", new Position(0, 0, 0))
        {
            loot_zone_number = 0,
            loot_respawn = false, loot_exp_multiplier = 0.25f,
            loot_drops = new List<ItemDrop>
            {
                new("bag") { rate = 0.2f },
                new("bag") { rate = 0.4f }
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
        var portal = new PortalData("portal", "from", new Position(1, 2, 0), "to",
            new Position(3, 4, 0), new Position(0, 1, 0)) { need_monster_dead_spawn_id = "monster_zone_1_2" };
        var settings = new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore };
        var value = JObject.Parse(JsonConvert.SerializeObject(portal, settings));
        Assert.Equal("monster_zone_1_2", value.Value<string>("need_monster_dead_spawn_id"));
        portal.need_monster_dead_spawn_id = null;
        value = JObject.Parse(JsonConvert.SerializeObject(portal, settings));
        Assert.Equal(JTokenType.Null, value["need_monster_dead_spawn_id"]!.Type);
    }

    [Fact]
    public void DistinctStationOffersDoNotBecomeTypeWideMembership()
    {
        var one = new List<RecipeOfferData> { new("first") { offer_index = 0 } };
        var two = new List<RecipeOfferData> { new("second") { offer_index = 0 } };
        var values = new ConfiguredValues(new Dictionary<string, object> { ["one"] = one, ["two"] = two });
        one.Add(new RecipeOfferData("second") { offer_index = 1 });
        Assert.Equal("first", Assert.Single(values.Read<List<RecipeOfferData>>("one")).definition_key);
        Assert.Equal("second", Assert.Single(values.Read<List<RecipeOfferData>>("two")).definition_key);
    }

    [Fact]
    public void ExactSummonTargetsAndGuardsRemainCapturedWhenSourceReferencesChange()
    {
        var trigger = new SummonTriggerData("Monster", "same_template", "Same Template", new Position(0, 0, 0), "")
        {
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
            new("quest") { offer_index = 0, accept_here = true, complete_here = false },
            new("quest") { offer_index = 1, accept_here = false, complete_here = true },
            new("quest") { offer_index = 2, accept_here = false, complete_here = false }
        };
        var values = new ConfiguredValues(new Dictionary<string, object> { ["offers"] = offers });
        offers[0].complete_here = true;
        var captured = values.Read<List<NpcQuestOfferData>>("offers");
        Assert.Collection(captured,
            row => { Assert.Equal(0, row.offer_index); Assert.True(row.accept_here); Assert.False(row.complete_here); },
            row => { Assert.Equal(1, row.offer_index); Assert.False(row.accept_here); Assert.True(row.complete_here); },
            row => { Assert.Equal(2, row.offer_index); Assert.False(row.accept_here); Assert.False(row.complete_here); });
    }

    [Fact]
    public void RequiredDtoMembersAndOptionalAbsencesSurviveSnapshotCloning()
    {
        var origin = new Position(1, 2, 3);
        var npc = new NpcSpawnData("spawn", "npc", "zone", origin, new Position(4, 5, 6));
        var portal = new PortalData("portal", "from", origin, "to", new Position(7, 8, 9), new Position(0, 1, 0));
        var housing = new HousingCatalogData("house")
        {
            workstations = new List<HomeWorkstationData>
            {
                new("root/station", "crafting")
                {
                    recipe_offers = new List<RecipeOfferData> { new("recipe") }
                }
            }
        };
        var values = new ConfiguredValues(new Dictionary<string, object>
        {
            ["npc"] = npc, ["portal"] = portal, ["housing"] = housing,
            ["monster"] = new MonsterData("monster", "Monster", "Unknown", "Unknown", ""),
            ["definition"] = new NpcData("npc", "NPC", "Unknown"),
            ["sold"] = new ItemSold("item"),
            ["area"] = new TriggerArea("polygon") { points = new List<Point2> { new(1, 2) } }
        });

        var capturedNpc = values.Read<NpcSpawnData>("npc");
        Assert.Equal("spawn", capturedNpc.id);
        Assert.Equal("npc", capturedNpc.npc_id);
        Assert.Equal("zone", capturedNpc.zone_id);
        Assert.Equal(1, capturedNpc.position.x);
        Assert.Equal(4, capturedNpc.origin_follow_position.x);
        Assert.Null(capturedNpc.teleport_destination);
        Assert.Null(capturedNpc.teleport_zone_id);
        var capturedPortal = values.Read<PortalData>("portal");
        Assert.Equal("from", capturedPortal.from_zone_id);
        Assert.Equal("to", capturedPortal.to_zone_id);
        Assert.Equal(7, capturedPortal.destination.x);
        Assert.Null(capturedPortal.required_item_id);
        var workstation = Assert.Single(values.Read<HousingCatalogData>("housing").workstations);
        Assert.Equal("root/station", workstation.component_path);
        Assert.Equal("crafting", workstation.kind);
        Assert.Equal("recipe", Assert.Single(workstation.recipe_offers).definition_key);
        Assert.Equal("Monster", values.Read<MonsterData>("monster").name);
        Assert.Equal("NPC", values.Read<NpcData>("definition").name);
        Assert.Equal("item", values.Read<ItemSold>("sold").item_id);
        var area = values.Read<TriggerArea>("area");
        Assert.Equal("polygon", area.shape);
        Assert.Null(area.center);
        Assert.NotNull(area.points);
        Assert.Equal(1, Assert.Single(area.points).x);
    }
}
