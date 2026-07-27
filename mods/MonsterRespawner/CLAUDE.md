# MonsterRespawner

Allows instant respawning of dead monsters via clickable world-space markers.

## Usage

1. Hold **Alt** to show markers at dead monster locations
2. Click a marker to trigger immediate respawn
3. Release Alt to hide markers

## Features

- World-space text markers showing name, level, and countdown
- Alt-key toggle to show/hide markers (prevents clutter)
- Click-to-respawn functionality
- Color-coded: cyan=boss, purple=elite, red=regular

## How It Works

**Marker System:**
- Uses `TextMesh` for 3D world-space text rendering
- `BoxCollider` on each marker for raycast detection
- Maintains `Dictionary<uint, RespawnMarker>` keyed by monster netId
- Only tracks dead monsters with `respawn == true` and future respawn times

**Respawn Mechanism:**
- Does NOT spawn monsters directly
- Sets `respawnTimeEnd` to `Time.timeAsDouble - 1.0`, a local elapsed-time value in the past
- Game's built-in respawn system handles the actual spawn

**Server Time:**
- Uses `NetworkManagerMMO.offsetNetworkTime + NetworkTime.time` for marker eligibility, countdowns, and removing ready markers
- The respawn action sets `respawnTimeEnd` to `Time.timeAsDouble - 1.0`, using Unity's local elapsed time rather than synchronized server time

## Gotchas

**Respawn requirements:**
- Monster must have `respawn == true`
- Server time must be available (`NetworkManagerMMO` found)
- `respawnTimeEnd > currentTime`

**Timing:** Marker eligibility and countdowns require synchronized server time. The respawn write uses `Time.timeAsDouble - 1.0`.
