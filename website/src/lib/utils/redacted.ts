/**
 * Words for content the compendium leaves out on purpose. A page shows a
 * reference to such content as a placeholder instead of dropping the entry.
 */
export type RedactedKind =
  | "item"
  | "book"
  | "monster"
  | "recipe"
  | "quest"
  | "class"
  | "skill"
  | "race"
  | "faction"
  | "location";

export const REDACTED_HOVER =
  "Left out of the compendium at the developers' request.";

export function redactedLabel(kind: RedactedKind): string {
  return `Redacted ${kind}`;
}

/** "Redacted recipe" for one, "3 redacted recipes" for more. */
export function redactedCountLabel(kind: RedactedKind, count: number): string {
  if (count <= 1) return redactedLabel(kind);
  return `${count} redacted ${kind}${kind.endsWith("s") ? "es" : "s"}`;
}
