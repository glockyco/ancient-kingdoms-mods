# Server authority and what a client receives

The game is one build that runs as a host or as a client. A reading is only as good as the authority
of the process that produced it, so establish the mode before you trust a field.

## Which process holds the server

`server-scripts/UICharacterSelection.cs:gameMode` selects the mode and the transport.

| Mode | Menu entry          | Transport      | `NetworkServer.active` |
| ---- | ------------------- | -------------- | ---------------------- |
| 0    | Single Player       | none, no listen | true                   |
| 1    | Multiplayer Online  | `EosTransport`  | true when hosting, false when joining |
| 2    | Multiplayer LAN     | `KcpTransport`  | true when hosting, false when joining |

A local world runs its own server in the same process, so every server field is readable there.
`NetworkServer.active` is the only test that matters. Read it before you read anything else.

## What reaches a client

A client receives synchronized state only.

| State                                  | Reaches a client | Evidence                                                    |
| -------------------------------------- | ---------------- | ----------------------------------------------------------- |
| Skill list with cast and cooldown ends  | yes              | `server-scripts/Mirror/GeneratedNetworkCode.cs:_Write_Skill` writes `hash`, `level`, `armorSetBonusLevel`, `castTimeEnd`, `cooldownEnd` |
| Aggro list                              | yes              | `server-scripts/Monster.cs:aggroList` is a `SyncDictionary`  |
| Entity state string                     | yes              | `_state` is a SyncVar on `server-scripts/Entity.cs:state`    |
| Skill name, cast time, cooldown, icon   | yes, computed    | `server-scripts/Skill.cs:castTime` resolves from the local asset cache through the synchronized hash |
| Plain server fields                     | no               | `server-scripts/MonsterSkills.cs:nextSpecialCastTime`, `server-scripts/Monster.cs:startCombatTime`, `server-scripts/Monster.cs:basicOnlySkillTimeEnd` all read zero on a client |

A plain server field reads as its default on a client rather than failing, so a reader that does not
branch on `NetworkServer.active` reports a confident wrong answer. A client of a public server and a
client of a LAN host both read the three fields above as `0.000` throughout a live fight, while the
server clock stood far from zero.

## What a client can do

| Action                                    | Effect on a client                                      |
| ----------------------------------------- | ------------------------------------------------------- |
| Write a SyncVar, such as `Combat.invincible` | Local copy only. The server's copy decides, and the next serialization overwrites the write. |
| Call a `[Server]` or `[ServerCallback]` method | Nothing. `server-scripts/Monster.cs:OnAggro` is one of these. |
| Call a `[Command]` method                 | Sent to the server and applied. `server-scripts/Player.cs:CmdRespawn`, `server-scripts/Player.cs:CmdSetTarget`, and `server-scripts/PlayerSkills.cs:CmdUse` all work. |
| Move the local player                     | Accepted. Movement is client authoritative, so `server-scripts/Movement.cs:Warp` moves the player from a client. |

Client-side instrumentation of server state is therefore impossible, not merely discouraged. Drive a
client through its `Cmd` handlers, and change server state from the host.

## Characters belong to the client

`server-scripts/NetworkManagerMMO.cs:OnServerCharacterSelect` builds the player entirely from the
client's message: level, attributes, skills, position, and appearance. The server does not load the
character from its own database.

Two consequences apply to every run:

- The same roster joins any server, and the scratch redirect decides which roster that is.
- A character built by the fixture harness reaches a public server as an ordinary character.

## Run a host and a client together

Use a pair when the behaviour under test appears only on a client. The host holds server authority,
so it can hold the subject in the state the client observes.

```sh
dotnet run --project build-tool launch --wait                 # host, port 18590
HOTREPL_PORT=18591 dotnet run --project build-tool launch     # client, port 18591
```

1. Redirect both instances to the scratch database.
2. Click `multiplayerLANButton` on each instance, then wait for the `Lobby` state.
3. On the host, select a character and call `server-scripts/UIServerList.cs:StartConnect` with a null
   server, which hosts and listens.
4. On the host, rename the online player's `account` field. Both instances derive one account from the
   same platform identity, and `server-scripts/NetworkAuthenticatorMMO.cs:AccountLoggedIn` refuses a
   second login for an account already online.
5. On the client, select a different character and call
   `server-scripts/UIServerList.cs:StartConnectLAN` with `127.0.0.1`.
6. Confirm the roles: `NetworkServer.active` is false on the client and true on the host.

Both instances write to one `MelonLoader/Latest.log`, so read state through each endpoint rather than
through the log.
