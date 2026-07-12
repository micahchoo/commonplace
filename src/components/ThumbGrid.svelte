<script>
  // Contact-sheet grid of block thumbnails. Full-viewport, sits just above the
  // blank stage (z-index 1) and below the menu (z-index 10). Used by the root
  // Cover and by the in-channel grid view. Pure: thumbs in, onpick out.
  let { thumbs = [], onpick } = $props();
</script>

<div class="at-grid-view">
  <ul class="at-grid">
    {#each thumbs as t (t.slug + ':' + t.id)}
      <li>
        <button type="button" title={t.title} onclick={() => onpick?.(t)}>
          <img src={t.thumb} alt={t.title} loading="lazy" />
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
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: #f0f0f0;
    cursor: pointer;
  }
  .at-grid img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: opacity 0.12s;
  }
  .at-grid button:hover img,
  .at-grid button:focus-visible img {
    opacity: 0.75;
  }
</style>
