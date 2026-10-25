<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Alert } from "$lib/components/ui/alert";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MercenaryNav from "$lib/components/MercenaryNav.svelte";
  import NumberField from "$lib/components/NumberField.svelte";
  import PetSkillsTable from "$lib/components/PetSkillsTable.svelte";
  import RecruiterTable from "$lib/components/RecruiterTable.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { detailTitle } from "$lib/seo/title";
  import { formatSeconds } from "$lib/calculation/format";
  import { formatPercent, formatNumber } from "$lib/utils/format";
  import { statName, formatStat } from "$lib/stats";
  import type { StatId } from "$lib/generated/stat-vocabulary";
  import { iround, multiplyF32 } from "$lib/calculation/unity-math";
  import { TOTAL_VETERAN_POINTS_NOTE } from "$lib/calculation/inputs";
  import type { ClassSkill } from "$lib/queries/classes.server";
  import type { MercenaryDetailView, MercenaryLink } from "$lib/types/pets";
  import {
    CLASSES,
    DEATH_SAVE_MIN_LEVEL,
    MAX_HIRED,
    MAX_VETERAN,
    VET_MULT_PER_POINT,
    activeMercenaryLimit,
    charismaDiscount,
    classStatSpan,
    deathSaveRank,
    hirePrice,
    mercenaryResource,
    mercenarySkillRank,
    obtainableRaces,
    resurrectionPrice,
    MERCENARY_COMPANION_SPELL_POWER_SHARE,
    MERCENARY_REAPER_OWNER_LEVEL,
  } from "$lib/utils/merc-stats";
  import {
    OWNER_LIMITS,
    mercenaryOwner,
    setMercenaryOwner,
  } from "$lib/utils/mercenary-owner.svelte";
  import { loadRemembered } from "$lib/calculation/remembered.svelte";
  import { linearAt, requireLinearValue } from "$lib/utils/linear-value";
  import { formatEquipmentCategory } from "$lib/utils/format";
  import { petHref } from "$lib/utils/pets";
  import { onMount } from "svelte";
  import Info from "@lucide/svelte/icons/info";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Music from "@lucide/svelte/icons/music";
  import PawPrint from "@lucide/svelte/icons/paw-print";
  import Shield from "@lucide/svelte/icons/shield";
  import ShieldPlus from "@lucide/svelte/icons/shield-plus";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import User from "@lucide/svelte/icons/user";
  import Zap from "@lucide/svelte/icons/zap";

  let {
    pet,
    description,
    links,
  }: {
    pet: MercenaryDetailView;
    description: string;
    links: MercenaryLink[];
  } = $props();

  onMount(loadRemembered);

  const cls = $derived(pet.type_monster);
  const classDef = $derived(CLASSES[cls]);
  const veteranRaisesMana = $derived(
    classDef.role === "mana" && cls !== "Bard",
  );
  const level = $derived(mercenaryOwner.level);
  const veteran = $derived(mercenaryOwner.veteran);
  const discount = $derived(charismaDiscount(mercenaryOwner.charisma));

  const range = (id: StatId, [lo, hi]: [number, number]) =>
    lo === hi
      ? formatStat(id, lo)
      : `${formatStat(id, lo)}–${formatStat(id, hi)}`;

  const ATTRIBUTES: Record<string, StatId> = {
    STR: "strength",
    DEX: "dexterity",
    CON: "constitution",
    INT: "intelligence",
    WIS: "wisdom",
    CHA: "charisma",
  };

  // Source: server-scripts/Player.cs:UpdateMercStatsByLevel — each attribute gains 1 at every multiple of its class interval.
  const growth = $derived(
    Object.entries(classDef.div)
      .map(([key, every]) => ({
        id: ATTRIBUTES[key],
        name: statName(ATTRIBUTES[key]),
        every,
        atLevel: Math.floor(level / every),
        atMax: Math.floor(50 / every),
      }))
      .sort((a, b) => a.every - b.every || a.name.localeCompare(b.name)),
  );
  const growthMax = $derived(Math.max(...growth.map((g) => g.atMax)));

  /** Resistances with the same curve share one row. */
  const resistanceRows = $derived.by(() => {
    const groups: {
      ids: StatId[];
      base: number;
      per_level: number;
    }[] = [];
    for (const r of pet.profile.resistances) {
      const same = groups.find(
        (g) => g.base === r.base && g.per_level === r.per_level,
      );
      if (same) same.ids.push(r.id);
      else groups.push({ ids: [r.id], base: r.base, per_level: r.per_level });
    }
    return groups.map((g) => ({
      id: g.ids[0],
      label:
        g.ids.length === pet.profile.resistances.length
          ? "Each base resistance"
          : `${g.ids.map((id) => statName(id)).join(", ")} base resistance`,
      per_level: g.per_level,
      atLevel: g.base + g.per_level * (level - 1),
    }));
  });

  const preferredRaces = $derived(
    pet.recruiters.map((r) => r.preferred_race).filter((r) => r !== ""),
  );
  const races = $derived(obtainableRaces(cls, preferredRaces));

  /** Stat ranges at the player's values, over every race a recruiter can hire. */
  const stats = $derived(
    classStatSpan(cls, level, veteran, pet.profile.curves, races),
  );

  const topRank = $derived(Math.max(...pet.skills.map((s) => s.max_level)));
  const skillRank = $derived(mercenarySkillRank(cls, level, veteran, topRank));

  const resourceName = $derived.by(() => {
    const resource = mercenaryResource(cls);
    return resource === "Songs" ? resource : statName(resource);
  });
  const resourceClass = $derived(
    cls === "Bard"
      ? "text-foreground"
      : classDef.role === "energy"
        ? "text-stat-atk"
        : "text-stat-mana",
  );
  // Source: server-scripts/Player.cs:UpdateMercStatsByLevel,11034-11049 — the veteran percentage multiplies the class's current base-resource curve before the pool is rounded.
  const veteranPools = $derived.by(() => {
    const curve = pet.profile.curves[classDef.type];
    const bonus = multiplyF32(veteran, VET_MULT_PER_POINT);
    return {
      health: iround(
        multiplyF32(curve.hp_base + curve.hp_per * (level - 1), bonus),
      ),
      mana: iround(
        multiplyF32(curve.mana_base + curve.mana_per * (level - 1), bonus),
      ),
    };
  });

  // Source: mods/DataExporter/Exporters/PetExporter.cs — the only innate mercenary skill is GameManager.invulWarriorSkill, which Combat applies on a lethal hit.
  const deathSave = $derived(pet.skills.find((s) => s.is_innate) ?? null);
  const deathSaveInfo = $derived.by(() => {
    if (!deathSave) return null;
    const at = (totalVeteranPoints: number) => {
      const rank = deathSaveRank(totalVeteranPoints);
      // Source: server-scripts/Combat.cs:1404-1410, LinearInt.cs:Get, LinearFloat.cs:Get, BuffSkill.cs:buffTime — the Rage cost is energyCosts.Get(rank) and the buff lasts buffTime.Get(rank).
      return {
        rage: linearAt(
          requireLinearValue(
            deathSave.energy_cost,
            `${deathSave.id} energy_cost`,
          ),
          rank,
        ),
        seconds: linearAt(
          {
            base_value: deathSave.duration_base,
            bonus_per_level: deathSave.duration_per_level,
          },
          rank,
        ),
      };
    };
    return {
      now: at(veteran),
      low: at(0),
      high: at(MAX_VETERAN),
      // Source: server-scripts/Combat.cs:1408 — the cooldown is cooldown.baseValue at every rank.
      cooldown: requireLinearValue(
        deathSave.cooldown,
        `${deathSave.id} cooldown`,
      ).base_value,
    };
  });

  // Source: server-scripts/BardMercenarySkills.cs:OnStartServer,LateUpdate — the travel song plays out of combat; the other songs play in combat, the focus song from level 40.
  const SONG_ROLES = [
    { id: "mercenary_wayfarers_rhythm", when: "Out of combat", from: 1 },
    { id: "mercenary_grand_symphony", when: "In combat", from: 1 },
    { id: "mercenary_march_of_celerity", when: "In combat", from: 1 },
    { id: "mercenary_anthem_of_focus", when: "In combat", from: 40 },
  ] as const;
  function skillById(id: string): ClassSkill {
    const skill = pet.skills.find((s) => s.id === id);
    if (!skill) throw new Error(`${pet.id} lacks the skill ${id}`);
    return skill;
  }

  /**
   * A slot accepts every item category that starts with its own category, so
   * the "Weapon" slot takes every weapon type.
   * Source: server-scripts/EquipmentItem.cs:CanEquipMercenary
   */
  const slotName = (category: string) =>
    category === "Weapon" ? "Any weapon" : formatEquipmentCategory(category);

  const mainHand = $derived.by(() => {
    const slot = pet.profile.equipmentSlots.find((s) => s.slot_index === 12);
    if (!slot) throw new Error(`${pet.id} has no main-hand slot`);
    return slot;
  });
  const slot13 = $derived(
    pet.profile.equipmentSlots.find((s) => s.slot_index === 13),
  );
  /** Armor and jewelry slots, with repeated categories counted once. */
  const slotGroups = $derived.by(() => {
    const groups: { category: string; count: number }[] = [];
    for (const s of pet.profile.equipmentSlots) {
      if (s.slot_index === 12 || s.slot_index === 13) continue;
      const group = groups.find((g) => g.category === s.accepted_category);
      if (group) group.count++;
      else groups.push({ category: s.accepted_category, count: 1 });
    }
    return groups;
  });
