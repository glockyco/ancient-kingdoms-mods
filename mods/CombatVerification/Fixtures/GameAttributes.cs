#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Il2Cpp;

namespace CombatVerification.Fixtures
{
    /// <summary>
    /// The attributes an entity carries, read from the members that hold them.
    /// </summary>
    /// <remarks>
    /// The interop layer hands every component back as the base type it was asked for, so six
    /// attribute components all report the same type name and cannot be told apart that way. What
    /// does distinguish them is the member each one is declared under, which is also the name the
    /// game's own commands are built from.
    /// <para>
    /// Deriving the set this way means an attribute added by a game update appears without an edit
    /// here, and one that is renamed stops being reported rather than being reported as zero.
    /// </para>
    /// </remarks>
    internal static class GameAttributes
    {
        private static readonly Dictionary<Type, IReadOnlyList<string>> NamesByOwner = new();

        /// <summary>
        /// Attribute names the owner declares, in declaration order.
        /// </summary>
        public static IReadOnlyList<string> NamesOn(Type owner)
        {
            if (NamesByOwner.TryGetValue(owner, out var cached))
                return cached;

            var names = Members(owner).Select(NameOf).ToList();
            if (names.Count == 0)
                throw new InvalidOperationException(
                    $"{owner.Name} declares no attribute component, so nothing can be reported.");

            NamesByOwner[owner] = names;
            return names;
        }

        /// <summary>The component one attribute is held in, or null when the owner has none.</summary>
        public static PlayerAttribute On(object owner, string name)
        {
            if (owner == null || string.IsNullOrWhiteSpace(name))
                return null;

            foreach (var member in Members(owner.GetType()))
                if (string.Equals(NameOf(member), name, StringComparison.OrdinalIgnoreCase))
                    return Value(member, owner) as PlayerAttribute;

            return null;
        }

        /// <summary>
        /// Members whose type is an attribute. The interop layer exposes a game field as a
        /// property, so both are considered and a property wins where both exist.
        /// </summary>
        private static IEnumerable<MemberInfo> Members(Type owner)
        {
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var property in owner.GetProperties(
                BindingFlags.Public | BindingFlags.Instance))
                if (typeof(PlayerAttribute).IsAssignableFrom(property.PropertyType)
                    && property.CanRead
                    && seen.Add(NameOf(property)))
                    yield return property;

            foreach (var field in owner.GetFields(BindingFlags.Public | BindingFlags.Instance))
                if (typeof(PlayerAttribute).IsAssignableFrom(field.FieldType)
                    && seen.Add(NameOf(field)))
                    yield return field;
        }

        private static string NameOf(MemberInfo member)
            => char.ToLowerInvariant(member.Name[0]) + member.Name.Substring(1);

        private static object Value(MemberInfo member, object owner)
            => member is PropertyInfo property
                ? property.GetValue(owner)
                : ((FieldInfo)member).GetValue(owner);
    }
}
