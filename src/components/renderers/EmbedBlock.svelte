<script>
  // Media embeds are third-party HTML+JS. The sandboxed null-origin srcdoc iframe
  // is the isolation boundary — do NOT run embedHtml through DOMPurify (it would
  // strip the <iframe>/<script> the embed needs). One path for video and rich embeds.
  import FallbackCard from './FallbackCard.svelte';
  let { block } = $props();
  const html = $derived(block.embedHtml || '');
</script>

{#if html}
  <div class="at-embed-wrap">
    <iframe
      class="at-embed"
      title={block.title}
      srcdoc={html}
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
</style>
