using System.Collections.Generic;
using BossSkillTracker.Game;
using BossSkillTracker.Model;
using Il2Cpp;
using UnityEngine;
using UnityEngine.UI;

namespace BossSkillTracker.Ui;

public sealed class GroupView
{
    public readonly uint NetId;
    public readonly GameObject Root;
    public RectTransform HeaderRect { get; }

    private readonly Monster _monster;
    private readonly Image _portraitFrame;
    private readonly Image _portrait;
    private readonly Label _name;
    private readonly GateStripView _gate;
    private readonly Transform _rowsParent;
    private readonly List<RowView> _rows = new();
    private bool _engaged;
    private readonly SpecialGateEstimator _estimator = new();

    public GroupView(Transform parent, EnemyInfo info)
    {
        NetId = info.NetId;
        _engaged = info.Engaged;
        _monster = info.Monster;
        Root = HudFactory.Rect($"Group_{info.NetId}", parent);

        var background = HudFactory.Box("bg", Root.transform, Theme.Panel);
        HudFactory.Stretch(background, Vector2.zero, Vector2.zero);

        var header = HudFactory.Box("header", Root.transform, Theme.Header);
        HeaderRect = HudFactory.Place(header, new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, -Tuning.HeaderHeight), Vector2.zero);

        var stripe = HudFactory.Box("stripe", Root.transform, info.TierColor);
        HudFactory.Place(stripe, new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, -Tuning.StripeHeight), Vector2.zero);

        var headerLine = HudFactory.Box("headerLine", header.transform, Theme.Line);
        HudFactory.Place(headerLine, new Vector2(0f, 0f), new Vector2(1f, 0f), Vector2.zero, new Vector2(0f, Tuning.LineWidth));

        _portraitFrame = HudFactory.Box("portraitFrame", header.transform, info.TierColor);
        var portraitBg = HudFactory.Box("portraitBg", _portraitFrame.transform, Theme.IconBg);
        HudFactory.Stretch(portraitBg, new Vector2(Tuning.IconBorder, Tuning.IconBorder), new Vector2(-Tuning.IconBorder, -Tuning.IconBorder));
        _portrait = HudFactory.Icon("portrait", _portraitFrame.transform, info.Portrait);
        HudFactory.Stretch(_portrait, new Vector2(Tuning.IconBorder, Tuning.IconBorder), new Vector2(-Tuning.IconBorder, -Tuning.IconBorder));
        HudFactory.Frame(_portraitFrame.transform, info.TierColor, Tuning.IconBorder);

        _name = HudFactory.Label("name", header.transform, Tuning.NameSize, info.TierColor, Align.Left, bold: true);
        _name.Value = info.Name;

        _gate = new GateStripView(Root.transform);
        HudFactory.Place(_gate.Root.GetComponent<RectTransform>(), new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, -(Tuning.HeaderHeight + Tuning.GateHeight)), new Vector2(0f, -Tuning.HeaderHeight));

        _rowsParent = HudFactory.Rect("rows", Root.transform).transform;
        HudFactory.Place(_rowsParent.GetComponent<RectTransform>(), Vector2.zero, Vector2.one, Vector2.zero, new Vector2(0f, -(Tuning.HeaderHeight + Tuning.GateHeight)));

        var order = SkillOrdering.ByCooldownDesc(info.Skills.ConvertAll(skill => skill.TotalCooldown));
        foreach (int index in order)
        {
            var row = new RowView(_rowsParent);
            row.Bind(info.Skills[index]);
            _rows.Add(row);
        }
    }

    public float Height(bool compact)
    {
        float rowHeight = compact ? Tuning.RowHeightCompact : Tuning.RowHeight;
        return Tuning.HeaderHeight + Tuning.GateHeight + _rows.Count * rowHeight + Tuning.Pad;
    }

    public void Layout(bool compact)
    {
        float portrait = compact ? Tuning.HeaderPortraitSizeCompact : Tuning.HeaderPortraitSize;
        HudFactory.Place(_portraitFrame, new Vector2(0f, 0.5f), new Vector2(0f, 0.5f), new Vector2(Tuning.Pad + 2f, -portrait / 2f), new Vector2(Tuning.Pad + 2f + portrait, portrait / 2f));
        HudFactory.Place(_name.Go.GetComponent<RectTransform>(), Vector2.zero, Vector2.one, new Vector2(Tuning.Pad + 2f + portrait + 8f, 0f), new Vector2(-72f, 0f));

        float rowHeight = compact ? Tuning.RowHeightCompact : Tuning.RowHeight;
        for (int index = 0; index < _rows.Count; index++)
        {
            HudFactory.Place(_rows[index].Root.GetComponent<RectTransform>(), new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(Tuning.Pad, -((index + 1) * rowHeight)), new Vector2(-Tuning.Pad, -(index * rowHeight)));
            _rows[index].Layout(compact);
        }
    }

    public void SetEngaged(bool engaged)
    {
        _engaged = engaged;
    }

    public void UpdateLive(double now, bool compact)
    {
        if (_monster == null) return;

        int currentSkill = SkillReader.CurrentSkill(_monster);
        bool casting = SkillReader.IsCasting(_monster);
        int skillCount = _monster.skills != null && _monster.skills.skills != null ? _monster.skills.skills.Count : 0;
        bool currentIsSpecial = currentSkill >= 1 && currentSkill < skillCount;
        double castEnd = currentIsSpecial ? SkillReader.ReadLive(_monster, currentSkill).CastTimeEnd : 0;

        bool anyReady = false;
        foreach (var row in _rows)
        {
            var live = SkillReader.ReadLive(_monster, row.SkillIndex);
            if (CooldownMath.IsReady(live.CooldownEnd, now)) anyReady = true;
            row.Update(live, casting && currentSkill == row.SkillIndex, now);
        }

        _estimator.Observe(now, engaged: _engaged, currentSkill, casting, currentIsSpecial, castEnd);
        _gate.Update(_estimator.Evaluate(now, anyReady), now);
    }

    public void Destroy() => UnityEngine.Object.Destroy(Root);
}
