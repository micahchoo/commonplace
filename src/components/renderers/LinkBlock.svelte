<script>
  // Wave 1: frame the link + an always-present escape hatch.
  // Task 12 (Wave 2) adds the denylist skip → FallbackCard + the timed nudge.
  let { block } = $props();
  const url = $derived(block.link?.url || '');
</script>

<div class="at-link">
  <iframe
    title={block.title}
    src={url}
    referrerpolicy="strict-origin-when-cross-origin"
    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    loading="lazy"
  ></iframe>
  <a class="hatch" href={url} target="_blank" rel="noopener noreferrer">open in new tab ▸</a>
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
  }
</style>
