---
title: "Mercenary Mechanics Implementation Diary"
type: note
status: abandoned
created: 2026-05-13
parent: 2026-05-13-mercenary-mechanics-page-plan
superseded_by:
archived: 2026-06-25
---

# Mercenary Mechanics Implementation Diary

## 2026-05-13

### Start

- Continued from `local://PLAN.md`.
- User requested a holistic implementation, not just a standalone mechanics page.
- User explicitly requested keeping a diary and updating the planning document as tasks complete.
- Constraints carried forward: no separate "Misconceptions" section; facts should be explained in-place.

### Initial recommendations before editing

- Treat `/mechanics/mercenaries` as the canonical deep reference.
- Keep individual mercenary pet pages as concise entity pages: class, skills, recruiter list, brief mechanics summary, and link to canonical mechanics formulas.
- Prefer static tables and source-backed constants over JS-only calculators.

### Correction: planning-only gate

- User clarified this was still a planning task.
- No implementation should start until a complete plan is submitted and explicitly approved.
- Checked for the attempted `/mechanics/mercenaries` route after the aborted operation; no route directory or file exists.
- From that point, work was limited to source verification and plan/spec updates.

### Source verification findings

- Hire flow verified: the server chooses the mercenary prefab by requested class, then calls the random character/race generator, rolls HP multiplier, resource multiplier, and base combat independently, saves those generated values, and applies them to the spawned mercenary.
- Race pools verified: each mercenary class has its own allowed race list; recruitment zone can narrow the list to preferred local races, with fallback to the class list when no preferred race is valid.
- Roster limits verified: active cap is 1 before level 20, 2 before 30, 3 before 50, and 4 at 50+; stored cap is 6.
- Party-size interaction verified: active mercenary capacity is reduced so total party members do not exceed 5.
- Veteran layering verified: spawn/reload adds `veteran points × 0.0025` to HP and mana/resource multipliers; veteran level-up increments HP/resource multiplier by 0.01 and base combat by 1 for active mercenaries.
- Skill scaling verified: mercenary skill level is `min(skill max level, floor(regular level / 5) + floor(veteran points / 10))`.
- Equipment layering verified: mercenary equipment and augments add attribute bonuses after class/level attributes are applied; saved equipment is restored on reload.
- Hire/resurrection cost verified: base cost is `round(50 + 450 × ((clamp(level, 10, 50) - 10) / 40)^2 + veteranPoints × 10)` before normal purchase price modifiers; resurrection uses the same calculated purchase price per mercenary.
- Important nuance discovered: Warrior/Rogue resource multipliers are assigned to the Energy component, but the inspected Energy max formula does not use `multiplierEnergy`. The page should avoid saying the rolled resource multiplier increases visible Warrior/Rogue max Rage unless another source proves it.
- Map link feasibility verified: map URL state supports a layer list, and the mercenary recruiter layer key is `npcMercenaryRecruiters`.

### Planning document update

- Replaced `local://PLAN.md` with a planning-only implementation specification.
- Added a complete verified-mechanics section with source-comment anchors for later implementation.
- Added the Warrior/Rogue resource nuance as an explicit UX/content requirement.
- Added holistic integration details for mechanics index, mercenary pet pages, pet overview, combat mechanics, map/recruiter links, and skill pages.
- Plan now explicitly gates implementation on user approval.

### Repo persistence

- User requested adding the diary and plan to the regular repo beside the other planning documents.
- Created `docs/superpowers/plans/2026-05-13-mercenary-mechanics-page-plan.md`.
- Created `docs/superpowers/plans/2026-05-13-mercenary-mechanics-page-diary.md`.
