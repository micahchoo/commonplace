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
    {#if provider}<span class="provider">{provider}</span>{/if}
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
    width: min(560px, 92vw);
    background: #fff;
    border: 1px solid var(--an-border);
    box-shadow: var(--an-shadow-1) 3px 3px 0, 6px 6px 0 var(--an-shadow-2);
    padding: 16px;
    font-family: var(--an-font);
  }
  .at-fallback img {
    width: 100%;
    max-height: 46vh;
    object-fit: cover;
    display: block;
    margin-bottom: 12px;
  }
  .at-fallback strong {
    font-size: 1.05rem;
    line-height: 1.3;
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
    align-self: flex-start;
    margin-top: 4px;
    padding: 4px 10px;
    border: 1px solid var(--an-border);
    color: var(--an-accent);
    text-decoration: none;
    box-shadow: var(--an-shadow-1) 2px 2px 0;
  }
  .at-fallback a:hover {
    box-shadow: var(--an-shadow-1) 2px 2px 0, 4px 4px 0 var(--an-shadow-2);
  }
</style>
