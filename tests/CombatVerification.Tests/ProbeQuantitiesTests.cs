using System.Collections.Generic;
using CombatVerification.Comparison;
using CombatVerification.Dtos;
using Xunit;

namespace CombatVerification.Tests;

public sealed class ProbeQuantitiesTests
{
    [Fact]
    public void EmitsEveryPresentStatAndNoAbsentResource()
    {
        EntitySheet sheet = new EntitySheet
        {
            Attributes = new Dictionary<string, int> { { "strength", 40 }, { "dexterity", 20 } },
            Combat = new Dictionary<string, double> { { "damage", 101 }, { "haste", 0.2 } },
            Resources = new ResourceSheet
            {
                HealthMax = 500,
                HealthCurrent = 450,
                HealthRecoveryRate = 2,
                HealthMultiplier = 1.1f,
                EnergyMax = 100,
                EnergyRecoveryRate = 1,
                EnergyMultiplier = 1,
                ManaMax = null,
            },
        };

        List<ObservedQuantity> result = ProbeQuantities.StatSheet(sheet, "player");

        Assert.Contains(result, value => value.Quantity == "stat.player.attribute.strength");
        Assert.Contains(result, value => value.Quantity == "stat.player.attribute.dexterity");
        Assert.Contains(result, value => value.Quantity == "stat.player.combat.damage");
        Assert.Contains(result, value => value.Quantity == "stat.player.combat.haste");
        Assert.Contains(result, value => value.Quantity == "stat.player.resource.healthMax");
        Assert.Contains(result, value => value.Quantity == "stat.player.resource.energyMax");
        Assert.DoesNotContain(result, value => value.Quantity == "stat.player.resource.manaMax");
    }

    [Fact]
    public void KeepsIntentAndReductionAsDifferentQuantities()
    {
        PerHitDamageResult result = new PerHitDamageResult
        {
            Hits = new List<LandedHit>
            {
                new LandedHit { Intent = 100, Amount = 80 },
                new LandedHit { Intent = 110, Amount = 90 },
            },
        };

        List<ObservedQuantity> quantities = ProbeQuantities.PerHit(result);

        Assert.Equal(new[] { 100d, 110d }, Assert.Single(
            quantities, value => value.Quantity == "perHit.intent").Values);
        Assert.Equal(new[] { 20d, 20d }, Assert.Single(
            quantities, value => value.Quantity == "perHit.reduction").Values);
    }

    [Fact]
    public void EmitsIntervalsAndSustainedOutputFromObservedWindows()
    {
        ObservedQuantity interval = ProbeQuantities.ActionInterval(new ActionIntervalResult
        {
            Intervals = new List<double> { 1.1, 1.2 },
        });
        ObservedQuantity output = ProbeQuantities.SustainedOutput(new[]
        {
            new PerHitDamageResult { OpenedAt = 10, ClosedAt = 20, Total = 500 },
            new PerHitDamageResult { OpenedAt = 30, ClosedAt = 50, Total = 800 },
        });

        Assert.Equal(new[] { 1.1, 1.2 }, interval.Values);
        Assert.Equal(new[] { 50d, 40d }, output.Values);
    }
}