</script>

{#snippet stat(label: string, value: string, note: string = "")}
  <div class="rounded-md border bg-background/40 p-3">
    <dt class="text-sm text-muted-foreground">{label}</dt>
    <dd class="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    {#if note}<dd class="text-sm text-muted-foreground">{note}</dd>{/if}
  </div>
{/snippet}

<Seo
  title={detailTitle(pet.name, { family: "Mercenary" })}
  {description}
  path={petHref(pet.id, true)}
/>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mercenaries", href: "/mercenaries" },
      { label: pet.name },
    ]}
  />

  <MercenaryNav mercenaries={links} current={pet.id} />

  <header class="space-y-3">
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-bold">{pet.name}</h1>
      <span
        class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
        >Mercenary</span
      >
    </div>
    <dl class="flex flex-wrap gap-x-6 gap-y-1 text-sm">
      <div class="flex gap-1.5">
        <dt class="text-muted-foreground">Class</dt>
        <dd>
          <a
            href="/classes/{pet.classLink.class_id}"
            class="text-blue-600 dark:text-blue-400 hover:underline">{cls}</a
          >
        </dd>
      </div>
      <div class="flex gap-1.5">
        <dt class="text-muted-foreground">Resource</dt>
        <dd class="font-medium {resourceClass}">{resourceName}</dd>
      </div>
      <div class="flex gap-1.5">
        <dt class="text-muted-foreground">Races</dt>
        <dd>
          {races.join(" · ")}
          <a
            href="/mechanics/mercenary-stats"
            class="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
            >Race odds and stat ranges</a
          >
        </dd>
      </div>
    </dl>
  </header>

  <section aria-labelledby="owner-title">
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title id="owner-title" class="flex items-center gap-2 text-base">
          <User class="h-4 w-4 text-muted-foreground" />
          Your character
        </Card.Title>
      </Card.Header>
      <Card.Content class="grid gap-6 sm:grid-cols-3">
        <NumberField
          label="Level"
          value={level}
          min={OWNER_LIMITS.level[0]}
          max={OWNER_LIMITS.level[1]}
          compact
          onchange={(v) => setMercenaryOwner("level", v)}
        />
        <NumberField
          label="Total veteran points"
          value={veteran}
          min={OWNER_LIMITS.veteran[0]}
          max={OWNER_LIMITS.veteran[1]}
          compact
          onchange={(v) => setMercenaryOwner("veteran", v)}
        />
        <NumberField
          label={statName("charisma")}
          hint={discount > 0
            ? `−${formatPercent(discount, { decimals: 2, preserveNonzero: true })} prices`
            : "no discount"}
          value={mercenaryOwner.charisma}
          min={OWNER_LIMITS.charisma[0]}
          max={OWNER_LIMITS.charisma[1]}
          compact
          onchange={(v) => setMercenaryOwner("charisma", v)}
        />
        <p class="text-sm text-muted-foreground sm:col-span-3">
          {TOTAL_VETERAN_POINTS_NOTE}
        </p>
      </Card.Content>
    </Card.Root>
  </section>

  <section aria-labelledby="at-level-title">
    <h2
      id="at-level-title"
      class="mb-4 text-xl font-semibold flex items-center gap-2"
    >
      <TrendingUp class="h-5 w-5 text-emerald-500" />
      At level {level}, with {veteran} total veteran points
    </h2>
    <Card.Root class="bg-muted/30">
      <Card.Content class="space-y-4">
        <!-- Source: server-scripts/Player.cs:11019-11049, Constitution.cs:13-15 — Health and Mana come from the class curve, the hire roll, veteran points, and attributes. -->
        <dl class="grid grid-cols-2 gap-3 md:grid-cols-4">
          {#if stats.health}{@render stat(
              "Maximum Hit Points",
              range("health", stats.health),
            )}{/if}
          {#if stats.mana}{@render stat(
              "Maximum Mana",
              range("mana", stats.mana),
            )}{/if}
          {#if stats.attack}{@render stat(
              statName("attack_power"),
              range("attack_power", stats.attack),
            )}{/if}
          {#if stats.spell}{@render stat(
              statName("spell_power"),
              range("spell_power", stats.spell),
            )}{/if}
          {@render stat(
            "Skill rank",
            String(skillRank),
            "Each skill stops at its own maximum rank.",
          )}
        </dl>
        <p class="text-sm text-muted-foreground">
          Ranges include all available races and hire bonuses, but not gear.
          <a
            href="/mechanics/mercenary-stats"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Compare the races</a
          >.
        </p>
      </Card.Content>
    </Card.Root>
  </section>
  <section aria-labelledby="shared-rules-title">
    <h2 id="shared-rules-title" class="mb-4 text-xl font-semibold">
      Shared mercenary rules
    </h2>
    <Card.Root class="bg-muted/30">
      <Card.Content class="space-y-4">
        <dl class="grid gap-3 sm:grid-cols-3">
          {@render stat(
            "Active mercenaries",
            String(activeMercenaryLimit(level)),
            `Up to ${MAX_HIRED} hired`,
          )}
          {@render stat(
            "Hire price",
            `${formatNumber(hirePrice(level, veteran, discount))} gold`,
          )}
          {@render stat(
            "Resurrection fee",
            `${formatNumber(resurrectionPrice(level, veteran, discount))} gold`,
          )}
        </dl>
        <p class="text-sm text-muted-foreground">
          These limits and prices apply to every class.
          <a
            href="/mercenaries#how-it-works"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Hiring, orders, and resurrection</a
          >.
        </p>
      </Card.Content>
    </Card.Root>
  </section>

  <section aria-labelledby="growth-title">
    <h2
      id="growth-title"
      class="mb-4 text-xl font-semibold flex items-center gap-2"
    >
      <TrendingUp class="h-5 w-5 text-sky-500" />
      Growth
    </h2>
    <Card.Root class="bg-muted/30">
      <Card.Content class="space-y-6">
        <!-- Source: server-scripts/Player.cs:UpdateMercStatsByLevel — per-class attribute intervals. -->
        <!-- Source: the export's pets.json — each resistance grows linearly with level. -->
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b text-left text-muted-foreground">
              <th class="py-2 pr-4 font-medium">Stat</th>
              <th class="py-2 pr-4 font-medium">Gain</th>
              <th class="py-2 pr-4 text-right font-medium">At level {level}</th>
              <th class="hidden w-1/3 py-2 sm:table-cell"
                ><span class="sr-only">Share of the level 50 value</span></th
              >
            </tr>
          </thead>
          <tbody>
            {#each growth as g (g.name)}
              <tr class="border-b border-border/50">
                <td class="py-2 pr-4">{g.name}</td>
                <td class="py-2 pr-4 text-muted-foreground"
                  >{formatStat(g.id, 1, { signed: true })} every {g.every} levels</td
                >
                <td class="py-2 pr-4 text-right font-medium tabular-nums"
                  >{formatStat(g.id, g.atLevel, { signed: true })}</td
                >
                <td class="hidden py-2 sm:table-cell">
                  <div class="h-1.5 rounded-full bg-muted">
                    <div
                      class="h-1.5 rounded-full bg-sky-500"
                      style={`width:${(g.atLevel / growthMax) * 100}%`}
                    ></div>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <!-- Source: the export's pets.json — each resistance is base + per_level × (level − 1). -->
        {#each resistanceRows as r (r.label)}
          <p class="text-sm">
            {r.label}:
            <span class="font-medium tabular-nums"
              >{formatStat(r.id, r.atLevel)}</span
            >
            at level {level}, {formatStat(r.id, r.per_level, { signed: true })} every
            level.
          </p>
        {/each}
        <!-- Source: server-scripts/Constitution.cs:GetPoisonResistBonus — Constitution adds 0.25 Poison Resist per point, rounded to nearest even. -->
        <p class="text-sm">
          Constitution adds {formatStat(
            "poison_resist",
            iround(multiplyF32(Math.floor(level / classDef.div.CON), 0.25)),
          )}
          Poison Resist to the base value at level {level}, before equipment.
        </p>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 class="text-sm font-semibold">Skill rank</h3>
            <!-- Source: server-scripts/PetSkills.cs:RefreshSkillLevels — mercenary ranks use owner level and veteran points, cap at each skill's max, and have a minimum of 1 for Bards and Necromancers. -->
            <p class="mt-1 text-sm">
              Gains one rank per 5 character levels and per 10 total veteran
              points, up to each skill's maximum.
              <a
                href="/mercenaries#skill-ranks"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >How skill ranks grow</a
              >
            </p>
          </div>
          <div>
            <h3 class="text-sm font-semibold">Veteran resource bonuses</h3>
            <!-- Source: server-scripts/Player.cs:10834-10848,11034-11049; Health.cs:max; Mana.cs:max; Energy.cs:max; BardMercenarySkills.cs:MaximumCombatSongs — veteran points raise maximum Health and usable Mana but not maximum Rage or the Bard song limit. -->
            <p class="mt-1 text-sm">
              Your {veteran} total veteran points add about
              {formatNumber(veteranPools.health)} maximum Hit Points{veteranRaisesMana
                ? ` and ${formatNumber(veteranPools.mana)} maximum Mana`
                : ""} at level {level}.
            </p>
            {#if classDef.role === "energy"}
              <p class="mt-1 text-sm text-muted-foreground">
                Total veteran points do not change maximum Rage.
              </p>
            {:else if cls === "Bard"}
              <p class="mt-1 text-sm text-muted-foreground">
                Veteran points do not increase the Bard's combat-song limit.
              </p>
            {/if}
          </div>
        </div>

        <Alert variant="info">
          <Info />
          <div>
            <p>
              Each total veteran point adds 1 to base Attack Power and Spell
              Power.
              <a
                href="/mercenaries#how-it-works"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Veteran bonuses shared by all mercenaries</a
              >
            </p>
          </div>
        </Alert>
      </Card.Content>
    </Card.Root>
  </section>

  {#if pet.profile.companions.length > 0}
    {@const summon = pet.profile.companions[0]}
    <section aria-labelledby="companion-title">
      <h2
        id="companion-title"
        class="mb-4 text-xl font-semibold flex items-center gap-2"
      >
        <PawPrint class="h-5 w-5 text-violet-500" />
        Companion
      </h2>
      <Card.Root class="bg-muted/30">
        <Card.Content class="space-y-4 text-sm">
          <!-- Source: server-scripts/NecromancerMercenarySummons.cs:NeedsCompanion,SummonCompanion; MercenarySummonSkill.cs:UsesReaper,GetPrefab — the mercenary keeps one companion, chosen by the player's level. -->
          <p>
            The mercenary uses
            <a
              href="/skills/{summon.skill_id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >{summon.skill_name}</a
            >
            to keep one undead companion beside it. Your level decides which one.
          </p>
          <table class="w-full">
            <thead>
              <tr class="border-b text-left text-muted-foreground">
                <th class="py-2 pr-4 font-medium">Companion</th>
                <th class="py-2 font-medium">Your level</th>
              </tr>
            </thead>
            <tbody>
              {#each pet.profile.companions as companion (companion.id)}
                {@const active =
                  companion.form === "reaper"
                    ? level >= MERCENARY_REAPER_OWNER_LEVEL
                    : level < MERCENARY_REAPER_OWNER_LEVEL}
                <tr
                  class="border-b border-border/50 {active
                    ? ''
                    : 'text-muted-foreground'}"
                >
                  <td class="py-2 pr-4">
                    <a
                      href={petHref(companion.id, false)}
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >{companion.name}</a
                    >
                  </td>
                  <td class="py-2 tabular-nums">
                    {companion.form === "reaper"
                      ? `${MERCENARY_REAPER_OWNER_LEVEL} or higher`
                      : `Below ${MERCENARY_REAPER_OWNER_LEVEL}`}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          <!-- Source: server-scripts/NecromancerMercenaryPet.cs:RefreshFromSummoner,GetDamageBonus,GetMagicDamageBonus,GetVeteranResistanceBonus,CanAttack; NecromancerMercenarySummons.cs:LateUpdate — the companion takes the player's level, gains 10% of the mercenary's Spell Power and up to 200 veteran points of bonuses, attacks the mercenary's target, and leaves when either dies. -->
          <ul class="list-disc space-y-1 pl-5">
            <li>
              Its level matches yours. It gains {formatPercent(
                MERCENARY_COMPANION_SPELL_POWER_SHARE,
                { decimals: 0 },
              )} of the mercenary's Spell Power as Attack Power and as Spell Power.
            </li>
            <li>
              Up to 200 of your total veteran points, each point adds 1% of its
              base Attack Power and Spell Power and 0.25% of each base
              resistance.
            </li>
            <li>
              It attacks only the mercenary's target while the companion and
              mercenary are both in aggressive stance.
            </li>
            <li>
              It disappears when the mercenary or you die. When it dies, the
              mercenary must wait the full summon cooldown before summoning
              another.
            </li>
          </ul>
        </Card.Content>
      </Card.Root>
    </section>
  {/if}
  {#if cls === "Bard"}
    {@const cadence = skillById("mercenary_final_cadence")}
    {@const strike = skillById("mercenary_bardic_strike")}
    {@const slash = skillById("mercenary_slash")}
    <section aria-labelledby="songs-title">
      <h2
        id="songs-title"
        class="mb-4 text-xl font-semibold flex items-center gap-2"
      >
        <Music class="h-5 w-5 text-pink-500" />
        Songs
      </h2>
      <Card.Root class="bg-muted/30">
        <Card.Content class="space-y-4 text-sm">
          <p>
            The Bard starts and maintains its songs automatically, with two
            combat songs below level 40 and three from level 40.
          </p>
          <table class="w-full">
            <thead>
              <tr class="border-b text-left text-muted-foreground">
                <th class="py-2 pr-4 font-medium">Song</th>
                <th class="py-2 pr-4 font-medium">Plays</th>
                <th class="py-2 font-medium">From level</th>
              </tr>
            </thead>
            <tbody>
              {#each SONG_ROLES as song (song.id)}
                {@const skill = skillById(song.id)}
                <tr
                  class="border-b border-border/50 {level < song.from
                    ? 'text-muted-foreground'
                    : ''}"
                >
                  <td class="py-2 pr-4">
                    <a
                      href="/skills/{skill.id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >{skill.name}</a
                    >
                  </td>
                  <td class="py-2 pr-4">{song.when}</td>
                  <td class="py-2 tabular-nums">{song.from}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          <!-- Source: server-scripts/BardMercenarySkills.cs:MaximumCombatSongs,CanUseFinalCadence,NextAttackSkill -->
          <ul class="list-disc space-y-1 pl-5">
            <li>
              <a
                href="/skills/{cadence.id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >{cadence.name}</a
              > needs level 50 and every combat song active.
            </li>
            <li>
              Its attack priority is {cadence.name}, then
              <a
                href="/skills/{strike.id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >{strike.name}</a
              >, then
              <a
                href="/skills/{slash.id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >{slash.name}</a
              >.
            </li>
            <li>
              Songs do not use Mana. Polyphony and song duration bonuses do not
              apply.
            </li>
          </ul>
        </Card.Content>
      </Card.Root>
    </section>
  {/if}

  {#if deathSave && deathSaveInfo}
    <section aria-labelledby="death-save-title">
      <h2
        id="death-save-title"
        class="mb-4 text-xl font-semibold flex items-center gap-2"
      >
        <ShieldPlus class="h-5 w-5 text-amber-500" />
        Death save
      </h2>
      <Card.Root class="bg-muted/30">
        <Card.Content class="space-y-4 text-sm">
          <!-- Source: server-scripts/Combat.cs:1256-1267,1402-1423 — a lethal hit on a Warrior or Rogue mercenary applies GameManager.invulWarriorSkill when the player is level 50+, the cooldown has elapsed, and the mercenary has enough Rage. -->
          <p>
            From level {DEATH_SAVE_MIN_LEVEL},
            <a
              href="/skills/{deathSave.id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >{deathSave.name}</a
            >
            saves the mercenary from a lethal hit and briefly makes it invulnerable
            to attacks. It needs enough Rage and must be off cooldown.
          </p>
          {#if level < DEATH_SAVE_MIN_LEVEL}
            <Alert variant="warning">
              <Info />
              <p>
                It works from level {DEATH_SAVE_MIN_LEVEL}. You are level
                {level}.
              </p>
            </Alert>
          {/if}
          <dl class="grid grid-cols-3 gap-3">
            {@render stat(
              "Invulnerable for",
              formatSeconds(deathSaveInfo.now.seconds),
            )}
            {@render stat(
              `${statName("rage")} cost`,
              formatStat("rage", deathSaveInfo.now.rage),
            )}
            {@render stat("Cooldown", formatSeconds(deathSaveInfo.cooldown))}
          </dl>
          <table class="w-full text-left">
            <thead
              ><tr class="border-b"
                ><th class="py-2">Total veteran points</th><th class="py-2"
                  >Duration</th
                ><th class="py-2">Rage cost</th></tr
              ></thead
            >
            <tbody>
              <tr class="border-b"
                ><td class="py-2">0</td><td class="py-2"
                  >{formatSeconds(deathSaveInfo.low.seconds)}</td
                ><td class="py-2"
                  >{formatStat("rage", deathSaveInfo.low.rage)}</td
                ></tr
              >
              <tr class="bg-muted/50"
                ><td class="py-2">{MAX_VETERAN}</td><td class="py-2"
                  >{formatSeconds(deathSaveInfo.high.seconds)}</td
                ><td class="py-2"
                  >{formatStat("rage", deathSaveInfo.high.rage)}</td
                ></tr
              >
            </tbody>
          </table>
        </Card.Content>
      </Card.Root>
    </section>
  {/if}

  <section aria-labelledby="equipment-title">
    <h2
      id="equipment-title"
      class="mb-4 text-xl font-semibold flex items-center gap-2"
    >
      <Shield class="h-5 w-5 text-slate-400" />
      Equipment
    </h2>
    <Card.Root class="bg-muted/30">
      <Card.Content class="space-y-4 text-sm">
        <!-- Source: the export's equipment_slots.json — the mercenary prefab's MercenaryEquipment.slotInfo. -->
        <dl class="grid grid-cols-2 gap-3 md:grid-cols-4">
          {@render stat("Main hand", slotName(mainHand.accepted_category))}
          {#if slot13}{@render stat(
              "Off-hand",
              slotName(slot13.accepted_category),
            )}{/if}
        </dl>
        <p>
          <span class="text-muted-foreground">Other slots:</span>
          {#each slotGroups as g, i (g.category)}{i > 0 ? " · " : ""}{slotName(
              g.category,
            )}{g.count > 1 ? ` ×${g.count}` : ""}{/each}
        </p>
        <!-- Source: server-scripts/EquipmentItem.cs:CanEquipMercenary,CanClassUse — the item must allow the mercenary's class, and the player must meet its level. -->
        <ul class="list-disc space-y-1 pl-5">
          <li>
            <a
              href="/classes/{pet.classLink.class_id}#equipment"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >{cls} gear</a
            > only.
          </li>
          <li>
            <a
              href="/mercenaries#equipment"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Shared equipment rules</a
            >
          </li>
          {#if slot13?.accepted_category === "Shield" || slot13?.accepted_category === "Instrument"}
            <!-- Source: server-scripts/EquipmentItem.cs:CanEquipMercenary — WeaponSword2H and WeaponWand2H block the off-hand shield or instrument; the export has no 2H wand. -->
            <li>
              You cannot equip a 2H Weapon with {slot13.accepted_category ===
              "Instrument"
                ? "an instrument"
                : "a shield"} in the off-hand.
            </li>
          {/if}
        </ul>
      </Card.Content>
    </Card.Root>
  </section>

  {#if pet.skills.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Zap class="h-5 w-5 text-purple-500" />
        Skills ({pet.skills.length})
      </h2>
      <PetSkillsTable skills={pet.skills} urlKey="pet-{pet.id}-skills" />
    </section>
  {/if}

  {#if pet.recruiters.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Recruited at
      </h2>
      <!-- Source: server-scripts/Npc.cs:1908-1919 — recruiters serve players from level 10. -->
      <p class="mb-3 text-sm text-muted-foreground">
        Hire this class at any recruiter from level 10.
        <a
          href="/mercenaries#how-it-works"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Hiring, commands, and resurrection</a
        >
      </p>
      <RecruiterTable
        recruiters={pet.recruiters}
        {cls}
        urlKey="pet-{pet.id}-recruited-at"
      />
    </section>
  {/if}
</div>
