<script>
  import Blurhash from '../Blurhash.svelte';
  let { block } = $props();
  let loaded = $state(false);
</script>

{#if block.image?.blurhash}
  <!-- Instant blurred backdrop while the full asset loads; also fills the letterbox
       margins behind the contained image (ISSUES D2). -->
  <Blurhash hash={block.image.blurhash} ratio={block.image?.aspectRatio} />
{/if}
<img
  class="at-image"
  class:loaded
  src={block.image?.src}
  srcset={block.image?.srcset}
  alt={block.image?.alt || block.title}
  onload={() => (loaded = true)}
  onerror={() => (loaded = true)}
/>

<style>
  /* absolute + inset:0 + margin:auto centers a replaced element on BOTH axes —
     margin:auto alone only centers horizontally in normal flow, which left images
     top-aligned with all the empty space dumped below (worst on portrait/mobile). */
  .at-image {
    position: absolute;
    inset: 0;
    margin: auto;
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .at-image.loaded {
    opacity: 1; /* fade in over the blurhash backdrop once the asset arrives */
  }
  /* On mobile, top-align under the pinned bar (content-layer is already offset by
     --at-bar-h) instead of floating centered in the tall portrait space. */
  @media (max-width: 768px) {
    .at-image {
      inset: 0 0 auto;
      margin: 0 auto;
    }
  }
</style>
