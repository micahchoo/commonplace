<script>
  // Paints a decoded blurhash to a small canvas, stretched by CSS to fill its box —
  // the stretch IS the blur. Sits behind an <img> as an instant placeholder while the
  // full asset loads (ISSUES D2). `ratio` (image.aspectRatio) shapes the buffer so the
  // preview isn't distorted; it's the one real consumer of that otherwise-dark field.
  import { decodeBlurhash } from '../lib/blurhash.js';
  let { hash = '', ratio = 1 } = $props();
  let canvas = $state();

  $effect(() => {
    if (!hash || !canvas) return;
    const w = 32;
    const h = Math.max(1, Math.round(32 / (ratio > 0 ? ratio : 1)));
    const px = decodeBlurhash(hash, w, h);
    if (!px) return;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')?.putImageData(new ImageData(px, w, h), 0, 0);
  });
</script>

{#if hash}
  <canvas bind:this={canvas} class="at-blur" aria-hidden="true"></canvas>
{/if}

<style>
  .at-blur {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
</style>
