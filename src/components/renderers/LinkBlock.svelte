<script>
  // Frames an external link. Denylist gating + the retain-behind-card overlay are
  // owned by Stage; here the escape hatch is always present and grows prominent a
  // couple of seconds in (a time-based nudge — `load` fires even on blocked frames,
  // so it can't be onload-based). sandbox omits allow-top-navigation (blocks redirect
  // hijack).
  let { block } = $props();
  const url = $derived(block.link?.url || '');

  let prominent = $state(false);
  $effect(() => {
    prominent = false;
    const id = setTimeout(() => (prominent = true), 2000);
    return () => clearTimeout(id);
  });
</script>

<div class="at-link">
  <iframe
    title={block.title}
    src={url}
    referrerpolicy="strict-origin-when-cross-origin"
    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    loading="lazy"
  ></iframe>
  <a class="hatch" class:prominent href={url} target="_blank" rel="noopener noreferrer">
    open in new tab ▸
  </a>
</div>

<style>
  .at-link,
  .at-link iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
  .hatch {
    position: fixed;
    right: 12px;
    bottom: 12px;
    z-index: 5;
    background: var(--an-panel-bg);
    border: 1px solid var(--an-border);
    padding: 4px 8px;
    font: 13px/1 var(--an-font);
    color: var(--an-accent);
    text-decoration: none;
    opacity: 0.5;
    transition: opacity 0.4s, box-shadow 0.4s;
  }
  .hatch.prominent {
    opacity: 1;
    box-shadow: var(--an-shadow-1) 2px 2px 0;
  }
</style>
