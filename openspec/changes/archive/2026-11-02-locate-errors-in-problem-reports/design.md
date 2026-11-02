# Design

## Context

- `ProblemReport.Details` lists each stopped feature with the first line of `Feature.Failure`, and `SetupReader.Read` fills that list from the features alone. Respawn tracking (`Tracker.Update`), the kill notice and renewal patches, a Bestiary page left to the game (`BestiaryPagesFeature.ReportPageFailure`) and a failed cleanup (`FeatureRegistry.Stop`) only write to the log.
- Every one of those paths, and every stopped feature, goes through `Log.Error` once, with the exception appended to the message.
- The report on 2026-11-02 read `Il2CppInterop.Runtime.Il2CppException: System.NullReferenceException: Object reference not set to an instance of an object.` for both features. Its first line names neither the throwing member nor the mod's code. The exception text holds both: an IL2CPP stack between `--- BEGIN IL2CPP STACK TRACE ---` and `--- END IL2CPP STACK TRACE ---`, whose first frame after `UnityEngine.Bindings.ThrowHelper` names the Unity member, then the managed frames, which name the mod's methods.
- The released DLL has no symbols, so its managed frames carry no file or line. Il2CppInterop's frames in the same log do, because its build carries them.
- Both failures followed leaving a world and entering another in the same game session. The log says "Entered a world" on each entry, but nothing tells a reader of the details that the player entered twice, or which entry an error belongs to.
- An exception in `UIBestiaryDetailPatch.Draw` outside its page try block escaped into the game, which logged it through Il2CppInterop's trampoline on every frame. The details never saw it.

## Goals / Non-Goals

**Goals:**

- A report names where each error was thrown and in which part of the session, so its cause can be found by reading the code at the reported build.
- Every error the mod logs reaches the report, including errors that stop no feature.

**Non-Goals:**

- Attaching the log or sending anything from the game. The player still posts the details.
- Warnings. They mark expected conditions such as a missing save file, and some name paths.
- Errors that the game or other mods log.

## Decisions

### One record of the session's errors

`Log.Error(message, exception)` writes the log line as before and adds the error to a session record with the circumstances of that moment. The details read the record instead of the features' failures. A new error path reaches the report without further work.

The message is the line's own text before the exception, such as `Map pins stopped after an error`. Because it reaches public reports, `Log.Error` requires a message that names no server address, character name or path, as every current message does. The registry's message loses "Every other feature keeps running", which suits the log and is noise in a list of errors.

The record keeps the first five errors and counts the rest, because a cascade adds little after its first errors and a Discord post holds 2000 characters.

Alternative: plumbing each source into `SetupFacts`, such as the tracker, the pages and the patches. It covers only the sources it names.

### Frames from the exception text

`ProblemReport` reads the exception's text, as it already reads its first line, so tests run on texts captured from the game. It keeps two kinds of frames:

- The frame that threw: the first frame of the IL2CPP stack after `UnityEngine.Bindings.ThrowHelper`, or the first managed frame when there is no IL2CPP stack. `Il2CppInterop.Runtime.Il2CppException.RaiseExceptionIfNecessary` only rethrows, so it is skipped, and so is the managed wrapper that repeats the IL2CPP frame.
- Up to three Pocket Compendium frames, innermost first, without `FeatureRegistry`, which calls every feature and says nothing about the failure.

IL2CPP frames lose their `[0x00000] in <...>:0` suffix, and every frame loses its directories, as the first line already does.

Alternative: the whole stack. Most of an Il2CppException's frames are Il2CppInterop internals, and the mod's frames beyond the third say little about the failure.

### Symbols inside the DLL

The project embeds its portable symbols (`DebugType` `embedded`) and maps the repository root to `/_/` (`PathMap`), so frames read `in /_/mods/PocketCompendium/Features/MapPins/MapPinsFeature.cs:line 90` and the details keep `MapPinsFeature.cs:line 90`. The DLL then holds no local path, and its debug directory names only `PocketCompendium.pdb`. The build commit in the details names the source the lines refer to.

Alternative: a `.pdb` beside the DLL. Players install one file, and a second one gets lost.

### Circumstances: the setting and the world's number

The mod counts a world entry when the game's network starts, which it does when the player enters a world as its host or as a client, and checks this once a frame before anything else runs. An error records that count and the play setting at the moment it is logged. So an error while a second world loads counts toward world 2, and an error at the start screen after the first world reads as after world 1. The world-entry log line names the same number.

Alternative: counting at the player's spawn, like the log line before this change. An error while the world loads then carries the number of the world before.

### Exceptions stay inside the patches

`UIBestiaryDetailPatch` and both `GamepadLootNavigation` patches catch every exception. A failure while drawing one page keeps its existing handling, which leaves that page to the game. Any other failure calls `Feature.Fail` on Bestiary pages, so the registry logs it once and stops the feature, and the patches pass through from the next frame. A failing prefix lets the game's method run. The kill notice and renewal patches already catch their exceptions.

### The form shows the details as text

The details field gets `render: text`, so GitHub posts it as a code block. Without it, GitHub renders the field as Markdown, where a backtick in a generic type name such as ``Dictionary`2`` opens a code span and indentation changes the list.

### Wording

How an error's circumstances read, and the header of the error list, are player-visible text, so a comparison decides them before the release. The implementation starts from `- Map pins stopped after an error (world 2, joined)`, `(after world 1)` and `(before any world)`.

## Risks / Trade-offs

- [A future `Log.Error` message names a path or a character] → The method's documentation says that its message reaches public reports, and the details still cut directories from every line.
- [Release builds inline small methods and optimize away exact line mappings, so a frame can name the caller or a later line of its method] → The frame still names the method and its file. In a scratch session on 0.10.2.3, a Bestiary page failure thrown on line 40 of `BestiaryDetailRenderer.cs` read line 55, the method's last, while the Map pins failure named its exact line 90.
- [The DLL grows by its symbols] → The Release DLL went from 371,712 to 436,736 bytes, which stays small beside the game's own download.
