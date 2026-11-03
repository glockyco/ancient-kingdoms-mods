# Design

## Context

See proposal.md for why. Today `Core/Feedback/UpdateCheck.cs` downloads `/mods/manifest.json` from `OnInitializeMelon`, compares the SHA-256 of its own file with the list's, and posts a chat line in the world. `build-tool publish-mods` builds each mod from its newest `<id>-v<version>` tag, writes the list from `website/mod-downloads.json`, and runs before every `pnpm dev` and `pnpm build`. Deploys run locally with `pnpm cf-deploy`, and CI builds no mod. The mod touches no scene but `World`. The game's start scene is `Start`, with `UILogin` as its menu.

Facts measured in the game under CrossOver on 2026-11-03:

- While the game runs, MelonLoader's loaded `PocketCompendium.dll` can be neither overwritten nor renamed.
- A plugin's `OnPreInitialization` runs before MelonLoader loads mods. A probe there downloaded the list in 1.2 s and the DLL in 1.5 s. MelonLoader reached `OnPreModsLoaded` at 2.1 s, the probe swapped the file, and the game ran the new version in that start.
- `RSA` (`RSACng`) verified a signature and rejected a changed message. `ECDsa` failed with "Unknown error (0x80090029)".

## Goals / Non-Goals

**Goals:**

- One file to install, as now, with updates that load in the start that finds them.
- Code that updates the mod can itself be updated, including its key and its list format.
- Nothing reaches the website before the player answers, or ever with "Don't check for updates".

**Non-Goals:**

- Updating FieldDefaultValueHookFix or MelonLoader.
- Rolling back a release. A fix arrives the same way, because the updater runs before the mod.
- A changelog page on the website.

## Decisions

### The updater is a fixed plugin that loads current code

`PocketCompendiumUpdater.dll` in `Plugins` is a small MelonLoader plugin that never changes. At `OnPreInitialization` it reads `UserData/PocketCompendium/Updates/PocketCompendium.UpdateCore.dll`, loads those bytes with `Assembly.Load(byte[])`, and calls `PocketCompendium.UpdateCore.Startup.Start()`. At `OnPreModsLoaded` it calls `BeforeMods()`. It catches every exception and does nothing when the file is missing. Pocket Compendium embeds both DLLs, writes the plugin when the player chooses "Install updates for me" or clicks Install, and rewrites the update code whenever its own copy differs. `build-tool deploy` leaves both out of `Mods`, where MelonLoader would load the plugin as a mod.

A loaded plugin's file is locked like the mod's, so a plugin that held the update code could never get a new key, list format or fix. Loading bytes leaves the file free for Pocket Compendium to replace. Alternatives: a single plugin, frozen at its first version, splitting Pocket Compendium into a loader and the rest, which moves Harmony and the Il2Cpp type injection into an assembly loaded from bytes, and a process that swaps the file after the game quits, which is fragile and looks like malware to virus scanners.

### The update code runs while MelonLoader prepares the game

`Start()` reads the player's answer and, with "Install updates for me", begins the download on a background task. `BeforeMods()` waits for it at most 10 seconds, verifies the file, and moves it over `Mods/PocketCompendium.dll` before MelonLoader loads mods. MelonLoader 0.7.3 invokes `OnPreModsLoaded` and only then loads mods, so this wait holds the start without a race. A download still running finishes in the background, because a request may take two minutes, and is put in place at the next start. A file put in place by an earlier Install click is moved the same way with any answer, because the player asked for it. A staged file whose SHA-256 changed, which names no higher version, or with no installed mod to replace, is deleted instead.

### Shared update logic without game types

The list model and parser, the signature check, the version comparison, the change lines, the stored answer, the staging and the handoff live in game-free sources under `mods/Shared/Updates/`, with `mods/Shared/MelonInfoReader.cs`, which also serves `publish-mods`. `Updates.props` compiles them by link into Pocket Compendium and the update code and embeds the public key, and `tests/PocketCompendium.Tests` links them too. The files are nullable-oblivious, because Pocket Compendium's game references hide the compiler's nullable attributes.

### RSA signs the list

A deploy signs the exact bytes of `manifest.json` with RSA-3072, PKCS#1 v1.5 and SHA-256, and publishes the signature as base64 in `/mods/manifest.json.sig`. The public key is in the shared sources. Both readers verify the list before they parse it, then compare each file's SHA-256 with the list's. RuneLite signs its plugin list with SHA256withRSA. ECDSA was the smaller choice but fails under CrossOver.

