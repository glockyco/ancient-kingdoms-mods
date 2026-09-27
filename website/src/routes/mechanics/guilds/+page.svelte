<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";

  const SECTIONS = [
    { id: "membership", label: "Guild Membership" },
    { id: "guild-points", label: "Guild Points" },
  ];
</script>

<Seo
  title="Guilds - Ancient Kingdoms"
  description="Guild creation, character membership, invitations, succession, and boss guild points."
  path="/mechanics/guilds"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Guilds" },
    ]}
  />

  <h1 class="text-4xl font-bold">Guilds</h1>
  <PageSections sections={SECTIONS} />

  <Card.Root id="membership" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Guild Membership</Card.Title>
      <Card.Description
        >Creation, invitations, and who leads the guild.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Player.cs:11558-11577 and server-scripts/Database.cs:1238-1276,1837-1866 — registrar creation costs 10,000 gold, needs a guildless character and account without an owned guild; names have 3–20 permitted characters. -->
      <p>
        <span class="block"
          >At a Guild Registrar, a guildless character can create a guild for
          10,000 gold if their account leads no other guild.</span
        >
        <span class="block">Names must have 3–20 characters.</span>
        <span class="block"
          >Letters, numbers, spaces, apostrophes, hyphens, and underscores are
          allowed.</span
        >
      </p>
      <!-- Source: server-scripts/GuildSystem.cs:15-21 and server-scripts/Database.cs:1136-1157 — at most 10 member characters, counted from guild_members rows. -->
      <p>A guild holds up to 10 member characters, not 10 accounts.</p>
      <!-- Source: server-scripts/Database.cs:1123-1134,1169-1181,1383-1425 and server-scripts/UIGuildManagement.cs:168-185,246-267 — membership is per character, leader permissions belong to the owner account's enrolled characters, and a guildless owner-account alt can join the owned guild through Join if there is space. -->
      <p>
        <span class="block">Guild membership belongs to each character.</span>
        <span class="block"
          >Leadership permissions follow the owner account only while playing a
          character in its guild.</span
        >
        <span class="block"
          >A guildless alt on that account can Join the owned guild if a place
          is open.</span
        >
      </p>
      <!-- Source: server-scripts/Player.cs:11655-11690 and server-scripts/Database.cs:1293-1336 — guild leader invites a guildless online character by name through registrar and checks member capacity. -->
      <p>
        <span class="block"
          >The leader can invite an online guildless character by name at the
          registrar.</span
        >
        <span class="block">A full guild cannot invite another member.</span>
      </p>
      <!-- Source: server-scripts/GuildSystem.cs:15-25,32-71,93-155 and server-scripts/Player.cs:11622-11640,11678-11689 — invitation lasts five minutes; declining blocks that account from that guild's invites for three hours in the server session. -->
      <p>
        <span class="block">An invitation expires after 5 minutes.</span>
        <span class="block"
          >Declining blocks that guild's invitations to the same account for 3
          hours during the current server session.</span
        >
      </p>
      <!-- Source: server-scripts/Player.cs:11706-11721 and server-scripts/Database.cs:1428-1461,1768-1782 — registrar departure removes that character, resets points, promotes earliest-joined member when owner character leaves, and deletes empty guild. -->
      <p>
        <span class="block"
          >Leaving at the registrar removes only that character and clears its
          guild points.</span
        >
        <span class="block"
          >If the recorded leader character leaves, the earliest-joined member
          becomes leader.</span
        >
        <span class="block">An empty guild is deleted.</span>
      </p>
      <!-- Source: server-scripts/Database.cs:2161-2170,2900-2902,2942-2946 and server-scripts/GuildSystem.cs:179-250,359-446 — character save carries guild state; online players on one server synchronize, with membership authoritative when a leader is present. -->
      <p>
        <span class="block">Guild state is saved with each character.</span>
        <span class="block"
          >Online guildmates on the same server synchronize their data.</span
        >
        <span class="block"
          >When the leader is present, the leader's membership record decides
          who remains a member.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="guild-points" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Guild Points</Card.Title>
      <Card.Description
        >Boss kills credit one guild member's character.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Monster.cs:2901-2917,2930-2942 and server-scripts/GuildSystem.cs:266-279 — credited highest-threat player receives points only when the monster is a boss and the player belongs to a guild; pets resolve to owner. -->
      <p>
        <span class="block">Only a boss kill grants guild points.</span>
        <span class="block"
          >The boss's highest-threat participant gets credit, not necessarily
          the last hitter.</span
        >
        <span class="block">A mercenary or combat pet credits its owner.</span>
        <span class="block"
          >Only that credited player gains points if guilded.</span
        >
      </p>
      <!-- Source: server-scripts/GuildSystem.cs:27-29,266-279 — reward is ceil(max(1, boss level) / 5), at least one; non-boss elites are excluded. -->
      <p>
        <span class="block"
          >The reward is <span class="font-mono"
            >ceil(max(1, boss level) / 5)</span
          >.</span
        >
        <span class="block">A non-boss elite grants no guild points.</span>
      </p>
      <!-- Source: server-scripts/GuildSystem.cs:27-29 — examples of ceil(max(1, level) / 5). -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-6 text-left font-medium">Boss level</th>
              <th class="py-2 text-left font-medium">Guild points</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border/50"
              ><td class="py-2 pr-6">1</td><td class="py-2">1</td></tr
            >
            <tr class="border-b border-border/50"
              ><td class="py-2 pr-6">6</td><td class="py-2">2</td></tr
            >
            <tr><td class="py-2 pr-6">50</td><td class="py-2">10</td></tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/GuildSystem.cs:267-278,400-430 and server-scripts/Database.cs:1207-1235,1349-1367,1428-1450 — points are credited to character save, displayed by member, start at zero on join, clear on leave and synchronize for online guildmates. -->
      <p>
        <span class="block"
          >Points belong to the credited character, not every guildmate or alt.</span
        >
        <span class="block"
          >New members start at zero, and leaving clears that character's
          contribution.</span
        >
        <span class="block"
          >Online guildmates on the same server receive updated member data.</span
        >
      </p>
    </Card.Content>
  </Card.Root>
</div>
