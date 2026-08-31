#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using CombatVerification.Dtos;

namespace CombatVerification.Comparison
{
    public static class ProbeQuantities
    {
        public static List<ObservedQuantity> StatSheet(EntitySheet entity, string entityId)
        {
            if (entity == null) throw new ArgumentNullException("entity");
            if (string.IsNullOrWhiteSpace(entityId)) throw new ArgumentException("Entity id is required.", "entityId");
            List<ObservedQuantity> result = new List<ObservedQuantity>();
            AddDictionary(result, "stat." + entityId + ".attribute.", entity.Attributes);
            AddDictionary(result, "stat." + entityId + ".combat.", entity.Combat);
            ResourceSheet resources = entity.Resources;
            if (resources == null) throw new ComparisonException("Stat sheet has no resource section.");
            AddNullable(result, "stat." + entityId + ".resource.healthMax", resources.HealthMax);
            AddNullable(result, "stat." + entityId + ".resource.healthCurrent", resources.HealthCurrent);
            AddNullable(result, "stat." + entityId + ".resource.healthRecoveryRate", resources.HealthRecoveryRate);
            AddNullable(result, "stat." + entityId + ".resource.healthMultiplier", resources.HealthMultiplier);
            AddNullable(result, "stat." + entityId + ".resource.manaMax", resources.ManaMax);
            AddNullable(result, "stat." + entityId + ".resource.manaRecoveryRate", resources.ManaRecoveryRate);
            AddNullable(result, "stat." + entityId + ".resource.manaMultiplier", resources.ManaMultiplier);
            AddNullable(result, "stat." + entityId + ".resource.energyMax", resources.EnergyMax);
            AddNullable(result, "stat." + entityId + ".resource.energyRecoveryRate", resources.EnergyRecoveryRate);
            AddNullable(result, "stat." + entityId + ".resource.energyMultiplier", resources.EnergyMultiplier);
            return result.OrderBy(quantity => quantity.Quantity, StringComparer.Ordinal).ToList();
        }

        public static List<ObservedQuantity> PerHit(PerHitDamageResult result)
        {
            if (result == null) throw new ArgumentNullException("result");
            if (result.Hits == null) throw new ComparisonException("Per-hit result has no hit sequence.");
            return new List<ObservedQuantity>
            {
                Quantity("perHit.intent", result.Hits.Select(hit => (double)hit.Intent)),
                Quantity("perHit.reduction", result.Hits.Select(hit => (double)(hit.Intent - hit.Amount))),
            };
        }

        public static ObservedQuantity ActionInterval(ActionIntervalResult result)
        {
            if (result == null) throw new ArgumentNullException("result");
            if (result.Intervals == null) throw new ComparisonException("Action interval result has no intervals.");
            return Quantity("actionInterval", result.Intervals);
        }

        public static ObservedQuantity SustainedOutput(IEnumerable<PerHitDamageResult> windows)
        {
            if (windows == null) throw new ArgumentNullException("windows");
            List<double> output = windows.Select(window =>
            {
                if (window == null) throw new ComparisonException("Sustained-output window is null.");
                double duration = window.ClosedAt - window.OpenedAt;
                if (!(duration > 0)) throw new ComparisonException("Sustained-output window has no positive duration.");
                return window.Total / duration;
            }).ToList();
            return Quantity("sustainedOutput", output);
        }

        private static void AddDictionary(
            ICollection<ObservedQuantity> result, string prefix, IDictionary<string, int> values)
        {
            if (values == null) throw new ComparisonException(prefix + " section is missing.");
            foreach (KeyValuePair<string, int> value in values)
                result.Add(Quantity(prefix + value.Key, new[] { (double)value.Value }));
        }

        private static void AddDictionary(
            ICollection<ObservedQuantity> result, string prefix, IDictionary<string, double> values)
        {
            if (values == null) throw new ComparisonException(prefix + " section is missing.");
            foreach (KeyValuePair<string, double> value in values)
                result.Add(Quantity(prefix + value.Key, new[] { value.Value }));
        }

        private static void AddNullable<T>(
            ICollection<ObservedQuantity> result, string name, T? value) where T : struct
        {
            if (value.HasValue) result.Add(Quantity(name, new[] { Convert.ToDouble(value.Value) }));
        }

        private static ObservedQuantity Quantity(string name, IEnumerable<double> values)
        {
            List<double> sequence = values.ToList();
            if (sequence.Count == 0) throw new ComparisonException(name + " has no observed values.");
            return new ObservedQuantity { Quantity = name, Values = sequence };
        }
    }
}
