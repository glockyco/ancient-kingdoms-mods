using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using AncientKingdomsMods.Shared.Updates;
using Xunit;

namespace PocketCompendium.Tests.Updates;

public sealed class UpdateClientTests
{
    private sealed class FakeSite : HttpMessageHandler
    {
        public readonly Dictionary<string, byte[]> Files = new();
        public readonly List<HttpRequestMessage> Requests = new();

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request);
            var response = Files.TryGetValue(request.RequestUri!.AbsolutePath, out var body)
                ? new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(body) }
                : new HttpResponseMessage(HttpStatusCode.NotFound);
            return Task.FromResult(response);
        }
    }

    private static (FakeSite Site, UpdateTestData.Key Key) Site(byte[]? dll = null, bool sign = true)
    {
        var site = new FakeSite();
        var key = new UpdateTestData.Key();
        byte[] list = UpdateTestData.ListBytes();
        site.Files["/mods/manifest.json"] = list;
        if (sign) site.Files["/mods/manifest.json.sig"] = Encoding.ASCII.GetBytes(key.Sign(list));
        site.Files["/mods/PocketCompendium.dll"] = dll ?? UpdateTestData.DllV103;
        return (site, key);
    }

    [Fact]
    public async Task A_signed_list_and_its_file_download()
    {
        var (site, key) = Site();
        using var client = new UpdateClient("https://example.test", key.Public, site);

        var list = await client.FetchListAsync(TestContext.Current.CancellationToken);
        var mod = list.List.Find(ModList.PocketCompendiumId)!;
        byte[] file = await client.FetchFileAsync(mod, TestContext.Current.CancellationToken);

        Assert.Equal(UpdateTestData.DllV103, file);
    }

    [Fact]
    public async Task A_list_signed_with_another_key_is_refused()
    {
        var (site, _) = Site();
        using var otherKey = new UpdateTestData.Key();
        using var client = new UpdateClient("https://example.test", otherKey.Public, site);

        var error = await Assert.ThrowsAsync<UpdateException>(() => client.FetchListAsync(TestContext.Current.CancellationToken));
        Assert.Contains("signature", error.Message);
    }

    [Fact]
    public async Task A_list_without_a_signature_is_refused()
    {
        var (site, key) = Site(sign: false);
        using var client = new UpdateClient("https://example.test", key.Public, site);

        await Assert.ThrowsAsync<UpdateException>(() => client.FetchListAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_file_that_differs_from_the_list_is_refused()
    {
        var (site, key) = Site(dll: Encoding.ASCII.GetBytes("a different DLL"));
        using var client = new UpdateClient("https://example.test", key.Public, site);
        var list = await client.FetchListAsync(TestContext.Current.CancellationToken);

        await Assert.ThrowsAsync<UpdateException>(() =>
            client.FetchFileAsync(list.List.Find(ModList.PocketCompendiumId)!, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Requests_ask_for_their_file_and_send_nothing_about_the_player()
    {
        var (site, key) = Site();
        using var client = new UpdateClient("https://example.test", key.Public, site);

        var list = await client.FetchListAsync(TestContext.Current.CancellationToken);
        await client.FetchFileAsync(list.List.Find(ModList.PocketCompendiumId)!, TestContext.Current.CancellationToken);

        Assert.Equal(
            new[] { "/mods/manifest.json", "/mods/manifest.json.sig", "/mods/PocketCompendium.dll" },
            site.Requests.ConvertAll(request => request.RequestUri!.PathAndQuery));
        Assert.All(site.Requests, request =>
        {
            Assert.Equal(HttpMethod.Get, request.Method);
            Assert.Empty(request.Headers);
        });
    }
}
