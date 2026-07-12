<script>
  import { sanitizeHtml } from '../../lib/sanitize.js';
  let { block } = $props();
  // Scoped styles don't reach {@html}; .at-text is styled in global.css.
  const clean = $derived(sanitizeHtml(block.html));
</script>

<div class="at-text at-text-wrap">
  {@html clean}
</div>

<style>
  .at-text-wrap {
    position: absolute;
    inset: 0;
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
