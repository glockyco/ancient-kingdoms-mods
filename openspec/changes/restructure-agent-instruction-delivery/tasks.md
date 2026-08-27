# Tasks: restructure agent instruction delivery

Design has no Open Questions. The one decision that could have become an unstated assumption, whether
to introduce a runtime hook, is settled in design.md with the condition for revisiting it.

Order matters. Section 1 creates the channel that later sections move content into, and section 6
enforces invariants that sections 2 to 5 must already satisfy.

## 1. Triggered rules for the recorded traps

Each rule follows the shape the runtime's own rules use: opening directive, `## Why`, `## Avoid`,
`## Use`, `## Exceptions`. Each states the incident that motivated it. One concern per rule.

- [x] 1.1 Add `.agent/rules/game-measurement-round-trips.md`: a trigger on a HotRepl `eval`
      invocation in a tool argument. Directive is to run setup and sampling inside one in-game
      coroutine. Incident: four measurement points returned nothing because the subject died between
      calls. Point at `skill://hotrepl-runtime-inspection/references/observing-behaviour.md`.
- [x] 1.2 Add `.agent/rules/absence-needs-a-count.md`: a trigger on a single-row fetch against the
      compendium database. Directive is to read a count, or run the same query against a case known
      to have the value, before concluding absence. Incident: one row in `monsters` was read as proof
      that five spawn variants did not exist.
- [x] 1.3 Add `.agent/rules/let-the-engine-drive.md`: a trigger on the game's skill-use command.
      Directive is to issue a repeating action once and let the engine re-issue it. Incident: sending
      the command repeatedly competed with the engine's own loop and measured the sender.
- [x] 1.4 Add `.agent/rules/monster-curve-columns.md`: a trigger on a denormalised monster scalar
      column. Directive is to read the curve columns with the spawn's own values. Incident: a
      published block chance omitted the defense term and understated the default target 2.6-fold.
- [x] 1.5 Add `.agent/rules/build-is-not-runtime-proof.md`: a trigger on a mod build or deploy
      invocation. Directive is to exercise the changed path in the running game. Incident: a Harmony
      patch and a probe were declared working from a green build.
      Narrowed while implementing: the trigger matches a deploy only, not every `dotnet build`. A mod
      session builds many times and deploys once before each launch, so the deploy is the moment the
      directive is actionable and the build is the moment it would become wallpaper.
- [ ] 1.6 Verify each rule's trigger fires by producing text that matches it and observing the
      injection, and record the observation in the change. A rule whose trigger cannot be observed to
      fire is removed rather than kept on the assumption that it works.
      Partly done, and the remainder needs a new session. Rules are discovered when a session starts,
      confirmed by `rule://absence-needs-a-count` reporting the name as unknown while the file exists
      on disk, so a rule authored inside a session cannot be observed firing in it. Verified now
      instead: every frontmatter parses, every condition compiles, and each condition matches command
      strings taken verbatim from the run that motivated it while not matching a near-miss string
      (seven matches and six non-matches). Remaining: start a session and observe each injection.

## 2. Relocate subproject constraints into rules

For each subproject: move the constraints that change agent behaviour into a rule carrying that
subproject's paths as `globs`; leave orientation in the `AGENTS.md`; have the `AGENTS.md` name the
rule. Do not reword the constraints while moving them.

- [x] 2.1 Create `.agent/rules/mods-runtime.md` from the behavioural content of `mods/AGENTS.md`
      (runtime boundaries, the Il2CppInterop property-before-field rule, the `GetComponents<T>`
      attribute-component rule, the failure policy, the refused-call reading rule, and the placement
      rule added for game-free logic). Trim `mods/AGENTS.md` to orientation plus the rule name.
- [x] 2.2 Create `.agent/rules/website-boundaries.md` from the behavioural content of
      `website/AGENTS.md` (database asset import boundary, `static/` boundary, typed query boundary,
      the citation ledger rule, the no-JavaScript path, and the citation requirement). Trim
      `website/AGENTS.md` to orientation plus the rule name.
