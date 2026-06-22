using BossSkillTracker.Game;
using BossSkillTracker.Model;
using UnityEngine;
using UnityEngine.UI;

namespace BossSkillTracker.Ui;

public sealed class RowView
{
    public readonly GameObject Root;
    public int SkillIndex { get; private set; }

    private float _totalCooldown;
    private readonly Image _background;
    private readonly Image _iconFrame;
    private readonly Image _icon;
    private readonly Image _cooldownTrack;
    private readonly Image _cooldownFill;
    private readonly Label _name;
    private readonly Label _cast;
    private readonly Label _state;
    private bool _compact;
    private float _nameLeft;

    public RowView(Transform parent)
    {
        Root = HudFactory.Rect("Row", parent);

        _background = HudFactory.Box("bg", Root.transform, Theme.Transparent);
        HudFactory.Stretch(_background, Vector2.zero, Vector2.zero);

        _iconFrame = HudFactory.Box("iconFrame", Root.transform, Theme.Line);
        var iconBg = HudFactory.Box("iconBg", _iconFrame.transform, Theme.IconBg);
        HudFactory.Stretch(iconBg, new Vector2(Tuning.IconBorder, Tuning.IconBorder), new Vector2(-Tuning.IconBorder, -Tuning.IconBorder));
        _icon = HudFactory.Icon("icon", _iconFrame.transform, null);
        HudFactory.Stretch(_icon, new Vector2(Tuning.IconBorder, Tuning.IconBorder), new Vector2(-Tuning.IconBorder, -Tuning.IconBorder));
        HudFactory.Frame(_iconFrame.transform, Theme.Line, Tuning.IconBorder);

        _cooldownTrack = HudFactory.Box("cdtrack", Root.transform, Theme.Track);
        _cooldownFill = HudFactory.Bar("cdfill", _cooldownTrack.transform, Theme.Steel);
        HudFactory.Stretch(_cooldownFill, Vector2.zero, Vector2.zero);

        _name = HudFactory.Label("name", Root.transform, Tuning.RowNameSize, Theme.Text, Align.Left);
        _cast = HudFactory.Label("cast", Root.transform, Tuning.SmallSize, Theme.Cast, Align.Right);
        _cast.Value = "CASTING";
        _cast.SetActive(false);
        _state = HudFactory.Label("state", Root.transform, Tuning.StateSize, Theme.Text, Align.Right);
    }

    public void Bind(TrackedSkill skill)
    {
        SkillIndex = skill.Index;
        _totalCooldown = skill.TotalCooldown;
        _icon.sprite = skill.Icon;
        _icon.enabled = skill.Icon != null;
        _name.Value = skill.Name;
    }

    public void Layout(bool compact)
    {
        _compact = compact;
        float icon = compact ? Tuning.IconSizeCompact : Tuning.IconSize;
        HudFactory.Place(_iconFrame, new Vector2(0f, 0.5f), new Vector2(0f, 0.5f), new Vector2(Tuning.Pad, -icon / 2f), new Vector2(Tuning.Pad + icon, icon / 2f));

        _name.SetActive(!compact);
        _cast.SetActive(false);
        _state.SetActive(!compact);

        _nameLeft = Tuning.Pad + icon + Tuning.Pad;
        if (compact)
        {
            HudFactory.Place(_cooldownTrack, new Vector2(0f, 0.5f), new Vector2(1f, 0.5f), new Vector2(_nameLeft, -Tuning.RowBarHeight / 2f), new Vector2(-Tuning.Pad, Tuning.RowBarHeight / 2f));
            return;
        }

        var rowLayout = RowLayout.For(Tuning.RowStateWidth, Tuning.Pad, Tuning.RowCastWidth, casting: false);
        float stateLeft = -(Tuning.RowStateWidth + Tuning.Pad);
        HudFactory.Place(_name.Go.GetComponent<RectTransform>(), new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(_nameLeft, -22f), new Vector2(rowLayout.NameRightOffset, -4f));
        HudFactory.Place(_cast.Go.GetComponent<RectTransform>(), new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(stateLeft - Tuning.RowCastWidth, -22f), new Vector2(stateLeft, -4f));
        HudFactory.Place(_cooldownTrack, new Vector2(0f, 0f), new Vector2(1f, 0f), new Vector2(_nameLeft, Tuning.Pad), new Vector2(stateLeft, Tuning.Pad + Tuning.RowBarHeight));
        HudFactory.Place(_state.Go.GetComponent<RectTransform>(), new Vector2(1f, 0.5f), new Vector2(1f, 0.5f), new Vector2(stateLeft, -9f), new Vector2(-Tuning.Pad, 9f));
    }

    public void Update(LiveSkill live, bool casting, double now)
    {
        bool ready = CooldownMath.IsReady(live.CooldownEnd, now);
        _background.color = casting ? Theme.CastBg : Theme.Transparent;

        var fill = casting ? Theme.Cast : ready ? Theme.Ready : Theme.Steel;
        if (_cooldownFill.color != fill) _cooldownFill.color = fill;

        float amount = casting ? 1f : CooldownMath.Fill(live.CooldownEnd, _totalCooldown, now);
        if (!Mathf.Approximately(_cooldownFill.fillAmount, amount)) _cooldownFill.fillAmount = amount;

        ApplyCastLayout(casting);
        _name.SetActive(!_compact);
        _state.SetActive(!_compact);
        _name.Color = casting ? Theme.Cast : ready ? Theme.Text : Theme.Muted;
        _state.Value = casting ? "cast" : ready ? "ready" : $"{CooldownMath.Remaining(live.CooldownEnd, now):0.#}s";
        _state.Color = casting || ready ? Theme.Ready : Theme.Text;
    }

    private void ApplyCastLayout(bool casting)
    {
        if (_compact) return;

        var rowLayout = RowLayout.For(Tuning.RowStateWidth, Tuning.Pad, Tuning.RowCastWidth, casting);
        HudFactory.Place(_name.Go.GetComponent<RectTransform>(), new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(_nameLeft, -22f), new Vector2(rowLayout.NameRightOffset, -4f));
        _cast.SetActive(rowLayout.ShowCastLabel);
    }
}
