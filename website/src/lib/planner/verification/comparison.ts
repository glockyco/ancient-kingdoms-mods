/** The verdict for one compared quantity. A rejection names the criterion, never a cause. */
export interface QuantityResult {
  quantity: string;
  status: "pass" | "fail" | "inconclusive";
  detail: string;
}

/** Deterministic quantities compare exactly; float32 values compare after float32 narrowing. */
export function compareExact(
  quantity: string,
  expected: number,
  observed: number,
): QuantityResult {
  const same =
    Number.isInteger(expected) && Number.isInteger(observed)
      ? expected === observed
      : Math.fround(expected) === Math.fround(observed);
  return {
    quantity,
    status: same ? "pass" : "fail",
    detail: same ? `${observed}` : `expected ${expected}, observed ${observed}`,
  };
}

/** Every sample must lie inside the band the engine's own steps allow. */
export function compareSupportBand(
  quantity: string,
  samples: readonly number[],
  band: readonly [number, number],
  minimumSamples: number,
): QuantityResult {
  if (samples.length < minimumSamples) {
    return {
      quantity,
      status: "inconclusive",
      detail: `${samples.length} of ${minimumSamples} required samples`,
    };
  }
  const outside = samples.filter((value) => value < band[0] || value > band[1]);
  return outside.length === 0
    ? {
        quantity,
        status: "pass",
        detail: `${samples.length} samples inside [${band[0]}, ${band[1]}]`,
      }
    : {
        quantity,
        status: "fail",
        detail: `${outside.length} of ${samples.length} samples outside [${band[0]}, ${band[1]}]: ${outside.slice(0, 5).join(", ")}`,
      };
}

export interface WelchOptions {
  minimumSamples: number;
  significance: number;
}

/**
 * Two-sample Welch test between observed samples and the engine's replicate values.
 * A rejection is a failed mean criterion at the declared significance, not a diagnosed cause.
 */
export function compareWelch(
  quantity: string,
  observed: readonly number[],
  model: readonly number[],
  options: WelchOptions,
): QuantityResult {
  if (observed.length < options.minimumSamples) {
    return {
      quantity,
      status: "inconclusive",
      detail: `${observed.length} of ${options.minimumSamples} required samples`,
    };
  }
  if (model.length < 2)
    throw new RangeError(
      "Welch comparison needs at least two model replicates",
    );
  const a = moments(observed);
  const b = moments(model);
  const variance = a.variance / a.count + b.variance / b.count;
  if (variance === 0) {
    const same = a.mean === b.mean;
    return {
      quantity,
      status: same ? "pass" : "fail",
      detail: `observed ${a.mean} and model ${b.mean} with zero variance`,
    };
  }
  const t = (a.mean - b.mean) / Math.sqrt(variance);
  const degrees =
    variance ** 2 /
    ((a.variance / a.count) ** 2 / (a.count - 1) +
      (b.variance / b.count) ** 2 / (b.count - 1));
  const p = 2 * (1 - studentTCdf(Math.abs(t), degrees));
  const summary =
    `observed mean ${a.mean.toFixed(3)} (n=${a.count}), model mean ${b.mean.toFixed(3)} ` +
    `(n=${b.count}), t=${t.toFixed(3)}, df=${degrees.toFixed(1)}, p=${p.toFixed(4)}`;
  return {
    quantity,
    status: p < options.significance ? "fail" : "pass",
    detail: `${summary}, significance ${options.significance}`,
  };
}

function moments(values: readonly number[]): {
  count: number;
  mean: number;
  variance: number;
} {
  const count = values.length;
  let sum = 0;
  for (const value of values) sum += value;
  const mean = sum / count;
  let squares = 0;
  for (const value of values) squares += (value - mean) ** 2;
  return { count, mean, variance: count > 1 ? squares / (count - 1) : 0 };
}

/** Student's t cumulative distribution through the regularized incomplete beta function. */
export function studentTCdf(t: number, degrees: number): number {
  const x = degrees / (degrees + t * t);
  const tail = 0.5 * regularizedIncompleteBeta(x, degrees / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}

function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const logBeta =
    logGamma(a + b) -
    logGamma(a) -
    logGamma(b) +
    a * Math.log(x) +
    b * Math.log(1 - x);
  const front = Math.exp(logBeta);
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(x, a, b)) / a
    : 1 - (front * betaContinuedFraction(1 - x, b, a)) / b;
}

function betaContinuedFraction(x: number, a: number, b: number): number {
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m += 1) {
    const m2 = 2 * m;
    let numerator = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + numerator * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + numerator / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    numerator = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + numerator * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + numerator / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }
  return h;
}

function logGamma(z: number): number {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5)
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  const shifted = z - 1;
  let sum = 0.9999999999998099;
  for (let index = 0; index < coefficients.length; index += 1)
    sum += coefficients[index] / (shifted + index + 1);
  const t = shifted + coefficients.length - 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (shifted + 0.5) * Math.log(t) -
    t +
    Math.log(sum)
  );
}
