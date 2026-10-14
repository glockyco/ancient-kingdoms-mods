import { getContext, setContext } from "svelte";

/*
 * A page defines "rounded" once, at its first use. The root layout starts a
 * scope for each page, and every calculation or sentence that rounds to the
 * nearest whole number asks whether it is the first. Pages render in document
 * order on the server and in the browser, so the same use prints the
 * definition in both. A reference page instead defines the word wherever it
 * appears, through RoundedTerm, because its readers arrive at any topic.
 */

const KEY = Symbol("rounding definition");

interface Scope {
  defined: boolean;
}

/** Start a page's scope, so the page defines "rounded" only once. */
export function provideRoundingScope(): void {
  setContext<Scope>(KEY, { defined: false });
}

/** Start a scope whose every "rounded" carries its own definition, so no paragraph repeats it. */
export function provideRoundingTerms(): void {
  setContext<Scope>(KEY, { defined: true });
}

/** Whether this use prints the definition: the first on the page, or every use outside a scope. */
export function claimRoundingDefinition(): boolean {
  const scope = getContext<Scope | undefined>(KEY);
  if (!scope) return true;
  if (scope.defined) return false;
  scope.defined = true;
  return true;
}
