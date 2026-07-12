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
  .at-image {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
    margin: auto;
  }
</style>
