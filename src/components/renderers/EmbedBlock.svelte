<script>
  // Media embeds are third-party HTML+JS. The sandboxed null-origin srcdoc iframe
  // is the isolation boundary — do NOT run embedHtml through DOMPurify (it would
  // strip the <iframe>/<script> the embed needs). One path for video and rich embeds.
  import FallbackCard from './FallbackCard.svelte';
  let { block } = $props();
  const html = $derived(block.embedHtml || '');
  // embedType (embed.type: 'video' | 'rich') was dark — normalized, never read (ISSUES D3).
  // Surface it to frame differently: a video is cinematic (16:9, black); a rich embed
  // (article card, tweet, player) is NOT — force-cropping it into a black 16:9 bar looked
  // wrong, so it gets a neutral, taller frame. Unknown/null defaults to cinematic (unchanged).
  const isRich = $derived(block.embedType === 'rich');
  const bg = $derived(isRich ? '#fff' : '#000');
  // Are.na embed HTML is a provider iframe with FIXED pixel dimensions (e.g. an
  // embedly/YouTube frame at width="640" height="360"). With a bare srcdoc it renders
  // at that intrinsic size in the top-left of our box. Wrap it in a minimal document
  // that forces the inner frame to fill, so the media scales to our container.
  // NOT sanitized — the sandboxed null-origin iframe is the isolation boundary.
  const srcdoc = $derived(
    html &&
      '<!doctype html><html><head><meta charset="utf-8"><style>' +
        `html,body{margin:0;padding:0;height:100%;background:${bg};overflow:hidden}` +
        'iframe,video,img,embed,object{position:absolute;inset:0;width:100%!important;' +
        'height:100%!important;border:0;display:block}' +
        `</style></head><body>${html}</body></html>`,
  );
</script>

{#if html}
  <div class="at-embed-wrap">
    <iframe
      class="at-embed"
      class:rich={isRich}
      title={block.title}
      srcdoc={srcdoc}
      sandbox="allow-scripts allow-popups"
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin"
      loading="lazy"
    ></iframe>
  </div>
{:else}
  <FallbackCard {block} />
{/if}

<style>
  /* Center a bounded 16:9 frame in the viewport rather than filling it top-left
     (which put provider content behind the docked menu). */
  .at-embed-wrap {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2vmin;
  }
  .at-embed {
    width: min(92vw, 960px);
    aspect-ratio: 16 / 9;
    max-height: 86vh;
    border: none;
    background: #000;
  }
  /* Rich embeds (cards, tweets, players) aren't cinematic — a narrower, taller,
     neutral frame reads far better than a black 16:9 letterbox. */
  .at-embed.rich {
    width: min(92vw, 560px);
    aspect-ratio: 3 / 4;
    background: #fff;
  }
  /* Top-align under the pinned bar on mobile (matches ImageBlock). */
  @media (max-width: 768px) {
    .at-embed-wrap {
      align-items: flex-start;
    }
  }
</style>
