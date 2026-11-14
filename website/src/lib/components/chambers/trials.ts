// What each Chambers of Chaos trial asks of the player, in the words the game's tracker
// uses. The five kind names are the exported identifiers, which no game text shows, so a
// page labels a kind by its objective phrase. Riddle questions, puzzle stories and rune
// words are challenge content and never appear here.

export type TrialKind =
  "Battle" | "Waves" | "Riddle" | "Runes" | "Manuscript" | "Guardian";

export interface Trial {
  readonly kind: TrialKind;
  /** The tracker line while the objective is open. */
  readonly phrase: string;
  /** A working label for the kind. The game has no name for it. */
  readonly label: string;
}

export interface TrialRules {
  readonly waveCount: number;
  readonly maximumClearTargets: number;
  readonly maximumHuntTargets: number;
  readonly puzzlePenaltyGuards: number;
}

// Source: server-scripts/MadMageTowerText.cs:battle,hunt,waves,riddle,runeprogress,guardian — the tracker's objective lines. Runes and Manuscript show a puzzle title before the page is read in the tracker, which is challenge content, so both list the progress line that follows the page.
export const TRIALS: readonly Trial[] = [
  {
    kind: "Battle",
    phrase: "Defeat the chamber's guardians",
    label: "Battle",
  },
  {
    kind: "Waves",
    phrase: "Survive the summoned waves",
    label: "Waves",
  },
  {
    kind: "Riddle",
    phrase: "The Whispering Lectern",
    label: "Riddle",
  },
  {
    kind: "Runes",
    phrase: "Awaken the words in the tale's order",
    label: "Runes",
  },
  {
    kind: "Manuscript",
    phrase: "Awaken the words in the tale's order",
    label: "Manuscript",
  },
  {
    kind: "Guardian",
    phrase: "Defeat the final guardian",
    label: "Final Guardian",
  },
];

export const TRIAL_BY_KIND: Readonly<Record<TrialKind, Trial>> =
  Object.fromEntries(TRIALS.map((trial) => [trial.kind, trial])) as Record<
    TrialKind,
    Trial
  >;

// Source: server-scripts/MadMageTowerText.cs:findpage,findcarrier,readpage,pagefound — the tracker lines while a puzzle chamber's page is still out.
export const PAGE_LINES = [
  "Find the keeper of the missing page.",
  "Recover the page from the fallen guardian.",
] as const;
