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
  /** Whole numbers only, in the unit the reader types. */
  step: number;
  unit?: "%" | "s";
  /** A stat of the reader's character, kept when they move to another page. */
  remember?: boolean;
}

/** A worked example, evaluated with the game's arithmetic. */
export interface CalculationExample {
  /** The inputs the example assumes, worded for display. */
  given: string[];
  /** The outcome, stated first. */
  result: string;
  /** The substituted arithmetic that produces the outcome, one line per step. */
  working: string[];
}

export interface Calculation {
  steps: CalculationStep[];
  inputs?: CalculationInput[];
  /** Evaluates the example for input values keyed by `CalculationInput.key`. */
  example?: (values: Record<string, number>) => CalculationExample;
}
