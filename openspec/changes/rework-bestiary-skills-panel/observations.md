# Observed in game

Observed on 2026-11-01 in game 0.10.1.4, Steam build 26318331, in a single player world on the scratch database. The character stood at a held distance from Nyxarion while a recorder read his state, his skill selection and the character's stun and fear every frame. For the session only, his damage and his skills' listed damage were set to zero so the character survived, which leaves timing, reach and effects unchanged.

| Claim | Observed | Samples |
| --- | --- | --- |
| No special in the first 5 s of a fight | First special 5.7 s and 11.2 s after combat started | 2 fights |
| Next special 6 to 12 s after each special's cast, in melee range | The due time was set to the cast time plus 6 to 12 s every time. Specials started 8.4 to 14.7 s apart, because the monster first finishes its basic attack | 10 gaps |
| The gap does not hold right after a pull | Fear and Dragon Ice Breath each started 1.1 s after Summon Player pulled the character in | 2 |
| A special with a cast of 0.3 s or less gets no cast bar | Summon Player (0.1 s) never showed the target cast bar. Dragon Ice Breath, Knockback (1.0 s) and Fear (1.2 s) always did | 3 and 14 casts |
| The cast bar needs the monster as the player's target | Read from `UICastBarMonster.Update`, which shows it only for `Player.localPlayer.Networktarget` | code |
| Summon Player pulls from 3 to 15 yd and stuns 2 s | Cast at 5.8 and 12.1 yd, the character landed on Nyxarion and was stunned 1.9 s from the next frame on. Never cast within 2 yd during 150 s and 11 specials | 2 pulls |
| The upper reach of 15 yd | Not observed: beyond about 13 yd Nyxarion dropped the character as his target. The 15 yd comes from the skill's cast range | code |
| Fear lasts 4 to 8 s | 4.7, 4.8 and 7.9 s | 3 fears |

Two behaviours the plan did not name, read from `Monster.cs` and consistent with the gaps above:

- While the target is out of reach, each update has a 2% chance to cast a special with a longer reach than the basic attack, 1 s after the last special, without waiting for the 6 to 12 s gap (`Monster.cs:1880-1898`).
- Bosses and elites step behind their target every 60 to 180 s and then use only their basic attack for 12.5 s (`Monster.cs:1452-1475`).
