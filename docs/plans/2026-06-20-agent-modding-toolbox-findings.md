---
title: "Agent Modding Toolbox — Research Findings"
type: note
status: active
created: 2026-06-20
parent:
superseded_by:
archived:
---

# Agent Modding Toolbox — Research Findings

**Date:** 2026-06-20
**Status:** Research input for brainstorming. NOT a design spec. Scoping decisions are deliberately deferred to the design phase (see Section 7).
**Question:** HotRepl today is mostly about *reading* live game data. That is one stage of mod development. What is the rest of the mod-development lifecycle, and how do we give agents a clean, robust, maintainable, and extensible foundation for "all things modding" — without it becoming an overblown, niche-laden maintenance burden?

This document records what the mod-dev lifecycle actually contains, how other projects and workflows solve each part, the lessons and pitfalls they learned, and the design principles those lessons imply. It does not pick the solution.

---

## 1. The mod-development lifecycle (the "what else" answer)

Reading data is one stage. The full loop an agent runs when developing or prototyping an Ancient Kingdoms (IL2CPP/MelonLoader) mod:

| # | Stage | What it means | Failure if absent |
|---|---|---|---|
| 1 | **Scaffold** | New mod project, correct references (MelonLoader, Il2Cpp interop assemblies), manifest, lifecycle hooks | Agent hand-rolls csproj, gets references wrong |
| 2 | **Discover / reverse-engineer** | Find the right types, fields, methods, and scene objects to touch; understand structure | Agent guesses member names → hallucinated code that compiles against nothing |
| 3 | **Prototype** | Try candidate logic against the *live* game before committing it to a DLL | Every experiment costs a full build+relaunch |
| 4 | **Author / patch** | Write the mod: Harmony prefix/postfix hooks, MelonMod lifecycle, UI, data export | — |
| 5 | **Build** | Compile against unhollowed/interop assemblies; handle multiple game versions | — |
| 6 | **Deploy / load** | Copy to `Mods/`; respect DLL file-lock, load order, dependencies | DLL locked while game runs |
| 7 | **Run / reach state** | Launch (CrossOver/WINE on macOS), reach the World scene + a ready player | Export/probe runs against the wrong state and returns garbage |
| 8 | **Observe** | Inspect runtime state, logs, exceptions, and visuals while running | Agent is blind; relies on text scraping |
| 9 | **Verify** | Prove the change does what was intended, with runtime evidence | "It compiles" mistaken for "it works" |
| 10 | **Maintain across game updates** | Re-derive types/values when a patch breaks a mod | Silent breakage after every Steam update |
| 11 | **Package / distribute** | Thunderstore manifests, versioning, changelogs | (Out of scope for internal data tooling) |

HotRepl today is strong at **3 (prototype, via `eval`)** and partially **8 (observe, via `eval`/`world.summary`/screenshot)**. The other stages are either owned by AK's `build-tool` (5, 6, 7), covered by AK skills (1 `create-new-mod`, 10 `update-game-version`), or **thin/ad-hoc** (2 discover, 9 verify) — which is where the opportunity is.

---

## 2. Organizing thesis: discovery, safe mutation, verification

The Unity-MCP ecosystem converged on a sharp lesson after a wave of "50+ tool" servers: tool count is the wrong success metric. The servers that win **"excel at three things: discovery, safe mutation, and verification"** [Unity-MCP]. The same three pillars map cleanly onto the lifecycle above and onto every other lesson below.

- **Discovery** — know what is *true* in the live game without guessing: active scene, objects, components, types/members, loaded data, current errors. "Good discovery reduces hallucination and saves tokens because the agent no longer guesses what is true" [Unity-MCP].
- **Safe mutation / prototyping** — try changes live, on the main thread, reversibly, without corrupting saves. "Safe mutation is using the actual APIs so references stay valid, undo works, serialized data stays consistent... a change that compiles can still be wrong because the problem is not compilation, it is integration" [Unity-MCP].
- **Verification** — prove intent with runtime evidence: "state intent, produce a plan, execute tool calls, run validation, return evidence, iterate until the evidence matches the intent" [Unity-MCP]. Aligns with the broader industry move to **runtime validation as the source of truth** [Invicti].

