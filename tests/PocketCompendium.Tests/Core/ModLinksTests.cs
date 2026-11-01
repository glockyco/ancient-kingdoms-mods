using System;
using System.IO;
using System.Text.RegularExpressions;
using PocketCompendium.Core.Feedback;
using Xunit;

namespace PocketCompendium.Tests.Core;

public sealed class ModLinksTests
{
    private static string RepositoryFile(string relative)
    {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory != null; directory = directory.Parent)
        {
            string candidate = Path.Combine(directory.FullName, relative);
            if (File.Exists(candidate)) return File.ReadAllText(candidate);
        }

        throw new FileNotFoundException("Not found above the test output: " + relative);
    }

    private static string WebsiteConstant(string file, string name)
    {
        var match = Regex.Match(RepositoryFile(file), "export const " + name + @"\s*=\s*""([^""]+)""");
        Assert.True(match.Success, $"{name} is missing from {file}");
        return match.Groups[1].Value;
    }

    [Fact]
    public void The_about_page_links_what_the_website_links()
    {
        Assert.Equal(WebsiteConstant("website/src/lib/seo/site.ts", "SITE_URL"), ModLinks.Site);
        Assert.Equal(WebsiteConstant("website/src/lib/constants/links.ts", "DISCORD_URL"), ModLinks.Discord);
        Assert.Equal(WebsiteConstant("website/src/lib/constants/links.ts", "KOFI_URL"), ModLinks.KoFi);
    }

    [Fact]
    public void The_forms_the_links_open_exist_with_the_fields_they_fill()
    {
        string problem = RepositoryFile(".github/ISSUE_TEMPLATE/" + ProblemReport.FormFile);
        Assert.Matches(@"(?m)^\s+id:\s*" + ProblemReport.DetailsField + @"\s*$", problem);

        string ideasFile = ModLinks.IdeasForm.Substring(ModLinks.IdeasForm.IndexOf("template=", StringComparison.Ordinal) + "template=".Length);
        RepositoryFile(".github/ISSUE_TEMPLATE/" + ideasFile);
    }
}
