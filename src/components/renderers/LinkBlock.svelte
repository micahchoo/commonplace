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
  /* Centered so it's the clear call-to-action when the frame comes up blank (an
     unlisted refuser) — most links that reach here refuse framing. On a page that
     does frame, it's a compact centered pill over the content. */
  .hatch {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 5;
    background: var(--an-panel-bg);
    border: 1px solid var(--an-border);
    box-shadow: var(--an-shadow-1) 3px 3px 0, 6px 6px 0 var(--an-shadow-2);
    padding: 10px 16px;
    font: 15px/1 var(--an-font);
    color: var(--an-accent);
    text-decoration: none;
  }
  .hatch:hover {
    background: var(--an-accent);
    color: var(--an-panel-bg);
  }
</style>
