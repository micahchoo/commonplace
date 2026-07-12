<script>
  // Frames an external link. Sites known to refuse framing are routed to a card by
  // Stage (via the denylist); everything else is framed inline here. A static app
  // can't detect a framing refusal at runtime, so the "open in new tab" escape hatch
  // is ALWAYS visible — it's the safety net for any refuser the denylist misses (which
  // otherwise paints a blank frame). The sandbox omits allow-top-navigation to block
  // redirect hijacking.
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
    box-shadow: var(--an-shadow-1) 2px 2px 0;
    padding: 4px 8px;
    font: 13px/1 var(--an-font);
    color: var(--an-accent);
    text-decoration: none;
  }
  .hatch:hover {
    box-shadow: var(--an-shadow-1) 2px 2px 0, 4px 4px 0 var(--an-shadow-2);
  }
</style>
