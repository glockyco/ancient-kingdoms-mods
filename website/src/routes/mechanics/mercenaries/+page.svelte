<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { Alert } from "$lib/components/ui/alert";
  import * as Card from "$lib/components/ui/card";
  import {
    CLASSES,
    DEATH_SAVE_MIN_LEVEL,
    MAX_HIRED,
    MAX_PARTY,
    MAX_VETERAN,
    MERC_MIN_LEVEL,
    activeMercenaryLimit,
    deathSaveRank,
    hirePrice,
    resurrectionPrice,
  } from "$lib/utils/merc-stats";
  import { linearAt } from "$lib/utils/linear-value";
  import { petHref } from "$lib/utils/pets";
  import Info from "@lucide/svelte/icons/info";
  import type { MercenaryRulesData } from "./+page.server";

  let { data }: { data: MercenaryRulesData } = $props();

  const SECTIONS = [
    { id: "hiring", label: "Hiring" },
    { id: "active", label: "Active Mercenaries" },
    { id: "growth", label: "Levels and Skills" },
    { id: "veteran", label: "Veteran Levels" },
    { id: "stance", label: "Stance" },
    { id: "death-save", label: "Death Save" },
    { id: "death", label: "Death and Resurrection" },
    { id: "owner-death", label: "When You Die" },
  ];

  const fmt = (n: number) => n.toLocaleString("en-US");
  const link = "text-blue-600 hover:underline dark:text-blue-400";

  const ATTRIBUTES = [
    ["STR", "Strength"],
    ["DEX", "Dexterity"],
    ["CON", "Constitution"],
    ["INT", "Intelligence"],
    ["WIS", "Wisdom"],
    ["CHA", "Charisma"],
  ] as const;

  const LIMIT_STEPS = [10, 20, 30, 40].map((level) => ({
    level,
    until: level === 40 ? "50" : String(level + 9),
    limit: activeMercenaryLimit(level),
  }));

  const mercenaryId = (cls: string) => {
    const merc = data.mercenaries.find((m) => m.type_monster === cls);
    if (!merc) throw new Error(`No ${cls} mercenary exported`);
    return merc.id;
  };

  const deathSaveCost = (veteran: number) =>
    linearAt(data.deathSave.energyCost, deathSaveRank(veteran));
</script>

