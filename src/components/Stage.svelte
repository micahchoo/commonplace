<script>
  import ImageBlock from './renderers/ImageBlock.svelte';
  import TextBlock from './renderers/TextBlock.svelte';
  import EmbedBlock from './renderers/EmbedBlock.svelte';
  import AttachmentBlock from './renderers/AttachmentBlock.svelte';
  import LinkBlock from './renderers/LinkBlock.svelte';
  import FallbackCard from './renderers/FallbackCard.svelte';
  import { isDenylisted } from '../lib/denylist.js';

  let { block } = $props();

  // A denylisted Link won't frame → show a FallbackCard on the overlay layer while
  // the previously-painted content stays behind it (storyboard Frame 7). Stage owns
  // this decision so LinkBlock stays a pure framing renderer.
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
</style>
