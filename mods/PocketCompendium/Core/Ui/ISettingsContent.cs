using UnityEngine;

namespace PocketCompendium.Core.Ui;

/// <summary>A settings window page that draws its own content instead of saved setting rows.</summary>
public interface ISettingsContent
{
    string Title { get; }

    Sprite Icon { get; }

    /// <summary>Builds the content below the page title and returns its height.</summary>
    float Build(RectTransform parent, float x, float y, float width);

    /// <summary>Handles the pointer while it is over the page.</summary>
    void HandleInput();

    /// <summary>Called when the window drops the content's objects.</summary>
    void Clear();
}
