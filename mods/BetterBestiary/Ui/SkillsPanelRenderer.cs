using BetterBestiary.Data;
using Il2Cpp;
using Il2CppTMPro;
using UnityEngine;
using UnityEngine.UI;

namespace BetterBestiary.Ui;

/// <summary>
/// Builds the per-skill row template and fills rows for a monster:
/// icon + name, skill-intrinsic summary, cooldown, cast time. Column widths are
/// initial values tuned during the in-game pass.
/// </summary>
internal static class SkillsPanelRenderer
{
    private const float IconSize = 36f;
    private const float NameWidth = 150f;
    private const float CdWidth = 64f;
    private const float CastWidth = 64f;

    public static GameObject BuildRowTemplate(Transform parent)
    {
        var row = new GameObject("SkillRowTemplate");
        row.transform.SetParent(parent, false);
        row.AddComponent<RectTransform>();
        var hl = row.AddComponent<HorizontalLayoutGroup>();
        hl.childControlWidth = true;
        hl.childControlHeight = true;
        hl.childForceExpandWidth = false;
        hl.childForceExpandHeight = false;
        hl.spacing = 8f;

        AddIcon(row.transform);
        AddCell(row.transform, "Name", NameWidth, TextAlignmentOptions.Left, false);
        AddCell(row.transform, "Summary", 0f, TextAlignmentOptions.Left, true);
        AddCell(row.transform, "Cd", CdWidth, TextAlignmentOptions.Right, false);
        AddCell(row.transform, "Cast", CastWidth, TextAlignmentOptions.Right, false);
        return row;
    }

    public static void Populate(SkillsPanel panel, Monster monster, SkillSummaryStore store)
    {
        var skills = monster != null ? monster.skills : null;
        var templates = skills != null ? skills.skillTemplates : null;
        var count = templates != null ? templates.Length : 0;

        UIUtils.BalancePrefabs(panel.RowTemplate, count, panel.Content);

        for (var i = 0; i < count; i++)
        {
            var skill = templates[i];
            var rowTf = panel.Content.GetChild(i);
            rowTf.gameObject.SetActive(skill != null);
            if (skill == null)
                continue;

            var icon = rowTf.GetChild(0).GetComponent<Image>();
            var name = rowTf.GetChild(1).GetComponent<TextMeshProUGUI>();
            var summary = rowTf.GetChild(2).GetComponent<TextMeshProUGUI>();
            var cd = rowTf.GetChild(3).GetComponent<TextMeshProUGUI>();
            var cast = rowTf.GetChild(4).GetComponent<TextMeshProUGUI>();

            icon.sprite = skill.image;
            icon.enabled = skill.image != null;
            name.text = i == 0
                ? skill.nameSkill + " <size=70%>(basic attack)</size>"
                : skill.nameSkill;

            var id = SkillId.Sanitize(skill.name);
            var text = store.Get(id);
            summary.text = string.IsNullOrEmpty(text) ? "\u2014" : text;

            var passive = skill.castTime.Get(1) <= 0f && skill.cooldown.Get(1) <= 0f;
            cd.text = passive ? "Passive" : Pretty(skill.cooldown.Get(1));
            cast.text = passive ? "" : Pretty(skill.castTime.Get(1));
        }
    }

    private static string Pretty(float seconds)
        => seconds <= 0f ? "\u2014" : Utils.PrettySeconds(seconds);

    private static void AddIcon(Transform parent)
    {
        var go = new GameObject("Icon");
        go.transform.SetParent(parent, false);
        go.AddComponent<RectTransform>();
        go.AddComponent<Image>();
        var le = go.AddComponent<LayoutElement>();
        le.preferredWidth = IconSize;
        le.preferredHeight = IconSize;
        le.minWidth = IconSize;
    }

    private static void AddCell(Transform parent, string name, float width, TextAlignmentOptions align, bool flexible)
    {
        var tmp = SkillsPanel.MakeText(parent, "", 16f, FontStyles.Normal);
        tmp.gameObject.name = name;
        tmp.alignment = align;
        var le = tmp.gameObject.AddComponent<LayoutElement>();
        if (flexible)
            le.flexibleWidth = 1f;
        else
            le.preferredWidth = width;
    }
}
