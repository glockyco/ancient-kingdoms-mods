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
      <Card.Title>Guild Membership</Card.Title>
      <Card.Description
        >Create a guild at a registrar for up to 10 characters, including its
        leader.</Card.Description
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
          >, a guildless character can create a guild for 10,000 gold if their
          account leads no other guild.</span
        >
        <span class="block">Names must have 3–20 characters.</span>
        <span class="block"
          >Letters, numbers, spaces, apostrophes, hyphens, and underscores are
          allowed.</span
        >
      </p>
      <!-- Source: server-scripts/GuildSystem.cs:17; Database.cs:1158-1175 — at most 10 member characters, counted from guild_members rows. -->
      <p>A guild holds up to 10 member characters, not 10 accounts.</p>
      <!-- Source: server-scripts/Database.cs:1145-1156,1191-1203,1405-1447 and server-scripts/UIGuildManagement.cs:168-185,246-267 — membership is per character, leader permissions belong to the owner account's enrolled characters, and a guildless owner-account alt can join the owned guild through Join if there is space. -->
      <p>
        <span class="block">Guild membership belongs to each character.</span>
        <span class="block"
          >The owner account can use leader permissions only through a character
          in its guild.</span
        >
        <span class="block"
          >Another character on the owner account can join that guild if it has
          room.</span
        >
      </p>
      <!-- Source: server-scripts/Player.cs:11992-12027 and server-scripts/Database.cs:1315-1358 — guild leader invites a guildless online character by name through registrar and checks member capacity. -->
      <p>
        <span class="block"
          >The leader can invite an online guildless character by name at the
          registrar.</span
        >
        <span class="block">A full guild cannot invite another member.</span>
      </p>
      <!-- Source: server-scripts/GuildSystem.cs:15-25,32-71,93-155 and server-scripts/Player.cs:11959-11977,12015-12026 — invitation lasts five minutes; declining blocks that account from that guild's invites for three hours in the server session. -->
      <p>
        <span class="block">An invitation expires after 5 minutes.</span>
        <span class="block"
          >Declining blocks that guild's invitations to the same account for 3
          hours during the current server session.</span
        >
      </p>
      <!-- Source: server-scripts/Player.cs:12043-12058 and server-scripts/Database.cs:1450-1483,1790-1804 — registrar departure removes that character, resets points, promotes earliest-joined member when owner character leaves, and deletes empty guild. -->
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
      <!-- Source: server-scripts/Database.cs:2184-2193,2986-2988,3029-3033 and server-scripts/GuildSystem.cs:179-250,359-446 — character save carries guild state; online players on one server synchronize, with membership authoritative when a leader is present. -->
      <p>
        <span class="block">Each character saves its own guild membership.</span
        >
        <span class="block"
          >Online guildmates on the same server receive membership updates.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="guild-points" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Guild Points</Card.Title>
      <Card.Description
        >A guilded player credited with a boss kill earns points for that
        character.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/GuildSystem.cs:AwardBossKillGuildPoints; server-scripts/UIGuildManagement.cs:Refresh; server-scripts/Database.cs:GetGuildManagementText — boss kills grant character-specific points, displayed for the player and as GP beside each member. -->
      <p>
        Guild points record a character's boss-kill contribution. The guild
        window shows your total and lists each member's guild points as GP.
      </p>
      <!-- Source: server-scripts/Monster.cs:2916-2932,2945-2957 and server-scripts/GuildSystem.cs:266-279 — credited highest-threat player receives points only when the monster is a boss and the player belongs to a guild; pets resolve to owner. -->
      <p>
        <span class="block">Only a boss kill grants guild points.</span>
        <span class="block"
          >The boss's highest-threat participant gets credit, not necessarily
          the last hitter.</span
        >
        <span class="block">A mercenary or companion credits its owner.</span>
        <span class="block"
          >Only the credited player receives guild points, if they belong to a
          guild.</span
        >
      </p>
      <!-- Source: server-scripts/GuildSystem.cs:27-29,266-279 — reward is ceil(max(1, boss level) / 5), at least one; non-boss elites are excluded. -->
      <p>
        <span class="block"
          >A boss grants one guild point per five levels, rounded up, with at
          least one point.</span
        >
        <span class="block">A non-boss elite grants no guild points.</span>
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
      <!-- Source: server-scripts/GuildSystem.cs:267-278,400-430 and server-scripts/Database.cs:1229-1257,1371-1389,1450-1472 — points are credited to character save, displayed by member, start at zero on join, clear on leave and synchronize for online guildmates. -->
      <p>
        <span class="block"
          >Points belong to the credited character, not every guildmate or alt.</span
        >
        <span class="block"
          >New members start at zero, and leaving clears that character's
          contribution.</span
        >
        <span class="block"
          >Online guildmates on the same server see updated member points.</span
        >
      </p>
    </Card.Content>
  </Card.Root>
</div>
