<!--
  What the game and the compendium are, at the end of both home layouts. Both
  layouts are in the page at once, so the section carries no id.
-->
<script lang="ts">
  import {
    AK_MONITOR_DISCORD_URL,
    STEAM_STORE_URL,
  } from "$lib/constants/links";
</script>

<section>
  <h2 class="sr-only">About the compendium</h2>
  <div
    class="max-w-[70ch] space-y-3 text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground"
  >
    <p>
      <strong class="text-foreground">Ancient Kingdoms</strong> is a 2D
      pixel-art RPG by Ancient Pixels, inspired by classic MMORPGs. You can play
      alone or in co-op in the world of Eratiath. The game is in
      <a
        href={STEAM_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="text-foreground underline underline-offset-2"
      >
        Early Access on Steam</a
      >.
    </p>
    <p>
      The <strong class="text-foreground">Ancient Kingdoms Compendium</strong> is
      a fan-made wiki, interactive world map, and searchable game database. We update
      the listings from game files after each patch. They cover items, monsters, NPCs,
      zones, quests, skills, classes, professions, and more.
    </p>
    <p>
      Do you run a server? <a
        href={AK_MONITOR_DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="text-foreground underline underline-offset-2"
      >
        Ancient Kingdoms Monitor</a
      > by Thero manages a dedicated server from a desktop app: restarts, crash recovery,
      SteamCMD updates, backups, and RCON. The monitor is a separate community project,
      not part of the compendium.
    </p>
  </div>
</section>
