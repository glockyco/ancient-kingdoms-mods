/**
 * Detail-page path for a pet.
 *
 * Pets are split across two sections: mercenaries are hired from recruiter
 * NPCs, everything else (companions and familiars) is summoned by a class
 * skill. Callers that hold a pet id therefore also need its mercenary flag.
 */
export function petHref(id: string, isMercenary: boolean): string {
  return isMercenary ? `/mercenaries/${id}` : `/summons/${id}`;
}
