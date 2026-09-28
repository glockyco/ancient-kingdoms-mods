<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Alert } from "$lib/components/ui/alert";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MercenaryNav from "$lib/components/MercenaryNav.svelte";
  import NumberField from "$lib/components/NumberField.svelte";
  import PetSkillsTable from "$lib/components/PetSkillsTable.svelte";
  import RecruiterTable from "$lib/components/RecruiterTable.svelte";
  import Seo from "$lib/components/Seo.svelte";
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
  } from "$lib/utils/merc-stats";
  import {
    OWNER_LIMITS,
    mercenaryOwner,
    restoreMercenaryOwner,
    setMercenaryOwner,
  } from "$lib/utils/mercenary-owner.svelte";
  import { linearAt, requireLinearValue } from "$lib/utils/linear-value";
  import { formatEquipmentCategory } from "$lib/utils/format";
  import { petHref } from "$lib/utils/pets";
  import { onMount } from "svelte";
  import Info from "@lucide/svelte/icons/info";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Music from "@lucide/svelte/icons/music";
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

  onMount(restoreMercenaryOwner);

  const cls = $derived(pet.type_monster);
  const classDef = $derived(CLASSES[cls]);
  const level = $derived(mercenaryOwner.level);
  const veteran = $derived(mercenaryOwner.veteran);
  const discount = $derived(charismaDiscount(mercenaryOwner.charisma));

  const fmt = (n: number) => n.toLocaleString("en-US");
  const range = ([lo, hi]: [number, number]) =>
    lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`;

  const ATTRIBUTE_NAMES: Record<string, string> = {
    STR: "Strength",
    DEX: "Dexterity",
    CON: "Constitution",
    INT: "Intelligence",
    WIS: "Wisdom",
    CHA: "Charisma",
  };

  // Source: server-scripts/Player.cs:UpdateMercStatsByLevel — each attribute gains 1 at every multiple of its class interval.
  const growth = $derived(
    Object.entries(classDef.div)
      .map(([key, every]) => ({
        name: ATTRIBUTE_NAMES[key],
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
      names: string[];
      base: number;
      per_level: number;
    }[] = [];
    for (const r of pet.profile.resistances) {
      const same = groups.find(
        (g) => g.base === r.base && g.per_level === r.per_level,
      );
      if (same) same.names.push(r.name);
      else
        groups.push({ names: [r.name], base: r.base, per_level: r.per_level });
    }
    return groups.map((g) => ({
      label:
        g.names.length === pet.profile.resistances.length
          ? "Each resistance"
          : `${g.names.join(", ")} resistance`,
      per_level: g.per_level,
      atLevel: g.base + g.per_level * (level - 1),
    }));
  });

  const preferredRaces = $derived(
    pet.recruiters.map((r) => r.preferred_race).filter((r) => r !== ""),
  );
  const races = $derived(obtainableRaces(cls, preferredRaces));

  /** Stat ranges at the owner's values, over every race a recruiter can hire. */
  const stats = $derived(
    classStatSpan(cls, level, veteran, pet.profile.curves, races),
  );

  const topRank = $derived(Math.max(...pet.skills.map((s) => s.max_level)));
  const skillRank = $derived(mercenarySkillRank(cls, level, veteran, topRank));

  const resourceName = $derived(mercenaryResource(cls));
  const resourceClass = $derived(
    cls === "Bard"
      ? "text-foreground"
      : classDef.role === "energy"
        ? "text-stat-atk"
        : "text-stat-mana",
  );
  const veteranBonus = $derived(
    (Math.round(veteran * VET_MULT_PER_POINT * 10000) / 100).toString(),
  );

  // Source: mods/DataExporter/Exporters/PetExporter.cs — the only innate mercenary skill is GameManager.invulWarriorSkill, which Combat applies on a lethal hit.
  const deathSave = $derived(pet.skills.find((s) => s.is_innate) ?? null);
  const deathSaveInfo = $derived.by(() => {
    if (!deathSave) return null;
    const at = (veteranLevel: number) => {
      const rank = deathSaveRank(veteranLevel);
      // Source: server-scripts/Combat.cs:1161-1165, LinearInt.cs:Get, LinearFloat.cs:Get, BuffSkill.cs:buffTime — the Rage cost is energyCosts.Get(rank) and the buff lasts buffTime.Get(rank).
      return {
        rage: linearAt(
          requireLinearValue(
            deathSave.energy_cost,
            `${deathSave.id} energy_cost`,
          ),
          rank,
        ),
        seconds:
          Math.round(
            linearAt(
              {
                base_value: deathSave.duration_base,
                bonus_per_level: deathSave.duration_per_level,
              },
              rank,
            ) * 100,
          ) / 100,
      };
    };
    return {
      now: at(veteran),
      low: at(0),
      high: at(MAX_VETERAN),
      // Source: server-scripts/Combat.cs:1165 — the cooldown is cooldown.baseValue at every rank.
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
  title={`${pet.name} - Ancient Kingdoms`}
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
          label="Veteran level"
          value={veteran}
          min={OWNER_LIMITS.veteran[0]}
          max={OWNER_LIMITS.veteran[1]}
          compact
          onchange={(v) => setMercenaryOwner("veteran", v)}
        />
        <NumberField
          label="Charisma"
          hint={discount > 0
            ? `−${Math.round(discount * 100)}% prices`
            : "no discount"}
          value={mercenaryOwner.charisma}
          min={OWNER_LIMITS.charisma[0]}
          max={OWNER_LIMITS.charisma[1]}
          compact
          onchange={(v) => setMercenaryOwner("charisma", v)}
        />
      </Card.Content>
    </Card.Root>
  </section>

  <section aria-labelledby="at-level-title">
    <h2
      id="at-level-title"
      class="mb-4 text-xl font-semibold flex items-center gap-2"
    >
      <TrendingUp class="h-5 w-5 text-emerald-500" />
      At level {level}, veteran level {veteran}
    </h2>
    <Card.Root class="bg-muted/30">
      <Card.Content class="space-y-4">
        <!-- Source: server-scripts/Player.cs:10337-10365, Constitution.cs:13-15 — Health and Mana come from the class curve, the hire roll, veteran points, and attributes. -->
        <dl class="grid grid-cols-2 gap-3 md:grid-cols-4">
          {#if stats.health}{@render stat("Health", range(stats.health))}{/if}
          {#if stats.mana}{@render stat("Mana", range(stats.mana))}{/if}
          {#if stats.attack}{@render stat(
              "Attack Power",
              range(stats.attack),
            )}{/if}
          {#if stats.spell}{@render stat(
              "Spell Power",
              range(stats.spell),
            )}{/if}
          {@render stat(
            "Skill rank",
            String(skillRank),
            "Each skill stops at its own maximum rank.",
          )}
          {@render stat(
            "Active mercenaries",
            String(activeMercenaryLimit(level)),
            `Up to ${MAX_HIRED} hired`,
          )}
          {@render stat(
            "Hire price",
            `${fmt(hirePrice(level, veteran, discount))} gold`,
          )}
          {@render stat(
            "Resurrection fee",
            `${fmt(resurrectionPrice(level, veteran, discount))} gold`,
          )}
        </dl>
        <p class="text-sm text-muted-foreground">
          Stat ranges do not include gear. They cover every race a recruiter can
          hire and every hire roll.
          <a
            href="/mechanics/mercenary-stats"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Compare the races</a
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
        <!-- Source: exported-data/pets.json — each resistance grows linearly with level. -->
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
                  >+1 every {g.every} levels</td
                >
                <td class="py-2 pr-4 text-right font-medium tabular-nums"
                  >+{g.atLevel}</td
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
        <!-- Source: exported-data/pets.json — each resistance is base + per_level × (level − 1). -->
        {#each resistanceRows as r (r.label)}
          <p class="text-sm">
            {r.label}: <span class="font-medium tabular-nums">{r.atLevel}</span>
            at level {level}, +{r.per_level} every level.
          </p>
        {/each}

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 class="text-sm font-semibold">Skill rank</h3>
            <!-- Source: server-scripts/PetSkills.cs:25-45 — mercenary ranks use owner level and veteran points, cap at each skill's max, and have a minimum of 1 for Bards. -->
            <p class="mt-1 font-mono text-sm">
              ⌊level ÷ 5⌋ + ⌊veteran level ÷ 10⌋
            </p>
            <p class="mt-1 text-sm text-muted-foreground">
              {#if cls === "Bard"}Bard skills have a minimum rank of 1.{/if}
              Each skill stops at its max rank.
            </p>
          </div>
          <div>
            <h3 class="text-sm font-semibold">Veteran levels</h3>
            <!-- Source: server-scripts/Player.cs:4627-4652,10352-10365; Health.cs:28-41; Mana.cs:28-41; Energy.cs:27-39; BardMercenarySkills.cs:60-69 — veteran points raise maximum Health and usable Mana but not maximum Rage or the Bard song limit. -->
            <p class="mt-1 text-sm">
              Each veteran level adds 0.25% of base Health to maximum Health{#if classDef.role === "mana" && cls !== "Bard"}
                and 0.25% of base Mana to maximum Mana{/if}, before rounding.
            </p>
            <p class="mt-1 text-sm text-muted-foreground">
              At veteran level {veteran}, the bonus is +{veteranBonus}% of base
              Health{#if classDef.role === "mana" && cls !== "Bard"}
                and +{veteranBonus}% of base Mana{/if}.
            </p>
            {#if classDef.role === "energy"}
              <p class="mt-1 text-sm text-muted-foreground">
                Maximum Rage does not increase from veteran levels.
              </p>
            {:else if cls === "Bard"}
              <p class="mt-1 text-sm text-muted-foreground">
                A Bard's active-song limit does not rise with veteran levels.
              </p>
            {/if}
          </div>
        </div>

        <Alert variant="info">
          <Info />
          <div>
            <!-- Source: server-scripts/Player.cs:4627-4652,10077-10122,10337-10365; Database.cs:1900-1921 — veteran damage is not saved, and a zero hire roll triggers separate random damage rolls on every summon. -->
            <p class="font-medium">
              Veteran damage bonus disappears after summoning again
            </p>
            <p>
              A veteran level gained while the mercenary is summoned adds +1
              physical damage and +1 magic damage.
            </p>
            <p>
              The game does not save this bonus. The next summon restores a
              positive hire roll for both damage values.
            </p>
            <p>
              If the saved hire roll is 0, the game rolls physical and magic
              damage separately on every summon.
            </p>
          </div>
        </Alert>
      </Card.Content>
    </Card.Root>
  </section>

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
            The Bard mercenary starts its songs automatically, one at a time,
            and keeps each song active.
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
              In combat it uses {cadence.name} when it can, then
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
          <!-- Source: server-scripts/Combat.cs:1350-1361,1157-1180 — a lethal hit on a Warrior or Rogue mercenary applies GameManager.invulWarriorSkill when the owner is level 50+, the cooldown has elapsed, and the mercenary has enough Rage. -->
          <p>
            From level {DEATH_SAVE_MIN_LEVEL}, a lethal hit triggers
            <a
              href="/skills/{deathSave.id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >{deathSave.name}</a
            >
            if its cooldown has ended and the mercenary has enough Rage. The skill
            makes it invulnerable to attacks for {deathSaveInfo.now.seconds} seconds.
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
            {@render stat("Invulnerable for", `${deathSaveInfo.now.seconds} s`)}
            {@render stat("Rage cost", fmt(deathSaveInfo.now.rage))}
            {@render stat("Cooldown", `${fmt(deathSaveInfo.cooldown)} s`)}
          </dl>
          <p class="text-muted-foreground">
            Duration and Rage cost rise with your veteran level, from {deathSaveInfo
              .low.seconds} s for {deathSaveInfo.low.rage} Rage at veteran level 0
            to {deathSaveInfo.high.seconds} s for {deathSaveInfo.high.rage} Rage at
            veteran level {MAX_VETERAN}.
          </p>
          <p class="text-muted-foreground">
            Without enough Rage, the hit kills the mercenary.
          </p>
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
        <!-- Source: exported-data/equipment_slots.json — the mercenary prefab's MercenaryEquipment.slotInfo. -->
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
        <!-- Source: server-scripts/EquipmentItem.cs:CanEquipMercenary,CanClassUse — the item must allow the mercenary's class, and the owner must meet its level. -->
        <ul class="list-disc space-y-1 pl-5">
          <li>
            Only
            <a
              href="/classes/{pet.classLink.class_id}#equipment"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >{cls} gear</a
            > meets this mercenary's class restriction.
          </li>
          <li>Your level must meet the item's level requirement.</li>
          {#if slot13?.accepted_category === "Shield" || slot13?.accepted_category === "Instrument"}
            <!-- Source: server-scripts/EquipmentItem.cs:CanEquipMercenary — WeaponSword2H and WeaponWand2H block the off-hand shield or instrument; the export has no 2H wand. -->
            <li>
              You cannot equip a 2H Weapon with {slot13.accepted_category ===
              "Instrument"
                ? "an instrument"
                : "a shield"} in the off-hand.
            </li>
          {/if}
          <!-- Source: server-scripts/Pet.cs:OnDeath, Combat.cs:739-755 — hits lower gear durability; death does not. -->
          <li>
            Gear stays on the mercenary when it dies, and death does not lower
            durability.
          </li>
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
        Recruited At
      </h2>
      <!-- Source: server-scripts/Npc.cs:1893-1904 — recruiters serve players from level 10. -->
      <p class="mb-3 text-sm text-muted-foreground">
        Every recruiter hires every mercenary class, from level 10.
        <a
          href="/mercenaries#how-it-works"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >How mercenaries work</a
        > covers stance, party limits, death, and resurrection.
      </p>
      <RecruiterTable
        recruiters={pet.recruiters}
        {cls}
        urlKey="pet-{pet.id}-recruited-at"
      />
    </section>
  {/if}
</div>
