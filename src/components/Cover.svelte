<script>
  // Home cover for the content stage — shown at the notebook root (no block open)
  // so the stage reads as an intentional landing instead of a blank void. A
  // contact-sheet grid of the channels' block thumbnails (ThumbGrid); falls back to
  // a typographic cover when nothing carries an image.
  import ThumbGrid from './ThumbGrid.svelte';
  let { title = '', about = '', thumbs = [], onpick } = $props();
</script>

{#if thumbs.length}
  <ThumbGrid {thumbs} {onpick} />
{:else}
  <div class="at-cover">
    <div class="at-cover-inner">
      <h1 class="at-cover-title">{title || 'Commonplace'}</h1>
      {#if about}<p class="at-cover-about">{@html about}</p>{/if}
      <p class="at-cover-hint">Select a channel to begin</p>
    </div>
  </div>
{/if}

<style>
  .at-cover {
    position: fixed;
    inset: 0;
    z-index: 2; /* above the blank stage (1), below the menu (10) */
    background: #fff;
    overflow: auto;
  }
  .at-cover-inner {
    max-width: 60ch;
    min-height: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--an-text);
    font-family: var(--an-font);
    padding: 6vmin;
  }
  .at-cover-title {
    color: var(--an-accent);
    font-weight: normal;
    font-size: clamp(2rem, 7vw, 4.5rem);
    line-height: 1.05;
    letter-spacing: -1px;
    margin-bottom: 1.2rem;
  }
  .at-cover-about {
    font-size: 1rem;
    line-height: 1.6;
    margin-bottom: 1.6rem;
  }
  .at-cover-about :global(p) {
    margin: 0;
  }
  .at-cover-hint {
    font-size: 0.85rem;
    opacity: 0.55;
    letter-spacing: 0.5px;
  }
</style>
