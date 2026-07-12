<script>
  // Shown when no channels resolve (no config.json and no ?channel=). Never a crash
  // or blank — a calm "configure me" in the signature box.
  let { heading = 'Configure me' } = $props();
</script>

<div class="at-panel at-empty">
  <p class="heading">{heading}</p>
  <p>
    Add a <code>config.json</code> next to <code>index.html</code> with Are.na channel
    slugs, or open with <code>?channel=your-slug</code>.
  </p>
</div>

<style>
  .heading {
    color: var(--an-accent);
    margin-bottom: 6px;
  }
  .at-empty {
    font-size: 13px;
    line-height: 1.5;
  }
  code {
    background: rgba(0, 0, 0, 0.06);
    padding: 0 2px;
  }
</style>
