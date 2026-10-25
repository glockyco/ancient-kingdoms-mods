using System;

namespace System.Runtime.CompilerServices;

// Unity's interop assemblies expose constructorless nullable attribute stubs, so the mod supplies valid metadata types.
[AttributeUsage(AttributeTargets.All, Inherited = false)]
internal sealed class NullableAttribute : Attribute
{
    public readonly byte[] NullableFlags;

    public NullableAttribute(byte flag) => NullableFlags = new[] { flag };

    public NullableAttribute(byte[] flags) => NullableFlags = flags;
}

[AttributeUsage(AttributeTargets.All, Inherited = false)]
internal sealed class NullableContextAttribute : Attribute
{
    public readonly byte Flag;

    public NullableContextAttribute(byte flag) => Flag = flag;
}
