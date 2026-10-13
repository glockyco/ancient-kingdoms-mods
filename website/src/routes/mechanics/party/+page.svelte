<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import Calculation from "$lib/components/Calculation.svelte";
  import { partyGold } from "$lib/calculation/party";

  const SECTIONS = [
    { id: "party", label: "Party" },
    { id: "shared-rewards", label: "Shared Rewards" },
    { id: "loot-rolls", label: "Need, Greed, and Pass" },
    { id: "chat-and-follow", label: "Chat and Follow" },
  ];
</script>

<Seo
  title="Party and Loot - Ancient Kingdoms"
  description="Party places, shared rewards, Need and Greed loot rolls, chat channels, and following players."
  path="/mechanics/party"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Party and Loot" },
    ]}
  />

  <h1 class="text-4xl font-bold">Party and Loot</h1>
  <PageSections sections={SECTIONS} />

  <Card.Root id="party" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Party</Card.Title>
      <!-- Source: server-scripts/Party.cs:9,48-75 and server-scripts/PlayerParty.cs:91-140 — five shared player and active-mercenary places. -->
      <Card.Description
        >Each player or active mercenary occupies one of five party places.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Party.cs:9,48-75 and server-scripts/PlayerParty.cs:91-140 — each player and each active mercenary occupies one of five places; other pets are not counted. -->
      <p>
        <span class="block"
          >A player with two active mercenaries uses three of the five places.</span
        >
        <span class="block"
          ><a
            href="/summons"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Companions, familiars, and pets</a
          > use none.</span
        >
      </p>
      <!-- Source: server-scripts/PlayerParty.cs:91-140 — capacity counts active mercenary references without checking health. -->
      <p>An active mercenary still uses a place while dead.</p>
      <!-- Source: server-scripts/PlayerParty.cs:219-253,267-292 — invitee must be online, partyless and out of combat; capacity is checked at invitation and acceptance, including mercenaries. -->
      <p>
        <span class="block"
          >Invite an online player who is not in a party or in combat.</span
        >
        <span class="block"
          >The game checks that a place is available again when the invited
          player accepts.</span
        >
      </p>
      <!-- Source: server-scripts/Party.cs:master; PartySystem.cs:FormParty,AddToParty,LeaveParty,KickFromParty,DismissParty; PlayerParty.cs:UserCode_CmdInvite__String — any member can invite; the first remaining member leads a party that continues after its leader leaves. -->
      <p>
        <span class="block"
          >The player who starts the party leads it. Any member can invite.</span
        >
        <span class="block"
          >If the party continues after the leader leaves, the remaining member
          who joined earliest becomes leader.</span
        >
        <span class="block"
          >Only the leader can remove a member or dismiss the party.</span
        >
      </p>
      <!-- Source: server-scripts/PartySystem.cs:60-85 and server-scripts/PlayerParty.cs:54-66 — members can leave; one remaining player dissolves the party; leader destruction dismisses it. -->
      <p>
        <span class="block">Any member can leave the party.</span>
        <span class="block"
          >The party dissolves when fewer than two players remain, even if
          mercenaries remain.</span
        >
        <span class="block"
          >The party also dissolves if its leader disconnects.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="shared-rewards" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Shared Rewards</Card.Title>
      <!-- Source: server-scripts/Monster.cs:2945-2957,3117-3144 — nearby party members receive loot access and experience on a credited kill. -->
      <Card.Description
        >Nearby party players can share loot and XP from a monster kill.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Monster.cs:2916-2932,2945-2957 — maximum threat determines credited player; pet and charmed-monster threat resolves to owner; party proximity grants loot access at death. -->
      <p>
        <span class="block"
          >The monster's highest-threat opponent gets kill credit.</span
        >
        <span class="block"
          >A mercenary, companion, or charmed monster credits its owner.</span
        >
        <span class="block"
          >Nearby party members gain loot access when the monster dies.</span
        >
      </p>
      <!-- Source: server-scripts/PlayerParty.cs:74-88 — party proximity checks network observers and strictly less than 40 world units from the relevant player. -->
      <p>
        Sharing requires party members to be closer than 40 yd to the credited
        player and to have that player loaded in their game. This is not a
        stealth check.
      </p>
      <!-- Source: server-scripts/Monster.cs:3117-3144 — kill XP uses nearby players around the credited player, their highest level and living recipients; mercenaries are not separate recipients. -->
      <p>
        See <MechanicsLink section="experience#kill-xp"
          >Experience</MechanicsLink
        >
        for the kill XP sharing calculation.
      </p>
      <!-- Source: server-scripts/PlayerLooting.cs:149-168 and server-scripts/PlayerParty.cs:74-88 — gold is shared around its picker, each recipient receives the ceiling of gold divided by nearby member count. -->
      <p>
        <span class="block">Nearby party players share collected gold.</span>
        <span class="block">Distance is measured from the gold collector.</span>
      </p>
      <Calculation calculation={partyGold()} />
      <!-- Source: server-scripts/PlayerLooting.cs:108-147 — matching unfinished GatherQuest objectives advance for nearby party members on monster or chest pickup; the loot is consumed rather than copied. -->
      <p>
        <span class="block"
          >A gather-quest drop from a dead monster or chest can advance each
          nearby member's matching unfinished quest.</span
        >
        <span class="block">Quest progress does not duplicate the item.</span>
      </p>
      <!-- Source: server-scripts/PlayerLooting.cs:177-203 and server-scripts/Monster.cs:4570-4609 — ordinary loot goes into the collector's inventory; qualifying shared drops enter group rolls. -->
      <p>
        <span class="block"
          >Items that do not require a roll go to the collector.</span
        >
        <span class="block"
          >Shared drops that require a roll go to the winner instead.</span
        >
        <span class="block"
          >See <a
            href="/mechanics/inventory#loot"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >Loot Pickup</a
          > for which items roll.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="loot-rolls" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Need, Greed, and Pass</Card.Title>
      <Card.Description
        >Choose Need, Greed, or Pass when a shared item goes to a party roll.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/ItemsRollSystem.cs:39-79,188-197 and server-scripts/UIRollForItem.cs:60-67 — 120-second deadline, early resolution once all answer, unanswered choices treated as passes after expiry. -->
      <p>
        <span class="block"
          >Each player offered the roll has up to 120 seconds to answer.</span
        >
        <span class="block">The roll resolves sooner if everyone answers.</span>
        <span class="block">No answer by the deadline counts as Pass.</span>
      </p>
      <!-- Source: server-scripts/Player.cs:13851-13857 and server-scripts/ItemsRollSystem.cs:53-79,175-182 — Need rolls exceed Greed rolls; highest result wins, and all-pass awards nobody. -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-6 text-left font-medium">Choice</th>
              <th class="py-2 text-left font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-6 font-medium">Need</td>
              <td class="py-2">
                <span class="block">Need beats every Greed roll.</span>
                <span class="block">The highest Need result wins.</span>
              </td>
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-6 font-medium">Greed</td>
              <td class="py-2"
                >The highest Greed result wins if nobody chooses Need.</td
              >
            </tr>
            <tr>
              <td class="py-2 pr-6 font-medium">Pass</td>
              <td class="py-2">
                <span class="block">Pass cannot win the item.</span>
                <span class="block"
                  >If everyone passes, nobody receives the item.</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/UIRollForItem.cs:69-102 — Need and Greed both check inventory capacity, without an equipment-class restriction on Need. -->
      <p>
        <span class="block"
          >Both Need and Greed require inventory space when selected.</span
        >
        <span class="block"
          >Need does not check whether your class can equip the item.</span
        >
      </p>
      <!-- Source: server-scripts/ItemsRollSystem.cs:95-173 — eligible equipment can equip directly; otherwise inventory add is tried, followed by an empty bank slot and then an empty house-chest slot; no space loses the item. -->
      <p>
        <span class="block"
          >If a won item needs inventory space after the roll and no longer
          fits, the game tries an <a
            href="/mechanics/inventory#bank"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >empty bank slot</a
          >, then an
          <a
            href="/mechanics/inventory#house-chests"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >empty house-chest slot</a
          >.</span
        >
        <span class="block">With neither available, the item is lost.</span>
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="chat-and-follow" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Chat and Follow</Card.Title>
      <Card.Description
        >Choose a message audience or follow another player.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/UIChat.cs:78-82 and server-scripts/PlayerChat.cs:24-90,437-545 — command prefixes and local, online whisper, party, guild and who recipients. -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-6 text-left font-medium">Prefix</th>
              <th class="py-2 text-left font-medium">Audience or result</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border/50"
              ><td class="py-2 pr-6 font-mono">None</td><td class="py-2"
                >Players near you</td
              ></tr
            >
            <tr class="border-b border-border/50"
              ><td class="py-2 pr-6 font-mono">/w Name</td><td class="py-2"
                >Private message to an online character</td
              ></tr
            >
            <tr class="border-b border-border/50"
              ><td class="py-2 pr-6 font-mono">/p</td><td class="py-2"
                >Online party members, regardless of proximity</td
              ></tr
            >
            <tr class="border-b border-border/50"
              ><td class="py-2 pr-6 font-mono">/g</td><td class="py-2"
                >Online members of your <a
                  href="/mechanics/guilds"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  >guild</a
                ></td
              ></tr
            >
            <tr
              ><td class="py-2 pr-6 font-mono">/</td><td class="py-2"
                >List online characters and their zones</td
              ></tr
            >
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/PlayerChat.cs:UserCode_CmdMsgLocal__String__String — local messages exceeding 120 characters are discarded. -->
      <p>Local messages longer than 120 characters are not sent.</p>
      <!-- Source: server-scripts/PlayerChat.cs:457-504,540-546 — party/guild chat requires membership; whispers only reach online characters. -->
      <p>
        <span class="block">Party and guild chat require membership.</span>
        <span class="block">Whispers do not reach offline characters.</span>
      </p>
      <!-- Source: server-scripts/PlayerChat.cs:35-38 and server-scripts/Player.cs:3885-3905,3968-3989 — /follow selects another living player in the same zone and only moves the follower within 1 unit; no party check or attack action. -->
      <p>
        <span class="block"
          >Select a living player in your zone and enter <code>/follow</code
          >.</span
        >
        <span class="block">Party membership is not required.</span>
        <span class="block">Following only moves you toward the player.</span>
        <span class="block"
          >You stop moving within 1 yd of the player and keep following when
          they move.</span
        >
      </p>
      <!-- Source: server-scripts/Player.cs:3908-3931,3935-3967 — movement and skill input, either death, missing or hidden target, zone change, and a target move over 8 units cancel follow. -->
      <p>
        <span class="block"
          >Moving manually or using a skill cancels follow.</span
        >
        <span class="block"
          >Either player's death, a hidden or absent target, a zone change, or a
          target jump over 8 yd also ends following.</span
        >
      </p>
    </Card.Content>
  </Card.Root>
</div>
