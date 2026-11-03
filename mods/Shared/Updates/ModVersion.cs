// Oblivious, because Pocket Compendium's game references hide the compiler's nullable attributes.
#nullable disable
using System;
using System.Globalization;

namespace AncientKingdomsMods.Shared.Updates;

/// <summary>A mod's <c>major.minor.patch</c> version, as its <c>MelonInfo</c> attribute and release tag name it.</summary>
internal readonly struct ModVersion : IComparable<ModVersion>, IEquatable<ModVersion>
{
    public ModVersion(int major, int minor, int patch)
    {
        Major = major;
        Minor = minor;
        Patch = patch;
    }

    public int Major { get; }
    public int Minor { get; }
    public int Patch { get; }

    public static bool TryParse(string text, out ModVersion version)
    {
        version = default;
        var parts = text?.Split('.');
        if (parts == null || parts.Length != 3) return false;
        var numbers = new int[3];
        for (int index = 0; index < 3; index++)
        {
            if (parts[index].Length == 0 || !int.TryParse(parts[index], NumberStyles.None, CultureInfo.InvariantCulture, out numbers[index]))
                return false;
        }
        version = new ModVersion(numbers[0], numbers[1], numbers[2]);
        return true;
    }

    public static ModVersion Parse(string text) =>
        TryParse(text, out var version) ? version : throw new FormatException($"\"{text}\" is not a major.minor.patch version.");

    public int CompareTo(ModVersion other)
    {
        if (Major != other.Major) return Major.CompareTo(other.Major);
        if (Minor != other.Minor) return Minor.CompareTo(other.Minor);
        return Patch.CompareTo(other.Patch);
    }

    public bool Equals(ModVersion other) => CompareTo(other) == 0;
    public override bool Equals(object obj) => obj is ModVersion other && Equals(other);
    public override int GetHashCode() => (Major * 1000 + Minor) * 1000 + Patch;
    public override string ToString() => $"{Major}.{Minor}.{Patch}";

    public static bool operator ==(ModVersion left, ModVersion right) => left.Equals(right);
    public static bool operator !=(ModVersion left, ModVersion right) => !left.Equals(right);
    public static bool operator <(ModVersion left, ModVersion right) => left.CompareTo(right) < 0;
    public static bool operator >(ModVersion left, ModVersion right) => left.CompareTo(right) > 0;
    public static bool operator <=(ModVersion left, ModVersion right) => left.CompareTo(right) <= 0;
    public static bool operator >=(ModVersion left, ModVersion right) => left.CompareTo(right) >= 0;
}
