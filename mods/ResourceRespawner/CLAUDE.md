# ResourceRespawner

Allows instant respawning of gatherable resources (plants, minerals, radiant sparks, chests) via clickable world-space markers.

## Usage

1. Hold **Alt** to show markers at resource locations on cooldown
2. Click a marker to trigger immediate respawn
3. Release Alt to hide markers

## Features

- World-space text markers showing name, type, and countdown timer
- Alt-key toggle to show/hide markers (prevents clutter)
- Click-to-respawn functionality
- Color-coded by type:
  - **Lime** - Plants (herbalism)
  - **Gray** - Minerals (mining)
  - **Purple** - Radiant Sparks (radiant seeker)
  - **Yellow** - Chests (treasure hunting)
  - **White** - Other gatherable items

## How It Works

**Marker System:**
- Uses `TextMesh` for 3D world-space text rendering
- `BoxCollider` on each marker for raycast detection
- Maintains `Dictionary<int, RespawnMarker>` keyed by Unity instance ID
- Only tracks resources on cooldown (`timeToReady > serverTime`)

**Respawn Mechanism:**
- Does NOT spawn resources directly
- Sets `NetworktimeToReady` to `lastKnownServerTime - 1.0` (one second in the past by the server clock)
- Uses the SyncVar setter to properly mark the field as dirty for Mirror networking
- Game's built-in respawn system handles the actual spawn

**Server Time:**
- Uses `NetworkManagerMMO.offsetNetworkTime + NetworkTime.time`
- Stored each frame in `lastKnownServerTime` so `RespawnResource()` can use it
- Must use server time, not `Time.timeAsDouble` — in co-op, the two clocks use different epochs; a reset written with local time appears still-in-the-future on the partner's client
- Auto-removes markers when respawn time is reached

**Cooldown Detection:**
- Checks `!gatherItem.spawnReady && gatherItem.timeToReady > 0.0 && timeToReady > serverTime`
- `spawnReady` distinguishes "waiting to respawn" (marker needed) from "spawned with a despawn timer" (gatherable now, no marker)
- Radiant sparks use `timeToReady` for both their visibility window and their respawn wait — without the `spawnReady` guard, a reset would appear to jump to a new random timer because the server's Update() immediately sets a new visibility-window timer after spawning

## Compatibility

- **Shared hotkey with MonsterRespawner**: Both mods use Alt to show markers
- Resource markers are distinguishable by color (lime/gray/purple/yellow vs red/cyan/purple)
- Both can be used simultaneously without conflicts

## Resource Types

The mod handles all `GatherItem` types:
- **Plants** (`isPlant`) - Respawn time varies, skill-based gathering
- **Minerals** (`isMineral`) - Random respawn variance, requires pickaxe
- **Radiant Sparks** (`isRadiantSpark`) - Wide respawn range (100-3600s)
- **Chests** (`isChest`) - May require keys, fixed respawn time
- **Other** - Generic gatherable items

## Gotchas

**Respawn requirements:**
- Server time must be available (`NetworkManagerMMO` found)
- Resource must be on cooldown (`timeToReady > serverTime`)

**Server time is required:** Always use `NetworkTime.time + NetworkManagerMMO.offsetNetworkTime` (stored as `lastKnownServerTime`), never `Time.timeAsDouble` or other local time sources.

**SyncVar usage:**
- Unlike `Monster.respawnTimeEnd` (plain field), `GatherItem.timeToReady` is a `[SyncVar]`
- The mod uses `NetworktimeToReady` (the SyncVar setter) instead of direct field assignment
- This properly calls `GeneratedSyncVarSetter` and maintains Mirror's dirty-bit tracking
- Direct field assignment (`timeToReady`) would bypass Mirror's network state and cause inventory updates to fail