- [x] 2.3 Create `.agent/rules/pipeline-invariants.md` from the behavioural content of
      `build-pipeline/AGENTS.md` (foreign-key load order, the two registration invariants, the
      redaction configuration requirement, the ledger rules, and the boundary-validation rule). Trim
      `build-pipeline/AGENTS.md` to orientation plus the rule name.
- [x] 2.4 Fold `website/src/lib/map/AGENTS.md` into the existing `rule://interactive-map`, whose
      globs already cover those paths, and delete the file. Its coordinate and identity contracts are
      constraints, not orientation, and the file duplicates a rule that already loads.
- [x] 2.5 Confirm no constraint was lost: every bullet removed from a subproject `AGENTS.md` appears
      in exactly one rule, and no rule restates another.
      Checked by comparing every line this section removed from a context file against the rule
      directory: 80 lines removed, 63 present verbatim in a rule, and each of the remaining 17
      accounted for as an intentional replacement, a sentence split between a rule and retained
      orientation, or a pointer whose target moved. The map fold also replaced five constraints the
      rule already stated in different words, so the rule holds one copy of each.

## 3. Shrink the always-loaded surface

- [x] 3.1 Rewrite the routing table in the root `AGENTS.md` instruction-ownership section to match
      the corrected routing, including the row for a triggered rule and the correction that a
      subproject constraint belongs in a rule.
- [x] 3.2 Move the root `AGENTS.md` imperatives that only matter at one action into triggered rules
      or delete them with a stated reason. The generated-artifact prohibition and the deploy
      precondition are candidates; the sources-of-truth and verification sections stay.
- [x] 3.3 Record the before and after line counts of everything that loads unconditionally, so the
      claim that the surface shrank is checkable rather than asserted.
      The root `AGENTS.md` is the whole unconditionally loaded surface, because the other four context
      files sit below the repository root and contribute a path rather than content. It went from 49
      lines and 445 words to 40 lines and 355 words, a reduction of 20 percent.
      The first attempt grew it by 37 percent, because the corrected placement table plus its
      explanation is longer than the seven bullets it replaced. Placement guidance applies when an
      instruction file is edited, which is a path-scoped moment, so it moved to
      `rule://instruction-placement` and the root file keeps a pointer. Applying this change's own
      routing to this change's own content is what produced the reduction.

## 4. Skill and reference hygiene

- [x] 4.1 Rewrite the reference list in `.agent/skills/hotrepl-runtime-inspection/SKILL.md` so each
      entry states what a reader who skips it gets wrong, and remove the invitation to load a
      reference only if the task appears to need it.
- [x] 4.2 Add a contents list to
      `.agent/skills/hotrepl-runtime-inspection/references/observing-behaviour.md`, which is past the
      hundred-line threshold, and to any other reference that is.
      Only that file qualifies; the other two references are 81 and 32 lines. Its contents list is
      grouped by when each section applies, before a measurement, while it runs, and when it returns
      nothing, rather than by heading order.
- [x] 4.3 Audit every skill `description` against the 1024-character cap and the requirement to state
      both what it covers and when it applies in the third person. Report each one's length.
      All five pass. Lengths: save-files 104, export-game-data 191, game-defect-reports 410,
      hotrepl-runtime-inspection 274, update-game-version 166. Each states what it covers and opens
      its trigger clause with "Use when", in the third person.
- [x] 4.4 Audit every skill body against the repository's 200-line limit and split any that exceeds
      it, moving the excess into a reference rather than a second skill.
      All five pass: 146, 115, 115, 84, 48 lines. Corrected while implementing: the specification
      delta said 500 lines, taken from the published ceiling, while this repository already enforces
      200 with a stated reason, that a skill body stays in context for the rest of a session once it
      loads. Importing the looser external number would have relaxed a better-justified local limit,
      so the delta and this task now say 200 and record 500 as the external ceiling.

## 5. Subagent report integrity

