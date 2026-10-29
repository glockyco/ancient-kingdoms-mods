<script lang="ts">
  import Chapter from "$lib/components/reference/Chapter.svelte";
  import Formula from "$lib/components/reference/Formula.svelte";
  import RefTable from "$lib/components/reference/RefTable.svelte";
  import SeeAlso from "$lib/components/reference/SeeAlso.svelte";
  import Topic from "$lib/components/reference/Topic.svelte";
  import VariantPicker from "$lib/components/reference/VariantPicker.svelte";
  import {
    DEFENSE_RATES,
    avoidanceCalculation,
    mitigate,
    mitigationCalculation,
  } from "$lib/calculation/combat";
  import { formatPercent } from "$lib/calculation/format";
  import {
    COLD_RESIST,
    DEFENSE,
    DISEASE_RESIST,
    FIRE_RESIST,
    MAGIC_RESIST,
    POISON_RESIST,
  } from "$lib/calculation/inputs";
  import { statName } from "$lib/stats";

  const DEFENSE_STATS = [
    { input: DEFENSE, id: "armor_class" },
    { input: MAGIC_RESIST, id: "magic_resist" },
    { input: FIRE_RESIST, id: "fire_resist" },
    { input: COLD_RESIST, id: "cold_resist" },
    { input: POISON_RESIST, id: "poison_resist" },
    { input: DISEASE_RESIST, id: "disease_resist" },
  ] as const;
  let defenseStatKey = $state(DEFENSE.key);
  const defenseStat = $derived(
    DEFENSE_STATS.find((stat) => stat.input.key === defenseStatKey) ??
      DEFENSE_STATS[0],
  );
  let hitType = $state<"physical" | "other">("physical");
  const reduction = (resist: number) =>
    formatPercent(mitigate(1, resist).share);
</script>

