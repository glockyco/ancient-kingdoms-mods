using System;
using System.Security.Cryptography;
using System.Text;

namespace PocketCompendium.Tests.Updates;

/// <summary>A mod list in the shape publish-mods writes, and a key pair made for the test run.</summary>
internal static class UpdateTestData
{
    public static readonly byte[] DllV103 = Encoding.ASCII.GetBytes("pretend 1.0.3 DLL");

    public static string List(string sha256) => $$"""
        {
          "schemaVersion": 2,
          "mods": [
            {
              "id": "field-default-value-hook-fix",
              "name": "Field Default Value Hook Fix",
              "version": "1.0.1",
              "description": "Prevents a crash.",
              "fileName": "FieldDefaultValueHookFix.dll",
              "downloadPath": "/mods/FieldDefaultValueHookFix.dll",
              "sizeBytes": 9216,
              "sha256": "edf5d48bb06eeceb97ad083763cf67e2355db38a21339e74b7c102f34dd26b6e"
            },
            {
              "id": "pocket-compendium",
              "name": "Pocket Compendium",
              "version": "1.0.3",
              "description": "Shows when bosses spawn.",
              "fileName": "PocketCompendium.dll",
              "downloadPath": "/mods/PocketCompendium.dll",
              "sizeBytes": {{DllV103.Length}},
              "sha256": "{{sha256}}",
              "releases": [
                { "version": "1.0.3", "changes": ["Shows boss respawn times on the world map.", "Adds compact tiles to the boss list."] },
                { "version": "1.0.2", "changes": ["Fixes the stutter while walking."] }
              ]
            }
          ]
        }
        """;

    public static byte[] ListBytes() => Encoding.UTF8.GetBytes(List(Sha256(DllV103)));

    public static string Sha256(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

    public sealed class Key : IDisposable
    {
        private readonly RSA _rsa = RSA.Create(3072);

        public string Public => Convert.ToBase64String(_rsa.ExportSubjectPublicKeyInfo());

        public string Sign(byte[] data) =>
            Convert.ToBase64String(_rsa.SignData(data, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));

        public void Dispose() => _rsa.Dispose();
    }
}
