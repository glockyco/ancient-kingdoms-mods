using System.Text;

namespace PocketCompendium.Core.Text;

/// <summary>
/// Keeps the last two words of each line of a wrapping text together, so a wrapped line never
/// ends with one word alone. TextMesh Pro does not break at a no-break space. Rich text tags
/// count as part of their word, and a line whose last words are already bound stays as it is.
/// </summary>
public static class Wrapping
{
    private const char NoBreakSpace = '\u00A0';

    public static void KeepLastWordsTogether(StringBuilder text)
    {
        int end = text.Length;
        for (int i = text.Length - 1; i >= -1; i--)
        {
            if (i >= 0 && text[i] != '\n') continue;
            BindLastSpace(text, i + 1, end);
            end = i;
        }
    }

    public static string KeepLastWordsTogether(string text)
    {
        var builder = new StringBuilder(text);
        KeepLastWordsTogether(builder);
        return builder.ToString();
    }

    // Replaces the last space between two visible words of one line.
    private static void BindLastSpace(StringBuilder text, int start, int end)
    {
        bool inTag = false, wordAfter = false;
        for (int i = end - 1; i >= start; i--)
        {
            char c = text[i];
            if (inTag)
            {
                if (c == '<') inTag = false;
                continue;
            }
            if (c == '>')
            {
                inTag = true;
                continue;
            }
            if (c == NoBreakSpace)
            {
                if (wordAfter) return;
                continue;
            }
            if (c != ' ')
            {
                wordAfter = true;
                continue;
            }
            if (!wordAfter) continue;
            if (HasWordBefore(text, start, i)) text[i] = NoBreakSpace;
            return;
        }
    }

    private static bool HasWordBefore(StringBuilder text, int start, int index)
    {
        bool inTag = false;
        for (int i = index - 1; i >= start; i--)
        {
            char c = text[i];
            if (inTag)
            {
                if (c == '<') inTag = false;
                continue;
            }
            if (c == '>')
            {
                inTag = true;
                continue;
            }
            if (c != ' ' && c != NoBreakSpace) return true;
        }
        return false;
    }
}
