<script>
  import ImageBlock from './renderers/ImageBlock.svelte';
  import TextBlock from './renderers/TextBlock.svelte';
  import EmbedBlock from './renderers/EmbedBlock.svelte';
  import AttachmentBlock from './renderers/AttachmentBlock.svelte';
  import LinkBlock from './renderers/LinkBlock.svelte';
  import FallbackCard from './renderers/FallbackCard.svelte';
  import { isDenylisted } from '../lib/denylist.js';

  let { block } = $props();

  // Links are framed inline by default; only sites KNOWN to refuse framing (the
  // denylist) fall back to a preview card, since a static app can't detect a framing
  // refusal at runtime. The card renders as normal content on the clean stage.
  const denyLink = $derived(block?.kind === 'link' && isDenylisted(block.link?.url));
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
        {#if denyLink}
          <FallbackCard {block} />
        {:else}
          <LinkBlock {block} />
        {/if}
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
