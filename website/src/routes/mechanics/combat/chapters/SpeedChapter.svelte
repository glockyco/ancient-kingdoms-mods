<script lang="ts">
  import Chapter from "$lib/components/reference/Chapter.svelte";
  import Formula from "$lib/components/reference/Formula.svelte";
  import GameBug from "$lib/components/reference/GameBug.svelte";
  import RefTable from "$lib/components/reference/RefTable.svelte";
  import Topic from "$lib/components/reference/Topic.svelte";
  import { timingCalculation } from "$lib/calculation/combat";
</script>

<Chapter id="timing">
  <Topic id="haste">
    <!-- Source: server-scripts/Player.cs:GetSkillRefractoryPeriod,2905-2906; Pet.cs:2259-2264; Skills.cs:StartCast,FinishCast,FinishCastMeleeAttackMonster — Haste changes player weapon waits and selected non-spell cooldowns, while spell haste changes player and mercenary casts. -->
    <p>
      Haste changes weapon waits or non-spell cooldowns, depending on the
      attacker. Spell Casting Haste changes player and mercenary spell casts.
    </p>
    <RefTable
      caption="Attack intervals and the effects of Haste and Spell Casting Haste"
      minWidth="40rem"
    >
      <thead>
        <tr>
          <th scope="col">Attack</th>
          <th scope="col">Time between uses</th>
          <th scope="col">What Haste does</th>
          <th scope="col">What Spell Casting Haste does</th>
        </tr>
      </thead>
      <tbody>
        <!-- Source: server-scripts/Player.cs:3443-3480; Combat.cs:341-347 — weapon auto attacks use cast time plus a Haste-adjusted weapon wait bounded to 0.25–2 seconds. -->
        <tr>
          <th scope="row">Player weapon auto attack</th>
          <td>Cast time + <a href="#attack-speed">weapon wait</a></td>
          <td>Shortens weapon wait</td>
          <td>No effect</td>
        </tr>
        <!-- Source: server-scripts/Skills.cs:924-933; Player.cs:2905-2906,GetSkillRefractoryPeriod — player spell casts subtract the equipment and skill spell haste total, followed by a fixed auto-attack wait. -->
        <tr>
          <th scope="row">
            Player spell auto attack, such as
            <a href="/skills/mystic_spark">Mystic Spark</a>
          </th>
          <td>Shortened cast + <a href="#cast-speed">0.75s</a></td>
          <td>No effect</td>
          <td>Shortens cast</td>
        </tr>
        <!-- Source: server-scripts/Skills.cs:StartCast,FinishCast — player cooldowns use their listed duration, and spell casts subtract spell haste. -->
        <tr>
          <th scope="row">Player skills other than auto attacks</th>
          <td>Cast time + cooldown</td>
          <td>No effect</td>
          <td>Shortens spell casts</td>
        </tr>
        <!-- Source: server-scripts/Skills.cs:1141-1173; Pet.cs:2259-2264: Haste shortens a companion's first skill's cooldown only if that skill is not a spell, and non-mercenary casts receive no spell haste. -->
        <tr>
          <th scope="row">Companion's first skill, if it is not a spell</th>
          <td>Cast time + cooldown × (100% − Haste)</td>
          <td>Shortens cooldown</td>
          <td>No effect</td>
        </tr>
        <!-- Source: server-scripts/Skills.cs:1141-1173; Pet.cs:2259-2264 — other companion and familiar skills keep their cooldowns and receive no spell haste. -->
        <tr>
          <th scope="row">Other companion and familiar skills</th>
          <td>Cast time + cooldown</td>
          <td>No effect</td>
          <td>No effect</td>
        </tr>
        <!-- Source: server-scripts/Skills.cs:1141-1173 — mercenary non-spell auto attacks use Haste to shorten cooldown. -->
        <tr>
          <th scope="row">Mercenary auto attack</th>
          <td>Cast time + cooldown × (100% − Haste)</td>
          <td>Shortens cooldown</td>
          <td>No effect</td>
        </tr>
        <!-- Source: server-scripts/Skills.cs:924-933,1141-1173; Pet.cs:2259-2264 — mercenary spells use the equipment and skill spell haste total for casts and keep their cooldowns. -->
        <tr>
          <th scope="row">Mercenary spell</th>
          <td><a href="#cast-speed">Shortened cast</a> + cooldown</td>
          <td>No effect</td>
          <td>Shortens cast</td>
        </tr>
        <!-- Source: server-scripts/Skills.cs:FinishCastMeleeAttackMonster; Monster.cs:2051-2057; Npc.cs:1302-1310 — monster and NPC non-spell attacks reduce cooldown by their skill Haste bonus. -->
        <tr>
          <th scope="row">Monster and NPC non-spell attacks</th>
          <td>Cast time + cooldown × (100% − Haste)</td>
          <td>Shortens cooldown</td>
          <td>No effect</td>
        </tr>
        <!-- Source: server-scripts/Monster.cs:3383,2051-2057; Npc.cs:668,1302-1310; Skills.cs:FinishCast — monster and NPC casts receive zero spell haste, and spells keep their cooldowns. -->
        <tr>
          <th scope="row">Monster and NPC spells</th>
          <td>Cast time + cooldown</td>
          <td>No effect</td>
          <td>No effect</td>
        </tr>
      </tbody>
    </RefTable>
  </Topic>

  <Topic id="attack-speed">
    <!-- Source: server-scripts/Player.cs:3391-3401 — a finished cast calls StartSkillRefractoryPeriod. -->
    <!-- Source: server-scripts/Player.cs:GetSkillRefractoryPeriod — the wait is 0.75 seconds for a spell or a skill without a weapon requirement, otherwise the weapon wait. -->
    <p>
      Every skill you finish starts a wait before your next auto attack: 0.75
      seconds after a spell or a skill that needs no weapon, or the weapon wait
      below after a weapon skill.
    </p>
    <!-- Source: server-scripts/Combat.cs:337-348; Player.cs:3443-3480 — player Haste is bounded to −80%–80% before changing the weapon wait. -->
    <p>
      Haste shortens the weapon wait. Haste above 80% counts as 80%, and below
      −80% as −80%.
    </p>
    <!-- Source: server-scripts/Player.cs:3443-3480 — the wait is weapon delay minus its Haste share, divided by 25 and bounded to 0.25–2 seconds, then added to cast time. -->
    <Formula calculation={timingCalculation()} />
    <!-- Source: server-scripts/Player.cs:EventRefractoryPeriod,GetSkillRefractoryPeriod; Skills.cs:FinishCast — the recovery wait gates auto attacks only, and other player skill cooldowns use their listed duration. -->
    <p>
      The wait delays only the next auto attack. Other ready skills can be used
      right away.
    </p>
  </Topic>

  <Topic id="cast-speed">
    <!-- Source: server-scripts/Skills.cs:StartCast,FinishCast; Player.cs:2905-2906; Pet.cs:2259-2264 — spell haste shortens player and mercenary spell casts without changing cooldowns. -->
    <p>
      Spell Casting Haste shortens player and mercenary spell casts without
      changing cooldowns.
    </p>
    <!-- Source: server-scripts/Combat.cs:351-361; Skills.cs:924-933; Player.cs:2905-2906; Pet.cs:2259-2264 — the displayed spell haste is bounded to −50%–50%, but player and mercenary spell casts subtract the unclamped equipment and skill bonus total. -->
    <GameBug>
      The character window shows Spell Casting Haste between −50% and 50%, but
      player and mercenary spells use the full total. Enter your full equipment
      and skill total in the calculator.
    </GameBug>
    <!-- Source: server-scripts/Skills.cs:924-933; Player.cs:GetSkillRefractoryPeriod — spell auto attacks use the shortened cast plus a fixed 0.75-second wait. -->
    <Formula calculation={timingCalculation(true)} />
  </Topic>
</Chapter>
