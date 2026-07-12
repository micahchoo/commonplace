<script>
  import { sanitizeHtml } from '../../lib/sanitize.js';
  let { block } = $props();
  // Scoped styles don't reach {@html}; .at-text is styled in global.css.
  const clean = $derived(sanitizeHtml(block.html));
</script>

<div class="at-text-wrap">
  <div class="at-text">
    {@html clean}
  </div>
</div>

<style>
  /* Full-viewport flex box; the inner .at-text (global) is the readable column,
     centered via its own margin:auto so it never hides behind the docked menu. */
  .at-text-wrap {
    position: absolute;
    inset: 0;
    overflow: auto;
    display: flex;
  }
</style>
