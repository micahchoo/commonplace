<script>
  import ImageBlock from './renderers/ImageBlock.svelte';
  import LinkBlock from './renderers/LinkBlock.svelte';
  import FallbackCard from './renderers/FallbackCard.svelte';

  let { block } = $props();

  // Two layers: a content layer (the inline renderer) and an overlay layer.
  // `overlay` blocks (a denylisted Link → card) keep the previously-painted
  // content behind them (storyboard Frame 7). Task 6 wires the mechanism;
  // Task 12 sets the real overlay condition once the denylist exists.
  const isOverlay = $derived(false);

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
      {:else if bg.kind === 'link'}
        <LinkBlock block={bg} />
      {:else if bg.kind === 'unknown'}
        <FallbackCard block={bg} />
      {:else}
        <div class="stub">{bg.title} — “{bg.kind}” renderer coming soon</div>
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
  .stub {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font: 14px/1.4 var(--an-font);
    color: var(--an-text);
  }
</style>