The trust boundary the whole design rests on: **the model is probabilistic; the game and the command layer are deterministic; the system is safe only when that boundary is explicit** [Unity-MCP].

---

## 3. Current coverage (HotRepl substrate / AK consumer / gap)

Grounded in reading `~/Projects/HotRepl` and this repo. ✅ = solid, ⚠️ = thin/ad-hoc, ❌ = absent.

| Stage / pillar | HotRepl substrate | AK today | Gap → implication |
|---|---|---|---|
| Scaffold | `hotrepl-mod-template` (planned, roadmap Phase 1) | `create-new-mod` skill | Adequate |
| Discover — types/members | `Il2CppHelpers.DescribeType/FindObjects/TryCast/SafeName`; `eval` | ad-hoc `.omp/*.csx` probes; `server-scripts*/` Mono decompiles | ⚠️ No curated, repeatable discovery surface; knowledge trapped in throwaway scripts |
| Discover — scene/objects | `UnityGameObjectFind` command; `UnityHelpers`; `eval` | `world.summary` (scene, net state, char count, localPlayer bool) | ⚠️ Snapshots are thin; no structured scene/entity query |
| Prototype logic | `eval` (persistent state, Roslyn `latest` C# on IL2CPP) | `eval` via CLI + `.omp/*.csx` | ✅ Core strength, but used ad-hoc; see Section 4 pitfalls |
| Author / patch behavior | `docs/authoring-commands.md`, template, Harmony | DataExporter + ~12 gameplay mods | Behavior change needs a compiled Harmony DLL (no live patch on IL2CPP) |
| Build | — | `build-tool build` | ✅ |
| Deploy / load | — | `build-tool deploy` / `deploy-host` | DLL lock ⇒ relaunch required |
| Run / reach state | jobs; `subscribe` (unused) | `build-tool launch`/`export`; bespoke poll loops | ⚠️ Reimplements readiness; should use `subscribe` + SDK |
| Observe — state | `eval`; `world.summary`; screenshot helper | `world.summary` | ⚠️ No rich state snapshot |
| Observe — logs/exceptions | ❌ (protocol has no log query) | `build-tool` tails `MelonLoader/Latest.log` out-of-band | ❌ Agent can't pull structured logs/exceptions over the protocol |
| Verify — unit | `HotRepl.Testing.HandlerHarness` | `DataExporter.Tests`, `BuildTool.Tests`, BetterBestiary parity | ⚠️ HandlerHarness not yet used by AK |
| Verify — integration/live | `HotRepl.Testing` + `HotRepl.Sdk` | none (bespoke `HotReplExportRunner` WebSocket client) | ❌ No live-game integration tests; roadmap Phase 4c retires the bespoke client |
| Verify — data | artifacts (sha256-verified refs) | exported JSON consumed by pipeline | ❌ No diff-vs-baseline regression harness |
| Verify — visual | `UnityScreenshot` command + `UnityHelpers` framebuffer capture | `MapScreenshotter` (map-specific) | ⚠️ No general "capture + baseline-diff" loop |
| Maintain across updates | — | `update-game-version` skill; `server-scripts*/` snapshots | ⚠️ Breakage detection is manual |
| Package / distribute | Thunderstore explicitly out of scope (roadmap) | n/a (internal tooling) | Out of scope |

Note: HotRepl already ships the *seeds* of the discovery and verification pillars (`Il2CppHelpers`, `UnityGameObjectFind`, screenshot capture, `HandlerHarness`, `journal_query`, `subscribe`, `reset`, completions, the C# `Sdk`/`Testing` packages). The foundation question is largely about **curating and extending these into a coherent, disciplined surface**, not inventing from zero.

---

## 4. Lessons and pitfalls from other projects

Each lesson is paired with the design implication it forces.

### 4.1 REPL-driven development: knowledge and state get trapped in the session
The Clojure/Smalltalk community has run live-REPL workflows for decades. The recurring failure modes [Clojure.org; Practicalli; SoftwarePatternsLexicon; cbui.dev]:
- **State drift:** "You get your REPL to a state where your code and tests work, but from a fresh load it doesn't." The live session diverges from what a clean build produces.
- **Knowledge trapped in sessions:** "RDD fails when important insights stay trapped in the session." Exactly what AK's `.omp/*.csx` probes are — valuable selector logic, discoverable nowhere, tested by nothing.
- **Motion is not progress / local maxima:** "The REPL gives velocity, but do not mistake motion for progress. Come with a plan." Ad-hoc eval can churn without converging.

**Implication:** the toolbox must enforce a **graduation path** — eval experiment → promoted into a typed command / source file → pinned by a test. "Shape functions against real inputs at the REPL, then promote the useful code back into source files and automated tests" [Clojure for Java]. AK already does this *once*, correctly: the `skill-effect-parity` golden corpus baked from `compendium.db`. That pattern should be the rule, not the exception.

### 4.2 Agent tool design: fewer, smarter tools beat a tool zoo
The dominant 2025-2026 finding [Online Inference; Harness; Speakeasy; MindStudio; Layered]:
- "Expose a small, job-specific tool surface" — 3-15 essential operations, not 50+.
- **Token tax:** a 106-tool MCP server costs ~54.6k tokens of schema on every init; standard server sets eat ~20% of context before the first prompt. Stay under ~40% context.
- **CLI / code bridge:** for shell-capable agents, one tool that exposes a CLI the agent drives beats N narrow tools. Anthropic reported a 150k-token workflow cut to ~2k by code-based invocation.
- **Aggregation over enumeration:** do the work server-side; return summaries, not raw dumps.

**Implication:** the toolbox is a **thin, composable surface**, not a catalog. HotRepl's deliberate 9-tool MCP surface is the right instinct. `eval` is the long-tail escape hatch that prevents tool sprawl; typed commands exist only for the *repeatable, contract-worthy* operations. Resist a tool per task.

### 4.3 "Compiles is not correct": IL2CPP integration is the real risk
From IL2CPP/MelonLoader/Harmony practice [BTD docs; Harmony edge cases; Long Dark wiki] and Unity-MCP:
- No transpilers on IL2CPP — only prefix/postfix patches; some methods are **inlined** and silently unpatchable.
- Patching too early throws `MissingMethodException`; defer past scene load.
- "A change that compiles can still be wrong because the problem is not compilation, it is integration."

**Implication:** verification must be **runtime/integration-grounded**, never build-only. A green `dotnet build` proves nothing about whether a hook fired or the data is right.

### 4.4 Mutation can corrupt irreplaceable state
Modding mutates a live game; saves are a real asset (this repo has an `ancient-kingdoms-save-files` skill for exactly this reason).

**Implication:** the mutation pillar needs **safety rails**: honest `MutatesState` flags (HotRepl has these), backup/restore around destructive operations, reversibility where possible, and the explicit probabilistic/deterministic trust boundary.

### 4.5 Main-thread affinity is non-negotiable
Every Unity/Unreal MCP project independently rediscovered this: "All Unity API calls must run on the main thread" [Unity-MCP], and Unreal "executes tool invocations on the game thread serially" [Epic].

**Implication:** HotRepl's `Tick()`-based main-thread execution already solves this; any extension (custom helpers/commands) must run through the same path and never touch Unity off-thread.

### 4.6 Reconnection across reloads is normal, and must be graceful
Unity-MCP "disconnects before a domain reload and reconnects after." AK's analog is harsher: an IL2CPP mod DLL is file-locked, so iterating mod *code* requires a full game restart. HotRepl's single-client/`session_evicted` model means reconnection is the steady state.

**Implication:** minimize restart frequency (warm-game iteration via eval), and make the automation surface (SDK) treat eviction/reconnection as expected, not exceptional.

### 4.7 Discovery is state, not files
"Discovery is not listing files; it is knowing what scene is active, what objects exist, what components are attached, what errors exist right now" [Unity-MCP].

**Implication:** the discovery pillar is about *live runtime truth* (HotRepl's home turf via reflection + scene queries), complemented by the static `server-scripts*/` decompiles for mechanics that can't be observed at runtime.

---

## 5. Design principles for the foundation

Synthesized from the above. These constrain any design; they do not pick one.

1. **Three pillars, not a tool list.** Organize everything as discovery / safe-mutation / verification. Every capability must justify itself against a pillar.
2. **Thin, composable surface.** A handful of stable typed commands for repeatable contracts; `eval` as the escape hatch for the long tail. No tool-per-task sprawl; mind the schema token tax.
3. **Graduation discipline.** A first-class path from eval experiment → committed source/command → test. Nothing valuable stays trapped in a session. This is the antidote to RDD's core failure mode.
4. **Schema-driven contracts.** Typed args/results with generated JSON Schema (HotRepl's v3/v4 direction) so the agent sees stable shapes and the server validates input.
5. **Build on the substrate; honor the boundary.** Reuse `HotRepl.Sdk`/`Testing`, `Il2CppHelpers`, `UnityHelpers`, `subscribe`, `journal`, the mod template. Generic capability belongs in HotRepl; game-specific commands and workflows belong in the consumer repo (the roadmap already draws this line).
6. **One blessed automation surface.** SDK-driven, not hand-rolled WebSocket clients (roadmap constraint #11). Retire `HotReplExportRunner`-style bespoke transports.
7. **Verification is runtime evidence.** Data diffs, live integration tests, and visual baselines — not build/typecheck as a proxy for correctness.
8. **Safety is explicit.** Honest mutation flags, save backups around destructive ops, main-thread-only execution, and a stated trust boundary.
9. **YAGNI / anti-sprawl as a standing rule.** Niche, single-use tooling is a maintenance liability; prefer composing primitives. Out-of-scope is a feature.

---

## 6. Strong external references

- **Three pillars + trust boundary (the organizing thesis):** Josh English, *Advanced Agentic Game Development in Unity with MCP* — https://medium.com/@jengas/advanced-agentic-game-development-in-unity-with-mcp-5add91c579e9
- **Game-engine agent toolkits (scope, main-thread, reconnection):** Unity-MCP — https://github.com/IvanMurzak/Unity-MCP ; Unreal MCP (UE 5.8) — https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor
- **REPL-driven development lessons/pitfalls:** Clojure REPL guidelines — https://clojure.org/guides/repl/guidelines_for_repl_aided_development ; Practicalli REPL workflow — https://practical.li/clojure/introduction/repl-workflow/ ; RDD pattern — https://softwarepatternslexicon.com/clojure/idiomatic-clojure-patterns/repl-driven-development-pattern/
- **Agent tool design / anti-sprawl / token tax:** *Fewer, smarter tools* (Harness) — https://www.harness.io/blog/harness-mcp-server-redesign ; MCP schema bloat — https://layered.dev/mcp-tool-schema-bloat-the-hidden-token-tax-and-how-to-fix-it/ ; dynamic toolsets (Speakeasy) — https://www.speakeasy.com/blog/how-we-reduced-token-usage-by-100x-dynamic-toolsets-v2
- **Runtime validation as source of truth:** Invicti — https://www.invicti.com/blog/web-security/why-ai-generated-code-needs-runtime-validation-not-just-sast
- **IL2CPP/Harmony constraints:** BTD/HarmonyX docs — https://github.com/TDToolbox/BTD-Docs/blob/master/Unity%20Engine/MelonLoader/Harmony%20Patching.md ; Harmony edge cases — https://harmony.pardeike.net/articles/patching-edgecases.html
- **HotRepl substrate (primary source):** repo `~/Projects/HotRepl`; protocol `docs/control-plane-protocol.md`; authoring `docs/authoring-commands.md`; roadmap `docs/superpowers/specs/2026-05-24-typed-commands-roadmap.md`

---

## 7. Open scoping questions (deferred to brainstorming)

The research bounds the design space; it does not collapse it. These are decided with the user, not assumed:

1. **Home / audience.** Generic capability upstream in HotRepl (reusable by Ardenfall/Erenshor/AK), AK-local, or split along the existing substrate/consumer boundary?
2. **Primary form.** Typed commands? A graduated probe/snippet library? Agent skills/docs? `build-tool` ergonomics (warm-game, diff harness, SDK adoption)? Some subset?
3. **Ambition / first slice.** Comprehensive lifecycle foundation built incrementally, or one highest-leverage pillar first (discovery vs verification vs the graduation path)?
4. **Mutation appetite.** Read/discover/verify only, or first-class safe *mutation* (state pokes, runtime Harmony prototyping) with backup rails?
