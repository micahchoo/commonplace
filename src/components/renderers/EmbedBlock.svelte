<script>
  // Media embeds are third-party HTML+JS. The sandboxed null-origin srcdoc iframe
  // is the isolation boundary — do NOT run embedHtml through DOMPurify (it would
  // strip the <iframe>/<script> the embed needs). One path for video and rich embeds.
  import FallbackCard from './FallbackCard.svelte';
  let { block } = $props();
  const html = $derived(block.embedHtml || '');
</script>

{#if html}
  <iframe
    class="at-embed"
    title={block.title}
    srcdoc={html}
    sandbox="allow-scripts allow-popups"
    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
    referrerpolicy="strict-origin-when-cross-origin"
    loading="lazy"
  ></iframe>
{:else}
  <FallbackCard {block} />
{/if}

<style>
  .at-embed {
    width: 100%;
    height: 100%;
    border: none;
  }
</style>