### The key stays in Bitwarden

A one-time `build-tool` command creates the key pair, writes the private key to a file for the private Bitwarden vault and prints the public key for the shared sources. At a release the vault tool writes the private key to a private file, and the deploy runs as `UPDATE_SIGNING_KEY=<file> pnpm cf-deploy`. `publish-mods` signs when the variable is set and leaves the list unsigned otherwise, so `pnpm dev` and `pnpm build` work without the key. `cf-deploy` checks the signature with the public key between the build and `wrangler deploy` and stops without one.

### The registry holds the changes

Each mod in `website/mod-downloads.json` may list `releases`, newest first, each with its `version` and its `changes`. `publish-mods` copies the releases up to the published version into that mod's entry in the list, raises `schemaVersion` to 2, and keeps every field 1.0.2 reads. It fails when Pocket Compendium's newest tagged version has no release with changes.

### The updater leaves its result for the mod

The update code and Pocket Compendium run in one game process, so the update code publishes its outcome with `AppDomain.SetData`: up to date, installed, still downloading, downloaded, or failed with a reason, together with the verified list. The two assemblies each compile the shared code, so the report travels as framework types. Pocket Compendium reads it at start and every frame, which catches a download that finishes after mods loaded. It downloads the list itself only when the update code didn't check this start, such as at the first start, with "Only tell me about updates", or after the update code only moved a staged file.

### The answer in a file the updater can read

`UserData/PocketCompendium/Updates/settings.json` holds the answer (`install`, `tell` or `off`) and the version that ran last, which decides the card after an update. A file rather than MelonPreferences, because the update code runs before MelonLoader loads the mod that would create the entries. No answer, or an unreadable file, brings the question back. 1.0.2's `PocketCompendium_Updates` entry `AnnouncedChecksum` is deleted from `MelonPreferences.cfg` at start, and the chat line is gone.

### The start screen and the Updates page

The card and the question live on `Overlay.Windows` and show only while the `Start` scene's menu is open, so neither shows in character selection or the world. The question lays a layer over the menu that takes the pointer, turns off the game's own keyboard and gamepad navigation while it is open, and reads the arrow keys, the gamepad's directional buttons, Enter and the gamepad's confirm button through the Input System. Its line on changing the answer later names the settings key from Layout, not always F8. The Updates page is an `ISettingsContent` page between Layout and About with the status line, its Install or Download button and the three answers as rows, so the window's header switch, which only features have, stays as it is. About drops its update row. New icons come through `generate-mod-icons.mjs`: `refresh-cw` for the page, `circle-arrow-down`, `circle-check`, `sparkles` and `circle-alert` for the cards.

### Testing without the release key

A build with `-p:UpdateTest=true -p:UpdateKeyFile=<public key file>` compiles that test key and reads the website's address from `POCKET_COMPENDIUM_TEST_SITE`. In the game it runs against a local server that serves a list signed with the test key. Release builds have neither, so their address can't be redirected, and a test build without its key fails to build.

## Risks / Trade-offs

- Only CrossOver ran: the swap and the RSA check are tested under CrossOver alone. A Windows desktop reachable over Tailscale and SSH runs them before the release. No Steam Deck is available, so Proton is covered only by CrossOver, which runs Wine as Proton does.
- Virus scanners may flag a mod that writes DLLs: a failed install offers the website's download.
- A lost key stops automatic installs: the key lives in Bitwarden. While the old key exists, an update signed with it can bring code with a new key.
- A broken release reaches every automatic player at their next start: the update code from the version before runs ahead of the broken mod and installs the fix once it is out.
- A slow connection delays each start by up to 10 seconds: offline starts fail at once, and the wait applies only while a download runs.
- Two game instances started together race for the same file: a failed move is tried again at the next start.
- A later MelonLoader changes plugin hooks: the plugin then does nothing, and Pocket Compendium still checks after it loads and offers the version.

## Migration Plan

Players of 1.0.2 and older see their chat line for the first version with updates and download it by hand. Its first start asks the question once. Their old `AnnouncedChecksum` entry is removed. The private key is created and stored in Bitwarden before that release is deployed.
