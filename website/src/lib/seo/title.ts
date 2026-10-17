export interface DetailTitleContext {
  family?: string | null;
  zone?: string | null;
  source?: string | null;
  className?: string | null;
}

/** Context uses loaded display names, never IDs, coordinates or ordinals. */
export function detailTitle(
  name: string,
  context: DetailTitleContext = {},
): string {
  const parts = [
    ...new Set(
      [context.family, context.className, context.source, context.zone]
        .filter((part): part is string => Boolean(part?.trim()))
        .map((part) => part.trim())
        .filter((part) => part.toLowerCase() !== name.toLowerCase()),
    ),
  ];
  return `${name}${parts.length ? ` (${parts.join(", ")})` : ""} - Ancient Kingdoms`;
}
