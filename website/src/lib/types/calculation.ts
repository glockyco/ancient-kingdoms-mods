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

/** A worked example, evaluated with the game's arithmetic. */
export interface CalculationExample {
  /** The inputs the example assumes. */
  given: string[];
  /** The outcome, stated first. */
  result: string;
  /** The substituted arithmetic that produces the outcome, one line per step. */
  working: string[];
}

export interface Calculation {
  steps: CalculationStep[];
  example?: CalculationExample;
}
