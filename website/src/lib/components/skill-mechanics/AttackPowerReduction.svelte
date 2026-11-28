<!-- Source: server-scripts/Combat.cs:damage — Attack Power debuffs such as Gouge scale the target's Attack Power. -->
<!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage — a skill adds its listed damage to that Attack Power afterwards, so the debuff never reduces the added damage. -->
<script lang="ts">
  import { iround, multiplyF32 } from "$lib/calculation/unity-math";
  import { formatNumber as number } from "$lib/utils/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill, attackPowerExample: example } = $derived(mechanics);

  const rank = $derived(skill.max_level);
  const reduction = $derived(
    -(
      (skill.damage_percent_bonus?.base_value ?? 0) +
      (skill.damage_percent_bonus?.bonus_per_level ?? 0) * (rank - 1)
    ),
  );
  const lowersSpellPower = $derived(
    (skill.magic_damage_percent_bonus?.base_value ?? 0) < 0,
  );
  const stats = $derived(
    lowersSpellPower ? "Attack Power and Spell Power" : "Attack Power",
  );

  // Source: server-scripts/Combat.cs:damage — Attack Power + RoundToInt(Attack Power × the debuff's negative percentage).
  const attackPower = $derived(example?.monster.attackPower ?? 0);
  const reduced = $derived(
    attackPower + iround(multiplyF32(attackPower, -reduction)),
  );
  const removed = $derived(attackPower - reduced);
  const scale = $derived(
    attackPower + Math.max(0, ...(example?.hits ?? []).map((hit) => hit.added)),
  );
  const width = (value: number) => `${(value / scale) * 100}%`;
  const percentOf = (part: number, whole: number) =>
    `${Math.round((part / whole) * 1000) / 10}%`;
  const link = "text-blue-600 dark:text-blue-400 hover:underline";
</script>

{#snippet hitBar(label: string, added: number, lowered: boolean)}
  {@const ap = lowered ? reduced : attackPower}
  <div class="space-y-1">
    <div class="flex items-baseline justify-between gap-3 text-sm">
      <span class="text-muted-foreground">{label}</span>
      <span class="font-semibold tabular-nums text-foreground"
        >{number(ap + added)}</span
      >
    </div>
    <div class="flex h-5 overflow-hidden rounded bg-muted/40">
      <div class="h-full bg-orange-500/80" style:width={width(ap)}></div>
      {#if lowered}
        <div
          class="h-full border border-dashed border-orange-500/70"
          style:width={width(removed)}
        ></div>
      {/if}
      <div class="h-full bg-sky-500/80" style:width={width(added)}></div>
    </div>
  </div>
{/snippet}

<div class="space-y-3">
  <h3 class="font-semibold">{stats} Reduction</h3>
  <p class="text-muted-foreground">
    {skill.name} lowers only the target's {stats}. Damage a skill adds on top
    stays the same.
  </p>

  {#if example}
    <div class="space-y-4 rounded-md border bg-muted/20 p-3">
      {#each example.hits as hit (hit.skillId)}
        <div class="space-y-2">
          <p class="flex items-baseline justify-between gap-3 text-sm">
            <span class="font-medium"
              >{#if hit.defaultAttack}Auto attack{:else}<a
                  class={link}
                  href="/skills/{hit.skillId}">{hit.name}</a
                >{/if}:
              <span class="whitespace-nowrap"
                >Attack Power + {number(hit.added)}</span
              ></span
            >
            <span class="font-semibold tabular-nums"
              >−{percentOf(removed, attackPower + hit.added)}</span
            >
          </p>
          {@render hitBar("Without " + skill.name, hit.added, false)}
          {@render hitBar(
            "With rank " + rank + " " + skill.name,
            hit.added,
            true,
          )}
        </div>
      {/each}
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span class="inline-flex items-center gap-1.5"
          ><span class="size-2.5 rounded-sm bg-orange-500/80"></span><span
            ><a class={link} href="/monsters/{example.monster.id}"
              >{example.monster.name}</a
            >'s {number(attackPower)} Attack Power</span
          ></span
        >
        <span class="inline-flex items-center gap-1.5"
          ><span class="size-2.5 rounded-sm bg-sky-500/80"></span>Damage the
          skill adds</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><span
            class="size-2.5 rounded-sm border border-dashed border-orange-500/70"
          ></span>Removed by rank {rank}
          {skill.name}</span
        >
      </div>
    </div>
  {/if}
</div>
