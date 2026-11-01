# Design

## Context

- Pocket Compendium logs its version, build commit and switched-on features at start (`PocketCompendiumMod.OnInitializeMelon`). A feature that throws stops until the game restarts, and `FeatureRegistry.Stop` logs one error line with the exception. The settings window then shows that feature's page name in red (`SettingsWindow.cs:550-556`).
- The settings window lists one page per feature and then the Layout page. Each page is a `SettingsPage` of saved rows, and the footer holds "Reset this page" and "Done" on every page (`SettingsWindow.BuildFooter`).
- The tracker knows whether this process hosts the world (`Tracker.WorldKey`), but not whether a joined world is a dedicated server or another player's world.
- The game stores the start-menu choice in `PlayerPrefs` `gameMode`: 0 for single player, 1 for online, 2 for LAN (`UILogin`).
- GitHub fills an issue form's text fields from URL query parameters named by the field's `id`. A parameter the reporter lacks permission for, such as `labels`, turns the link into a 404 page, and a link above the server's limit gets a 414 page ([GitHub Docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query)). The Bloodline Compendium's wrong-fact form uses the prefill for its page field (`bloodline-compendium/.github/ISSUE_TEMPLATE/wrong-fact.yml`).
- `UnityEngine.IMGUIModule.dll` is among the game's Il2Cpp assemblies, so the mod can set `GUIUtility.systemCopyBuffer`.
- The website keeps its Ko-fi and Discord addresses in `website/src/lib/constants/links.ts` and its own address in `website/src/lib/seo/site.ts`.
- RuneLite's Info panel shows the client's versions and four actions: report an issue or make a suggestion, Discord, Patreon and the wiki ([InfoPanel.java](https://raw.githubusercontent.com/runelite/runelite/master/runelite-client/src/main/java/net/runelite/client/plugins/info/InfoPanel.java)). Fabric's Mod Menu and NeoForge's mod list show each mod's version, authors and links to its website, issues and source ([Mod Menu strings](https://raw.githubusercontent.com/TerraformersMC/ModMenu/1.21.11/src/main/resources/assets/modmenu/lang/en_us.json), [ModListScreen.java](https://raw.githubusercontent.com/neoforged/NeoForge/26.3.x/src/client/java/net/neoforged/neoforge/client/gui/modlist/ModListScreen.java)). Of ten feature request forms of popular game mods, all ask for the desired change, seven for the problem behind it, and none for versions or logs, as in [BepInEx's](https://raw.githubusercontent.com/BepInEx/BepInEx/master/.github/ISSUE_TEMPLATE/feature_request.yaml) and [Sodium's](https://raw.githubusercontent.com/CaffeineMC/sodium/dev/.github/ISSUE_TEMPLATE/feature_request.yml).

## Goals / Non-Goals

**Goals:**

- One place in the game that names the installed version and leads to the project, its source, its support page and its two forms.
- One action in game produces a problem report that someone can reproduce from.
- A feature that stops after an error gets noticed.
- The player sees everything that leaves the game before it is posted.

**Non-Goals:**

- Sending a report or an idea from the mod itself. The player posts it.
- Collecting the log automatically.
- Checking for a newer version. It needs network access and its own failure handling, so it gets its own change after this one.
- Reports about the website, which has no form yet.

## Decisions

### An About page, last in the window

The window gets a page kind that draws its own content instead of saved setting rows, and the About page is its first use. It comes last, after Layout, because it holds no settings, and the footer hides "Reset this page" while it shows.

It shows the name with the version, build and author, says that Pocket Compendium is fan-made and that its problems come to us, not to the game's developers, links the compendium website, the mod's folder on GitHub, whose README is the mod's page, the game's Discord and Ko-fi, and holds the report and idea actions. The fan-made line is the page's own addition, because the developers ask players in support replies whether a mod is in play. Its entry carries Lucide's `info` icon, a circled i, which `website/scripts/generate-mod-icons.mjs` renders with the mod's other icons.

Alternatives: the actions in the footer beside "Reset this page", where they crowd every page and read as page actions, and an icon in the title bar, which players do not find.

### Links come from one place

The mod keeps the four addresses in one class. A test reads the website's `links.ts` and `site.ts` and fails when an address differs, so the mod and the site cannot drift apart.

### Two forms, two actions

Problems and ideas need different fields. The problem form takes the details the report action fills. The ideas form asks first what the player wants to do in the game and what gets in the way, both required, then for their idea, how often the need comes up and screenshots, all optional. Like every surveyed feature request form, it asks for no setup details. So the page has two actions, each opening its own form, instead of RuneLite's single entry. Both forms' wording is chosen through comparisons.

### The browser posts the report

The report action builds the details, copies them to the clipboard and opens the problem form with `Application.OpenURL`, filling its `details` field. The player reads and posts the form in their browser.

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

### What follows the report action

After a click the page says that the browser has the form and the clipboard has the details, names `MelonLoader/Latest.log`, and offers a button that opens the log's folder. Under Wine the button hands the folder's `file:` URL to `winebrowser`, which passes it to the host system: CrossOver on macOS then opens the folder in Finder, from where the player can drag the log into the browser. Opening the same URL through the shell, as `Application.OpenURL` does, shows the folder in Wine's own file manager instead, which cannot hand files to the host's browser. On Windows the button opens the folder with `Application.OpenURL`.

### The compendium channel for players without a GitHub account

The problem form and the README name the #📖-compendium channel on the game's Discord ([channel](https://discord.com/channels/901387547110944808/1329166511189004400), [invite](https://discord.gg/8MkSWjXwab)) as the place to post the copied details. The details are plain text, so a post there carries the same facts as an issue.

### A stopped feature shows a message

When the registry stops a feature after an error, the player's message band shows one line, once per feature and session, through `Player.ShowImportantMessage`, which alerts already use. Its wording is decided through a comparison.

Alternative: the red page name alone, as today. Players do not open the settings to look for it.

### The issue forms

Both forms follow the structure of the Bloodline wrong-fact form: short fields, the prefilled one marked as filled by the game, and required fields only where a report is useless without them. The problem form asks what went wrong and how to see it, takes the details, and asks for the log and a screenshot. It says where the versions and the log are for players who open it from the README, and that the log can contain the Windows user name. Problem reports carry the labels `bug` and `mods`, and ideas `enhancement` and `mods`, through each form's `labels` key, which works for reporters who cannot set labels themselves.

### The log names where the player plays

On each world entry the mod logs whether the player plays alone, hosts or joined a world, so a log shows the setting of the errors that follow.

### Every settings text is compared in place

The page's texts are compared together with the summaries and help texts of the other pages, on screenshots of the real window, because they share one window. The check of the current texts in the game found single words alone on the last line in the Zones help and the Bestiary countdown and Bestiary pages summaries, and one fact stated twice on the Boss list page.

## Risks / Trade-offs

- [GitHub serves the forms only from the default branch] → A test checks that every field id in the link exists in the problem form. Both forms are tried right after the release push and before the site deploy.
- [`Application.OpenURL` may not reach the host browser under Wine or Proton] → Checked under CrossOver on macOS. The clipboard copy and the text on the page work without a browser. Proton stays unchecked, because no Steam Deck is at hand.
- [A posted log reveals the Windows user name] → The problem form says so before the player attaches it.
- [Joined worlds are not split into dedicated servers and player-hosted worlds] → The log's kill notice lines show a dedicated server when it matters.
