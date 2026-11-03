// Oblivious, because Pocket Compendium's game references hide the compiler's nullable attributes.
#nullable disable
using System;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;

namespace AncientKingdomsMods.Shared.Updates;

/// <summary>
/// Checks the signature a deploy makes over the mod list: RSA with PKCS#1 v1.5 padding over SHA-256 of the
/// list's exact bytes, published as base64 in <c>/mods/manifest.json.sig</c>. RSA because .NET's ECDSA check
/// fails under Wine, which runs the game on a Mac and on the Steam Deck.
/// </summary>
internal static class ListSignature
{
    /// <summary>The name under which a project embeds the public key file it verifies with.</summary>
    public const string KeyResource = "AncientKingdomsMods.Updates.ReleaseKey";

    /// <param name="publicKey">The key as base64 of its SubjectPublicKeyInfo, as <c>release-key.txt</c> holds it.</param>
    public static bool Verifies(byte[] list, string signatureBase64, string publicKey)
    {
        try
        {
            using var rsa = RSA.Create();
            rsa.ImportSubjectPublicKeyInfo(Convert.FromBase64String(publicKey.Trim()), out _);
            return rsa.VerifyData(list, Convert.FromBase64String(signatureBase64.Trim()), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        }
        catch (Exception e) when (e is FormatException or CryptographicException)
        {
            return false;
        }
    }

    /// <summary>The public key the given assembly carries as <see cref="KeyResource"/>.</summary>
    public static string EmbeddedKey(Assembly assembly)
    {
        using var stream = assembly.GetManifestResourceStream(KeyResource)
            ?? throw new InvalidOperationException($"{assembly.GetName().Name} carries no {KeyResource} resource.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd().Trim();
    }

    public static string Sha256(byte[] bytes)
    {
        using var sha = SHA256.Create();
        return Convert.ToHexString(sha.ComputeHash(bytes)).ToLowerInvariant();
    }
}
