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
  // denylist) fall back to a card, since a static app can't detect a framing refusal
  // at runtime. A denylisted link shows its card on the overlay layer while the
  // previously-painted content stays behind it (storyboard Frame 7).
  const cardOnly = (b) => b && b.kind === 'link' && isDenylisted(b.link?.url);
  const isOverlay = $derived(cardOnly(block));

  let lastInline = $state(null);
  $effect(() => {
    if (block && !isOverlay) lastInline = block;
  });

  const bg = $derived(isOverlay ? lastInline : block);
</script>

<div class="at-stage">
  <div class="content-layer">
    {#if bg}
      {#if bg.kind === 'image'}
        <ImageBlock block={bg} />
      {:else if bg.kind === 'text'}
        <TextBlock block={bg} />
      {:else if bg.kind === 'embed'}
        <EmbedBlock block={bg} />
      {:else if bg.kind === 'attachment'}
        <AttachmentBlock block={bg} />
      {:else if bg.kind === 'link'}
        <LinkBlock block={bg} />
      {:else}
        <FallbackCard block={bg} />
      {/if}
    {/if}
  </div>

  <div class="overlay-layer">
    {#if isOverlay}
      <FallbackCard {block} />
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
  .content-layer,
  .overlay-layer {
    position: absolute;
    inset: 0;
  }
  .overlay-layer {
    pointer-events: none;
  }
  .overlay-layer :global(.at-fallback) {
    pointer-events: auto;
  }

  /* On mobile the panel is a pinned top bar; center content in the space below it
     (--at-bar-h is published by Panel) rather than the full viewport. */
  @media (max-width: 768px) {
    .content-layer,
    .overlay-layer {
      top: var(--at-bar-h, 0);
    }
  }
</style>
