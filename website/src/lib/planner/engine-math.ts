// Shared numeric operations that preserve Unity and C# evaluation boundaries.

/** Narrows a value to the float32 precision that Unity uses for `float`. */
export const f32 = (value: number): number => Math.fround(value);

/** Multiplies two Unity `float` values and narrows the result. */
export function multiplyF32(left: number, right: number): number {
  return f32(f32(left) * f32(right));
}

/** Matches `Mathf.RoundToInt` and `(int)Math.Round(double)`. */
export function iround(value: number): number {
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction < 0.5) return lower;
  if (fraction > 0.5) return lower + 1;
  return lower % 2 === 0 ? lower : lower + 1;
}

/** Matches `Mathf.CeilToInt`. */
export const ceilToInt = (value: number): number => Math.ceil(value);

/** Matches `Mathf.FloorToInt`. */
export const floorToInt = (value: number): number => Math.floor(value);

/** Matches `Mathf.Clamp` when `minimum` is not greater than `maximum`. */
export function clamp(value: number, minimum: number, maximum: number): number {
  if (minimum > maximum) {
    throw new RangeError("clamp minimum must not exceed maximum");
  }
  return Math.max(minimum, Math.min(maximum, value));
}

/** Replaces one Bernoulli trial with its exact expectation. */
export function expectedBernoulli(
  probability: number,
  successValue: number,
  failureValue = 0,
): number {
  if (probability < 0 || probability > 1 || !Number.isFinite(probability)) {
    throw new RangeError("Bernoulli probability must be between 0 and 1");
  }
  return probability * successValue + (1 - probability) * failureValue;
}

/** Replaces a continuous uniform roll with its exact expectation. */
export function expectedUniform(minimum: number, maximum: number): number {
  if (minimum > maximum) {
    throw new RangeError("uniform minimum must not exceed maximum");
  }
  return (minimum + maximum) / 2;
}
