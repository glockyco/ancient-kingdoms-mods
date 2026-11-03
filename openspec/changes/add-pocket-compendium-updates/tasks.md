# Tasks

## 1. Signed mod list and release changes

- [x] 1.1 Add a `build-tool` command that creates the RSA-3072 key pair, writes the private key to a file for Bitwarden and prints the public key, and verify with a BuildTool test that a signature made with its private key verifies with its public key
- [x] 1.2 Add `releases` with `version` and `changes` to `website/mod-downloads.json` and copy them into the list from `publish-mods` with `schemaVersion` 2, and verify with BuildTool tests that a release keeps the fields 1.0.2 reads, lists its changes, and fails without changes for the newest tag
- [x] 1.3 Sign the list in `publish-mods` when `UPDATE_SIGNING_KEY` names a key file and write `manifest.json.sig`, and verify with BuildTool tests that the signature verifies and that no key writes no signature
- [x] 1.4 Check the signature in `cf-deploy` between the build and `wrangler deploy`, and verify that the check stops on an unsigned build and on a build signed with another key
- [x] 1.5 Rewrite the release steps in `CONTRIBUTING.md` for changes in the registry and the key from Bitwarden, and verify them with a `publish-mods` run signed with the release key that the deploy check accepts

## 2. Shared update logic

- [x] 2.1 Add the list model, parser, RSA check and version comparison under `mods/Shared/Updates/` and link them into `tests/PocketCompendium.Tests`, and verify with tests for a valid list, a changed list, a file with another SHA-256, and higher, equal and lower versions
- [x] 2.2 Add the change lines, and verify with tests for one version, several versions with their prefixes, and the three-line limit with "And 1 more change."
- [x] 2.3 Add the stored answer and the report the update code passes to Pocket Compendium, and verify with round-trip tests

## 3. The updater

- [x] 3.1 Add the fixed plugin and the update code as projects and embed both in Pocket Compendium, and verify that the built DLL carries both and that two release builds of one source are the same file
- [x] 3.2 Build the update code: read the answer, download, wait at most 10 seconds, verify, move the file and report, and verify in the game under CrossOver with a test-key build and a local server: an older build updates in the same start, a delayed download loads at the next start, a changed list installs nothing, and "Don't check for updates" leaves the server's log empty
- [x] 3.3 Make Pocket Compendium write the plugin on "Install updates for me" or Install and rewrite the update code when its copy differs, and verify in the game that `Plugins` holds the plugin after the answer and that a newer build's update code runs at the next start

## 4. Interface in the game

- [x] 4.1 Replace `AnnouncedChecksum` with the answer file, remove the chat line and About's update row, and verify in the game that a 1.0.2 preferences file loses the old entry and About shows version, links and feedback only
- [ ] 4.2 Add the first-start question with keyboard and gamepad control, and verify in the game with the mouse, with the arrow keys and Enter, and with a gamepad, and that the local server sees no request before the answer
- [x] 4.3 Add the start-screen card in every state with its change lines, and verify each state in the game with a screenshot, and that the card hides in character selection and in the world
- [x] 4.4 Add the Updates page with its status lines and the three answers, and verify each state in the game with a screenshot
- [x] 4.5 Add the icons through `generate-mod-icons.mjs` and `Icons.cs`, and verify that the card, the question and the page show them in the game

## 5. Player documentation

- [x] 5.1 Update the player documentation that describes installing or removing Pocket Compendium for the question at first start and the updater in `Plugins`, with wording chosen in a comparison, and verify that the documentation check passes

## 6. Integration

- [x] 6.1 Show every new text in the built interface in Plannotator, apply the answers, and verify the applied texts in the game
- [x] 6.2 Run every test project and the website's checks, and verify that they pass
- [x] 6.3 Ask for the Windows desktop to be started, check over Tailscale and SSH that it has the game with MelonLoader and a signed-in desktop to start it in, then run the steps of 3.2 there with a test-key build, and record the results in the change
  - Windows 10 desktop, MelonLoader 0.7.3 from the release zip: with "Install updates for me", 1.0.2 wrote the plugin and update code, and at the next start the update code downloaded 1.0.3, verified it with RSA and moved it into place before "Loading Mods...", so the game ran 1.0.3. A list changed after signing installed nothing and requested no DLL.

## Workflow follow-up

- Release the first version with updates after approval: create the key and store it in Bitwarden, set the version, add its changes to the registry, tag it, deploy with the key, and check the live list's signature.
- Archive the change after the release.
