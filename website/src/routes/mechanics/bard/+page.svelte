<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import Calculation from "$lib/components/Calculation.svelte";
  import {
    bardCharmResistance,
    finalCadenceMelody,
  } from "$lib/calculation/bard";

  const SECTIONS = [
    { id: "songs", label: "Bard Songs" },
    { id: "cadence", label: "Final Cadence" },
    { id: "charm", label: "Bard Charm" },
  ];
</script>

<Seo
  title="Bard Songs and Charm - Ancient Kingdoms"
  description="How Bard songs repeat, share their auras, use active slots, and charm a monster in Ancient Kingdoms."
  path="/mechanics/bard"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Bard Songs and Charm" },
    ]}
  />

  <h1 class="text-4xl font-bold">Bard Songs and Charm</h1>

  <PageSections sections={SECTIONS} />

  <Card.Root id="songs" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Bard Songs and Moving Auras</Card.Title>
      <!-- Source: server-scripts/PlayerSkills.cs:CompleteBardSongCast; PlayerSkills.cs:1257-1309 — a selected song recasts and renews its active duration. -->
      <Card.Description>
        A selected song repeats its cast and renews its own duration.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-5 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PlayerSkills.cs:1048-1057,1100-1188,2260-2292 — song casts repeat during movement or ordinary casting while the Bard can continue. -->
      <p>
        Performing continues while moving or casting an ordinary skill.<br />
        Selecting another song changes which song repeats.
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:CanContinueBardSong,UserCode_CmdStopBardSong__Int32; UIBuffs.cs:Update — buff-bar clicks stop and remove a song. -->
      <p>
        Repetition stops if the Bard dies, is stunned or feared, starts a trade,
        visits a barber, or unequips the instrument.<br />
        Click a song's icon in your buff bar to stop it. This removes its effects
        and stops it repeating.
      </p>
      <!-- Source: server-scripts/ScriptableSkill.cs:102-137, PlayerSkills.cs:CanContinueBardSong; PlayerSkills.cs:2260-2292 — Instrument requirements are checked before starting and during continued performance. -->
      <p>
        Bard songs require an equipped instrument.<br />
        Losing it stops the repeating cast.
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:1265-1309,1591-1606,1621-1633,1650-1662 — the default limit is two, an unlimited passive removes it, and at a limit a new song displaces the oldest refreshed entry. -->
      <p>
        Two songs can remain active by default.<br />
        A new song at the limit removes the least recently refreshed song and its
        effects.<br />
        <a
          href="/skills/polyphony"
          class="text-blue-600 dark:text-blue-400 hover:underline">Polyphony</a
        >
        removes the limit. Each song still ends when its duration runs out.
      </p>
      <!-- Source: server-scripts/BardVirtuositySkill.cs:IsDamageBonusActive; BardFinalCadenceSkill.cs:HasRequiredSongsActive — both check for at least three active songs. -->
      <p>
        <a
          href="/skills/virtuosity"
          class="text-blue-600 dark:text-blue-400 hover:underline">Virtuosity</a
        >
        and
        <a
          href="#cadence"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Final Cadence</a
        > need at least three active songs.
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:1265-1309,1527-1538,1549-1568,1650-1662 — changing the selected song does not remove earlier effects, but expiry or explicit removal does. -->
      <p>
        Earlier songs remain after a switch until they expire, are stopped, or
        are displaced.<br />
        When repetition ends on its own, it does not remove the active song.
      </p>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[540px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border text-foreground">
              <th class="py-2 pr-5 text-left font-medium">Aura</th>
              <th class="py-2 text-left font-medium">Recipients</th>
            </tr>
          </thead>
          <tbody>
            <!-- Source: server-scripts/BardSongSkill.cs:78-117 — living, visible, nearby Bard and same-zone party members and their active non-familiar pets and mercenaries are candidates. -->
            <tr class="border-b border-border/50">
              <th class="py-3 pr-5 text-left font-medium text-foreground"
                >Beneficial</th
              >
              <td class="py-3">
                The Bard, living party members within the song's tooltip range
                in the same zone, and their active companions and mercenaries.<br
                />
                Familiars do not receive these auras.
              </td>
            </tr>
            <!-- Source: server-scripts/BardAreaSongSkill.cs:CollectAuraCandidates — Cacophony removes Monsters with speed at most -50, other songs remove Monsters with aggroList.Count == 0. -->
            <!-- Source: server-scripts/PlayerSkills.cs:1036-1044 — RefreshBardSongAura runs every 0.5 seconds. -->
            <!-- Source: server-scripts/PlayerSkills.cs:1312-1327 — fresh casts call RefreshBardSongAura with freshCast true. -->
            <!-- Source: server-scripts/PlayerSkills.cs:RefreshBardSongAura; AreaDebuffSkill.cs:ApplyToCandidates — a newly reached monster gets the Bard's threat and targets the Bard if it had no target. -->
            <tr class="border-b border-border/50">
              <th class="py-3 pr-5 text-left font-medium text-foreground"
                >Harmful</th
              >
              <td class="py-3">
                Enemy monsters within the song's range that are already fighting
                anyone, not only the Bard's party. Checked on each cast and
                every 0.5-second aura update.<br />
                <a
                  href="/skills/cacophony"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  >Cacophony</a
                >
                also hits monsters that are not fighting yet, unless they are
                <a
                  href="/mechanics/combat#sleep"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  >asleep</a
                >. Reaching one gives the Bard threat on it, so Cacophony can
                start a fight.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Source: server-scripts/PlayerSkills.cs:RefreshBardSongAura; website/data/compendium.db skills.buff_category — categorized songs apply fresh effects; other songs restore suspended effects. -->
      <p>
        Leaving a song's range removes that Bard's aura.<br />
        March of Celerity, Anthem of Focus, Grand Symphony, Wayfarer's Rhythm and
        <a
          href="/skills/aegis_aria"
          class="text-blue-600 dark:text-blue-400 hover:underline">Aegis Aria</a
        >
        apply a fresh effect when you return to range. Other songs restore the effect's
        remaining time and strength.<br />
        If cleansing weakened a harmful effect, leaving and returning does not restore
        its original strength. Aegis Aria can restore its ward on re-entry.
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:BeginBardSong,CompleteBardSongCast; Skills.cs:ApplyFinishedCast — automatic repeats apply a fresh cast and clear attempted recipients. -->
      <p>
        A resisted or removed aura is tried again at the song's next cast,
        including an automatic repeat.
      </p>
      <!-- Source: server-scripts/BardSongSkill.cs:TryApplyAuraBuff,GetStackingStrength; website/data/compendium.db skills.buff_category — same-category songs compare speed, damage, haste and accuracy bonuses across Bards and mercenary versions, and an existing song of at least equal strength stays. Aegis Aria (category Ward) has none of those bonuses, so one already present always stays. -->
      <!-- Source: server-scripts/PlayerSkills.cs:RefreshBardSongAura; Skills.cs:AddOrRefreshBuff — an uncategorized song skips another Bard's copy between casts, and a fresh cast re-adds it by name, replacing that copy; songs with different names are added separately. -->
      <p>
        Two Bards' March of Celerity, Anthem of Focus, Grand Symphony or
        Wayfarer's Rhythm (including a Bard mercenary's version) do not stack.
        The stronger wins, and an equal effect already present stays.<br />
        A second Bard's Aegis Aria never replaces one already present.<br />
        Any other song on an ally replaces another Bard's copy of it at each cast,
        including an automatic repeat. Different songs stack.
      </p>
      <!-- Source: server-scripts/BardSongSkill.cs:26-31, Buff.cs:133-240 — Bard songs use Charisma scaling for eligible effect values. -->
      <!-- Source: server-scripts/Skills.cs:GetFinalHealOverTime and BuffSkill.cs:GetDebuffPowerAttribute — songs skip the Wisdom healing bonus and use Charisma before the Intelligence branch. -->
      <p>
        Bard songs scale with <a
          href="/mechanics/character#attributes"
          class="text-blue-600 dark:text-blue-400 hover:underline">Charisma</a
        >
        alone. Wisdom and Intelligence leave them unchanged.<br />
        <MechanicsLink section="combat#songs">Song Strength</MechanicsLink> shows
        the calculation and the effects it changes.<br />
        See the <EntityLink href="/classes/bard" name="Bard class page" /> for skills
        and ranks.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="cadence" class="bg-muted/30">
    <Card.Header
      ><Card.Title
        ><a
          href="/skills/final_cadence"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Final Cadence</a
        ></Card.Title
      ></Card.Header
    >
    <Card.Content class="space-y-5 text-sm text-muted-foreground">
      <!-- Source: server-scripts/BardFinalCadenceSkill.cs:HasRequiredSongsActive,Apply,ToolTip,FormatScaledValue — a player Bard needs three active songs, and the tooltip includes Charisma scaling before Melody is applied. -->
      <p>
        Final Cadence requires at least three active songs. The tooltip shows
        its Charisma bonus separately. Add that bonus to the listed damage or
        healing before applying the Melody bonus below.
      </p>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border text-foreground">
              <th class="py-2 pr-5 text-left font-medium">Active songs</th>
              <th class="py-2 text-left font-medium">Damage and healing</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-5">3</td>
              <td class="py-2">No bonus</td>
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-5">4</td>
              <td class="py-2">+15%</td>
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-5">5</td>
              <td class="py-2">+25%</td>
            </tr>
            <tr>
              <td class="py-2 pr-5">6 or more</td>
              <td class="py-2">+30%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Calculation calculation={finalCadenceMelody()} />
      <!-- Source: server-scripts/BardFinalCadenceSkill.cs:Apply; PlayerSkills.cs:GetFinalCadenceSongBonus — the bonus reads the active song count when the cast finishes, and only a player Bard receives it. -->
      <p>
        Melody counts your active songs when the cast finishes. <a
          href="/mercenaries/bard_mercenary"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Bard mercenaries</a
        > receive no Melody bonus.
      </p>
      <!-- Source: server-scripts/BardFinalCadenceSkill.cs:FindEnemies — enemies must be Monsters with nonempty aggroList and speed above -50, alive, non-hidden, same-zone, visible and attackable; Pet casts require IsEngagedWithParty. -->
      <p>
        Your Final Cadence hits living, visible, attackable monsters within
        range in the same zone that are fighting anyone and are not
        <a
          href="/mechanics/combat#sleep"
          class="text-blue-600 dark:text-blue-400 hover:underline">asleep</a
        >. A Bard mercenary's cast hits only monsters targeting you, your party,
        or their companions or mercenaries.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="charm" class="bg-muted/30">
    <Card.Header>
      <Card.Title
        >Bard Charm: <a
          href="/skills/verse_of_beguilement"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Verse of Beguilement</a
        ></Card.Title
      >
      <!-- Source: server-scripts/BardCharmSongSkill.cs:90-133, server-scripts/Monster.cs:BeginBardCharm — a successful charm changes one monster into a Bard-controlled ally. -->
      <Card.Description>
        Charm turns one monster into a temporary ally.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-5 text-sm text-muted-foreground">
      <!-- Source: server-scripts/BardCharmSongSkill.cs:20-31,90-119 — charm accepts a living monster but excludes bosses, elites, dummies, returning monsters, and immune or resistant targets. -->
      <p>
        Charm targets a living monster.<br />
        Bosses, elites, training dummies, and monsters returning home cannot be charmed.<br
        />
        Debuff immunity blocks it.<br />
        Other targets can resist it.
      </p>
      <!-- Source: server-scripts/Combat.cs:GetProbResistMagic; BardCharmSongSkill.cs:GetCharmResistChance — clamp the base roll before applying Charm's level and Charisma adjustments. -->
      <p>
        Charm's resist chance depends on your level and Charisma, and the
        monster's level and Magic Resist. Read the monster's Magic Resist on its
        <a
          href="/monsters"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >monster page</a
        >.
      </p>
      <Calculation calculation={bardCharmResistance()} />
      <!-- Source: server-scripts/Combat.cs:DealDamageAt; BardCharmSongSkill.cs:GetCharmedDamageMultiplier; uMMORPG.Scripts.PlayerAttributes/Charisma.cs:GetBardPowerMultiplier — the Charm multiplier applies to every damage type. -->
      <p>
        A charmed monster deals 45% of its usual damage.<br />
        Each point of Charisma adds 0.045 percentage points to that share, up to 100%.
        Negative Charisma counts as 0.
      </p>
      <!-- Source: server-scripts/Monster.cs:2476-2542,2564-2658 — the charmed creature follows its owner when idle and finds reachable nearby monsters that threaten the Bard's group. -->
      <p>
        The creature follows the Bard when it has no target.<br />
        It searches for nearby reachable monsters threatening the Bard or the Bard's
        party.<br />
        It does not automatically attack each monster the Bard selects.
      </p>
      <!-- Source: server-scripts/BardCharmSongSkill.cs:GetCharmTarget; PlayerSkills.cs:UserCode_CmdStopBardSong__Int32,RemoveActiveBardSong — a buff-bar click releases the current charm before another can be selected. -->
      <p>
        A Bard can control one charmed creature at a time.<br />
        Another Bard cannot take control of that creature while its charm lasts.<br
        />
        Selecting a different monster does not replace an active charm.<br />
        To charm another monster, first stop the charm by clicking its song icon in
        your buff bar.
      </p>
      <!-- Source: server-scripts/BardCharmSongSkill.cs:120-133, PlayerSkills.cs:1257-1309,1636-1643 — a successful charm is tracked as an active Bard song and occupies a slot. -->
      <p>
        Charm uses one active-song slot.<br />
        At the song limit, a successful charm can displace the least recently refreshed
        song. With Polyphony there is no limit, so it displaces nothing.
      </p>
      <!-- Source: server-scripts/BardCharmSongSkill.cs:33-59, PlayerSkills.cs:CompleteBardSongCast; PlayerSkills.cs:2260-2292 — repeated casts keep the original charm target and require range and visibility to renew it. -->
      <p>
        Renewal keeps the existing creature as its target, even if the Bard
        selects another monster.<br />
        The creature must be within cast range and visible for renewal.
      </p>
      <!-- Source: server-scripts/Monster.cs:2446-2464,2545-2561,2850-2853, PlayerSkills.cs:1549-1568,1621-1633,1734-1738; ZoneTrigger.cs:94-100 — charm ends on removal or expiry, monster death, Bard death, zone separation, or leaving the server. -->
      <p>
        Charm ends if its effect expires or is removed, or if the creature dies.<br
        />
        It also ends if the Bard dies, changes zones, or leaves the game.
      </p>
      <!-- Source: server-scripts/Monster.cs:EndBardCharm; PlayerSkills.cs:StopBardCharm; ZoneTrigger.cs:OnTriggerEnter2D; Player.cs:CmdPortalDestination — ordinary release is hostile within chase distance; zone and portal release is peaceful. -->
      <p>
        Expiry or stopping the song makes the released monster attack its former
        Bard if the Bard is alive and within its
        <a
          href="/mechanics/monster-spawns#leashing"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >chase limit</a
        >
        (20 yd by default).<br />
        Changing zones or using a portal releases the creature peacefully and frees
        the charm's song slot.
      </p>
    </Card.Content>
  </Card.Root>
</div>
