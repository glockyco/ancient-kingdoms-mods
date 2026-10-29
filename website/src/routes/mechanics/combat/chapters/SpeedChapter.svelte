<script lang="ts">
  import Chapter from "$lib/components/reference/Chapter.svelte";
  import Formula from "$lib/components/reference/Formula.svelte";
  import RefTable from "$lib/components/reference/RefTable.svelte";
  import Topic from "$lib/components/reference/Topic.svelte";
  import { timingCalculation } from "$lib/calculation/combat";
</script>

<Chapter id="timing">
  <Topic id="haste">
    <!-- Source: server-scripts/Player.cs:GetSkillRefractoryPeriod,2915-2920; Pet.cs:2315-2320; Skills.cs:StartCast,FinishCast,FinishCastMeleeAttackMonster — Haste changes player weapon waits and selected non-spell cooldowns, while spell haste changes player and mercenary casts. -->
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
        <!-- Source: server-scripts/Player.cs:3458-3495; Combat.cs:340-346 — weapon auto attacks use cast time plus a Haste-adjusted weapon wait bounded to 0.25–2 seconds. -->
        <tr>
          <th scope="row">Player weapon auto attack</th>
          <td>Cast time + <a href="#attack-speed">weapon wait</a></td>
          <td>Shortens weapon wait</td>
          <td>No effect</td>
        </tr>
        <!-- Source: server-scripts/Skills.cs:924-933; Player.cs:2915-2920,GetSkillRefractoryPeriod — player spell casts subtract the bounded spell haste, followed by a fixed auto-attack wait. -->
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
        <!-- Source: server-scripts/Skills.cs:1141-1173; Pet.cs:2315-2320: Haste shortens a companion's first skill's cooldown only if that skill is not a spell, and non-mercenary casts receive no spell haste. -->
        <tr>
          <th scope="row">Companion's first skill, if it is not a spell</th>
          <td>Cast time + cooldown × (100% − Haste)</td>
          <td>Shortens cooldown</td>
          <td>No effect</td>
        </tr>
        <!-- Source: server-scripts/Skills.cs:1141-1173; Pet.cs:2315-2320 — other companion and familiar skills keep their cooldowns and receive no spell haste. -->
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
        <!-- Source: server-scripts/Skills.cs:924-933,1141-1173; Pet.cs:2315-2320 — mercenary spells use the bounded spell haste for casts and keep their cooldowns. -->
        <tr>
          <th scope="row">Mercenary spell</th>
          <td><a href="#cast-speed">Shortened cast</a> + cooldown</td>
          <td>No effect</td>
          <td>Shortens cast</td>
        </tr>
        <!-- Source: server-scripts/Skills.cs:FinishCastMeleeAttackMonster; Monster.cs:2074-2080; Npc.cs:1305-1313 — monster and NPC non-spell attacks reduce cooldown by their skill Haste bonus. -->
        <tr>
          <th scope="row">Monster and NPC non-spell attacks</th>
          <td>Cast time + cooldown × (100% − Haste)</td>
          <td>Shortens cooldown</td>
          <td>No effect</td>
        </tr>
        <!-- Source: server-scripts/Monster.cs:3445,2074-2080; Npc.cs:671,1305-1313; Skills.cs:FinishCast — monster and NPC casts receive zero spell haste, and spells keep their cooldowns. -->
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
    <!-- Source: server-scripts/Player.cs:3408-3419 — a finished cast calls StartSkillRefractoryPeriod. -->
    <!-- Source: server-scripts/Player.cs:GetSkillRefractoryPeriod — the wait is 0.75 seconds for a spell or a skill without a weapon requirement, otherwise the weapon wait. -->
    <p>
      Every skill you finish starts a wait before your next auto attack: 0.75
      seconds after a spell or a skill that needs no weapon, or the weapon wait
      below after a weapon skill.
    </p>
    <!-- Source: server-scripts/Combat.cs:336-347; Player.cs:3458-3495 — player Haste is bounded to −80%–80% before changing the weapon wait. -->
    <p>
      Haste shortens the weapon wait. Haste above 80% counts as 80%, and below
      −80% as −80%.
    </p>
    <!-- Source: server-scripts/Player.cs:3458-3495 — the wait is weapon delay minus its Haste share, divided by 25 and bounded to 0.25–2 seconds, then added to cast time. -->
    <Formula calculation={timingCalculation()} />
    <!-- Source: server-scripts/Player.cs:EventRefractoryPeriod,GetSkillRefractoryPeriod; Skills.cs:FinishCast — the recovery wait gates auto attacks only, and other player skill cooldowns use their listed duration. -->
    <p>
      The wait delays only the next auto attack. Other ready skills can be used
      right away.
    </p>
  </Topic>

  <Topic id="cast-speed">
    <!-- Source: server-scripts/Skills.cs:StartCast,FinishCast; Player.cs:2915-2920; Pet.cs:2315-2320 — spell haste shortens player and mercenary spell casts without changing cooldowns. -->
    <p>
      Spell Casting Haste shortens player and mercenary spell casts without
      changing cooldowns.
    </p>
    <!-- Source: server-scripts/Combat.cs:350-360; Player.cs:2915-2920; Pet.cs:2315-2320 — player and mercenary spell casts use the summed spell haste bounded to −50%–50%, the value the character window shows. -->
    <p>Spell Casting Haste above 50% counts as 50%, and below −50% as −50%.</p>
    <!-- Source: server-scripts/Skills.cs:924-933; Player.cs:GetSkillRefractoryPeriod — spell auto attacks use the shortened cast plus a fixed 0.75-second wait. -->
    <Formula calculation={timingCalculation(true)} />
  </Topic>
</Chapter>
