<script>
  import ImageBlock from './renderers/ImageBlock.svelte';
  import TextBlock from './renderers/TextBlock.svelte';
  import EmbedBlock from './renderers/EmbedBlock.svelte';
  import AttachmentBlock from './renderers/AttachmentBlock.svelte';
  import LinkBlock from './renderers/LinkBlock.svelte';
  import FallbackCard from './renderers/FallbackCard.svelte';

  let { block } = $props();
</script>

<div class="at-stage">
  <div class="content-layer">
    {#if block}
      {#if block.kind === 'image'}
        <ImageBlock {block} />
      {:else if block.kind === 'text'}
        <TextBlock {block} />
      {:else if block.kind === 'embed'}
        <EmbedBlock {block} />
      {:else if block.kind === 'attachment'}
        <AttachmentBlock {block} />
      {:else if block.kind === 'link'}
        <LinkBlock {block} />
      {:else}
        <FallbackCard {block} />
      {/if}
    {/if}
  </div>
</div>

<style>
  .at-stage {
    position: fixed;
    inset: 0;
    z-index: 1;
    background: #fff;
  }
  .content-layer {
    position: absolute;
    inset: 0;
  }

  /* On mobile the panel is a pinned top bar; center content in the space below it
     (--at-bar-h is published by Panel) rather than the full viewport. */
  @media (max-width: 768px) {
    .content-layer {
      top: var(--at-bar-h, 0);
    }
  }
</style>
