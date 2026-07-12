<script>
  let { block } = $props();
</script>

<img
  class="at-image"
  src={block.image?.src}
  srcset={block.image?.srcset}
  alt={block.image?.alt || block.title}
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
  }
</style>