<Seo
  title="Mercenary Rules - Ancient Kingdoms"
  description="How mercenaries work in Ancient Kingdoms: hiring and prices, active limits, level growth, veteran bonuses, stance, the death save, and every way to resurrect a mercenary."
  path="/mechanics/mercenaries"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Mercenaries" },
    ]}
  />

  <div class="space-y-2">
    <h1 class="text-4xl font-bold">Mercenary Rules</h1>
    <p class="text-muted-foreground">
      These rules apply to every mercenary. Each <a
        href="/mercenaries"
        class={link}>mercenary page</a
      >
      shows the rules for one class.
      <a href="/mechanics/mercenary-stats" class={link}>Mercenary Stat Ranges</a
      >
      compares the stats of each class and race.
    </p>
  </div>

  <PageSections sections={SECTIONS} />

  <Card.Root id="hiring" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Hiring</Card.Title>
      <Card.Description>
        A mercenary recruiter hires every mercenary class.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Npc.cs:1893-1904 — a recruiter opens the mercenary window only at level 10 or higher. -->
      <p>You can hire mercenaries from level {MERC_MIN_LEVEL}.</p>
      <!-- Source: server-scripts/UIMercenaries.cs:380 — the roster holds ten mercenaries. -->
      <p>You can have up to {MAX_HIRED} hired mercenaries at the same time.</p>
      <!-- Source: server-scripts/UIMercenaries.cs:CalculatePriceMercenaryLevel -->
      <p class="font-mono text-foreground">
        price = round(20 + 400 × ((level − 10) ÷ 40)² + 15 × veteran level)
      </p>
      <p>
        The price goes from {fmt(hirePrice(MERC_MIN_LEVEL, 0))} gold at level
        {MERC_MIN_LEVEL} to {fmt(hirePrice(50, MAX_VETERAN))} gold at level 50 with
        veteran level {MAX_VETERAN}.
      </p>
      <!-- Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:17-20, UINpcTrading.cs:824-831 — 0.2% per Charisma point, at most 25%. -->
      <p>
        Charisma lowers the price by 0.2% for each point, up to 25% at 125
        Charisma.
      </p>
      <!-- Source: server-scripts/Utils.cs:GetRandomChar -->
      <p>
        A recruiter that prefers a race hires that race when the class allows
        it. Otherwise, the race is random.
        <a href="/mechanics/mercenary-stats" class={link}
          >See the race odds and stat ranges</a
        >.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="active" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Active Mercenaries</Card.Title>
      <Card.Description>
        Your level sets how many hired mercenaries can fight with you.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/UIMercenaries.cs:297-299, Player.cs:10115-10120,10290-10305 -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Your level</th>
              <th class="py-2 text-left font-medium">Active mercenaries</th>
            </tr>
          </thead>
          <tbody>
            {#each LIMIT_STEPS as step (step.level)}
              <tr class="border-b border-border/50">
                <td class="py-2 pr-4 tabular-nums">{step.level}–{step.until}</td
                >
                <td class="py-2 tabular-nums text-foreground">{step.limit}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p>A party holds at most {MAX_PARTY} members.</p>
      <p>Each active mercenary counts as one member.</p>
      <p>In a full party, you cannot summon a mercenary.</p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="growth" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Levels and Skills</Card.Title>
      <Card.Description>A mercenary always has your level.</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Player.cs:UpdateMercStatsByLevel — each attribute gains 1 at every multiple of its class interval. -->
      <p>
        Each class gains +1 in an attribute every few levels. The table shows
        the interval in levels.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Class</th>
              {#each ATTRIBUTES as [, name] (name)}
                <th class="py-2 pr-4 text-right font-medium">{name}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each Object.values(CLASSES) as c (c.type)}
              <tr class="border-b border-border/50">
                <td class="py-2 pr-4">
                  <a href={petHref(mercenaryId(c.type), true)} class={link}
                    >{c.type}</a
                  >
                </td>
                {#each ATTRIBUTES as [key] (key)}
                  <td
                    class="py-2 pr-4 text-right tabular-nums {c.div[key] === 2
                      ? 'font-semibold text-foreground'
                      : ''}">{c.div[key]}</td
                  >
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <!-- Source: exported-data/pets.json — every mercenary prefab has 1 + 1 per level in each resistance. -->
      <p>Each resistance increases by 1 every level.</p>
      <!-- Source: server-scripts/PetSkills.cs:OnStartServer, Player.cs:4629-4652 -->
      <p class="font-mono text-foreground">
        skill rank = ⌊level ÷ 5⌋ + ⌊veteran level ÷ 10⌋
      </p>
      <p>Each skill stops at its max rank.</p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="veteran" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Veteran Levels</Card.Title>
      <Card.Description>
        Your veteran level makes every mercenary stronger.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Player.cs:10352-10365 — each summon adds total veteran points × 0.0025 to the rolled multipliers. -->
      <p>
        Each veteran level adds 0.25% to the Health multiplier and to the Mana
        or Rage multiplier.
      </p>
      <p>
        At veteran level {MAX_VETERAN}, the bonus is +{MAX_VETERAN * 0.25}%.
      </p>
      <p>A Bard mercenary has no Mana, so only its Health increases.</p>
      <Alert variant="info">
        <Info />
        <div class="space-y-1">
          <!-- Source: server-scripts/Player.cs:4629-4652, Player.cs:10347-10348, Database.cs:SaveNewMercenary -->
          <p class="font-medium">Game quirk: veteran damage does not stay</p>
          <p>
            A veteran level gained while a mercenary is summoned adds +1 damage
            and +1 magic damage.
          </p>
          <p>The game does not save this bonus.</p>
          <p>
            The next summon restores the damage rolled at hire, or rolls again
            if that roll was 0.
          </p>
        </div>
      </Alert>
    </Card.Content>
  </Card.Root>

  <Card.Root id="stance" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Stance</Card.Title>
      <Card.Description>
        The stance controls whether mercenaries attack.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Pet.cs:OnAggro,UserCode_CmdSetAggresiveStance__Boolean; Pet.cs:2198-2209; Player.cs:OnAggro; Combat.cs:668,1187 -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium"></th>
              <th class="py-2 pr-4 text-left font-medium">Aggressive</th>
              <th class="py-2 text-left font-medium">Defensive</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4">Attacks your target</td>
              <td class="py-2 pr-4 text-foreground">Yes</td>
              <td class="py-2">No</td>
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4">Attacks enemies that hit you or it</td>
              <td class="py-2 pr-4 text-foreground">Yes</td>
              <td class="py-2">No</td>
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4">Uses heals and buffs</td>
              <td class="py-2 pr-4 text-foreground">Yes</td>
              <td class="py-2 text-foreground">Yes</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>When you switch to defensive, mercenaries stop their attack.</p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="death-save" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Death Save</Card.Title>
      <Card.Description>
        {data.deathSaveClasses.join(" and ")} mercenaries can survive a hit that would
        kill them.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Combat.cs:1350-1361,1157-1180 -->
      <p>
        When a hit would kill the mercenary, it casts
        <a href="/skills/{data.deathSave.id}" class={link}
          >{data.deathSave.name}</a
        > instead.
      </p>
      <ul class="list-disc space-y-1 pl-5">
        <li>You must be level {DEATH_SAVE_MIN_LEVEL} or higher.</li>
        <li>The cooldown is {fmt(data.deathSave.cooldown)} seconds.</li>
        <li>The rank is your veteran level ÷ 10, rounded.</li>
        <li>
          The Rage cost goes from {fmt(deathSaveCost(0))} at veteran level 0 to
          {fmt(deathSaveCost(MAX_VETERAN))} at veteran level {MAX_VETERAN}.
        </li>
        <li>Without enough Rage, the hit kills the mercenary.</li>
      </ul>
    </Card.Content>
  </Card.Root>

  <Card.Root id="death" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Death and Resurrection</Card.Title>
      <Card.Description>
        A dead mercenary stays dead until you resurrect it.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Pet.cs:OnDeath,UpdateServer_DEAD — the corpse despawns after 300 seconds. -->
      <p>The corpse disappears after 5 minutes.</p>
      <!-- Source: server-scripts/TargetHealSkill.cs:232-253, Player.cs:ResurrectMercenaryNearOwner,UserCode_CmdResurrectMerc__String__Int64,ProcessMercenariesOnPlayerRespawn,10417 -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Method</th>
              <th class="py-2 pr-4 text-left font-medium">When</th>
              <th class="py-2 pr-4 text-left font-medium">Cost</th>
              <th class="py-2 text-left font-medium">Health on return</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-foreground"
                >Resurrect skill or scroll</td
              >
              <td class="py-2 pr-4">While the corpse exists</td>
              <td class="py-2 pr-4">The skill or the scroll</td>
              <td class="py-2">10%</td>
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-foreground">Mercenary recruiter</td>
              <td class="py-2 pr-4"
                >At a recruiter, even after the corpse is gone</td
              >
              <td class="py-2 pr-4">Resurrection fee</td>
              <td class="py-2"
                >10% while the corpse exists, full at the next summon after</td
              >
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-foreground">Your respawn</td>
              <td class="py-2 pr-4">When you respawn</td>
              <td class="py-2 pr-4">Resurrection fee for each one</td>
              <td class="py-2">10%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/Player.cs:GetMercenaryResurrectionPrice -->
      <p class="font-mono text-foreground">
        fee = round(5 + 295 × ((level − 1) ÷ 49)^2.8 + 10 × veteran level)
      </p>
      <p>
        The fee goes from {fmt(resurrectionPrice(MERC_MIN_LEVEL, 0))} gold at level
        {MERC_MIN_LEVEL} to {fmt(resurrectionPrice(50, MAX_VETERAN))} gold at level
        50 with veteran level {MAX_VETERAN}.
      </p>
      <p>Charisma lowers the fee in the same way as the hire price.</p>
      <!-- Source: server-scripts/Pet.cs:OnDeath, Combat.cs:739-755 — hits lower gear durability; death does not. -->
      <p>Gear stays on the mercenary, and death does not lower durability.</p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="owner-death" class="bg-muted/30">
    <Card.Header>
      <Card.Title>When You Die</Card.Title>
      <Card.Description>
        Your death also affects your mercenaries.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Player.cs:DestroyLivingMercenariesOnOwnerDeath — living mercenaries are removed on owner death; dead ones keep their corpse. -->
      <p>Your living mercenaries leave when you die.</p>
      <!-- Source: server-scripts/Player.cs:ReloadSummonedMercenaries,13004-13008 -->
      <p>They return when you respawn or when someone resurrects you.</p>
      <!-- Source: server-scripts/UIRespawn.cs:Respawn, Player.cs:ProcessMercenariesOnPlayerRespawn,10254-10273 -->
      <p>
        When you respawn, the game pays the resurrection fee for each dead
        summoned mercenary, up to 4.
      </p>
      <p>If you cannot pay for all of them, none return.</p>
    </Card.Content>
  </Card.Root>
</div>
