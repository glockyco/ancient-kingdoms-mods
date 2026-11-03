// Oblivious, because Pocket Compendium's game references hide the compiler's nullable attributes.
#nullable disable
using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace AncientKingdomsMods.Shared.Updates;

/// <summary>A check or download that failed, with the reason the MelonLoader log records.</summary>
internal sealed class UpdateException : Exception
{
    public UpdateException(string message, Exception inner = null) : base(message, inner) { }
}

/// <summary>The mod list after its signature verified.</summary>
internal sealed class VerifiedList
{
    public VerifiedList(byte[] bytes, string signature, ModList list)
    {
        Bytes = bytes;
        Signature = signature;
        List = list;
    }

    public byte[] Bytes { get; }
    public string Signature { get; }
    public ModList List { get; }
}

/// <summary>
/// Downloads the mod list and mod files. Each request asks for one file and sends nothing else: no
/// identifier, version or setting, and no User-Agent.
/// </summary>
internal sealed class UpdateClient : IDisposable
{
    private readonly HttpClient _http;
    private readonly string _site;
    private readonly string _publicKey;

    public UpdateClient(string site, string publicKey, HttpMessageHandler handler = null)
    {
        _http = handler == null ? new HttpClient() : new HttpClient(handler);
        // Generous, because a download the updater stops waiting for finishes while the game runs and
        // loads at the next start. The updater's own wait before mods load is shorter.
        _http.Timeout = TimeSpan.FromMinutes(2);
        _site = site.TrimEnd('/');
        _publicKey = publicKey;
    }

    public async Task<VerifiedList> FetchListAsync(CancellationToken cancellation = default)
    {
        byte[] bytes;
        string signature;
        try
        {
            bytes = await _http.GetByteArrayAsync(_site + "/mods/manifest.json", cancellation).ConfigureAwait(false);
            signature = await _http.GetStringAsync(_site + "/mods/manifest.json.sig", cancellation).ConfigureAwait(false);
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException)
        {
            throw new UpdateException("the website could not be reached: " + e.Message, e);
        }
        if (!ListSignature.Verifies(bytes, signature, _publicKey))
            throw new UpdateException("the mod list's signature does not verify");
        try
        {
            return new VerifiedList(bytes, signature.Trim(), ModList.Parse(bytes));
        }
        catch (FormatException e)
        {
            throw new UpdateException(e.Message, e);
        }
    }

    /// <summary>The mod's file, after its SHA-256 matched the one the verified list names.</summary>
    public async Task<byte[]> FetchFileAsync(ListedMod mod, CancellationToken cancellation = default)
    {
        byte[] file;
        try
        {
            file = await _http.GetByteArrayAsync(_site + mod.DownloadPath, cancellation).ConfigureAwait(false);
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException)
        {
            throw new UpdateException($"{mod.Version} could not be downloaded: " + e.Message, e);
        }
        if (!string.Equals(ListSignature.Sha256(file), mod.Sha256, StringComparison.OrdinalIgnoreCase))
            throw new UpdateException($"the downloaded {mod.Version} differs from the one the mod list names");
        return file;
    }

    public void Dispose() => _http.Dispose();
}
