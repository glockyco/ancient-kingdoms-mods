<script lang="ts">
  import RoundedTerm from "$lib/components/RoundedTerm.svelte";
  import Chapter from "$lib/components/reference/Chapter.svelte";
  import Formula from "$lib/components/reference/Formula.svelte";
  import SeeAlso from "$lib/components/reference/SeeAlso.svelte";
  import Topic from "$lib/components/reference/Topic.svelte";
  import { dealtRageCalculation } from "$lib/calculation/combat-rules";
  import { receivedHitCalculation } from "$lib/calculation/combat";
</script>

<Chapter id="class-mechanics">
  <Topic id="rage-generation">
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — Warriors and Rogues gain Rage from auto attacks and targeted physical melee hits. -->
    <p>
      Warriors and Rogues gain Rage by dealing auto attacks and receiving
      targeted physical melee hits.
    </p>
    <!-- Source: server-scripts/Skills.cs:GetEnergyRecoveryBonus; NetworkManagerMMO.cs:OnStartServer — Charge, Frenzied Vigor and Prowess restore their listed Rage percentages each second. -->
    <p>
      <a href="/skills/charge">Charge</a>,
      <a href="/skills/frenzied_vigor">Frenzied Vigor</a> and
      <a href="/skills/prowess">Prowess</a> also restore their listed percentages
      of Rage each second.
    </p>
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — dealt-hit Rage counts auto-attack damage after mitigation and critical hits, before Ward and Mana Shield, capped at current target Health. -->
    <h4>Dealing an auto attack</h4>
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — auto attacks grant 25% of counted damage as Rage, rounded down. -->
    <Formula calculation={dealtRageCalculation} />
    <!-- Source: server-scripts/Combat.cs:DealDamageAt,GenerateRageOnHit — targeted physical melee hits grant received-hit Rage after mitigation and critical hits, before shields. -->
    <h4>Receiving a targeted physical melee hit</h4>
    <!-- Source: server-scripts/Combat.cs:DealDamageAt,GenerateRageOnHit — received-hit Rage is 35% of the square root of damage, rounded down and bounded to 1–25 for positive damage. -->
    <Formula calculation={receivedHitCalculation()} />
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — projectiles and area attacks give no received-hit Rage, and Warrior and Rogue mercenaries follow the same Rage rules. -->
    <p>
      Projectiles and area attacks give no received-hit Rage. Warrior and Rogue
      mercenaries follow the same Rage rules.
    </p>
  </Topic>

  <Topic id="wild-strike">
    <!-- Source: server-scripts/DamageSkill.cs:TryConsumeWildStrike — a Ranger follow-up consumes Wild Strike and multiplies its damage by 1 + 0.1 × rank. -->
    <p>
      The Ranger's <a href="/skills/wild_strike">Wild Strike</a> empowers the
      next melee auto attack (<a href="/skills/swift_slash">Swift Slash</a>) or
      bow auto attack (<a href="/skills/archer_shot">Archer Shot</a>).
    </p>
    <!-- Source: server-scripts/DamageSkill.cs:TryConsumeWildStrike — any Ranger follow-up consumes Wild Strike, multiplies damage by 1 + 0.1 × rank and rounds, with no flat damage bonus. -->
    <p>
      Damage increases by 10% per Wild Strike rank, giving 150% of normal damage
      at rank 5. The result rounds after the auto attack's own calculation. Wild
      Strike adds no flat Attack Power bonus.
    </p>
    <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage — a melee follow-up passes the magic damage override to DealDamageAt. -->
    <!-- Source: server-scripts/TargetProjectileSkill.cs:221-222,252-256 — Apply consumes the override for a bow follow-up and passes it to the projectile effect. -->
    <!-- Source: server-scripts/Combat.cs:521,842-849,1189-1204 — DealDamageAt runs the common pipeline, mitigates Magic once, and instantiates the override effect. -->
    <p>The whole hit deals magic damage.</p>
    <SeeAlso
      links={[{ href: "#resistance", label: "Defense by Damage Type" }]}
    />
  </Topic>

  <Topic id="parry">
    <!-- Source: server-scripts/Combat.cs:isParry,DealDamageAt — the current Parry cast must target the attacker and the incoming skill must be TargetDamageSkill with physical damage, and only Warrior learns Parry in the exported class list. -->
    <p>
      A Warrior can cast <a href="/skills/parry">Parry</a>, a veteran skill,
      while targeting the attacker. During the cast, Parry blocks a
      single-target physical melee hit from that attacker.
    </p>
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — Ward and Mana Shield absorb before the Parry check; Parry returns half the remaining damage, rounded and bounded to 1–5,000. RoundToInt rounds the 50.5 result of a 101-damage hit to 50. -->
    <p>
      Your Ward and Mana Shield still absorb the hit first. Parry blocks the
      rest and returns half of it to the attacker, <RoundedTerm />, at least 1
      and at most 5,000. An exact half rounds to the even number, so 101
      remaining damage returns 50.
    </p>
  </Topic>

  <Topic id="assassination">
    <!-- Source: server-scripts/PlayerSkills.cs:CmdUse — Assasination requires current target Health at most one quarter of maximum Health, rounded to the nearest whole point. -->
    <p>
      The Rogue's <a href="/skills/assasination">Assassination</a> requires the target's
      current Health to be at most 25% of its maximum Health. That Health limit rounds
      to the nearest whole point.
    </p>
  </Topic>

  <Topic id="reaper-form">
    <!-- Source: server-scripts/Skills.cs:GetFinalDamageDoT,GetBuffHealthRecoveryBonus; NetworkManagerMMO.cs:OnStartServer — Reaper Form loses its rounded maximum-Health percentage each second, bypassing normal DoT rules and BreakMezz. -->
    <p>
      <a href="/skills/reaper_form">Reaper Form</a> drains its listed percentage
      of your maximum Health each second, <RoundedTerm />.
    </p>
    <!-- Source: server-scripts/Skills.cs:GetFinalDamageDoT,GetBuffHealthRecoveryBonus; NetworkManagerMMO.cs:OnStartServer — Reaper Form drain bypasses resistance, wards, critical ticks and Deathly Focus bonuses. -->
    <p>
      This drain ignores resistance, wards, critical ticks and Deathly Focus
      bonuses.
    </p>
  </Topic>
</Chapter>
