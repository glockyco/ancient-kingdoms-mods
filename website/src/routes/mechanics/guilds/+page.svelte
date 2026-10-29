<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
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
  <PageSections sections={MECHANICS_SECTIONS["/mechanics/guilds"]} />

  <Card.Root id="membership" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Guild membership</Card.Title>
      <Card.Description
        >Create a guild at a Guild Registrar. It holds up to 10 members,
        including its leader.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Player.cs:UserCode_CmdCreateGuild__String; Database.cs:CreateGuild; Database.cs:TryNormalizeGuildName — registrar creation costs 10,000 gold, needs a guildless character and account without an owned guild; names have 3–20 permitted characters. -->
      <p>
        <span class="block"
          >At a <a
            href="/npcs?npcs.role_keys=is_guild_management"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Guild Registrar</a
          >, you can create a guild for 10&#8239;000 gold if your character
          belongs to no guild and your account leads no other guild.</span
        >
        <span class="block"
          >Guild names can use 3 to 20 letters, numbers, spaces, apostrophes,
          hyphens, or underscores.</span
        >
      </p>
      <!-- Source: server-scripts/GuildSystem.cs:17; Database.cs:1160-1177 — at most 10 member characters, counted from guild_members rows. -->
      <p>A guild holds up to 10 member characters, not 10 accounts.</p>
      <!-- Source: server-scripts/Database.cs:1147-1158,1193-1205,1407-1449 and server-scripts/UIGuildManagement.cs:168-185,246-267 — membership is per character, leader permissions apply to guild members on the leader's account, and a guildless character on that account can join through Join if there is space. -->
      <p>
        <span class="block"
          >Every guild member on the leader's account has leader permissions.</span
        >
        <span class="block"
          >Another character on that account can join the guild if it has room.</span
        >
      </p>
      <!-- Source: server-scripts/Player.cs:12215-12250 and server-scripts/Database.cs:1317-1360 — guild leader invites a guildless online character by name through registrar and checks member capacity. -->
      <p>
        <span class="block"
          >The leader can invite an online guildless character by name at the
          registrar.</span
        >
        <span class="block">A full guild cannot invite another member.</span>
      </p>
      <!-- Source: server-scripts/GuildSystem.cs:15-25,32-71,93-155 and server-scripts/Player.cs:12182-12200,12238-12249 — invitation lasts five minutes; declining blocks that account from that guild's invites for three hours in the server session. -->
      <p>
        <span class="block">An invitation expires after 5 minutes.</span>
        <span class="block"
          >Declining stops that guild from inviting any character on your
          account for 3 hours, or until the server restarts.</span
        >
      </p>
      <!-- Source: server-scripts/Player.cs:12266-12281 and server-scripts/Database.cs:1452-1485,1792-1806 — registrar departure removes that character, resets points, promotes earliest-joined member when owner character leaves, and deletes empty guild. -->
      <p>
        <span class="block"
          >Leaving at the registrar removes only that character and clears its
          guild points.</span
        >
        <span class="block"
          >If the leader's character leaves, the member who joined first becomes
          leader.</span
        >
        <span class="block">An empty guild is deleted.</span>
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="guild-points" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Guild points</Card.Title>
      <Card.Description
        >The character credited with a boss kill earns guild points if they
        belong to a guild.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/GuildSystem.cs:AwardBossKillGuildPoints; server-scripts/UIGuildManagement.cs:Refresh; server-scripts/Database.cs:GetGuildManagementText — boss kills grant character-specific points, displayed for the player and as GP beside each member. -->
      <p>The guild window lists each member's contribution as GP.</p>
      <!-- Source: server-scripts/Monster.cs:2979-2995,3008-3020 and server-scripts/GuildSystem.cs:266-279 — credited highest-threat player receives points only when the monster is a boss and the player belongs to a guild; pets resolve to owner. -->
      <p>
        Only the character with <a
          href="/mechanics/party#shared-rewards"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >kill credit</a
        > earns points, not the whole party. The highest-threat participant gets credit,
        not necessarily the last hitter. Your mercenary, companion or charmed monster
        credits you.
      </p>
      <!-- Source: server-scripts/GuildSystem.cs:27-29,266-279 — reward is ceil(max(1, boss level) / 5), at least one; non-boss elites are excluded. -->
      <p>
        <span class="block"
          >A boss grants 1 guild point per 5 boss levels, rounded up.</span
        >
      </p>
      <!-- Source: server-scripts/GuildSystem.cs:GetBossGuildPointReward; website/data/compendium.db:monsters — examples use the displayed levels of real bosses. -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-6 text-left font-medium">Boss (level)</th>
              <th class="py-2 text-left font-medium">Guild points</th>
            </tr>
          </thead>
          <tbody>
            {#each data.bossExamples as boss (boss.id)}
              <tr class="border-b border-border/50">
                <td class="py-2 pr-6"
                  ><a
                    href="/monsters/{boss.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >{boss.name}</a
                  >
                  ({boss.level})</td
                >
                <td class="py-2">{Math.max(1, Math.ceil(boss.level / 5))}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/GuildSystem.cs:267-278,400-430 and server-scripts/Database.cs:1231-1259,1373-1391,1452-1474 — points are credited to character save, displayed by member, start at zero on join, clear on leave and synchronize for online guildmates. -->
      <p>
        <span class="block"
          >Points belong to the credited character, not guildmates or your other
          characters.</span
        >
        <span class="block">A new member starts at 0.</span>
      </p>
    </Card.Content>
  </Card.Root>
</div>
