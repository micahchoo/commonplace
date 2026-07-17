<script>
  // A link block is always presented on the white stage as: the page framed inline on
  // the left (when the site allows framing) and a preview card on the right (always).
  // A static app can't detect a framing refusal at runtime, so we DON'T point an iframe
  // at a site on the denylist — that would let the browser paint its own opaque "can't
  // display" error page over the stage. Instead the left area stays blank white and the
  // card is the way in. The sandbox omits allow-top-navigation to block redirect hijacking.
  import { isDenylisted } from '../../lib/denylist.js';

  let { block } = $props();
  const url = $derived(block.link?.url || '');
  const framed = $derived(!!url && !isDenylisted(url));
  const img = $derived(block.image);
  const host = $derived(hostOf(url));

  function hostOf(u) {
    try {
      return new URL(u).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }
</script>

<div class="at-link">
  <div class="frame" class:blank={!framed}>
    {#if framed}
      <iframe
        title={block.title}
        src={url}
        referrerpolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        loading="lazy"
      ></iframe>
    {/if}
  </div>

  <aside class="card">
    {#if img?.src}
      <img class="thumb" src={img.src} srcset={img.srcset} alt={img.alt || ''} />
    {/if}
    <div class="meta">
      <strong class="title">{block.title}</strong>
      {#if host}<span class="host">{host}</span>{/if}
      <a class="open" href={url} target="_blank" rel="noopener noreferrer">open in new tab ▸</a>
    </div>
  </aside>
</div>

<style>
  .at-link {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: stretch;
    gap: 24px;
    padding: 24px;
    box-sizing: border-box;
    background: #fff;
  }
  /* The framed page lives inside the white stage; a known refuser leaves this blank. */
  .frame {
    flex: 1 1 auto;
    min-width: 0;
  }
  .frame iframe {
    width: 100%;
    height: 100%;
    border: 1px solid var(--an-border);
    background: #fff;
  }

  .card {
    flex: 0 0 clamp(280px, 26vw, 360px);
    align-self: center;
    background: var(--an-panel-bg);
    border: 1px solid var(--an-border);
    box-shadow: var(--an-shadow-1) 3px 3px 0, 6px 6px 0 var(--an-shadow-2);
    padding: 16px;
    font-family: var(--an-font);
    color: var(--an-text);
  }
  .thumb {
    width: 100%;
    max-height: 46vh;
    object-fit: cover;
    display: block;
    margin-bottom: 12px;
    border: 1px solid var(--an-border);
  }
  .meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .title {
    font-size: 1.05rem;
    line-height: 1.3;
  }
  .host {
    font-size: 12px;
    color: var(--an-accent);
  }
  .open {
    align-self: flex-start;
    margin-top: 8px;
    padding: 6px 12px;
    border: 1px solid var(--an-border);
    color: var(--an-accent);
    text-decoration: none;
    box-shadow: var(--an-shadow-1) 2px 2px 0;
  }
  .open:hover {
    background: var(--an-accent);
    color: var(--an-panel-bg);
  }

  /* Narrow screens: stack the card under the frame; a blank frame collapses so the
     card isn't pushed off-screen by empty white. */
  @media (max-width: 768px) {
    .at-link {
      flex-direction: column;
      gap: 16px;
      padding: 16px;
    }
    .frame.blank {
      display: none;
    }
    .card {
      flex: 0 0 auto;
      align-self: stretch;
    }
  }
</style>
