<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";

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
      <!-- Source: server-scripts/PlayerSkills.cs:CompleteBardSongCast; PlayerSkills.cs:1261-1313 — a selected song recasts and renews its active duration. -->
      <Card.Description>
        A selected song repeats its cast and renews its own duration.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-5 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PlayerSkills.cs:1047-1056,1100-1191,2270-2302 — song casts repeat during movement or ordinary casting while the Bard can continue. -->
      <p>
        Performing continues while moving or casting an ordinary skill.<br />
        Selecting another song changes which song repeats.
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:1162-1191,1531-1542,2344-2363 — repetition stops when its eligibility fails or the Bard stops the selected song. -->
      <p>
        Repetition stops if the Bard dies, loses the required equipment, or
        enters a state other than idle, moving, or casting.<br />
        Stopping a song also stops its repetition.
      </p>
      <!-- Source: server-scripts/ScriptableSkill.cs:102-137, PlayerSkills.cs:CanContinueBardSong; PlayerSkills.cs:2270-2302 — Instrument requirements are checked before starting and during continued performance. -->
      <p>
        Bard songs require an equipped instrument.<br />
        Losing it stops the repeating cast.
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:1269-1313,1605-1616,1631-1643,1660-1672 — the default limit is two, passive bonuses add slots, and a new song displaces the oldest refreshed entry. -->
      <p>
        Two songs can remain active by default.<br />
        Polyphony adds one slot, for three active songs.<br />
        A new song at the limit removes the least recently refreshed song and its
        effects.
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:1269-1313,1531-1542,1553-1573,1660-1672 — changing the selected song does not remove earlier effects, but expiry or explicit removal does. -->
      <p>
        Earlier songs remain after a switch until they expire, are stopped, or
        are displaced.<br />
        Stopping repetition alone does not remove an active song.
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
                The Bard, nearby living party members in the same zone, and
                their active companions and mercenaries.<br />
                Familiars do not receive these auras.
              </td>
            </tr>
            <!-- Source: server-scripts/BardAreaSongSkill.cs:CollectAuraCandidates — CollectAuraCandidates removes Monsters with aggroList.Count == 0. -->
            <!-- Source: server-scripts/PlayerSkills.cs:1035-1043 — RefreshBardSongAura runs every 0.5 seconds. -->
            <!-- Source: server-scripts/PlayerSkills.cs:1316-1331 — fresh casts call RefreshBardSongAura with freshCast true. -->
            <tr class="border-b border-border/50">
              <th class="py-3 pr-5 text-left font-medium text-foreground"
                >Harmful</th
              >
              <td class="py-3">
                Enemy monsters in range with a non-empty aggro list. They need
                not be fighting the Bard's party. Checked on each cast and every
                0.5-second aura update.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Source: server-scripts/PlayerSkills.cs:1333-1445, Buff.cs:9-25 — leaving removes an aura; a song without a buff category can restore the saved effect with its remaining duration and counters on re-entry. -->
      <p>
        Leaving a song's range removes that Bard's aura.<br />
        Returning can restore the remaining effect of a song that does not share a
        buff category with other songs.<br />
        If cleansing weakened a harmful effect, leaving and returning does not restore
        its original strength.
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:1348-1423, BardSongSkill.cs:35-71, Skills.cs:1207-1245 — songs with a buff category apply a fresh effect on re-entry. Aegis Aria is a Ward-category song in the exported skills. -->
      <p>
        Songs that share a buff category instead apply a fresh effect when you
        return to range.<br />
        Aegis Aria can restore its ward this way before the next cast.
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:1377-1437 — fresh casts reset attempted recipients, while ordinary aura updates do not retry resisted or removed uncategorized effects. -->
      <p>A resisted or removed aura needs a fresh song cast to apply again.</p>
      <!-- Source: server-scripts/BardSongSkill.cs:35-75 — songs in the same beneficial category compare stacking strength; an equal or stronger existing effect blocks the newcomer. -->
      <p>
        Similar beneficial songs in the same category do not stack.<br />
        The stronger effect wins, and an equal-strength effect already present stays
        in place.
      </p>
      <!-- Source: server-scripts/BardSongSkill.cs:26-31, Buff.cs:133-240 — Bard songs use Charisma scaling for eligible effect values. -->
      <!-- Source: server-scripts/Skills.cs:GetFinalHealOverTime and BuffSkill.cs:GetDebuffPowerAttribute — songs skip the Wisdom healing bonus and use Charisma before the Intelligence branch. -->
      <p>
        Each Charisma point adds 0.1% song power, up to +200%.<br />
        Wisdom and Intelligence do not change songs.<br />
        <MechanicsLink section="combat#buffs">Buff Scaling</MechanicsLink> gives the
        Charisma formulas and exceptions.<br />
        See the <EntityLink href="/classes/bard" name="Bard class page" /> for skills
        and ranks.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="cadence" class="bg-muted/30">
    <Card.Header><Card.Title>Final Cadence</Card.Title></Card.Header>
    <Card.Content class="space-y-5 text-sm text-muted-foreground">
      <!-- Source: server-scripts/BardFinalCadenceSkill.cs:63-70; exported-data/skills.json:152375 — maximum songs are required and the tooltip names the Melody bonus. -->
      <p>
        Final Cadence requires your maximum number of active songs. Its damage
        and healing use Charisma song power, then the Melody bonus below. Each
        value is rounded after Charisma scaling and again after the bonus.
      </p>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border text-foreground">
              <th class="py-2 pr-5 text-left font-medium"
                >Distinct songs cast by hand in the last 40 seconds</th
              >
              <th class="py-2 text-left font-medium">Damage and healing</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-5">0–3</td>
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

      <p>
        A song counts once, when you finish casting it yourself. Automatic
        repeats do not count. Casting Final Cadence clears the count, even if it
        hits no enemies. Bard mercenaries receive no Melody bonus.
      </p>
      <!-- Source: server-scripts/BardFinalCadenceSkill.cs:FindEnemies — enemies must be Monsters with nonempty aggroList and speed above -50, alive, non-hidden, same-zone, visible and attackable; Pet casts require IsEngagedWithParty. -->
      <p>
        Damage hits living, visible, attackable monsters within range in the
        same zone. They must have a non-empty aggro list and cannot be in Sleep
        (speed −50 or below). A player's cast does not require engagement with
        their own party. A mercenary's cast does.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="charm" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Bard Charm: Verse of Beguilement</Card.Title>
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
      <!-- Source: server-scripts/BardCharmSongSkill.cs:8-18,61-70,90-124, server-scripts/BuffSkill.cs:209-216, server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:27-40 — each nonnegative Charisma point lowers charm resistance by 0.02 percentage points; each extra monster level adds 2.5 percentage points; retained damage scales from 45% to at most 100%. -->
      <p>
        Each nonnegative Charisma point reduces the charm resist chance by 0.02
        percentage points.<br />
        Each magic resistance point adds 0.05 percentage points to the monster's base
        resist chance, up to 90% before other modifiers.<br />
        The base roll also changes by 0.5 percentage points per level of difference,
        up to 10 points either way.<br />
        Each level above the Bard adds another 2.5 percentage points.<br />
        The final resist chance cannot exceed 95%.<br />
        A charmed monster starts at 45% of its usual physical damage.<br />
        Each nonnegative Charisma point adds 0.045 percentage points to that share,
        up to 100%.
      </p>
      <!-- Source: server-scripts/Monster.cs:2476-2542,2564-2658 — the charmed creature follows its owner when idle and finds reachable nearby monsters that threaten the Bard's group. -->
      <p>
        The creature follows the Bard when it has no target.<br />
        It searches for nearby reachable monsters threatening the Bard or the Bard's
        party.<br />
        It does not automatically attack each monster the Bard selects.
      </p>
      <!-- Source: server-scripts/BardCharmSongSkill.cs:20-44,120-133, PlayerSkills.cs:1471-1484, Monster.cs:2349-2371 — an active charm is preferred for renewal, a different charm releases the old one, and another Bard's charm is invalid. -->
      <p>
        A Bard can control one charmed creature at a time.<br />
        Another Bard cannot take control of that creature while its charm lasts.<br
        />
        Selecting a different monster does not replace an active charm.<br />
        Releasing the old charm makes a new target possible.
      </p>
      <!-- Source: server-scripts/BardCharmSongSkill.cs:120-133, PlayerSkills.cs:1261-1313,1646-1653 — a successful charm is tracked as an active Bard song and occupies a slot. -->
      <p>
        Charm uses one active-song slot.<br />
        At the song limit, a successful charm can displace the least recently refreshed
        song.
      </p>
      <!-- Source: server-scripts/BardCharmSongSkill.cs:33-59, PlayerSkills.cs:CompleteBardSongCast; PlayerSkills.cs:2270-2302 — repeated casts keep the original charm target and require range and visibility to renew it. -->
      <p>
        Renewal keeps the existing creature as its target, even if the Bard
        selects another monster.<br />
        The creature must be within cast range and visible for renewal.
      </p>
      <!-- Source: server-scripts/Monster.cs:2446-2464,2545-2561,2850-2853, PlayerSkills.cs:1553-1573,1631-1643,1744-1748; ZoneTrigger.cs:94-100 — charm ends on removal or expiry, monster death, Bard death, zone separation, or leaving the server. -->
      <p>
        Charm ends if its effect expires or is removed, or if the creature dies.<br
        />
        It also ends if the Bard dies, changes zones, or leaves the game.
      </p>
      <!-- Source: server-scripts/Monster.cs:EndBardCharm; PlayerSkills.cs:StopBardCharm; ZoneTrigger.cs:94-100; Player.cs:11143-11149 — hostile release requires a living Bard within followDistance, not zone equality; zone changes and portals call StopBardCharm for peaceful release. -->
      <p>
        Expiry, stopping the song, or replacing a charm can make the released
        monster attack its living former Bard within its follow distance.
        Hostile release does not check matching zones.<br />
        Changing zones or using a portal releases the creature peacefully and frees
        the charm's song slot.
      </p>
    </Card.Content>
  </Card.Root>
</div>
