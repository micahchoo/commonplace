<script>
  // Shown when no channels resolve (no config.json and no ?channel=). Never a crash
  // or blank — a calm "configure me" in the signature box, with a way to open a
  // channel on the spot.
  import ChannelOpener from './ChannelOpener.svelte';
  let { heading = 'Configure me', onopen } = $props();
</script>

<div class="at-panel at-empty">
  <p class="heading">{heading}</p>
  <p>
    Paste an Are.na channel link below to start, or add a <code>config.json</code> next to
    <code>index.html</code> with channel slugs (also works via <code>?channel=your-slug</code>).
  </p>
  <ChannelOpener {onopen} />
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
