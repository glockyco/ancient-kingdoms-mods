<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import Calculation from "$lib/components/Calculation.svelte";
  import {
    bardCharmResistance,
    finalCadenceMelody,
  } from "$lib/calculation/bard";
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

  <PageSections sections={MECHANICS_SECTIONS["/mechanics/bard"]} />

  <Card.Root id="songs" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Bard Songs and Moving Auras</Card.Title>
      <!-- Source: server-scripts/PlayerSkills.cs:CompleteBardSongCast; PlayerSkills.cs:1328-1380 — a selected song recasts and renews its active duration. -->
      <Card.Description>
        Your selected song recasts automatically, renewing its duration.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-5 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PlayerSkills.cs:1119-1128,1171-1259,2331-2363 — song casts repeat during movement or ordinary casting while the Bard can continue. -->
      <p>
        A song keeps repeating while you move or cast other skills.<br />
        Selecting another song changes which song repeats.
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:CanContinueBardSong,UserCode_CmdStopBardSong__Int32; UIBuffs.cs:Update — buff-bar clicks stop and remove a song. -->
      <p>
        Repetition stops if you die, are stunned or feared, start a trade, visit
        a barber, or unequip your instrument.<br />
        Click a song's icon in your buff bar to remove its effects and stop it repeating.
      </p>
      <!-- Source: server-scripts/ScriptableSkill.cs:102-137, PlayerSkills.cs:CanContinueBardSong; PlayerSkills.cs:2331-2363 — Instrument requirements are checked before starting and during continued performance. -->
      <p>Bard songs require an equipped instrument.</p>
      <!-- Source: server-scripts/PlayerSkills.cs:1336-1380,1662-1677,1692-1704,1721-1733 — the default limit is two, an unlimited passive removes it, and at a limit a new song displaces the oldest refreshed entry. -->
      <p>
        You can keep two songs active at once by default.<br />
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
      <!-- Source: server-scripts/PlayerSkills.cs:1336-1380,1598-1609,1620-1639,1721-1733 — changing the selected song does not remove earlier effects, but expiry or explicit removal does. -->
      <p>
        Earlier songs keep their effects when you switch songs or the repeating
        cast stops. They end when they expire, you stop them, or a new song
        displaces them.
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
            <!-- Source: server-scripts/PlayerSkills.cs:1107-1115 — RefreshBardSongAura runs every 0.5 seconds. -->
            <!-- Source: server-scripts/PlayerSkills.cs:1383-1398 — fresh casts call RefreshBardSongAura with freshCast true. -->
            <!-- Source: server-scripts/PlayerSkills.cs:RefreshBardSongAura; AreaDebuffSkill.cs:ApplyToCandidates — a newly reached monster gets the Bard's threat and targets the Bard if it had no target. -->
            <tr class="border-b border-border/50">
              <th class="py-3 pr-5 text-left font-medium text-foreground"
                >Harmful</th
              >
              <td class="py-3">
                Enemy monsters within the song's range that are in combat with
                anyone, not only your party. The song reaches a monster within
                0.5 seconds of it entering range or joining a fight.<br />
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
                >. Cacophony can start fights with them.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Source: server-scripts/PlayerSkills.cs:RefreshBardSongAura; website/data/compendium.db skills.buff_category — categorized songs apply fresh effects; other songs restore suspended effects. -->
      <p>
        Leaving range removes the aura. Most songs resume with the same strength
        and time left when you return, including any weakening from cleansing.<br
        />
        March of Celerity, Anthem of Focus, Grand Symphony, Wayfarer's Rhythm, and
        <a
          href="/skills/aegis_aria"
          class="text-blue-600 dark:text-blue-400 hover:underline">Aegis Aria</a
        > start fresh instead.
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:BeginBardSong,CompleteBardSongCast; Skills.cs:ApplyFinishedCast — automatic repeats apply a fresh cast and clear attempted recipients. -->
      <p>
        The song tries to apply a resisted or removed aura again on its next
        cast, including an automatic repeat.
      </p>
      <!-- Source: server-scripts/BardSongSkill.cs:TryApplyAuraBuff,GetStackingStrength; website/data/compendium.db skills.buff_category — same-category songs compare speed, damage, haste and accuracy bonuses across Bards and mercenary versions, and an existing song of at least equal strength stays. Aegis Aria (category Ward) has none of those bonuses, so one already present always stays. -->
      <!-- Source: server-scripts/PlayerSkills.cs:RefreshBardSongAura; Skills.cs:AddOrRefreshBuff — an uncategorized song skips another Bard's copy between casts, and a fresh cast re-adds it by name, replacing that copy; songs with different names are added separately. -->
      <p>
        Two Bards' March of Celerity, Anthem of Focus, Grand Symphony, or
        Wayfarer's Rhythm (including a Bard mercenary's version) do not stack.
        The stronger wins, and an equal effect already present stays.<br />
        A second Bard's Aegis Aria never replaces one already present.<br />
        Every other song replaces another Bard's copy of the same song on an ally
        at each cast, including an automatic repeat. Different songs stack.
      </p>
      <!-- Source: server-scripts/BardSongSkill.cs:26-31, Buff.cs:133-240 — Bard songs use Charisma scaling for eligible effect values. -->
      <!-- Source: server-scripts/Skills.cs:GetFinalHealOverTime and BuffSkill.cs:GetDebuffPowerAttribute — songs skip the Wisdom healing bonus and use Charisma before the Intelligence branch. -->
      <p>
        <a
          href="/mechanics/character#attributes"
          class="text-blue-600 dark:text-blue-400 hover:underline">Charisma</a
        >
        increases song power by 0.1% per point above 0, up to a 200% bonus. Wisdom
        and Intelligence do not strengthen songs.<br />
        <MechanicsLink section="combat#songs">Song Strength</MechanicsLink> shows
        which effects change and how they round.<br />
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
        Final Cadence hits nearby monsters already in combat, even with someone
        outside your party. It does not hit
        <a
          href="/mechanics/combat#sleep"
          class="text-blue-600 dark:text-blue-400 hover:underline">sleeping</a
        > monsters. A Bard mercenary hits only monsters targeting you, your party,
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
        Bosses, elites, training dummies, monsters returning home, and
        debuff-immune monsters cannot be charmed. Other living monsters can
        resist.
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
      <!-- Source: server-scripts/Monster.cs:2479-2545,2567-2661 — the charmed creature follows its Bard when idle and finds reachable nearby monsters that threaten the Bard's group. -->
      <p>
        Your charmed creature follows you and attacks nearby monsters
        threatening you or your party. Selecting a monster does not order it to
        attack.
      </p>
      <!-- Source: server-scripts/BardCharmSongSkill.cs:GetCharmTarget; PlayerSkills.cs:UserCode_CmdStopBardSong__Int32,RemoveActiveBardSong — a buff-bar click releases the current charm before another can be selected. -->
      <p>
        You can charm one creature at a time, and other Bards cannot take it
        from you. To change creatures, first release yours by clicking the
        charm's song icon in your buff bar.
      </p>
      <!-- Source: server-scripts/BardCharmSongSkill.cs:120-133, PlayerSkills.cs:1328-1380,1707-1714 — a successful charm is tracked as an active Bard song and occupies a slot. -->
      <p>
        Charm uses a song slot and follows the <a
          href="#songs"
          class="text-blue-600 dark:text-blue-400 hover:underline">song limit</a
        > above.
      </p>
      <!-- Source: server-scripts/BardCharmSongSkill.cs:33-59, PlayerSkills.cs:CompleteBardSongCast; PlayerSkills.cs:2331-2363 — repeated casts keep the original charm target and require range and visibility to renew it. -->
      <p>
        Repeating the song renews your existing charm, regardless of your
        selection. Keep the creature visible and within cast range.
      </p>
      <!-- Source: server-scripts/Monster.cs:2449-2467,2548-2564,2853-2856, PlayerSkills.cs:1620-1639,1692-1704,1805-1809; ZoneTrigger.cs:94-100 — charm ends on removal or expiry, monster death, Bard death, zone separation, or leaving the server. -->
      <p>
        Charm ends if its effect expires or is removed, or if the creature dies.<br
        />
        It also ends if you die, change zones, or leave the game.
      </p>
      <!-- Source: server-scripts/Monster.cs:EndBardCharm; PlayerSkills.cs:StopBardCharm; ZoneTrigger.cs:OnTriggerEnter2D; Player.cs:CmdPortalDestination — ordinary release is hostile within chase distance; zone and portal release is peaceful. -->
      <p>
        Expiry or stopping the song makes the released monster attack you if you
        are alive and within its
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
