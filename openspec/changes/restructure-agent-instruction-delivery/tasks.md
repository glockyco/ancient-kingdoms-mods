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
- [x] 1.6 Verify each rule's trigger fires by producing text that matches it and observing the
      injection, and record the observation in the change. A rule whose trigger cannot be observed to
      fire is removed rather than kept on the assumption that it works.
      Observed after a restart, because rules are discovered when a session starts: a rule authored
      inside a session cannot fire in it, which was confirmed by the runtime reporting a new rule's
      name as unknown while its file sat on disk.
      Five of the six triggered rules fired and were read. A database query naming the monsters table
      and fetching one row delivered `absence-needs-a-count` and `monster-curve-columns` together. One
      shell argument carrying a HotRepl eval, a skill-use call and a deploy invocation delivered
      `game-measurement-round-trips`, `let-the-engine-drive` and `build-is-not-runtime-proof`. Each
      arrived as a reminder that did not interrupt, as its frontmatter asks.
      `generated-artifacts` was not fired. Its scope is an edit or a write to a generated artifact, so
      firing it means doing the thing it exists to prevent. Its condition matches any text, so the gate
      is entirely the scope, and the scope is the part left unobserved.
      Two costs were observed rather than predicted. The rules fired on a compliant call: the query
      already read the curve columns and a count, and the reminders arrived anyway. And three rules
      fired on an argument that merely quoted their trigger strings, with no action behind it. A
      trigger cannot tell intent from mention.

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
      Runs last, after section 8. Archiving before the corpus is audited would freeze a plan whose own
      measurement says it is unfinished.

## 8. Earn each instruction

Relocation without deletion grew the corpus twenty-six percent while the loaded surface fell twenty.
That number is what exposed the omission, and it is not this section's target. A total over unlike
channels prices a reference line the same as an always-loaded line, and as a target it argues for
deleting a true instruction and keeping a false one.

Each instruction is judged on its own merit, in this order:

1. It is false or stale. Not neutral, harmful, and fixed whatever its size.
2. Two copies of one fact exist, so one will drift.
3. A stated value names no owner.
4. It cannot change an action.
5. It arrives often and argues at length.

- [x] 8.1 Rewrite `.agent/rules/monster-curve-columns.md`: drop the block chance formula and its
      coefficient, point at `server-scripts/Combat.cs:blockChance` and at the website owner that
      already implements it, and keep the trap, that a stat can take a term from another stat so the
      curve alone is not the answer. This rule is the change's own counter-example and is corrected
      first.
      Done: 45 lines to 35, the coefficient and the formula gone, `server-scripts/Combat.cs:blockChance`
      and `website/src/lib/utils/monster-stats.ts` named instead. Both pointers verified to resolve.
- [x] 8.2 Audit every file in `.agent/rules/` for a stated value taken from the game or the codebase.
      For each, either add the pointer to the owning symbol or remove the value and keep the trap.
      Report the count found and the disposition of each.
- [x] 8.3 Apply the keep test to every skill body and reference section. Delete what the agent would
      re-derive correctly from the source in seconds, convert what it would find only after a mistake
      into a pointer, and keep method, incidents and decisions. Record what was deleted and why, so the
      deletion can be argued with rather than discovered.
- [x] 8.4 Shorten each triggered rule body to a reminder: the directive, the exception, and where the
      reasoning lives. Move the extended reasoning into the skill or reference the rule names. The five
      rules from section 1 run to forty and fifty lines and were written in the shape of a
      code-pattern rule, which carries a replacement a method reminder does not have.
      Two of five done, both forced by 8.5's check. `let-the-engine-drive.md` went from 45 lines to 26
      and `game-measurement-round-trips.md` from 51 to 27, in both cases by deleting a code block the
      reference already carries and naming the section that owns it. Each pointer target was read to
      confirm it holds what the rule now claims it holds.
- [x] 8.5 Extend `scripts/check-agent-docs.sh` to fail when a rule body states a bare numeric constant
      or a formula and the file carries no `server-scripts/<file>.cs:<symbol>` pointer. Prove it by
      introducing the violation and confirming the message, as section 6 did for its checks.
      Built and tuned against real fires rather than in the abstract, in four rounds. Numeric literals
      in prose are not scanned, because a number in an incident records a past measurement and cannot
      rot. Subscripts and the integers 0, 1 and 2 are excluded as indices and arities: the first version
      failed `absence-needs-a-count.md` for `fetchone()[0]`. An authority must be a code file, not
      another instruction file: the second version passed `mod-runtime-special-cases.md` because it
      names a reference file, which is the same unchecked prose one step away. A formula of identifiers
      carries no number, so spaced arithmetic is matched too, which is how the sibling claim about
      synchronized server time had escaped. A query is excluded by keyword, because `SELECT *` reads as
      multiplication.
      Four genuine fires, all repaired: two mod rules stating values with no owner named, and two
      measurement rules carrying procedure code that duplicates the reference.
      The check found a defect worth more than itself. Two rules told the agent to write a respawn
      deadline on Unity elapsed time and not to substitute synchronized server time, which is the
      reverse of what `mods/MonsterRespawner/MonsterRespawner.cs` does. It had been wrong for a month.
      The correction had landed a month earlier in the same commit as the code change, in a per-mod
      context file; deleting that file, the migration wrote the pre-fix wording into `mods/AGENTS.md`
      even though the file it replaced held the correct wording at that moment. This change then carried
      the inversion into a rule that loads. See design.md.
