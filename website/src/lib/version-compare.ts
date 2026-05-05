/**
 * Compare two dotted-version strings (e.g. "0.9.14.3").
 * Returns negative if a < b, positive if a > b, 0 if equal.
 * Missing trailing segments are treated as 0 ("0.9.14" === "0.9.14.0").
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const ai = pa[i] ?? 0;
    const bi = pb[i] ?? 0;
    if (ai !== bi) return ai - bi;
  }
  return 0;
}
