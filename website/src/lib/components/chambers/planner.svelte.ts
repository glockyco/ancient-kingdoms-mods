// The entry the Chambers page's panels share: the character's level at entry and total
// veteran points. Total veteran points are the same value every calculation on the site
// uses, so they are remembered under the shared key. The page ships the scaling rows
// for the default entry. Another veteran value loads its rows from the browser copy of
// the database through the same rule reader.

import { browserAcquisitionQuery } from "$lib/acquisition/browser";
import type { ChambersRules } from "$lib/calculation/chambers";
import { remember, rememberedValue } from "$lib/calculation/remembered.svelte";
import { TOTAL_VETERAN_POINTS } from "$lib/calculation/inputs";
import { loadChambersRules } from "$lib/chambers/rules";
import {
  DEFAULT_ENTRY_LEVEL,
  DEFAULT_VETERAN_POINTS,
  scalingView,
  type ScalingView,
} from "./model";

export interface Planner {
  readonly rules: ChambersRules;
  readonly entryLevel: number;
  readonly veteranPoints: number;
  /** The view for the entry shown. It lags `veteranPoints` while new rows load. */
  readonly view: ScalingView;
  readonly updating: boolean;
  readonly error: string | null;
  readonly minimumLevel: number;
  readonly maximumLevel: number;
  readonly maximumVeteranPoints: number;
  setEntryLevel(level: number): void;
  setVeteranPoints(points: number): void;
}

/** One planner per page. `initial` holds the scaling rows of the default veteran points. */
export function createPlanner(initial: ChambersRules): Planner {
  const levels = [...initial.playerLevels];
  const minimumLevel = Math.min(...levels);
  const maximumLevel = Math.max(...levels);
  const maximumVeteranPoints = Math.max(...initial.veteranPoints);

  const clamp = (value: number, low: number, high: number) =>
    Math.min(high, Math.max(low, Math.round(value)));

  let entryLevel = $state(
    clamp(DEFAULT_ENTRY_LEVEL, minimumLevel, maximumLevel),
  );
  const veteranPoints = $derived(
    clamp(
      rememberedValue(TOTAL_VETERAN_POINTS.key) ?? DEFAULT_VETERAN_POINTS,
      0,
      maximumVeteranPoints,
    ),
  );

  let shown = $state.raw<{ veteran: number; rules: ChambersRules }>({
    veteran: DEFAULT_VETERAN_POINTS,
    rules: initial,
  });
  let loading = $state(false);
  let error = $state<string | null>(null);
  // The cache is only read and written inside the effect below, which already tracks veteranPoints.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const cache = new Map<number, ChambersRules>([
    [DEFAULT_VETERAN_POINTS, initial],
  ]);
  let latest = 0;

  $effect(() => {
    const wanted = veteranPoints;
    const cached = cache.get(wanted);
    if (cached) {
      shown = { veteran: wanted, rules: cached };
      loading = false;
      error = null;
      return;
    }
    const ticket = ++latest;
    loading = true;
    loadChambersRules(browserAcquisitionQuery, { veteranPoints: [wanted] })
      .then((rules) => {
        cache.set(wanted, rules);
        if (ticket !== latest) return;
        shown = { veteran: wanted, rules };
        error = null;
      })
      .catch((cause: unknown) => {
        if (ticket !== latest) return;
        error =
          cause instanceof Error
            ? cause.message
            : "The scaling values could not be loaded.";
      })
      .finally(() => {
        if (ticket === latest) loading = false;
      });
  });

  const view = $derived(scalingView(shown.rules, entryLevel, shown.veteran));

  return {
    get rules() {
      return shown.rules;
    },
    get entryLevel() {
      return entryLevel;
    },
    get veteranPoints() {
      return veteranPoints;
    },
    get view() {
      return view;
    },
    get updating() {
      return loading || shown.veteran !== veteranPoints;
    },
    get error() {
      return error;
    },
    minimumLevel,
    maximumLevel,
    maximumVeteranPoints,
    setEntryLevel(level) {
      entryLevel = clamp(level, minimumLevel, maximumLevel);
    },
    setVeteranPoints(points) {
      remember(
        TOTAL_VETERAN_POINTS.key,
        clamp(points, 0, maximumVeteranPoints),
      );
    },
  };
}
