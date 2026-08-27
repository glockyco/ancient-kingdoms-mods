#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Il2Cpp;

namespace CombatVerification.Probes
{
    /// <summary>
    /// Reads every combat stat any entity computes.
    /// </summary>
    /// <remarks>
    /// The set is discovered from the component rather than listed here, so a stat a patch adds is
    /// reported without this code changing, and a stat a patch removes stops being reported instead
    /// of reading as zero.
    /// <para>
    /// A stat is a numeric property the component computes and does not accept. It has no setter
    /// because it is derived from the base curve, the level and each bonus component, and that is
    /// what separates one from a stored field with a backing value.
    /// </para>
    /// </remarks>
    public static class CombatStats
    {
        private static readonly PropertyInfo[] Properties = typeof(Combat)
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(property => property.CanRead && !property.CanWrite)
            .Where(property => property.PropertyType == typeof(int)
                || property.PropertyType == typeof(float))
            .OrderBy(property => property.Name, StringComparer.Ordinal)
            .ToArray();

        /// <summary>Every stat the component computes, by the name it declares.</summary>
        public static Dictionary<string, double> Read(Combat combat)
        {
            var stats = new Dictionary<string, double>(Properties.Length);

            foreach (var property in Properties)
            {
                var value = property.GetValue(combat);
                stats[property.Name] = value is float single ? single : (int)value;
            }

            return stats;
        }
    }
}
