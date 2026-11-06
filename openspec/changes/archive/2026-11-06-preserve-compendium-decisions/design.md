## Context

The personal item note mixed project priorities, conversations, findings and product contracts. This change moves only missing contracts into the owning specs. Existing detailed contracts for update consent, collection bars, countdown portraits, settings layout, stopped-feature cards, issue forms, augment marks and redacted placeholders remain authoritative and are not duplicated.

## Decisions

- Add a website-presentation capability for composition and retained interaction boundaries, rather than putting website design into a copy-only spec.
- Keep agreements about unpublished content, access to the Windows desktop, deferred developer reports and feature priorities in the item note.
- Keep private signing-key access out of public documentation. The existing release workflow already explains how to supply the key.
- Treat old measurements and isolated failures as investigation history, not current defect claims. The item note keeps concrete unresolved steps separately.
- Preserve existing wording and design selections. This change selects no new player-facing wording and does not change runtime behavior.

## Findings retained from the vault

### Mod usage

The 2026-11-06 investigation found that startup mod-list requests had no User-Agent. Cloudflare request analytics therefore counted game starts as well as browser downloads. From 2 to 6 November, 99 addresses downloaded the DLL in a browser and 70 started a game with an update check, including 27 on 1.1.0 or later. These are address counts, not verified unique players. The free analytics plan retained about 30 days, so a monthly estimate required collecting within that window.

### Boss special timing

The observations recorded for the Bestiary skills-panel rework measured a 5 s warmup followed by 6 to 12 s between specials in melee range, but as little as 1 s when a target was out of reach or just summoned. This is observation evidence for a possible mechanics-page addition, not a new timing guarantee.

### Historical investigations

The backlog collected in November included about 5% HTTP 504 responses in August, including map requests, and one timeout of the local-folder status command. Neither measurement alone establishes a current defect. The remaining website, pipeline and game-bug candidates stay individual investigation or repair steps in the item note.

## Verification

Validate the changed OpenSpec contracts and documentation links. No game or website implementation changes require runtime testing. Release deployment is outside this change.
