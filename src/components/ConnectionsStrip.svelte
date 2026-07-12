<script>
  // Sideways jumps to connected channels. On-path channels are already filtered out
  // by nav (#loadConnections). A jump reroots the breadcrumb.
  let { connections = [], onjump } = $props();
</script>

{#if connections.length}
  <div class="at-connections">
    <span class="lead">&lt;-&gt; connected:</span>
    {#each connections as c (c.slug)}
      <button type="button" onclick={() => onjump?.(c.slug, c.title)}>&gt;{c.title}</button>
    {/each}
  </div>
{/if}

<style>
  .at-connections {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px dotted currentColor;
    font-size: 13px;
  }
  .lead {
    opacity: 0.7;
  }
  .at-connections button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--an-text);
    font: inherit;
  }
  .at-connections button:hover {
    color: var(--an-accent);
  }
</style>
