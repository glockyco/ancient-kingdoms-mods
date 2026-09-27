/**
 * Reviewed abbreviations players type for game terms. A query word listed here
 * also matches each of its terms. Every entry needs a case in the judged query
 * set, so an entry that stops helping is noticed.
 */
export const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  xp: ["experience"],
  exp: ["experience"],
  lvl: ["level"],
  hp: ["health"],
  mp: ["mana"],
  merc: ["mercenary"],
  rez: ["resurrection", "resurrect"],
  respec: ["reset", "specialization"],
  dmg: ["damage"],
  sim: ["simulator"],
};
