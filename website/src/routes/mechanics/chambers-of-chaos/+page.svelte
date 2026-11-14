<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Clock from "@lucide/svelte/icons/clock";
  import Skull from "@lucide/svelte/icons/skull";
  import Wifi from "@lucide/svelte/icons/wifi-off";
  import { resolve } from "$app/paths";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import RedactedEntry from "$lib/components/RedactedEntry.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import CaptureFigure from "$lib/components/chambers/CaptureFigure.svelte";
  import EntryChanceChart from "$lib/components/chambers/EntryChanceChart.svelte";
  import KeeperCard from "$lib/components/chambers/KeeperCard.svelte";
  import LevelDistributionChart from "$lib/components/chambers/LevelDistributionChart.svelte";
  import PoolList from "$lib/components/chambers/PoolList.svelte";
  import RewardBands from "$lib/components/chambers/RewardBands.svelte";
  import RunTimeline from "$lib/components/chambers/RunTimeline.svelte";
  import ScalingChart from "$lib/components/chambers/ScalingChart.svelte";
  import ScalingInputs from "$lib/components/chambers/ScalingInputs.svelte";
  import SequenceStrip from "$lib/components/chambers/SequenceStrip.svelte";
  import TrackerPanel from "$lib/components/chambers/TrackerPanel.svelte";
  import TrialCard from "$lib/components/chambers/TrialCard.svelte";
  import UpgradeChain from "$lib/components/chambers/UpgradeChain.svelte";
  import { createPlanner } from "$lib/components/chambers/planner.svelte";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import { TRIAL_BY_KIND } from "$lib/components/chambers/trials";
  import { formatNumber } from "$lib/utils/format";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // The prerendered rules are the same for every visit to this page, so the planner keeps the first value.
  // svelte-ignore state_referenced_locally
  const planner = createPlanner(data.rules);
  const view = $derived(planner.view);
  const d = $derived(data.definition);
  const minutes = $derived(d.runDurationSeconds / 60);
  const scaleMax = $derived(
    Math.max(
      ...view.ordinary.map((row) => row.probability),
      ...view.guardian.map((row) => row.probability),
    ),
  );
  const levelsBelow = $derived(view.entryLevel - view.ordinary[0].level);
  const levels = (count: number) => (count === 1 ? "level" : "levels");
  const capture = (kind: string) =>
    data.captures.find((entry) => entry.kind === kind);
  const battleShot = $derived(capture("shot"));
  const introShot = $derived(capture("illustration_2"));
  const manuscriptShot = $derived(capture("illustration_3"));
  // A wave holds the chamber's whole population, so a chamber plays as Waves only while all waves together stay within the clear limit.
  const wavePopulationLimit = $derived(
    Math.floor(d.maximumClearTargets / d.waveCount),
  );
</script>

