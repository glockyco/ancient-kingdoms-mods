# Design

## Context

- Pocket Compendium logs its version, build commit and switched-on features at start (`PocketCompendiumMod.OnInitializeMelon`). A feature that throws stops until the game restarts, and `FeatureRegistry.Stop` logs one error line with the exception. The settings window then shows that feature's page name in red (`SettingsWindow.cs:550-556`).
- The settings window's footer holds "Reset this page" on the left and "Done" on the right (`SettingsWindow.BuildFooter`).
- The tracker knows whether this process hosts the world (`Tracker.WorldKey`), but not whether a joined world is a dedicated server or another player's world.
- The game stores the start-menu choice in `PlayerPrefs` `gameMode`: 0 for single player, 1 for online, 2 for LAN (`UILogin`).
- GitHub fills an issue form's text fields from URL query parameters named by the field's `id`. A parameter the reporter lacks permission for, such as `labels`, turns the link into a 404 page, and a link above the server's limit gets a 414 page ([GitHub Docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query)). The Bloodline Compendium's wrong-fact form uses the prefill for its page field (`bloodline-compendium/.github/ISSUE_TEMPLATE/wrong-fact.yml`).
- `UnityEngine.IMGUIModule.dll` is among the game's Il2Cpp assemblies, so the mod can set `GUIUtility.systemCopyBuffer`.

## Goals / Non-Goals

**Goals:**

- One action in game produces a report that someone can reproduce from.
- A feature that stops after an error gets noticed.
- The player sees everything that leaves the game before it is posted.

**Non-Goals:**

- Sending a report from the mod itself. The player posts it.
- Collecting the log automatically.
- Reports about the website, which has no form yet.

## Decisions

### The browser posts the report

The action builds the details, copies them to the clipboard and opens `https://github.com/glockyco/ancient-kingdoms-mods/issues/new?template=pocket-compendium.yml&details=<details>` with `Application.OpenURL`. The player reads and posts the form in their browser, and a player without a GitHub account can paste the clipboard into a Discord message.

Alternative: post through GitHub's API from the mod. It needs a token or a relay server, and the player would not see what is sent.

### The details

Plain text, one fact per line, in a fixed order, built by a pure function so tests cover it:

- Pocket Compendium's version and build commit, from the same source as the start log line.
- The game version (`Application.version`) and the MelonLoader version.
- The system: the Windows version, or Wine with its host. Only Wine's `ntdll` exports `wine_get_version` and `wine_get_host_version`, and the second returns `Darwin` on macOS and `Linux` on Linux, which covers CrossOver and Proton on a Steam Deck.
- The game language.
- Alone, hosting or joined: alone when this process hosts and `gameMode` is 0, hosting when it hosts otherwise, joined when it is a client.
- The other mods and plugins MelonLoader loaded, with their versions. Old BossTracker, BossSkillTracker or BetterBestiary DLLs show up here.
- The features switched off, and each feature stopped by an error with its exception's first line.

A report is public, so the details leave out server addresses, character names and paths, which can hold the Windows user name. GitHub answers a link above its length limit with 414 URI Too Long, so the link builder shortens error lines first and the clipboard keeps the full text.

### The action and what follows it

The action sits in the settings window, which F8 opens from anywhere in the game. After a click the window says that the browser has the form and the clipboard has the details, names `MelonLoader/Latest.log`, and offers a button that opens the log's folder. Whether that button uses `explorer.exe /select` or a `file:` URL is settled by trying both under CrossOver, keeping the one that opens the host's file manager or at least a folder view.

Where the action sits (the footer beside "Reset this page", the title bar, or a page of its own) and all its wording are decided through comparisons with screenshots of the real window.

Alternative: a key binding. A player would have to learn it before needing it.

### A stopped feature shows a message

When the registry stops a feature after an error, the player's message band shows one line, once per feature and session, through `Player.ShowImportantMessage`, which alerts already use. Its wording is decided through a comparison.

Alternative: the red page name alone, as today. Players do not open the settings to look for it.

### The issue form

The form follows the structure of the Bloodline wrong-fact form: short fields, the prefilled one marked as filled by the game, and required fields only where a report is useless without them. It asks what went wrong and how to see it, takes the details, and asks for the log and a screenshot. It says where the versions and the log are for players who open it from the README, and that the log can contain the Windows user name. Reports carry the labels `bug` and `mods` through the form's `labels` key, which works for reporters who cannot set labels themselves.

Its title prefix and all its text are decided through a comparison, with references from issue forms of popular game mods.

### The log names where the player plays

On each world entry the mod logs whether the player plays alone, hosts or joined a world, so a log shows the setting of the errors that follow.

## Risks / Trade-offs

- [GitHub serves the form only from the default branch] → A test checks that every field id in the link exists in the form. The filled-in form is checked right after the release push and before the site deploy.
- [`Application.OpenURL` may not reach the host browser under Wine or Proton] → Checked under CrossOver on macOS. The clipboard copy and the text in the window work without a browser. Proton stays unchecked, because no Steam Deck is at hand.
- [A posted log reveals the Windows user name] → The form says so before the player attaches it.
- [Joined worlds are not split into dedicated servers and player-hosted worlds] → The log's kill notice lines show a dedicated server when it matters.

## Open Questions

These two questions decide whether a task is added. They are asked before this change is applied.

- Should a second form take ideas for Pocket Compendium, asking what a player wants it to do and when they would use it?
- Should the README and the form also name a Discord channel for players without a GitHub account? The clipboard copy already makes such a post easy.
