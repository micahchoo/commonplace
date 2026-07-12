<script>
  // Contact-sheet grid of block thumbnails. Full-viewport, sits just above the
  // blank stage (z-index 1) and below the menu (z-index 10). Used by the root
  // Cover and by the in-channel grid view. Pure: thumbs in, onpick out.
  import Blurhash from './Blurhash.svelte';
  let { thumbs = [], onpick } = $props();
  let loaded = $state({}); // id -> true once the cell's image has painted
</script>

<div class="at-grid-view">
  <ul class="at-grid">
    {#each thumbs as t (t.slug + ':' + t.id)}
      <li>
        <button type="button" title={t.title} onclick={() => onpick?.(t)}>
          {#if t.blurhash && !loaded[t.id]}
            <Blurhash hash={t.blurhash} ratio={t.ratio} />
          {/if}
          <img
            class:loaded={loaded[t.id]}
            src={t.thumb}
            alt={t.title}
            loading="lazy"
            onload={() => (loaded = { ...loaded, [t.id]: true })}
            onerror={() => (loaded = { ...loaded, [t.id]: true })}
          />
        </button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .at-grid-view {
    position: fixed;
    inset: 0;
    z-index: 2;
    background: #fff;
    overflow: auto;
  }
  .at-grid {
    list-style: none;
    margin: 0;
    padding: 4px;
    display: grid;
    gap: 4px;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    grid-auto-rows: 96px;
  }
  .at-grid li {
    margin: 0;
  }
  .at-grid button {
    position: relative; /* containing block for the blurhash canvas */
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: #f0f0f0;
    cursor: pointer;
    overflow: hidden;
  }
  .at-grid img {
    position: relative; /* above the blurhash backdrop */
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .at-grid img.loaded {
    opacity: 1;
  }
  .at-grid button:hover img,
  .at-grid button:focus-visible img {
    opacity: 0.75;
  }
</style>
