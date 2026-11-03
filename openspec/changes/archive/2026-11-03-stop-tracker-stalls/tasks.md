# Tasks

## 1. Tracking

- [x] 1.1 Replace the once-a-second scene search with a postfix on `Monster.Start` and one search when a tracking session starts, inactive objects included, and pick the live spawn from the started ones at each refresh. Verify in game on a host: an altar boss spawned with `NetworkServer.Spawn` shows up at the next refresh, shows the altar again once destroyed, and one alive while every feature is switched off and on shows up afterwards.
- [x] 1.2 Verify with the frame profiler on the same walk in The Lone-Lands that every feature on gives no more frames over twice the median than every feature off, and that no frame runs a scene search after the session starts.

## 2. Release

- [x] 2.1 Release Pocket Compendium 1.0.2 as `CONTRIBUTING.md` describes, once a push and deploy are approved, so players get the fix through the update notice.
