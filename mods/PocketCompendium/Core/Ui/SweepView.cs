using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// A cooldown sweep over a square portrait: a dark wedge over the share of a wait still to run,
/// clockwise from the top, and a light line along its moving edge. The line shows the progress on
/// portraits whose dark parts hide the wedge.
/// </summary>
public sealed class SweepView
{
    private static readonly Color EdgeColor = new(1f, 0.86f, 0.55f, 0.8f);
    private const float EdgeWidth = 1.5f;

    private readonly Image _wedge;
    private readonly RectTransform _area;
    private readonly RectTransform _edge;
    private float _shown = -1f;

    /// <param name="inset">The gap between the parent's edges and the sweep, such as a frame's width.</param>
    public SweepView(RectTransform parent, float inset, Color wedge)
    {
        _wedge = HudFactory.Box("sweep", parent, wedge);
        _area = HudFactory.Stretch(_wedge, new Vector2(inset, inset), new Vector2(-inset, -inset));
        _wedge.type = Image.Type.Filled;
        _wedge.fillMethod = Image.FillMethod.Radial360;
        _wedge.fillOrigin = (int)Image.Origin360.Top;
        _wedge.fillClockwise = true;

        var edge = HudFactory.Box("edge", _area, EdgeColor);
        _edge = edge.rectTransform;
        _edge.anchorMin = _edge.anchorMax = new Vector2(0.5f, 0.5f);
        _edge.pivot = new Vector2(0.5f, 0f);
        _edge.anchoredPosition = Vector2.zero;
        Set(0f);
    }

    /// <param name="remaining">The share of the wait still to run. 0 hides the sweep.</param>
    public void Set(float remaining)
    {
        if (remaining == _shown) return;
        _shown = remaining;

        bool shown = remaining > 0f;
        _wedge.enabled = shown;
        bool edge = shown && remaining < 1f;
        if (_edge.gameObject.activeSelf != edge) _edge.gameObject.SetActive(edge);
        if (!shown) return;

        _wedge.fillAmount = remaining;
        if (!edge) return;

        // The wedge runs clockwise from the top to this angle. The line reaches the square's edge.
        float angle = remaining * 360f;
        float radians = angle * Mathf.Deg2Rad;
        float half = Mathf.Min(_area.rect.width, _area.rect.height) / 2f;
        float reach = half / Mathf.Max(Mathf.Abs(Mathf.Sin(radians)), Mathf.Abs(Mathf.Cos(radians)));
        _edge.sizeDelta = new Vector2(EdgeWidth, reach);
        _edge.localRotation = Quaternion.Euler(0f, 0f, -angle);
    }
}
