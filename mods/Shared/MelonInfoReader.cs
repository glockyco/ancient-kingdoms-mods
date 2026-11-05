// Oblivious, because Pocket Compendium's game references hide the compiler's nullable attributes.
#nullable disable
using System;
using System.IO;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;

namespace AncientKingdomsMods.Shared;

/// <summary>
/// Reads the name and version a MelonLoader mod gives in its <c>MelonInfo</c> attribute, which are
/// what MelonLoader logs and the mod shows in game, from the DLL's metadata without loading it.
/// </summary>
internal static class MelonInfoReader
{
    // MelonInfoAttribute(Type type, string name, string version, string author, string downloadLink = null)
    private const int NameArgument = 1;
    private const int VersionArgument = 2;

    public static string Version(string path) => Argument(path, VersionArgument);

    /// <summary>The mod's version, or null for a file that names none or can't be read.</summary>
    public static string TryVersion(string path)
    {
        try
        {
            return Argument(path, VersionArgument);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or BadImageFormatException)
        {
            return null;
        }
    }

    /// <summary>The mod's name, or null for a file that is no MelonLoader mod or can't be read.</summary>
    public static string Name(string path)
    {
        try
        {
            return Argument(path, NameArgument);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or BadImageFormatException)
        {
            return null;
        }
    }

    private static string Argument(string path, int index)
    {
        using var stream = File.OpenRead(path);
        using var pe = new PEReader(stream);
        if (!pe.HasMetadata) return null;

        var reader = pe.GetMetadataReader();
        foreach (var handle in reader.GetAssemblyDefinition().GetCustomAttributes())
        {
            var attribute = reader.GetCustomAttribute(handle);
            if (!IsMelonInfo(reader, attribute)) continue;

            var arguments = attribute.DecodeValue(new TypeNames()).FixedArguments;
            return arguments.Length > index ? arguments[index].Value as string : null;
        }

        return null;
    }

    private static bool IsMelonInfo(MetadataReader reader, CustomAttribute attribute)
    {
        EntityHandle type = attribute.Constructor.Kind switch
        {
            HandleKind.MemberReference => reader.GetMemberReference((MemberReferenceHandle)attribute.Constructor).Parent,
            HandleKind.MethodDefinition => reader.GetMethodDefinition((MethodDefinitionHandle)attribute.Constructor).GetDeclaringType(),
            _ => default,
        };

        return type.Kind switch
        {
            HandleKind.TypeReference => IsMelonInfo(reader, reader.GetTypeReference((TypeReferenceHandle)type).Namespace, reader.GetTypeReference((TypeReferenceHandle)type).Name),
            HandleKind.TypeDefinition => IsMelonInfo(reader, reader.GetTypeDefinition((TypeDefinitionHandle)type).Namespace, reader.GetTypeDefinition((TypeDefinitionHandle)type).Name),
            _ => false,
        };
    }

    private static bool IsMelonInfo(MetadataReader reader, StringHandle space, StringHandle name) =>
        reader.StringComparer.Equals(space, "MelonLoader") && reader.StringComparer.Equals(name, "MelonInfoAttribute");

    // Only the version string is read, so a type's full name stands in for the type.
    private sealed class TypeNames : ICustomAttributeTypeProvider<string>
    {
        public string GetPrimitiveType(PrimitiveTypeCode typeCode) => typeCode.ToString();

        public string GetSystemType() => "System.Type";

        public string GetSZArrayType(string elementType) => elementType + "[]";

        public string GetTypeFromDefinition(MetadataReader reader, TypeDefinitionHandle handle, byte rawTypeKind) =>
            FullName(reader, reader.GetTypeDefinition(handle).Namespace, reader.GetTypeDefinition(handle).Name);

        public string GetTypeFromReference(MetadataReader reader, TypeReferenceHandle handle, byte rawTypeKind) =>
            FullName(reader, reader.GetTypeReference(handle).Namespace, reader.GetTypeReference(handle).Name);

        public string GetTypeFromSerializedName(string name) => name;

        public PrimitiveTypeCode GetUnderlyingEnumType(string type) =>
            throw new BadImageFormatException($"MelonInfo takes no enum, but an argument has type {type}.");

        public bool IsSystemType(string type) => type == "System.Type";

        private static string FullName(MetadataReader reader, StringHandle space, StringHandle name) =>
            space.IsNil ? reader.GetString(name) : reader.GetString(space) + "." + reader.GetString(name);
    }
}