- [x] 5.1 Add a repository-owned research agent definition under `.omp/agents/` that requires the
      report to be written to a file whose path is returned, so a structured output shape cannot
      discard the body.
- [x] 5.2 Verify it by dispatching one research task through the definition and confirming the report
      arrives with its tables intact.
      Dispatched a rule inventory through the definition. The report arrived whole: a thirteen-row
      table with all six requested columns, three requested sections, and three findings beyond the
      brief. The returned answer carried only the file URI and one sentence, as the definition
      requires. Project agent definitions are rediscovered at execution, so the definition worked in
      the session that created it, unlike a rule.

## 6. Enforcement

Every check below fails with the offending path and the reason, and reports all violations in one
run rather than stopping at the first.

- [x] 6.1 Extend `scripts/check-agent-docs.sh` to fail when a `SKILL.md` reaches the line limit.
      Already satisfied: the check has enforced 200 lines for a `SKILL.md` since before this change.
      The task originally said 500, taken from the published ceiling, which would have relaxed a
      stricter local limit that carries its own reason. Corrected in the specification delta and here;
      no code change was needed.
- [x] 6.2 Extend it to fail when a skill `description` exceeds 1024 characters.
- [x] 6.3 Extend it to fail when a file under a skill's `references/` exceeds 100 lines without an
      opening contents list.
- [x] 6.4 Extend it to fail when an `AGENTS.md` below the repository root contains a behavioural
      imperative, so a constraint cannot be reintroduced into a file that does not load. Use the
      imperative forms the repository already writes and state the matched line.
- [x] 6.5 Extend it to fail when a rule carrying a trigger condition does not name an incident.
- [x] 6.6 Add the new checks to the existing commit-time hook path, and confirm they run there rather
      than only when invoked by hand.
      The hook already ran the check for a staged `AGENTS.md`, skill, or rule. Its glob gained
      `.omp/agents/**` so the new task-agent registration check reaches the hook too.
      Each new check was proved against the violation it exists to catch, by introducing the fault and
      confirming the reported message, then reverting: an oversized description, a long reference with
      no contents list, a constraint in a context file that does not load, a triggered rule with no
      incident, a rule carrying both globs and a condition, and a missing task agent definition. Six
      introduced, six caught.
      The harness reverted with `git checkout`, which destroyed the uncommitted contents list from 4.2
      and exposed a worse defect: the commit for section 2 had never staged the map file's deletion,
      so it did not pass its own check. Both were repaired and the commit amended.

## 7. Verification

- [x] 7.1 Run `./scripts/check-agent-docs.sh` and confirm it passes against the restructured surface.
- [x] 7.2 Run `openspec validate --all --strict`.
- [x] 7.3 Confirm each rule from section 1 is listed or fires as its frontmatter intends, and that no
      rule intended to be triggered has instead become a rulebook entry through a missing condition.
      Inventoried all thirteen rules: six triggered, seven path-scoped, none carrying both, none
      always-apply. Every rule from section 1 carries a condition, a scope and an interrupt mode, so
      none has silently become a rulebook entry. Every description carries one of the words the check
      requires.
      One rule needs stating plainly. `generated-artifacts` sets its condition to match any text and
      gates entirely on a fourteen-clause scope of edit and write paths. That is deliberate, and it is
      the documented way to express a path gate for a tool stream rather than for a file the agent is
      editing, but it also means the check for a rule carrying both globs and a condition does not
      reach it, because the gate is written as scope rather than globs.
      Path overlap is now real and worth recording: an ordinary edit under `website/src/` delivers
      `website-boundaries` plus whichever of `interactive-map` or `website-mechanics` also matches, so
      two rule bodies arrive at once. This is a cost the section-2 relocation introduced.
      As with 1.6, none of this observes a rule firing. It reads frontmatter and matches conditions
      against recorded command strings.
- [ ] 7.4 Sync the delta into `openspec/specs/agent-instructions/spec.md` and archive the change.