<Chapter id="defense">
  <Topic id="resistance">
    <p>
      Armor Class and Block Chance defend against physical damage. Each other
      damage type has a resist: Magic Resist against magic, Fire Resist against
      fire, and so on.
    </p>
    <!-- Source: server-scripts/Combat.cs:blockChance,GetProbResistMeleeDamage,GetProbResistMagic,DealDamageAt — physical hits roll Block Chance, other hits their matching resist, and the matching stat reduces the damage. -->
    <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; Combat.cs:GetProbResistMeleeDebuff — physical debuffs land against Armor Class, other typed debuffs against their matching resist, and untyped debuffs skip the roll. -->
    <!-- Source: server-scripts/Skills.cs:GetFinalDamageDoT — physical ticks meet Armor Class, typed ticks their matching resist, and untyped ticks Magic Resist. -->
    <RefTable caption="Defense against each damage type">
      <thead>
        <tr>
          <th scope="col"><span class="sr-only">Defense</span></th>
          <th scope="col">Physical</th>
          <th scope="col">Magic, fire, cold, poison and disease</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Avoiding a hit</th>
          <td>{statName("block_chance")}</td>
          <td>Matching resist</td>
        </tr>
        <tr>
          <th scope="row">Reducing a hit</th>
          <td>{statName("armor_class")}</td>
          <td>Matching resist</td>
        </tr>
        <tr>
          <th scope="row">Resisting a debuff</th>
          <td>{statName("armor_class")}</td>
          <td>Matching resist</td>
        </tr>
        <tr>
          <th scope="row">Reducing damage over time</th>
          <td>{statName("armor_class")}</td>
          <td>Matching resist</td>
        </tr>
      </tbody>
    </RefTable>
    <p>
      Debuffs without a damage type cannot be resisted, and their damage over
      time is reduced by Magic Resist.
    </p>
    <SeeAlso
      links={[
        { href: "#avoidance", label: "Block, Miss and Resist" },
        { href: "#mitigation", label: "Damage Reduction" },
        { href: "#debuff-landing", label: "Landing a Debuff" },
      ]}
    />
  </Topic>

  <Topic id="avoidance">
    <!-- Source: server-scripts/Combat.cs:DealDamageAt: any avoided hit skips damage, stun, fear and knockback. -->
    <p>
      Block Chance lets you block or avoid physical hits. Magic Resist, Fire
      Resist and the other resists let you avoid hits of their damage type. Each
      hit gets one roll. Avoiding it also prevents its stun, fear and knockback.
    </p>
    <VariantPicker
      label="Hit type"
      options={[
        { value: "physical", label: "Physical" },
        { value: "other", label: "Magic, fire, cold, poison and disease" },
      ]}
      bind:value={hitType}
    />
    {#key hitType}
      <Formula calculation={avoidanceCalculation(hitType === "physical")} />
    {/key}
    <!-- Source: server-scripts/Combat.cs:blockChance,GetProbResistMeleeDamage,GetProbResistMagic — the roll reads the target's Block Chance or matching resist, so a player's own hits face the monster's values. -->
    <p>
      Your hits roll against the monster's Block Chance and resists, listed on
      its page.
    </p>
    <!-- Source: server-scripts/Combat.cs:708-729 — the from-behind and moving-player adjustments apply after the 0–90% bounds. -->
    <p>
      <a href="#combat-advantage">Combat Advantage</a> then lowers the chance for
      attacks from behind and for hits on a moving player.
    </p>
    <!-- Source: server-scripts/Combat.cs:587-591 — returning-home monsters evade incoming hits. -->
    <p>A monster returning home after a chase avoids every hit.</p>
    <SeeAlso
      links={[
        {
          href: "/mechanics/monster-spawns#leashing",
          label: "Chase limits and resets",
        },
      ]}
    />
  </Topic>

  <Topic id="mitigation">
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — stat reduction is clamped to 0–90% before prevented damage rounds up. -->
    <p>
      Armor Class reduces physical damage by {DEFENSE_RATES.reductionPerPoint} per
      point, and each resist does the same for its damage type. 400 Fire Resist cuts
      fire damage by {reduction(400)}, and 499 cuts it by {reduction(499)}. The
      reduction stops at {DEFENSE_RATES.maxReduction}, which takes
      {DEFENSE_RATES.pointsForMaxReduction} points.
    </p>
    <VariantPicker
      label="Your stat"
      options={DEFENSE_STATS.map((stat) => ({
        value: stat.input.key,
        label: stat.input.label,
      }))}
      bind:value={defenseStatKey}
    />
    {#key defenseStatKey}
      <Formula
        calculation={mitigationCalculation(defenseStat.input, defenseStat.id)}
      />
    {/key}
    <SeeAlso
      links={[
        {
          href: "#avoidance",
          label: "Block, Miss and Resist, for the chance to avoid the hit",
        },
      ]}
    />
  </Topic>

  <Topic id="ward-and-mana-shield">
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — Ward absorbs first; Mana Shield spends Mana one-for-one and removes its buff when damage exceeds remaining Mana. -->
    <!-- Source: server-scripts/Skills.cs:ApplyWardToDoTDamage — ApplyWardToDoTDamage takes tick damage from the ward pool and passes the excess. -->
    <p>
      Damage that gets past avoidance and reduction is absorbed by a ward first,
      then by Mana Shield. Only the rest reduces Hit Points.
    </p>
    <ul>
      <li>
        A ward absorbs hits and damage-over-time ticks until its pool is empty.
        Damage beyond what is left passes through.
      </li>
      <li>
        <a href="/skills/mana_shield">Mana Shield</a> spends 1 Mana per point of the
        remaining hit. When the hit is larger than your Mana, the shield ends and
        the rest reaches your Hit Points. Ticks pass through Mana Shield.
      </li>
    </ul>
    <SeeAlso
      links={[
        { href: "#buffs", label: "Buff Strength for ward capacity" },
        { href: "#damage-pipeline", label: "Damage steps" },
      ]}
    />
  </Topic>

  <Topic id="damage-shields">
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — non-spell TargetDamageSkill with base cast range below 1.5 triggers damage shields, except weapon procs and scrolls; each shield mitigates separately, then the summed whole-number damage varies within a rounded-up 10% limit. -->
    <p>
      Your damage shields hurt attackers who hit you with a non-spell,
      single-target skill whose base range is below 1.5 yd. Weapon on-hit
      effects and scrolls do not trigger them.
    </p>
    <ul>
      <li>
        The attacker's Armor Class or resist reduces each shield's damage, as in <a
          href="#mitigation">Damage Reduction</a
        >. Shields without a damage type deal full damage.
      </li>
      <li>
        The shields' combined damage varies randomly by up to 10% either way.
        The variation limit rounds up: a 95-damage total deals 85 to 105.
      </li>
      <!-- Source: server-scripts/Combat.cs:DealDamageAt; Skills.cs:ApplyWardToDoTDamage — Mana Shield absorbs direct hits after Ward and ends only when remaining damage exceeds current Mana; ticks and Damage Shield bypass it. -->
      <li>Damage shield damage passes through Mana Shield.</li>
    </ul>
  </Topic>
</Chapter>
