/**
 * Seeded random source for the combat engine. `xoshiro128**` seeded through `splitmix32`, so two
 * replicates with the same seed consume identical streams. The engine samples the same distributions
 * the game draws from; it does not reproduce Unity's generator.
 */
export interface RandomSource {
  /** Uniform draw in [0, 1) at float32 resolution. */
  next(): number;
  /** Mirrors `UnityEngine.Random.Range(float, float)`: uniform in [minimum, maximum). */
  range(minimum: number, maximum: number): number;
  /** Mirrors `UnityEngine.Random.Range(int, int)`: integer in [0, count). */
  below(count: number): number;
  /** True with the given probability. */
  bernoulli(probability: number): boolean;
}

const FLOAT_SCALE = 2 ** -24;

function splitmix32(state: number): [number, number] {
  const next = (state + 0x9e3779b9) >>> 0;
  let z = next;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  z = (z ^ (z >>> 15)) >>> 0;
  return [next, z];
}

function rotl(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

/** Derives the stream seed for one replicate from the scenario seed and the replicate index. */
export function replicateSeed(seed: number, index: number): number {
  assertUint32(seed, "seed");
  assertUint32(index, "index");
  const [, mixed] = splitmix32(seed >>> 0);
  const [, derived] = splitmix32((mixed ^ index) >>> 0);
  return derived;
}

export function createRandomSource(seed: number): RandomSource {
  assertUint32(seed, "seed");
  const state = new Uint32Array(4);
  let mix = seed >>> 0;
  for (let index = 0; index < 4; index += 1) {
    const [next, value] = splitmix32(mix);
    mix = next;
    state[index] = value;
  }

  const nextUint32 = (): number => {
    const result = Math.imul(rotl(Math.imul(state[1], 5) >>> 0, 7), 9) >>> 0;
    const t = (state[1] << 9) >>> 0;
    state[2] ^= state[0];
    state[3] ^= state[1];
    state[1] ^= state[2];
    state[0] ^= state[3];
    state[2] ^= t;
    state[3] = rotl(state[3], 11);
    return result;
  };

  const next = (): number => (nextUint32() >>> 8) * FLOAT_SCALE;

  return {
    next,
    range(minimum, maximum) {
      if (!(minimum <= maximum))
        throw new RangeError("range minimum must not exceed maximum");
      return minimum + (maximum - minimum) * next();
    },
    below(count) {
      if (!Number.isInteger(count) || count <= 0)
        throw new RangeError("below count must be a positive integer");
      return Math.floor(next() * count);
    },
    bernoulli(probability) {
      if (!(probability >= 0 && probability <= 1))
        throw new RangeError("probability must be between 0 and 1");
      return next() < probability;
    },
  };
}

function assertUint32(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff)
    throw new RangeError(`${name} must be an integer in [0, 2^32)`);
}
