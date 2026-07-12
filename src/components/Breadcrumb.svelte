<script>
  // crumbs: [{slug|null, title}] — first is the synthetic root. onnavigate(depth)
  // pops to that many path nodes kept (0 = root).
  let { crumbs = [], onnavigate } = $props();
</script>

<nav class="at-crumbs">
  {#each crumbs as c, i (i)}
    {#if i > 0}<span class="sep">/</span>{/if}
    {#if i < crumbs.length - 1}
      <button type="button" onclick={() => onnavigate?.(i)}>
        {#if i === 0}‹ {/if}{c.title}
      </button>
    {:else}
      <span class="current">{c.title}</span>
    {/if}
  {/each}
</nav>

<style>
  .at-crumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: baseline;
    margin-bottom: 6px;
    font-size: 13px;
  }
  .at-crumbs button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--an-text);
    font: inherit;
  }
  .at-crumbs button:hover {
    color: var(--an-accent);
  }
  .current {
    color: var(--an-accent);
  }
  .sep {
    opacity: 0.5;
  }
</style>
