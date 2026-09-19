<script>
  import ImageBlock from './renderers/ImageBlock.svelte';
  import TextBlock from './renderers/TextBlock.svelte';
  import EmbedBlock from './renderers/EmbedBlock.svelte';
  import AttachmentBlock from './renderers/AttachmentBlock.svelte';
  import LinkBlock from './renderers/LinkBlock.svelte';
  import FallbackCard from './renderers/FallbackCard.svelte';

  let { block, sourceVisible = true } = $props();

  // Every Are.na block has a stable permalink at /block/<id>. Links and attachments
  // carry their own escape hatch on the card, but an image or a text block had no
  // route off the stage at all — no attribution, and no way to the full-size original.
  // Rendered outside .at-stage: that layer is z-index 1 and makes its own stacking
  // context, so a child of it can never sit above the grid at z-index 2.
  const source = $derived(block?.id ? `https://www.are.na/block/${block.id}` : '');
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

{#if source && sourceVisible}
  <a class="at-source" href={source} target="_blank" rel="noopener noreferrer">are.na ↗</a>
{/if}

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

  /* The source link rides above the stage and the contact sheet, below the menu (10). */
  .at-source {
    position: fixed;
    right: 10px;
    bottom: 10px;
    z-index: 3;
    padding: 2px 7px;
    background: var(--an-panel-bg);
    border: 1px solid var(--an-border);
    box-shadow: var(--an-shadow-1) 2px 2px 0;
    font: 12px/1.5 var(--an-font);
    color: var(--an-text);
    text-decoration: none;
    opacity: 0.65;
  }
  .at-source:hover,
  .at-source:focus-visible {
    opacity: 1;
    color: var(--an-accent);
    box-shadow: var(--an-shadow-1) 2px 2px 0, 4px 4px 0 var(--an-shadow-2);
  }

  /* On mobile the panel is a pinned top bar; center content in the space below it
     (--at-bar-h is published by Panel) rather than the full viewport. */
  @media (max-width: 768px) {
    .content-layer {
      top: var(--at-bar-h, 0);
    }
  }
</style>
