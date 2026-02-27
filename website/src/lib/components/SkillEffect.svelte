<script lang="ts">
  interface Props {
    // Precomputed effect text from formatSkillEffect
    effect: string;
    // Linked entity for summon skills — name as it appears in the effect string
    entityName?: string | null;
    // href for the entity link (/monsters/<id> or /pets/<id>)
    entityHref?: string | null;
    class?: string;
  }

  let {
    effect,
    entityName = null,
    entityHref = null,
    class: className,
  }: Props = $props();

  // Split effect text on the entity name to insert the link inline.
  // The formatter always uses entityName verbatim inside the effect string.
  const parts = $derived((): Array<{ text: string; linked: boolean }> => {
    if (!entityName || !entityHref || !effect.includes(entityName)) {
      return [{ text: effect, linked: false }];
    }
    const idx = effect.indexOf(entityName);
    const before = effect.slice(0, idx);
    const after = effect.slice(idx + entityName.length);
    return [
      ...(before ? [{ text: before, linked: false }] : []),
      { text: entityName, linked: true },
      ...(after ? [{ text: after, linked: false }] : []),
    ];
  });
</script>

<span class={className}>
  {#each parts() as part, i (i)}
    {#if part.linked && entityHref}
      <a
        href={entityHref}
        class="text-blue-600 dark:text-blue-400 hover:underline">{part.text}</a
      >
    {:else}
      {part.text}
    {/if}
  {/each}
</span>
