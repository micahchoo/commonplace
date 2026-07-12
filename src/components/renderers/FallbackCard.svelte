<script>
  let { block } = $props();

  const thumb = $derived(block?.link?.thumb || block?.image?.thumb || block?.image?.src);
  const provider = $derived(block?.link?.provider || '');
  const href = $derived(block?.link?.url || block?.attachment?.url || '');
</script>

<div class="at-fallback">
  {#if thumb}
    <img src={thumb} alt="" />
  {/if}
  <div class="meta">
    <strong>{block?.title}</strong>
    {#if provider}<span class="provider">{provider} · won't frame</span>{/if}
    {#if href}
      <a href={href} target="_blank" rel="noopener noreferrer">open in new tab ▸</a>
    {/if}
  </div>
</div>

<style>
  .at-fallback {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    max-width: 340px;
    background: #fff;
    border: 1px solid var(--an-border);
    box-shadow: var(--an-shadow-1) 3px 3px 0, 6px 6px 0 var(--an-shadow-2);
    padding: 12px;
    font-family: var(--an-font);
  }
  .at-fallback img {
    width: 100%;
    max-height: 200px;
    object-fit: cover;
    display: block;
    margin-bottom: 8px;
  }
  .meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--an-text);
  }
  .provider {
    font-size: 12px;
  }
  .at-fallback a {
    color: var(--an-accent);
  }
</style>
