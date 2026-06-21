// IL2CPP's stripped mscorlib lacks NullableAttribute, so this file cannot use
// nullable reference annotations (#nullable enable / string?). Disable the
// context explicitly so it also compiles cleanly inside the nullable-enabled
// test project.
#nullable disable

using System.Collections.Generic;
using System.IO;
using System.Reflection;
using Newtonsoft.Json;

namespace BetterBestiary.Data;

/// <summary>
/// Loads the embedded skill-summaries.json (skill_id -> skill-intrinsic effect
/// string, baked from the website's formatSkillEffect). Lookup is by SkillId.
/// IL2CPP-free so it can be unit-tested directly.
/// </summary>
internal sealed class SkillSummaryStore
{
    private readonly Dictionary<string, string> _byId;

    private SkillSummaryStore(Dictionary<string, string> byId) => _byId = byId;

    /// <summary>Returns the summary for a skill id, or null if absent.</summary>
    public string Get(string skillId)
        => skillId != null && _byId.TryGetValue(skillId, out var s) ? s : null;

    public int Count => _byId.Count;

    public static SkillSummaryStore Parse(string json)
    {
        var map = JsonConvert.DeserializeObject<Dictionary<string, string>>(json)
                  ?? new Dictionary<string, string>();
        return new SkillSummaryStore(map);
    }

    public static SkillSummaryStore LoadEmbedded()
    {
        var asm = Assembly.GetExecutingAssembly();
        using var stream = asm.GetManifestResourceStream("skill-summaries.json");
        if (stream == null)
            return new SkillSummaryStore(new Dictionary<string, string>());
        using var reader = new StreamReader(stream);
        return Parse(reader.ReadToEnd());
    }
}
