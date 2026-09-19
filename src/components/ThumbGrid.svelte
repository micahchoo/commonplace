<script>
  // Contact sheet of a channel's entries. Full-viewport, sits just above the blank
  // stage (z-index 1) and below the menu (z-index 10). Used by the root Cover, which
  // passes thumbnails only, and by the in-channel grid view, where an entry carrying
  // no image renders as a typographic tile instead of vanishing from the sheet — a
  // grid filtered to image blocks was a partial index of the channel, silently.
  // Pure: cells in, onpick out.
  import Blurhash from './Blurhash.svelte';
  import { kindTag } from '../lib/model.js';
  let { thumbs = [], activeId = null, onpick } = $props();
  let loaded = $state({}); // id -> true once the cell's image has painted

  const label = (t) => kindTag(t);
</script>

<div class="at-grid-view">
  <ul class="at-grid">
    {#each thumbs as t (t.slug + ':' + t.id)}
      <li>
        <button
          type="button"
          class:active={activeId != null && t.id === activeId}
          aria-current={activeId != null && t.id === activeId ? 'true' : undefined}
          title={t.title}
          onclick={() => onpick?.(t)}
        >
          {#if t.thumb}
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
          {:else}
            <span class="tile">
              {#if label(t)}<span class="kind">{label(t)}</span>{/if}
              <span class="name">{t.title}</span>
            </span>
          {/if}
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
  .at-grid button.active {
    outline: 2px solid var(--an-accent);
    outline-offset: -2px;
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
  /* An entry with no image still holds a place in the sheet: kind tag over title. */
  .at-grid .tile {
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: 100%;
    height: 100%;
    padding: 6px;
    overflow: hidden;
    text-align: left;
    font: 11px/1.3 var(--an-font);
    color: var(--an-text);
  }
  .at-grid .kind {
    flex: 0 0 auto;
    opacity: 0.6;
  }
  .at-grid .name {
    overflow: hidden;
  }
  .at-grid button:hover .tile,
  .at-grid button:focus-visible .tile {
    color: var(--an-accent);
  }
</style>
