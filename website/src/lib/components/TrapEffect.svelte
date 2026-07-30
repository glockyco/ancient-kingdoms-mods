<script lang="ts">
  interface Props {
    effectSkillId: string | null;
    effectSkillName: string | null;
    teleportZoneId: string | null;
    teleportZoneName: string | null;
  }

  let {
    effectSkillId,
    effectSkillName,
    teleportZoneId,
    teleportZoneName,
  }: Props = $props();
</script>

{#if effectSkillId && effectSkillName}
  <a
    href="/skills/{effectSkillId}"
    class="text-blue-600 dark:text-blue-400 hover:underline"
  >
    {effectSkillName}
  </a>
{:else if teleportZoneId && teleportZoneName}
  <span>Teleports to&nbsp;</span><a
    href="/zones/{teleportZoneId}"
    class="text-blue-600 dark:text-blue-400 hover:underline"
  >
    {teleportZoneName}
  </a>
{:else}
  <span class="text-muted-foreground">Unknown effect</span>
{/if}