{#snippet badge(n: number)}
  <span
    class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-base ring-1 ring-border ring-inset"
    aria-hidden="true">{n}</span
  >
{/snippet}

<Seo
  title="Chambers of Chaos - Ancient Kingdoms"
  description="Chambers of Chaos in Ancient Kingdoms: entry, the three trials, enemy levels, Health and Power by level and veteran points, rewards, and the Chaos Catalyst."
  path="/mechanics/chambers-of-chaos"
/>

<!-- Balanced wrapping evens out the lines of short paragraphs, so none ends on a stray word or two. -->
<div
  class="container mx-auto max-w-5xl space-y-8 p-8 [&_figcaption]:text-balance [&_p]:text-balance"
>
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Chambers of Chaos" },
    ]}
  />

  <h1 class="text-4xl font-bold">Chambers of Chaos</h1>

  <section class="grid gap-6 lg:grid-cols-2" aria-label="Overview">
    <!-- The bottom padding matches the image caption's line, so the keeper card ends level with the image. -->
    <div class="flex flex-col justify-between gap-4 lg:pb-[22px]">
      <!-- Source: server-scripts/MadMageTower.cs:Begin,Ready — entry needs level 40, no other player in the party, and one entry item, which is taken when chamber 1 opens. server-scripts/MadMageTowerRules.cs:RoomCount,RunDurationSeconds — 3 chambers and one 1200 second timer. -->
      <p class="text-lg text-muted-foreground">
        The Chambers of Chaos are a solo dungeon for characters of level {d.minimumLevel}
        and up. Mordrath lets you in for 1 entry item. You clear {d.roomCount}
        chambers within {minutes} minutes, and the final guardian drops a reward.
      </p>
      <KeeperCard keeper={data.keeper} />
    </div>
    {#if introShot}
      <CaptureFigure
        src={introShot.src}
        width={introShot.width}
        height={introShot.height}
        alt="A pale hall seen from above with guardians crowded between stone vases."
        caption="Real run: the busiest hall of a Manuscript chamber."
        priority
      />
    {/if}
  </section>

  <PageSections sections={MECHANICS_SECTIONS["/mechanics/chambers-of-chaos"]} />

  <section class="space-y-5">
    <h2
      id="enter"
      class="flex scroll-mt-20 items-center gap-3 text-2xl font-semibold"
    >
      {@render badge(1)} Enter
    </h2>
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="space-y-3">
        <h3 class="font-semibold text-foreground">Requirements</h3>
        <!-- Source: server-scripts/MadMageTower.cs:Begin — entry needs level 40, no other player in the party, no combat, and one entry item in the inventory. -->
        <ul class="space-y-2 text-muted-foreground">
          <li class="flex gap-2">
            <Check
              class="mt-1 size-4 shrink-0 text-emerald-500"
              aria-hidden="true"
            />
            Be level {d.minimumLevel} or higher.
          </li>
          <li class="flex gap-2">
            <Check
              class="mt-1 size-4 shrink-0 text-emerald-500"
              aria-hidden="true"
            />
            Be alone. Leave your party first.
          </li>
          <li class="flex gap-2">
            <Check
              class="mt-1 size-4 shrink-0 text-emerald-500"
              aria-hidden="true"
            />
            Be out of combat.
          </li>
          <li class="flex gap-2">
            <Check
              class="mt-1 size-4 shrink-0 text-emerald-500"
              aria-hidden="true"
            />
            <span>Carry 1 <RedactedEntry kind="item" slot={false} />.</span>
          </li>
        </ul>
        <h3 class="pt-2 font-semibold text-foreground">When You Enter</h3>
        <!-- Source: server-scripts/MadMageTower.cs:Ready — the entry item is removed when the player is moved into chamber 1, after the distance and combat checks run again. A failed check ends the attempt without spending it. -->
        <p class="text-muted-foreground">
          The entry item is used up when chamber&nbsp;1 opens. If the entry
          fails first, you keep it.
        </p>
        <!-- Source: server-scripts/MadMageTower.cs:Ready; Player.cs:SuspendMadMageTowerMercenaries — entering dismisses mercenaries, cancels casts, removes invisibility and dismounts. server-scripts/MadMageTower.cs:MoveParticipant — the active pet moves with the player. -->
        <p class="text-muted-foreground">
          Your mercenaries are dismissed until you leave. Your pet comes with
          you. You are dismounted and lose invisibility.
        </p>
        <!-- Source: server-scripts/PlayerParty.cs:UserCode_CmdInvite__String,UserCode_CmdAcceptInvite — invitations to or from a player inside are ignored. -->
        <p class="text-muted-foreground">
          While you are inside, party invitations to and from you are refused.
        </p>
      </div>
      <div class="space-y-3">
        <h3 class="font-semibold text-foreground">Entry Item Drop Chance</h3>
        <!-- Source: server-scripts/Monster.cs:OnDeath — a non-boss elite of level 40 or higher adds one entry item to its corpse with the chance MadMageTowerRules.SealDropChance(level) gives. -->
        <EntryChanceChart
          rows={data.entryChances}
          initialLevel={view.entryLevel}
        />
      </div>
    </div>
  </section>

  <section class="space-y-5">
    <h2
      id="time-limit"
      class="flex scroll-mt-20 items-center gap-3 text-2xl font-semibold"
    >
      {@render badge(2)} Time Limit
    </h2>
    <!-- Source: server-scripts/MadMageTowerRules.cs:RunDurationSeconds; MadMageTower.cs:StartTrial — one 1200 second timer starts with chamber 1 and covers the whole run. -->
    <RunTimeline
      seconds={d.runDurationSeconds}
      roomCount={d.roomCount}
      class="rounded-lg border bg-card p-4"
    />
  </section>

  <section class="space-y-5">
    <h2
      id="chambers"
      class="flex scroll-mt-20 items-center gap-3 text-2xl font-semibold"
    >
      {@render badge(3)} Chambers
    </h2>
    <SequenceStrip
      draws={data.draws}
      roomCount={d.roomCount}
      finalKind={d.finalTrial}
    />

    <ul class="space-y-4">
      <TrialCard
        id="trial-battle"
        label={TRIAL_BY_KIND.Battle.label}
        phrase={TRIAL_BY_KIND.Battle.phrase}
      >
        {#snippet media()}
          {#if battleShot}
            <CaptureFigure
              src={battleShot.src}
              width={battleShot.width}
              height={battleShot.height}
              alt="A pale stone hall seen from above, with skeletons, orcs and constructs standing among stone vases."
              caption="Real run: the first hall of a Battle chamber."
            />
          {/if}
        {/snippet}
        <!-- Source: server-scripts/MadMageTower.cs:Spawn,SelectHuntTarget — with more than 30 guardians the game picks one monster type that has at most 20 copies, and only that type counts, up to 20 kills. -->
        <p>
          Defeat every guardian. If more than {d.maximumClearTargets} appear, the
          tracker names one monster to hunt, such as "Hunt: Skeleton". Only that monster
          counts, up to {d.maximumHuntTargets} kills.
        </p>
      </TrialCard>

      <TrialCard
        id="trial-waves"
        label={TRIAL_BY_KIND.Waves.label}
        phrase={TRIAL_BY_KIND.Waves.phrase}
      >
        {#snippet media()}
          <TrackerPanel
            chamber={1}
            roomCount={d.roomCount}
            lines={[TRIAL_BY_KIND.Waves.phrase]}
          />
        {/snippet}
        <!-- Source: server-scripts/MadMageTower.cs:MonsterDied,StartTrial — waves 2 and 3 spawn 3 seconds after the last living guardian dies, and a Waves chamber whose three waves would exceed 30 guardians is played as Battle. -->
        <p>
          {d.waveCount} waves of guardians arrive one after another. The next wave
          comes 3 seconds after the last guardian of a wave dies. If a wave would
          hold more than {wavePopulationLimit} guardians, the chamber is a Battle
          chamber instead.
        </p>
      </TrialCard>

      <TrialCard
        id="trial-riddle"
        label={TRIAL_BY_KIND.Riddle.label}
        phrase={TRIAL_BY_KIND.Riddle.phrase}
      >
        {#snippet media()}
          <TrackerPanel
            chamber={1}
            roomCount={d.roomCount}
            lines={[TRIAL_BY_KIND.Riddle.phrase]}
          />
        {/snippet}
        <!-- Source: server-scripts/MadMageTowerClient.cs:Refresh; MadMageTower.cs:Spawn,MonsterDied,LootClue,Interact,Answer — one guardian carries the page and the tracker names it. Taking the page from its remains shows the riddle, the Whispering Lectern offers four answers, a wrong answer spawns 2 penalty guardians, and the lectern stays locked until they die. Killing the other guardians does not complete a page chamber. -->
        <p>
          One guardian carries a page. Take it from the guardian's remains to
          read the riddle. The lectern then offers four answers. A wrong answer
          calls {d.puzzlePenaltyGuards} more guardians, and you must kill them before
          you answer again. You can answer as often as you like. Killing the other
          guardians does not finish the chamber.
        </p>
      </TrialCard>

      <TrialCard
        id="trial-runes"
        label={TRIAL_BY_KIND.Runes.label}
        phrase={TRIAL_BY_KIND.Runes.phrase}
      >
        {#snippet media()}
          <TrackerPanel
            chamber={1}
            roomCount={d.roomCount}
            lines={[`${TRIAL_BY_KIND.Runes.phrase}: 0/4`]}
          />
        {/snippet}
        <!-- Source: server-scripts/MadMageTower.cs:LootClue,Interact — a rune chamber has four stones, a wrong stone resets progress and spawns 2 penalty guardians, and the Ancient Inscription at the entrance shows the tale again. -->
        <p>
          Take the page from the guardian that carries it, then awaken four
          stones in the order the tale gives. A wrong stone resets your progress
          and calls {d.puzzlePenaltyGuards} guardians. The Ancient Inscription at
          the entrance lets you read the tale again.
        </p>
      </TrialCard>

      <TrialCard
        id="trial-manuscript"
        label={TRIAL_BY_KIND.Manuscript.label}
        phrase={TRIAL_BY_KIND.Manuscript.phrase}
      >
        {#snippet media()}
          {#if manuscriptShot}
            <CaptureFigure
              src={manuscriptShot.src}
              width={manuscriptShot.width}
              height={manuscriptShot.height}
              alt="A light stone hall seen from above, with skeletons and orcs between stone vases."
              caption="Real run: a Manuscript chamber."
            />
          {/if}
        {/snippet}
        <!-- Source: server-scripts/MadMageTower.cs:LootClue,Interact — a Manuscript chamber works like a rune chamber, but it has no Ancient Inscription, so the tale shows once when the page is taken. -->
        <p>
          Works like Runes, except the tale shows only once, when you take the
          page. There is no inscription to read it again.
        </p>
      </TrialCard>

      <TrialCard
        id="trial-guardian"
        label={TRIAL_BY_KIND.Guardian.label}
        phrase={TRIAL_BY_KIND.Guardian.phrase}
      >
        {#snippet media()}
          <TrackerPanel
            chamber={d.roomCount}
            roomCount={d.roomCount}
            lines={[TRIAL_BY_KIND.Guardian.phrase]}
          />
        {/snippet}
        <!-- Source: server-scripts/MadMageTower.cs:MonsterDied,Interact; MadMageTowerText.cs:loot — chamber 3 spawns its guardians first, and the final guardian appears when one kill remains. Its death gives the reward, and the exit refuses to let the player leave while the final guardian still holds loot. -->
        <p>
          Guardians fill the chamber first. When one kill remains, the final
          guardian appears: one of the {data.monsters.length} monsters under Who Is
          Inside, with a new name.
        </p>
        <p>
          Kill it and take its reward from its remains. The exit opens when it
          dies, but you cannot leave until you have taken the reward.
        </p>
      </TrialCard>
    </ul>
  </section>

  <section class="space-y-5">
    <h2
      id="scaling"
      class="flex scroll-mt-20 items-center gap-3 text-2xl font-semibold"
    >
      {@render badge(4)} What You Face
    </h2>
    <ScalingInputs {planner} />
    <!-- Source: server-scripts/MadMageTowerRules.cs:EnemyLevel,MaximumEnemyLevelBonus — an enemy's level is your entry level plus a weighted draw from -3 up to the bonus the veteran points allow. A guardian's draw starts at 0. -->
    <p class="text-muted-foreground" aria-live="polite">
      At {view.veteranPoints} veteran points, ordinary guardians are between {levelsBelow}
      {levels(levelsBelow)} below and {view.maximumLevelBonus}
      {levels(view.maximumLevelBonus)} above your entry level. The final guardian
      is never below it. The charts show how likely each level is.
    </p>
    <div class="grid gap-6 md:grid-cols-2">
      <LevelDistributionChart
        title="Ordinary Guardians"
        chances={view.ordinary}
        entryLevel={view.entryLevel}
        {scaleMax}
      />
      <LevelDistributionChart
        title="Final Guardian"
        chances={view.guardian}
        entryLevel={view.entryLevel}
        {scaleMax}
        tone="bg-amber-500/80"
      />
    </div>
    <!-- Source: server-scripts/MadMageTowerRules.cs:Health,Power; MadMageTower.cs:Spawn — the game scales each enemy's Health to the Health target and replaces its Damage and Magic Damage with Power. Both are rounded to whole numbers. -->
    <div class="grid gap-8 pt-4 md:grid-cols-2">
      <ScalingChart
        chambers={view.chambers}
        metric="health"
        title="Health Target"
        note="Maximum Health the game sets for each enemy."
        swatch="var(--stat-hp)"
      />
      <ScalingChart
        chambers={view.chambers}
        metric="power"
        title="Power"
        note="Each enemy's Damage and Magic Damage, before mitigation."
        swatch="var(--stat-mana)"
      />
    </div>
    <!-- Source: server-scripts/MadMageTower.cs:NormalizeCombat — defense is 100, and each resistance is 80. For the final guardian they are 200 and 150. -->
    <p class="text-sm text-muted-foreground">
      Ordinary guardians have 100 Defense and 80 of each resistance. The final
      guardian has 200 Defense and 150 of each resistance.
    </p>
  </section>

  <section class="space-y-5">
    <h2
      id="reward"
      class="flex scroll-mt-20 items-center gap-3 text-2xl font-semibold"
    >
      {@render badge(5)} Your Reward
    </h2>
    <!-- Source: server-scripts/MadMageTowerRules.cs:Reward; MadMageTower.cs:Begin,MonsterDied — the amount is rolled at entry from the entry level and total veteran points, and placed in the final guardian's loot once both earlier chambers are done. -->
    <p class="text-muted-foreground">
      The final guardian drops <RedactedEntry kind="item" slot={false} />. The
      amount depends on your level and total veteran points when you enter.
    </p>
    <RewardBands
      bands={data.rules.rewardBands}
      entryLevel={view.entryLevel}
      veteranPoints={view.veteranPoints}
    />
    <!-- Source: server-scripts/MadMageTowerRules.cs:CompletionExperience; MadMageTower.cs:MonsterDied — finishing gives experience by the player's level when the final guardian dies, not the entry level. -->
    <p class="text-muted-foreground" aria-live="polite">
      Finishing also gives {formatNumber(view.completionExperience)} experience at
      level {view.entryLevel}. The amount follows your level when the final
      guardian dies.
    </p>
    <!-- Source: server-scripts/MadMageTower.cs:AwardKillExperience,Spawn — kills give experience to the owner only, three times the dungeon-balanced amount, doubled by Double XP. Gold and drop tables are cleared. -->
    <p class="text-muted-foreground">
      Each kill gives you {d.combatExperienceMultiplier} times the usual dungeon experience,
      and Double XP doubles that. Apart from the page and the reward, nothing drops,
      and there is no gold.
    </p>
  </section>

  <section class="space-y-5">
    <h2
      id="catalyst"
      class="flex scroll-mt-20 items-center gap-3 text-2xl font-semibold"
    >
      {@render badge(6)} Spend It
    </h2>
    <!-- Source: server-scripts/AugmentUpgradeItem.cs:TryUpgrade; AugmentItem.cs:CanUpgrade — a catalyst and one loose augment become the augment's next quality. -->
    <p class="text-muted-foreground">
      Adventurer merchants sell the {data.catalyst.item.name} for the reward. It raises
      one loose augment by one quality. The catalyst and the augment are used up,
      and each step needs its own catalyst.
    </p>
    <UpgradeChain
      catalyst={data.catalyst.item}
      typeLabel={data.catalyst.typeLabel}
      price={data.catalyst.price}
      vendors={data.catalyst.vendors}
      families={data.families}
    />
  </section>

  <section class="space-y-5">
    <h2
      id="failure"
      class="flex scroll-mt-20 items-center gap-3 text-2xl font-semibold"
    >
      {@render badge(7)} If It Goes Wrong
    </h2>
    <ul class="grid gap-3 md:grid-cols-3">
      <li class="space-y-1 rounded-lg border bg-card p-4">
        <p class="flex items-center gap-2 font-semibold text-foreground">
          <Clock class="size-4" aria-hidden="true" /> Time Runs Out
        </p>
        <!-- Source: server-scripts/MadMageTower.cs:Update,Exit — an expired timer ends the run and warps the player to the entry point. -->
        <p class="text-sm text-muted-foreground">
          The run ends and you return to where you entered. The entry item stays
          used.
        </p>
      </li>
      <li class="space-y-1 rounded-lg border bg-card p-4">
        <p class="flex items-center gap-2 font-semibold text-foreground">
          <Skull class="size-4" aria-hidden="true" /> You Die
        </p>
        <!-- Source: server-scripts/Player.cs:UpdateServer_DEAD; MadMageTowerText.cs:hardcore — no corpse is created in zone 26, and respawn returns the player to the entry point and ends the run. Death is permanent for Hardcore characters. -->
        <p class="text-sm text-muted-foreground">
          You leave no corpse. You respawn where you entered, not at your bind
          point, and the run ends. Death is permanent for Hardcore characters.
          See <MechanicsLink section="death">Death</MechanicsLink>.
        </p>
      </li>
      <li class="space-y-1 rounded-lg border bg-card p-4">
        <p class="flex items-center gap-2 font-semibold text-foreground">
          <Wifi class="size-4" aria-hidden="true" /> You Log Out
        </p>
        <!-- Source: server-scripts/NetworkManagerMMO.cs:OnServerDisconnect; Database.cs:SavePlayer — a disconnect finishes the run, and the save records the entry point. -->
        <p class="text-sm text-muted-foreground">
          Logging out or losing the connection ends the run. The game saves you
          where you entered.
        </p>
      </li>
    </ul>
  </section>

  <section class="space-y-5">
    <h2
      id="monsters"
      class="flex scroll-mt-20 items-center gap-3 text-2xl font-semibold"
    >
      {@render badge(8)} Who Is Inside
    </h2>
    <p class="text-muted-foreground">
      Guardians are world monsters, rescaled for the Chambers. Their own pages
      describe the world versions.
    </p>
    <PoolList groups={data.groups} />
  </section>

  <p class="text-sm text-muted-foreground">
    Zone page:
    <a
      href={resolve("/zones/[id]", { id: d.zoneId })}
      class="text-blue-600 hover:underline dark:text-blue-400"
      >Chambers of Chaos</a
    >.
  </p>
</div>
