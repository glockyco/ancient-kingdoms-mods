/** One named quantity of a game calculation. */
export interface CalculationStep {
  /** The quantity this step produces, in game terms, such as "Health spent". */
  name: string;
  /** How the game computes it, in words, naming real stats and earlier steps. */
  expression: string;
  /** Where the game turns the quantity into a whole number. */
  rounding?: "nearest" | "down" | "up";
  /** A bound the game applies after rounding, such as "at most your missing Mana". */
  limit?: string;
}

/** A number the reader can change to rerun the example. */
export interface CalculationInput {
  /**
   * Stable key. Remembered inputs that share a key share one value across
   * blocks and pages, so a reader enters their maximum Health once.
   */
  key: string;
  label: string;
  /** The example's value. Percentages are fractions: 0.2 means 20%. */
  value: number;
  min: number;
  max: number;
  /** Step between values, in the unit the reader types. Percentage inputs accept any fraction. */
  step: number;
  unit?: "%" | "s";
  /** A stat of the reader's character, kept when they move to another page. */
  remember?: boolean;
}

/** A worked example, evaluated with the game's arithmetic. */
export interface CalculationExample {
  /** The inputs the example assumes, worded for display, such as "100 Wisdom". */
  given: string[];
  /** The outcome as a phrase without a final period, such as "Heals 1,040 Health". */
  result: string;
  /**
   * The substituted arithmetic, one line per step and in step order, each as
   * "Step name: arithmetic = value", plus ", rounded" (or "rounded down" or
   * "rounded up") where the step rounds, and ", limited to N" only when the
   * step's limit changed the value. A step that takes the smaller of two
   * values reads "smaller of A and B = value". No final period. A line names
   * only terms its step names.
   */
  working: string[];
}

export interface Calculation {
  steps: CalculationStep[];
  inputs?: CalculationInput[];
  /** One or two sentences under the steps that define a term the steps use. */
  note?: string;
  /** Evaluates the example for input values keyed by `CalculationInput.key`. */
  example?: (values: Record<string, number>) => CalculationExample;
}
