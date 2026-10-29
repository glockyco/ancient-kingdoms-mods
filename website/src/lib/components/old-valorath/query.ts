import { tokenize } from "$lib/search/normalize";

const NAME = ["old", "valorath"] as const;

/**
 * Whether a search query asks about Old Valorath, matched the way the search
 * matches names while typing: every word starts a word of "Old Valorath", and
 * some word starts "Valorath". After "old", one letter of it is enough. Alone it
 * needs three, so "va" or "v" does not count, and "old" alone, which also starts
 * The Old Wyrm's Scale, does not count either. A longer query that contains the
 * whole word, such as "key to old valorath", also counts. Item and quest names
 * contain "Valorath" too, so the notice joins those results instead of
 * replacing them.
 */
export function asksAboutOldValorath(query: string): boolean {
  const words = tokenize(query);
  if (words.includes("valorath")) return true;
  const minimum = words.length > 1 ? 1 : 3;
  return (
    words.length > 0 &&
    words.every((word) => NAME.some((part) => part.startsWith(word))) &&
    words.some((word) => word.length >= minimum && "valorath".startsWith(word))
  );
}