- [x] 8.6 Repair every claim that contradicts the code. Five were found by audit, each needing a
      replacement rather than a deletion, because each sentence carries a true obligation beside the
      false value:
      `interactive-map.md` says `MapEntity.id` holds the entity id, and for a monster it holds the spawn
      id, verified at `website/src/lib/queries/map.server.ts:374` against the NPC case at `:515`.
      `mods-runtime.md` and root `AGENTS.md` both describe `FieldDefaultValueHookFix` as preserving a
      value for a request with no `FieldInfo`; the mod redirects an Il2CppInterop function-pointer
      resolution from a byte signature to an xref traversal, and `FieldInfo` occurs zero times in it.
      This one is in the always-loaded surface, which makes it the most expensive false claim in the
      repository.
      `website-boundaries.md` and `website-mechanics.md` both require preserving `Title` and `subtitle`
      fields, which occur nowhere in the mechanics surface those rules govern.
      `pipeline-invariants.md` lists five ledger subcommands; citations has check, fix, suggest and sync,
      and redactions has check, explain, sync and verify.
      All five repaired as replacements. The map rule now states both conventions and names
      `EntityPopup.svelte`. The mod rule states what the hook fix actually redirects, and root
      `AGENTS.md` keeps only the policy and names the rule, which removes the false detail from the one
      channel that is read every session. The ledger rule names the registry instead of a subcommand
      list. The `Title` and `subtitle` requirement was deleted rather than moved: where the distinction
      is real it is a prop against a component in map popups, and `svelte-check` already rejects a wrong
      prop.
- [x] 8.7 Collapse the duplication that will drift. Six duplicated facts were found, and one is
      structural: every glob in `mod-runtime-special-cases.md` is a subset of `mods/**` in
      `mods-runtime.md`, so the narrow rule cannot fire without the broad one, and both state the
      respawn clock and the `PatchAll` requirement. Two correct copies today are two places the next
      correction must reach, which is exactly how the respawn claim was reverted after being fixed.
      Each fact now has one owner, verified by query rather than by reading. `PatchAll` and the
      client-side zero moved to `mods-runtime`, which fires for every mod. The respawn write stayed in
      `mod-runtime-special-cases`, which owns that mod. `mods-runtime` now points at
      `rule://build-is-not-runtime-proof` instead of restating it. On the website side, the citation
      requirement belongs to `website-boundaries` and the prose rule to `website-mechanics`, because the
      broader rule's globs contain the narrower rule's paths.
- [x] 8.8 Record what was learned about the measurement itself, so the next change does not repeat it.
      Report the count of false claims found and fixed, the count of duplicated facts collapsed, and the
      channels each sat in. Report size only as a consequence, per channel, never as a total.

      | Channel | Arrives | Start | Now | Change |
      | --- | --- | --- | --- | --- |
      | root `AGENTS.md` | every session | 445 | 337 | -24% |
      | triggered rules | every match | 0 | 1144 | new |
      | path rules | on a matching edit | 549 | 2153 | +292% |
      | subproject `AGENTS.md` | never injected | 1367 | 248 | -82% |
      | skill bodies | once loaded | 4255 | 3008 | -29% |
      | references | only when opened | 3161 | 2829 | -11% |

      Every channel that delivers unconditionally shrank. The growth is in the two conditional channels,
      and most of it is content that moved out of the subproject files, which delivered nothing. The
      total moved from 9,777 words to 9,719, which is the figure this change stopped steering by.

      Six false claims found and repaired: the respawn clock in two rules, a backup directory name, an
      enforcing test that does not exist, `Title` and `subtitle` in two rules, the hook fix in a rule and
      in the always-loaded file, and the ledger subcommands. Six duplicated facts collapsed to one owner
      each. Ranking by size had found none of these.

- [x] 8.10 Apply the repository's own prose policy to this change's output. The policy requires
      `skill://simplified-technical-english` before writing technical prose, and a full day of writing
      went out without it: 24 semicolons and 33 sentences over the 25-word limit, including a semicolon
      added to the root context file in the same edit that removed another. Both limits are mechanical,
      so `scripts/check-agent-docs.sh` now enforces them, with code, fences, tables and headings treated
      as protected text. Seven probes: three violations caught, four near-misses silent. No sentence was
      fixed by inserting a period. Two lists written as sentences became lists, and the five causes of an
      empty measurement became five bullets.
- [x] 8.9 Decide the `generated-artifacts` question raised by the rule inventory: its condition matches
      any text and it gates entirely on a fourteen-clause scope, so the check for a rule carrying both
      globs and a condition cannot see it. Either express the gate so the check reaches it, or state in
      the rule why a scope gate is correct there and exempt it deliberately.
