# Observed in game

## Monsters that spawn when their guards die

Observed on 2026-11-01 in game 0.10.1.4, Steam build 26318331, in a single player world on the scratch database, with Frenzied Troll in Trolls Cave and the five Trolls that guard it. A recorder logged the troll's state, its summon readiness and each guard's state every frame. Kills were made by setting health to zero and arming the respawn timers as a real kill does, because `Monster.OnDeath` arms no timer for a monster nobody attacked.

| Case | What happened |
| --- | --- |
| The troll is dead with its timer passed, and all five guards are killed | Within 1 s the group counted as cleared and the troll spawned. |
| The troll is killed while all five guards are already dead, and its timer is then ended | The troll stayed dead. The cleared group did not count. |
| One guard of that group comes back | The troll stayed dead while that one guard lived, with its timer passed. |
| That guard is killed again | Within 1 s the troll spawned. |
| The group is cleared with 717 s left on the troll's timer | The troll stayed dead until its timer ended, then spawned at once, because the guards were still all dead. |

So the rule is: the monster spawns once its own respawn time has passed while all its guards are dead at the same time, and the last of those guard deaths has to come after the monster's own death. A single living guard holds it back. The code agrees (`SummonMonster.cs:33-70`, `Monster.cs:2240-2272`). From the code alone, a monster with a spawn chance rolls at that moment, and a failed roll waits another full interval, for which the guards must be dead together again.

The website's spawn mechanics page states this rule correctly. The monster page's "This monster cannot respawn while 5 copies of Troll are alive in Trolls Cave" is wrong: one living guard already holds it back.
