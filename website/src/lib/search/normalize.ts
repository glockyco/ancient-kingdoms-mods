/**
 * Text normalization shared by the index build and the query path. Both sides
 * must tokenize identically, or indexed terms and query terms never meet.
 */

const COMBINING_MARKS = /[\u0300-\u036f]/g;
const APOSTROPHES = /['’ʼ`]/g;
const SEPARATORS = /[^0-9a-z]+/;

/** Lower-case words without diacritics; apostrophes join ("Skarr's" → "skarrs"). */
export function tokenize(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(APOSTROPHES, "")
    .split(SEPARATORS)
    .filter(Boolean);
}

/** The singular form of a regular English plural; other words are unchanged. */
export function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(?:ss|sh|ch|x|z)es$/.test(word)) return word.slice(0, -2);
  if (/(?:ss|us|is)$/.test(word)) return word;
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/** A name reduced to its words, for exact-name comparison. */
export function nameKey(text: string): string {
  return tokenize(text).join(" ");
}

/** True when `a` becomes `b` by swapping one pair of adjacent letters. */
export function isAdjacentSwap(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let first = -1;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === b[i]) continue;
    if (first !== -1) {
      return (
        i === first + 1 &&
        a[first] === b[i] &&
        a[i] === b[first] &&
        a.slice(i + 1) === b.slice(i + 1)
      );
    }
    first = i;
  }
  return false;
}
